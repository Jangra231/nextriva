import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { events, registrations, tickets, users } from "../../drizzle/schema";
import { createPublicEventId, createPublicUserId, db, ensureOrganizerParticipation, verifyEventParticipant } from "./db";

const enabled = Boolean(process.env.DATABASE_URL);
let organizerId = 0;
let eventId = 0;
let ticketId = 0;
let organizerPublicId = "";

describe.skipIf(!enabled)("organizer auto-participation", () => {
  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 10_000)}`;
    const database = db();
    organizerPublicId = createPublicUserId();
    const organizer = await database.insert(users).values({ publicId: organizerPublicId, openId: `organizer-participation-${suffix}`, name: "Organizer Participant", email: `organizer-participation-${suffix}@fitizen.test` });
    organizerId = Number(organizer[0].insertId);
    const event = await database.insert(events).values({ organizerId, organizerPublicId, publicId: createPublicEventId(), title: "Organizer participation test", displayName: "Organizer participation", slug: `organizer-participation-${suffix}`, status: "live", moderationStatus: "approved", visibility: "public", currentStep: 6, startsAt: new Date("2027-04-01T09:00:00Z"), endsAt: new Date("2027-04-01T12:00:00Z"), city: "Bengaluru", venueName: "Test venue", description: "Database-backed organizer participation test event.", coverUrl: "/test-cover.webp", publishedAt: new Date() });
    eventId = Number(event[0].insertId);
    const ticket = await database.insert(tickets).values({ eventId, name: "Organizer participation ticket", ticketCategory: "paid", pricePaise: 50000, quantityLimit: 5, salesStartAt: new Date("2027-01-01T00:00:00Z"), salesEndAt: new Date("2027-03-31T00:00:00Z") });
    ticketId = Number(ticket[0].insertId);
  }, 30_000);

  afterAll(async () => {
    if (!enabled) return;
    const database = db();
    if (eventId) await database.delete(events).where(eq(events.id, eventId));
    if (organizerId) await database.delete(users).where(eq(users.id, organizerId));
  });

  it("creates one free confirmed organizer registration and returns it on repeated approval checks", async () => {
    const database = db();
    const event = (await database.select().from(events).where(eq(events.id, eventId)).limit(1))[0];
    if (!event) throw new Error("Test event was not created");
    expect(event.publicId).toMatch(/^EVT-[A-F0-9]{16}$/);
    const first = await ensureOrganizerParticipation(event);
    expect(first.created).toBe(true);
    expect(first.registration.attendeeId).toBe(organizerId);
    expect(first.registration.attendeePublicId).toBe(organizerPublicId);
    expect(first.registration.ticketId).toBe(ticketId);
    expect(first.registration.paymentStatus).toBe("not_required");
    expect(first.registration.paidAmountPaise).toBe(0);
    expect(first.registration.registrationNumber).toBeNull();
    expect(first.registration.orderNumber).toMatch(/^FZ-ORG-/);

    const repeated = await ensureOrganizerParticipation(event);
    expect(repeated.created).toBe(false);
    expect(repeated.registration.id).toBe(first.registration.id);

    const records = await database.select().from(registrations).where(eq(registrations.eventId, eventId));
    const ticket = (await database.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1))[0];
    expect(records).toHaveLength(1);
    expect(ticket?.quantitySold).toBe(1);
    const verified = await verifyEventParticipant(eventId, organizerId, organizerPublicId);
    expect(verified?.attendee.publicId).toBe(organizerPublicId);
    expect(verified?.registration.id).toBe(first.registration.id);
    await expect(verifyEventParticipant(eventId, organizerId, "USR-0000000000000000")).resolves.toBeUndefined();
  });
});
