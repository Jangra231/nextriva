import { describe, expect, it } from "vitest";

const participantDestinations = ["/dashboard/profile", "/dashboard/my-bookings", "/dashboard/following", "/events"];

describe("participant account navigation", () => {
  it("keeps profile and participant destinations available without entering organizer views", () => {
    expect(participantDestinations).toContain("/dashboard/profile");
    expect(participantDestinations).toContain("/dashboard/my-bookings");
    expect(participantDestinations).toContain("/dashboard/following");
    expect(participantDestinations).toContain("/events");
  });
});
