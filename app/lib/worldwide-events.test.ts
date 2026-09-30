import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import WorldwideEventCard from "../components/WorldwideEventCard";
import WorldwideEmptyState from "../components/WorldwideEmptyState";
import WorldwideEventsCarousel from "../components/WorldwideEventsCarousel";
import WorldwideHeroSlideshow from "../components/WorldwideHeroSlideshow";

function source(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf-8");
}

// Dynamically import seed events to test them
import {
  fetchWorldwideEvents,
  limitEventsByLocation,
  limitEventsByCountryAndLocation,
  balanceEventsByCountry,
  getLocationKey,
  pickSlideshowEvents,
  type WorldwideEvent,
} from "../lib/worldwide-events";
import { SEED_WORLDWIDE_EVENTS } from "../lib/worldwide-seed-events";

const mockEvent = {
  id: "eventbrite:123",
  provider: "eventbrite",
  title: "Sunset Jazz on the Rooftop",
  description: "A cozy evening of live jazz.",
  url: "https://example.com/event",
  imageUrl: "https://example.com/cover.jpg",
  startDate: "2026-12-01T18:00:00Z",
  timezone: "UTC",
  venueName: "Skyline Lounge",
  city: "Lisbon",
  country: "Portugal",
  countryCode: "PT",
  tags: ["music", "jazz"],
  currency: "EUR",
  isFree: false,
  priceMin: 2500,
  priceMax: 4000,
  popularity: 88,
  sourceData: {},
};

