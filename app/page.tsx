import Link from "next/link";
import { CalendarDays } from "lucide-react";
import EventCard from "./components/EventCard";
import { DiscoveryForm, DiscoveryQuickFilters, DiscoveryResults } from "./components/DiscoveryExperience";
import SiteNav from "./components/SiteNav";
import HeroCarousel from "./components/HeroCarousel";
import SiteFooter from "./components/SiteFooter";
import { getCategories, listPublicEvents } from "./lib/db";
import { normalizeEventSort } from "./lib/discovery";
import { fetchWorldwideEvents } from "./lib/worldwide-events";
import WorldwideEventsCarousel from "./components/WorldwideEventsCarousel";

const quickFilters = ["This Weekend", "Free", "This Week", "This Month", "Tomorrow", "Today", "Paid"];

type DiscoveryParams = { search?: string; city?: string; category?: string; filter?: string; sort?: string; accessible?: string; banner?: string };

export default async function Home({ searchParams }: { searchParams: Promise<DiscoveryParams> }) {
  const params = await searchParams;
  const [featured, categories, worldwideEvents] = await Promise.all([
    listPublicEvents(params),
    getCategories(),
    fetchWorldwideEvents({ pageSize: 12, sortBy: "popularity" }),
  ]);
  const sort = normalizeEventSort(params.sort);
  const hasFilters = Boolean(params.search || (params.city && params.city !== "All cities") || params.category || params.filter || params.sort || params.accessible);
  return (
    <>
      <SiteNav />
      <main id="main-content">
          <section className="hero shell">
            <div className="hero-grid"><div><span className="eyebrow">India&apos;s event community</span><h1>Find your next <em>good story.</em></h1><p className="hero-copy">From sunrise runs to pop-up supper clubs, Nexriva brings together the events people talk about long after they&apos;re over.</p><DiscoveryForm params={params} categories={categories} /></div><HeroCarousel active={Number(params.banner)} params={params} /></div>
            <DiscoveryQuickFilters filters={quickFilters} activeFilter={params.filter} sort={sort} params={params} />
          </section>
          <section className="worldwide-home-banner shell">
            <div className="section-head" style={{ marginBottom: "6px" }}>
              <div>
                <h2>Worldwide Events</h2>
                <p>Discover 12 of the most famous events happening across the globe.</p>
              </div>
              <Link href="/worldwide-events" className="link-arrow">Explore worldwide ({worldwideEvents.length}) →</Link>
            </div>
            {worldwideEvents.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                <WorldwideEventsCarousel events={worldwideEvents} hideViewToggle={true} />
              </div>
            )}
          </section>
          <section className="section shell"><div className="section-head"><div><h2>{hasFilters ? "Matching events" : "Fresh ways to spend a day"}</h2><p>{hasFilters ? `${featured.length} live event${featured.length === 1 ? "" : "s"} match your discovery settings.` : "Live events curated from the Nexriva community."}</p></div><Link href="/events" className="link-arrow">Browse all events →</Link></div><DiscoveryResults>{featured.length ? <div className="local-events-track" role="region" aria-label="Local events single line">{featured.map(({ event, category, registration }) => <div className="local-events-item" key={event.id}><EventCard event={event} category={category} registration={registration} /></div>)}</div> : <div className="empty-card"><CalendarDays size={30} color="#f65f4a" /><h3>Your next event will show up here.</h3><p>Start your event setup now. You can save it as a draft and finish each section whenever you are ready.</p><Link href="/dashboard/manage-events/create-event/new" className="btn btn-coral">Create Event</Link></div>}</DiscoveryResults></section>
      </main>
      <SiteFooter />
    </>
  );
}
