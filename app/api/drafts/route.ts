import { NextResponse } from "next/server";
import { currentUser } from "../../lib/auth";
import { findActiveVenueConflict, getApprovedVenue, getOrganizerEvent, replaceQuestions, replaceTickets, updateEvent } from "../../lib/db";
import { canSubmitWizardStep, normalizeTicketGst } from "../../lib/workflow";
import { normalizeFillingFastThreshold } from "../../lib/registration-status";
import { canEditEventForModeration } from "../../lib/moderation";
import { coordinateToE6, normalizeLocationText } from "../../lib/location";
import { venueConflictMessage } from "../../lib/venue-booking";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await request.json() as { eventId?: number; step?: number; fields?: Record<string, string> };
  const eventId = Number(body.eventId); const step = Number(body.step); const fields = body.fields || {};
  if (!Number.isSafeInteger(eventId) || !Number.isSafeInteger(step)) return NextResponse.json({ error: "Invalid draft request" }, { status: 400 });
  const event = await getOrganizerEvent(eventId, user.id);
  if (!event || !canSubmitWizardStep(event.currentStep, step)) return NextResponse.json({ error: "Draft step is locked" }, { status: 403 });
  if (!canEditEventForModeration(event.moderationStatus)) return NextResponse.json({ error: "This event is under administrator review and cannot be edited until changes are requested" }, { status: 409 });
  if (step === 1) {
    const startsAt = fields.startsDate && fields.startsTime ? new Date(`${fields.startsDate}T${fields.startsTime}`) : null;
    const endsAt = fields.endsDate && fields.endsTime ? new Date(`${fields.endsDate}T${fields.endsTime}`) : null;
    await updateEvent(eventId, user.id, {
      title: fields.title || "Untitled event",
      displayName: fields.displayName || "Untitled event",
      visibility: (fields.visibility || "public") as "public" | "private" | "external",
      categoryId: Number(fields.categoryId) || null,
      startsAt: Number.isFinite(startsAt?.valueOf()) ? startsAt : null,
      endsAt: Number.isFinite(endsAt?.valueOf()) ? endsAt : null,
      timezone: fields.timezone || "Asia/Calcutta",
    });
  }
  if (step === 2) {
    const locationMode = fields.locationMode === "undecided" ? "undecided" : "address";
    const bibExpoDate = fields.bibExpoDate ? new Date(`${fields.bibExpoDate}T00:00:00`) : null;
    if (locationMode === "undecided") await updateEvent(eventId, user.id, { locationMode, bibExpoDate });
    else if (fields.locationSource === "directory") {
      const venue = await getApprovedVenue(Number(fields.approvedVenueId));
      if (!venue) return NextResponse.json({ error: "Choose an active approved venue or use manual location" }, { status: 400 });
      const conflict = await findActiveVenueConflict(eventId, venue.id);
      if (conflict) return NextResponse.json({ error: venueConflictMessage(conflict), conflict: { venueId: venue.id, eventId: conflict.eventId, displayName: conflict.displayName, startsAt: conflict.startsAt, endsAt: conflict.endsAt } }, { status: 409 });
      const address = venue.address || [venue.location, venue.sector, venue.area, venue.city].filter(Boolean).join(", ");
      await updateEvent(eventId, user.id, { locationMode, locationSource: "directory", approvedVenueId: venue.id, city: venue.city, venueName: venue.venueName, addressLine1: venue.location, addressLine2: venue.address || null, address, zone: venue.zone, ward: venue.ward, sector: venue.sector, area: venue.area, latitudeE6: venue.latitudeE6, longitudeE6: venue.longitudeE6, venueSetting: venue.setting, venueCapacity: venue.capacity, venueIsAccessible: venue.isAccessible, venueAccessibilityNotes: venue.accessibilityNotes, bibExpoDate });
    } else {
      const latitudeE6 = fields.latitude ? coordinateToE6(fields.latitude, "latitude") : null;
      const longitudeE6 = fields.longitude ? coordinateToE6(fields.longitude, "longitude") : null;
      const capacityText = fields.venueCapacity || ""; const venueCapacity = capacityText ? Number(capacityText) : null;
      if ((fields.latitude && latitudeE6 === null) || (fields.longitude && longitudeE6 === null)) return NextResponse.json({ error: "Enter valid GPS coordinates" }, { status: 400 });
      if (venueCapacity !== null && (!Number.isInteger(venueCapacity) || venueCapacity < 1 || venueCapacity > 1_000_000)) return NextResponse.json({ error: "Venue capacity must be a whole number between 1 and 1000000" }, { status: 400 });
      const city = normalizeLocationText(fields.city, 100); const venueName = normalizeLocationText(fields.venueName, 160); const addressLine1 = normalizeLocationText(fields.addressLine1, 220); const addressLine2 = normalizeLocationText(fields.addressLine2, 220);
      await updateEvent(eventId, user.id, { locationMode, locationSource: "manual", approvedVenueId: null, city: city || null, venueName: venueName || null, addressLine1: addressLine1 || null, addressLine2: addressLine2 || null, address: [addressLine1, addressLine2, normalizeLocationText(fields.sector, 100), normalizeLocationText(fields.area, 120), city].filter(Boolean).join(", ") || null, zone: normalizeLocationText(fields.zone, 100) || null, ward: normalizeLocationText(fields.ward, 100) || null, sector: normalizeLocationText(fields.sector, 100) || null, area: normalizeLocationText(fields.area, 120) || null, latitudeE6, longitudeE6, venueSetting: fields.venueSetting === "indoor" || fields.venueSetting === "outdoor" ? fields.venueSetting : null, venueCapacity, venueIsAccessible: fields.venueIsAccessible === "true", venueAccessibilityNotes: normalizeLocationText(fields.venueAccessibilityNotes, 1500) || null, bibExpoDate });
    }
  }
  if (step === 3) await updateEvent(eventId, user.id, { description: fields.description || null });
  if (step === 4 && fields.coverUrl) await updateEvent(eventId, user.id, { coverUrl: fields.coverUrl });
  if (step === 5) { await updateEvent(eventId, user.id, { fillingFastThresholdPercent: normalizeFillingFastThreshold(fields.fillingFastThresholdPercent) }); if (fields.ticketsJson) { try { const parsed = JSON.parse(fields.ticketsJson); if (Array.isArray(parsed)) await replaceTickets(eventId, user.id, parsed.filter(item => item?.name).map(item => { const ticketCategory = item.ticketCategory === "paid" || item.ticketCategory === "donation" ? item.ticketCategory : "free"; return { id: Number(item.id) || undefined, name: String(item.name), description: item.description ? String(item.description) : undefined, pricePaise: ticketCategory === "free" ? 0 : Math.max(0, Math.round(Number(item.price) * 100)), quantityLimit: Math.max(1, Number(item.quantityLimit) || 1), ticketCategory, ...normalizeTicketGst(ticketCategory, item.gstApplicable, item.gstRatePercent), minPerBooking: Math.max(1, Number(item.minPerBooking) || 1), maxPerBooking: Math.max(1, Number(item.maxPerBooking) || 10), platformFeePayer: item.platformFeePayer === "buyer" ? "buyer" : "organizer", fitizenFeePayer: item.fitizenFeePayer === "buyer" ? "buyer" : "organizer", gatewayFeePayer: item.gatewayFeePayer === "buyer" ? "buyer" : "organizer", attendeeMessage: item.attendeeMessage ? String(item.attendeeMessage) : undefined, salesStartAt: item.salesStartDate && item.salesStartTime ? new Date(`${item.salesStartDate}T${item.salesStartTime}`) : undefined, salesEndAt: item.salesEndDate && item.salesEndTime ? new Date(`${item.salesEndDate}T${item.salesEndTime}`) : undefined }; })); } catch { return NextResponse.json({ error: "Invalid ticket draft" }, { status: 400 }); } } }
  if (step === 6 && fields.questionsJson) { try { const parsed = JSON.parse(fields.questionsJson); if (Array.isArray(parsed)) await replaceQuestions(eventId, user.id, parsed.filter(item => item?.question).map(item => ({ question: String(item.question), fieldType: ["short_text", "long_text", "select", "checkbox"].includes(item.fieldType) ? item.fieldType : "short_text", required: Boolean(item.required) }))); } catch { return NextResponse.json({ error: "Invalid question draft" }, { status: 400 }); } }
  return NextResponse.json({ saved: true });
}
