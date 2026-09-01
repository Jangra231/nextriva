import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import SiteNav from "../../components/SiteNav";
import ShareEvent from "../../components/ShareEvent";
import EventFavoriteButton from "../../components/EventFavoriteButton";
import RegistrationPanel from "../../components/RegistrationPanel";
import EventRegistrationQr from "../../components/EventRegistrationQr";
import { currentUser } from "../../lib/auth";
import { getActiveRegistrationForEvent, getPaymentBooking, getPublicEvent, isEventFavorite } from "../../lib/db";
import { eventRegistrationPath } from "../../lib/event-qr";
import { mapUrl } from "../../lib/location";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const dateTime = (value: Date | string | null) => {
  if (!value) return "To be confirmed";
  const d = new Date(value);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const timeStr = `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${timeStr}`;
};

export default async function EventDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ booking?: string; payment?: string; qr?: string }> }) {
  const { slug } = await params;
  const { booking: bookingNumber, payment, qr } = await searchParams;
  const data = await getPublicEvent(slug);
  if (!data) notFound();
  const { event, category, tickets, gatewayFeePercent } = data;
  const user = await currentUser();
  const isFavorite = user ? await isEventFavorite(event.id, user.id) : false;
  const existingRegistration = user ? await getActiveRegistrationForEvent(event.id, user.id) : undefined;
  const booking = user ? await getPaymentBooking(bookingNumber || (existingRegistration?.paymentStatus === "pending" || existingRegistration?.paymentStatus === "failed" ? existingRegistration.orderNumber : ""), user.id, event.id) : undefined;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const publicUrl = host ? `${protocol}://${host}/events/${slug}` : `/events/${slug}`;
  const registrationUrl = host ? `${protocol}://${host}${eventRegistrationPath(slug)}` : eventRegistrationPath(slug);
  const directionsUrl = mapUrl(event.latitudeE6, event.longitudeE6);
  const preciseLocation = [event.addressLine1, event.addressLine2, event.sector, event.area].filter(Boolean).join(", ");

  return <><SiteNav /><main id="main-content" className="event-detail shell">
    {qr === "registered" && existingRegistration ? <div className="qr-registration-modal" role="dialog" aria-modal="true" aria-label="Existing registration"><h2>You are already registered</h2><p>Your place for <b>{event.displayName}</b> is already reserved.</p><p>Event ID <b>{event.publicId}</b>{user ? <> · Your user ID <b>{user.publicId}</b></> : null}</p><a className="btn btn-outline" href="/dashboard/my-bookings">View My Registrations</a><a className="text-button" href={`/events/${slug}`}>Close</a></div> : null}
    {qr === "register" ? <div className="notice">You&apos;re signed in. Choose a ticket below to complete your event registration.</div> : null}
    <div className="detail-hero">
      <div className="detail-cover">{event.coverUrl ? <img src={event.coverUrl} alt={`${event.displayName} banner`} /> : <div className="cover-placeholder" aria-label="Event banner unavailable">N</div>}<EventRegistrationQr eventName={event.displayName} registrationPath={eventRegistrationPath(slug)} registrationUrl={registrationUrl} banner /></div>
      <div className="detail-copy">
        <span className="eyebrow">{category?.name || "Event"}</span><h1>{event.displayName}</h1><p>{event.description}</p>
        <div className="info-list">
          <div className="info-item"><span className="info-icon"><CalendarDays size={16} aria-hidden="true" /></span>{dateTime(event.startsAt)}</div>
          <div className="info-item"><span className="info-icon"><Clock3 size={16} aria-hidden="true" /></span>{event.timezone}</div>
          <div className="info-item"><span className="info-icon"><MapPin size={16} aria-hidden="true" /></span><span><b>{event.venueName || "Venue to be confirmed"}</b>, {event.city || "City pending"}{event.venueSetting ? <> · {event.venueSetting}</> : null}{preciseLocation ? <small className="location-detail">{preciseLocation}</small> : null}{event.zone || event.ward ? <small className="location-detail">{[event.zone, event.ward].filter(Boolean).join(" · ")}</small> : null}{event.venueCapacity ? <small className="location-detail">Venue capacity: {event.venueCapacity.toLocaleString("en-IN")}</small> : null}{event.venueIsAccessible ? <small className="location-detail">Accessible venue{event.venueAccessibilityNotes ? ` · ${event.venueAccessibilityNotes}` : ""}</small> : null}{directionsUrl ? <a className="location-directions" href={directionsUrl} target="_blank" rel="noreferrer">Open exact location in maps</a> : null}</span></div>
        </div>
        <p className="identifier-note"><b>Event ID:</b> {event.publicId}</p>
        <EventFavoriteButton eventId={event.id} slug={slug} isSignedIn={Boolean(user)} isFavorite={isFavorite} />
        <ShareEvent title={event.displayName} url={publicUrl} />
        <RegistrationPanel eventId={event.id} eventPublicId={event.publicId} userPublicId={user?.publicId} slug={slug} tickets={tickets} platformFeePercent={event.platformFeePercent} gatewayFeePercent={gatewayFeePercent} existingRegistration={existingRegistration ? { orderNumber: existingRegistration.orderNumber, paymentStatus: existingRegistration.paymentStatus } : undefined} booking={booking ? { orderNumber: booking.registration.orderNumber, paymentStatus: booking.registration.paymentStatus, paidAmountPaise: booking.registration.paidAmountPaise, manualPaymentReference: booking.registration.manualPaymentReference, paymentProofUrl: booking.registration.paymentProofUrl, paymentRejectionNote: booking.registration.paymentRejectionNote } : undefined} paymentNotice={payment} manualPayment={{ enabled: event.manualPaymentEnabled, method: event.manualPaymentMethod, upiId: event.upiId, bankAccountName: event.bankAccountName, bankAccountNumber: event.bankAccountNumber, bankIfsc: event.bankIfsc, bankName: event.bankName, note: event.manualPaymentNote }} />
      </div>
    </div>
  </main></>;
}
