import { describe, expect, it } from "vitest";
import { isAdministrator, isCsrSponsor, isLocalAuthority, isMcdAuthority, LOCAL_AUTHORITY_CAPABILITY, LOCAL_AUTHORITY_LABEL, resolveAuthorityTerminology } from "./admin";

describe("administrator access", () => {
  it("allows only users explicitly assigned the administrator role", () => {
    expect(isAdministrator({ role: "admin" })).toBe(true);
    expect(isAdministrator({ role: "mcd" })).toBe(false);
    expect(isAdministrator({ role: "user" })).toBe(false);
    expect(isAdministrator(null)).toBe(false);
  });

  it("maps legacy authority values to the Local Authority capability while retaining the MCD helper alias", () => {
    expect(isLocalAuthority({ role: "mcd" })).toBe(true);
    expect(isMcdAuthority({ role: "mcd" })).toBe(true);
    expect(resolveAuthorityTerminology("mcd")).toEqual({ capabilityCode: LOCAL_AUTHORITY_CAPABILITY, displayName: LOCAL_AUTHORITY_LABEL, legacyCode: "mcd" });
    expect(resolveAuthorityTerminology("BMC")).toEqual({ capabilityCode: LOCAL_AUTHORITY_CAPABILITY, displayName: LOCAL_AUTHORITY_LABEL, legacyCode: "bmc" });
    expect(resolveAuthorityTerminology("mcd/bmc")).toEqual({ capabilityCode: LOCAL_AUTHORITY_CAPABILITY, displayName: LOCAL_AUTHORITY_LABEL, legacyCode: "mcd/bmc" });
    expect(isLocalAuthority({ role: "admin" })).toBe(false);
    expect(isLocalAuthority({ role: "user" })).toBe(false);
    expect(isLocalAuthority(null)).toBe(false);
  });

  it("allows only explicitly provisioned CSR sponsor accounts through the CSR guard", () => {
    expect(isCsrSponsor({ role: "csr" })).toBe(true);
    expect(isCsrSponsor({ role: "admin" })).toBe(false);
    expect(isCsrSponsor({ role: "mcd" })).toBe(false);
    expect(isCsrSponsor({ role: "user" })).toBe(false);
  });
});
