import { Suspense } from "react";
import type { Metadata } from "next";
import EventCard from "../components/EventCard";
import EventsEmptyState from "../components/EventsEmptyState";
import EventsFilterToolbar from "../components/EventsFilterToolbar";
import EventsHostBanner from "../components/EventsHostBanner";
import Interactive3DHero from "../components/Interactive3DHero";
import SiteFooter from "../components/SiteFooter";
import SiteNav from "../components/SiteNav";
import { getCategories, listPublicEvents } from "../lib/db";

export const metadata: Metadata = {
  title: "Discover Events Near You | Nexriva",
  description: "Find verified concerts, workshops, sports, meetups, and community experiences across India.",
};

type EventsSearchParams = {
  search?: string;
  city?: string;
  category?: string;
  filter?: string;
  state?: string;
  sort?: string;
  accessible?: string;
  error?: string;
};

function EventsToolbar({
  categories,
  totalEvents,
  params,
}: {
  categories: Array<{ id: number; name: string; slug: string }>;
  totalEvents: number;
  params: EventsSearchParams;
}) {
  return (
    <EventsFilterToolbar
      categories={categories}
      totalEvents={totalEvents}
      currentCategory={params.category}
      currentFilter={params.filter}
      currentCity={params.city}
      currentState={params.state}
      currentSearch={params.search}
      currentSort={params.sort}
      currentAccessible={params.accessible}
    />
  );
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<EventsSearchParams>;
}) {
  const params = await searchParams;
  const [events, categories] = await Promise.all([listPublicEvents(params), getCategories()]);

  return (
    <>
      <SiteNav />
      <main id="main-content" className="events-page-shell">
        <div className="shell">
          <Interactive3DHero eventCount={events.length} initialSearch={params.search} />
          {params.error ? <div className="error-note" role="alert">{params.error}</div> : null}
          <Suspense fallback={<div className="events-toolbar-loading" aria-busy="true" aria-label="Loading event filters" />}>
            <EventsToolbar categories={categories} totalEvents={events.length} params={params} />
          </Suspense>
        </div>

        <section className="section shell" aria-label="Event results">
          {events.length ? (
            <div className="event-grid">
              {events.map(({ event, category, registration }) => (
                <EventCard
                  key={event.id}
                  event={event}
                  category={category}
                  registration={registration}
                />
              ))}
            </div>
          ) : (
            <EventsEmptyState
              search={params.search}
              city={params.city}
              category={params.category}
              filter={params.filter}
              accessible={params.accessible}
            />
          )}
        </section>

        <div className="shell"><EventsHostBanner /></div>
      </main>
      <SiteFooter />
    </>
  );
}
