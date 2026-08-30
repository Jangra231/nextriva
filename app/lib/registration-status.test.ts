import { describe, expect, it } from "vitest";
import { getRegistrationStatusBadge, getRemainingCapacity, normalizeFillingFastThreshold } from "./registration-status";

describe("getRegistrationStatusBadge", () => {
  it("marks an event as sold out when its ticket capacity is reached", () => {
    expect(getRegistrationStatusBadge({ capacity: 100, registered: 100 })).toMatchObject({ label: "Sold out", tone: "sold-out" });
  });

  it("marks an event as filling fast once at least 70 percent of capacity is claimed", () => {
    expect(getRegistrationStatusBadge({ capacity: 100, registered: 70 })).toMatchObject({ label: "Filling fast", tone: "filling-fast" });
  });

  it("does not render an urgency badge for healthy availability or unspecified capacity", () => {
    expect(getRegistrationStatusBadge({ capacity: 100, registered: 69 })).toBeNull();
    expect(getRegistrationStatusBadge({ capacity: 0, registered: 0 })).toBeNull();
  });

  it("uses a normalized organizer-defined filling-fast threshold and reports exact remaining capacity", () => {
    expect(getRegistrationStatusBadge({ capacity: 100, registered: 60 }, 60)).toMatchObject({ label: "Filling fast" });
    expect(getRegistrationStatusBadge({ capacity: 100, registered: 60 }, 61)).toBeNull();
    expect(normalizeFillingFastThreshold(120)).toBe(99);
    expect(getRemainingCapacity({ capacity: 100, registered: 61 })).toBe(39);
  });
});
