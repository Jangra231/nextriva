import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import EventsEmptyState from "../components/EventsEmptyState";
import EventsHostBanner from "../components/EventsHostBanner";

function source(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf-8");
}

describe("Events Page Enhanced Discovery & Layout", () => {
  it("renders EventsEmptyState with filter context and action buttons", () => {
    const html = renderToStaticMarkup(
      createElement(EventsEmptyState, {
        search: "Marathon",
        city: "Mumbai",
        category: "running",
        filter: "This Weekend",
        accessible: "1",
      })
    );

    expect(html).toContain("No live events match these filters");
    expect(html).toContain("Marathon");
    expect(html).toContain("Mumbai");
    expect(html).toContain("running");
    expect(html).toContain("This Weekend");
    expect(html).toContain("Reset all filters");
    expect(html).toContain("Host an event");
    expect(html).toContain("Explore top cities");
    expect(html).toContain("Bengaluru");
    expect(html).toContain("Pune");
  });

  it("renders EventsEmptyState generic state when no filters are applied", () => {
    const html = renderToStaticMarkup(createElement(EventsEmptyState, {}));
    expect(html).toContain("No live events found at the moment");
    expect(html).toContain("Host an event");
    expect(html).not.toContain("Reset all filters");
  });

  it("renders EventsHostBanner with organizer CTAs and trust features", () => {
    const html = renderToStaticMarkup(createElement(EventsHostBanner));
    expect(html).toContain("Host your next event with Nexriva");
    expect(html).toContain("For Creators &amp; Organizers");
    expect(html).toContain("MCD &amp; Local Authority Ready");
    expect(html).toContain("Verified Venue Approvals");
    expect(html).toContain("Create Your Event");
    expect(html).toContain("/dashboard/manage-events/create-event/new");
  });

  it("defines all new CSS rules for toolbar, pills, empty state, and host banner in globals.css", () => {
    const css = source("app/globals.css");
    expect(css).toContain(".events-page-shell");
    expect(css).toContain(".events-discovery-toolbar");
    expect(css).toContain(".category-dropdown-wrapper");
    expect(css).toContain(".category-dropdown-select");
    expect(css).toContain(".events-control-strip");
    expect(css).toContain(".events-count-badge");
    expect(css).toContain(".date-preset-pill");
    expect(css).toContain(".accessible-toggle-btn");
    expect(css).toContain(".events-active-filters-bar");
    expect(css).toContain(".events-empty-state-card");
    expect(css).toContain(".events-host-banner");
    expect(css).toContain(".event-date-chip");
    expect(css).toContain(".event-date-day");
    expect(css).toContain(".event-date-month");
  });

  it("verifies EventsFilterToolbar component implementation contracts", () => {
    const toolbarCode = source("app/components/EventsFilterToolbar.tsx");
    expect(toolbarCode).toContain("useRouter");
    expect(toolbarCode).toContain("useSearchParams");
    expect(toolbarCode).toContain("QUICK_DATE_FILTERS");
    expect(toolbarCode).toContain("SORT_OPTIONS");
    expect(toolbarCode).toContain("CATEGORY_EMOJIS");
    expect(toolbarCode).toContain("clear-all-filters-btn");
    expect(toolbarCode).toContain("accessible-toggle-btn");
  });

  it("verifies animated search bar and filter controls across the application", () => {
    const heroCode = source("app/components/Interactive3DHero.tsx");
    expect(heroCode).toContain("hero-search-btn");
    expect(heroCode).toContain("hero-search-submit-icon");
    expect(heroCode).toContain("hero-tag-btn");

    const toolbarCode = source("app/components/EventsFilterToolbar.tsx");
    expect(toolbarCode).toContain("category-dropdown-wrapper");
    expect(toolbarCode).toContain("category-pill-trigger");
    expect(toolbarCode).toContain("rotate-reset-icon");

    const css = source("app/globals.css");
    expect(css).toContain(".interactive-hero-search-card");
    expect(css).toContain(".hero-search-btn");
    expect(css).toContain(".category-dropdown-wrapper");
    expect(css).toContain(".category-dropdown-select");
    expect(css).toContain("@keyframes live-radar");
    expect(css).toContain("@keyframes chip-pop-in");
  });

  it("verifies EventsPage structure in app/events/page.tsx", () => {
    const pageCode = source("app/events/page.tsx");
    expect(pageCode).toContain("EventsFilterToolbar");
    expect(pageCode).toContain("Interactive3DHero");
    expect(pageCode).toContain("EventsEmptyState");
    expect(pageCode).toContain("EventsHostBanner");
    expect(pageCode).toContain("metadata");
  });
});
