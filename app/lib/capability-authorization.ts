export type CapabilityScopeValues = {
  scopeType: "national" | "state" | "district" | "city" | "zone" | "ward";
  state?: string | null;
  district?: string | null;
  city?: string | null;
  zone?: string | null;
  ward?: string | null;
};

export type CapabilityResourceScope = Omit<CapabilityScopeValues, "scopeType">;

type AuthorizationCandidate = CapabilityScopeValues & {
  grantId: number;
  status: "active" | "suspended" | "revoked" | "expired";
  startsAt: Date;
  endsAt: Date;
  functionCodes: string[];
};

export type CapabilityAuthorizationDecision = {
  allowed: boolean;
  mode: "legacy_compatibility" | "grant_enforced";
  reason: string;
  grantId: number | null;
};

const scopedField: Record<CapabilityScopeValues["scopeType"], keyof CapabilityResourceScope | null> = {
  national: null,
  state: "state",
  district: "district",
  city: "city",
  zone: "zone",
  ward: "ward",
};

function normalized(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase() || "";
}

export function isCapabilityAuthorizationEnforced() {
  return process.env.FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT === "true";
}

export function isLocalAuthorityMisExportEnforced() {
  return process.env.FITIZEN_CAPABILITY_MIS_EXPORT_ENFORCEMENT === "true";
}

export function isCsrCapabilityAuthorizationEnforced() {
  return process.env.FITIZEN_CSR_CAPABILITY_AUTHORIZATION_ENFORCEMENT === "true";
}

export function capabilityScopeMatches(grant: CapabilityScopeValues, resource: CapabilityResourceScope) {
  // National grants intentionally apply across supported territories. Optional
  // locality fields can be retained as planning metadata and must not turn a
  // national grant into an unusable city/zone/ward grant.
  if (grant.scopeType === "national") return true;
  const primaryField = scopedField[grant.scopeType];
  if (primaryField && (!normalized(grant[primaryField]) || normalized(grant[primaryField]) !== normalized(resource[primaryField]))) return false;
  return (["state", "district", "city", "zone", "ward"] as const).every(field => !normalized(grant[field]) || normalized(grant[field]) === normalized(resource[field]));
}

export function evaluateCapabilityAuthorization(input: { functionCode: string; resourceScope: CapabilityResourceScope; candidates: AuthorizationCandidate[]; now?: Date }): CapabilityAuthorizationDecision {
  const now = input.now || new Date();
  for (const grant of input.candidates) {
    if (grant.status !== "active" || grant.startsAt > now || grant.endsAt <= now) continue;
    if (!grant.functionCodes.includes(input.functionCode)) continue;
    if (!capabilityScopeMatches(grant, input.resourceScope)) continue;
    return { allowed: true, mode: "grant_enforced", reason: "Active selected-function grant matches the requested territory.", grantId: grant.grantId };
  }
  return { allowed: false, mode: "grant_enforced", reason: `No active scoped grant authorizes ${input.functionCode} for this operation.`, grantId: null };
}
