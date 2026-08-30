import { describe, expect, it } from "vitest";
import { isWithinVenueRadius, venueDistanceKm } from "./venue-radius";

describe("venue radius filtering", () => {
  const noida = { latitude: 28.629, longitude: 77.364 }; const nearbyVenue = { latitudeE6: 28635000, longitudeE6: 77365000 }; const farVenue = { latitudeE6: 28730000, longitudeE6: 77460000 };
  it("calculates a stable distance from organizer coordinates to venue microdegrees", () => expect(venueDistanceKm(noida, nearbyVenue)).toBeGreaterThan(0));
  it("includes nearby venues and excludes venues outside the selected radius", () => { expect(isWithinVenueRadius(noida, 5, nearbyVenue)).toBe(true); expect(isWithinVenueRadius(noida, 5, farVenue)).toBe(false); });
  it("does not hide venues until a usable origin and radius are supplied", () => expect(isWithinVenueRadius(null, 25, farVenue)).toBe(true));
});
