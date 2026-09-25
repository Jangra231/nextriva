/**
 * Eventful API Adapter
 * Docs: https://developer.eventful.com/api/1.0/
 * Endpoint: https://api.eventful.com/json/events/search
 * Auth: API key as query parameter
 */
import type { EventProvider, ProviderSearchParams, WorldwideEvent } from '../worldwide-events';

const BASE_URL = 'https://api.eventful.com/json/events/search';

export class EventfulAdapter implements EventProvider {
  readonly name = 'eventful';
  readonly requiresAuth = true;

  isConfigured(): boolean {
    return Boolean(process.env.EVENTFUL_API_KEY);
  }

  async search(params: ProviderSearchParams): Promise<WorldwideEvent[]> {
    const apiKey = process.env.EVENTFUL_API_KEY;
    if (!apiKey) return [];

    const searchParams = new URLSearchParams({
      app_key: apiKey,
      page_size: String(params.pageSize ?? 50),
      page_number: String(params.page ?? 1),
      sort_order: params.sortBy === 'date' ? 'date' : 'popularity',
      include: 'categories,images,price',
    });

    if (params.query) searchParams.set('keywords', params.query);
    if (params.city) searchParams.set('location', params.city);
    if (params.country) searchParams.set('location', `${params.city}, ${params.country}`);
    if (params.category) searchParams.set('category', params.category);
    if (params.startDateFrom) searchParams.set('date', `${params.startDateFrom.split('T')[0]}-${params.startDateTo?.split('T')[0] || 'future'}`);

    try {
      const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 }, // 1 hour cache
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const events = data.events?.event ?? [];

      return events.map((e: Record<string, unknown>) => this.mapEvent(e));
    } catch {
      return [];
    }
  }

  private mapEvent(raw: Record<string, unknown>): WorldwideEvent {
    const startTime = (raw.start_time as string) || (raw.start_date as string);
    const endTime = (raw.stop_time as string) || (raw.end_date as string);
    const venue = raw.venue as Record<string, unknown> | null;
    const categoriesData = raw.categories as Record<string, unknown> | null;
    const categories = (categoriesData?.category as Array<Record<string, unknown>>) ?? [];
    const imagesData = raw.images as Record<string, unknown> | null;
    const images = (imagesData?.image as Array<Record<string, unknown>>) ?? [];
    const price = raw.price as Record<string, unknown> | null;

    const popularity = normalizeEventfulPopularity(raw.popularity);

    return {
      id: `eventful:${raw.id}`,
      provider: 'eventful',
      title: String(raw.title ?? 'Untitled Event'),
      description: raw.description as string | undefined,
      url: String(raw.url ?? ''),
      imageUrl: images[0]?.url as string | undefined,
      startDate: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
      endDate: endTime ? new Date(endTime).toISOString() : undefined,
      timezone: (raw.timezone as string) || 'UTC',
      venueName: venue?.venue_name as string | undefined,
      venueAddress: venue?.address as string | undefined,
      city: (venue?.city_name as string) || (raw.city_name as string) || '',
      country: (venue?.country_name as string) || (raw.country_name as string) || '',
      countryCode: (venue?.country_abbr as string) || (raw.country_abbr as string) || '',
      latitude: venue?.latitude ? Number(venue.latitude) : undefined,
      longitude: venue?.longitude ? Number(venue.longitude) : undefined,
      category: categories[0]?.name as string | undefined,
      subCategory: categories[1]?.name as string | undefined,
      tags: categories.map(c => String(c.name)).filter(Boolean),
      priceMin: price?.min ? Number(price.min) * 100 : undefined,
      priceMax: price?.max ? Number(price.max) * 100 : undefined,
      currency: (price?.currency as string) || 'USD',
      isFree: price?.min === 0 || price?.min === '0' || !price,
      popularity,
      sourceData: raw,
    };
  }
}

function normalizeEventfulPopularity(raw: unknown): number {
  // Eventful popularity is typically 0-1000+
  if (typeof raw === 'number') return Math.min(100, raw / 10);
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (!Number.isNaN(n)) return Math.min(100, n / 10);
  }
  return 30; // default for events without popularity
}