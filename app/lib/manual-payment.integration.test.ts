import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { events, registrations, tickets, users } from "../../drizzle/schema";
import { confirmManualPayment, createDraftEvent, createPublicEventId, createPublicUserId, db, getRegistrations, markRegistrationConfirmationSent, registerForEvent, submitManualPaymentProof } from "./db";

const enabled = Boolean(process.env.DATABASE_URL);
let organizerId = 0;
let attendeeId = 0;
let eventId = 0;
let draftEventId = 0;
let ticketId = 0;
let organizerPublicId = "";
let attendeePublicId = "";

describe.skipIf(!enabled)("manual payment database lifecycle", () => {
  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 10_000)}`;
    const database = db();
    organizerPublicId = createPublicUserId(); attendeePublicId = createPublicUserId();
    const organizer = await database.insert(users).values({ publicId: organizerPublicId, openId: `manual-payment-organizer-${suffix}`, name: "Manual Payment Organizer", email: `manual-organizer-${suffix}@fitizen.test` });
    const attendee = await database.insert(users).values({ publicId: attendeePublicId, openId: `manual-payment-attendee-${suffix}`, name: "Manual Payment Attendee", email: `manual-attendee-${suffix}@fitizen.test` });
    organizerId = Number(organizer[0].insertId);
    attendeeId = Number(attendee[0].insertId);
    const event = await database.insert(events).values({ organizerId, organizerPublicId, publicId: createPublicEventId(), title: "Manual payment lifecycle test", displayName: "Manual payment lifecycle", slug: `manual-payment-lifecycle-${suffix}`, status: "live", visibility: "public", currentStep: 6, startsAt: new Date("2027-02-01T09:00:00Z"), endsAt: new Date("2027-02-01T12:00:00Z"), city: "Bengaluru", venueName: "Test venue", description: "Database-backed manual payment verification event.", coverUrl: "/test-cover.webp", manualPaymentEnabled: true, manualPaymentMethod: "both", upiId: "fitizen.test@upi", bankAccountName: "Fitizen Test Events", bankAccountNumber: "123456789012", bankIfsc: "TEST0000123", publishedAt: new Date() });
    eventId = Number(event[0].insertId);
    const ticket = await database.insert(tickets).values({ eventId, name: "Manual payment ticket", ticketCategory: "paid", pricePaise: 25000, quantityLimit: 5, salesStartAt: new Date("2026-01-01T00:00:00Z"), salesEndAt: new Date("2027-01-31T00:00:00Z") });
    ticketId = Number(ticket[0].insertId);
  }, 30_000);

  afterAll(async () => {
    if (!enabled) return;
    const database = db();
    if (eventId) await database.delete(events).where(eq(events.id, eventId));
    if (draftEventId) await database.delete(events).where(eq(events.id, draftEventId));
    if (organizerId) await database.delete(users).where(eq(users.id, organizerId));
    if (attendeeId) await database.delete(users).where(eq(users.id, attendeeId));
  });

  it("creates a booking before proof submission and transitions it to paid only after organizer approval", async () => {
    const created = await registerForEvent(eventId, ticketId, { id: attendeeId, publicId: attendeePublicId });
    expect(created.paymentPending).toBe(true);
    const database = db();
    const pending = (await database.select().from(registrations).where(and(eq(registrations.eventId, eventId), eq(registrations.orderNumber, created.orderNumber))).limit(1))[0];
    expect(pending.paymentStatus).toBe("pending");
    expect(pending.attendeePublicId).toBe(attendeePublicId);
    expect(pending.registrationNumber).toBeNull();
    expect(pending.manualPaymentReference).toBeNull();
    expect(pending.confirmationEmailSentAt).toBeNull();

    await submitManualPaymentProof(created.orderNumber, attendeeId, `/manus-storage/payments/proofs/${attendeeId}/proof-test.png`, "UPI-VERIFY-001");
    const submitted = (await database.select().from(registrations).where(eq(registrations.id, pending.id)).limit(1))[0];
    expect(submitted.manualPaymentReference).toBe("UPI-VERIFY-001");
    expect(submitted.paymentProofUrl).toBe(`/manus-storage/payments/proofs/${attendeeId}/proof-test.png`);
    expect(submitted.paymentProofSubmittedAt).not.toBeNull();

    const notification = await confirmManualPayment(eventId, pending.id, organizerId);
    expect(notification?.registration.orderNumber).toBe(created.orderNumber);
    await markRegistrationConfirmationSent(pending.id);

    const confirmed = (await database.select().from(registrations).where(eq(registrations.id, pending.id)).limit(1))[0];
    expect(confirmed.paymentStatus).toBe("paid");
    expect(confirmed.confirmationEmailSentAt).not.toBeNull();
    const attendeeRecords = await getRegistrations(attendeeId);
    expect(attendeeRecords.find(record => record.registration.id === pending.id)?.registration.paymentStatus).toBe("paid");
    const duplicate = await registerForEvent(eventId, ticketId, { id: attendeeId, publicId: attendeePublicId });
    expect(duplicate.alreadyRegistered).toBe(true);
    expect(duplicate.orderNumber).toBe(created.orderNumber);

  });

  it("persists the organizer public ID on new event drafts", async () => {
    draftEventId = await createDraftEvent({ id: organizerId, publicId: organizerPublicId });
    const draft = (await db().select().from(events).where(eq(events.id, draftEventId)).limit(1))[0];
    expect(draft.organizerId).toBe(organizerId);
    expect(draft.organizerPublicId).toBe(organizerPublicId);
  });
});
