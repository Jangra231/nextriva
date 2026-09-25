/**
 * Worldwide Events - Multi-provider event discovery
 * Server-side adapters for external event providers with a unified WorldwideEvent contract.
 * All providers are optional; the system gracefully degrades when credentials are missing.
 * Fetches exclusively from live public open data APIs without hardcoded seed events.
 */

import type { WorldwideEvent, EventProvider, ProviderSearchParams } from "./worldwide-types";
import { limitEventsByLocation, limitEventsByCountryAndLocation, getLocationKey, pickSlideshowEvents } from "./worldwide-diversity";
import { getConfiguredProviders } from "./worldwide-providers";

export * from "./worldwide-types";
export * from "./worldwide-diversity";

// Popularity normalization - maps provider-specific signals to 0-100
function normalizePopularity(provider: string, raw: unknown): number {
  if (typeof raw === "number") {
    return Math.min(100, raw > 100 ? raw / 10 : raw);
  }
  if (typeof raw === "string") {
    const n = Number(raw);
    if (!Number.isNaN(n)) return normalizePopularity(provider, n);
  }
  return 50;
}

// Deduplication key: title + city + start date (day precision)
function dedupeKey(event: WorldwideEvent): string {
  const day = event.startDate.split("T")[0];
  return `${event.title.toLowerCase().trim()}|${event.city.toLowerCase().trim()}|${day}`;
}

/**
 * Aggregates live events from all configured providers, deduplicates, and ranks by popularity.
 * Applies location diversity (max 2 events per location) for multi-location/worldwide browsing.
 * Providers without credentials or network failures are gracefully handled.
 */
export async function fetchWorldwideEvents(params: ProviderSearchParams = {}): Promise<WorldwideEvent[]> {
  let events: WorldwideEvent[] = [];

  try {
    const providers = await getConfiguredProviders();

    const fetchPromise = Promise.allSettled(
      providers.map((p) =>
        p.search(params).catch((err) => {
          console.warn(`[worldwide-events] Provider ${p.name} failed:`, err instanceof Error ? err.message : err);
          return [] as WorldwideEvent[];
        })
      )
    );

    // Timeout after 6 seconds so UI never hangs in loading state
    const timeoutPromise = new Promise<PromiseSettledResult<WorldwideEvent[]>[]>((resolve) =>
      setTimeout(() => resolve([]), 6000)
    );

    const allResults = await Promise.race([fetchPromise, timeoutPromise]);

    if (Array.isArray(allResults)) {
      events = allResults
        .filter((r): r is PromiseFulfilledResult<WorldwideEvent[]> => r.status === "fulfilled")
        .flatMap((r) => r.value);
    }
  } catch (err) {
    console.error("[worldwide-events] Failed to fetch from providers:", err instanceof Error ? err.message : err);
  }

  // Deduplicate by title+city+date
  const seen = new Set<string>();
  const unique = events.filter((e) => {
    const key = dedupeKey(e);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Filter in-memory to ensure provider events honor query parameters
  let filtered = unique;

  if (params.query) {
    const q = params.query.toLowerCase().trim();
    filtered = filtered.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.city && e.city.toLowerCase().includes(q)) ||
        (e.country && e.country.toLowerCase().includes(q)) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (params.city) {
    const c = params.city.toLowerCase().trim();
    filtered = filtered.filter((e) => e.city.toLowerCase().includes(c));
  }

  if (params.country) {
    const co = params.country.toLowerCase().trim();
    filtered = filtered.filter(
      (e) => e.country.toLowerCase().includes(co) || e.countryCode.toLowerCase() === co
    );
  }

  if (params.category && params.category !== "all") {
    const rawCats = params.category.toLowerCase().split(",").map((c) => c.trim()).filter(Boolean);
    const categoryAliases: Record<string, string[]> = {
      business: ["business", "conference", "networking", "workshop", "expo", "seminar"],
      energy: ["energy", "green energy", "solar", "wind", "sustainability", "ev", "green-tech"],
      automobile: ["automobile", "car-show", "race", "exhibition", "meetup", "tech-auto", "car", "auto"],
      sports: ["sports", "running", "football", "cricket", "fitness", "yoga", "sport"],
      education: ["education", "workshop-edu", "webinar", "course", "conference-edu", "tutoring", "academic"],
      health: ["health", "wellness", "medical", "mental-health", "fitness-health", "nutrition", "healthcare"],
      music: ["music", "concert", "festival", "dj-night", "classical", "indie", "band", "audio"],
      community: ["community", "charity", "meetup", "cultural", "volunteer", "social", "gathering"],
    };

    const allAllowedTerms: string[] = [];
    for (const rawCat of rawCats) {
      let allowedTerms = [rawCat];
      for (const [mainCat, subList] of Object.entries(categoryAliases)) {
        if (mainCat === rawCat || subList.includes(rawCat)) {
          allowedTerms = Array.from(new Set([mainCat, ...subList]));
          break;
        }
      }
      allAllowedTerms.push(...allowedTerms);
    }

    filtered = filtered.filter((e) => {
      const eCat = (e.category || "").toLowerCase();
      const eTitle = (e.title || "").toLowerCase();
      const eDesc = (e.description || "").toLowerCase();
      const eTags = (e.tags || []).map((t) => t.toLowerCase());

      return allAllowedTerms.some(
        (term) =>
          eCat.includes(term) ||
          eTags.some((t) => t.includes(term)) ||
          eTitle.includes(term) ||
          eDesc.includes(term)
      );
    });
  }

  if (params.startDateFrom) {
    const from = new Date(params.startDateFrom).getTime();
    filtered = filtered.filter((e) => new Date(e.startDate).getTime() >= from);
  }

  if (params.startDateTo) {
    const to = new Date(params.startDateTo).getTime();
    filtered = filtered.filter((e) => new Date(e.startDate).getTime() <= to);
  }

  // Sort by date or popularity/relevance
  const sorted = filtered.sort((a, b) => {
    if (params.sortBy === "date") {
      return a.startDate.localeCompare(b.startDate);
    }
    if (b.popularity !== a.popularity) return b.popularity - a.popularity;
    return a.startDate.localeCompare(b.startDate);
  });

  // Apply location/country diversity cap: when not searching for a specific city,
  // ensure major countries get more representation (up to 6 events) and every other country has at least 3-4 famous events (up to 4 events).
  if (!params.city) {
    return limitEventsByCountryAndLocation(sorted);
  }

  return sorted;
}


