import { afterEach, describe, expect, it } from "vitest";
import { capabilityScopeMatches, evaluateCapabilityAuthorization, isCapabilityAuthorizationEnforced } from "./capability-authorization";

const original = process.env.FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT;

afterEach(() => {
  if (original === undefined) delete process.env.FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT;
  else process.env.FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT = original;
});

describe("central capability authorization contract", () => {
  const now = new Date("2026-08-24T00:00:00.000Z");
  const candidate = { grantId: 42, status: "active" as const, scopeType: "city" as const, city: "Noida", startsAt: new Date("2026-08-01T00:00:00.000Z"), endsAt: new Date("2026-09-01T00:00:00.000Z"), functionCodes: ["LA_EVENT_REVIEW"] };

  it("requires an exact active function, current interval, and matching scope", () => {
    expect(capabilityScopeMatches(candidate, { city: "NOIDA", zone: "Sector 18" })).toBe(true);
    expect(capabilityScopeMatches(candidate, { city: "Delhi" })).toBe(false);
    expect(evaluateCapabilityAuthorization({ functionCode: "LA_EVENT_REVIEW", resourceScope: { city: "Noida" }, candidates: [candidate], now })).toMatchObject({ allowed: true, grantId: 42 });
    expect(evaluateCapabilityAuthorization({ functionCode: "LA_EVENT_REVIEW", resourceScope: { city: "Delhi" }, candidates: [candidate], now })).toMatchObject({ allowed: false });
    expect(evaluateCapabilityAuthorization({ functionCode: "LA_MIS_EXPORT", resourceScope: { city: "Noida" }, candidates: [candidate], now })).toMatchObject({ allowed: false });
  });

  it("keeps a national grant usable when optional locality metadata is present", () => {
    const national = { grantId: 43, status: "active" as const, scopeType: "national" as const, city: "Noida", zone: "Sector", ward: "20", startsAt: new Date("2026-08-01T00:00:00.000Z"), endsAt: new Date("2026-09-01T00:00:00.000Z"), functionCodes: ["CSR_BRIEF_SUBMIT"] };
    expect(capabilityScopeMatches(national, {})).toBe(true);
    expect(evaluateCapabilityAuthorization({ functionCode: "CSR_BRIEF_SUBMIT", resourceScope: {}, candidates: [national], now })).toMatchObject({ allowed: true, grantId: 43 });
  });

  it("uses the rollout flag only when it is explicitly true", () => {
    delete process.env.FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT;
    expect(isCapabilityAuthorizationEnforced()).toBe(false);
    process.env.FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT = "true";
    expect(isCapabilityAuthorizationEnforced()).toBe(true);
    process.env.FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT = "TRUE";
    expect(isCapabilityAuthorizationEnforced()).toBe(false);
  });
});
