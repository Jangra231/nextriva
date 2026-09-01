import type { VenueBookingConflict } from "./db";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function venueConflictMessage(conflict: VenueBookingConflict) {
  const date = conflict.startsAt ? (() => {
    const d = new Date(conflict.startsAt);
    return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  })() : "an unscheduled date";
  return `This approved venue is reserved by “${conflict.displayName}” from ${date}. It becomes available after that event is marked completed.`;
}
