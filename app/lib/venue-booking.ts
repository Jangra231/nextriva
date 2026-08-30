import type { VenueBookingConflict } from "./db";

export function venueConflictMessage(conflict: VenueBookingConflict) {
  const date = conflict.startsAt ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(conflict.startsAt)) : "an unscheduled date";
  return `This approved venue is reserved by “${conflict.displayName}” from ${date}. It becomes available after that event is marked completed.`;
}
