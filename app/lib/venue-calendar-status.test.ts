import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("selected venue calendar status contracts", () => {
  it("keeps reserved venues disabled only for booking selection while retaining them in the calendar selector", () => {
    const directory = source("app/components/VenueDirectorySelect.tsx");
    expect(directory).toContain("const renderVenueOptions = (list: Venue[], disableReserved = true)");
    expect(directory).toContain("{renderVenueOptions(venues, false)}");
    expect(directory).toContain("defaultCalendarVenueId");
  });

  it("colors individual overlapping time windows red and leaves the remaining slots green", () => {
    const calendar = source("app/components/VenueBookingCalendar.tsx");
    expect(calendar).toContain("slotStart < endOf(item) && slotEnd > new Date(item.startsAt)");
    expect(calendar).toContain("styles.slotReserved : styles.slotAvailable");
    expect(calendar).toContain("Green timeline slots are available; red timeline slots are reserved");
    expect(calendar).toContain("setSelectedDay(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())))");
  });

  it("returns an organizer to the exact reserved venue calendar after the server conflict warning", () => {
    const actions = source("app/actions.ts"); const page = source("app/dashboard/manage-events/create-event/[eventId]/page.tsx");
    expect(actions).toContain("venueSource=directory&calendarVenueId=${venue.id}");
    expect(page).toContain("initialCalendarVenueId={Number(query.calendarVenueId) || undefined}");
  });

  it("seeds the calendar with the wizard’s server reservation records before the client refresh completes", () => {
    const page = source("app/dashboard/manage-events/create-event/[eventId]/page.tsx"); const selector = source("app/components/LocationSelector.tsx"); const directory = source("app/components/VenueDirectorySelect.tsx");
    expect(page).toContain("venueConflicts={venueConflicts}");
    expect(selector).toContain("initialConflicts={venueConflicts}");
    expect(directory).toContain("useState<VenueConflict[]>(initialConflicts)");
    expect(directory).toContain("initialAvailabilityMessage");
  });

  it("suggests a next available window only for a fully reserved selected date and keeps reservation detail compact", () => {
    const calendar = source("app/components/VenueBookingCalendar.tsx");
    expect(calendar).toContain("const fullDay = selectedReservations.every");
    expect(calendar).toContain("const suggested = fullDay ? nextAvailableSlot");
    expect(calendar).toContain("Fully reserved. Next available:");
    expect(calendar).toContain('className={styles.upcoming}');
  });

  it("keeps organizer drafts out of participant registration and following queries at the database boundary", () => {
    const database = source("app/lib/db.ts");
    expect(database).toContain("export async function getRegistrations(attendeeId: number)");
    expect(database).toContain("sql`${events.status} <> 'draft'`");
    expect(database).toContain("export async function getFollowedEvents(attendeeId: number)");
    expect(database).toContain("sql`${events.moderationStatus} <> 'deleted'`");
  });
});
