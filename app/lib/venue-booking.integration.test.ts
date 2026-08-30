import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { approvedVenues, events, users } from "../../drizzle/schema";
import { adminReleaseVenueReservation, completeOrganizerEvent, createPublicEventId, createPublicUserId, db, findActiveVenueConflict, getOrganizerVenueAvailabilityNotifications, subscribeOrganizerToVenueAvailability } from "./db";

describe("approved venue booking protection", () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`; let holderId = 0; let requesterId = 0; let adminId = 0; let venueId = 0; let holderEventId = 0; let requesterEventId = 0;
  beforeAll(async () => {
    const holder = await db().insert(users).values({ publicId: createPublicUserId(), openId: `venue-holder-${suffix}`, name: "Venue Holder", email: `venue-holder-${suffix}@example.test`, role: "user", loginMethod: "test", lastSignedIn: new Date() }); holderId = Number(holder[0].insertId);
    const requester = await db().insert(users).values({ publicId: createPublicUserId(), openId: `venue-requester-${suffix}`, name: "Venue Requester", email: `venue-requester-${suffix}@example.test`, role: "user", loginMethod: "test", lastSignedIn: new Date() }); requesterId = Number(requester[0].insertId);
    const admin = await db().insert(users).values({ publicId: createPublicUserId(), openId: `venue-admin-${suffix}`, name: "Venue Admin", email: `venue-admin-${suffix}@example.test`, role: "admin", loginMethod: "test", lastSignedIn: new Date() }); adminId = Number(admin[0].insertId);
    const venue = await db().insert(approvedVenues).values({ zone: "Test Zone", ward: "Test Ward", location: "Test Locality", venueName: `Reserved Venue ${suffix}`, city: "Noida", latitudeE6: 28629000, longitudeE6: 77364000, setting: "outdoor", active: true }); venueId = Number(venue[0].insertId);
    const holderUser = (await db().select().from(users).where(eq(users.id, holderId)).limit(1))[0]; const requesterUser = (await db().select().from(users).where(eq(users.id, requesterId)).limit(1))[0]; const startsAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); const endsAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const holding = await db().insert(events).values({ organizerId: holderId, organizerPublicId: holderUser.publicId, publicId: createPublicEventId(), title: "Venue holder test", displayName: "Venue holder test", slug: `venue-holder-${suffix}`, status: "live", visibility: "public", moderationStatus: "approved", startsAt, endsAt, approvedVenueId: venueId }); holderEventId = Number(holding[0].insertId);
    const requesterEvent = await db().insert(events).values({ organizerId: requesterId, organizerPublicId: requesterUser.publicId, publicId: createPublicEventId(), title: "Venue requester test", displayName: "Venue requester test", slug: `venue-requester-${suffix}`, status: "draft", visibility: "public", moderationStatus: "draft", startsAt }); requesterEventId = Number(requesterEvent[0].insertId);
  }, 30_000);
  afterAll(async () => { if (holderId) await db().delete(users).where(eq(users.id, holderId)); if (requesterId) await db().delete(users).where(eq(users.id, requesterId)); if (adminId) await db().delete(users).where(eq(users.id, adminId)); if (venueId) await db().delete(approvedVenues).where(eq(approvedVenues.id, venueId)); }, 30_000);

  it("blocks a different event while the venue holder is not completed, then releases it after completion", async () => {
    expect((await findActiveVenueConflict(requesterEventId, venueId))?.eventId).toBe(holderEventId);
    await subscribeOrganizerToVenueAvailability(requesterId, venueId, requesterEventId);
    await completeOrganizerEvent(holderEventId, holderId);
    expect(await findActiveVenueConflict(requesterEventId, venueId)).toBeNull();
    expect((await getOrganizerVenueAvailabilityNotifications(requesterId))[0]?.notification.title).toContain("now available");
  });

  it("lets an administrator exceptionally release a new held venue and alerts its watcher", async () => {
    const holder = (await db().select().from(users).where(eq(users.id, holderId)).limit(1))[0]; const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); const endsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const created = await db().insert(events).values({ organizerId: holderId, organizerPublicId: holder.publicId, publicId: createPublicEventId(), title: "Override venue test", displayName: "Override venue test", slug: `venue-override-${suffix}`, status: "live", visibility: "public", moderationStatus: "approved", startsAt, endsAt, approvedVenueId: venueId }); const overrideEventId = Number(created[0].insertId);
    await subscribeOrganizerToVenueAvailability(requesterId, venueId, requesterEventId);
    await adminReleaseVenueReservation(adminId, overrideEventId, "Venue owner requested an exceptional release");
    expect(await findActiveVenueConflict(requesterEventId, venueId)).toBeNull();
    expect((await db().select().from(events).where(eq(events.id, overrideEventId)).limit(1))[0]?.approvedVenueId).toBeNull();
    expect((await getOrganizerVenueAvailabilityNotifications(requesterId)).length).toBeGreaterThanOrEqual(2);
  });
});
