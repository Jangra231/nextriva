import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { approvedVenues, events, users, venueApprovalRequests } from "../../drizzle/schema";
import { adminReviewVenueApprovalRequest, createOrganizerVenueApprovalRequest, createPublicEventId, createPublicUserId, db, getOrganizerVenueApprovalRequests } from "./db";

describe("organizer venue approval requests", () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`; let organizerId = 0; let adminId = 0; let eventId = 0; let requestId = 0; let approvedVenueId = 0;
  beforeAll(async () => {
    const organizer = await db().insert(users).values({ publicId: createPublicUserId(), openId: `venue-request-organizer-${suffix}`, name: "Venue Request Organizer", email: `venue-request-organizer-${suffix}@example.test`, role: "user", loginMethod: "test", lastSignedIn: new Date() }); organizerId = Number(organizer[0].insertId);
    const admin = await db().insert(users).values({ publicId: createPublicUserId(), openId: `venue-request-admin-${suffix}`, name: "Venue Request Admin", email: `venue-request-admin-${suffix}@example.test`, role: "admin", loginMethod: "test", lastSignedIn: new Date() }); adminId = Number(admin[0].insertId);
    const organizerRow = (await db().select().from(users).where(eq(users.id, organizerId)).limit(1))[0]; const event = await db().insert(events).values({ organizerId, organizerPublicId: organizerRow.publicId, publicId: createPublicEventId(), title: "Venue request flow", displayName: "Venue request flow", slug: `venue-request-flow-${suffix}`, status: "draft", visibility: "public", moderationStatus: "draft" }); eventId = Number(event[0].insertId);
  }, 30_000);
  afterAll(async () => { if (approvedVenueId) await db().delete(approvedVenues).where(eq(approvedVenues.id, approvedVenueId)); if (organizerId) await db().delete(users).where(eq(users.id, organizerId)); if (adminId) await db().delete(users).where(eq(users.id, adminId)); }, 30_000);

  it("keeps requests organizer-scoped and creates an approved directory venue only after a recorded admin decision", async () => {
    const request = await createOrganizerVenueApprovalRequest(organizerId, { eventId, zone: "Request Zone", ward: "Request Ward", location: "Request Locality", venueName: `Request Hall ${suffix}`, city: "Noida", address: "Test address", sector: "Sector 62", area: "Request Locality", latitudeE6: 28630000, longitudeE6: 77375000, setting: "indoor", capacity: 320, isAccessible: true, accessibilityNotes: "Step-free test access", organizerNote: "Please review this organizer request" }); requestId = request!.id;
    expect((await getOrganizerVenueApprovalRequests(organizerId, eventId))[0]?.status).toBe("pending");
    const approved = await adminReviewVenueApprovalRequest(adminId, requestId, "approved", "Verified directory venue details"); approvedVenueId = approved.approvedVenueId!;
    expect(approved.status).toBe("approved"); expect(approvedVenueId).toBeGreaterThan(0);
    expect((await db().select().from(approvedVenues).where(eq(approvedVenues.id, approvedVenueId)).limit(1))[0]?.active).toBe(true);
    expect((await db().select().from(events).where(eq(events.id, eventId)).limit(1))[0]?.approvedVenueId).toBe(approvedVenueId);
    expect((await db().select().from(venueApprovalRequests).where(eq(venueApprovalRequests.id, requestId)).limit(1))[0]?.reviewNote).toContain("Verified");
  });
});
