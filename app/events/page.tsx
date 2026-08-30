import Link from "next/link";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import EventCard from "../components/EventCard";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import { getCategories, listPublicEvents } from "../lib/db";

const quickFilters = ["This Weekend", "Free", "This Week", "This Month", "Tomorrow", "Today", "Paid"];

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ search?: string; city?: string; category?: string; filter?: string; accessible?: string; error?: string }> }) {
  const params = await searchParams;
  const [events, categories] = await Promise.all([listPublicEvents(params), getCategories()]);
  return <><SiteNav /><main id="main-content" className="section shell">
    <div className="section-head"><div><span className="eyebrow">Discover events</span><h1 style={{ fontSize: "clamp(38px,5vw,60px)", marginBottom: 8 }}>Find the right <em>room.</em></h1><p>{params.filter ? `Showing ${params.filter} events` : "Search by interest, location or date."}</p></div></div>
    {params.error ? <div className="error-note">{params.error}</div> : null}
    <form className="search-panel" action="/events" aria-label="Search events">
      <label className="field-inline"><span className="sr-only">Search events, interests, or activities</span><Search size={18} aria-hidden="true" /><input name="search" aria-label="Search events, interests, or activities" defaultValue={params.search} placeholder="Search for events, interests or activities" /></label>
      <label className="field-inline"><span className="sr-only">Choose city</span><MapPin size={17} aria-hidden="true" /><select name="city" aria-label="Choose city" defaultValue={params.city || "All cities"}><option>All cities</option><option>Bengaluru</option><option>Delhi NCR</option><option>Mumbai</option><option>Hyderabad</option><option>Pune</option></select></label><label className="choice discovery-accessible"><input name="accessible" value="1" type="checkbox" defaultChecked={params.accessible === "1"} /><span>Accessible venues</span></label>
      <button className="btn btn-coral" type="submit">Search</button>
    </form>
    <div className="quick-row"><SlidersHorizontal size={15} /><strong>Quick filters</strong>{quickFilters.map(filter => <Link key={filter} className={`filter-chip ${params.filter === filter ? "active" : ""}`} href={`/events?filter=${encodeURIComponent(filter)}`}>{filter}</Link>)}<Link className={`filter-chip ${params.accessible === "1" ? "active" : ""}`} href="/events?accessible=1">Accessible venues</Link></div>
    <div className="section-head" style={{ marginTop: 8 }}><div><h2>Category filters</h2></div></div>
    <div className="quick-row" style={{ paddingTop: 0 }}><Link className={`filter-chip ${!params.category ? "active" : ""}`} href="/events">All categories</Link>{categories.map(category => <Link key={category.id} className={`filter-chip ${params.category === category.slug ? "active" : ""}`} href={`/events?category=${category.slug}`}>{category.name}</Link>)}</div>
    {events.length ? <div className="event-grid">{events.map(({ event, category, registration }) => <EventCard key={event.id} event={event} category={category} registration={registration} />)}</div> : <div className="empty-card"><h3>No live events match that view.</h3><p>Try a different category, city, or date filter. Organizers can publish a new listing from their dashboard.</p><Link href="/dashboard/manage-events/events" className="btn btn-ink">Open My Events</Link></div>}
  </main><SiteFooter /></>;
}
