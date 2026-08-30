export function isEventRegistrationPath(value: string) {
  return /^\/events\/[a-z0-9-]+\/register$/.test(value);
}

export function eventSlugFromRegistrationPath(value: string) {
  const match = /^\/events\/([a-z0-9-]+)\/register$/.exec(value);
  return match?.[1];
}

export function eventQrFilename(eventName: string) {
  const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
  return `fitizen-${slug}-registration-qr.png`;
}

export function eventQrPosterFilename(eventName: string) {
  return eventQrFilename(eventName).replace("-qr.png", "-qr-poster.svg");
}
