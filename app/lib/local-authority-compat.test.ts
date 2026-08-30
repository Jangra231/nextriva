import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isLocalAuthority, LOCAL_AUTHORITY_CAPABILITY, LOCAL_AUTHORITY_LABEL, resolveAuthorityTerminology } from "./admin";

const root = process.cwd();

describe("Stage 1 Local Authority compatibility", () => {
  it("resolves every retained legacy terminology value to the exact Local Authority capability and label", () => {
    for (const legacyCode of ["mcd", "MCD", "bmc", "BMC", "mcd/bmc", "LOCAL_AUTHORITY"]) {
      const resolved = resolveAuthorityTerminology(legacyCode);
      expect(resolved?.capabilityCode).toBe(LOCAL_AUTHORITY_CAPABILITY);
      expect(resolved?.displayName).toBe(LOCAL_AUTHORITY_LABEL);
    }
    expect(isLocalAuthority({ role: "mcd" })).toBe(true);
    expect(isLocalAuthority({ role: "csr" })).toBe(false);
  });

  it("keeps canonical Local Authority routes and safe legacy MCD redirects while the compatibility window is active", async () => {
    const [legacyPage, legacyLogin, canonicalPage, canonicalLogin] = await Promise.all([
      readFile(path.join(root, "app/mcd/page.tsx"), "utf8"),
      readFile(path.join(root, "app/mcd/login/page.tsx"), "utf8"),
      readFile(path.join(root, "app/local-authority/page.tsx"), "utf8"),
      readFile(path.join(root, "app/local-authority/login/page.tsx"), "utf8"),
    ]);
    expect(legacyPage).toContain('redirect(`/local-authority');
    expect(legacyLogin).toContain('redirect(`/local-authority/login?');
    expect(canonicalPage).toContain("LocalAuthorityWorkspace");
    expect(canonicalLogin).toContain("Local Authority login");
  });

  it("ships an additive idempotent terminology migration that preserves legacy codes", async () => {
    const migration = await readFile(path.join(root, "drizzle/0025_medical_alex_wilder.sql"), "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS `authorityTerminologyMappings`");
    expect(migration).toContain("'mcd', 'LOCAL_AUTHORITY', 'Local Authority'");
    expect(migration).toContain("'bmc', 'LOCAL_AUTHORITY', 'Local Authority'");
    expect(migration).toContain("ON DUPLICATE KEY UPDATE");
  });
});
