/**
 * Eventbrite API Adapter
 * Docs: https://www.eventbrite.com/platform/api
 * Endpoint: https://www.eventbriteapi.com/v3/events/search/
 * Auth: Bearer token (OAuth2 access token)
 */
import type { EventProvider, ProviderSearchParams, WorldwideEvent } from '../worldwide-events';

const BASE_URL = 'https://www.eventbriteapi.com/v3/events/search/';

export class EventbriteAdapter implements EventProvider {
  readonly name = 'eventbrite';
  readonly requiresAuth = true;

  isConfigured(): boolean {
    return Boolean(process.env.EVENTBRITE_API_TOKEN);
  }

  async search(params: ProviderSearchParams): Promise<WorldwideEvent[]> {
    const token = process.env.EVENTBRITE_API_TOKEN;
    if (!token) return [];

    const searchParams = new URLSearchParams({
      'expand': 'venue,category,ticket_availability,format',
      'page': String(params.page ?? 1),
      'page_size': String(params.pageSize ?? 50),
      'sort_by': params.sortBy === 'date' ? 'date' : 'popularity',
    });

    if (params.query) searchParams.set('q', params.query);
    if (params.city) searchParams.set('location.address', params.city);
    if (params.category) searchParams.set('categories', params.category);
    if (params.startDateFrom) searchParams.set('start_date.range_start', params.startDateFrom);
    if (params.startDateTo) searchParams.set('start_date.range_end', params.startDateTo);

    try {
      const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
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
    const category = raw.category as Record<string, unknown> | null;
    const format = raw.format as Record<string, unknown> | null;
    const logo = raw.logo as Record<string, unknown> | null;
    const ticketAvailability = raw.ticket_availability as Record<string, unknown> | null;

    const start = raw.start as Record<string, unknown> | null;
    const end = raw.end as Record<string, unknown> | null;

    const minPrice = ticketAvailability?.minimum_ticket_price as Record<string, unknown> | null;
    const maxPrice = ticketAvailability?.maximum_ticket_price as Record<string, unknown> | null;

    return {
      id: `eventbrite:${raw.id}`,
      provider: 'eventbrite',
      title: String((raw.name as Record<string, unknown>)?.text ?? 'Untitled Event'),
      description: ((raw.description as Record<string, unknown>)?.text as string) ?? undefined,
      url: String(raw.url ?? ''),
      imageUrl: logo?.url as string | undefined,
      startDate: String(start?.utc ?? new Date().toISOString()),
      endDate: end?.utc ? String(end.utc) : undefined,
      timezone: String(start?.timezone ?? 'UTC'),
      venueName: venue?.name as string | undefined,
      venueAddress: (venue?.address as Record<string, unknown>)?.localized_address_display as string | undefined,
      city: (venue?.address as Record<string, unknown>)?.city as string | undefined ?? '',
      country: (venue?.address as Record<string, unknown>)?.country as string | undefined ?? '',
      countryCode: (venue?.address as Record<string, unknown>)?.country as string | undefined ?? '',
      latitude: venue?.latitude ? Number(venue.latitude) : undefined,
      longitude: venue?.longitude ? Number(venue.longitude) : undefined,
      category: category?.name as string | undefined,
      subCategory: format?.name as string | undefined,
      tags: category ? [String(category.name)] : [],
      priceMin: minPrice?.value ? Number(minPrice.value) : undefined, // already in cents
      priceMax: maxPrice?.value ? Number(maxPrice.value) : undefined,
      currency: String(minPrice?.currency ?? maxPrice?.currency ?? 'USD'),
      isFree: minPrice?.value === 0 || minPrice?.value === '0' || !ticketAvailability?.has_available_tickets,
      popularity: normalizeEventbritePopularity(raw),
      sourceData: raw,
    };
  }
}

function normalizeEventbritePopularity(raw: Record<string, unknown>): number {
  // Eventbrite doesn't expose a direct popularity score.
  // Use ticket availability + social signals as proxy
  const ticketAvail = raw.ticket_availability as Record<string, unknown> | null;
  const sold = ticketAvail?.sold ?? 0;
  const capacity = ticketAvail?.total ?? 0;
  if (typeof sold === 'number' && typeof capacity === 'number' && capacity > 0) {
    return Math.min(100, Math.round((sold / capacity) * 100));
  }
  // Fallback: use event ID recency as weak proxy
  return 35;
}