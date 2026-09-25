import type { EventProvider } from "./worldwide-types";

export async function getConfiguredProviders(): Promise<EventProvider[]> {
  const providers: EventProvider[] = [];

  // Lazy-load adapters to avoid bundling unused provider code
  if (process.env.EVENTFUL_API_KEY) {
    const { EventfulAdapter } = await import("./providers/eventful");
    providers.push(new EventfulAdapter());
  }
  if (process.env.FEVER_API_KEY && process.env.FEVER_CLIENT_SECRET) {
    const { FeverAdapter } = await import("./providers/fever");
    providers.push(new FeverAdapter());
  }
  if (process.env.EVENTBRITE_API_TOKEN) {
    const { EventbriteAdapter } = await import("./providers/eventbrite");
    providers.push(new EventbriteAdapter());
  }
  if (process.env.BANDSINTOWN_APP_NAME) {
    const { BandsintownAdapter } = await import("./providers/bandsintown");
    providers.push(new BandsintownAdapter());
  }
  if (process.env.TICKETMASTER_API_KEY) {
    const { TicketmasterAdapter } = await import("./providers/ticketmaster");
    providers.push(new TicketmasterAdapter());
  }
  if (process.env.MEETUP_API_KEY && process.env.MEETUP_CLIENT_SECRET) {
    const { MeetupAdapter } = await import("./providers/meetup");
    providers.push(new MeetupAdapter());
  }
  if (process.env.LUMA_API_KEY) {
    const { LumaAdapter } = await import("./providers/luma");
    providers.push(new LumaAdapter());
  }

  // Always-available free/open data providers (no API keys required)
  const { ParisOpenDataAdapter } = await import("./providers/paris-opendata");
  const { NycOpenDataAdapter } = await import("./providers/nyc-opendata");
  const { WikidataEventsAdapter } = await import("./providers/wikidata-events");
  providers.push(new ParisOpenDataAdapter(), new NycOpenDataAdapter(), new WikidataEventsAdapter());

  return providers;
}
