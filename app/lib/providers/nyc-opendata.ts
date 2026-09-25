/**
 * NYC Open Data Adapter - NYC Parks & Events, Street Events, etc.
 * Docs: https://data.cityofnewyork.us/
 * Endpoints:
 *   - https://data.cityofnewyork.us/resource/fudw-fgrp.json (Parks Events)
 *   - https://data.cityofnewyork.us/resource/tvpp-9vvx.json (Street Events)
 * Auth: None (public open data)
 */
import type { EventProvider, ProviderSearchParams, WorldwideEvent } from '../worldwide-events';

const BASE_URLS = [
  'https://data.cityofnewyork.us/resource/fudw-fgrp.json', // Parks Events
  'https://data.cityofnewyork.us/resource/tvpp-9vvx.json', // Street Events
];

export class NycOpenDataAdapter implements EventProvider {
  readonly name = 'nyc-opendata';
  readonly requiresAuth = false;

  isConfigured(): boolean {
    return true;
  }

  async search(params: ProviderSearchParams): Promise<WorldwideEvent[]> {
    const allEvents: WorldwideEvent[] = [];

    for (const baseUrl of BASE_URLS) {
      try {
        const events = await this.fetchFromSource(baseUrl, params);
        allEvents.push(...events);
      } catch (err) {
        console.warn(`[nyc-opendata] Failed to fetch from ${baseUrl}:`, err);
      }
    }

    const queryTerm = params.query ? params.query.toLowerCase().trim() : '';
    const cityTerm = params.city ? params.city.toLowerCase().trim() : '';

    return allEvents.filter((e) => {
      if (queryTerm && !e.title.toLowerCase().includes(queryTerm) && !(e.description && e.description.toLowerCase().includes(queryTerm))) {
        return false;
      }
      if (cityTerm && !e.city.toLowerCase().includes(cityTerm) && !e.venueAddress?.toLowerCase().includes(cityTerm)) {
        return false;
      }
      return true;
    });
  }

  private async fetchFromSource(baseUrl: string, params: ProviderSearchParams): Promise<WorldwideEvent[]> {
    const searchParams = new URLSearchParams({
      '$limit': String(params.pageSize ?? 30),
      '$offset': String(((params.page ?? 1) - 1) * (params.pageSize ?? 30)),
    });

    try {
      const response = await fetch(`${baseUrl}?${searchParams.toString()}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 1800 },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return (Array.isArray(data) ? data : []).map((e: Record<string, unknown>, idx: number) => this.mapEvent(e, baseUrl, idx));
    } catch {
      return [];
    }
  }

  private mapEvent(raw: Record<string, unknown>, baseUrl: string, idx: number): WorldwideEvent {
    const eventId = String(raw.event_id ?? raw.id ?? `nyc-${idx}`);
    const title = String(raw.event_name ?? raw.title ?? raw.event_type ?? 'New York Community Event');
    const description = String(raw.event_description ?? raw.description ?? `Community event hosted by ${raw.event_agency ?? 'NYC Parks'}.`);
    const startDate = String(raw.start_date_time ?? raw.date ?? new Date().toISOString());
    const endDate = raw.end_date_time ? String(raw.end_date_time) : undefined;
    const borough = String(raw.event_borough ?? raw.borough ?? 'Manhattan');
    const location = String(raw.event_location ?? raw.location ?? 'New York');

    return {
      id: `nyc-opendata:${eventId}`,
      provider: 'nyc-opendata',
      title,
      description,
      url: `https://data.cityofnewyork.us/dataset/${eventId}`,
      imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=450&fit=crop&q=80',
      startDate,
      endDate,
      timezone: 'America/New_York',
      venueName: location,
      venueAddress: `${borough}, New York, NY`,
      city: 'New York',
      country: 'United States',
      countryCode: 'US',
      category: String(raw.event_type ?? 'Community'),
      tags: [borough.toLowerCase(), 'nyc', 'community'],
      currency: 'USD',
      isFree: true,
      popularity: 82,
      sourceData: raw,
    };
  }
}
