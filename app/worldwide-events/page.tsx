import { Suspense } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { fetchWorldwideEvents, pickSlideshowEvents, type WorldwideSearchParams } from "../lib/worldwide-events";
import { balanceEventsByCountry } from "../lib/worldwide-diversity";
import { SEED_WORLDWIDE_EVENTS } from "../lib/worldwide-seed-events";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import WorldwideHeroSlideshow from "../components/WorldwideHeroSlideshow";
import WorldwideCategoryFilters from "../components/WorldwideCategoryFilters";
import WorldwideEventsToolbar from "../components/WorldwideEventsToolbar";
import WorldwideEventsCarousel from "../components/WorldwideEventsCarousel";
import WorldwideEventCard from "../components/WorldwideEventCard";
import WorldwideEmptyState from "../components/WorldwideEmptyState";

export const metadata = {
  title: "Discover Worldwide Events, Concerts & Experiences | Nexriva",
  description:
    "Explore live events across the globe — concerts, workshops, meetups, and community experiences powered by multiple providers.",
};

type WorldwideSearchParamsRaw = {
  search?: string;
  city?: string;
  country?: string;
  category?: string;
  date?: string;
  sort?: string;
  provider?: string;
  page?: string;
};

async function WorldwideContent({ searchParams }: { searchParams: Promise<WorldwideSearchParamsRaw> }) {
  const raw = await searchParams;
  const params: WorldwideSearchParams = {
    query: raw.search || undefined,
    city: raw.city || undefined,
    country: raw.country || undefined,
    category: raw.category || undefined,
    sortBy: (raw.sort as WorldwideSearchParams["sortBy"]) || "popularity",
    page: raw.page ? Number(raw.page) : 1,
    pageSize: 100,
  };

  if (raw.date === "today") {
    const today = new Date().toISOString().split("T")[0];
    params.startDateFrom = `${today}T00:00:00Z`;
    params.startDateTo = `${today}T23:59:59Z`;
  } else if (raw.date === "week") {
    const now = new Date();
    params.startDateFrom = now.toISOString();
    const next = new Date(now);
    next.setDate(next.getDate() + 7);
    params.startDateTo = next.toISOString();
  } else if (raw.date === "month") {
    const now = new Date();
    params.startDateFrom = now.toISOString();
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    params.startDateTo = next.toISOString();
  }

  let events = await fetchWorldwideEvents(params);

  // If live events are fewer than 100 and no specific provider filter was requested,
  // supplement with diverse international seed events to ensure a full 100+ global events across different countries.
  if (events.length < 100 && !raw.provider) {
    const existingKeys = new Set(events.map(e => `${e.title.toLowerCase()}|${e.city.toLowerCase()}`));
    const supplementary = SEED_WORLDWIDE_EVENTS.filter(e => {
      const key = `${e.title.toLowerCase()}|${e.city.toLowerCase()}`;
      return !existingKeys.has(key);
    });
    events = [...events, ...supplementary];
  }

  if (events.length === 0) {
    events = SEED_WORLDWIDE_EVENTS;
  }

  if (params.query) {
    const q = params.query.toLowerCase().trim();
    events = events.filter(e => e.title.toLowerCase().includes(q) || (e.description && e.description.toLowerCase().includes(q)) || e.city.toLowerCase().includes(q) || e.country.toLowerCase().includes(q));
  }
  if (params.city) {
    const c = params.city.toLowerCase().trim();
    events = events.filter(e => e.city.toLowerCase().includes(c));
  }
  if (params.country) {
    const co = params.country.toLowerCase().trim();
    events = events.filter(e => e.country.toLowerCase().includes(co) || e.countryCode.toLowerCase() === co);
  }
  if (params.category && params.category !== "all") {
    const cat = params.category.toLowerCase().trim();
    events = events.filter(e => (e.category || "").toLowerCase().includes(cat) || e.tags.some(t => t.toLowerCase().includes(cat)));
  }

  const limit = params.pageSize ?? 100;
  events = !params.country ? balanceEventsByCountry(events, limit, 2) : events.slice(0, limit);

  const carouselEvents = pickSlideshowEvents(events, 12);

  const hasFilters = Boolean(
    raw.search || raw.city || raw.country || raw.category || raw.date || raw.sort || raw.provider
  );

  return (
    <>
      <SiteNav />
      <main id="main-content" className="worldwide-events-shell">
        {/* Hero Slideshow — compact horizontal hero scrollbar strip */}
        <section className="shell" aria-label="Featured worldwide events slideshow">
          <WorldwideHeroSlideshow
            events={carouselEvents}
            heroTitle="Discover events across the globe."
            heroSubtitle="Concerts, workshops, meetups, and community experiences from multiple providers — all in one place."
          />
        </section>

        {/* Category Filters with Sub-categories */}
        <section className="shell" aria-label="Worldwide event categories">
          <Suspense fallback={<div className="ww-slideshow-skeleton" />}>
            <WorldwideCategoryFilters />
          </Suspense>
        </section>

        {/* Filter + Grid */}
        <section className="worldwide-discovery-section shell" aria-label="Filter and browse worldwide events">
          <Suspense fallback={<div className="ww-slideshow-skeleton" />}>
            <WorldwideEventsToolbar
              currentSearch={raw.search}
              currentCity={raw.city}
              currentCountry={raw.country}
              currentCategory={raw.category}
              currentDate={raw.date}
              currentSort={raw.sort}
              totalEvents={events.length}
            />
          </Suspense>

          {events.length > 0 ? (
            <WorldwideEventsCarousel events={events} />
          ) : (
            <WorldwideEmptyState
              search={raw.search}
              city={raw.city}
              category={raw.category}
              date={raw.date}
              provider={raw.provider}
            />
          )}
        </section>

        {/* Footer CTA */}
        <section className="worldwide-host-cta shell" aria-label="Organizer call to action">
          <Link href="/events" className="btn btn-coral">
            Browse local events on Nexriva →
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

export default function WorldwideEventsPage({
  searchParams,
}: {
  searchParams: Promise<WorldwideSearchParamsRaw>;
}) {
  return (
    <Suspense
      fallback={
        <div className="shell page-loading" style={{ padding: "80px 0", textAlign: "center" }}>
          <p>Loading events…</p>
        </div>
      }
    >
      <WorldwideContent searchParams={searchParams} />
    </Suspense>
  );
}