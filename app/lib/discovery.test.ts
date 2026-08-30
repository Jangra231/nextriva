import { describe, expect, it } from "vitest";
import { normalizeEventSort } from "./discovery";

describe("normalizeEventSort", () => {
  it("uses soonest as the safe default", () => {
    expect(normalizeEventSort()).toBe("soonest");
    expect(normalizeEventSort("not-a-sort")).toBe("soonest");
  });

  it("retains supported homepage sort selections", () => {
    expect(normalizeEventSort("latest")).toBe("latest");
    expect(normalizeEventSort("recent")).toBe("recent");
  });
});
