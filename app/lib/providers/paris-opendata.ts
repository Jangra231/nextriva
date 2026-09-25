/**
 * Paris Open Data Adapter - Que Faire à Paris events
 * Docs: https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/api/
 * Endpoint: https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records
 * Auth: None (public open data)
 */
import type { EventProvider, ProviderSearchParams, WorldwideEvent } from '../worldwide-events';

const BASE_URL = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records';

export class ParisOpenDataAdapter implements EventProvider {
  readonly name = 'paris-opendata';
  readonly requiresAuth = false;

  isConfigured(): boolean {
    return true;
  }

  async search(params: ProviderSearchParams): Promise<WorldwideEvent[]> {
    const searchParams = new URLSearchParams({
      limit: String(params.pageSize ?? 30),
      offset: String(((params.page ?? 1) - 1) * (params.pageSize ?? 30)),
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        next: { revalidate: 1800 },
      });
      clearTimeout(timeoutId);

      if (!response.ok) return [];

      const data = await response.json();
      const rawEvents = data.results ?? [];

      return rawEvents.map((e: Record<string, unknown>, idx: number) => this.mapEvent(e, idx));
    } catch {
      return [];
    }
  }

  private mapEvent(raw: Record<string, unknown>, idx: number): WorldwideEvent {
    const startDate = String(raw.date_start ?? raw.start_date ?? new Date().toISOString());
    const endDate = raw.date_end ? String(raw.date_end) : undefined;
    const title = String(raw.title_event ?? raw.titre ?? raw.title ?? 'Paris Cultural Event');
    const description = String(raw.lead_text ?? raw.description ?? 'Cultural event in Paris.');
    const address = String(raw.adresse ?? raw.address ?? 'Paris, France');
    const url = String(raw.url ?? raw.access_link ?? 'https://www.paris.fr/evenements');
    const imageUrl = String(raw.image ?? raw.image_couverture ?? 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=450&fit=crop&q=80');

    return {
      id: `paris:${raw.id ?? raw.recordid ?? idx}`,
      provider: 'paris-opendata',
      title,
      description,
      url,
      imageUrl,
      startDate,
      endDate,
      timezone: 'Europe/Paris',
      venueName: String(raw.nom_lieu ?? raw.lieu ?? 'Paris Venue'),
      venueAddress: address,
      city: 'Paris',
      country: 'France',
      countryCode: 'FR',
      category: 'Arts & Culture',
      tags: ['paris', 'culture', 'france'],
      currency: 'EUR',
      isFree: true,
      popularity: 85,
      sourceData: raw,
    };
  }
}
