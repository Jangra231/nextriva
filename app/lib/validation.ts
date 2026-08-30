export function dateRangeIsValid(start: Date, end: Date) {
  return Number.isFinite(start.valueOf()) && Number.isFinite(end.valueOf()) && end > start;
}

export function createSlug(title: string, suffix: string) {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base || "event"}-${suffix}`;
}
