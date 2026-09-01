import Link from "next/link";
import { Accessibility, CalendarDays, Download, MapPin, UsersRound } from "lucide-react";
import OrganizerEventShare from "./OrganizerEventShare";
import shareStyles from "./OrganizerEventShare.module.css";
import styles from "./EventCard.module.css";
import { getRegistrationStatusBadge, getRemainingCapacity, RegistrationCapacity } from "../lib/registration-status";
import { effectiveModerationStatus, moderationLabel, type ModerationStatus } from "../lib/moderation";

type EventCardProps = {
  event: { id: number; publicId?: string; slug: string; displayName: string; startsAt: Date | string | null; city: string | null; coverUrl: string | null; status?: "live" | "completed" | "draft"; moderationStatus?: ModerationStatus; fillingFastThresholdPercent?: number; venueCapacity?: number | null; venueIsAccessible?: boolean; venueAccessibilityNotes?: string | null };
  category?: { name: string | null } | null;
  adminHref?: string;
  origin?: string;
  registration?: RegistrationCapacity;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function dateText(value: Date | string | null) {
  return value ? `${new Date(value).getUTCDate()} ${MONTHS[new Date(value).getUTCMonth()]} ${new Date(value).getUTCFullYear()}` : "Date to be confirmed";
}

export default function EventCard({ event, category, adminHref, origin, registration }: EventCardProps) {
  const availability = event.status === "live" ? getRegistrationStatusBadge(registration, event.fillingFastThresholdPercent) : null;
  const moderation = event.moderationStatus ? effectiveModerationStatus({ status: event.status || "draft", moderationStatus: event.moderationStatus }) : undefined;
  const remaining = getRemainingCapacity(registration);
  const content = (
    <>
      <div className="event-cover">
        {event.coverUrl ? <img src={event.coverUrl} alt="" /> : <div className="cover-placeholder"><span>F</span></div>}
      </div>
      <div className="event-card-copy">
        <div className="event-meta"><span>{category?.name || "Event"}</span><span className="event-statuses">{availability ? <span className={`registration-badge ${availability.tone}`} title={availability.description}>{availability.label}</span> : null}{moderation ? <span className={`status ${moderation}`}>{moderationLabel(moderation)}</span> : event.status ? <span className={`status ${event.status}`}>{event.status === "live" ? "Live" : event.status === "completed" ? "Completed" : "Draft"}</span> : null}</span></div>
        <h3>{event.displayName}</h3>
        <p><CalendarDays size={13} /> {dateText(event.startsAt)}</p>
        <p><MapPin size={13} /> {event.city || "Location to be confirmed"}</p>
        {event.publicId ? <p className="event-public-id">Event ID: {event.publicId}</p> : null}
        {!adminHref && remaining !== null ? <p className="capacity-remaining" aria-label={`${remaining} places remaining`}>{remaining === 0 ? "No places remaining" : `${remaining} ${remaining === 1 ? "place" : "places"} remaining`}</p> : null}
        {!adminHref && (event.venueCapacity || event.venueIsAccessible) ? <div className={styles.venueFacts} aria-label="Venue information">{event.venueCapacity ? <span className={styles.venueFact} title={`Venue capacity: ${event.venueCapacity.toLocaleString()} people`}><UsersRound size={13} aria-hidden="true" /> Venue cap. {event.venueCapacity.toLocaleString()}</span> : null}{event.venueIsAccessible ? <span className={`${styles.venueFact} ${styles.venueFactAccessible}`} title={event.venueAccessibilityNotes || "Accessible venue"}><Accessibility size={13} aria-hidden="true" /> Accessible</span> : null}</div> : null}
      </div>
    </>
  );
  if (!adminHref) return <Link href={`/events/${event.slug}`} className="event-card event-admin">{content}</Link>;
  return <article className={`event-card event-admin ${shareStyles.adminCard}`}><Link href={adminHref} className="event-card-main">{content}</Link><div className={shareStyles.toolbar}>{event.status !== "draft" ? <a className={shareStyles.export} href={`/api/exports/attendees?eventId=${event.id}`} download aria-label={`Export registered participants for ${event.displayName} as CSV`}><Download size={13} aria-hidden="true" /> CSV</a> : null}{event.status === "live" && moderation === "approved" ? <OrganizerEventShare eventName={event.displayName} slug={event.slug} origin={origin} registrationQrAvailable /> : null}<details className="card-actions"><summary className="menu-dots" aria-label={`Open actions for ${event.displayName}`}>•••</summary><div><Link href={adminHref}>Edit event</Link><Link href={`/events/${event.slug}`}>View public page</Link></div></details></div></article>;
}
