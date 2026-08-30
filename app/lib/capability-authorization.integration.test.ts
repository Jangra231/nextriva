import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { capabilityAuditRecords, capabilityGrants, events, users } from "../../drizzle/schema";
import { adminCreateLocalAuthorityAccount, adminCreateLocalAuthorityMigrationGrant, adminExpireDueCapabilityGrants, authorizeCapabilityExecution, createPublicEventId, createPublicUserId, db, getCapabilityCatalog, localAuthorityModerateEvent } from "./db";

describe("Stage 4 Local Authority capability authorization", () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const originalEnforcement = process.env.FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT;
  let adminId = 0; let authorityId = 0; let organizerId = 0; let legacyEventId = 0; let enforcedEventId = 0; let localAuthorityFunctionIds: number[] = [];

  beforeAll(async () => {
    const admin = await db().insert(users).values({ publicId: createPublicUserId(), openId: `stage4-admin-${suffix}`, name: "Stage 4 Administrator", email: `stage4-admin-${suffix}@example.test`, role: "admin", loginMethod: "test", lastSignedIn: new Date() }); adminId = Number(admin[0].insertId);
    const authority = await adminCreateLocalAuthorityAccount(adminId, { name: "Stage 4 Local Authority", email: `stage4-authority-${suffix}@example.test`, passwordHash: "test-hash" }); authorityId = authority.id;
    const organizer = await db().insert(users).values({ publicId: createPublicUserId(), openId: `stage4-organizer-${suffix}`, name: "Stage 4 Organizer", email: `stage4-organizer-${suffix}@example.test`, role: "user", loginMethod: "test", lastSignedIn: new Date() }); organizerId = Number(organizer[0].insertId);
    const organizerRow = (await db().select().from(users).where(eq(users.id, organizerId)).limit(1))[0];
    const created = await db().insert(events).values([
      { organizerId, organizerPublicId: organizerRow.publicId, publicId: createPublicEventId(), title: "Stage 4 compatibility event", displayName: "Stage 4 compatibility event", slug: `stage4-legacy-${suffix}`, status: "draft", visibility: "public", moderationStatus: "submitted", platformFeePercent: 5, city: "Noida", zone: "Sector 18", ward: "Ward 4" },
      { organizerId, organizerPublicId: organizerRow.publicId, publicId: createPublicEventId(), title: "Stage 4 enforced event", displayName: "Stage 4 enforced event", slug: `stage4-enforced-${suffix}`, status: "draft", visibility: "public", moderationStatus: "submitted", platformFeePercent: 5, city: "Noida", zone: "Sector 18", ward: "Ward 4" },
    ]);
    legacyEventId = Number(created[0].insertId); enforcedEventId = legacyEventId + 1;
    const localAuthority = (await getCapabilityCatalog()).find(item => item.capability.code === "LOCAL_AUTHORITY");
    localAuthorityFunctionIds = localAuthority?.functions.filter(fn => fn.isMandatory).map(fn => fn.id) || [];
    expect(localAuthorityFunctionIds.length).toBeGreaterThan(0);
  }, 45_000);

  afterAll(async () => {
    if (originalEnforcement === undefined) delete process.env.FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT;
    else process.env.FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT = originalEnforcement;
    if (legacyEventId) await db().delete(events).where(eq(events.id, legacyEventId));
    if (enforcedEventId) await db().delete(events).where(eq(events.id, enforcedEventId));
    if (organizerId) await db().delete(users).where(eq(users.id, organizerId));
    if (authorityId) await db().delete(users).where(eq(users.id, authorityId));
    if (adminId) await db().delete(users).where(eq(users.id, adminId));
  }, 45_000);

  it("retains Local Authority execution under the disabled compatibility rollout", async () => {
    delete process.env.FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT;
    const decision = await authorizeCapabilityExecution(authorityId, { capabilityCode: "LOCAL_AUTHORITY", functionCode: "LA_EVENT_REVIEW", resourceScope: { city: "Noida", zone: "Sector 18", ward: "Ward 4" } });
    expect(decision).toMatchObject({ allowed: true, mode: "legacy_compatibility", grantId: null });
    const outcome = await localAuthorityModerateEvent(authorityId, legacyEventId, "approved", "Compatibility rollout preserves the existing authority review.");
    expect(outcome.event.moderationStatus).toBe("approved");
  }, 45_000);

  it("requires a matching selected-function grant when enforcement is enabled and batch-expires due grants with audit evidence", async () => {
    process.env.FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT = "true";
    const denied = await authorizeCapabilityExecution(authorityId, { capabilityCode: "LOCAL_AUTHORITY", functionCode: "LA_EVENT_REVIEW", resourceScope: { city: "Noida", zone: "Sector 18", ward: "Ward 4" } });
    expect(denied.allowed).toBe(false);
    const now = new Date();
    const grant = await adminCreateLocalAuthorityMigrationGrant(adminId, { userId: authorityId, functionIds: localAuthorityFunctionIds, scope: { scopeType: "city", city: "Noida" }, startsAt: new Date(now.getTime() - 60_000), endsAt: new Date(now.getTime() + 60_000), reason: "Authorize the first Local Authority Stage 4 review path." });
    const allowed = await authorizeCapabilityExecution(authorityId, { capabilityCode: "LOCAL_AUTHORITY", functionCode: "LA_EVENT_REVIEW", resourceScope: { city: "Noida", zone: "Sector 18", ward: "Ward 4" } });
    expect(allowed).toMatchObject({ allowed: true, mode: "grant_enforced", grantId: grant.id });
    const outcome = await localAuthorityModerateEvent(authorityId, enforcedEventId, "approved", "Grant-enforced authority review completed.");
    expect(outcome.event.moderationStatus).toBe("approved");
    const executionAudit = (await db().select().from(capabilityAuditRecords).where(eq(capabilityAuditRecords.grantId, grant.id))).find(row => row.action === "capability.execution_authorized");
    expect(executionAudit?.actorUserId).toBe(authorityId);
    const expired = await adminCreateLocalAuthorityMigrationGrant(adminId, { userId: authorityId, functionIds: localAuthorityFunctionIds, scope: { scopeType: "national" }, startsAt: new Date(now.getTime() - 3 * 86_400_000), endsAt: new Date(now.getTime() - 2 * 86_400_000), reason: "Create an expired grant for controlled expiry-operation verification." });
    expect(await adminExpireDueCapabilityGrants(adminId, "Process the controlled Stage 4 expiry verification queue.", now)).toBeGreaterThanOrEqual(1);
    const expiredRow = (await db().select().from(capabilityGrants).where(eq(capabilityGrants.id, expired.id)).limit(1))[0];
    expect(expiredRow?.status).toBe("expired");
    const expiryAudit = (await db().select().from(capabilityAuditRecords).where(eq(capabilityAuditRecords.grantId, expired.id))).find(row => row.action === "capability.grant_expired_batch");
    expect(expiryAudit?.actorUserId).toBe(adminId);
  }, 45_000);
});
