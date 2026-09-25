/**
 * Meetup API Adapter
 * Docs: https://www.meetup.com/api/
 * Endpoint: https://api.meetup.com/find/upcoming_events
 * Auth: OAuth2 (API key for basic access, client secret for OAuth)
 */
import type { EventProvider, ProviderSearchParams, WorldwideEvent } from '../worldwide-events';

const BASE_URL = 'https://api.meetup.com/find/upcoming_events';

export class MeetupAdapter implements EventProvider {
  readonly name = 'meetup';
  readonly requiresAuth = true;

  isConfigured(): boolean {
    return Boolean(process.env.MEETUP_API_KEY);
  }

  async search(params: ProviderSearchParams): Promise<WorldwideEvent[]> {
    const apiKey = process.env.MEETUP_API_KEY;
    if (!apiKey) return [];

    const searchParams = new URLSearchParams({
      key: apiKey,
      page: String(params.pageSize ?? 50),
      offset: String(((params.page ?? 1) - 1) * (params.pageSize ?? 50)),
      fields: 'featured_photo,venue,group,fee,how_to_find_us',
      status: 'upcoming',
    });

    if (params.query) searchParams.set('text', params.query);
    if (params.city) searchParams.set('city', params.city);
    if (params.countryCode) searchParams.set('country', params.countryCode.toLowerCase());
    if (params.category) searchParams.set('topic_category', params.category);
    if (params.startDateFrom) searchParams.set('start_date_range', `${params.startDateFrom.split('T')[0]},${params.startDateTo?.split('T')[0] || 'future'}`);

    try {
      const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
        headers: { Accept: 'application/json' },
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
    const group = raw.group as Record<string, unknown> | null;
    const photo = raw.featured_photo as Record<string, unknown> | null;
    const fee = raw.fee as Record<string, unknown> | null;

    const topics = (raw.topics as Array<Record<string, unknown>>) ?? [];

    return {
      id: `meetup:${raw.id}`,
      provider: 'meetup',
      title: String(raw.name ?? 'Untitled Event'),
      description: (raw.description as string) || undefined,
      url: String(raw.link ?? raw.event_url ?? ''),
      imageUrl: (photo?.highres_link as string) || (photo?.photo_link as string) || undefined,
      startDate: String(raw.time ? new Date(Number(raw.time)).toISOString() : new Date().toISOString()),
      endDate: undefined,
      timezone: String(raw.utc_offset ? `UTC${Number(raw.utc_offset) > 0 ? '+' : ''}${Number(raw.utc_offset) / 3600}` : 'UTC'),
      venueName: (venue?.name as string) || undefined,
      venueAddress: (venue?.address_1 as string) || undefined,
      city: (venue?.city as string) || '',
      country: (venue?.country as string) || '',
      countryCode: (venue?.country as string) || '',
      latitude: venue?.lat ? Number(venue.lat) : undefined,
      longitude: venue?.lon ? Number(venue.lon) : undefined,
      category: ((group?.category as Record<string, unknown>)?.name as string) || 'Community',
      subCategory: undefined,
      tags: topics.map(t => String(t.name)).filter(Boolean),
      priceMin: fee?.amount ? Number(fee.amount) * 100 : undefined,
      priceMax: fee?.amount ? Number(fee.amount) * 100 : undefined,
      currency: String(fee?.currency ?? 'USD'),
      isFree: fee?.amount === 0 || fee?.amount === '0' || !fee,
      popularity: normalizeMeetupPopularity(raw),
      sourceData: raw,
    };
  }
}

function normalizeMeetupPopularity(raw: Record<string, unknown>): number {
  // Meetup provides yes_rsvp_count and maybe waitlist
  const yesRsvp = typeof raw.yes_rsvp_count === 'number' ? raw.yes_rsvp_count : 0;
  const capacity = typeof raw.capacity === 'number' ? raw.capacity : 0;
  if (capacity > 0) return Math.min(100, Math.round((yesRsvp / capacity) * 100));
  // Weak proxy: logarithm of RSVPs
  if (yesRsvp > 0) return Math.min(100, Math.round(Math.log10(yesRsvp + 1) * 25));
  return 25;
}