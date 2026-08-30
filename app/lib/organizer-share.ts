import { buildShareUrls } from "./share";

export function buildOrganizerShareTargets(origin: string, slug: string, eventName: string) {
  const base = origin.replace(/\/$/, "");
  const eventUrl = `${base}/events/${encodeURIComponent(slug)}`;
  const registrationUrl = `${eventUrl}/register`;
  return {
    eventUrl,
    registrationUrl,
    eventPlatforms: buildShareUrls(eventUrl, eventName),
    registrationPlatforms: buildShareUrls(registrationUrl, `Register for ${eventName}`),
  };
}
