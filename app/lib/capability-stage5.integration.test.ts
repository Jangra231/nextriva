import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { capabilityAuditRecords, capabilityGrantFunctions, capabilityGrants, csrBudgets, csrProfiles, csrSponsorshipRequests, userAccountProfiles, users } from "../../drizzle/schema";
import { adminCreateCsrAccount, adminCreateCsrMigrationGrant, adminCreateLocalAuthorityAccount, adminCreateLocalAuthorityMigrationGrant, authorizeCapabilityExecution, createPublicUserId, csrCreateBudget, csrSaveSponsorshipRequest, csrSubmitSponsorshipRequest, db, getCapabilityCatalog, getCapabilityGrantAlerts } from "./db";

describe("Stage 5 selective capability enforcement", () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const originalMis = process.env.FITIZEN_CAPABILITY_MIS_EXPORT_ENFORCEMENT;
  const originalCsr = process.env.FITIZEN_CSR_CAPABILITY_AUTHORIZATION_ENFORCEMENT;
  let adminId = 0; let authorityId = 0; let sponsorId = 0; let budgetId = 0; let localAuthorityFunctionIds: number[] = []; let csrFunctionIds: number[] = [];

  const brief = () => ({ budgetId, requestKind: "future_event" as const, eventType: "Stage 5 activity", titlePreference: null, intendedAudience: "Community fitness participants", cityPreference: "Noida", zonePreference: null, wardPreference: null, preferredStartDate: null, preferredEndDate: null, estimatedCapacity: 120, accessibilityNeeds: "Step-free activity space", successIndicators: "Documented participation and inclusion", details: "Provide an accountable community fitness activity with accessible participation, trained volunteers, and a clear administrator review pathway.", amountPaise: 10_000, submissionNote: "Stage 5 authorization regression brief" });

  beforeAll(async () => {
    const admin = await db().insert(users).values({ publicId: createPublicUserId(), openId: `stage5-admin-${suffix}`, name: "Stage 5 Administrator", email: `stage5-admin-${suffix}@example.test`, role: "admin", loginMethod: "test", lastSignedIn: new Date() }); adminId = Number(admin[0].insertId);
    const authority = await adminCreateLocalAuthorityAccount(adminId, { name: "Stage 5 Local Authority", email: `stage5-authority-${suffix}@example.test`, passwordHash: "test-hash" }); authorityId = authority.id;
    const sponsor = await adminCreateCsrAccount(adminId, { name: "Stage 5 CSR Contact", email: `stage5-csr-${suffix}@example.test`, passwordHash: "test-hash", profile: { companyName: `Stage 5 CSR ${suffix}`, contactName: "Stage 5 CSR Contact", contactEmail: `stage5-csr-profile-${suffix}@example.test`, focusAreas: "Community fitness" } }); sponsorId = sponsor.account.id;
    budgetId = (await csrCreateBudget(sponsorId, { label: "Stage 5 funding envelope", totalPaise: 100_000 })).id;
    const catalog = await getCapabilityCatalog();
    localAuthorityFunctionIds = catalog.find(item => item.capability.code === "LOCAL_AUTHORITY")?.functions.map(item => item.id) || [];
    csrFunctionIds = catalog.find(item => item.capability.code === "CSR_SPONSORSHIP")?.functions.filter(item => item.isMandatory).map(item => item.id) || [];
    expect(localAuthorityFunctionIds.length).toBeGreaterThan(1);
    expect(csrFunctionIds.length).toBeGreaterThan(0);
  }, 45_000);

  afterAll(async () => {
    if (originalMis === undefined) delete process.env.FITIZEN_CAPABILITY_MIS_EXPORT_ENFORCEMENT; else process.env.FITIZEN_CAPABILITY_MIS_EXPORT_ENFORCEMENT = originalMis;
    if (originalCsr === undefined) delete process.env.FITIZEN_CSR_CAPABILITY_AUTHORIZATION_ENFORCEMENT; else process.env.FITIZEN_CSR_CAPABILITY_AUTHORIZATION_ENFORCEMENT = originalCsr;
    const accountIds = [authorityId, sponsorId].filter(Boolean);
    const profiles = accountIds.length ? await db().select().from(userAccountProfiles).where(inArray(userAccountProfiles.userId, accountIds)) : [];
    const profileIds = profiles.map(profile => profile.id);
    const grants = profileIds.length ? await db().select().from(capabilityGrants).where(inArray(capabilityGrants.userAccountProfileId, profileIds)) : [];
    for (const actorId of [adminId, authorityId, sponsorId]) if (actorId) await db().delete(capabilityAuditRecords).where(eq(capabilityAuditRecords.actorUserId, actorId));
    for (const grant of grants) await db().delete(capabilityGrantFunctions).where(eq(capabilityGrantFunctions.grantId, grant.id));
    for (const grant of grants) await db().delete(capabilityGrants).where(eq(capabilityGrants.id, grant.id));
    if (budgetId) await db().delete(csrSponsorshipRequests).where(eq(csrSponsorshipRequests.budgetId, budgetId));
    if (budgetId) await db().delete(csrBudgets).where(eq(csrBudgets.id, budgetId));
    if (sponsorId) await db().delete(csrProfiles).where(eq(csrProfiles.userId, sponsorId));
    if (sponsorId) await db().delete(users).where(eq(users.id, sponsorId));
    if (authorityId) await db().delete(users).where(eq(users.id, authorityId));
    if (adminId) await db().delete(users).where(eq(users.id, adminId));
  }, 45_000);

  it("retains MIS export and CSR submission under their disabled compatibility rollouts", async () => {
    delete process.env.FITIZEN_CAPABILITY_MIS_EXPORT_ENFORCEMENT;
    delete process.env.FITIZEN_CSR_CAPABILITY_AUTHORIZATION_ENFORCEMENT;
    const exportDecision = await authorizeCapabilityExecution(authorityId, { capabilityCode: "LOCAL_AUTHORITY", functionCode: "LA_MIS_EXPORT", resourceScope: {}, enforce: process.env.FITIZEN_CAPABILITY_MIS_EXPORT_ENFORCEMENT === "true" });
    expect(exportDecision).toMatchObject({ allowed: true, mode: "legacy_compatibility", grantId: null });
    const drafted = await csrSaveSponsorshipRequest(sponsorId, brief());
    const submitted = await csrSubmitSponsorshipRequest(sponsorId, drafted.id, "Compatibility submission remains available.");
    expect(submitted.status).toBe("submitted");
  }, 45_000);

  it("requires selected-function grants for MIS export and CSR submission when selectively enabled", async () => {
    process.env.FITIZEN_CAPABILITY_MIS_EXPORT_ENFORCEMENT = "true";
    const deniedMis = await authorizeCapabilityExecution(authorityId, { capabilityCode: "LOCAL_AUTHORITY", functionCode: "LA_MIS_EXPORT", resourceScope: {}, enforce: true });
    expect(deniedMis.allowed).toBe(false);
    const now = new Date();
    const authorityGrant = await adminCreateLocalAuthorityMigrationGrant(adminId, { userId: authorityId, functionIds: localAuthorityFunctionIds, scope: { scopeType: "national" }, startsAt: new Date(now.getTime() - 60_000), endsAt: new Date(now.getTime() + 86_400_000), reason: "Authorize Stage 5 Local Authority MIS export." });
    const allowedMis = await authorizeCapabilityExecution(authorityId, { capabilityCode: "LOCAL_AUTHORITY", functionCode: "LA_MIS_EXPORT", resourceScope: {}, enforce: true });
    expect(allowedMis).toMatchObject({ allowed: true, grantId: authorityGrant.id });
    const alerts = await getCapabilityGrantAlerts(authorityId, now, 30);
    const alert = alerts.find(alert => alert.grant.id === authorityGrant.id);
    expect(alert).toMatchObject({ state: "urgent" });
    expect(alert?.daysRemaining).toBeGreaterThanOrEqual(1);
    expect(alert?.daysRemaining).toBeLessThanOrEqual(2);

    process.env.FITIZEN_CSR_CAPABILITY_AUTHORIZATION_ENFORCEMENT = "true";
    const draft = await csrSaveSponsorshipRequest(sponsorId, brief());
    await expect(csrSubmitSponsorshipRequest(sponsorId, draft.id, "Attempt without selected-function grant.")).rejects.toThrow("No active scoped grant");
    const csrGrant = await adminCreateCsrMigrationGrant(adminId, { userId: sponsorId, functionIds: csrFunctionIds, scope: { scopeType: "city", city: "Noida" }, startsAt: new Date(now.getTime() - 60_000), endsAt: new Date(now.getTime() + 86_400_000), reason: "Authorize Stage 5 CSR brief submission for Noida." });
    const submitted = await csrSubmitSponsorshipRequest(sponsorId, draft.id, "Submit with selected-function grant.");
    expect(submitted.status).toBe("submitted");
    const executionAudit = (await db().select().from(capabilityAuditRecords).where(eq(capabilityAuditRecords.grantId, csrGrant.id))).find(row => row.action === "capability.execution_authorized");
    expect(executionAudit?.actorUserId).toBe(sponsorId);
    expect(await db().select().from(csrSponsorshipRequests).where(eq(csrSponsorshipRequests.id, draft.id)).limit(1)).toHaveLength(1);
    expect(await db().select().from(csrBudgets).where(eq(csrBudgets.id, budgetId)).limit(1)).toHaveLength(1);
  }, 45_000);
});
