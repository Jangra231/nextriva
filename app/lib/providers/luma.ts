/**
 * Luma API Adapter
 * Docs: https://api.lu.ma/
 * Endpoint: https://api.lu.ma/public/v1/get-events
 * Auth: API key as Bearer token
 */
import type { EventProvider, ProviderSearchParams, WorldwideEvent } from '../worldwide-events';

const BASE_URL = 'https://api.lu.ma/public/v1/get-events';

export class LumaAdapter implements EventProvider {
  readonly name = 'luma';
  readonly requiresAuth = true;

  isConfigured(): boolean {
    return Boolean(process.env.LUMA_API_KEY);
  }

  async search(params: ProviderSearchParams): Promise<WorldwideEvent[]> {
    const apiKey = process.env.LUMA_API_KEY;
    if (!apiKey) return [];

    const searchParams = new URLSearchParams({
      limit: String(params.pageSize ?? 50),
      after: String(((params.page ?? 1) - 1) * (params.pageSize ?? 50)),
    });

    if (params.query) searchParams.set('query', params.query);
    if (params.city) searchParams.set('city', params.city);
    if (params.countryCode) searchParams.set('country', params.countryCode.toUpperCase());
    if (params.category) searchParams.set('category', params.category);

    try {
      const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const events = data.events ?? [];

      return events.map((e: Record<string, unknown>) => this.mapEvent(e));
    } catch {
      return [];
    }
  }

  private mapEvent(raw: Record<string, unknown>): WorldwideEvent {
    const venue = raw.venue as Record<string, unknown> | null;
    const cover = raw.cover_image as Record<string, unknown> | null;
    const pricing = raw.pricing as Record<string, unknown> | null;

    const categories = (raw.categories as Array<Record<string, unknown>>) ?? [];

    return {
      id: `luma:${raw.id}`,
      provider: 'luma',
      title: String(raw.name ?? 'Untitled Event'),
      description: raw.description as string | undefined,
      url: String(raw.url ?? `https://lu.ma/${raw.id}`),
      imageUrl: cover?.url as string | undefined,
      startDate: String(raw.start_at ?? new Date().toISOString()),
      endDate: raw.end_at ? String(raw.end_at) : undefined,
      timezone: String(raw.timezone ?? 'UTC'),
      venueName: venue?.name as string | undefined,
      venueAddress: venue?.address as string | undefined,
      city: venue?.city as string | undefined ?? '',
      country: venue?.country as string | undefined ?? '',
      countryCode: venue?.country as string | undefined ?? '',
      latitude: venue?.lat ? Number(venue.lat) : undefined,
      longitude: venue?.lng ? Number(venue.lng) : undefined,
      category: categories[0]?.name as string | undefined,
      subCategory: categories[1]?.name as string | undefined,
      tags: categories.map(c => String(c.name)).filter(Boolean),
      priceMin: pricing?.amount ? Number(pricing.amount) * 100 : undefined,
      priceMax: pricing?.amount ? Number(pricing.amount) * 100 : undefined,
      currency: String(pricing?.currency ?? 'USD'),
      isFree: pricing?.amount === 0 || pricing?.amount === '0' || pricing?.is_free === true,
      popularity: normalizeLumaPopularity(raw),
      sourceData: raw,
    };
  }
}

function normalizeLumaPopularity(raw: Record<string, unknown>): number {
  // Luma provides attendee_count and maybe waitlist_count
  const attendees = typeof raw.attendee_count === 'number' ? raw.attendee_count : 0;
  const capacity = typeof raw.capacity === 'number' ? raw.capacity : 0;
  if (capacity > 0) return Math.min(100, Math.round((attendees / capacity) * 100));
  if (attendees > 0) return Math.min(100, Math.round(Math.log10(attendees + 1) * 25));
  return 30;
}