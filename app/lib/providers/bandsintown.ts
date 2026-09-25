/**
 * Bandsintown API Adapter
 * Docs: https://artists.bandsintown.com/support/api-docs
 * Endpoint: https://rest.bandsintown.com/v4/events/search
 * Auth: App name as query parameter (no secret required for public search)
 */
import type { EventProvider, ProviderSearchParams, WorldwideEvent } from '../worldwide-events';

const BASE_URL = 'https://rest.bandsintown.com/v4/events/search';

export class BandsintownAdapter implements EventProvider {
  readonly name = 'bandsintown';
  readonly requiresAuth = false; // App name only

  isConfigured(): boolean {
    return Boolean(process.env.BANDSINTOWN_APP_NAME);
  }

  async search(params: ProviderSearchParams): Promise<WorldwideEvent[]> {
    const appName = process.env.BANDSINTOWN_APP_NAME;
    if (!appName) return [];

    const searchParams = new URLSearchParams({
      app_name: appName,
      api_version: process.env.BANDSINTOWN_API_VERSION ?? '2.0',
      per_page: String(params.pageSize ?? 50),
      page: String(params.page ?? 1),
      sort: params.sortBy === 'date' ? 'datetime' : 'popularity',
    });

    if (params.query) searchParams.set('query', params.query);
    if (params.city) searchParams.set('location', params.city);
    if (params.countryCode) searchParams.set('country', params.countryCode.toUpperCase());
    if (params.startDateFrom) searchParams.set('date', `${params.startDateFrom.split('T')[0]},${params.startDateTo?.split('T')[0] || 'future'}`);

    try {
      const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        return [];
      }

      const events = await response.json();
      return (Array.isArray(events) ? events : []).map(e => this.mapEvent(e));
    } catch {
      return [];
    }
  }

  private mapEvent(raw: Record<string, unknown>): WorldwideEvent {
    const venue = raw.venue as Record<string, unknown> | null;
    const artists = (raw.artists as Array<Record<string, unknown>>) ?? [];
    const offers = (raw.offers as Array<Record<string, unknown>>) ?? [];

    const firstPrice = offers[0]?.price as Record<string, unknown> | undefined;
    const lastPrice = offers[offers.length - 1]?.price as Record<string, unknown> | undefined;
    const minPrice = firstPrice?.amount;
    const maxPrice = lastPrice?.amount;
    const currency = (firstPrice?.currency as string) || 'USD';

    // Bandsintown provides a "popularity" field for artists
    const artistPopularity = artists.reduce((max, a) => {
      const p = typeof a.popularity === 'number' ? a.popularity : 0;
      return Math.max(max, p);
    }, 0);

    return {
      id: `bandsintown:${raw.id}`,
      provider: 'bandsintown',
      title: String(raw.title ?? 'Untitled Event'),
      description: raw.description as string | undefined,
      url: String(raw.url ?? ''),
      imageUrl: artists[0]?.thumb_url as string | undefined,
      startDate: String(raw.datetime ?? new Date().toISOString()),
      endDate: undefined,
      timezone: 'UTC',
      venueName: venue?.name as string | undefined,
      venueAddress: venue?.address as string | undefined,
      city: venue?.city as string | undefined ?? '',
      country: venue?.country as string | undefined ?? '',
      countryCode: venue?.country as string | undefined ?? '',
      latitude: venue?.latitude ? Number(venue.latitude) : undefined,
      longitude: venue?.longitude ? Number(venue.longitude) : undefined,
      category: 'Music',
      subCategory: artists[0]?.genre as string | undefined,
      tags: artists.flatMap(a => (a.genres as string[]) ?? []).filter(Boolean),
      priceMin: minPrice !== undefined ? Number(minPrice) * 100 : undefined,
      priceMax: maxPrice !== undefined ? Number(maxPrice) * 100 : undefined,
      currency,
      isFree: minPrice === 0 || minPrice === '0' || offers.length === 0,
      popularity: Math.min(100, artistPopularity), // already 0-100
      sourceData: raw,
    };
  }
}