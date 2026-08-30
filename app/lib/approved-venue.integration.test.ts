import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { adminAuditLogs, approvedVenues, users } from "../../drizzle/schema";
import { adminImportVenues, adminSaveVenue, createPublicUserId, db } from "./db";

describe("approved venue directory", () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let adminId = 0;
  let venueId = 0;

  beforeAll(async () => {
    const result = await db().insert(users).values({ publicId: createPublicUserId(), openId: `venue-admin-${suffix}`, name: "Venue Test Admin", email: `venue-admin-${suffix}@example.test`, role: "admin", loginMethod: "test", lastSignedIn: new Date() });
    adminId = Number(result[0].insertId);
  }, 30_000);

  afterAll(async () => {
    if (adminId) {
      await db().delete(adminAuditLogs).where(eq(adminAuditLogs.adminId, adminId));
      await db().delete(approvedVenues).where(eq(approvedVenues.createdByAdminId, adminId));
      await db().delete(users).where(eq(users.id, adminId));
    }
  }, 30_000);

  it("creates, updates, and retires an audited venue without changing existing directory data", async () => {
    const created = await adminSaveVenue(adminId, null, { zone: "Central", ward: "Ward 9", location: "Test Sector", venueName: "Venue Directory Test", city: "Noida", address: "Test address", sector: "Sector 9", area: "Test Area", latitudeE6: 28535516, longitudeE6: 77391026, setting: "outdoor", capacity: 500, isAccessible: true, accessibilityNotes: "Step-free entry", active: true });
    venueId = created.id;
    expect(created.active).toBe(true);
    const updated = await adminSaveVenue(adminId, venueId, { ...created, location: "Updated Test Sector", active: false });
    expect(updated.location).toBe("Updated Test Sector");
    expect(updated.active).toBe(false);
    const auditRows = await db().select().from(adminAuditLogs).where(eq(adminAuditLogs.adminId, adminId));
    expect(auditRows.map(row => row.action)).toEqual(expect.arrayContaining(["venue.created", "venue.updated"]));
  });

  it("creates then updates the same imported venue rather than introducing a duplicate", async () => {
    const input = { zone: "East", ward: "Ward 4", location: "Import Locality", venueName: "Imported Venue", city: "Noida", address: null, sector: null, area: null, latitudeE6: 28535516, longitudeE6: 77391026, setting: "indoor" as const, capacity: 300, isAccessible: true, accessibilityNotes: "Lift access", active: true };
    expect(await adminImportVenues(adminId, [input])).toEqual({ created: 1, updated: 0 });
    expect(await adminImportVenues(adminId, [{ ...input, capacity: 450, accessibilityNotes: "Lift and accessible washroom" }])).toEqual({ created: 0, updated: 1 });
    const rows = await db().select().from(approvedVenues).where(eq(approvedVenues.createdByAdminId, adminId));
    const imported = rows.filter(row => row.venueName === "Imported Venue");
    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({ capacity: 450, isAccessible: true });
  });
});
