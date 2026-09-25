// Unified event shape for the worldwide events carousel/page
export interface WorldwideEvent {
  id: string;                    // provider:id composite key
  provider: string;              // eventful | fever | eventbrite | bandsintown | ticketmaster | meetup | luma | seed
  title: string;
  description?: string;
  url: string;                   // canonical event URL
  imageUrl?: string;             // cover/banner image
  startDate: string;             // ISO 8601 UTC
  endDate?: string;              // ISO 8601 UTC
  timezone: string;              // IANA timezone
  venueName?: string;
  venueAddress?: string;
  city: string;
  country: string;
  countryCode: string;           // ISO 3166-1 alpha-2
  latitude?: number;
  longitude?: number;
  category?: string;
  subCategory?: string;
  tags: string[];
  priceMin?: number;             // in minor units (cents/paise)
  priceMax?: number;
  currency: string;              // ISO 4217
  isFree: boolean;
  popularity: number;            // 0-100 normalized score
  sourceData: Record<string, unknown>; // raw provider response for debugging
}

// Provider adapter interface
export interface EventProvider {
  readonly name: string;
  readonly requiresAuth: boolean;
  isConfigured(): boolean;
  search(params: ProviderSearchParams): Promise<WorldwideEvent[]>;
}

export interface ProviderSearchParams {
  query?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  category?: string;
  startDateFrom?: string;        // ISO 8601
  startDateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'date' | 'popularity' | 'relevance';
}

export type WorldwideSearchParams = ProviderSearchParams;
