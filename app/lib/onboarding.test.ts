import { describe, expect, it } from "vitest";
import { buildOtpMessage, formatPhoneNumber } from "./sms";
import { getCitiesForState, CITIES_BY_STATE, INDIAN_STATES, INTERESTS, EVENT_FORMATS, EVENT_FREQUENCIES } from "./location-data";

describe("SMS helpers", () => {
  it("formats a 10-digit Indian number into E.164 with +91", () => {
    expect(formatPhoneNumber("9876543210")).toBe("+919876543210");
  });

  it("keeps an already-international number with its prefix", () => {
    expect(formatPhoneNumber("+14155552671")).toBe("+14155552671");
  });

  it("normalizes a 91-prefixed number to leading plus", () => {
    expect(formatPhoneNumber("919876543210")).toBe("+919876543210");
  });

  it("builds a signup OTP message that includes the code and purpose", () => {
    const message = buildOtpMessage("123456", "signup");
    expect(message).toContain("123456");
    expect(message).toContain("signup");
    expect(message).toContain("15 minutes");
  });
});

describe("Indian location data", () => {
  it("exposes known states and dependent cities", () => {
    expect(INDIAN_STATES).toContain("Maharashtra");
    expect(getCitiesForState("Maharashtra")).toContain("Mumbai");
  });

  it("maps every state to a non-empty city list", () => {
    for (const state of INDIAN_STATES) {
      expect(CITIES_BY_STATE[state]?.length || 0).toBeGreaterThan(0);
    }
  });

  it("returns an empty list for unknown states", () => {
    expect(getCitiesForState("Atlantis")).toEqual([]);
  });

  it("defines interest chips, format cards, and frequency options", () => {
    expect(INTERESTS.length).toBeGreaterThan(5);
    expect(EVENT_FORMATS.length).toBe(3);
    expect(EVENT_FREQUENCIES.length).toBeGreaterThan(2);
  });
});