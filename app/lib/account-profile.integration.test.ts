import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { legacyAccountCapabilityMappings, users } from "../../drizzle/schema";
import { ACCOUNT_PROFILE_ROUTE_MIGRATION_ENABLED, accountProfilePath, profileTerminologyForAccountType } from "./admin";
import { createPasswordUser, db, getUserAccountContext } from "./db";

const root = process.cwd();
const cleanupIds: number[] = [];

afterEach(async () => {
  while (cleanupIds.length) {
    const id = cleanupIds.pop();
    if (id) await db().delete(users).where(eq(users.id, id));
  }
});

describe("Stage 2 account-profile compatibility", () => {
  it("keeps one permanent user while deriving an additive USER profile and legacy capability mappings without granting execution access", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await createPasswordUser({ name: "Stage Two Mapping", email: `stage2-${suffix}@fitizen.test`, passwordHash: "stage2-test-only" });
    expect(user).toBeTruthy();
    cleanupIds.push(user!.id);

    const standard = await getUserAccountContext(user!.id);
    expect(standard?.user.publicId).toBe(user!.publicId);
    expect(standard?.profile.accountType).toBe("USER");
    expect(standard?.profile.profileTerminology).toBe("User Profile");
    expect(standard?.legacyCapabilityMappings).toHaveLength(0);

    await db().update(users).set({ role: "mcd" }).where(eq(users.id, user!.id));
    const authority = await getUserAccountContext(user!.id);
    expect(authority?.user.publicId).toBe(user!.publicId);
    expect(authority?.profile.accountType).toBe("USER");
    expect(authority?.legacyCapabilityMappings.map(mapping => mapping.capabilityCode)).toEqual(["LOCAL_AUTHORITY"]);

    await db().update(users).set({ role: "csr" }).where(eq(users.id, user!.id));
    const csr = await getUserAccountContext(user!.id);
    expect(csr?.user.publicId).toBe(user!.publicId);
    expect(csr?.legacyCapabilityMappings.map(mapping => mapping.capabilityCode)).toEqual(["CSR"]);
    const historicalMappings = await db().select().from(legacyAccountCapabilityMappings).where(eq(legacyAccountCapabilityMappings.userAccountProfileId, csr!.profile.id));
    expect(historicalMappings.map(mapping => mapping.capabilityCode).sort()).toEqual(["CSR", "LOCAL_AUTHORITY"]);
    expect(historicalMappings.find(mapping => mapping.capabilityCode === "LOCAL_AUTHORITY")?.active).toBe(false);
  }, 15_000);

  it("keeps legacy profile routing by default while exposing a guarded canonical route and explicit profile terminology", async () => {
    expect(accountProfilePath()).toBe(ACCOUNT_PROFILE_ROUTE_MIGRATION_ENABLED ? "/account/profile" : "/dashboard/profile");
    expect(profileTerminologyForAccountType("USER")).toBe("User Profile");
    expect(profileTerminologyForAccountType("PLATFORM_ADMIN")).toBe("Platform Admin Profile");
    const [legacyProfile, canonicalProfile] = await Promise.all([
      readFile(path.join(root, "app/dashboard/profile/page.tsx"), "utf8"),
      readFile(path.join(root, "app/account/profile/page.tsx"), "utf8"),
    ]);
    expect(legacyProfile).toContain("ACCOUNT_PROFILE_ROUTE_MIGRATION_ENABLED");
    expect(canonicalProfile).toContain("ACCOUNT_PROFILE_ROUTE_MIGRATION_ENABLED");
    expect(canonicalProfile).toContain('redirect("/dashboard/profile")');
  });

  it("ships additive rerunnable migrations and Local Authority feedback hooks without rewriting the legacy users table", async () => {
    const [migration, schema, styles, loader] = await Promise.all([
      readFile(path.join(root, "drizzle/0026_workable_saracen.sql"), "utf8"),
      readFile(path.join(root, "drizzle/schema.ts"), "utf8"),
      readFile(path.join(root, "app/globals.css"), "utf8"),
      readFile(path.join(root, "app/local-authority/loading.tsx"), "utf8"),
    ]);
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS `userAccountProfiles`");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS `legacyAccountCapabilityMappings`");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS `accountMigrationRecords`");
    expect(migration).toContain("ON DUPLICATE KEY UPDATE");
    expect(schema).toContain('accountType: mysqlEnum("accountType", ["USER", "PLATFORM_ADMIN"])');
    expect(styles).toContain(".local-authority-review-control");
    expect(styles).toContain("@media (prefers-reduced-motion:reduce)");
    expect(loader).toContain("Loading monitoring controls");
  });
});
