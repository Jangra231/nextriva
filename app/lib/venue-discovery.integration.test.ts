import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { events, users } from "../../drizzle/schema";
import { createOrganizerVenueFilterPreset, createPublicEventId, createPublicUserId, db, deleteOrganizerVenueFilterPreset, getOrganizerVenueFilterPresets, listPublicEvents } from "./db";

describe("venue discovery ownership and accessibility", () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`; let organizerId = 0; let otherUserId = 0;
  beforeAll(async () => {
    const organizer = await db().insert(users).values({ publicId: createPublicUserId(), openId: `venue-preset-organizer-${suffix}`, name: "Venue Preset Organizer", email: `venue-preset-organizer-${suffix}@example.test`, role: "user", loginMethod: "test", lastSignedIn: new Date() }); organizerId = Number(organizer[0].insertId);
    const other = await db().insert(users).values({ publicId: createPublicUserId(), openId: `venue-preset-other-${suffix}`, name: "Venue Preset Other", email: `venue-preset-other-${suffix}@example.test`, role: "user", loginMethod: "test", lastSignedIn: new Date() }); otherUserId = Number(other[0].insertId);
  }, 30_000);
  afterAll(async () => { if (organizerId) await db().delete(users).where(eq(users.id, organizerId)); if (otherUserId) await db().delete(users).where(eq(users.id, otherUserId)); }, 30_000);

  it("keeps saved venue filters private to their organizer and ignores another user’s delete request", async () => {
    const preset = await createOrganizerVenueFilterPreset(organizerId, { name: "Accessible Noida", query: "Noida", zone: "Central", ward: null, minimumCapacity: 500, accessibility: "accessible", radiusKm: 25 });
    expect((await getOrganizerVenueFilterPresets(organizerId)).map(item => item.id)).toContain(preset.id);
    await deleteOrganizerVenueFilterPreset(otherUserId, preset.id);
    expect((await getOrganizerVenueFilterPresets(organizerId)).map(item => item.id)).toContain(preset.id);
    await deleteOrganizerVenueFilterPreset(organizerId, preset.id);
    expect((await getOrganizerVenueFilterPresets(organizerId)).map(item => item.id)).not.toContain(preset.id);
  });

  it("returns only accessible venue snapshots when public discovery requests that filter", async () => {
    const organizer = (await db().select().from(users).where(eq(users.id, organizerId)).limit(1))[0]; const now = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); const title = `Acc-${suffix.slice(-8)}`;
    const accessible = await db().insert(events).values({ organizerId, organizerPublicId: organizer.publicId, publicId: createPublicEventId(), title, displayName: "Accessible test event", slug: `accessible-${suffix}`, status: "live", visibility: "public", moderationStatus: "approved", startsAt: now, venueIsAccessible: true });
    const standard = await db().insert(events).values({ organizerId, organizerPublicId: organizer.publicId, publicId: createPublicEventId(), title, displayName: "Standard test event", slug: `standard-${suffix}`, status: "live", visibility: "public", moderationStatus: "approved", startsAt: now, venueIsAccessible: false });
    const found = await listPublicEvents({ search: title, accessible: "1" }); const ids = found.map(row => row.event.id);
    expect(ids).toContain(Number(accessible[0].insertId)); expect(ids).not.toContain(Number(standard[0].insertId));
  });
});
