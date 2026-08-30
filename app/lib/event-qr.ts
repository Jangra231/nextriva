export function eventRegistrationPath(slug: string) {
  return `/events/${encodeURIComponent(slug)}/register`;
}
