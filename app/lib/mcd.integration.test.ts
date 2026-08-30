import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { adminAuditLogs, events, users } from "../../drizzle/schema";
import { adminCreateLocalAuthorityAccount, createPublicEventId, createPublicUserId, db, localAuthorityModerateEvent } from "./db";

describe("Local Authority compatibility workflow", () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let adminId = 0; let mcdId = 0; let organizerId = 0; let eventId = 0;

  beforeAll(async () => {
    const admin = await db().insert(users).values({ publicId: createPublicUserId(), openId: `mcd-admin-${suffix}`, name: "MCD Test Administrator", email: `mcd-admin-${suffix}@example.test`, role: "admin", loginMethod: "test", lastSignedIn: new Date() }); adminId = Number(admin[0].insertId);
    const provisioned = await adminCreateLocalAuthorityAccount(adminId, { name: "Local Authority Test", email: `local-authority-${suffix}@example.test`, passwordHash: "test-hash" }); mcdId = provisioned.id;
    const organizer = await db().insert(users).values({ publicId: createPublicUserId(), openId: `mcd-organizer-${suffix}`, name: "MCD Test Organizer", email: `mcd-organizer-${suffix}@example.test`, role: "user", loginMethod: "test", lastSignedIn: new Date() }); organizerId = Number(organizer[0].insertId);
    const organizerRow = (await db().select().from(users).where(eq(users.id, organizerId)).limit(1))[0];
    const event = await db().insert(events).values({ organizerId, organizerPublicId: organizerRow.publicId, publicId: createPublicEventId(), title: "Local Authority review event", displayName: "Local Authority review event", slug: `local-authority-review-event-${suffix}`, status: "draft", visibility: "public", moderationStatus: "submitted", platformFeePercent: 7 }); eventId = Number(event[0].insertId);
  }, 30_000);

  afterAll(async () => {
    if (eventId) await db().delete(events).where(eq(events.id, eventId));
    if (organizerId) await db().delete(users).where(eq(users.id, organizerId));
    if (mcdId) await db().delete(users).where(eq(users.id, mcdId));
    if (adminId) await db().delete(users).where(eq(users.id, adminId));
  }, 30_000);

  it("creates Local Authority accounts while preserving the legacy stored role for compatibility", async () => {
    const authority = (await db().select().from(users).where(eq(users.id, mcdId)).limit(1))[0];
    expect(authority?.role).toBe("mcd");
    const audit = (await db().select().from(adminAuditLogs).where(eq(adminAuditLogs.adminId, adminId))).find(row => row.action === "local_authority.account_created");
    expect(audit?.entityId).toBe(mcdId);
  });

  it("lets Local Authority approve a submitted event without changing the existing platform fee and records the decision", async () => {
    const outcome = await localAuthorityModerateEvent(mcdId, eventId, "approved", "Public-health authority approval recorded");
    expect(outcome.event.status).toBe("live");
    expect(outcome.event.moderationStatus).toBe("approved");
    expect(outcome.event.platformFeePercent).toBe(7);
    const audit = (await db().select().from(adminAuditLogs).where(eq(adminAuditLogs.adminId, mcdId))).find(row => row.action === "local_authority.event.approved");
    expect(audit?.entityId).toBe(eventId);
  });
});
