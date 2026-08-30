import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, or } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { capabilities, capabilityApplications, capabilityAuditRecords, capabilityDecisionNotifications, capabilityFunctions, capabilityGrants, users } from "../../drizzle/schema";
import { adminReviewCapabilityApplication, adminUpdateCapabilityGrant, createPasswordUser, db, findUserByEmail, getCapabilityApplicantWorkspace, saveCapabilityApplication, submitCapabilityApplication } from "./db";

const root = process.cwd();
const cleanup = { userId: 0, applicationId: 0, grantId: 0 };

afterEach(async () => {
  if (cleanup.userId) await db().delete(capabilityDecisionNotifications).where(eq(capabilityDecisionNotifications.userId, cleanup.userId));
  if (cleanup.applicationId && cleanup.grantId) await db().delete(capabilityAuditRecords).where(or(eq(capabilityAuditRecords.applicationId, cleanup.applicationId), eq(capabilityAuditRecords.grantId, cleanup.grantId)));
  else if (cleanup.applicationId) await db().delete(capabilityAuditRecords).where(eq(capabilityAuditRecords.applicationId, cleanup.applicationId));
  else if (cleanup.grantId) await db().delete(capabilityAuditRecords).where(eq(capabilityAuditRecords.grantId, cleanup.grantId));
  if (cleanup.userId) await db().delete(users).where(eq(users.id, cleanup.userId));
  cleanup.userId = 0; cleanup.applicationId = 0; cleanup.grantId = 0;
});

