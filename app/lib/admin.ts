import { redirect } from "next/navigation";
import { currentUser } from "./auth";

export type PlatformRole = "user" | "admin" | "mcd" | "csr" | "state" | "district";
export const LOCAL_AUTHORITY_CAPABILITY = "LOCAL_AUTHORITY" as const;
export const LOCAL_AUTHORITY_LABEL = "Local Authority";
export const LOCAL_AUTHORITY_TERMINOLOGY_ENABLED = process.env.FITIZEN_LOCAL_AUTHORITY_TERMINOLOGY !== "false";
export const ACCOUNT_PROFILE_ROUTE_MIGRATION_ENABLED = process.env.FITIZEN_ACCOUNT_PROFILE_ROUTE_MIGRATION === "true";

export function accountProfilePath() {
  return ACCOUNT_PROFILE_ROUTE_MIGRATION_ENABLED ? "/account/profile" : "/dashboard/profile";
}

export function profileTerminologyForAccountType(accountType: "USER" | "PLATFORM_ADMIN" | string | null | undefined) {
  return accountType === "PLATFORM_ADMIN" ? "Platform Admin Profile" : "User Profile";
}

export function authorityWorkspacePath() {
  return LOCAL_AUTHORITY_TERMINOLOGY_ENABLED ? "/local-authority" : "/mcd";
}

export function authorityLoginPath() {
  return `${authorityWorkspacePath()}/login`;
}

export function resolveAuthorityTerminology(value: string | null | undefined) {
  const legacy = (value || "").trim().toLowerCase();
  if (["mcd", "bmc", "mcd/bmc", "mcd_bmc", "local_authority"].includes(legacy)) {
    return { capabilityCode: LOCAL_AUTHORITY_CAPABILITY, displayName: LOCAL_AUTHORITY_LABEL, legacyCode: legacy || "mcd" };
  }
  return null;
}

export function isAdministrator(user: { role: PlatformRole } | null | undefined) {
  return user?.role === "admin";
}

export function isLocalAuthority(user: { role: PlatformRole | string } | null | undefined) {
  return resolveAuthorityTerminology(user?.role)?.capabilityCode === LOCAL_AUTHORITY_CAPABILITY;
}

/** @deprecated Stage 1 compatibility alias. Use isLocalAuthority for new code. */
export const isMcdAuthority = isLocalAuthority;

export function isCsrSponsor(user: { role: PlatformRole } | null | undefined) {
  return user?.role === "csr";
}

export async function requireAdministrator(returnTo = "/admin") {
  const user = await currentUser();
  if (!user) redirect(`/admin/login?returnTo=${encodeURIComponent(returnTo)}`);
  if (!isAdministrator(user)) redirect("/admin/login?error=Administrator+access+is+required.");
  return user;
}

export async function requireLocalAuthority(returnTo = authorityWorkspacePath()) {
  const user = await currentUser();
  if (!user) redirect(`${authorityLoginPath()}?returnTo=${encodeURIComponent(returnTo)}`);
  if (!isLocalAuthority(user)) redirect(`${authorityLoginPath()}?error=Local+Authority+access+is+required.`);
  return user;
}

/** @deprecated Stage 1 compatibility alias. Use requireLocalAuthority for new code. */
export const requireMcdAuthority = requireLocalAuthority;

export async function requireCsrSponsor(returnTo = "/csr") {
  const user = await currentUser();
  if (!user) redirect(`/csr/login?returnTo=${encodeURIComponent(returnTo)}`);
  if (!isCsrSponsor(user)) redirect("/csr/login?error=CSR+sponsor+access+is+required.");
  return user;
}

export function isStateAuthority(user: { role: PlatformRole } | null | undefined) {
  return user?.role === "state";
}

export function isDistrictAuthority(user: { role: PlatformRole } | null | undefined) {
  return user?.role === "district";
}

export async function requireStateAuthority(returnTo = "/state-authority") {
  const user = await currentUser();
  if (!user) redirect(`/state-authority/login?returnTo=${encodeURIComponent(returnTo)}`);
  if (!isStateAuthority(user)) redirect("/state-authority/login?error=State+Authority+access+is+required.");
  return user;
}

export async function requireDistrictAuthority(returnTo = "/district-authority") {
  const user = await currentUser();
  if (!user) redirect(`/district-authority/login?returnTo=${encodeURIComponent(returnTo)}`);
  if (!isDistrictAuthority(user)) redirect("/district-authority/login?error=District+Authority+access+is+required.");
  return user;
}
