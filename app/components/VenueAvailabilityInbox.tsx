import { BellRing, MapPinned } from "lucide-react";
import Link from "next/link";
import { markVenueAvailabilityNotificationReadAction } from "../actions";
import { getOrganizerVenueAvailabilityNotifications } from "../lib/db";
import styles from "./VenueAvailabilityInbox.module.css";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function utcDateString(ts: string | Date) {
  const d = new Date(ts);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

type Notification = Awaited<ReturnType<typeof getOrganizerVenueAvailabilityNotifications>>[number];

export default function VenueAvailabilityInbox({ notifications }: { notifications: Notification[] }) {
  const unread = notifications.filter(item => !item.notification.readAt);
  if (!unread.length) return null;
  return <section className={`panel ${styles.inbox}`}><div className="section-head"><div><span className="eyebrow"><BellRing size={13} /> Venue updates</span><h3>{unread.length} venue{unread.length === 1 ? " is" : "s are"} now available</h3><p>These are private in-app alerts from venues you asked to watch while they were reserved.</p></div></div><div className={styles.list}>{unread.map(({ notification, venue }) => <article className={styles.item} key={notification.id}><div><span><MapPinned size={15} /><b>{notification.title}</b></span><p>{notification.body}</p><small>{venue ? `${venue.city} · ${venue.zone} · ${venue.ward}` : "Approved venue directory"} · {utcDateString(notification.createdAt)}</small></div><div className={styles.actions}><Link className="btn btn-outline btn-small" href="/dashboard/manage-events/create-event/new">Use this venue</Link><form action={markVenueAvailabilityNotificationReadAction}><input type="hidden" name="notificationId" value={notification.id} /><button type="submit">Mark read</button></form></div></article>)}</div></section>;
}
