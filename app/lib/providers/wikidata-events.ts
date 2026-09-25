/**
 * Wikidata SPARQL API Adapter
 * Endpoint: https://query.wikidata.org/sparql
 * Auth: None (Public SPARQL endpoint)
 */
import type { EventProvider, ProviderSearchParams, WorldwideEvent } from '../worldwide-events';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

export class WikidataEventsAdapter implements EventProvider {
  readonly name = 'wikidata';
  readonly requiresAuth = false;

  isConfigured(): boolean {
    return true; // Always available without API key
  }

  async search(params: ProviderSearchParams): Promise<WorldwideEvent[]> {
    const queryTerm = params.query ? params.query.toLowerCase().trim() : '';
    const cityTerm = params.city ? params.city.toLowerCase().trim() : '';

    const sparql = `
      SELECT DISTINCT ?event ?eventLabel ?startDate ?url ?image 
             (SAMPLE(?cityLabel) AS ?cityLabel) 
             (SAMPLE(?countryLabel) AS ?countryLabel)
      WHERE {
        ?event wdt:P31/wdt:P279* wd:Q132241;
               wdt:P580 ?startDate;
               wdt:P276 ?location.
        ?location rdfs:label ?cityLabel. FILTER(LANG(?cityLabel) = "en")
        ?location wdt:P17 ?country.
        ?country rdfs:label ?countryLabel. FILTER(LANG(?countryLabel) = "en")
        OPTIONAL { ?event wdt:P856 ?url. }
        OPTIONAL { ?event wdt:P18 ?image. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      GROUP BY ?event ?eventLabel ?startDate ?url ?image
      ORDER BY DESC(?startDate)
      LIMIT 120
    `;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`, {
        headers: {
          Accept: 'application/sparql-results+json',
          'User-Agent': 'NexrivaEventDiscovery/1.0 (https://nexriva.com)',
        },
        signal: controller.signal,
        next: { revalidate: 3600 },
      });
      clearTimeout(timeoutId);

      if (!response.ok) return [];

      const text = await response.text();
      if (!text || !text.startsWith('{')) return [];

      const data = JSON.parse(text);
      const bindings = data.results?.bindings ?? [];

      return bindings
        .map((b: Record<string, unknown>, idx: number) => this.mapEvent(b, idx))
        .filter((e: WorldwideEvent) => {
          if (queryTerm && !e.title.toLowerCase().includes(queryTerm) && !e.city.toLowerCase().includes(queryTerm) && !e.country.toLowerCase().includes(queryTerm)) {
            return false;
          }
          if (cityTerm && !e.city.toLowerCase().includes(cityTerm)) {
            return false;
          }
          return true;
        });
    } catch {
      return [];
    }
  }

  private mapEvent(raw: Record<string, unknown>, idx: number): WorldwideEvent {
    const eventUri = (raw.event as Record<string, unknown>)?.value as string ?? '';
    const eventId = eventUri.split('/').pop() ?? `wd-${idx}`;
    const title = ((raw.eventLabel as Record<string, unknown>)?.value as string) || 'Global Festival / Event';
    const city = ((raw.cityLabel as Record<string, unknown>)?.value as string) || 'Global';
    const country = ((raw.countryLabel as Record<string, unknown>)?.value as string) || '';
    const startDate = ((raw.startDate as Record<string, unknown>)?.value as string) || new Date().toISOString();
    const url = ((raw.url as Record<string, unknown>)?.value as string) || eventUri || 'https://www.wikidata.org';
    const imageUrl = ((raw.image as Record<string, unknown>)?.value as string) || undefined;

    return {
      id: `wikidata:${eventId}`,
      provider: 'wikidata',
      title,
      description: `Featured global festival or conference in ${city}${country ? `, ${country}` : ''}.`,
      url,
      imageUrl,
      startDate,
      timezone: 'UTC',
      city,
      country,
      countryCode: '',
      category: 'Festival',
      tags: ['festival', 'culture', 'global', city.toLowerCase(), country.toLowerCase()].filter(Boolean),
      currency: 'USD',
      isFree: true,
      popularity: 82,
      sourceData: raw,
    };
  }
}

