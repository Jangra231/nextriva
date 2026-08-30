import Link from "next/link";
import { CalendarDays, Heart, MapPin, Search } from "lucide-react";
import DashboardShell from "../../components/DashboardShell";
import { currentUser } from "../../lib/auth";
import { getFollowedEvents } from "../../lib/db";

const dateLabel = (value: Date | string | null) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Date to be confirmed";

export default async function Following() {
  const user = await currentUser();
  if (!user) return null;
  const follows = await getFollowedEvents(user.id);
  return <DashboardShell active="" mode="participant"><div className="dash-page-head"><div><span className="eyebrow">Attending</span><h1 className="page-title" style={{ marginTop: 11 }}>Following</h1><p>Events you saved to revisit when you are ready to book.</p></div><Link href="/events" className="btn btn-outline"><Search size={15} /> Discover events</Link></div>{follows.length ? <div className="following-grid">{follows.map(({ follow, event, category }) => <article className="following-card" key={follow.id}><Link href={`/events/${event.slug}`} className="following-cover">{event.coverUrl ? <img src={event.coverUrl} alt={`${event.displayName} banner`} /> : <span>F</span>}</Link><div className="following-copy"><span className="eyebrow">{category?.name || "Event"}</span><h2><Link href={`/events/${event.slug}`}>{event.displayName}</Link></h2><p><CalendarDays size={14} aria-hidden="true" /> {dateLabel(event.startsAt)}</p><p><MapPin size={14} aria-hidden="true" /> {event.city || "Location to be confirmed"}</p><Link className="text-button" href={`/events/${event.slug}`}>View event</Link></div></article>)}</div> : <section className="empty-card"><Heart size={28} aria-hidden="true" /><h2>No followed events yet</h2><p>Save events from their public pages to keep them here for quick access.</p><Link href="/events" className="btn btn-coral">Discover events</Link></section>}</DashboardShell>;
}
