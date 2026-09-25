/**
 * Ticketmaster Discovery API Adapter
 * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 * Endpoint: https://app.ticketmaster.com/discovery/v2/events.json
 * Auth: API key as query parameter
 */
import type { EventProvider, ProviderSearchParams, WorldwideEvent } from '../worldwide-events';

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';

export class TicketmasterAdapter implements EventProvider {
  readonly name = 'ticketmaster';
  readonly requiresAuth = true;

  isConfigured(): boolean {
    return Boolean(process.env.TICKETMASTER_API_KEY);
  }

  async search(params: ProviderSearchParams): Promise<WorldwideEvent[]> {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) return [];

    const searchParams = new URLSearchParams({
      apikey: apiKey,
      size: String(params.pageSize ?? 50),
      page: String((params.page ?? 1) - 1), // 0-indexed
      sort: params.sortBy === 'date' ? 'date,asc' : 'relevance,desc',
      includeTBA: 'no',
      includeTBD: 'no',
    });

    if (params.query) searchParams.set('keyword', params.query);
    if (params.city) searchParams.set('city', params.city);
    if (params.countryCode) searchParams.set('countryCode', params.countryCode.toUpperCase());
    if (params.category) searchParams.set('classificationName', params.category);
    if (params.startDateFrom) searchParams.set('startDateTime', `${params.startDateFrom}Z`);
    if (params.startDateTo) searchParams.set('endDateTime', `${params.startDateTo}Z`);

    try {
      const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const events = data._embedded?.events ?? [];

      return events.map((e: Record<string, unknown>) => this.mapEvent(e));
    } catch {
      return [];
    }
  }

  private mapEvent(raw: Record<string, unknown>): WorldwideEvent {
    const embedded = raw._embedded as Record<string, unknown> | null;
    const venues = (embedded?.venues as Array<Record<string, unknown>>) ?? [];
    const venue = venues[0] ?? null;
    const classifications = (raw.classifications as Array<Record<string, unknown>>) ?? [];
    const images = (raw.images as Array<Record<string, unknown>>) ?? [];
    const priceRanges = (raw.priceRanges as Array<Record<string, unknown>>) ?? [];
    const dates = raw.dates as Record<string, unknown> | null;

    const primaryClassification = classifications[0];
    const segment = primaryClassification?.segment as Record<string, unknown> | null;
    const genre = primaryClassification?.genre as Record<string, unknown> | null;

    return {
      id: `ticketmaster:${raw.id}`,
      provider: 'ticketmaster',
      title: String(raw.name ?? 'Untitled Event'),
      description: raw.description as string | undefined,
      url: String(raw.url ?? ''),
      imageUrl: (images.find(i => i.ratio === '16_9')?.url as string) || (images[0]?.url as string) || undefined,
      startDate: String((dates?.start as Record<string, unknown>)?.dateTime ?? (dates?.start as Record<string, unknown>)?.localDate ?? new Date().toISOString()),
      endDate: (dates?.end as Record<string, unknown>)?.dateTime ? String((dates!.end as Record<string, unknown>).dateTime) : undefined,
      timezone: String(dates?.timezone ?? 'UTC'),
      venueName: venue?.name as string | undefined,
      venueAddress: (venue?.address as Record<string, unknown>)?.line1 as string | undefined,
      city: (venue?.city as Record<string, unknown>)?.name as string | undefined ?? '',
      country: (venue?.country as Record<string, unknown>)?.name as string | undefined ?? '',
      countryCode: (venue?.country as Record<string, unknown>)?.countryCode as string | undefined ?? '',
      latitude: (venue?.location as Record<string, unknown>)?.latitude ? Number((venue.location as Record<string, unknown>).latitude) : undefined,
      longitude: (venue?.location as Record<string, unknown>)?.longitude ? Number((venue.location as Record<string, unknown>).longitude) : undefined,
      category: segment?.name as string | undefined,
      subCategory: genre?.name as string | undefined,
      tags: [segment?.name, genre?.name].filter(Boolean) as string[],
      priceMin: priceRanges[0]?.min ? Number(priceRanges[0].min) * 100 : undefined,
      priceMax: priceRanges[0]?.max ? Number(priceRanges[0].max) * 100 : undefined,
      currency: String(priceRanges[0]?.currency ?? 'USD'),
      isFree: priceRanges[0]?.min === 0 || priceRanges[0]?.min === '0' || priceRanges.length === 0,
      popularity: normalizeTicketmasterPopularity(raw),
      sourceData: raw,
    };
  }
}

function normalizeTicketmasterPopularity(raw: Record<string, unknown>): number {
  // Ticketmaster doesn't expose popularity directly.
  // Use "promoter" rating or sales status as weak proxy
  const promoter = raw.promoter as Record<string, unknown> | null;
  const promoterScore = promoter?.description ? 50 : 30;
  const datesObj = raw.dates as Record<string, unknown> | null;
  const status = datesObj?.status as Record<string, unknown> | null;
  const isOnSale = status?.code === 'onsale';
  return isOnSale ? Math.min(100, promoterScore + 20) : promoterScore;
}