import { describe, expect, it } from "vitest";
import { venueConflictMessage } from "./venue-booking";

describe("approved venue booking message", () => {
  it("explains which active event holds a venue and when it starts", () => {
    expect(venueConflictMessage({ venueId: 3, eventId: 12, displayName: "City Run", startsAt: new Date("2026-12-28T08:00:00Z"), endsAt: null, status: "live", moderationStatus: "approved" })).toContain("City Run");
  });
});