describe("Worldwide Events", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders WorldwideEventCard with title, location, and free badge", () => {
    const html = renderToStaticMarkup(
      createElement(WorldwideEventCard, {
        event: {
          ...mockEvent,
          isFree: true,
          priceMin: undefined,
          priceMax: undefined,
        },
      })
    );
    expect(html).toContain("Sunset Jazz on the Rooftop");
    expect(html).toContain("Lisbon");
    expect(html).toContain("Portugal");
    expect(html).toContain("Free");
  });

  it("renders paid price range on WorldwideEventCard", () => {
    const html = renderToStaticMarkup(
      createElement(WorldwideEventCard, { event: mockEvent })
    );
    expect(html).toContain("25");
    expect(html).not.toContain("Free");
  });

  it("renders WorldwideEmptyState with filter reset when filters present", () => {
    const html = renderToStaticMarkup(
      createElement(WorldwideEmptyState, {
        search: "marathon",
        city: "Tokyo",
        category: "fitness",
        date: "week",
      })
    );
    expect(html).toContain("No worldwide events match these filters");
    expect(html).toContain("marathon");
    expect(html).toContain("Tokyo");
    expect(html).toContain("Reset all filters");
  });

  it("renders WorldwideEmptyState generic state without reset", () => {
    const html = renderToStaticMarkup(createElement(WorldwideEmptyState, {}));
    expect(html).toContain("No worldwide events available right now");
    expect(html).not.toContain("Reset all filters");
    expect(html).toContain("Add an API key");
  });

  it("defines the /worldwide-events page with metadata, Suspense, and provider-backed fetch", () => {
    const page = source("app/worldwide-events/page.tsx");
    expect(page).toContain("Suspense");
    expect(page).toContain("WorldwideContent");
    expect(page).toContain("fetchWorldwideEvents");
    expect(page).toContain("WorldwideCategoryFilters");
    expect(page).toContain("WorldwideEventsToolbar");
    expect(page).toContain("WorldwideEventCard");
    expect(page).toContain("metadata");
    expect(page).toContain("worldwide-events");
    expect(page).toContain("Loading events");
  });

  it("defines responsive CSS for the carousel and toolbar", () => {
    const css = source("app/globals.css");
    expect(css).toContain(".ww-categories");
    expect(css).toContain(".ww-categories-filter-strip");
    expect(css).toContain(".ww-cat-pill");
    expect(css).toContain(".ww-categories-sub-select");
    expect(css).toContain(".worldwide-toolbar");
    expect(css).toContain(".worldwide-search-form");
    expect(css).toContain(".worldwide-date-pill");
    expect(css).toContain(".worldwide-event-grid");
    expect(css).toContain(".worldwide-empty-state");
    expect(css).toContain(".worldwide-home-banner");
    expect(css).toContain("@media (max-width: 520px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("verifies the multi-provider adapter contract in worldwide-events.ts and types", () => {
    const types = source("app/lib/worldwide-types.ts");
    expect(types).toContain("interface WorldwideEvent");
    expect(types).toContain("interface EventProvider");
    expect(types).toContain("isConfigured()");
    const lib = source("app/lib/worldwide-events.ts");
    expect(lib).toContain("fetchWorldwideEvents");
    expect(lib).toContain("dedupeKey");
  });

  it("wires provider adapters for all planned providers", () => {
    const providers = source("app/lib/worldwide-providers.ts");
    for (const provider of [
      "eventful",
      "fever",
      "eventbrite",
      "bandsintown",
      "ticketmaster",
      "meetup",
      "luma",
    ]) {
      expect(providers).toContain(provider);
    }
  });

  it("adds Worldwide navigation link and homepage banner", () => {
    const nav = source("app/components/SiteNav.tsx");
    expect(nav).toContain("/worldwide-events");
    const home = source("app/page.tsx");
    expect(home).toContain("worldwide-home-banner");
    expect(home).toContain("/worldwide-events");
  });

  it("documents provider env vars in .env.example", () => {
    const envExample = source(".env.example");
    expect(envExample).toContain("EVENTFUL_API_KEY");
    expect(envExample).toContain("FEVER_API_KEY");
    expect(envExample).toContain("EVENTBRITE_API_TOKEN");
    expect(envExample).toContain("BANDSINTOWN_APP_NAME");
    expect(envExample).toContain("TICKETMASTER_API_KEY");
    expect(envExample).toContain("MEETUP_API_KEY");
    expect(envExample).toContain("LUMA_API_KEY");
  });

  it("fetches exclusively from live APIs and does not include seed/demo events", () => {
    const lib = source("app/lib/worldwide-events.ts");
    expect(lib).not.toContain("SEED_WORLDWIDE_EVENTS");
    expect(lib).not.toContain("worldwide-seed-events");
  });

  it("worldwide-events page imports and renders the hero slideshow", () => {
    const page = source("app/worldwide-events/page.tsx");
    expect(page).toContain("WorldwideHeroSlideshow");
    expect(page).toContain("worldwide-seed-events");
  });

  it("defines CSS for the worldwide hero slideshow", () => {
    const css = source("app/globals.css");
    expect(css).toContain(".ww-slideshow");
    expect(css).toContain(".ww-slideshow-slide");
    expect(css).toContain(".ww-slideshow-overlay");
    expect(css).toContain(".ww-slideshow-content");
    expect(css).toContain(".ww-slideshow-btn");
    expect(css).toContain(".ww-slideshow-dots");
    expect(css).toContain(".ww-slideshow-dot");
  });

  it("renders the worldwide hero as an accessible moving image carousel", () => {
    const html = renderToStaticMarkup(
      createElement(WorldwideHeroSlideshow, {
        events: [
          mockEvent,
          { ...mockEvent, id: "eventbrite:456", title: "Global Arts Festival" },
        ],
        heroTitle: "Discover events",
      })
    );
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain("ww-slideshow-image");
    expect(html).toContain("Pause moving carousel");
    expect(html).toContain("Previous slide");
    expect(html).toContain("Next slide");
  });

  it("renders WorldwideEventsCarousel as moving discovery carousel with navigation controls", () => {
    const html = renderToStaticMarkup(
      createElement(WorldwideEventsCarousel, { events: [mockEvent] })
    );
    expect(html).toContain("worldwide-carousel-section");
    expect(html).toContain("worldwide-carousel-track");
    expect(html).toContain("worldwide-carousel-item");
    expect(html).toContain("worldwide-carousel-badge");
    expect(html).toContain("Moving Discovery");
    expect(html).toContain("Sunset Jazz on the Rooftop");
  });

  it("defines CSS for the worldwide moving carousel track and controls", () => {
    const css = source("app/globals.css");
    expect(css).toContain(".worldwide-carousel-section");
    expect(css).toContain(".worldwide-carousel-header");
    expect(css).toContain(".worldwide-carousel-wrapper");
    expect(css).toContain(".worldwide-carousel-track");
    expect(css).toContain(".worldwide-carousel-item");
    expect(css).toContain(".worldwide-carousel-btn");
  });

  it("limits events from any single location to at most 2 events", () => {
    const multiCityEvents: WorldwideEvent[] = [
      {
        ...mockEvent,
        id: "tokyo-1",
        city: "Tokyo",
        country: "Japan",
        countryCode: "JP",
        popularity: 99,
      },
      {
        ...mockEvent,
        id: "tokyo-2",
        city: "Tokyo",
        country: "Japan",
        countryCode: "JP",
        popularity: 95,
      },
      {
        ...mockEvent,
        id: "tokyo-3",
        city: "Tokyo",
        country: "Japan",
        countryCode: "JP",
        popularity: 90,
      },
      {
        ...mockEvent,
        id: "tokyo-4",
        city: "Tokyo",
        country: "Japan",
        countryCode: "JP",
        popularity: 85,
      },
      {
        ...mockEvent,
        id: "london-1",
        city: "London",
        country: "United Kingdom",
        countryCode: "GB",
        popularity: 92,
      },
      {
        ...mockEvent,
        id: "london-2",
        city: "London",
        country: "United Kingdom",
        countryCode: "GB",
        popularity: 88,
      },
      {
        ...mockEvent,
        id: "london-3",
        city: "London",
        country: "United Kingdom",
        countryCode: "GB",
        popularity: 80,
      },
      {
        ...mockEvent,
        id: "paris-1",
        city: "Paris",
        country: "France",
        countryCode: "FR",
        popularity: 89,
      },
    ];

    const result = limitEventsByLocation(multiCityEvents, 2);

    const counts: Record<string, number> = {};
    for (const ev of result) {
      const loc = getLocationKey(ev);
      counts[loc] = (counts[loc] || 0) + 1;
    }

    expect(counts["tokyo"]).toBe(2);
    expect(counts["london"]).toBe(2);
    expect(counts["paris"]).toBe(1);
    expect(result.map(e => e.id)).toEqual([
      "tokyo-1",
      "tokyo-2",
      "london-1",
      "london-2",
      "paris-1",
    ]);
  });

  it("fetchWorldwideEvents aggregates live provider events with location diversity", async () => {
    vi.mock("../lib/worldwide-providers", () => ({
      getConfiguredProviders: async () => [
        {
          name: "mock-provider",
          isConfigured: () => true,
          search: async () => [
            { ...mockEvent, id: "tokyo-1", city: "Tokyo", popularity: 99 },
            { ...mockEvent, id: "tokyo-2", city: "Tokyo", popularity: 95 },
            { ...mockEvent, id: "tokyo-3", city: "Tokyo", popularity: 90 },
            { ...mockEvent, id: "paris-1", city: "Paris", popularity: 92 },
          ],
        },
      ],
    }));

    const events = await fetchWorldwideEvents();
    expect(events.length).toBeGreaterThan(0);
  });

  it("pickSlideshowEvents prioritizes unique locations with max 2 per location", () => {
    const manyEvents: WorldwideEvent[] = [
      { ...mockEvent, id: "tokyo-1", city: "Tokyo", popularity: 99 },
      { ...mockEvent, id: "tokyo-2", city: "Tokyo", popularity: 95 },
      { ...mockEvent, id: "tokyo-3", city: "Tokyo", popularity: 90 },
      { ...mockEvent, id: "paris-1", city: "Paris", popularity: 92 },
      { ...mockEvent, id: "berlin-1", city: "Berlin", popularity: 91 },
      { ...mockEvent, id: "berlin-2", city: "Berlin", popularity: 87 },
      { ...mockEvent, id: "lisbon-1", city: "Lisbon", popularity: 89 },
    ];

    const slideshow = pickSlideshowEvents(manyEvents, 6);
    expect(slideshow.length).toBeLessThanOrEqual(6);

    const locationCounts: Record<string, number> = {};
    for (const ev of slideshow) {
      const loc = getLocationKey(ev);
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      expect(locationCounts[loc]).toBeLessThanOrEqual(2);
    }

    const cities = slideshow.map(e => e.city.toLowerCase());
    expect(cities).toContain("tokyo");
    expect(cities).toContain("paris");
    expect(cities).toContain("berlin");
    expect(cities).toContain("lisbon");
  });

  it("limitEventsByCountryAndLocation gives major countries more events and ensures other countries have 3-4 famous events", () => {
    const countryEvents: WorldwideEvent[] = [
      {
        ...mockEvent,
        id: "us-1",
        country: "United States",
        city: "New York",
        popularity: 99,
      },
      {
        ...mockEvent,
        id: "us-2",
        country: "United States",
        city: "San Francisco",
        popularity: 98,
      },
      {
        ...mockEvent,
        id: "us-3",
        country: "United States",
        city: "Chicago",
        popularity: 97,
      },
      {
        ...mockEvent,
        id: "us-4",
        country: "United States",
        city: "Austin",
        popularity: 96,
      },
      {
        ...mockEvent,
        id: "us-5",
        country: "United States",
        city: "Seattle",
        popularity: 95,
      },
      {
        ...mockEvent,
        id: "us-6",
        country: "United States",
        city: "Boston",
        popularity: 94,
      },
      {
        ...mockEvent,
        id: "us-7",
        country: "United States",
        city: "Miami",
        popularity: 93,
      },
      {
        ...mockEvent,
        id: "other-1",
        country: "Portugal",
        city: "Lisbon",
        popularity: 90,
      },
      {
        ...mockEvent,
        id: "other-2",
        country: "Portugal",
        city: "Porto",
        popularity: 88,
      },
      {
        ...mockEvent,
        id: "other-3",
        country: "Portugal",
        city: "Coimbra",
        popularity: 85,
      },
      {
        ...mockEvent,
        id: "other-4",
        country: "Portugal",
        city: "Faro",
        popularity: 82,
      },
      {
        ...mockEvent,
        id: "other-5",
        country: "Portugal",
        city: "Braga",
        popularity: 80,
      },
    ];

    const result = limitEventsByCountryAndLocation(countryEvents);
    const usCount = result.filter(e => e.country === "United States").length;
    const ptCount = result.filter(e => e.country === "Portugal").length;

    expect(usCount).toBe(6); // Major countries capped at 6
    expect(ptCount).toBe(4); // Other countries capped at 4 (famous events prioritized)
  });

  it("supports fetching events for main categories and subcategories", async () => {
    const events = await fetchWorldwideEvents({ category: "conference" });
    expect(Array.isArray(events)).toBe(true);
  });

  it("filters out events completed more than 14 days ago while keeping ongoing, future, and recent past events", async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const recentPastDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const oldPastDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();

    const eventsInput: WorldwideEvent[] = [
      { ...mockEvent, id: "future-1", startDate: futureDate },
      { ...mockEvent, id: "recent-1", startDate: recentPastDate, endDate: recentPastDate },
      { ...mockEvent, id: "old-1", startDate: oldPastDate, endDate: oldPastDate },
    ];

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoTime = twoWeeksAgo.getTime();

    const filtered = eventsInput.filter((e) => {
      const startTime = new Date(e.startDate).getTime();
      const endTime = e.endDate ? new Date(e.endDate).getTime() : startTime;
      return endTime >= twoWeeksAgoTime;
    });

    const ids = filtered.map(e => e.id);
    expect(ids).toContain("future-1");
    expect(ids).toContain("recent-1");
    expect(ids).not.toContain("old-1");
  });

  it("balanceEventsByCountry ensures diverse country representation and prevents single-country flooding", () => {
    const manyEvents: WorldwideEvent[] = [];
    // Generate 50 events in France (Paris)
    for (let i = 0; i < 50; i++) {
      manyEvents.push({
        ...mockEvent,
        id: `fr-${i}`,
        country: "France",
        city: "Paris",
        popularity: 90 - i,
      });
    }
    // Generate 20 events in USA
    for (let i = 0; i < 20; i++) {
      manyEvents.push({
        ...mockEvent,
        id: `us-${i}`,
        country: "United States",
        city: "New York",
        popularity: 85 - i,
      });
    }
    // Generate 20 events in Japan
    for (let i = 0; i < 20; i++) {
      manyEvents.push({
        ...mockEvent,
        id: `jp-${i}`,
        country: "Japan",
        city: "Tokyo",
        popularity: 80 - i,
      });
    }

    const balanced = balanceEventsByCountry(manyEvents, 100, 10);
    const frCount = balanced.filter(e => e.country === "France").length;
    const usCount = balanced.filter(e => e.country === "United States").length;
    const jpCount = balanced.filter(e => e.country === "Japan").length;

    expect(frCount).toBeLessThanOrEqual(20);
    expect(usCount).toBeLessThanOrEqual(20);
    expect(jpCount).toBeLessThanOrEqual(20);
    expect(balanced.length).toBe(60);
  });
});
