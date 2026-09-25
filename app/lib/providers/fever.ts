/**
 * Fever API Adapter
 * Docs: https://developer.fever.com/
 * Endpoint: https://api.fever.com/v1/events
 * Auth: OAuth2 client credentials (API key + secret)
 */
import type { EventProvider, ProviderSearchParams, WorldwideEvent } from '../worldwide-events';

const BASE_URL = 'https://api.fever.com/v1/events';
const TOKEN_URL = 'https://api.fever.com/oauth/token';

let cachedToken: { token: string; expiresAt: number } | null = null;

export class FeverAdapter implements EventProvider {
  readonly name = 'fever';
  readonly requiresAuth = true;

  isConfigured(): boolean {
    return Boolean(process.env.FEVER_API_KEY && process.env.FEVER_CLIENT_SECRET);
  }

  async search(params: ProviderSearchParams): Promise<WorldwideEvent[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    const searchParams = new URLSearchParams({
      limit: String(params.pageSize ?? 50),
      offset: String(((params.page ?? 1) - 1) * (params.pageSize ?? 50)),
    });

    if (params.query) searchParams.set('q', params.query);
    if (params.city) searchParams.set('city', params.city);
    if (params.countryCode) searchParams.set('country_code', params.countryCode.toUpperCase());
    if (params.category) searchParams.set('category', params.category);
    if (params.startDateFrom) searchParams.set('starts_at_min', params.startDateFrom);
    if (params.startDateTo) searchParams.set('starts_at_max', params.startDateTo);

    try {
      const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        // Token might be expired, clear cache and retry once
        if (response.status === 401 && cachedToken) {
          cachedToken = null;
          return this.search(params);
        }
        return [];
      }

      const data = await response.json();
      const events = data.data ?? [];

      return events.map((e: Record<string, unknown>) => this.mapEvent(e));
    } catch {
      return [];
    }
  }

  private async getAccessToken(): Promise<string | null> {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
      return cachedToken.token;
    }

    const apiKey = process.env.FEVER_API_KEY;
    const clientSecret = process.env.FEVER_CLIENT_SECRET;
    if (!apiKey || !clientSecret) return null;

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: apiKey,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      console.warn('[Fever] Failed to obtain access token:', response.status);
      return null;
    }

    const data = await response.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return cachedToken.token;
  }

  private mapEvent(raw: Record<string, unknown>): WorldwideEvent {
    const venue = raw.venue as Record<string, unknown> | null;
    const category = raw.category as Record<string, unknown> | null;
    const images = (raw.images as Array<Record<string, unknown>>) ?? [];
    const priceRanges = (raw.price_ranges as Array<Record<string, unknown>>) ?? [];

    const minPrice = priceRanges[0]?.min_price;
    const maxPrice = priceRanges[0]?.max_price;
    const currency = (priceRanges[0]?.currency as string) || 'EUR';

    return {
      id: `fever:${raw.id}`,
      provider: 'fever',
      title: String(raw.title ?? 'Untitled Event'),
      description: raw.description as string | undefined,
      url: String(raw.url ?? ''),
      imageUrl: images[0]?.url as string | undefined,
      startDate: String(raw.starts_at ?? new Date().toISOString()),
      endDate: raw.ends_at ? String(raw.ends_at) : undefined,
      timezone: (raw.timezone as string) || 'UTC',
      venueName: venue?.name as string | undefined,
      venueAddress: venue?.address as string | undefined,
      city: (venue?.city as string) || '',
      country: (venue?.country as string) || '',
      countryCode: (venue?.country_code as string) || '',
      latitude: venue?.latitude ? Number(venue.latitude) : undefined,
      longitude: venue?.longitude ? Number(venue.longitude) : undefined,
      category: category?.name as string | undefined,
      subCategory: undefined,
      tags: category ? [String(category.name)] : [],
      priceMin: minPrice !== undefined ? Number(minPrice) * 100 : undefined,
      priceMax: maxPrice !== undefined ? Number(maxPrice) * 100 : undefined,
      currency,
      isFree: minPrice === 0 || minPrice === '0' || priceRanges.length === 0,
      popularity: normalizeFeverPopularity(raw.popularity),
      sourceData: raw,
    };
  }
}

function normalizeFeverPopularity(raw: unknown): number {
  // Fever provides a normalized_score 0-100
  if (typeof raw === 'number') return Math.min(100, Math.max(0, raw));
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (!Number.isNaN(n)) return Math.min(100, Math.max(0, n));
  }
  return 40;
}