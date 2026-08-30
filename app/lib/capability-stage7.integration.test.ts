import { and, eq, inArray, or } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { capabilityApplications, capabilityAuditRecords, capabilityDecisionNotifications, capabilityGrantFunctions, capabilityGrants, users, userAccountProfiles } from "../../drizzle/schema";
import { adminReviewCapabilityApplication, adminUpdateCapabilityGrant, createPasswordUser, db, findUserByEmail, getActiveCapabilityWorkspaceContext, getActiveCapabilityWorkspaces, getCapabilityCatalog, getCapabilityDecisionNotifications, getUnreadCapabilityDecisionNotificationCount, markCapabilityDecisionNotificationsRead, saveCapabilityApplication, submitCapabilityApplication } from "./db";

const cleanupUserIds: number[] = [];

afterEach(async () => {
  if (!cleanupUserIds.length) return;
  const profiles = await db().select().from(userAccountProfiles).where(inArray(userAccountProfiles.userId, cleanupUserIds));
  const profileIds = profiles.map(profile => profile.id);
  const grants = profileIds.length ? await db().select().from(capabilityGrants).where(inArray(capabilityGrants.userAccountProfileId, profileIds)) : [];
  const grantIds = grants.map(grant => grant.id);
  const applications = profileIds.length ? await db().select().from(capabilityApplications).where(inArray(capabilityApplications.userAccountProfileId, profileIds)) : [];
  const applicationIds = applications.map(application => application.id);
  if (cleanupUserIds.length) await db().delete(capabilityDecisionNotifications).where(inArray(capabilityDecisionNotifications.userId, cleanupUserIds));
  if (grantIds.length || applicationIds.length) await db().delete(capabilityAuditRecords).where(or(grantIds.length ? inArray(capabilityAuditRecords.grantId, grantIds) : eq(capabilityAuditRecords.grantId, -1), applicationIds.length ? inArray(capabilityAuditRecords.applicationId, applicationIds) : eq(capabilityAuditRecords.applicationId, -1)));
  if (grantIds.length) await db().delete(capabilityGrantFunctions).where(inArray(capabilityGrantFunctions.grantId, grantIds));
  await db().delete(users).where(inArray(users.id, cleanupUserIds));
  cleanupUserIds.splice(0);
});

describe("Stage 6 inbox enhancement and Stage 7 workspace isolation", () => {
  it("filters and bulk-marks only the signed-in recipient's private matching decision notices", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const owner = await createPasswordUser({ name: "Stage Seven Owner", email: `stage7-owner-${suffix}@fitizen.test`, passwordHash: "stage7-test-only" });
    const other = await createPasswordUser({ name: "Stage Seven Other", email: `stage7-other-${suffix}@fitizen.test`, passwordHash: "stage7-test-only" });
    expect(owner && other).toBeTruthy(); cleanupUserIds.push(owner!.id, other!.id);
    await db().insert(capabilityDecisionNotifications).values([
      { userId: owner!.id, kind: "application_approved", title: "Approved", body: "Approved owner record", actionUrl: "/dashboard/capabilities" },
      { userId: owner!.id, kind: "application_changes_requested", title: "Returned", body: "Returned owner record", actionUrl: "/dashboard/capabilities" },
      { userId: other!.id, kind: "application_approved", title: "Other approved", body: "Other private record", actionUrl: "/dashboard/capabilities" },
    ]);
    expect(await getUnreadCapabilityDecisionNotificationCount(owner!.id)).toBe(2);
    expect((await getCapabilityDecisionNotifications(owner!.id, "approved")).map(item => item.title)).toEqual(["Approved"]);
    await markCapabilityDecisionNotificationsRead(owner!.id, "approved");
    expect(await getUnreadCapabilityDecisionNotificationCount(owner!.id)).toBe(1);
    expect(await getUnreadCapabilityDecisionNotificationCount(other!.id)).toBe(1);
    expect((await getCapabilityDecisionNotifications(owner!.id, "returned")).every(item => !item.readAt)).toBe(true);
  }, 20_000);

  it("exposes only a current selected-function grant and rejects forged, foreign, or suspended workspace context", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const applicant = await createPasswordUser({ name: "Stage Seven Workspace", email: `stage7-workspace-${suffix}@fitizen.test`, passwordHash: "stage7-test-only" });
    expect(applicant).toBeTruthy(); cleanupUserIds.push(applicant!.id);
    const admin = await findUserByEmail("admin@fitizen.local"); expect(admin?.role).toBe("admin");
    const localAuthority = (await getCapabilityCatalog()).find(entry => entry.capability.code === "LOCAL_AUTHORITY"); expect(localAuthority).toBeTruthy();
    const functionIds = localAuthority!.functions.filter(item => item.isMandatory).map(item => item.id);
    const startsAt = new Date(Date.now() - 86_400_000); const endsAt = new Date(Date.now() + 14 * 86_400_000);
    const application = await saveCapabilityApplication(applicant!.id, { capabilityId: localAuthority!.capability.id, functionIds, justification: "I need an accountable and time-limited Local Authority monitoring capability for a verified Stage Seven workspace-isolation test.", scopeType: "national", startsAt, endsAt });
    await submitCapabilityApplication(applicant!.id, application.id, "Ready for selected-function workspace review");
    const approved = await adminReviewCapabilityApplication(admin!.id, { applicationId: application.id, decision: "approved", note: "Approved only for controlled Stage Seven workspace verification.", selectedFunctionIds: functionIds, scope: { scopeType: "national" }, startsAt, endsAt });
    const workspaces = await getActiveCapabilityWorkspaces(applicant!.id);
    expect(workspaces).toHaveLength(1); expect(workspaces[0]?.grant.id).toBe(approved.grant?.id); expect(workspaces[0]?.functions.map(item => item.id)).toEqual(functionIds);
    expect((await getActiveCapabilityWorkspaceContext(applicant!.id, "LOCAL_AUTHORITY", approved.grant!.id))?.workspace.grant.id).toBe(approved.grant!.id);
    expect(await getActiveCapabilityWorkspaceContext(applicant!.id, "CSR_SPONSORSHIP", approved.grant!.id)).toBeUndefined();
    expect(await getActiveCapabilityWorkspaceContext(applicant!.id, "LOCAL_AUTHORITY", approved.grant!.id + 99_999)).toBeUndefined();
    await adminUpdateCapabilityGrant(admin!.id, approved.grant!.id, "suspended", "Suspend controlled Stage Seven workspace after isolation verification.");
    expect(await getActiveCapabilityWorkspaces(applicant!.id)).toEqual([]);
    expect(await getActiveCapabilityWorkspaceContext(applicant!.id, "LOCAL_AUTHORITY", approved.grant!.id)).toBeUndefined();
  }, 45_000);
});
