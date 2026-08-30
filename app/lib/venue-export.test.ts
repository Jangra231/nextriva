import { describe, expect, it } from "vitest";
import { createVenueDirectoryCsv } from "./venue-export";

describe("venue directory CSV export", () => {
  it("exports capacity, accessibility, coordinate, and lifecycle values safely", () => {
    const csv = createVenueDirectoryCsv([{ id: 4, zone: "Central", ward: "Ward 9", location: "Sector 62", venueName: "Community, Centre", city: "Noida", address: "Main road", sector: null, area: null, latitudeE6: 28629000, longitudeE6: 77364000, setting: "outdoor", capacity: 1200, isAccessible: true, accessibilityNotes: "Step-free", active: true, createdAt: "2026-08-22T00:00:00.000Z", updatedAt: "2026-08-22T00:00:00.000Z" }]);
    expect(csv).toContain('"Venue ID"');
    expect(csv).toContain('"Community, Centre"');
    expect(csv).toContain('"1200"');
    expect(csv).toContain('"Yes"');
    expect(csv).toContain('"28.629000"');
  });
});
