import type { WorldwideEvent } from "./worldwide-types";

/**
 * Normalizes location key (city or country) for geographic diversity grouping.
 */
export function getLocationKey(event: WorldwideEvent): string {
  const city = event.city ? event.city.toLowerCase().trim() : "";
  const country = event.countryCode
    ? event.countryCode.toLowerCase().trim()
    : event.country
    ? event.country.toLowerCase().trim()
    : "";
  return city || country || "unknown";
}

const MAJOR_COUNTRIES = new Set([
  "united states",
  "usa",
  "us",
  "united kingdom",
  "uk",
  "france",
  "germany",
  "japan",
  "india",
  "canada",
  "australia",
  "italy",
  "spain",
]);

/**
 * Limits events so major countries get more representation (up to 6 events),
 * and every other country has at least 3-4 famous events (up to 4 events).
 * City/Location diversity is also maintained (up to 3 events per city).
 */
export function limitEventsByCountryAndLocation(events: WorldwideEvent[]): WorldwideEvent[] {
  const countByCountry = new Map<string, number>();
  const countByLocation = new Map<string, number>();
  const result: WorldwideEvent[] = [];

  const sorted = [...events].sort((a, b) => {
    if (b.popularity !== a.popularity) return b.popularity - a.popularity;
    return a.startDate.localeCompare(b.startDate);
  });

  for (const ev of sorted) {
    const country = (ev.country || ev.countryCode || "unknown").toLowerCase().trim();
    const locKey = getLocationKey(ev);

    const countryLimit = MAJOR_COUNTRIES.has(country) ? 6 : 4;
    const countryCount = countByCountry.get(country) ?? 0;
    const locCount = countByLocation.get(locKey) ?? 0;

    if (countryCount < countryLimit && locCount < 3) {
      countByCountry.set(country, countryCount + 1);
      countByLocation.set(locKey, locCount + 1);
      result.push(ev);
    }
  }

  return result;
}
/**
 * Balances events across countries so no single country dominates the results
 * when browsing worldwide events, selecting events from diverse countries.
 */
export function balanceEventsByCountry(
  events: WorldwideEvent[],
  targetTotal = 100,
  maxPerCountry = 10
): WorldwideEvent[] {
  const countByCountry = new Map<string, number>();
  const countByLocation = new Map<string, number>();
  const result: WorldwideEvent[] = [];

  const sorted = [...events].sort((a, b) => {
    if (b.popularity !== a.popularity) return b.popularity - a.popularity;
    return a.startDate.localeCompare(b.startDate);
  });

  // Pass 1: Select events up to maxPerCountry per country and 3 per city
  for (const ev of sorted) {
    if (result.length >= targetTotal) break;
    const country = (ev.country || ev.countryCode || "unknown").toLowerCase().trim();
    const locKey = getLocationKey(ev);

    const countryCount = countByCountry.get(country) ?? 0;
    const locCount = countByLocation.get(locKey) ?? 0;

    if (countryCount < maxPerCountry && locCount < 3) {
      countByCountry.set(country, countryCount + 1);
      countByLocation.set(locKey, locCount + 1);
      result.push(ev);
    }
  }

  // Pass 2: If we still need more events to fill targetTotal, allow up to maxPerCountry * 2 per country
  if (result.length < targetTotal) {
    const selectedIds = new Set(result.map((e) => e.id));
    for (const ev of sorted) {
      if (result.length >= targetTotal) break;
      if (!selectedIds.has(ev.id)) {
        const country = (ev.country || ev.countryCode || "unknown").toLowerCase().trim();
        const countryCount = countByCountry.get(country) ?? 0;
        if (countryCount < maxPerCountry * 2) {
          countByCountry.set(country, countryCount + 1);
          selectedIds.add(ev.id);
          result.push(ev);
        }
      }
    }
  }

  return result;
}


/**
 * Limits events so that no single location has more than maxPerLocation (default: 2) events.
 * Preserves the given event order (e.g. popularity or date ranking).
 */
export function limitEventsByLocation(
  events: WorldwideEvent[],
  maxPerLocation = 2
): WorldwideEvent[] {
  const countByLocation = new Map<string, number>();
  const result: WorldwideEvent[] = [];

  for (const ev of events) {
    const locKey = getLocationKey(ev);
    const count = countByLocation.get(locKey) ?? 0;
    if (count < maxPerLocation) {
      countByLocation.set(locKey, count + 1);
      result.push(ev);
    }
  }

  return result;
}

/**
 * Picks top N events with geographic diversity — 1 event per location first,
 * then at most 2 events per location if slots remain to reach maxSlides.
 */
export function pickSlideshowEvents(events: WorldwideEvent[], maxSlides = 6): WorldwideEvent[] {
  const sorted = [...events].sort((a, b) => {
    if (b.popularity !== a.popularity) return b.popularity - a.popularity;
    return a.startDate.localeCompare(b.startDate);
  });

  const selected: WorldwideEvent[] = [];
  const locationCounts = new Map<string, number>();

  // Pass 1: Select up to 1 event per unique location
  for (const ev of sorted) {
    const loc = getLocationKey(ev);
    const count = locationCounts.get(loc) ?? 0;
    if (count === 0) {
      locationCounts.set(loc, 1);
      selected.push(ev);
      if (selected.length >= maxSlides) return selected;
    }
  }

  // Pass 2: If we still need more slides, allow at most a 2nd event per location
  if (selected.length < maxSlides) {
    const ids = new Set(selected.map((e) => e.id));
    for (const ev of sorted) {
      if (!ids.has(ev.id)) {
        const loc = getLocationKey(ev);
        const count = locationCounts.get(loc) ?? 0;
        if (count < 2) {
          locationCounts.set(loc, count + 1);
          selected.push(ev);
          if (selected.length >= maxSlides) break;
        }
      }
    }
  }

  return selected;
}
