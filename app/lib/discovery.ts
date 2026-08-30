export const EVENT_SORT_VALUES = ["soonest", "latest", "recent"] as const;

export type EventSort = (typeof EVENT_SORT_VALUES)[number];

export function normalizeEventSort(value?: string): EventSort {
  return EVENT_SORT_VALUES.includes(value as EventSort) ? (value as EventSort) : "soonest";
}
