import { describe, expect, it } from "vitest";
import { createSlug, dateRangeIsValid } from "./validation";

describe("event creation validation", () => {
  it("accepts only a chronological event date range", () => {
    expect(dateRangeIsValid(new Date("2026-08-20T10:00:00Z"), new Date("2026-08-20T12:00:00Z"))).toBe(true);
    expect(dateRangeIsValid(new Date("2026-08-20T12:00:00Z"), new Date("2026-08-20T10:00:00Z"))).toBe(false);
  });

  it("creates a URL-safe event slug", () => {
    expect(createSlug("Noida 10K & Wellness!", "abc123")).toBe("noida-10k-wellness-abc123");
  });
});
