export type RegistrationCapacity = { capacity: number; registered: number };

export function normalizeFillingFastThreshold(value: unknown, fallback = 70) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(99, Math.max(1, Math.round(parsed))) : fallback;
}

export function getRemainingCapacity(stats?: RegistrationCapacity | null) {
  return !stats || stats.capacity <= 0 ? null : Math.max(0, stats.capacity - stats.registered);
}

export function getRegistrationStatusBadge(stats?: RegistrationCapacity | null, thresholdPercent = 70) {
  if (!stats || stats.capacity <= 0) return null;
  if (stats.registered >= stats.capacity) return { label: "Sold out", tone: "sold-out" as const, description: `${stats.registered} of ${stats.capacity} places claimed` };
  if (stats.registered / stats.capacity >= normalizeFillingFastThreshold(thresholdPercent) / 100) return { label: "Filling fast", tone: "filling-fast" as const, description: `${stats.registered} of ${stats.capacity} places claimed` };
  return null;
}
