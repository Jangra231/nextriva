import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EventCard from "./EventCard";

describe("EventCard venue information", () => {
  it("shows venue capacity and an accessible-venue indicator on public cards", () => {
    const html = renderToStaticMarkup(createElement(EventCard, { event: { id: 1, slug: "test-run", displayName: "Test Run", startsAt: new Date("2026-12-01"), city: "Noida", coverUrl: null, status: "live", venueCapacity: 1200, venueIsAccessible: true, venueAccessibilityNotes: "Step-free entry and accessible washroom" } }));
    expect(html).toContain("Venue cap. 1,200");
    expect(html).toContain("Accessible");
    expect(html).toContain("Step-free entry and accessible washroom");
  });

  it("does not add venue badges to organizer management cards", () => {
    const html = renderToStaticMarkup(createElement(EventCard, { adminHref: "/dashboard/manage-events/create-event/1", event: { id: 1, slug: "test-run", displayName: "Test Run", startsAt: new Date("2026-12-01"), city: "Noida", coverUrl: null, status: "live", venueCapacity: 1200, venueIsAccessible: true } }));
    expect(html).not.toContain("Venue cap. 1,200");
    expect(html).not.toContain("aria-label=\"Venue information\"");
  });
});