describe("Stage 3 capability catalog and grant lifecycle", () => {
  it("preserves a permanent user while recording a scoped, time-bound capability application, grant, status update, and audit evidence", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const applicant = await createPasswordUser({ name: "Stage Three Applicant", email: `stage3-${suffix}@fitizen.test`, passwordHash: "stage3-test-only" });
    expect(applicant).toBeTruthy(); cleanup.userId = applicant!.id;
    const admin = await findUserByEmail("admin@fitizen.local"); expect(admin?.role).toBe("admin");
    const initial = await getCapabilityApplicantWorkspace(applicant!.id); const catalogItem = initial.catalog.find(item => item.capability.code === "VENUE_STEWARD");
    expect(catalogItem?.functions.length).toBeGreaterThan(0);
    expect(catalogItem?.functions.some(item => item.isMandatory)).toBe(true);
    const startsAt = new Date(Date.now() - 86_400_000); const endsAt = new Date(Date.now() + 30 * 86_400_000);
    const requestedFunctionIds = catalogItem!.functions.filter(item => item.isMandatory).map(item => item.id);
    const drafted = await saveCapabilityApplication(applicant!.id, { capabilityId: catalogItem!.capability.id, functionIds: requestedFunctionIds, justification: "I need a constrained venue-readiness capability for accountable venue coordination and operational follow-up.", scopeType: "city", city: "Noida", startsAt, endsAt, applicantNote: "Initial scoped request" }); cleanup.applicationId = drafted.id;
    expect(drafted.status).toBe("draft");
    const submitted = await submitCapabilityApplication(applicant!.id, drafted.id, "Ready for master review"); expect(submitted.status).toBe("submitted");
    const returned = await adminReviewCapabilityApplication(admin!.id, { applicationId: drafted.id, decision: "changes_requested", note: "Please clarify the expected venue coordination outcome.", selectedFunctionIds: [], scope: { scopeType: "city", city: "Noida" }, startsAt, endsAt });
    expect(returned.application.status).toBe("changes_requested");
    expect((await getCapabilityApplicantWorkspace(applicant!.id)).decisionNotifications.map(notification => notification.kind)).toContain("application_changes_requested");
    await saveCapabilityApplication(applicant!.id, { capabilityId: catalogItem!.capability.id, functionIds: requestedFunctionIds, justification: "I need a constrained venue-readiness capability for accountable venue coordination, confirmed availability follow-up, and documented operational outcomes.", scopeType: "city", city: "Noida", startsAt, endsAt, applicantNote: "Clarified scope and operational outcome" }, drafted.id);
    await submitCapabilityApplication(applicant!.id, drafted.id, "Resubmitted with requested detail");
    const approved = await adminReviewCapabilityApplication(admin!.id, { applicationId: drafted.id, decision: "approved", note: "Approved for a time-bound Noida venue readiness pilot.", selectedFunctionIds: requestedFunctionIds, scope: { scopeType: "city", city: "Noida" }, startsAt, endsAt });
    expect(approved.application.status).toBe("approved"); expect(approved.grant?.status).toBe("active"); cleanup.grantId = approved.grant!.id;
    const applicantWorkspace = await getCapabilityApplicantWorkspace(applicant!.id);
    expect(applicantWorkspace.account.user.publicId).toBe(applicant!.publicId);
    expect(applicantWorkspace.grants[0]?.effectiveStatus).toBe("active"); expect(applicantWorkspace.grants[0]?.functions.map(fn => fn.id)).toEqual(requestedFunctionIds);
    const suspended = await adminUpdateCapabilityGrant(admin!.id, approved.grant!.id, "suspended", "Temporarily paused pending local authority scheduling confirmation."); expect(suspended.status).toBe("suspended");
    const notifications = (await getCapabilityApplicantWorkspace(applicant!.id)).decisionNotifications;
    expect(notifications.map(notification => notification.kind)).toEqual(expect.arrayContaining(["application_changes_requested", "application_approved", "grant_suspended"]));
    expect(notifications.find(notification => notification.kind === "grant_suspended")?.body).toContain("Temporarily paused");
    const audits = await db().select().from(capabilityAuditRecords).where(or(eq(capabilityAuditRecords.applicationId, drafted.id), eq(capabilityAuditRecords.grantId, approved.grant!.id)));
    expect(audits.map(row => row.action)).toEqual(expect.arrayContaining(["capability.application_drafted", "capability.application_submitted", "capability.application_changes_requested", "capability.application_approved", "capability.grant_suspended"]));
	  }, 90_000);

  it("ships searchable capability UI and deliberately postpones capability execution enforcement to Stage 4", async () => {
    const [catalogPage, adminComponent, migration, notificationMigration] = await Promise.all([
      readFile(path.join(root, "app/dashboard/capabilities/page.tsx"), "utf8"),
      readFile(path.join(root, "app/components/AdminCapabilityManagement.tsx"), "utf8"),
      readFile(path.join(root, "drizzle/0028_ambitious_adam_warlock.sql"), "utf8"),
      readFile(path.join(root, "drizzle/0030_gorgeous_sprite.sql"), "utf8"),
    ]);
    expect(catalogPage).toContain("Search capabilities or functions");
    expect(catalogPage).toContain("submitCapabilityApplicationAction");
    expect(catalogPage).toContain("isCapabilityCatalogEnabled");
    expect(adminComponent).toContain("Type MASTER");
    expect(adminComponent).toContain("Time-bound scoped grants");
    expect(migration).toContain("CREATE TABLE `capabilityGrants`");
    expect(notificationMigration).toContain("CREATE TABLE `capabilityDecisionNotifications`");
    expect(migration).toContain("'LOCAL_AUTHORITY'");
    const catalogRows = await db().select().from(capabilities);
    const functionRows = await db().select().from(capabilityFunctions);
    expect(catalogRows.map(row => row.code)).toEqual(expect.arrayContaining(["LOCAL_AUTHORITY", "CSR_SPONSORSHIP", "DISTRICT_LEVEL", "STATE_LEVEL"]));
    expect(functionRows.find(row => row.code === "DISTRICT_ACTIVITY_MONITOR")?.isMandatory).toBe(true);
    expect(functionRows.find(row => row.code === "STATE_PROGRAM_OVERSIGHT")?.handlesSensitiveData).toBe(true);
  });
});
