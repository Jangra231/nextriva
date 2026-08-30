import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, like, lt, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import {
	accountMigrationRecords,
	adminAuditLogs,
	approvedVenues,
	authorityDeliveryPlans,
	authorityExceptions,
	authorityStateProgrammes,
	authorityTerminologyMappings,
	capabilities,
	capabilityApplicationDocuments,
	capabilityApplicationFunctions,
	capabilityApplications,
	capabilityAuditRecords,
	capabilityDecisionNotifications,
	capabilityFunctions,
	capabilityGrantFunctions,
	capabilityGrantReminderDeliveries,
	capabilityGrants,
	categories,
	csrBudgets,
	csrCapabilitySponsorships,
	csrEventAssignments,
	csrFutureEventConcepts,
	csrProfiles,
  csrSponsorshipRequests,
  csrSponsorships,
  customQuestions,
  events,
  eventFollows,
	implementationAgencies,
	legacyAccountCapabilityMappings,
	participantHistoryAuditRecords,
	participantHistoryConsents,
  participantHistoryCorrections,
  participantHistoryEntries,
	platformSettings,
  promotions,
  registrations,
	taxInvoices,
  tickets,
  users,
	userAccountProfiles,
	userWorkspacePreferences,
  venueAvailabilityNotifications,
  venueAvailabilitySubscriptions,
  venueFilterPresets,
  venueApprovalRequests,
} from "../../drizzle/schema";
import { canConfirmManualPayment, canCreateRegistration, paymentStatusForRegistration } from "./workflow";
import { capabilityScopeMatches, evaluateCapabilityAuthorization, isCapabilityAuthorizationEnforced, isCsrCapabilityAuthorizationEnforced, type CapabilityResourceScope } from "./capability-authorization";
import { normalizeEventSort } from "./discovery";
import { hasManualPaymentInstructions, normalizeManualPaymentReference } from "./manual-payment";
import { isProfileAvatarUrl } from "./profile-avatar";
import { isAuthorityCapabilityWorkspaceEnabled, isCapabilityDecisionNotificationsEnabled, isCapabilityWorkspaceSwitcherEnabled, isCsrAssignmentTimelineEnabled, isCsrCapabilityWorkspaceEnabled, isCsrGrantUsageExportEnabled, isParticipantHistoryEnabled, isStage10AuthorityAnalyticsEnabled, isStage10GrantReminderAutomationEnabled, isWorkspaceDefaultExpiryAlertsEnabled, isWorkspaceLandingPreferencesEnabled } from "./capability-feature";
import { canEditEventForModeration, canSubmitForApproval, calculatePlatformFeePaise, normalizePlatformFeePercent, registrationPriceBreakdown, requiresModerationNote, type ModerationStatus } from "./moderation";

const pool = process.env.DATABASE_URL
  ? createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60_000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: 10_000,
    })
  : null;
const connection = pool ? drizzle(pool) : null;

function databaseErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error ? String(error.code) : "";
}

export function isRetryableDatabaseConnectionError(error: unknown) {
  const code = databaseErrorCode(error);
  const message = error instanceof Error ? error.message : String(error);
  return ["PROTOCOL_CONNECTION_LOST", "ECONNRESET", "ECONNREFUSED", "EPIPE"].includes(code) || /connection lost|server closed|socket/i.test(message);
}

/** Retry only read operations once when the pool hands out a stale connection. */
export async function withDatabaseReadRetry<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (!isRetryableDatabaseConnectionError(error)) throw error;
    await new Promise(resolve => setTimeout(resolve, 25));
    return operation();
  }
}

const defaultCategories = [
  ["Running", "running"],
  ["Wellness", "wellness"],
  ["Music", "music"],
  ["Learning", "learning"],
  ["Food & Drink", "food-drink"],
  ["Community", "community"],
] as const;

export function db() {
  if (!connection) throw new Error("Database connection is unavailable.");
  return connection;
}

const primaryPlatformSettingsKey = "primary";
const defaultPlatformSettings = { id: 0, settingKey: primaryPlatformSettingsKey, gatewayFeePercent: 0, invoicePrefix: "NXR", issuerLegalName: null, issuerTaxRegistrationNumber: null, issuerAddress: null, updatedByAdminId: null };

export async function getPlatformSettings() {
  const row = (await db().select().from(platformSettings).where(eq(platformSettings.settingKey, primaryPlatformSettingsKey)).limit(1))[0];
  return row || defaultPlatformSettings;
}

export async function adminUpdatePlatformSettings(adminId: number, input: { gatewayFeePercent: number; invoicePrefix: string; issuerLegalName?: string | null; issuerTaxRegistrationNumber?: string | null; issuerAddress?: string | null }) {
  const before = await getPlatformSettings();
  const gatewayFeePercent = normalizePlatformFeePercent(input.gatewayFeePercent);
  const invoicePrefix = (input.invoicePrefix || "NXR").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12) || "NXR";
  const values = { settingKey: primaryPlatformSettingsKey, gatewayFeePercent, invoicePrefix, issuerLegalName: input.issuerLegalName?.trim().slice(0, 180) || null, issuerTaxRegistrationNumber: input.issuerTaxRegistrationNumber?.trim().slice(0, 80) || null, issuerAddress: input.issuerAddress?.trim().slice(0, 1200) || null, updatedByAdminId: adminId };
  await db().insert(platformSettings).values(values).onDuplicateKeyUpdate({ set: { gatewayFeePercent, invoicePrefix, issuerLegalName: values.issuerLegalName, issuerTaxRegistrationNumber: values.issuerTaxRegistrationNumber, issuerAddress: values.issuerAddress, updatedByAdminId: adminId } });
  const after = await getPlatformSettings();
  await recordAdminAudit(adminId, "platform.gateway_fee_settings_updated", "platform_settings", after.id, before, after);
  return after;
}

function identitySuffix() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
}

export function createPublicUserId() {
  return `USR-${identitySuffix()}`;
}

export function createPublicEventId() {
	return `EVT-${identitySuffix()}`;
}

export function createPublicCsrRequestId() { return `CSR-REQ-${identitySuffix()}`; }
export function createPublicCsrSponsorshipId() { return `CSR-SPN-${identitySuffix()}`; }
export function createPublicCsrAssignmentId() { return `CSR-ASN-${identitySuffix()}`; }
export function createPublicCsrConceptId() { return `CSR-CON-${identitySuffix()}`; }
export function createPublicParticipantHistoryId() { return `HEN-${identitySuffix()}`; }
export function createPublicParticipantHistoryCorrectionId() { return `HCR-${identitySuffix()}`; }

export async function ensureCategories() {
  await db()
    .insert(categories)
    .values(defaultCategories.map(([name, slug]) => ({ name, slug })))
    .onDuplicateKeyUpdate({ set: { name: sql`values(name)` } });
}

const localAuthorityTerminologyRows = [
  { legacyCode: "mcd", capabilityCode: "LOCAL_AUTHORITY", displayName: "Local Authority", active: true },
  { legacyCode: "bmc", capabilityCode: "LOCAL_AUTHORITY", displayName: "Local Authority", active: true },
  { legacyCode: "mcd/bmc", capabilityCode: "LOCAL_AUTHORITY", displayName: "Local Authority", active: true },
] as const;

export async function ensureLocalAuthorityTerminologyMappings() {
  await db().insert(authorityTerminologyMappings).values([...localAuthorityTerminologyRows]).onDuplicateKeyUpdate({ set: { capabilityCode: sql`values(capabilityCode)`, displayName: sql`values(displayName)`, active: sql`values(active)` } });
  return db().select().from(authorityTerminologyMappings).where(eq(authorityTerminologyMappings.capabilityCode, "LOCAL_AUTHORITY"));
}

export async function getCategories() {
  await ensureCategories();
  return db().select().from(categories).orderBy(asc(categories.name));
}

export async function getApprovedVenues() {
  return db().select().from(approvedVenues).where(eq(approvedVenues.active, true)).orderBy(asc(approvedVenues.city), asc(approvedVenues.location), asc(approvedVenues.venueName));
}

export async function getApprovedVenue(venueId: number) {
  return (await db().select().from(approvedVenues).where(and(eq(approvedVenues.id, venueId), eq(approvedVenues.active, true))).limit(1))[0];
}

export type VenueBookingConflict = { venueId: number; eventId: number; displayName: string; startsAt: Date | null; endsAt: Date | null; status: "draft" | "live" | "completed"; moderationStatus: ModerationStatus };

export async function getActiveVenueConflicts(excludedEventId: number) {
  return db().select({ venueId: events.approvedVenueId, eventId: events.id, displayName: events.displayName, startsAt: events.startsAt, endsAt: events.endsAt, status: events.status, moderationStatus: events.moderationStatus }).from(events).where(and(sql`${events.approvedVenueId} is not null`, sql`${events.id} <> ${excludedEventId}`, sql`${events.status} <> 'completed'`, sql`${events.moderationStatus} <> 'deleted'`));
}

export async function findActiveVenueConflict(eventId: number, venueId: number) {
  const conflict = (await db().select({ venueId: events.approvedVenueId, eventId: events.id, displayName: events.displayName, startsAt: events.startsAt, endsAt: events.endsAt, status: events.status, moderationStatus: events.moderationStatus }).from(events).where(and(eq(events.approvedVenueId, venueId), sql`${events.id} <> ${eventId}`, sql`${events.status} <> 'completed'`, sql`${events.moderationStatus} <> 'deleted'`)).orderBy(asc(events.startsAt)).limit(1))[0];
  return conflict?.venueId === null || !conflict ? null : { ...conflict, venueId: conflict.venueId };
}

export async function getAdminVenues() {
  return db().select().from(approvedVenues).orderBy(desc(approvedVenues.updatedAt)).limit(200);
}

export type VenueFilterPresetInput = { name: string; query?: string | null; zone?: string | null; ward?: string | null; minimumCapacity?: number | null; accessibility: "all" | "accessible" | "standard"; radiusKm?: number | null };

export async function getOrganizerVenueFilterPresets(organizerId: number) {
  return db().select().from(venueFilterPresets).where(eq(venueFilterPresets.organizerId, organizerId)).orderBy(desc(venueFilterPresets.updatedAt), desc(venueFilterPresets.id)).limit(20);
}

export async function createOrganizerVenueFilterPreset(organizerId: number, input: VenueFilterPresetInput) {
  const name = input.name.trim().slice(0, 80); const query = input.query?.trim().slice(0, 120) || null; const zone = input.zone?.trim().slice(0, 100) || null; const ward = input.ward?.trim().slice(0, 100) || null;
  if (name.length < 2) throw new Error("Enter a preset name with at least two characters");
  if (input.minimumCapacity !== null && input.minimumCapacity !== undefined && (!Number.isInteger(input.minimumCapacity) || input.minimumCapacity < 1 || input.minimumCapacity > 1_000_000)) throw new Error("Minimum capacity must be a whole number between 1 and 1000000");
  if (input.radiusKm !== null && input.radiusKm !== undefined && ![5, 10, 25, 50, 100].includes(input.radiusKm)) throw new Error("Choose a supported radius");
  const count = await db().select({ count: sql<number>`count(*)` }).from(venueFilterPresets).where(eq(venueFilterPresets.organizerId, organizerId));
  if (Number(count[0]?.count || 0) >= 20) throw new Error("You can save up to 20 venue filter presets");
  const created = await db().insert(venueFilterPresets).values({ organizerId, name, query, zone, ward, minimumCapacity: input.minimumCapacity || null, accessibility: input.accessibility, radiusKm: input.radiusKm || null });
  return (await db().select().from(venueFilterPresets).where(and(eq(venueFilterPresets.id, Number(created[0].insertId)), eq(venueFilterPresets.organizerId, organizerId))).limit(1))[0];
}

export async function deleteOrganizerVenueFilterPreset(organizerId: number, presetId: number) {
  if (!Number.isInteger(presetId) || presetId < 1) throw new Error("Invalid venue filter preset");
  await db().delete(venueFilterPresets).where(and(eq(venueFilterPresets.id, presetId), eq(venueFilterPresets.organizerId, organizerId)));
}

export async function findUserByEmail(email: string) {
  const rows = await db().select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return rows[0];
}

export async function findUserById(id: number) {
  const rows = await db().select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export type AccountProfileType = "USER" | "PLATFORM_ADMIN";

function accountProfileValues(role: "user" | "admin" | "mcd" | "csr") {
  const accountType: AccountProfileType = role === "admin" ? "PLATFORM_ADMIN" : "USER";
  const profileTerminology = accountType === "PLATFORM_ADMIN" ? "Platform Admin Profile" : "User Profile";
  const capabilityCode = role === "mcd" ? "LOCAL_AUTHORITY" : role === "csr" ? "CSR" : null;
  return { accountType, profileTerminology, capabilityCode };
}

export async function ensureUserAccountProfile(userId: number) {
  const user = await findUserById(userId);
  if (!user) throw new Error("Account not found");
  const values = accountProfileValues(user.role);
  await db().insert(userAccountProfiles).values({ userId: user.id, accountType: values.accountType, profileTerminology: values.profileTerminology, legacyRole: user.role, migrationSource: "stage2_runtime_sync" }).onDuplicateKeyUpdate({ set: { accountType: values.accountType, profileTerminology: values.profileTerminology, legacyRole: user.role } });
  const profile = (await db().select().from(userAccountProfiles).where(eq(userAccountProfiles.userId, user.id)).limit(1))[0];
  if (!profile) throw new Error("Account profile synchronization failed");
  await db().update(legacyAccountCapabilityMappings).set({ active: false }).where(eq(legacyAccountCapabilityMappings.userAccountProfileId, profile.id));
  if (values.capabilityCode) await db().insert(legacyAccountCapabilityMappings).values({ userAccountProfileId: profile.id, legacyRole: user.role, capabilityCode: values.capabilityCode, active: true, mappingSource: "stage2_runtime_sync" }).onDuplicateKeyUpdate({ set: { legacyRole: user.role, active: true } });
  await db().insert(accountMigrationRecords).values({ userId: user.id, migrationCode: "stage2_account_profile_backfill", beforeState: { legacyRole: user.role, publicId: user.publicId }, afterState: { accountType: values.accountType, profileTerminology: values.profileTerminology } }).onDuplicateKeyUpdate({ set: { migrationCode: "stage2_account_profile_backfill" } });
  return profile;
}

export async function getUserAccountContext(userId: number) {
  const user = await findUserById(userId);
  if (!user) return undefined;
  const profile = await ensureUserAccountProfile(user.id);
  const legacyCapabilityMappings = await db().select().from(legacyAccountCapabilityMappings).where(and(eq(legacyAccountCapabilityMappings.userAccountProfileId, profile.id), eq(legacyAccountCapabilityMappings.active, true))).orderBy(asc(legacyAccountCapabilityMappings.capabilityCode));
	return { user, profile, legacyCapabilityMappings };
}

export type CapabilityScopeType = "national" | "state" | "district" | "city" | "zone" | "ward";
export type CapabilityScopeInput = { scopeType: CapabilityScopeType; state?: string | null; district?: string | null; city?: string | null; zone?: string | null; ward?: string | null };
export type CapabilityApplicationRoleSpecificData = Record<string, string>;
export type CapabilityApplicationInput = CapabilityScopeInput & { capabilityId: number; functionIds: number[]; justification: string; startsAt?: Date | null; endsAt?: Date | null; applicantNote?: string | null; roleSpecificData?: CapabilityApplicationRoleSpecificData | null };

const capabilityScopeTypes: CapabilityScopeType[] = ["national", "state", "district", "city", "zone", "ward"];

function normalizedCapabilityText(value: string | null | undefined, maxLength: number) {
	return value?.trim().slice(0, maxLength) || null;
}

function normalizeCapabilityFunctionIds(value: number[]) {
	return [...new Set(value.filter(item => Number.isInteger(item) && item > 0))];
}

const csrApplicationDetailKeys = ["companyName", "registrationNumber", "contactPerson", "officialEmail", "mobile", "programmeName", "fundsAvailable", "proposalPurpose", "transactionStatus", "referenceNumber", "referenceDate", "proposedActivity", "serviceArea", "expectedParticipants", "expectedImpact", "declarationAccepted"] as const;
const authorityApplicationDetailKeys = ["authorityName", "department", "officerName", "officialId", "officialEmail", "officialMobile"] as const;

function normalizeCapabilityApplicationRoleSpecificData(capabilityCode: string, value: CapabilityApplicationRoleSpecificData | null | undefined) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const allowedKeys = capabilityCode === "CSR_SPONSORSHIP" ? csrApplicationDetailKeys : ["LOCAL_AUTHORITY", "DISTRICT_LEVEL", "STATE_LEVEL"].includes(capabilityCode) ? authorityApplicationDetailKeys : [];
	if (!allowedKeys.length) return null;
	const normalized = Object.fromEntries(allowedKeys.map(key => [key, normalizedCapabilityText(value[key], key === "expectedImpact" || key === "proposalPurpose" ? 2000 : 180)]).filter(([, entry]) => entry)) as CapabilityApplicationRoleSpecificData;
	if (capabilityCode === "CSR_SPONSORSHIP") {
		const required = ["companyName", "registrationNumber", "contactPerson", "officialEmail", "mobile", "programmeName", "fundsAvailable", "proposalPurpose", "proposedActivity", "serviceArea", "expectedParticipants", "expectedImpact"];
		if (required.some(key => !normalized[key]) || normalized.declarationAccepted !== "true") throw new Error("Complete the required CSR company, programme, funding, impact, and declaration details");
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.officialEmail)) throw new Error("Enter a valid CSR official email address");
	}
	if (["LOCAL_AUTHORITY", "DISTRICT_LEVEL", "STATE_LEVEL"].includes(capabilityCode)) {
		const required = ["authorityName", "department", "officerName", "officialId", "officialEmail", "officialMobile"];
		if (required.some(key => !normalized[key])) throw new Error("Complete the required authority, department, officer, official ID, email, and mobile details");
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.officialEmail)) throw new Error("Enter a valid authority official email address");
	}
	return normalized;
}

function capabilityScopeValues(input: CapabilityScopeInput) {
	if (!capabilityScopeTypes.includes(input.scopeType)) throw new Error("Choose a supported capability scope");
	const state = normalizedCapabilityText(input.state, 100); const district = normalizedCapabilityText(input.district, 100); const city = normalizedCapabilityText(input.city, 100); const zone = normalizedCapabilityText(input.zone, 100); const ward = normalizedCapabilityText(input.ward, 100);
	const required = input.scopeType === "state" ? state : input.scopeType === "district" ? district : input.scopeType === "city" ? city : input.scopeType === "zone" ? zone : input.scopeType === "ward" ? ward : "national";
	if (!required) throw new Error(`Add the ${input.scopeType} required for this requested scope`);
	return { scopeType: input.scopeType, state, district, city, zone, ward };
}

function capabilityDateRange(startsAt: Date | null | undefined, endsAt: Date | null | undefined) {
	if (!startsAt || !endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) throw new Error("Choose a valid capability start and end date");
	return { startsAt, endsAt };
}

async function recordCapabilityAudit(actorUserId: number, action: string, input: { applicationId?: number | null; grantId?: number | null; beforeState?: Record<string, unknown> | null; afterState?: Record<string, unknown> | null }, executor: any = db()) {
	await executor.insert(capabilityAuditRecords).values({ actorUserId, action, applicationId: input.applicationId || null, grantId: input.grantId || null, beforeState: input.beforeState || null, afterState: input.afterState || null });
}

async function recordCapabilityDecisionNotification(input: { userId: number; applicationId?: number | null; grantId?: number | null; kind: string; title: string; body: string; actionUrl?: string }, executor: any = db()) {
	if (!isCapabilityDecisionNotificationsEnabled()) return;
	await executor.insert(capabilityDecisionNotifications).values({ userId: input.userId, applicationId: input.applicationId || null, grantId: input.grantId || null, kind: input.kind, title: input.title.slice(0, 180), body: input.body.slice(0, 4000), actionUrl: input.actionUrl || "/dashboard/capabilities" });
}

function grantDecisionTitle(status: "active" | "suspended" | "revoked" | "expired") {
	return status === "active" ? "Capability grant activated" : status === "suspended" ? "Capability grant suspended" : status === "revoked" ? "Capability grant revoked" : "Capability grant expired";
}

function groupedCapabilityCatalog(rows: Array<{ capability: typeof capabilities.$inferSelect; capabilityFunction: typeof capabilityFunctions.$inferSelect | null }>) {
	const grouped = new Map<number, { capability: typeof capabilities.$inferSelect; functions: Array<typeof capabilityFunctions.$inferSelect> }>();
	for (const row of rows) {
		const existing = grouped.get(row.capability.id) || { capability: row.capability, functions: [] };
		if (row.capabilityFunction) existing.functions.push(row.capabilityFunction);
		grouped.set(row.capability.id, existing);
	}
	return [...grouped.values()].map(entry => ({ ...entry, functions: entry.functions.sort((left, right) => left.sortOrder - right.sortOrder || left.displayName.localeCompare(right.displayName)) })).sort((left, right) => left.capability.sortOrder - right.capability.sortOrder || left.capability.displayName.localeCompare(right.capability.displayName));
}

export async function getCapabilityCatalog(options?: { includeInactive?: boolean; query?: string; audience?: string }) {
	const query = options?.query?.trim().toLowerCase() || "";
	const audience = options?.audience?.trim().toLowerCase() || "";
	const rows = await db().select({ capability: capabilities, capabilityFunction: capabilityFunctions }).from(capabilities).leftJoin(capabilityFunctions, and(eq(capabilityFunctions.capabilityId, capabilities.id), options?.includeInactive ? sql`true` : eq(capabilityFunctions.active, true))).where(options?.includeInactive ? sql`true` : eq(capabilities.active, true)).orderBy(asc(capabilities.sortOrder), asc(capabilityFunctions.sortOrder));
	return groupedCapabilityCatalog(rows).filter(entry => !query || [entry.capability.code, entry.capability.displayName, entry.capability.description, entry.capability.audience, ...entry.functions.flatMap(item => [item.code, item.displayName, item.description])].join(" ").toLowerCase().includes(query)).filter(entry => !audience || entry.capability.audience.toLowerCase().includes(audience));
}

export type CapabilityDecisionNotificationFilter = "all" | "unread" | "approved" | "returned" | "rejected" | "grant";

export function normalizeCapabilityDecisionNotificationFilter(value?: string | null): CapabilityDecisionNotificationFilter {
	return value === "unread" || value === "approved" || value === "returned" || value === "rejected" || value === "grant" ? value : "all";
}

function capabilityDecisionNotificationFilterCondition(filter: CapabilityDecisionNotificationFilter) {
	return filter === "unread" ? isNull(capabilityDecisionNotifications.readAt) : filter === "approved" ? eq(capabilityDecisionNotifications.kind, "application_approved") : filter === "returned" ? eq(capabilityDecisionNotifications.kind, "application_changes_requested") : filter === "rejected" ? eq(capabilityDecisionNotifications.kind, "application_rejected") : filter === "grant" ? like(capabilityDecisionNotifications.kind, "grant_%") : undefined;
}

export async function getCapabilityApplicantWorkspace(userId: number, options?: { decisionNotificationFilter?: CapabilityDecisionNotificationFilter }) {
	const account = await getUserAccountContext(userId); if (!account) throw new Error("Account profile not found");
	const [catalog, applications, grants] = await Promise.all([
		getCapabilityCatalog(),
		db().select({ application: capabilityApplications, capability: capabilities }).from(capabilityApplications).innerJoin(capabilities, eq(capabilityApplications.capabilityId, capabilities.id)).where(eq(capabilityApplications.userAccountProfileId, account.profile.id)).orderBy(desc(capabilityApplications.updatedAt)),
		db().select({ grant: capabilityGrants, capability: capabilities }).from(capabilityGrants).innerJoin(capabilities, eq(capabilityGrants.capabilityId, capabilities.id)).where(eq(capabilityGrants.userAccountProfileId, account.profile.id)).orderBy(desc(capabilityGrants.updatedAt)),
	]);
	const applicationIds = applications.map(row => row.application.id); const grantIds = grants.map(row => row.grant.id);
	const [applicationFunctions, grantFunctions, applicationDocuments] = await Promise.all([
		applicationIds.length ? db().select({ applicationId: capabilityApplicationFunctions.applicationId, capabilityFunction: capabilityFunctions }).from(capabilityApplicationFunctions).innerJoin(capabilityFunctions, eq(capabilityApplicationFunctions.capabilityFunctionId, capabilityFunctions.id)).where(inArray(capabilityApplicationFunctions.applicationId, applicationIds)) : [],
		grantIds.length ? db().select({ grantId: capabilityGrantFunctions.grantId, capabilityFunction: capabilityFunctions }).from(capabilityGrantFunctions).innerJoin(capabilityFunctions, eq(capabilityGrantFunctions.capabilityFunctionId, capabilityFunctions.id)).where(inArray(capabilityGrantFunctions.grantId, grantIds)) : [],
		applicationIds.length ? db().select().from(capabilityApplicationDocuments).where(and(inArray(capabilityApplicationDocuments.applicationId, applicationIds), eq(capabilityApplicationDocuments.createdByUserId, userId))).orderBy(desc(capabilityApplicationDocuments.createdAt)) : [],
	]);
	return { account, catalog, applications: applications.map(row => ({ ...row, functions: applicationFunctions.filter(item => item.applicationId === row.application.id).map(item => item.capabilityFunction), documents: applicationDocuments.filter(item => item.applicationId === row.application.id) })), grants: grants.map(row => ({ ...row, effectiveStatus: row.grant.status === "active" && row.grant.endsAt <= new Date() ? "expired" : row.grant.status === "active" && row.grant.startsAt > new Date() ? "scheduled" : row.grant.status, functions: grantFunctions.filter(item => item.grantId === row.grant.id).map(item => item.capabilityFunction) })), grantAlerts: await getCapabilityGrantAlerts(userId), decisionNotifications: await getCapabilityDecisionNotifications(userId, options?.decisionNotificationFilter || "all"), unreadDecisionNotificationCount: await getUnreadCapabilityDecisionNotificationCount(userId) };
}

export async function getCapabilityDecisionNotifications(userId: number, filter: CapabilityDecisionNotificationFilter = "all") {
	if (!isCapabilityDecisionNotificationsEnabled()) return [];
	const filterCondition = capabilityDecisionNotificationFilterCondition(filter);
	return db().select().from(capabilityDecisionNotifications).where(filterCondition ? and(eq(capabilityDecisionNotifications.userId, userId), filterCondition) : eq(capabilityDecisionNotifications.userId, userId)).orderBy(desc(capabilityDecisionNotifications.createdAt)).limit(30);
}

export async function getUnreadCapabilityDecisionNotificationCount(userId: number) {
	if (!isCapabilityDecisionNotificationsEnabled()) return 0;
	const row = (await db().select({ count: sql<number>`count(*)` }).from(capabilityDecisionNotifications).where(and(eq(capabilityDecisionNotifications.userId, userId), isNull(capabilityDecisionNotifications.readAt))))[0];
	return Number(row?.count || 0);
}

export type ActiveCapabilityWorkspace = { grant: typeof capabilityGrants.$inferSelect; capability: typeof capabilities.$inferSelect; functions: Array<typeof capabilityFunctions.$inferSelect> };

export async function getActiveCapabilityWorkspaces(userId: number, now = new Date()): Promise<ActiveCapabilityWorkspace[]> {
	if (!isCapabilityWorkspaceSwitcherEnabled()) return [];
	const account = await getUserAccountContext(userId); if (!account) return [];
	const rows = await db().select({ grant: capabilityGrants, capability: capabilities }).from(capabilityGrants).innerJoin(capabilities, eq(capabilityGrants.capabilityId, capabilities.id)).where(and(eq(capabilityGrants.userAccountProfileId, account.profile.id), eq(capabilityGrants.status, "active"), eq(capabilities.active, true), lte(capabilityGrants.startsAt, now), gt(capabilityGrants.endsAt, now))).orderBy(asc(capabilities.sortOrder), asc(capabilityGrants.endsAt));
	const grantIds = rows.map(row => row.grant.id); if (!grantIds.length) return [];
	const functionRows = await db().select({ grantId: capabilityGrantFunctions.grantId, capabilityFunction: capabilityFunctions }).from(capabilityGrantFunctions).innerJoin(capabilityFunctions, and(eq(capabilityGrantFunctions.capabilityFunctionId, capabilityFunctions.id), eq(capabilityFunctions.active, true))).where(inArray(capabilityGrantFunctions.grantId, grantIds));
	return rows.map(row => ({ ...row, functions: functionRows.filter(item => item.grantId === row.grant.id).map(item => item.capabilityFunction) })).filter(row => row.functions.length > 0);
}

export async function getActiveCapabilityWorkspaceContext(userId: number, capabilityCode: string, grantId: number, now = new Date()) {
	if (!isCapabilityWorkspaceSwitcherEnabled() || !Number.isInteger(grantId) || grantId < 1 || !/^[A-Z0-9_]{2,64}$/.test(capabilityCode)) return undefined;
	const account = await getUserAccountContext(userId); if (!account) return undefined;
	const row = (await db().select({ grant: capabilityGrants, capability: capabilities }).from(capabilityGrants).innerJoin(capabilities, eq(capabilityGrants.capabilityId, capabilities.id)).where(and(eq(capabilityGrants.id, grantId), eq(capabilityGrants.userAccountProfileId, account.profile.id), eq(capabilityGrants.status, "active"), eq(capabilities.active, true), eq(capabilities.code, capabilityCode), lte(capabilityGrants.startsAt, now), gt(capabilityGrants.endsAt, now))).limit(1))[0];
	if (!row) return undefined;
	const functions = await db().select({ capabilityFunction: capabilityFunctions }).from(capabilityGrantFunctions).innerJoin(capabilityFunctions, and(eq(capabilityGrantFunctions.capabilityFunctionId, capabilityFunctions.id), eq(capabilityFunctions.active, true))).where(eq(capabilityGrantFunctions.grantId, row.grant.id));
	if (!functions.length) return undefined;
	return { account, workspace: { ...row, functions: functions.map(item => item.capabilityFunction) } };
}

export type WorkspaceLandingPreference = { defaultView: "participant" | "organizer" | "capability"; defaultCapabilityGrantId: number | null };

export async function getWorkspaceLandingPreference(userId: number): Promise<WorkspaceLandingPreference | undefined> {
	if (!isWorkspaceLandingPreferencesEnabled()) return undefined;
	const preference = (await db().select().from(userWorkspacePreferences).where(eq(userWorkspacePreferences.userId, userId)).limit(1))[0];
	return preference ? { defaultView: preference.defaultView, defaultCapabilityGrantId: preference.defaultCapabilityGrantId } : undefined;
}

export async function saveWorkspaceLandingPreference(userId: number, input: WorkspaceLandingPreference) {
	if (!isWorkspaceLandingPreferencesEnabled()) throw new Error("Workspace landing preferences are disabled");
	if (input.defaultView !== "participant" && input.defaultView !== "organizer" && input.defaultView !== "capability") throw new Error("Choose a supported landing view");
	let grantId: number | null = null;
	if (input.defaultView === "capability") {
		if (!Number.isInteger(input.defaultCapabilityGrantId) || input.defaultCapabilityGrantId! < 1) throw new Error("Choose an active approved workspace");
		const workspace = (await getActiveCapabilityWorkspaces(userId)).find(item => item.grant.id === input.defaultCapabilityGrantId);
		if (!workspace) throw new Error("The selected workspace is no longer active for this account");
		grantId = workspace.grant.id;
	}
	await db().insert(userWorkspacePreferences).values({ userId, defaultView: input.defaultView, defaultCapabilityGrantId: grantId }).onDuplicateKeyUpdate({ set: { defaultView: input.defaultView, defaultCapabilityGrantId: grantId } });
	return { defaultView: input.defaultView, defaultCapabilityGrantId: grantId };
}

export async function resolveWorkspaceLandingPath(userId: number) {
	const preference = await getWorkspaceLandingPreference(userId); if (!preference) return undefined;
	if (preference.defaultView === "participant") return "/dashboard/my-bookings";
	if (preference.defaultView === "organizer") return "/dashboard/manage-events/events";
	const workspace = (await getActiveCapabilityWorkspaces(userId)).find(item => item.grant.id === preference.defaultCapabilityGrantId);
	return workspace ? `/dashboard/workspaces/${workspace.capability.code}?grant=${workspace.grant.id}` : "/dashboard/my-bookings";
}

export async function getCapabilityWorkspaceActivitySummary(userId: number, capabilityCode: string, grantId: number) {
	const context = await getActiveCapabilityWorkspaceContext(userId, capabilityCode, grantId); if (!context) return undefined;
	const activity = await db().select({ id: capabilityAuditRecords.id, action: capabilityAuditRecords.action, createdAt: capabilityAuditRecords.createdAt }).from(capabilityAuditRecords).where(eq(capabilityAuditRecords.grantId, grantId)).orderBy(desc(capabilityAuditRecords.createdAt)).limit(8);
	return { workspace: context.workspace, activity };
}

export async function getAdminCapabilityGrantUsageReport() {
	const rows = await db().select({ grant: capabilityGrants, capability: capabilities, user: users }).from(capabilityGrants).innerJoin(capabilities, eq(capabilityGrants.capabilityId, capabilities.id)).innerJoin(userAccountProfiles, eq(capabilityGrants.userAccountProfileId, userAccountProfiles.id)).innerJoin(users, eq(userAccountProfiles.userId, users.id)).orderBy(desc(capabilityGrants.updatedAt));
	const grantIds = rows.map(row => row.grant.id);
	const [functions, audits] = await Promise.all([
		grantIds.length ? db().select({ grantId: capabilityGrantFunctions.grantId, function: capabilityFunctions }).from(capabilityGrantFunctions).innerJoin(capabilityFunctions, eq(capabilityGrantFunctions.capabilityFunctionId, capabilityFunctions.id)).where(inArray(capabilityGrantFunctions.grantId, grantIds)) : [],
		grantIds.length ? db().select({ grantId: capabilityAuditRecords.grantId, action: capabilityAuditRecords.action, createdAt: capabilityAuditRecords.createdAt }).from(capabilityAuditRecords).where(inArray(capabilityAuditRecords.grantId, grantIds)).orderBy(desc(capabilityAuditRecords.createdAt)) : [],
	]);
	const now = new Date();
	return rows.map(row => {
		const grantAudits = audits.filter(audit => audit.grantId === row.grant.id);
		const effectiveStatus = row.grant.status === "active" && row.grant.endsAt <= now ? "expired" : row.grant.status === "active" && row.grant.startsAt > now ? "scheduled" : row.grant.status;
		return { ...row, effectiveStatus, functions: functions.filter(item => item.grantId === row.grant.id).map(item => item.function), usageCount: grantAudits.filter(item => item.action === "capability.execution_authorized").length, lastActivity: grantAudits[0] || null };
	});
}

export async function markCapabilityDecisionNotificationRead(userId: number, notificationId: number) {
	if (!Number.isInteger(notificationId) || notificationId < 1) return;
	await db().update(capabilityDecisionNotifications).set({ readAt: new Date() }).where(and(eq(capabilityDecisionNotifications.id, notificationId), eq(capabilityDecisionNotifications.userId, userId)));
}

export async function markCapabilityDecisionNotificationsRead(userId: number, filter: CapabilityDecisionNotificationFilter = "all") {
	const filterCondition = capabilityDecisionNotificationFilterCondition(filter);
	await db().update(capabilityDecisionNotifications).set({ readAt: new Date() }).where(filterCondition ? and(eq(capabilityDecisionNotifications.userId, userId), isNull(capabilityDecisionNotifications.readAt), filterCondition) : and(eq(capabilityDecisionNotifications.userId, userId), isNull(capabilityDecisionNotifications.readAt)));
}

export async function getCapabilityGrantAlerts(userId: number, now = new Date(), horizonDays = 30) {
	const account = await getUserAccountContext(userId); if (!account) return [];
	const cutoff = new Date(now.getTime() + horizonDays * 86_400_000);
	const rows = await db().select({ grant: capabilityGrants, capability: capabilities }).from(capabilityGrants).innerJoin(capabilities, eq(capabilityGrants.capabilityId, capabilities.id)).where(eq(capabilityGrants.userAccountProfileId, account.profile.id)).orderBy(asc(capabilityGrants.endsAt));
	const grantIds = rows.map(row => row.grant.id);
	const selectedFunctions = grantIds.length ? await db().select({ grantId: capabilityGrantFunctions.grantId, capabilityFunction: capabilityFunctions }).from(capabilityGrantFunctions).innerJoin(capabilityFunctions, eq(capabilityGrantFunctions.capabilityFunctionId, capabilityFunctions.id)).where(inArray(capabilityGrantFunctions.grantId, grantIds)) : [];
	return rows.filter(row => row.grant.status === "active" && row.grant.startsAt <= now && row.grant.endsAt <= cutoff).map(row => {
		const remainingMs = row.grant.endsAt.getTime() - now.getTime(); const daysRemaining = Math.ceil(remainingMs / 86_400_000);
		const state = daysRemaining <= 0 ? "expired" as const : daysRemaining <= 7 ? "urgent" as const : "upcoming" as const;
		return { grant: row.grant, capability: row.capability, functions: selectedFunctions.filter(item => item.grantId === row.grant.id).map(item => item.capabilityFunction), daysRemaining, state };
	});
}

export async function saveCapabilityApplication(userId: number, input: CapabilityApplicationInput, applicationId?: number | null) {
	const account = await getUserAccountContext(userId); if (!account) throw new Error("Account profile not found");
	const capability = (await db().select().from(capabilities).where(and(eq(capabilities.id, input.capabilityId), eq(capabilities.active, true))).limit(1))[0];
	if (!capability) throw new Error("Choose an active capability from the catalog");
	const functionIds = normalizeCapabilityFunctionIds(input.functionIds); if (!functionIds.length) throw new Error("Select at least one requested function");
	const requestedFunctions = await db().select().from(capabilityFunctions).where(and(eq(capabilityFunctions.capabilityId, capability.id), eq(capabilityFunctions.active, true), inArray(capabilityFunctions.id, functionIds)));
	if (requestedFunctions.length !== functionIds.length) throw new Error("Select only active functions from the chosen capability");
	const mandatoryFunctions = await db().select().from(capabilityFunctions).where(and(eq(capabilityFunctions.capabilityId, capability.id), eq(capabilityFunctions.active, true), eq(capabilityFunctions.isMandatory, true)));
	const selectedCodes = new Set(requestedFunctions.map(item => item.code));
	if (mandatoryFunctions.some(item => !functionIds.includes(item.id))) throw new Error("Include every required function for this capability");
	const missingDependency = requestedFunctions.flatMap(item => item.dependencyCodes || []).find(code => !selectedCodes.has(code)); if (missingDependency) throw new Error(`Select required dependency ${missingDependency} before saving this application`);
	const justification = input.justification.trim().slice(0, 4000); if (justification.length < 20) throw new Error("Add at least 20 characters explaining the requested capability");
	const scope = capabilityScopeValues(input); const dates = capabilityDateRange(input.startsAt, input.endsAt);
	const values = { capabilityId: capability.id, justification, requestedScopeType: scope.scopeType, requestedState: scope.state, requestedDistrict: scope.district, requestedCity: scope.city, requestedZone: scope.zone, requestedWard: scope.ward, requestedStartsAt: dates.startsAt, requestedEndsAt: dates.endsAt, applicantNote: normalizedCapabilityText(input.applicantNote, 2000), roleSpecificData: normalizeCapabilityApplicationRoleSpecificData(capability.code, input.roleSpecificData) };
	if (applicationId) {
		return db().transaction(async tx => {
			const before = (await tx.select().from(capabilityApplications).where(and(eq(capabilityApplications.id, applicationId), eq(capabilityApplications.userAccountProfileId, account.profile.id))).limit(1))[0];
			if (!before || !["draft", "changes_requested"].includes(before.status)) throw new Error("Only drafts or returned capability applications can be edited");
			await tx.update(capabilityApplications).set(values).where(eq(capabilityApplications.id, applicationId));
			await tx.delete(capabilityApplicationFunctions).where(eq(capabilityApplicationFunctions.applicationId, applicationId));
			await tx.insert(capabilityApplicationFunctions).values(functionIds.map(capabilityFunctionId => ({ applicationId, capabilityFunctionId })));
			const after = (await tx.select().from(capabilityApplications).where(eq(capabilityApplications.id, applicationId)).limit(1))[0]; if (!after) throw new Error("Capability application update failed");
			await recordCapabilityAudit(userId, "capability.application_updated", { applicationId, beforeState: before, afterState: after }, tx); return after;
		});
	}
	return db().transaction(async tx => {
		const inserted = await tx.insert(capabilityApplications).values({ userAccountProfileId: account.profile.id, ...values, status: "draft" }); const id = Number(inserted[0].insertId);
		await tx.insert(capabilityApplicationFunctions).values(functionIds.map(capabilityFunctionId => ({ applicationId: id, capabilityFunctionId })));
		const created = (await tx.select().from(capabilityApplications).where(eq(capabilityApplications.id, id)).limit(1))[0]; if (!created) throw new Error("Capability application could not be created");
		await recordCapabilityAudit(userId, "capability.application_drafted", { applicationId: id, afterState: created }, tx); return created;
	});
}

export async function addCapabilityApplicationDocument(userId: number, applicationId: number, input: { storageKey: string; fileName: string; contentType: string; sizeBytes: number }) {
	const account = await getUserAccountContext(userId); if (!account) throw new Error("Account profile not found");
	if (!Number.isInteger(applicationId) || applicationId < 1) throw new Error("Invalid capability application");
	const application = (await db().select().from(capabilityApplications).where(and(eq(capabilityApplications.id, applicationId), eq(capabilityApplications.userAccountProfileId, account.profile.id))).limit(1))[0];
	if (!application || !["draft", "changes_requested"].includes(application.status)) throw new Error("Supporting documents can only be added to your draft or returned application");
	const storageKey = input.storageKey.trim().replace(/^\/+/, ""); const fileName = input.fileName.trim().slice(0, 180); const contentType = input.contentType.trim().slice(0, 120);
	if (!storageKey.startsWith(`capability-applications/${userId}/`) || !fileName || !["application/pdf", "image/jpeg", "image/png"].includes(contentType) || !Number.isInteger(input.sizeBytes) || input.sizeBytes < 1 || input.sizeBytes > 8 * 1024 * 1024) throw new Error("The supporting document reference is invalid");
	const existing = await db().select({ count: sql<number>`count(*)` }).from(capabilityApplicationDocuments).where(eq(capabilityApplicationDocuments.applicationId, applicationId));
	if (Number(existing[0]?.count || 0) >= 3) throw new Error("You can attach up to three supporting documents");
	const result = await db().insert(capabilityApplicationDocuments).values({ applicationId, storageKey, fileName, contentType, sizeBytes: input.sizeBytes, createdByUserId: userId });
	const document = (await db().select().from(capabilityApplicationDocuments).where(eq(capabilityApplicationDocuments.id, Number(result[0].insertId))).limit(1))[0];
	if (!document) throw new Error("Supporting document could not be saved");
	await recordCapabilityAudit(userId, "capability.application_document_attached", { applicationId, afterState: { documentId: document.id, fileName: document.fileName, contentType: document.contentType, sizeBytes: document.sizeBytes } });
	return document;
}

export async function submitCapabilityApplication(userId: number, applicationId: number, note?: string | null) {
	const account = await getUserAccountContext(userId); if (!account) throw new Error("Account profile not found");
	return db().transaction(async tx => {
		const before = (await tx.select().from(capabilityApplications).where(and(eq(capabilityApplications.id, applicationId), eq(capabilityApplications.userAccountProfileId, account.profile.id))).limit(1))[0];
		if (!before || !["draft", "changes_requested"].includes(before.status)) throw new Error("Only drafts or returned capability applications can be submitted");
		const selected = await tx.select({ capabilityFunction: capabilityFunctions }).from(capabilityApplicationFunctions).innerJoin(capabilityFunctions, eq(capabilityApplicationFunctions.capabilityFunctionId, capabilityFunctions.id)).where(eq(capabilityApplicationFunctions.applicationId, applicationId)); if (!selected.length) throw new Error("Select at least one requested function before submitting");
		const mandatory = await tx.select().from(capabilityFunctions).where(and(eq(capabilityFunctions.capabilityId, before.capabilityId), eq(capabilityFunctions.active, true), eq(capabilityFunctions.isMandatory, true)));
		const selectedIds = new Set(selected.map(item => item.capabilityFunction.id)); if (mandatory.some(item => !selectedIds.has(item.id))) throw new Error("Include every required function before submitting");
		await tx.update(capabilityApplications).set({ status: "submitted", applicantNote: normalizedCapabilityText(note, 2000) || before.applicantNote, submittedAt: new Date(), adminNote: null, reviewedByAdminId: null, reviewedAt: null }).where(eq(capabilityApplications.id, applicationId));
		const after = (await tx.select().from(capabilityApplications).where(eq(capabilityApplications.id, applicationId)).limit(1))[0]; if (!after) throw new Error("Capability application submission failed");
		await recordCapabilityAudit(userId, "capability.application_submitted", { applicationId, beforeState: before, afterState: after }, tx); return after;
	});
}

export async function adminReviewCapabilityApplication(adminId: number, input: { applicationId: number; decision: "approved" | "changes_requested" | "rejected"; note: string; selectedFunctionIds: number[]; scope: CapabilityScopeInput; startsAt?: Date | null; endsAt?: Date | null }) {
	const note = input.note.trim().slice(0, 2000); if ((input.decision === "changes_requested" || input.decision === "rejected") && note.length < 4) throw new Error("Provide a clear reason or requested addition");
	return db().transaction(async tx => {
		const before = (await tx.select().from(capabilityApplications).where(eq(capabilityApplications.id, input.applicationId)).limit(1))[0];
		if (!before || before.status !== "submitted") throw new Error("Only submitted capability applications can be reviewed");
		const recipient = (await tx.select({ userId: userAccountProfiles.userId }).from(userAccountProfiles).where(eq(userAccountProfiles.id, before.userAccountProfileId)).limit(1))[0]; if (!recipient) throw new Error("Capability applicant account is unavailable");
		if (input.decision !== "approved") {
			await tx.update(capabilityApplications).set({ status: input.decision, adminNote: note, reviewedByAdminId: adminId, reviewedAt: new Date() }).where(eq(capabilityApplications.id, before.id));
			const after = (await tx.select().from(capabilityApplications).where(eq(capabilityApplications.id, before.id)).limit(1))[0]; if (!after) throw new Error("Capability application review failed");
			await recordCapabilityAudit(adminId, `capability.application_${input.decision}`, { applicationId: before.id, beforeState: before, afterState: after }, tx); await recordAdminAudit(adminId, `capability.application_${input.decision}`, "capability_application", before.id, before, after, tx); await recordCapabilityDecisionNotification({ userId: recipient.userId, applicationId: before.id, kind: `application_${input.decision}`, title: input.decision === "changes_requested" ? "Capability application returned" : "Capability application rejected", body: note, actionUrl: `/dashboard/capabilities?edit=${before.id}` }, tx); return { application: after, grant: null };
		}
		const scope = capabilityScopeValues(input.scope); const dates = capabilityDateRange(input.startsAt, input.endsAt); const requested = await tx.select({ capabilityFunction: capabilityFunctions }).from(capabilityApplicationFunctions).innerJoin(capabilityFunctions, eq(capabilityApplicationFunctions.capabilityFunctionId, capabilityFunctions.id)).where(eq(capabilityApplicationFunctions.applicationId, before.id));
		const requestedIds = new Set(requested.map(item => item.capabilityFunction.id)); const selectedFunctionIds = normalizeCapabilityFunctionIds(input.selectedFunctionIds); if (!selectedFunctionIds.length || selectedFunctionIds.some(item => !requestedIds.has(item))) throw new Error("Grant only functions selected in the submitted application");
		if (requested.some(item => item.capabilityFunction.isMandatory && !selectedFunctionIds.includes(item.capabilityFunction.id))) throw new Error("Every required requested function must be included in the grant");
		const selectedCodes = new Set(requested.filter(item => selectedFunctionIds.includes(item.capabilityFunction.id)).map(item => item.capabilityFunction.code)); const missingDependency = requested.filter(item => selectedFunctionIds.includes(item.capabilityFunction.id)).flatMap(item => item.capabilityFunction.dependencyCodes || []).find(code => !selectedCodes.has(code)); if (missingDependency) throw new Error(`Grant dependency ${missingDependency} must also be selected`);
		const grantInsert = await tx.insert(capabilityGrants).values({ userAccountProfileId: before.userAccountProfileId, capabilityId: before.capabilityId, applicationId: before.id, status: "active", scopeType: scope.scopeType, scopeState: scope.state, scopeDistrict: scope.district, scopeCity: scope.city, scopeZone: scope.zone, scopeWard: scope.ward, startsAt: dates.startsAt, endsAt: dates.endsAt, administrativeReason: note || "Approved capability application", grantedByAdminId: adminId }); const grantId = Number(grantInsert[0].insertId);
		await tx.insert(capabilityGrantFunctions).values(selectedFunctionIds.map(capabilityFunctionId => ({ grantId, capabilityFunctionId })));
		await tx.update(capabilityApplications).set({ status: "approved", adminNote: note || "Approved with a time-bound scoped grant", reviewedByAdminId: adminId, reviewedAt: new Date() }).where(eq(capabilityApplications.id, before.id));
		const [application, grant] = await Promise.all([tx.select().from(capabilityApplications).where(eq(capabilityApplications.id, before.id)).limit(1), tx.select().from(capabilityGrants).where(eq(capabilityGrants.id, grantId)).limit(1)]); if (!application[0] || !grant[0]) throw new Error("Capability grant creation failed");
		await recordCapabilityAudit(adminId, "capability.application_approved", { applicationId: before.id, grantId, beforeState: before, afterState: { application: application[0], grant: grant[0] } }, tx); await recordAdminAudit(adminId, "capability.grant_created", "capability_grant", grantId, null, grant[0], tx); await recordCapabilityDecisionNotification({ userId: recipient.userId, applicationId: before.id, grantId, kind: "application_approved", title: "Capability application approved", body: `${selectedFunctionIds.length} selected function${selectedFunctionIds.length === 1 ? " was" : "s were"} granted. ${note || "Review the time-bound scope and validity in your grants."}`, actionUrl: "/dashboard/capabilities#my-time-bound-grants" }, tx); return { application: application[0], grant: grant[0] };
	});
}

export async function adminUpdateCapabilityGrant(adminId: number, grantId: number, status: "active" | "suspended" | "revoked" | "expired", note: string) {
	const reason = note.trim().slice(0, 2000); if (reason.length < 4) throw new Error("Provide an administrative reason for this grant status change");
	return db().transaction(async tx => {
		const before = (await tx.select().from(capabilityGrants).where(eq(capabilityGrants.id, grantId)).limit(1))[0]; if (!before) throw new Error("Capability grant not found");
		const recipient = (await tx.select({ userId: userAccountProfiles.userId }).from(userAccountProfiles).where(eq(userAccountProfiles.id, before.userAccountProfileId)).limit(1))[0]; if (!recipient) throw new Error("Capability grant recipient is unavailable");
		if (status === "active" && (before.startsAt > new Date() || before.endsAt <= new Date())) throw new Error("Only a currently time-valid grant can be marked active");
		await tx.update(capabilityGrants).set({ status, administrativeReason: reason, decidedAt: new Date(), grantedByAdminId: adminId }).where(eq(capabilityGrants.id, grantId));
		const after = (await tx.select().from(capabilityGrants).where(eq(capabilityGrants.id, grantId)).limit(1))[0]; if (!after) throw new Error("Capability grant update failed");
		await recordCapabilityAudit(adminId, `capability.grant_${status}`, { grantId, beforeState: before, afterState: after }, tx); await recordAdminAudit(adminId, `capability.grant_${status}`, "capability_grant", grantId, before, after, tx); await recordCapabilityDecisionNotification({ userId: recipient.userId, grantId, kind: `grant_${status}`, title: grantDecisionTitle(status), body: reason, actionUrl: "/dashboard/capabilities#my-time-bound-grants" }, tx); return after;
	});
}

export async function adminExpireDueCapabilityGrants(adminId: number, reason: string, now = new Date()) {
	const administrativeReason = reason.trim().slice(0, 2000); if (administrativeReason.length < 4) throw new Error("Provide an administrative reason for the expiry operation");
	return db().transaction(async tx => {
		const due = await tx.select().from(capabilityGrants).where(and(eq(capabilityGrants.status, "active"), lt(capabilityGrants.endsAt, now)));
		for (const before of due) {
			const recipient = (await tx.select({ userId: userAccountProfiles.userId }).from(userAccountProfiles).where(eq(userAccountProfiles.id, before.userAccountProfileId)).limit(1))[0]; if (!recipient) throw new Error("Capability grant recipient is unavailable");
			await tx.update(capabilityGrants).set({ status: "expired", administrativeReason, decidedAt: now, grantedByAdminId: adminId }).where(eq(capabilityGrants.id, before.id));
			const after = (await tx.select().from(capabilityGrants).where(eq(capabilityGrants.id, before.id)).limit(1))[0]; if (!after) throw new Error("Capability grant expiry update failed");
			await recordCapabilityAudit(adminId, "capability.grant_expired_batch", { grantId: before.id, beforeState: before, afterState: after }, tx); await recordAdminAudit(adminId, "capability.grant_expired_batch", "capability_grant", before.id, before, after, tx); await recordCapabilityDecisionNotification({ userId: recipient.userId, grantId: before.id, kind: "grant_expired_batch", title: "Capability grant expired", body: administrativeReason, actionUrl: "/dashboard/capabilities#my-time-bound-grants" }, tx);
		}
		return due.length;
	});
}

export async function adminCreateLocalAuthorityMigrationGrant(adminId: number, input: { userId: number; functionIds: number[]; scope: CapabilityScopeInput; startsAt?: Date | null; endsAt?: Date | null; reason: string }) {
	const reason = input.reason.trim().slice(0, 2000); if (reason.length < 4) throw new Error("Provide an administrative reason for the Local Authority migration grant");
	const user = await findUserById(input.userId); if (!user || user.role !== "mcd") throw new Error("Choose a current Local Authority account for this staged migration grant");
	const account = await getUserAccountContext(user.id); if (!account) throw new Error("Local Authority account profile is unavailable");
	const capability = (await db().select().from(capabilities).where(and(eq(capabilities.code, "LOCAL_AUTHORITY"), eq(capabilities.active, true))).limit(1))[0]; if (!capability) throw new Error("The Local Authority capability catalog record is unavailable");
	const functionIds = normalizeCapabilityFunctionIds(input.functionIds); if (!functionIds.length) throw new Error("Select at least one Local Authority function");
	const functions = await db().select().from(capabilityFunctions).where(and(eq(capabilityFunctions.capabilityId, capability.id), eq(capabilityFunctions.active, true), inArray(capabilityFunctions.id, functionIds)));
	if (functions.length !== functionIds.length) throw new Error("Select only active Local Authority functions");
	const mandatory = await db().select().from(capabilityFunctions).where(and(eq(capabilityFunctions.capabilityId, capability.id), eq(capabilityFunctions.active, true), eq(capabilityFunctions.isMandatory, true)));
	if (mandatory.some(item => !functionIds.includes(item.id))) throw new Error("Include every required Local Authority function");
	const selectedCodes = new Set(functions.map(item => item.code)); const missingDependency = functions.flatMap(item => item.dependencyCodes || []).find(code => !selectedCodes.has(code)); if (missingDependency) throw new Error(`Include Local Authority dependency ${missingDependency}`);
	const scope = capabilityScopeValues(input.scope); const dates = capabilityDateRange(input.startsAt, input.endsAt);
	return db().transaction(async tx => {
		const inserted = await tx.insert(capabilityGrants).values({ userAccountProfileId: account.profile.id, capabilityId: capability.id, status: "active", scopeType: scope.scopeType, scopeState: scope.state, scopeDistrict: scope.district, scopeCity: scope.city, scopeZone: scope.zone, scopeWard: scope.ward, startsAt: dates.startsAt, endsAt: dates.endsAt, administrativeReason: reason, grantedByAdminId: adminId }); const grantId = Number(inserted[0].insertId);
		await tx.insert(capabilityGrantFunctions).values(functionIds.map(capabilityFunctionId => ({ grantId, capabilityFunctionId })));
		const grant = (await tx.select().from(capabilityGrants).where(eq(capabilityGrants.id, grantId)).limit(1))[0]; if (!grant) throw new Error("Local Authority migration grant creation failed");
		await recordCapabilityAudit(adminId, "capability.grant_migration_created", { grantId, afterState: { grant, targetUserId: user.id, functionCodes: functions.map(item => item.code), rollout: "local_authority_event_review" } }, tx); await recordAdminAudit(adminId, "capability.grant_migration_created", "capability_grant", grantId, null, { grant, targetUserId: user.id, functionCodes: functions.map(item => item.code) }, tx); await recordCapabilityDecisionNotification({ userId: user.id, grantId, kind: "grant_migration_created", title: "Local Authority capability grant issued", body: reason, actionUrl: "/dashboard/capabilities#my-time-bound-grants" }, tx); return grant;
	});
}

export async function adminCreateCsrMigrationGrant(adminId: number, input: { userId: number; functionIds: number[]; scope: CapabilityScopeInput; startsAt?: Date | null; endsAt?: Date | null; reason: string }) {
	const reason = input.reason.trim().slice(0, 2000); if (reason.length < 4) throw new Error("Provide an administrative reason for the CSR migration grant");
	const user = await findUserById(input.userId); if (!user || user.role !== "csr") throw new Error("Choose a current CSR sponsor account for this staged migration grant");
	const account = await getUserAccountContext(user.id); if (!account) throw new Error("CSR account profile is unavailable");
	const capability = (await db().select().from(capabilities).where(and(eq(capabilities.code, "CSR_SPONSORSHIP"), eq(capabilities.active, true))).limit(1))[0]; if (!capability) throw new Error("The CSR capability catalog record is unavailable");
	const functionIds = normalizeCapabilityFunctionIds(input.functionIds); if (!functionIds.length) throw new Error("Select at least one CSR function");
	const functions = await db().select().from(capabilityFunctions).where(and(eq(capabilityFunctions.capabilityId, capability.id), eq(capabilityFunctions.active, true), inArray(capabilityFunctions.id, functionIds)));
	if (functions.length !== functionIds.length) throw new Error("Select only active CSR functions");
	const mandatory = await db().select().from(capabilityFunctions).where(and(eq(capabilityFunctions.capabilityId, capability.id), eq(capabilityFunctions.active, true), eq(capabilityFunctions.isMandatory, true)));
	if (mandatory.some(item => !functionIds.includes(item.id))) throw new Error("Include every required CSR function");
	const selectedCodes = new Set(functions.map(item => item.code)); const missingDependency = functions.flatMap(item => item.dependencyCodes || []).find(code => !selectedCodes.has(code)); if (missingDependency) throw new Error(`Include CSR dependency ${missingDependency}`);
	const scope = capabilityScopeValues(input.scope); const dates = capabilityDateRange(input.startsAt, input.endsAt);
	return db().transaction(async tx => {
		const inserted = await tx.insert(capabilityGrants).values({ userAccountProfileId: account.profile.id, capabilityId: capability.id, status: "active", scopeType: scope.scopeType, scopeState: scope.state, scopeDistrict: scope.district, scopeCity: scope.city, scopeZone: scope.zone, scopeWard: scope.ward, startsAt: dates.startsAt, endsAt: dates.endsAt, administrativeReason: reason, grantedByAdminId: adminId }); const grantId = Number(inserted[0].insertId);
		await tx.insert(capabilityGrantFunctions).values(functionIds.map(capabilityFunctionId => ({ grantId, capabilityFunctionId })));
		const grant = (await tx.select().from(capabilityGrants).where(eq(capabilityGrants.id, grantId)).limit(1))[0]; if (!grant) throw new Error("CSR migration grant creation failed");
		await recordCapabilityAudit(adminId, "capability.grant_migration_created", { grantId, afterState: { grant, targetUserId: user.id, functionCodes: functions.map(item => item.code), rollout: "csr_brief_submission_and_impact_export" } }, tx); await recordAdminAudit(adminId, "capability.grant_migration_created", "capability_grant", grantId, null, { grant, targetUserId: user.id, functionCodes: functions.map(item => item.code) }, tx); await recordCapabilityDecisionNotification({ userId: user.id, grantId, kind: "grant_migration_created", title: "CSR capability grant issued", body: reason, actionUrl: "/dashboard/capabilities#my-time-bound-grants" }, tx); return grant;
	});
}

export type AdminCapabilityReviewFilters = { status?: string | null; capability?: string | null; applicant?: string | null; geography?: string | null; requestedFrom?: Date | null; requestedTo?: Date | null };

function normalizeAdminCapabilityReviewFilters(input: AdminCapabilityReviewFilters = {}) {
	const status = ["draft", "submitted", "changes_requested", "approved", "rejected"].includes(input.status || "") ? input.status! : null;
	const capability = /^[A-Z0-9_]{2,64}$/.test(input.capability || "") ? input.capability! : null;
	const applicant = normalizedCapabilityText(input.applicant, 120);
	const geography = normalizedCapabilityText(input.geography, 100);
	const requestedFrom = input.requestedFrom && !Number.isNaN(input.requestedFrom.getTime()) ? input.requestedFrom : null;
	const requestedTo = input.requestedTo && !Number.isNaN(input.requestedTo.getTime()) ? input.requestedTo : null;
	if (requestedFrom && requestedTo && requestedFrom > requestedTo) throw new Error("Requested-from date cannot be after requested-to date");
	return { status, capability, applicant, geography, requestedFrom, requestedTo };
}

export async function getAdminCapabilityGovernanceData(filters: AdminCapabilityReviewFilters = {}) {
	const reviewFilters = normalizeAdminCapabilityReviewFilters(filters);
	const applicationWhere = and(
		reviewFilters.status ? eq(capabilityApplications.status, reviewFilters.status as "draft" | "submitted" | "changes_requested" | "approved" | "rejected") : undefined,
		reviewFilters.capability ? eq(capabilities.code, reviewFilters.capability) : undefined,
		reviewFilters.applicant ? or(like(users.name, `%${reviewFilters.applicant}%`), like(users.email, `%${reviewFilters.applicant}%`), like(users.publicId, `%${reviewFilters.applicant}%`)) : undefined,
		reviewFilters.geography ? or(like(capabilityApplications.requestedState, `%${reviewFilters.geography}%`), like(capabilityApplications.requestedDistrict, `%${reviewFilters.geography}%`), like(capabilityApplications.requestedCity, `%${reviewFilters.geography}%`), like(capabilityApplications.requestedZone, `%${reviewFilters.geography}%`), like(capabilityApplications.requestedWard, `%${reviewFilters.geography}%`)) : undefined,
		reviewFilters.requestedFrom ? gte(capabilityApplications.requestedStartsAt, reviewFilters.requestedFrom) : undefined,
		reviewFilters.requestedTo ? lte(capabilityApplications.requestedEndsAt, reviewFilters.requestedTo) : undefined,
	);
	const [catalog, applicationRows, grantRows, audits, localAuthorityAccounts, csrAccounts] = await Promise.all([
		getCapabilityCatalog({ includeInactive: true }),
		db().select({ application: capabilityApplications, capability: capabilities, profile: userAccountProfiles, user: users }).from(capabilityApplications).innerJoin(capabilities, eq(capabilityApplications.capabilityId, capabilities.id)).innerJoin(userAccountProfiles, eq(capabilityApplications.userAccountProfileId, userAccountProfiles.id)).innerJoin(users, eq(userAccountProfiles.userId, users.id)).where(applicationWhere).orderBy(desc(capabilityApplications.updatedAt)),
			db().select({ grant: capabilityGrants, capability: capabilities, profile: userAccountProfiles, user: users }).from(capabilityGrants).innerJoin(capabilities, eq(capabilityGrants.capabilityId, capabilities.id)).innerJoin(userAccountProfiles, eq(capabilityGrants.userAccountProfileId, userAccountProfiles.id)).innerJoin(users, eq(userAccountProfiles.userId, users.id)).orderBy(desc(capabilityGrants.updatedAt)),
		db().select().from(capabilityAuditRecords).orderBy(desc(capabilityAuditRecords.createdAt)).limit(200),
		db().select({ user: users, profile: userAccountProfiles }).from(userAccountProfiles).innerJoin(users, eq(userAccountProfiles.userId, users.id)).where(eq(users.role, "mcd")).orderBy(asc(users.name)),
		db().select({ user: users, profile: userAccountProfiles }).from(userAccountProfiles).innerJoin(users, eq(userAccountProfiles.userId, users.id)).where(eq(users.role, "csr")).orderBy(asc(users.name)),
	]);
	const applicationIds = applicationRows.map(row => row.application.id); const grantIds = grantRows.map(row => row.grant.id);
	const [applicationFunctions, grantFunctions, applicationDocuments] = await Promise.all([
		applicationIds.length ? db().select({ applicationId: capabilityApplicationFunctions.applicationId, capabilityFunction: capabilityFunctions }).from(capabilityApplicationFunctions).innerJoin(capabilityFunctions, eq(capabilityApplicationFunctions.capabilityFunctionId, capabilityFunctions.id)).where(inArray(capabilityApplicationFunctions.applicationId, applicationIds)) : [],
		grantIds.length ? db().select({ grantId: capabilityGrantFunctions.grantId, capabilityFunction: capabilityFunctions }).from(capabilityGrantFunctions).innerJoin(capabilityFunctions, eq(capabilityGrantFunctions.capabilityFunctionId, capabilityFunctions.id)).where(inArray(capabilityGrantFunctions.grantId, grantIds)) : [],
		applicationIds.length ? db().select().from(capabilityApplicationDocuments).where(inArray(capabilityApplicationDocuments.applicationId, applicationIds)).orderBy(desc(capabilityApplicationDocuments.createdAt)) : [],
	]);
	return { catalog, applications: applicationRows.map(row => ({ ...row, functions: applicationFunctions.filter(item => item.applicationId === row.application.id).map(item => item.capabilityFunction), documents: applicationDocuments.filter(item => item.applicationId === row.application.id) })), grants: grantRows.map(row => ({ ...row, effectiveStatus: row.grant.status === "active" && row.grant.endsAt <= new Date() ? "expired" : row.grant.status === "active" && row.grant.startsAt > new Date() ? "scheduled" : row.grant.status, functions: grantFunctions.filter(item => item.grantId === row.grant.id).map(item => item.capabilityFunction) })), audits, localAuthorityAccounts, csrAccounts, reviewFilters, metrics: { activeCatalog: catalog.filter(item => item.capability.active).length, submitted: applicationRows.filter(item => item.application.status === "submitted").length, activeGrants: grantRows.filter(item => item.grant.status === "active" && item.grant.startsAt <= new Date() && item.grant.endsAt > new Date()).length, dueForExpiry: grantRows.filter(item => item.grant.status === "active" && item.grant.endsAt <= new Date()).length } };
}

export async function authorizeCapabilityExecution(userId: number, input: { capabilityCode: string; functionCode: string; resourceScope?: CapabilityResourceScope; enforce?: boolean; compatibilityReason?: string }) {
	if (!(input.enforce ?? isCapabilityAuthorizationEnforced())) return { allowed: true, mode: "legacy_compatibility" as const, reason: input.compatibilityReason || "Capability rollout is disabled; retained legacy authorization remains authoritative.", grantId: null };
	const account = await getUserAccountContext(userId);
	if (!account) return { allowed: false, mode: "grant_enforced" as const, reason: "Account profile is unavailable for grant authorization.", grantId: null };
	const rows = await db().select({ grant: capabilityGrants, capabilityFunction: capabilityFunctions }).from(capabilityGrants).innerJoin(capabilityGrantFunctions, eq(capabilityGrantFunctions.grantId, capabilityGrants.id)).innerJoin(capabilityFunctions, eq(capabilityGrantFunctions.capabilityFunctionId, capabilityFunctions.id)).innerJoin(capabilities, eq(capabilityGrants.capabilityId, capabilities.id)).where(and(eq(capabilityGrants.userAccountProfileId, account.profile.id), eq(capabilities.code, input.capabilityCode), eq(capabilityFunctions.active, true)));
	const grouped = new Map<number, { grantId: number; status: "active" | "suspended" | "revoked" | "expired"; scopeType: CapabilityScopeType; state: string | null; district: string | null; city: string | null; zone: string | null; ward: string | null; startsAt: Date; endsAt: Date; functionCodes: string[] }>();
	for (const row of rows) {
		const existing = grouped.get(row.grant.id) || { grantId: row.grant.id, status: row.grant.status, scopeType: row.grant.scopeType, state: row.grant.scopeState, district: row.grant.scopeDistrict, city: row.grant.scopeCity, zone: row.grant.scopeZone, ward: row.grant.scopeWard, startsAt: row.grant.startsAt, endsAt: row.grant.endsAt, functionCodes: [] };
		existing.functionCodes.push(row.capabilityFunction.code); grouped.set(row.grant.id, existing);
	}
	return evaluateCapabilityAuthorization({ functionCode: input.functionCode, resourceScope: input.resourceScope || {}, candidates: [...grouped.values()] });
}

export async function recordCapabilityExecutionAuthorization(actorUserId: number, input: { grantId: number | null; capabilityCode: string; functionCode: string; context: Record<string, unknown> }) {
	if (!input.grantId) return;
	await recordCapabilityAudit(actorUserId, "capability.execution_authorized", { grantId: input.grantId, afterState: { capabilityCode: input.capabilityCode, functionCode: input.functionCode, ...input.context } });
}

export async function createPasswordUser(input: { name: string; email: string; passwordHash: string }) {
  const openId = `account-${crypto.randomUUID()}`;
  const result = await db().insert(users).values({
    publicId: createPublicUserId(),
    openId,
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    loginMethod: "password",
    role: "user",
    lastSignedIn: new Date(),
  });
  const user = await findUserById(Number(result[0].insertId));
  if (user) await ensureUserAccountProfile(user.id);
  return user;
}

export async function recordUserSignIn(userId: number) {
  const user = await findUserById(userId);
  if (!user) return undefined;
  await db().update(users).set({ publicId: user.publicId || createPublicUserId(), lastSignedIn: new Date() }).where(eq(users.id, userId));
  return findUserById(userId);
}

export async function updateUserProfile(userId: number, input: { name: string; avatarUrl?: string }) {
  const name = input.name.trim().slice(0, 100);
  if (name.length < 2) throw new Error("Enter a name with at least two characters");
  const avatarUrl = input.avatarUrl?.trim() || null;
  if (avatarUrl && !isProfileAvatarUrl(avatarUrl, userId)) throw new Error("Use the profile image upload control to choose an avatar");
  await db().update(users).set({ name, avatarUrl }).where(eq(users.id, userId));
  return findUserById(userId);
}

export async function listPublicEvents(input: { search?: string; city?: string; category?: string; filter?: string; sort?: string; accessible?: string }) {
  const conditions = [eq(events.status, "live"), eq(events.visibility, "public"), or(eq(events.moderationStatus, "approved"), eq(events.moderationStatus, "draft"))!];
  if (input.search) {
    const term = `%${input.search.trim()}%`;
    conditions.push(or(like(events.title, term), like(events.displayName, term), like(events.city, term))!);
  }
  if (input.city && input.city !== "All cities") conditions.push(eq(events.city, input.city));
  if (input.category && input.category !== "all") conditions.push(eq(categories.slug, input.category));
  if (input.accessible === "1") conditions.push(eq(events.venueIsAccessible, true));
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  if (input.filter === "Today") conditions.push(sql`${events.startsAt} >= ${now} AND ${events.startsAt} < ${new Date(now.getTime() + day)}`);
  if (input.filter === "Tomorrow") conditions.push(sql`${events.startsAt} >= ${new Date(now.getTime() + day)} AND ${events.startsAt} < ${new Date(now.getTime() + 2 * day)}`);
  if (input.filter === "This Week" || input.filter === "This Weekend") conditions.push(sql`${events.startsAt} >= ${now} AND ${events.startsAt} < ${new Date(now.getTime() + 7 * day)}`);
  if (input.filter === "This Month") conditions.push(sql`${events.startsAt} >= ${now} AND ${events.startsAt} < ${new Date(now.getTime() + 31 * day)}`);
  if (input.filter === "Free") conditions.push(sql`EXISTS (SELECT 1 FROM tickets WHERE tickets.eventId = ${events.id} AND tickets.pricePaise = 0)`);
  if (input.filter === "Paid") conditions.push(sql`EXISTS (SELECT 1 FROM tickets WHERE tickets.eventId = ${events.id} AND tickets.pricePaise > 0)`);
  const sort = normalizeEventSort(input.sort);
  const order = sort === "latest" ? desc(events.startsAt) : sort === "recent" ? desc(events.createdAt) : asc(events.startsAt);
  return withDatabaseReadRetry(async () => {
    const rows = await db()
      .select({ event: events, category: categories })
      .from(events)
      .leftJoin(categories, eq(events.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(order);
    return withRegistrationCapacity(rows);
  });
}

export async function getPublicEvent(slug: string) {
  const results = await db()
    .select({ event: events, category: categories })
    .from(events)
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .where(and(eq(events.slug, slug), eq(events.status, "live"), or(eq(events.moderationStatus, "approved"), eq(events.moderationStatus, "draft"))))
    .limit(1);
  if (!results[0]) return undefined;
  const [eventTickets, settings] = await Promise.all([db().select().from(tickets).where(eq(tickets.eventId, results[0].event.id)), getPlatformSettings()]);
  return { ...results[0], tickets: eventTickets, gatewayFeePercent: settings.gatewayFeePercent };
}

export async function getActiveRegistrationForEvent(eventId: number, attendeeId: number) {
  return (await db().select().from(registrations).where(and(eq(registrations.eventId, eventId), eq(registrations.attendeeId, attendeeId), or(eq(registrations.status, "confirmed"), eq(registrations.status, "checked_in")))).orderBy(desc(registrations.createdAt)).limit(1))[0];
}

export async function createDraftEvent(organizer: { id: number; publicId: string }) {
  const stamp = Date.now();
  const result = await db().insert(events).values({
    organizerId: organizer.id,
    organizerPublicId: organizer.publicId,
    publicId: createPublicEventId(),
    title: "Untitled event",
    displayName: "Untitled event",
    slug: `draft-event-${stamp}`,
  });
  return Number(result[0].insertId);
}

export async function getOrganizerEvents(organizerId: number, status: "live" | "completed" | "draft" | "submitted" | "changes" | "frozen" | "suspended" | "deleted") {
  const conditions = [eq(events.organizerId, organizerId)];
  if (status === "live") conditions.push(eq(events.status, "live"), or(eq(events.moderationStatus, "approved"), eq(events.moderationStatus, "draft"))!);
  if (status === "completed") conditions.push(eq(events.status, "completed"));
  if (status === "draft") conditions.push(eq(events.status, "draft"), eq(events.moderationStatus, "draft"));
  if (status === "submitted") conditions.push(eq(events.moderationStatus, "submitted"));
  if (status === "changes") conditions.push(eq(events.moderationStatus, "rejected"));
  if (status === "frozen") conditions.push(eq(events.moderationStatus, "frozen"));
  if (status === "suspended") conditions.push(eq(events.moderationStatus, "suspended"));
  if (status === "deleted") conditions.push(eq(events.moderationStatus, "deleted"));
  const rows = await db()
    .select({ event: events, category: categories })
    .from(events)
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(events.updatedAt));
  return withRegistrationCapacity(rows);
}

async function withRegistrationCapacity<T extends { event: { id: number } }>(rows: T[]) {
  const eventIds = rows.map(row => row.event.id);
  if (!eventIds.length) return rows.map(row => ({ ...row, registration: { capacity: 0, registered: 0 } }));
  const totals = await db()
    .select({ eventId: tickets.eventId, capacity: sql<number>`coalesce(sum(${tickets.quantityLimit}), 0)`, registered: sql<number>`coalesce(sum(${tickets.quantitySold}), 0)` })
    .from(tickets)
    .where(inArray(tickets.eventId, eventIds))
    .groupBy(tickets.eventId);
  const values = new Map(totals.map(total => [total.eventId, { capacity: Number(total.capacity) || 0, registered: Number(total.registered) || 0 }]));
  return rows.map(row => ({ ...row, registration: values.get(row.event.id) || { capacity: 0, registered: 0 } }));
}

export async function getOrganizerEvent(eventId: number, organizerId: number) {
  const rows = await db().select().from(events).where(and(eq(events.id, eventId), eq(events.organizerId, organizerId))).limit(1);
  return rows[0];
}

export async function completeOrganizerEvent(eventId: number, organizerId: number) {
  const event = await getOrganizerEvent(eventId, organizerId);
  if (!event) throw new Error("Event not found");
  if (event.status !== "live") throw new Error("Only live events can be marked completed");
  if (!event.endsAt || event.endsAt > new Date()) throw new Error("You can mark an event completed after its end time");
  await db().update(events).set({ status: "completed" }).where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)));
  if (event.approvedVenueId) await notifyVenueAvailability(event.approvedVenueId, eventId, event.displayName);
  return getOrganizerEvent(eventId, organizerId);
}

async function notifyVenueAvailability(venueId: number, releasedEventId: number, releasedEventName: string) {
  const venue = (await db().select().from(approvedVenues).where(eq(approvedVenues.id, venueId)).limit(1))[0];
  if (!venue) return;
  const watchers = await db().select().from(venueAvailabilitySubscriptions).where(eq(venueAvailabilitySubscriptions.venueId, venueId));
  if (!watchers.length) return;
  await db().insert(venueAvailabilityNotifications).values(watchers.map(watcher => ({ organizerId: watcher.organizerId, venueId, releasedEventId, title: `${venue.venueName} is now available`, body: `The venue you were watching is available after “${releasedEventName}” was completed or released. You can select it in your event location step.` })));
  await db().delete(venueAvailabilitySubscriptions).where(eq(venueAvailabilitySubscriptions.venueId, venueId));
}

export async function subscribeOrganizerToVenueAvailability(organizerId: number, venueId: number, eventId: number | null) {
  const venue = await getApprovedVenue(venueId); if (!venue) throw new Error("Approved venue not found");
  if (!(await findActiveVenueConflict(eventId || 0, venueId))) throw new Error("This venue is already available");
  await db().insert(venueAvailabilitySubscriptions).values({ organizerId, venueId, eventId }).onDuplicateKeyUpdate({ set: { eventId } });
}

export async function getOrganizerVenueAvailabilityNotifications(organizerId: number) {
  return db().select({ notification: venueAvailabilityNotifications, venue: approvedVenues }).from(venueAvailabilityNotifications).leftJoin(approvedVenues, eq(venueAvailabilityNotifications.venueId, approvedVenues.id)).where(eq(venueAvailabilityNotifications.organizerId, organizerId)).orderBy(desc(venueAvailabilityNotifications.createdAt)).limit(30);
}

export async function markOrganizerVenueAvailabilityNotificationRead(organizerId: number, notificationId: number) {
  await db().update(venueAvailabilityNotifications).set({ readAt: new Date() }).where(and(eq(venueAvailabilityNotifications.id, notificationId), eq(venueAvailabilityNotifications.organizerId, organizerId)));
}

export type VenueApprovalRequestInput = { eventId?: number | null; zone: string; ward: string; location: string; venueName: string; city: string; address?: string | null; sector?: string | null; area?: string | null; latitudeE6: number; longitudeE6: number; setting: "indoor" | "outdoor"; capacity?: number | null; isAccessible: boolean; accessibilityNotes?: string | null; organizerNote?: string | null };

export async function getOrganizerVenueApprovalRequests(organizerId: number, eventId: number) {
  return db().select().from(venueApprovalRequests).where(and(eq(venueApprovalRequests.organizerId, organizerId), eq(venueApprovalRequests.eventId, eventId))).orderBy(desc(venueApprovalRequests.updatedAt)).limit(10);
}

export async function createOrganizerVenueApprovalRequest(organizerId: number, input: VenueApprovalRequestInput) {
  if (input.eventId && !(await getOrganizerEvent(input.eventId, organizerId))) throw new Error("Event not found");
  const existing = input.eventId ? (await db().select().from(venueApprovalRequests).where(and(eq(venueApprovalRequests.organizerId, organizerId), eq(venueApprovalRequests.eventId, input.eventId), eq(venueApprovalRequests.venueName, input.venueName), sql`${venueApprovalRequests.status} in ('pending', 'changes_requested')`)).limit(1))[0] : undefined;
  const values = { organizerId, eventId: input.eventId || null, zone: input.zone, ward: input.ward, location: input.location, venueName: input.venueName, city: input.city, address: input.address || null, sector: input.sector || null, area: input.area || null, latitudeE6: input.latitudeE6, longitudeE6: input.longitudeE6, setting: input.setting, capacity: input.capacity || null, isAccessible: input.isAccessible, accessibilityNotes: input.accessibilityNotes || null, organizerNote: input.organizerNote || null, status: "pending" as const, reviewNote: null, reviewedAt: null, reviewedByAdminId: null };
  if (existing) { await db().update(venueApprovalRequests).set(values).where(eq(venueApprovalRequests.id, existing.id)); return (await db().select().from(venueApprovalRequests).where(eq(venueApprovalRequests.id, existing.id)).limit(1))[0]; }
  const created = await db().insert(venueApprovalRequests).values(values); return (await db().select().from(venueApprovalRequests).where(eq(venueApprovalRequests.id, Number(created[0].insertId))).limit(1))[0];
}

export async function getWizard(eventId: number, organizerId: number) {
  const event = await getOrganizerEvent(eventId, organizerId);
  if (!event) return undefined;
  const [categoryList, ticketList, questionList, venueList, venuePresetList, venueConflicts, venueRequestList] = await Promise.all([
    getCategories(),
    db().select().from(tickets).where(eq(tickets.eventId, eventId)),
    db().select().from(customQuestions).where(eq(customQuestions.eventId, eventId)).orderBy(asc(customQuestions.position)),
    getApprovedVenues(),
    getOrganizerVenueFilterPresets(organizerId),
    getActiveVenueConflicts(eventId),
    getOrganizerVenueApprovalRequests(organizerId, eventId),
  ]);
  return { event, categories: categoryList, tickets: ticketList, questions: questionList, venues: venueList, venuePresets: venuePresetList, venueApprovalRequests: venueRequestList, venueConflicts: venueConflicts.filter((conflict): conflict is VenueBookingConflict & { venueId: number } => conflict.venueId !== null) };
}

export async function updateEvent(eventId: number, organizerId: number, values: Partial<typeof events.$inferInsert>) {
  const existing = await getOrganizerEvent(eventId, organizerId);
  if (!existing) throw new Error("Event not found");
  if (!canEditEventForModeration(existing.moderationStatus)) throw new Error("This event is under administrator review and cannot be edited until changes are requested");
  await db().update(events).set(values).where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)));
  return getOrganizerEvent(eventId, organizerId);
}

export async function submitEventForApproval(eventId: number, organizerId: number) {
  const event = await getOrganizerEvent(eventId, organizerId);
  if (!event) throw new Error("Event not found");
  if (!canSubmitForApproval(event.moderationStatus)) throw new Error("This event is already under review or not available for resubmission");
  await db().update(events).set({ status: "draft", moderationStatus: "submitted", submittedAt: new Date(), reviewedAt: null, reviewedByAdminId: null, moderationNote: null }).where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)));
  return getOrganizerEvent(eventId, organizerId);
}

export type OrganizerApprovalTimelineEntry = { status: ModerationStatus; label: string; occurredAt: Date; note?: string | null };

const approvalTimelineLabels: Record<ModerationStatus, string> = { draft: "Draft created", submitted: "Submitted for approval", approved: "Approved and published", rejected: "Changes requested", frozen: "Temporarily frozen", suspended: "Suspended", deleted: "Removed" };

function auditModerationStatus(action: string): ModerationStatus | undefined {
  const match = /(?:^event\.|^local_authority\.event\.)(approved|rejected|frozen|suspended|deleted)$/.exec(action);
  return match?.[1] as ModerationStatus | undefined;
}

function auditModerationNote(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>; const eventState = record.event && typeof record.event === "object" && !Array.isArray(record.event) ? record.event as Record<string, unknown> : record;
  return typeof eventState.moderationNote === "string" && eventState.moderationNote.trim() ? eventState.moderationNote : undefined;
}

export async function getOrganizerEventApprovalTimeline(eventId: number, organizerId: number): Promise<OrganizerApprovalTimelineEntry[]> {
  const event = await getOrganizerEvent(eventId, organizerId); if (!event) return [];
  const audits = await db().select().from(adminAuditLogs).where(and(eq(adminAuditLogs.entityType, "event"), eq(adminAuditLogs.entityId, eventId))).orderBy(asc(adminAuditLogs.createdAt));
  const timeline: OrganizerApprovalTimelineEntry[] = [{ status: "draft", label: approvalTimelineLabels.draft, occurredAt: event.createdAt }];
  if (event.submittedAt) timeline.push({ status: "submitted", label: approvalTimelineLabels.submitted, occurredAt: event.submittedAt });
  for (const audit of audits) { const status = auditModerationStatus(audit.action); if (status) timeline.push({ status, label: approvalTimelineLabels[status], occurredAt: audit.createdAt, note: auditModerationNote(audit.afterState) }); }
  const reviewedAt = event.reviewedAt;
  const hasCurrentReview = reviewedAt ? timeline.some(entry => entry.status === event.moderationStatus && entry.occurredAt.getTime() === reviewedAt.getTime()) : false;
  if (reviewedAt && !hasCurrentReview && event.moderationStatus !== "draft" && event.moderationStatus !== "submitted") timeline.push({ status: event.moderationStatus, label: approvalTimelineLabels[event.moderationStatus], occurredAt: reviewedAt, note: event.moderationNote });
  return timeline.sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
}

export async function replaceTickets(eventId: number, organizerId: number, items: Array<{ id?: number; name: string; description?: string; pricePaise: number; quantityLimit: number; ticketCategory: "paid" | "free" | "donation"; gstApplicable: boolean; gstRatePercent: number; minPerBooking: number; maxPerBooking: number; platformFeePayer: "organizer" | "buyer"; fitizenFeePayer: "organizer" | "buyer"; gatewayFeePayer: "organizer" | "buyer"; attendeeMessage?: string; salesStartAt?: Date; salesEndAt?: Date }>) {
  if (!(await getOrganizerEvent(eventId, organizerId))) throw new Error("Event not found");
  const existing = await db().select().from(tickets).where(eq(tickets.eventId, eventId));
  const existingIds = new Set(existing.map(ticket => ticket.id));
  const retainedIds = new Set<number>();
  for (const item of items) {
    const { id, ...values } = item;
    if (id && existingIds.has(id)) {
      retainedIds.add(id);
      await db().update(tickets).set(values).where(and(eq(tickets.id, id), eq(tickets.eventId, eventId)));
    } else {
      await db().insert(tickets).values({ ...values, eventId });
    }
  }
  const removedIds = existing.filter(ticket => !retainedIds.has(ticket.id)).map(ticket => ticket.id);
  if (removedIds.length) await db().delete(tickets).where(inArray(tickets.id, removedIds));
}

export async function replaceQuestions(eventId: number, organizerId: number, items: Array<{ question: string; fieldType: "short_text" | "long_text" | "select" | "checkbox"; options?: string[]; required: boolean }>) {
  if (!(await getOrganizerEvent(eventId, organizerId))) throw new Error("Event not found");
  await db().delete(customQuestions).where(eq(customQuestions.eventId, eventId));
  if (items.length) await db().insert(customQuestions).values(items.map((item, position) => ({ ...item, eventId, position })));
}

export async function registerForEvent(eventId: number, ticketId: number | null, attendee: { id: number; publicId: string }) {
  const event = (await db().select().from(events).where(and(eq(events.id, eventId), eq(events.status, "live"))).limit(1))[0];
  if (!event || !canCreateRegistration(event.status)) throw new Error("Event not found");
  const existing = await getActiveRegistrationForEvent(eventId, attendee.id);
  if (existing) return { orderNumber: existing.orderNumber, paymentPending: existing.paymentStatus === "pending" || existing.paymentStatus === "failed", eventSlug: event.slug, alreadyRegistered: true as const };
  const selected = ticketId ? (await db().select().from(tickets).where(and(eq(tickets.id, ticketId), eq(tickets.eventId, eventId))).limit(1))[0] : undefined;
  if (ticketId && (!selected || !canCreateRegistration(event.status, selected))) throw new Error("Ticket unavailable");
  const paymentStatus = paymentStatusForRegistration(selected);
  const needsManualPayment = paymentStatus === "pending";
  if (needsManualPayment && !hasManualPaymentInstructions({ enabled: event.manualPaymentEnabled, method: event.manualPaymentMethod, upiId: event.upiId, bankAccountName: event.bankAccountName, bankAccountNumber: event.bankAccountNumber, bankIfsc: event.bankIfsc })) throw new Error("Organizer payment instructions are unavailable");
  const orderNumber = `FZ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const settings = await getPlatformSettings();
  const pricing = registrationPriceBreakdown({ ticketPricePaise: selected?.pricePaise ?? 0, gstApplicable: Boolean(selected?.gstApplicable), gstRatePercent: selected?.gstRatePercent ?? 0, platformFeePercent: event.platformFeePercent, platformFeePayer: selected?.platformFeePayer === "buyer" ? "buyer" : "organizer", gatewayFeePercent: settings.gatewayFeePercent, gatewayFeePayer: selected?.gatewayFeePayer === "buyer" ? "buyer" : "organizer" });
  await db().insert(registrations).values({ eventId, ticketId, attendeeId: attendee.id, attendeePublicId: attendee.publicId, orderNumber, ticketSubtotalPaise: pricing.ticketSubtotalPaise, gstPaise: pricing.gstPaise, paidAmountPaise: pricing.collectedAmountPaise, platformFeePaise: pricing.platformFeePaise, gatewayFeePaise: pricing.gatewayFeePaise, gatewayFeePercent: settings.gatewayFeePercent, paymentStatus });
  if (selected) await db().update(tickets).set({ quantitySold: selected.quantitySold + 1 }).where(eq(tickets.id, selected.id));
  return { orderNumber, paymentPending: needsManualPayment, eventSlug: event.slug, alreadyRegistered: false as const };
}

export async function ensureOrganizerParticipation(event: typeof events.$inferSelect) {
  const existing = await getOrganizerParticipation(event.id, event.organizerId);
  if (existing) return { registration: existing.registration, ticket: existing.ticket, created: false as const };
  const selectedTicket = (await db().select().from(tickets).where(and(eq(tickets.eventId, event.id), eq(tickets.isActive, true))).orderBy(asc(tickets.createdAt)).limit(1))[0];
  if (selectedTicket && selectedTicket.quantitySold >= selectedTicket.quantityLimit) throw new Error("Cannot add the organizer because all available ticket capacity is sold out");
  const orderNumber = `FZ-ORG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const result = await db().insert(registrations).values({ eventId: event.id, ticketId: selectedTicket?.id || null, attendeeId: event.organizerId, attendeePublicId: event.organizerPublicId, orderNumber, status: "confirmed", paidAmountPaise: 0, platformFeePaise: 0, paymentStatus: "not_required" });
  if (selectedTicket) await db().update(tickets).set({ quantitySold: selectedTicket.quantitySold + 1 }).where(eq(tickets.id, selectedTicket.id));
  const registration = (await db().select().from(registrations).where(eq(registrations.id, Number(result[0].insertId))).limit(1))[0];
  if (!registration) throw new Error("Organizer participation record could not be created");
  return { registration, ticket: selectedTicket || null, created: true as const };
}

export async function getOrganizerParticipation(eventId: number, organizerId: number) {
  return (await db().select({ registration: registrations, ticket: tickets }).from(registrations).leftJoin(tickets, eq(registrations.ticketId, tickets.id)).where(and(eq(registrations.eventId, eventId), eq(registrations.attendeeId, organizerId))).orderBy(desc(registrations.createdAt)).limit(1))[0];
}

export async function getPaymentBooking(orderNumber: string, attendeeId: number, eventId?: number) {
  const clauses = [eq(registrations.orderNumber, orderNumber), eq(registrations.attendeeId, attendeeId)];
  if (eventId) clauses.push(eq(registrations.eventId, eventId));
  return (await db().select({ registration: registrations, event: events, ticket: tickets }).from(registrations).innerJoin(events, eq(registrations.eventId, events.id)).leftJoin(tickets, eq(registrations.ticketId, tickets.id)).where(and(...clauses)).limit(1))[0];
}

export async function ensureTaxInvoiceForRegistration(registrationId: number) {
  const existing = (await db().select().from(taxInvoices).where(eq(taxInvoices.registrationId, registrationId)).limit(1))[0];
  if (existing) return existing;
  const booking = (await db().select({ registration: registrations, ticket: tickets }).from(registrations).leftJoin(tickets, eq(registrations.ticketId, tickets.id)).where(eq(registrations.id, registrationId)).limit(1))[0];
  if (!booking || booking.registration.paymentStatus !== "paid") return undefined;
  const settings = await getPlatformSettings();
  const ticketSubtotalPaise = booking.registration.ticketSubtotalPaise || booking.ticket?.pricePaise || Math.max(0, booking.registration.paidAmountPaise - booking.registration.platformFeePaise - booking.registration.gatewayFeePaise);
  const gstPaise = booking.registration.gstPaise || (booking.ticket?.gstApplicable ? Math.round(ticketSubtotalPaise * booking.ticket.gstRatePercent / 100) : 0);
  const invoiceNumber = `${settings.invoicePrefix}-${String(registrationId).padStart(8, "0")}`;
  try {
    const inserted = await db().insert(taxInvoices).values({ registrationId, invoiceNumber, invoicePrefix: settings.invoicePrefix, issuerLegalName: settings.issuerLegalName, issuerTaxRegistrationNumber: settings.issuerTaxRegistrationNumber, issuerAddress: settings.issuerAddress, ticketSubtotalPaise, gstPaise, platformFeePaise: booking.registration.platformFeePaise, gatewayFeePaise: booking.registration.gatewayFeePaise, totalPaise: booking.registration.paidAmountPaise });
    return (await db().select().from(taxInvoices).where(eq(taxInvoices.id, Number(inserted[0].insertId))).limit(1))[0];
  } catch {
    return (await db().select().from(taxInvoices).where(eq(taxInvoices.registrationId, registrationId)).limit(1))[0];
  }
}

export async function getTaxInvoiceForAttendee(orderNumber: string, attendeeId: number) {
  const booking = await getPaymentBooking(orderNumber, attendeeId);
  if (!booking || booking.registration.paymentStatus !== "paid") return undefined;
  const invoice = await ensureTaxInvoiceForRegistration(booking.registration.id);
  return invoice ? { invoice, registration: booking.registration, event: booking.event, ticket: booking.ticket } : undefined;
}

export async function submitManualPaymentProof(orderNumber: string, attendeeId: number, paymentProofUrl: string, manualPaymentReference?: string) {
  const booking = await getPaymentBooking(orderNumber, attendeeId);
  if (!booking || (booking.registration.paymentStatus !== "pending" && booking.registration.paymentStatus !== "failed")) throw new Error("This booking is not awaiting a payment submission");
  if (!paymentProofUrl.startsWith(`/manus-storage/payments/proofs/${attendeeId}/`)) throw new Error("Invalid payment proof upload");
  const reference = normalizeManualPaymentReference(manualPaymentReference) || null;
  await db().update(registrations).set({ paymentStatus: "pending", paymentProofUrl, paymentProofSubmittedAt: new Date(), manualPaymentReference: reference, paymentRejectedAt: null, paymentRejectionNote: null }).where(eq(registrations.id, booking.registration.id));
  return booking;
}

export async function confirmManualPayment(eventId: number, registrationId: number, organizerId: number) {
  if (!(await getOrganizerEvent(eventId, organizerId))) throw new Error("Event not found");
  const registration = (await db().select().from(registrations).where(and(eq(registrations.id, registrationId), eq(registrations.eventId, eventId))).limit(1))[0];
  if (!registration || !canConfirmManualPayment(registration.paymentStatus, registration.paymentProofUrl || registration.manualPaymentReference)) return undefined;
  await db().update(registrations).set({ paymentStatus: "paid" }).where(and(eq(registrations.id, registrationId), eq(registrations.eventId, eventId), eq(registrations.paymentStatus, "pending")));
  return getRegistrationNotificationData(registrationId);
}

export async function rejectManualPayment(eventId: number, registrationId: number, organizerId: number, note: string) {
  if (!(await getOrganizerEvent(eventId, organizerId))) throw new Error("Event not found");
  const message = note.trim().slice(0, 800);
  if (message.length < 4) throw new Error("Provide a brief rejection note");
  const registration = (await db().select().from(registrations).where(and(eq(registrations.id, registrationId), eq(registrations.eventId, eventId), eq(registrations.paymentStatus, "pending"))).limit(1))[0];
  if (!registration) return undefined;
  await db().update(registrations).set({ paymentStatus: "failed", paymentRejectedAt: new Date(), paymentRejectionNote: message }).where(eq(registrations.id, registrationId));
  return getRegistrationNotificationData(registrationId);
}

export async function toggleEventFavorite(eventId: number, attendeeId: number) {
  const event = (await db().select({ id: events.id }).from(events).where(and(eq(events.id, eventId), eq(events.status, "live"), eq(events.visibility, "public"))).limit(1))[0];
  if (!event) throw new Error("Event not found");
  const existing = (await db().select({ id: eventFollows.id }).from(eventFollows).where(and(eq(eventFollows.eventId, eventId), eq(eventFollows.attendeeId, attendeeId))).limit(1))[0];
  if (existing) {
    await db().delete(eventFollows).where(eq(eventFollows.id, existing.id));
    return false;
  }
  await db().insert(eventFollows).values({ eventId, attendeeId });
  return true;
}

export async function isEventFavorite(eventId: number, attendeeId: number) {
  const row = (await db().select({ id: eventFollows.id }).from(eventFollows).where(and(eq(eventFollows.eventId, eventId), eq(eventFollows.attendeeId, attendeeId))).limit(1))[0];
  return Boolean(row);
}

export async function createPendingCheckoutRegistration(eventId: number, ticketId: number, attendeeId: number) {
  const event = (await db().select().from(events).where(and(eq(events.id, eventId), eq(events.status, "live"))).limit(1))[0];
  const ticket = (await db().select().from(tickets).where(and(eq(tickets.id, ticketId), eq(tickets.eventId, eventId), eq(tickets.isActive, true))).limit(1))[0];
  if (!event || !ticket || ticket.ticketCategory === "free" || ticket.pricePaise <= 0 || !canCreateRegistration(event.status, ticket)) throw new Error("Paid ticket unavailable");
  if (ticket.quantitySold >= ticket.quantityLimit) throw new Error("Ticket is sold out");
  const settings = await getPlatformSettings();
  const pricing = registrationPriceBreakdown({ ticketPricePaise: ticket.pricePaise, gstApplicable: ticket.gstApplicable, gstRatePercent: ticket.gstRatePercent, platformFeePercent: event.platformFeePercent, platformFeePayer: ticket.platformFeePayer, gatewayFeePercent: settings.gatewayFeePercent, gatewayFeePayer: ticket.gatewayFeePayer });
  const orderNumber = `FZ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const attendee = await findUserById(attendeeId);
  if (!attendee) throw new Error("Attendee not found");
  const result = await db().insert(registrations).values({ eventId, ticketId, attendeeId, attendeePublicId: attendee.publicId, orderNumber, ticketSubtotalPaise: pricing.ticketSubtotalPaise, gstPaise: pricing.gstPaise, paidAmountPaise: pricing.collectedAmountPaise, platformFeePaise: pricing.platformFeePaise, gatewayFeePaise: pricing.gatewayFeePaise, gatewayFeePercent: settings.gatewayFeePercent, paymentStatus: "pending" });
  return { registrationId: Number(result[0].insertId), orderNumber, event, ticket, paidAmountPaise: pricing.collectedAmountPaise };
}

export async function attachStripeCheckoutSession(registrationId: number, attendeeId: number, checkoutSessionId: string) {
  await db().update(registrations).set({ stripeCheckoutSessionId: checkoutSessionId }).where(and(eq(registrations.id, registrationId), eq(registrations.attendeeId, attendeeId), eq(registrations.paymentStatus, "pending")));
}

export async function removePendingCheckoutRegistration(registrationId: number, attendeeId: number) {
  await db().delete(registrations).where(and(eq(registrations.id, registrationId), eq(registrations.attendeeId, attendeeId), eq(registrations.paymentStatus, "pending"), isNull(registrations.stripeCheckoutSessionId)));
}

export async function cancelPendingCheckoutRegistration(registrationId: number, attendeeId: number) {
  await db().update(registrations).set({ paymentStatus: "failed", status: "cancelled" }).where(and(eq(registrations.id, registrationId), eq(registrations.attendeeId, attendeeId), eq(registrations.paymentStatus, "pending")));
}

export async function failStripeCheckout(checkoutSessionId: string) {
  await db().update(registrations).set({ paymentStatus: "failed", status: "cancelled" }).where(and(eq(registrations.stripeCheckoutSessionId, checkoutSessionId), eq(registrations.paymentStatus, "pending")));
}

export async function completeStripeCheckout(checkoutSessionId: string, paymentIntentId?: string | null) {
  const registration = (await db().select().from(registrations).where(eq(registrations.stripeCheckoutSessionId, checkoutSessionId)).limit(1))[0];
  if (!registration || registration.paymentStatus === "paid") return undefined;
  await db().update(registrations).set({ paymentStatus: "paid", status: "confirmed", stripePaymentIntentId: paymentIntentId || null }).where(eq(registrations.id, registration.id));
  if (registration.ticketId) {
    const ticket = (await db().select().from(tickets).where(eq(tickets.id, registration.ticketId)).limit(1))[0];
    if (ticket) await db().update(tickets).set({ quantitySold: ticket.quantitySold + 1 }).where(eq(tickets.id, ticket.id));
  }
  return getRegistrationNotificationData(registration.id);
}

export async function getRegistrationNotificationData(registrationId: number) {
  const row = (await db()
    .select({ registration: registrations, event: events, attendee: users, organizer: users, ticket: tickets })
    .from(registrations)
    .innerJoin(events, eq(registrations.eventId, events.id))
    .innerJoin(users, eq(registrations.attendeeId, users.id))
    .leftJoin(tickets, eq(registrations.ticketId, tickets.id))
    .where(eq(registrations.id, registrationId))
    .limit(1))[0];
  if (!row) return undefined;
  const organizer = await findUserById(row.event.organizerId);
  return { ...row, organizer };
}

export async function getRegistrationNotificationDataByOrder(orderNumber: string) {
  const registration = (await db().select({ id: registrations.id }).from(registrations).where(eq(registrations.orderNumber, orderNumber)).limit(1))[0];
  return registration ? getRegistrationNotificationData(registration.id) : undefined;
}

export async function markRegistrationConfirmationSent(registrationId: number) {
  await db().update(registrations).set({ confirmationEmailSentAt: new Date() }).where(eq(registrations.id, registrationId));
}

export async function getUpcomingReminderRegistrations(now = new Date()) {
  const startsBefore = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const matches = await db()
    .select({ registration: registrations, event: events, attendee: users, ticket: tickets })
    .from(registrations)
    .innerJoin(events, eq(registrations.eventId, events.id))
    .innerJoin(users, eq(registrations.attendeeId, users.id))
    .leftJoin(tickets, eq(registrations.ticketId, tickets.id))
    .where(and(eq(registrations.status, "confirmed"), isNull(registrations.reminderEmailSentAt), gte(events.startsAt, now), lt(events.startsAt, startsBefore)));
  return matches.filter(row => row.registration.paymentStatus === "not_required" || row.registration.paymentStatus === "paid");
}

export async function claimRegistrationReminder(registrationId: number) {
  const result = await db().update(registrations).set({ reminderClaimedAt: new Date() }).where(and(eq(registrations.id, registrationId), isNull(registrations.reminderEmailSentAt), isNull(registrations.reminderClaimedAt)));
  return Number(result[0].affectedRows) === 1;
}

export async function releaseRegistrationReminderClaim(registrationId: number) {
  await db().update(registrations).set({ reminderClaimedAt: null, reminderEmailSentAt: null }).where(eq(registrations.id, registrationId));
}

export async function markRegistrationReminderSent(registrationId: number) {
  const result = await db().update(registrations).set({ reminderEmailSentAt: new Date() }).where(and(eq(registrations.id, registrationId), isNull(registrations.reminderEmailSentAt), sql`${registrations.reminderClaimedAt} IS NOT NULL`));
  return Number(result[0].affectedRows) === 1;
}

export async function getRegistrations(attendeeId: number) {
  return db()
    .select({ registration: registrations, event: events, ticket: tickets })
    .from(registrations)
    .innerJoin(events, eq(registrations.eventId, events.id))
    .leftJoin(tickets, eq(registrations.ticketId, tickets.id))
    .where(and(eq(registrations.attendeeId, attendeeId), sql`${events.status} <> 'draft'`, sql`${events.moderationStatus} <> 'deleted'`))
    .orderBy(desc(registrations.createdAt));
}

export async function getFollowCount(attendeeId: number) {
  const rows = await db().select({ count: sql<number>`count(*)` }).from(eventFollows).where(eq(eventFollows.attendeeId, attendeeId));
  return Number(rows[0]?.count ?? 0);
}

export async function getFollowedEvents(attendeeId: number) {
  return db()
    .select({ follow: eventFollows, event: events, category: categories })
    .from(eventFollows)
    .innerJoin(events, eq(eventFollows.eventId, events.id))
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .where(and(eq(eventFollows.attendeeId, attendeeId), sql`${events.status} <> 'draft'`, sql`${events.moderationStatus} <> 'deleted'`))
    .orderBy(desc(eventFollows.createdAt));
}

export async function getReports(organizerId: number) {
  const organizerEvents = await db().select().from(events).where(eq(events.organizerId, organizerId));
  if (!organizerEvents.length) return { events: organizerEvents, registrations: [], tickets: [], totals: { registrations: 0, revenue: 0, platformFees: 0, live: 0, submitted: 0, changesRequested: 0 } };
  const ids = organizerEvents.map(event => event.id);
  const [allRegistrations, allTickets] = await Promise.all([db().select().from(registrations), db().select().from(tickets)]);
  const matching = allRegistrations.filter(row => ids.includes(row.eventId));
  return {
    events: organizerEvents,
    registrations: matching,
    tickets: allTickets.filter(ticket => ids.includes(ticket.eventId)),
    totals: {
      registrations: matching.length,
      revenue: matching.reduce((sum, row) => sum + row.paidAmountPaise, 0),
      platformFees: matching.reduce((sum, row) => sum + row.platformFeePaise, 0),
      live: organizerEvents.filter(event => event.status === "live").length,
      submitted: organizerEvents.filter(event => event.moderationStatus === "submitted").length,
      changesRequested: organizerEvents.filter(event => event.moderationStatus === "rejected").length,
    },
  };
}

export async function getEventAttendees(eventId: number, organizerId: number, filters: { query?: string; payment?: string; attendance?: string } = {}) {
  if (!(await getOrganizerEvent(eventId, organizerId))) return [];
  const clauses = [eq(registrations.eventId, eventId)];
  const query = filters.query?.trim().slice(0, 80);
  if (query) { const pattern = `%${query}%`; clauses.push(or(like(users.name, pattern), like(users.email, pattern), like(users.publicId, pattern), like(registrations.orderNumber, pattern))!); }
  if (["not_required", "pending", "paid", "failed", "refunded"].includes(filters.payment || "")) clauses.push(eq(registrations.paymentStatus, filters.payment as "not_required" | "pending" | "paid" | "failed" | "refunded"));
  if (["confirmed", "cancelled", "checked_in"].includes(filters.attendance || "")) clauses.push(eq(registrations.status, filters.attendance as "confirmed" | "cancelled" | "checked_in"));
  return db()
    .select({ registration: registrations, attendee: users, ticket: tickets })
    .from(registrations)
    .innerJoin(users, eq(registrations.attendeeId, users.id))
    .leftJoin(tickets, eq(registrations.ticketId, tickets.id))
    .where(and(...clauses))
    .orderBy(desc(registrations.createdAt));
}

export async function verifyEventParticipant(eventId: number, organizerId: number, attendeePublicId: string) {
  if (!(await getOrganizerEvent(eventId, organizerId))) return undefined;
  const normalizedId = attendeePublicId.trim().toUpperCase();
  if (!/^USR-[A-F0-9]{16}$/.test(normalizedId)) return undefined;
  return (await db().select({ registration: registrations, attendee: users, ticket: tickets }).from(registrations).innerJoin(users, eq(registrations.attendeeId, users.id)).leftJoin(tickets, eq(registrations.ticketId, tickets.id)).where(and(eq(registrations.eventId, eventId), eq(users.publicId, normalizedId), or(eq(registrations.status, "confirmed"), eq(registrations.status, "checked_in")))).orderBy(desc(registrations.createdAt)).limit(1))[0];
}

export async function updateRegistrationStatus(eventId: number, registrationId: number, organizerId: number, status: "confirmed" | "cancelled" | "checked_in") {
  if (!(await getOrganizerEvent(eventId, organizerId))) throw new Error("Event not found");
  await db().update(registrations).set({ status, checkedInAt: status === "checked_in" ? new Date() : null }).where(and(eq(registrations.id, registrationId), eq(registrations.eventId, eventId)));
}

export async function getPromotions(organizerId: number) {
  return db()
    .select({ promotion: promotions, event: events })
    .from(promotions)
    .innerJoin(events, eq(promotions.eventId, events.id))
    .where(eq(events.organizerId, organizerId))
    .orderBy(desc(promotions.createdAt));
}

export async function createPromotion(organizerId: number, input: { eventId: number; title: string; channel: "social" | "email" | "partner" | "featured"; budgetPaise: number }) {
  if (!(await getOrganizerEvent(input.eventId, organizerId))) throw new Error("Event not found");
  await db().insert(promotions).values({ ...input, status: "draft" });
}

export async function getAdminWorkspaceData() {
  const [accountRows, eventRows, registrationRows, ticketRows, promotionRows, auditRows, venueRows, venueReservationRows, venueRequestRows] = await Promise.all([
    db().select().from(users).orderBy(desc(users.createdAt)).limit(150),
    db().select({ event: events, organizer: users, category: categories }).from(events).innerJoin(users, eq(events.organizerId, users.id)).leftJoin(categories, eq(events.categoryId, categories.id)).orderBy(desc(events.updatedAt)).limit(150),
    db().select({ registration: registrations, attendee: users, event: events, ticket: tickets }).from(registrations).innerJoin(users, eq(registrations.attendeeId, users.id)).innerJoin(events, eq(registrations.eventId, events.id)).leftJoin(tickets, eq(registrations.ticketId, tickets.id)).orderBy(desc(registrations.createdAt)).limit(200),
    db().select().from(tickets).orderBy(desc(tickets.createdAt)).limit(300),
    db().select({ promotion: promotions, event: events }).from(promotions).innerJoin(events, eq(promotions.eventId, events.id)).orderBy(desc(promotions.createdAt)).limit(100),
    db().select({ audit: adminAuditLogs, admin: users }).from(adminAuditLogs).innerJoin(users, eq(adminAuditLogs.adminId, users.id)).orderBy(desc(adminAuditLogs.createdAt)).limit(80),
    getAdminVenues(),
    db().select({ event: events, organizer: users, venue: approvedVenues }).from(events).innerJoin(users, eq(events.organizerId, users.id)).innerJoin(approvedVenues, eq(events.approvedVenueId, approvedVenues.id)).where(and(sql`${events.status} <> 'completed'`, sql`${events.moderationStatus} <> 'deleted'`)).orderBy(asc(events.startsAt)),
    db().select({ request: venueApprovalRequests, organizer: users, event: events }).from(venueApprovalRequests).innerJoin(users, eq(venueApprovalRequests.organizerId, users.id)).leftJoin(events, eq(venueApprovalRequests.eventId, events.id)).orderBy(desc(venueApprovalRequests.updatedAt)).limit(100),
  ]);
  const totalRevenue = registrationRows.reduce((sum, row) => sum + row.registration.paidAmountPaise, 0);
  const platformFees = registrationRows.reduce((sum, row) => sum + row.registration.platformFeePaise, 0);
  const today = new Date();
  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - index));
    const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
    const rows = registrationRows.filter(row => new Date(row.registration.createdAt) >= day && new Date(row.registration.createdAt) < nextDay);
    return { label: day.toLocaleDateString("en-IN", { weekday: "short" }), date: day.toISOString().slice(0, 10), registrations: rows.length, revenue: rows.reduce((sum, row) => sum + row.registration.paidAmountPaise, 0), platformFees: rows.reduce((sum, row) => sum + row.registration.platformFeePaise, 0) };
  });
  return {
    users: accountRows,
    events: eventRows,
    registrations: registrationRows,
    tickets: ticketRows,
    promotions: promotionRows,
    audits: auditRows,
    venues: venueRows,
    venueReservations: venueReservationRows,
    venueRequests: venueRequestRows,
    metrics: {
      users: accountRows.length,
      admins: accountRows.filter(user => user.role === "admin").length,
      events: eventRows.length,
      liveEvents: eventRows.filter(row => row.event.status === "live").length,
      registrations: registrationRows.length,
      pendingPayments: registrationRows.filter(row => row.registration.paymentStatus === "pending").length,
      totalRevenue,
      platformFees,
      awaitingApproval: eventRows.filter(row => row.event.moderationStatus === "submitted").length,
      changesRequested: eventRows.filter(row => row.event.moderationStatus === "rejected").length,
    },
    weeklyActivity,
  };
}

export async function getAdminDataAuditData(input: { paymentStatus?: string; action?: string; from?: Date | null; to?: Date | null } = {}) {
  const [registrationRows, roleAuditRows, invoiceRows] = await Promise.all([
    db().select({ registration: registrations, attendee: users, event: events, ticket: tickets }).from(registrations).innerJoin(users, eq(registrations.attendeeId, users.id)).innerJoin(events, eq(registrations.eventId, events.id)).leftJoin(tickets, eq(registrations.ticketId, tickets.id)).orderBy(desc(registrations.createdAt)).limit(300),
    db().select({ audit: adminAuditLogs, admin: users }).from(adminAuditLogs).innerJoin(users, eq(adminAuditLogs.adminId, users.id)).where(eq(adminAuditLogs.action, "user.role_updated")).orderBy(desc(adminAuditLogs.createdAt)).limit(200),
    db().select().from(taxInvoices).orderBy(desc(taxInvoices.issuedAt)).limit(300),
  ]);
  const inRange = (value: Date, from?: Date | null, to?: Date | null) => (!from || value >= from) && (!to || value <= to);
  const transactions = registrationRows.filter(row => (!input.paymentStatus || row.registration.paymentStatus === input.paymentStatus) && inRange(new Date(row.registration.createdAt), input.from, input.to));
  const roleChanges = roleAuditRows.filter(row => (!input.action || row.audit.action === input.action) && inRange(new Date(row.audit.createdAt), input.from, input.to));
  return { transactions, roleChanges, invoices: invoiceRows, metrics: { transactions: transactions.length, paid: transactions.filter(row => row.registration.paymentStatus === "paid").length, pending: transactions.filter(row => row.registration.paymentStatus === "pending").length, refunded: transactions.filter(row => row.registration.paymentStatus === "refunded").length, collectedPaise: transactions.filter(row => row.registration.paymentStatus === "paid").reduce((sum, row) => sum + row.registration.paidAmountPaise, 0), gatewayFeesPaise: transactions.filter(row => row.registration.paymentStatus === "paid").reduce((sum, row) => sum + row.registration.gatewayFeePaise, 0), roleChanges: roleChanges.length, invoicesIssued: invoiceRows.length } };
}

export async function getMcdWorkspaceData() {
  const [eventRows, registrationRows, venueRows, promotionRows, activityRows, csrRows] = await Promise.all([
    db().select({ event: events, organizer: users, category: categories }).from(events).innerJoin(users, eq(events.organizerId, users.id)).leftJoin(categories, eq(events.categoryId, categories.id)).orderBy(desc(events.updatedAt)),
    db().select({ registration: registrations, event: events }).from(registrations).innerJoin(events, eq(registrations.eventId, events.id)),
    db().select().from(approvedVenues).orderBy(asc(approvedVenues.city), asc(approvedVenues.zone), asc(approvedVenues.ward)),
    db().select().from(promotions).where(eq(promotions.channel, "partner")),
    db().select().from(categories).orderBy(asc(categories.name)),
    db().select({ request: csrSponsorshipRequests, profile: csrProfiles, event: events, organizer: users }).from(csrSponsorshipRequests).innerJoin(csrProfiles, eq(csrSponsorshipRequests.csrProfileId, csrProfiles.id)).innerJoin(events, eq(csrSponsorshipRequests.assignedEventId, events.id)).leftJoin(users, eq(events.organizerId, users.id)).where(eq(csrSponsorshipRequests.status, "assigned")).orderBy(desc(csrSponsorshipRequests.assignedAt)),
  ]);
  const registrationsByEvent = new Map<number, typeof registrationRows>();
  registrationRows.forEach(row => registrationsByEvent.set(row.event.id, [...(registrationsByEvent.get(row.event.id) || []), row]));
  type Territory = { city: string; zone: string; ward: string; events: number; liveEvents: number; participations: number; checkedIn: number; eligibleLocations: number; accessibleLocations: number };
  const territories = new Map<string, Territory>();
  const territoryFor = (city: string | null, zone: string | null, ward: string | null) => {
    const normalized = { city: city || "City not recorded", zone: zone || "Zone not recorded", ward: ward || "Ward not recorded" };
    const key = `${normalized.city}|${normalized.zone}|${normalized.ward}`;
    const current = territories.get(key) || { ...normalized, events: 0, liveEvents: 0, participations: 0, checkedIn: 0, eligibleLocations: 0, accessibleLocations: 0 };
    territories.set(key, current); return current;
  };
  venueRows.forEach(venue => { const territory = territoryFor(venue.city, venue.zone, venue.ward); if (venue.active) { territory.eligibleLocations += 1; if (venue.isAccessible) territory.accessibleLocations += 1; } });
  eventRows.forEach(({ event }) => { const territory = territoryFor(event.city, event.zone, event.ward); const participation = registrationsByEvent.get(event.id) || []; territory.events += 1; territory.liveEvents += event.status === "live" ? 1 : 0; territory.participations += participation.length; territory.checkedIn += participation.filter(row => row.registration.status === "checked_in").length; });
  const wardActivity = [...territories.values()].sort((left, right) => right.participations - left.participations || right.events - left.events || left.city.localeCompare(right.city));
  const organizerActivity = [...new Map(eventRows.map(({ organizer }) => [organizer.id, organizer])).values()].map(organizer => {
    const organizerEvents = eventRows.filter(row => row.event.organizerId === organizer.id); const organizerEventIds = new Set(organizerEvents.map(row => row.event.id)); const participations = registrationRows.filter(row => organizerEventIds.has(row.event.id));
    return { organizer, events: organizerEvents.length, liveEvents: organizerEvents.filter(row => row.event.status === "live").length, participations: participations.length, awaitingApproval: organizerEvents.filter(row => row.event.moderationStatus === "submitted").length };
  }).sort((left, right) => right.participations - left.participations || right.events - left.events);
  const underServedAreas = wardActivity.filter(area => area.eligibleLocations > 0 && area.liveEvents === 0).sort((left, right) => right.eligibleLocations - left.eligibleLocations);
  return {
    events: eventRows.map(({ event, organizer, category }) => ({ event, organizer, category, participations: (registrationsByEvent.get(event.id) || []).length, checkedIn: (registrationsByEvent.get(event.id) || []).filter(row => row.registration.status === "checked_in").length })),
    wardActivity,
    organizerActivity,
    underServedAreas,
    eligibleLocations: venueRows.filter(venue => venue.active),
    approvedActivities: activityRows,
    partnerPromotions: promotionRows,
    csrSponsorships: csrRows,
    metrics: {
      events: eventRows.length,
      liveEvents: eventRows.filter(row => row.event.status === "live").length,
      awaitingApproval: eventRows.filter(row => row.event.moderationStatus === "submitted").length,
      participations: registrationRows.length,
      checkedIn: registrationRows.filter(row => row.registration.status === "checked_in").length,
      organizers: new Set(eventRows.map(row => row.organizer.id)).size,
      eligibleLocations: venueRows.filter(venue => venue.active).length,
      accessibleLocations: venueRows.filter(venue => venue.active && venue.isAccessible).length,
      partnerPromotions: promotionRows.length,
      csrSupportedActivities: csrRows.length,
      csrCommitted: csrRows.reduce((sum, row) => sum + row.request.amountPaise, 0),
      wardsObserved: wardActivity.length,
    },
  };
}

function auditSnapshot(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

async function recordAdminAudit(adminId: number, action: string, entityType: string, entityId: number, beforeState: unknown, afterState: unknown, executor: any = db()) {
  await executor.insert(adminAuditLogs).values({ adminId, action, entityType, entityId, beforeState: auditSnapshot(beforeState), afterState: auditSnapshot(afterState) });
}

export type ApprovedVenueInput = { zone: string; ward: string; location: string; venueName: string; city: string; address?: string | null; sector?: string | null; area?: string | null; latitudeE6: number; longitudeE6: number; setting: "indoor" | "outdoor"; capacity?: number | null; isAccessible: boolean; accessibilityNotes?: string | null; active: boolean };

export async function adminReviewVenueApprovalRequest(adminId: number, requestId: number, decision: "approved" | "changes_requested" | "rejected", reviewNote: string) {
  const before = (await db().select().from(venueApprovalRequests).where(eq(venueApprovalRequests.id, requestId)).limit(1))[0];
  if (!before) throw new Error("Venue approval request not found");
  const note = reviewNote.trim().slice(0, 1000); if ((decision === "changes_requested" || decision === "rejected") && note.length < 4) throw new Error("Provide clear review guidance");
  let approvedVenueId = before.approvedVenueId;
  if (decision === "approved" && !approvedVenueId) {
    const created = await db().insert(approvedVenues).values({ zone: before.zone, ward: before.ward, location: before.location, venueName: before.venueName, city: before.city, address: before.address, sector: before.sector, area: before.area, latitudeE6: before.latitudeE6, longitudeE6: before.longitudeE6, setting: before.setting, capacity: before.capacity, isAccessible: before.isAccessible, accessibilityNotes: before.accessibilityNotes, active: true, createdByAdminId: adminId }); approvedVenueId = Number(created[0].insertId);
  }
  await db().update(venueApprovalRequests).set({ status: decision, reviewNote: note || null, reviewedByAdminId: adminId, reviewedAt: new Date(), approvedVenueId }).where(eq(venueApprovalRequests.id, requestId));
  if (decision === "approved" && before.eventId && approvedVenueId) await db().update(events).set({ approvedVenueId, locationSource: "directory" }).where(and(eq(events.id, before.eventId), eq(events.organizerId, before.organizerId)));
  const after = (await db().select().from(venueApprovalRequests).where(eq(venueApprovalRequests.id, requestId)).limit(1))[0]; if (!after) throw new Error("Venue request review failed");
  await recordAdminAudit(adminId, `venue_request.${decision}`, "venue_approval_request", requestId, before, after); return after;
}

export async function adminSaveVenue(adminId: number, venueId: number | null, input: ApprovedVenueInput) {
  if (venueId) {
    const before = (await db().select().from(approvedVenues).where(eq(approvedVenues.id, venueId)).limit(1))[0];
    if (!before) throw new Error("Approved venue not found");
    await db().update(approvedVenues).set(input).where(eq(approvedVenues.id, venueId));
    const after = (await db().select().from(approvedVenues).where(eq(approvedVenues.id, venueId)).limit(1))[0];
    if (!after) throw new Error("Venue update failed");
    await recordAdminAudit(adminId, "venue.updated", "approved_venue", venueId, before, after);
    return after;
  }
  const result = await db().insert(approvedVenues).values({ ...input, createdByAdminId: adminId });
  const createdId = Number(result[0].insertId);
  const after = (await db().select().from(approvedVenues).where(eq(approvedVenues.id, createdId)).limit(1))[0];
  if (!after) throw new Error("Venue creation failed");
  await recordAdminAudit(adminId, "venue.created", "approved_venue", createdId, null, after);
  return after;
}

export async function adminImportVenues(adminId: number, rows: ApprovedVenueInput[]) {
  let created = 0; let updated = 0;
  for (const input of rows) {
    const existing = (await db().select().from(approvedVenues).where(and(eq(approvedVenues.zone, input.zone), eq(approvedVenues.ward, input.ward), eq(approvedVenues.location, input.location), eq(approvedVenues.venueName, input.venueName), eq(approvedVenues.city, input.city))).limit(1))[0];
    if (existing) {
      await db().update(approvedVenues).set(input).where(eq(approvedVenues.id, existing.id));
      const after = (await db().select().from(approvedVenues).where(eq(approvedVenues.id, existing.id)).limit(1))[0];
      if (!after) throw new Error("Venue import update failed");
      await recordAdminAudit(adminId, "venue.imported_updated", "approved_venue", existing.id, existing, after);
      updated += 1;
    } else {
      const result = await db().insert(approvedVenues).values({ ...input, createdByAdminId: adminId });
      const createdId = Number(result[0].insertId);
      const after = (await db().select().from(approvedVenues).where(eq(approvedVenues.id, createdId)).limit(1))[0];
      if (!after) throw new Error("Venue import creation failed");
      await recordAdminAudit(adminId, "venue.imported_created", "approved_venue", createdId, null, after);
      created += 1;
    }
  }
  return { created, updated };
}

export async function adminSeedSampleVenues(adminId: number) {
  return adminImportVenues(adminId, [
    { zone: "Sample Zone North", ward: "Sample Ward 01", location: "Sample Sports Precinct", venueName: "Sample · Riverfront Activity Ground", city: "Noida", address: "Sample verification venue — Sector 62 access gate", sector: "Sector 62", area: "Sample directory data", latitudeE6: 28535516, longitudeE6: 77391026, setting: "outdoor", capacity: 1200, isAccessible: true, accessibilityNotes: "Sample: step-free entry and accessible washroom", active: true },
    { zone: "Sample Zone Central", ward: "Sample Ward 08", location: "Sample Civic Centre", venueName: "Sample · Civic Indoor Hall", city: "Noida", address: "Sample verification venue — Civic Centre block", sector: "Sector 18", area: "Sample directory data", latitudeE6: 28570000, longitudeE6: 77320000, setting: "indoor", capacity: 450, isAccessible: true, accessibilityNotes: "Sample: lift access and reserved seating", active: true },
    { zone: "Sample Zone East", ward: "Sample Ward 14", location: "Sample Lake Park", venueName: "Sample · Lake Park Amphitheatre", city: "Noida", address: "Sample verification venue — east park entrance", sector: "Sector 50", area: "Sample directory data", latitudeE6: 28560000, longitudeE6: 77365000, setting: "outdoor", capacity: 800, isAccessible: false, accessibilityNotes: null, active: true },
  ]);
}

export async function adminReleaseVenueReservation(adminId: number, eventId: number, note: string) {
  const before = (await db().select().from(events).where(eq(events.id, eventId)).limit(1))[0];
  if (!before?.approvedVenueId) throw new Error("This event does not hold an approved venue reservation");
  const venueId = before.approvedVenueId;
  await db().update(events).set({ approvedVenueId: null }).where(eq(events.id, eventId));
  const after = (await db().select().from(events).where(eq(events.id, eventId)).limit(1))[0];
  if (!after) throw new Error("Venue release failed");
  await recordAdminAudit(adminId, "venue.reservation_released", "event", eventId, before, { event: after, overrideNote: note });
  await notifyVenueAvailability(venueId, eventId, before.displayName);
  return { before, after, venueId };
}

export async function adminSetUserRole(adminId: number, userId: number, role: "user" | "admin" | "mcd" | "csr") {
  const before = await findUserById(userId);
  if (!before) throw new Error("Account not found");
  if (before.id === adminId && role !== "admin") throw new Error("You cannot remove your own administrator access");
  if (before.role === role) return before;
  await db().update(users).set({ role }).where(eq(users.id, userId));
  const after = await findUserById(userId);
  if (!after) throw new Error("Account update failed");
  await ensureUserAccountProfile(after.id);
  await recordAdminAudit(adminId, "user.role_updated", "user", userId, before, after);
  return after;
}

export async function adminCreateLocalAuthorityAccount(adminId: number, input: { name: string; email: string; passwordHash: string }) {
  const name = input.name.trim().slice(0, 100); const email = input.email.trim().toLowerCase();
  if (name.length < 2 || !email.includes("@")) throw new Error("Enter an authority name and a valid email");
  if (await findUserByEmail(email)) throw new Error("An account with this email already exists");
  await ensureLocalAuthorityTerminologyMappings();
  const created = await db().insert(users).values({ publicId: createPublicUserId(), openId: `local-authority-${crypto.randomUUID()}`, name, email, passwordHash: input.passwordHash, loginMethod: "admin-provisioned", role: "mcd", lastSignedIn: new Date() });
  const account = await findUserById(Number(created[0].insertId));
  if (!account) throw new Error("Local Authority account creation failed");
  await ensureUserAccountProfile(account.id);
  await recordAdminAudit(adminId, "local_authority.account_created", "user", account.id, null, { id: account.id, publicId: account.publicId, email: account.email, legacyRole: account.role, capabilityCode: "LOCAL_AUTHORITY" });
  return account;
}

/** @deprecated Stage 1 compatibility alias. New code must use adminCreateLocalAuthorityAccount. */
export const adminCreateMcdAccount = adminCreateLocalAuthorityAccount;

export type CsrProfileInput = { companyName: string; registrationNumber?: string | null; foundationName?: string | null; contactName: string; contactEmail: string; contactPhone?: string | null; focusAreas?: string | null };
export type CsrBudgetInput = { label: string; totalPaise: number; startsAt?: Date | null; endsAt?: Date | null };
export type CsrSponsorshipInput = { budgetId: number; eventId: number; approvedVenueId: number; implementationAgencyId: number; amountPaise: number; purpose?: string | null };
export type CsrSponsorshipRequestInput = { budgetId: number; requestKind: "existing_event" | "future_event"; eventType: string; titlePreference?: string | null; intendedAudience: string; cityPreference?: string | null; zonePreference?: string | null; wardPreference?: string | null; preferredStartDate?: Date | null; preferredEndDate?: Date | null; estimatedCapacity?: number | null; accessibilityNeeds?: string | null; successIndicators?: string | null; details: string; amountPaise: number; submissionNote?: string | null };

async function csrProfileForUser(userId: number) {
  return (await db().select().from(csrProfiles).where(eq(csrProfiles.userId, userId)).limit(1))[0];
}

export async function adminCreateCsrAccount(adminId: number, input: { name: string; email: string; passwordHash: string; profile: CsrProfileInput }) {
  const name = input.name.trim().slice(0, 100); const email = input.email.trim().toLowerCase();
  const companyName = input.profile.companyName.trim().slice(0, 180); const contactName = input.profile.contactName.trim().slice(0, 140); const contactEmail = input.profile.contactEmail.trim().toLowerCase();
  if (name.length < 2 || !email.includes("@") || companyName.length < 2 || contactName.length < 2 || !contactEmail.includes("@")) throw new Error("Complete the sponsor account, company, and contact details");
  if (await findUserByEmail(email)) throw new Error("An account with this email already exists");
  const created = await db().insert(users).values({ publicId: createPublicUserId(), openId: `csr-${crypto.randomUUID()}`, name, email, passwordHash: input.passwordHash, loginMethod: "admin-provisioned", role: "csr", lastSignedIn: new Date() });
  const account = await findUserById(Number(created[0].insertId));
  if (!account) throw new Error("CSR account creation failed");
  await ensureUserAccountProfile(account.id);
  const profileInsert = await db().insert(csrProfiles).values({ userId: account.id, companyName, registrationNumber: input.profile.registrationNumber?.trim().slice(0, 120) || null, foundationName: input.profile.foundationName?.trim().slice(0, 180) || null, contactName, contactEmail, contactPhone: input.profile.contactPhone?.trim().slice(0, 40) || null, focusAreas: input.profile.focusAreas?.trim().slice(0, 2000) || null, active: true });
  const profile = (await db().select().from(csrProfiles).where(eq(csrProfiles.id, Number(profileInsert[0].insertId))).limit(1))[0];
  if (!profile) throw new Error("CSR company profile creation failed");
  await recordAdminAudit(adminId, "csr.account_created", "csr_profile", profile.id, null, { account: { id: account.id, publicId: account.publicId, email: account.email, role: account.role }, profile });
  return { account, profile };
}

export async function adminCreateImplementationAgency(adminId: number, input: { name: string; registrationNumber?: string | null; contactName?: string | null; contactEmail?: string | null; contactPhone?: string | null; coverageNotes?: string | null }) {
  const name = input.name.trim().slice(0, 180); if (name.length < 2) throw new Error("Enter an implementation agency name");
  const existing = (await db().select().from(implementationAgencies).where(eq(implementationAgencies.name, name)).limit(1))[0]; if (existing) throw new Error("An agency with this name already exists");
  const inserted = await db().insert(implementationAgencies).values({ name, registrationNumber: input.registrationNumber?.trim().slice(0, 120) || null, contactName: input.contactName?.trim().slice(0, 140) || null, contactEmail: input.contactEmail?.trim().toLowerCase().slice(0, 320) || null, contactPhone: input.contactPhone?.trim().slice(0, 40) || null, coverageNotes: input.coverageNotes?.trim().slice(0, 2000) || null, active: true, createdByAdminId: adminId });
  const agency = (await db().select().from(implementationAgencies).where(eq(implementationAgencies.id, Number(inserted[0].insertId))).limit(1))[0]; if (!agency) throw new Error("Implementation agency creation failed");
  await recordAdminAudit(adminId, "csr.implementation_agency_created", "implementation_agency", agency.id, null, agency); return agency;
}

export async function csrCreateBudget(userId: number, input: CsrBudgetInput) {
  const profile = await csrProfileForUser(userId); if (!profile?.active) throw new Error("Active CSR profile required");
  const label = input.label.trim().slice(0, 120); if (label.length < 2 || !Number.isInteger(input.totalPaise) || input.totalPaise < 100) throw new Error("Enter a budget label and amount of at least ₹1");
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) throw new Error("Budget end date must be after start date");
  const inserted = await db().insert(csrBudgets).values({ csrProfileId: profile.id, label, totalPaise: input.totalPaise, startsAt: input.startsAt || null, endsAt: input.endsAt || null, active: true });
  const budget = (await db().select().from(csrBudgets).where(eq(csrBudgets.id, Number(inserted[0].insertId))).limit(1))[0]; if (!budget) throw new Error("CSR budget creation failed");
  await recordAdminAudit(userId, "csr.budget_created", "csr_budget", budget.id, null, budget); return budget;
}

export async function csrSaveSponsorship(userId: number, input: CsrSponsorshipInput) {
  const profile = await csrProfileForUser(userId); if (!profile?.active) throw new Error("Active CSR profile required");
  const [budget, event, venue, agency] = await Promise.all([
    db().select().from(csrBudgets).where(and(eq(csrBudgets.id, input.budgetId), eq(csrBudgets.csrProfileId, profile.id), eq(csrBudgets.active, true))).limit(1),
    db().select().from(events).where(eq(events.id, input.eventId)).limit(1),
    db().select().from(approvedVenues).where(and(eq(approvedVenues.id, input.approvedVenueId), eq(approvedVenues.active, true))).limit(1),
    db().select().from(implementationAgencies).where(and(eq(implementationAgencies.id, input.implementationAgencyId), eq(implementationAgencies.active, true))).limit(1),
  ]);
  if (!budget[0] || !event[0] || !venue[0] || !agency[0]) throw new Error("Select an active budget, live event, approved funding location, and implementation agency");
  if (event[0].status !== "live" || !event[0].categoryId) throw new Error("Choose an existing live event with a recorded activity");
  const category = await db().select().from(categories).where(eq(categories.id, event[0].categoryId)).limit(1);
  if (!category[0]) throw new Error("The selected event no longer has an eligible approved activity");
  if (!Number.isInteger(input.amountPaise) || input.amountPaise < 100) throw new Error("Sponsorship amount must be at least ₹1");
  if (event[0].organizerId === userId) throw new Error("CSR sponsorship must remain distinct from event organisation");
  const existing = await db().select().from(csrSponsorships).where(and(eq(csrSponsorships.csrProfileId, profile.id), eq(csrSponsorships.eventId, event[0].id))).limit(10);
  if (existing.some(row => row.status !== "mcd_rejected" && row.status !== "rejected" && row.status !== "cancelled")) throw new Error("This company already has an active sponsorship record for the selected event");
  const inserted = await db().insert(csrSponsorships).values({ csrProfileId: profile.id, budgetId: budget[0].id, eventId: event[0].id, activityCategoryId: category[0].id, approvedVenueId: venue[0].id, implementationAgencyId: agency[0].id, city: venue[0].city, zone: venue[0].zone, ward: venue[0].ward, amountPaise: input.amountPaise, purpose: input.purpose?.trim().slice(0, 2000) || null, status: "draft" });
  const sponsorship = (await db().select().from(csrSponsorships).where(eq(csrSponsorships.id, Number(inserted[0].insertId))).limit(1))[0]; if (!sponsorship) throw new Error("Sponsorship record creation failed");
  await recordAdminAudit(userId, "csr.sponsorship_drafted", "csr_sponsorship", sponsorship.id, null, sponsorship); return sponsorship;
}

export async function csrSubmitSponsorship(userId: number, sponsorshipId: number, note: string) {
  const profile = await csrProfileForUser(userId); if (!profile) throw new Error("CSR profile not found");
  const before = (await db().select().from(csrSponsorships).where(and(eq(csrSponsorships.id, sponsorshipId), eq(csrSponsorships.csrProfileId, profile.id))).limit(1))[0];
  if (!before || (before.status !== "draft" && before.status !== "mcd_rejected" && before.status !== "rejected")) throw new Error("Only CSR drafts or returned sponsorships can be submitted");
  const budget = (await db().select().from(csrBudgets).where(eq(csrBudgets.id, before.budgetId)).limit(1))[0];
  if (!budget || budget.committedPaise + before.amountPaise > budget.totalPaise) throw new Error("This sponsorship exceeds the remaining approved budget");
  await db().update(csrSponsorships).set({ status: "submitted", csrApprovalNote: note.trim().slice(0, 1000) || null, submittedAt: new Date(), mcdReviewNote: null, mcdReviewedAt: null, mcdReviewedByUserId: null, adminApprovalNote: null, reviewedAt: null, reviewedByAdminId: null }).where(eq(csrSponsorships.id, sponsorshipId));
  const after = (await db().select().from(csrSponsorships).where(eq(csrSponsorships.id, sponsorshipId)).limit(1))[0];
  if (!after) throw new Error("Sponsorship submission failed"); await recordAdminAudit(userId, "csr.sponsorship_submitted", "csr_sponsorship", sponsorshipId, before, after); return after;
}

export async function mcdReviewCsrSponsorship(mcdId: number, sponsorshipId: number, decision: "approved" | "rejected", note: string) {
  const before = (await db().select().from(csrSponsorships).where(eq(csrSponsorships.id, sponsorshipId)).limit(1))[0];
  if (!before || before.status !== "submitted") throw new Error("Only sponsorships awaiting MCD review can be reviewed");
  const reviewNote = note.trim().slice(0, 1000); if (decision === "rejected" && reviewNote.length < 4) throw new Error("Provide clear CSR guidance when returning a sponsorship");
  const status = decision === "approved" ? "mcd_approved" : "mcd_rejected";
  await db().update(csrSponsorships).set({ status, mcdReviewNote: reviewNote || null, mcdReviewedAt: new Date(), mcdReviewedByUserId: mcdId }).where(eq(csrSponsorships.id, sponsorshipId));
  const after = (await db().select().from(csrSponsorships).where(eq(csrSponsorships.id, sponsorshipId)).limit(1))[0]; if (!after) throw new Error("MCD CSR sponsorship review failed");
  await recordAdminAudit(mcdId, `mcd.csr_sponsorship_${decision}`, "csr_sponsorship", sponsorshipId, before, after); return after;
}

export async function adminReviewCsrSponsorship(adminId: number, sponsorshipId: number, decision: "approved" | "rejected", note: string) {
  const before = (await db().select().from(csrSponsorships).where(eq(csrSponsorships.id, sponsorshipId)).limit(1))[0];
  if (!before || before.status !== "mcd_approved") throw new Error("Only MCD-cleared CSR sponsorships can receive master approval");
  const reviewNote = note.trim().slice(0, 1000); if (decision === "rejected" && reviewNote.length < 4) throw new Error("Provide clear guidance when returning a sponsorship");
  if (decision === "approved") {
    const budget = (await db().select().from(csrBudgets).where(eq(csrBudgets.id, before.budgetId)).limit(1))[0];
    if (!budget || budget.committedPaise + before.amountPaise > budget.totalPaise) throw new Error("This approval exceeds the remaining CSR budget");
    await db().update(csrBudgets).set({ committedPaise: budget.committedPaise + before.amountPaise }).where(eq(csrBudgets.id, budget.id));
  }
  await db().update(csrSponsorships).set({ status: decision, adminApprovalNote: reviewNote || null, reviewedAt: new Date(), reviewedByAdminId: adminId }).where(eq(csrSponsorships.id, sponsorshipId));
  const after = (await db().select().from(csrSponsorships).where(eq(csrSponsorships.id, sponsorshipId)).limit(1))[0]; if (!after) throw new Error("CSR sponsorship review failed");
  await recordAdminAudit(adminId, `csr.sponsorship_${decision}`, "csr_sponsorship", sponsorshipId, before, after); return after;
}

export async function csrSaveSponsorshipRequest(userId: number, input: CsrSponsorshipRequestInput, requestId?: number | null) {
  const profile = await csrProfileForUser(userId); if (!profile?.active) throw new Error("Active CSR profile required");
  const budget = (await db().select().from(csrBudgets).where(and(eq(csrBudgets.id, input.budgetId), eq(csrBudgets.csrProfileId, profile.id), eq(csrBudgets.active, true))).limit(1))[0];
  if (!budget) throw new Error("Choose an active CSR budget");
  const eventType = input.eventType.trim().slice(0, 120); const intendedAudience = input.intendedAudience.trim().slice(0, 220); const details = input.details.trim().slice(0, 4000);
  if (!eventType || !intendedAudience || details.length < 20) throw new Error("Add an event type, intended audience, and at least 20 characters of sponsorship details");
  if (!Number.isInteger(input.amountPaise) || input.amountPaise < 100) throw new Error("Sponsorship amount must be at least ₹1");
  if (input.preferredStartDate && input.preferredEndDate && input.preferredEndDate <= input.preferredStartDate) throw new Error("Preferred end date must be after preferred start date");
  if (input.estimatedCapacity !== null && input.estimatedCapacity !== undefined && (!Number.isInteger(input.estimatedCapacity) || input.estimatedCapacity < 1 || input.estimatedCapacity > 1_000_000)) throw new Error("Estimated capacity must be between 1 and 1000000");
  const values = { budgetId: budget.id, requestKind: input.requestKind, eventType, titlePreference: input.titlePreference?.trim().slice(0, 180) || null, intendedAudience, cityPreference: input.cityPreference?.trim().slice(0, 100) || null, zonePreference: input.zonePreference?.trim().slice(0, 100) || null, wardPreference: input.wardPreference?.trim().slice(0, 100) || null, preferredStartDate: input.preferredStartDate || null, preferredEndDate: input.preferredEndDate || null, estimatedCapacity: input.estimatedCapacity || null, accessibilityNeeds: input.accessibilityNeeds?.trim().slice(0, 2000) || null, successIndicators: input.successIndicators?.trim().slice(0, 2000) || null, details, amountPaise: input.amountPaise, csrSubmissionNote: input.submissionNote?.trim().slice(0, 1000) || null };
  if (requestId) {
    const before = (await db().select().from(csrSponsorshipRequests).where(and(eq(csrSponsorshipRequests.id, requestId), eq(csrSponsorshipRequests.csrProfileId, profile.id))).limit(1))[0];
    if (!before || !["draft", "changes_requested"].includes(before.status)) throw new Error("Only drafts or returned requests can be revised");
    await db().update(csrSponsorshipRequests).set(values).where(eq(csrSponsorshipRequests.id, requestId));
    const request = (await db().select().from(csrSponsorshipRequests).where(eq(csrSponsorshipRequests.id, requestId)).limit(1))[0];
    if (!request) throw new Error("CSR sponsorship request update failed");
    await recordAdminAudit(userId, "csr.request_updated", "csr_sponsorship_request", request.id, before, request); return request;
  }
  const inserted = await db().insert(csrSponsorshipRequests).values({ publicId: createPublicCsrRequestId(), csrProfileId: profile.id, ...values, status: "draft" });
  const request = (await db().select().from(csrSponsorshipRequests).where(eq(csrSponsorshipRequests.id, Number(inserted[0].insertId))).limit(1))[0];
  if (!request) throw new Error("CSR sponsorship request creation failed");
  await recordAdminAudit(userId, "csr.request_drafted", "csr_sponsorship_request", request.id, null, request); return request;
}

export async function csrSubmitSponsorshipRequest(userId: number, requestId: number, note: string) {
  const profile = await csrProfileForUser(userId); if (!profile) throw new Error("CSR profile not found");
  const before = (await db().select().from(csrSponsorshipRequests).where(and(eq(csrSponsorshipRequests.id, requestId), eq(csrSponsorshipRequests.csrProfileId, profile.id))).limit(1))[0];
  if (!before || !["draft", "changes_requested"].includes(before.status)) throw new Error("Only drafts or requests returned for additions can be submitted");
	const budget = (await db().select().from(csrBudgets).where(eq(csrBudgets.id, before.budgetId)).limit(1))[0];
	if (!budget || budget.committedPaise + before.amountPaise > budget.totalPaise) throw new Error("This request exceeds the remaining CSR budget");
	const authorization = await authorizeCapabilityExecution(userId, { capabilityCode: "CSR_SPONSORSHIP", functionCode: "CSR_BRIEF_SUBMIT", resourceScope: { city: before.cityPreference, zone: before.zonePreference, ward: before.wardPreference }, enforce: isCsrCapabilityAuthorizationEnforced(), compatibilityReason: "CSR capability enforcement is disabled; retained sponsor authorization remains authoritative." });
	if (!authorization.allowed) throw new Error(authorization.reason);
	await db().update(csrSponsorshipRequests).set({ status: "submitted", csrSubmissionNote: note.trim().slice(0, 1000) || null, adminReviewNote: null, reviewedByAdminId: null, reviewedAt: null }).where(eq(csrSponsorshipRequests.id, requestId));
	const after = (await db().select().from(csrSponsorshipRequests).where(eq(csrSponsorshipRequests.id, requestId)).limit(1))[0];
	if (!after) throw new Error("CSR sponsorship request submission failed"); await recordAdminAudit(userId, "csr.request_submitted", "csr_sponsorship_request", requestId, before, after); if (authorization.grantId) await recordCapabilityAudit(userId, "capability.execution_authorized", { grantId: authorization.grantId, afterState: { capabilityCode: "CSR_SPONSORSHIP", functionCode: "CSR_BRIEF_SUBMIT", requestId, resourceScope: { city: before.cityPreference, zone: before.zonePreference, ward: before.wardPreference } } }); return after;
}

export async function adminReviewCsrSponsorshipRequest(adminId: number, requestId: number, decision: "approved" | "changes_requested" | "rejected", note: string) {
  const before = (await db().select().from(csrSponsorshipRequests).where(eq(csrSponsorshipRequests.id, requestId)).limit(1))[0];
  if (!before || before.status !== "submitted") throw new Error("Only submitted CSR sponsorship requests can be reviewed");
  const reviewNote = note.trim().slice(0, 1000); if ((decision === "changes_requested" || decision === "rejected") && reviewNote.length < 4) throw new Error("Provide a clear reason or specification for this decision");
  const status = decision === "approved" ? "approved_pending_assignment" : decision;
  await db().update(csrSponsorshipRequests).set({ status, adminReviewNote: reviewNote || null, reviewedByAdminId: adminId, reviewedAt: new Date() }).where(eq(csrSponsorshipRequests.id, requestId));
  const after = (await db().select().from(csrSponsorshipRequests).where(eq(csrSponsorshipRequests.id, requestId)).limit(1))[0];
  if (!after) throw new Error("CSR request review failed"); await recordAdminAudit(adminId, `csr.request_${decision}`, "csr_sponsorship_request", requestId, before, after); return after;
}

export async function adminAssignCsrSponsorshipRequest(adminId: number, requestId: number, eventId: number, note: string) {
  const before = (await db().select().from(csrSponsorshipRequests).where(eq(csrSponsorshipRequests.id, requestId)).limit(1))[0];
  if (!before || before.status !== "approved_pending_assignment") throw new Error("Only approved requests awaiting assignment can be matched to an event");
  const [event, budget] = await Promise.all([db().select().from(events).where(eq(events.id, eventId)).limit(1), db().select().from(csrBudgets).where(eq(csrBudgets.id, before.budgetId)).limit(1)]);
  if (!event[0] || event[0].status !== "live") throw new Error("Assign a currently live event that can receive CSR sponsorship");
  if (!budget[0] || budget[0].committedPaise + before.amountPaise > budget[0].totalPaise) throw new Error("Assignment exceeds the remaining CSR budget");
  const assignmentNote = note.trim().slice(0, 1000); if (assignmentNote.length < 4) throw new Error("Add a clear event-matching note for the sponsor");
  await db().update(csrBudgets).set({ committedPaise: budget[0].committedPaise + before.amountPaise }).where(eq(csrBudgets.id, budget[0].id));
  await db().update(csrSponsorshipRequests).set({ status: "assigned", assignedEventId: event[0].id, assignedByAdminId: adminId, assignedAt: new Date(), adminReviewNote: assignmentNote }).where(eq(csrSponsorshipRequests.id, requestId));
  const after = (await db().select().from(csrSponsorshipRequests).where(eq(csrSponsorshipRequests.id, requestId)).limit(1))[0];
  if (!after) throw new Error("CSR event assignment failed"); await recordAdminAudit(adminId, "csr.request_event_assigned", "csr_sponsorship_request", requestId, before, after); return after;
}

export async function getCsrWorkspaceData(userId: number) {
  const profile = await csrProfileForUser(userId); if (!profile) throw new Error("CSR company profile not found");
  const [budgets, requestRows] = await Promise.all([
    db().select().from(csrBudgets).where(eq(csrBudgets.csrProfileId, profile.id)).orderBy(desc(csrBudgets.updatedAt)),
    db().select({ request: csrSponsorshipRequests, budget: csrBudgets, event: events, organizer: users }).from(csrSponsorshipRequests).innerJoin(csrBudgets, eq(csrSponsorshipRequests.budgetId, csrBudgets.id)).leftJoin(events, eq(csrSponsorshipRequests.assignedEventId, events.id)).leftJoin(users, eq(events.organizerId, users.id)).where(eq(csrSponsorshipRequests.csrProfileId, profile.id)).orderBy(desc(csrSponsorshipRequests.updatedAt)),
  ]);
  const sponsoredEventIds = new Set(requestRows.filter(row => row.request.status === "assigned" && row.event).map(row => row.event!.id));
  const participationRows = sponsoredEventIds.size ? await db().select({ registration: registrations, eventId: events.id }).from(registrations).innerJoin(events, eq(registrations.eventId, events.id)) : [];
  const participation = participationRows.filter(row => sponsoredEventIds.has(row.eventId));
  const cityImpact = new Map<string, { city: string; commitments: number; events: number; participations: number; checkedIn: number }>();
  requestRows.filter(row => row.request.status === "assigned" && row.event).forEach(row => { const city = row.event!.city || row.request.cityPreference || "City not recorded"; const current = cityImpact.get(city) || { city, commitments: 0, events: 0, participations: 0, checkedIn: 0 }; current.commitments += row.request.amountPaise; current.events += 1; const eventParticipation = participation.filter(item => item.eventId === row.event!.id); current.participations += eventParticipation.length; current.checkedIn += eventParticipation.filter(item => item.registration.status === "checked_in").length; cityImpact.set(current.city, current); });
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.totalPaise, 0); const committed = budgets.reduce((sum, budget) => sum + budget.committedPaise, 0);
  return { profile, budgets, requests: requestRows, impactByCity: [...cityImpact.values()].sort((left, right) => right.commitments - left.commitments), metrics: { totalBudget, committed, remaining: totalBudget - committed, fundedEvents: sponsoredEventIds.size, participation: participation.length, checkedIn: participation.filter(row => row.registration.status === "checked_in").length, awaitingReview: requestRows.filter(row => row.request.status === "submitted").length, awaitingAssignment: requestRows.filter(row => row.request.status === "approved_pending_assignment").length } };
}

export async function getAdminCsrWorkspaceData() {
  const [profiles, budgets, requests, matchingEvents, capabilityRequests] = await Promise.all([
    db().select({ profile: csrProfiles, user: users }).from(csrProfiles).innerJoin(users, eq(csrProfiles.userId, users.id)).orderBy(asc(csrProfiles.companyName)),
    db().select().from(csrBudgets).orderBy(desc(csrBudgets.updatedAt)),
    db().select({ request: csrSponsorshipRequests, profile: csrProfiles, budget: csrBudgets, event: events, organizer: users }).from(csrSponsorshipRequests).innerJoin(csrProfiles, eq(csrSponsorshipRequests.csrProfileId, csrProfiles.id)).innerJoin(csrBudgets, eq(csrSponsorshipRequests.budgetId, csrBudgets.id)).leftJoin(events, eq(csrSponsorshipRequests.assignedEventId, events.id)).leftJoin(users, eq(events.organizerId, users.id)).orderBy(desc(csrSponsorshipRequests.updatedAt)),
    db().select({ event: events, organizer: users, category: categories }).from(events).innerJoin(users, eq(events.organizerId, users.id)).leftJoin(categories, eq(events.categoryId, categories.id)).where(eq(events.status, "live")).orderBy(desc(events.updatedAt)),
    db().select({ request: csrSponsorshipRequests, profile: csrProfiles, budget: csrBudgets, sponsorship: csrCapabilitySponsorships, assignment: csrEventAssignments, event: events, concept: csrFutureEventConcepts }).from(csrSponsorshipRequests).innerJoin(csrProfiles, eq(csrSponsorshipRequests.csrProfileId, csrProfiles.id)).innerJoin(csrBudgets, eq(csrSponsorshipRequests.budgetId, csrBudgets.id)).leftJoin(csrCapabilitySponsorships, eq(csrCapabilitySponsorships.requestId, csrSponsorshipRequests.id)).leftJoin(csrEventAssignments, eq(csrEventAssignments.sponsorshipId, csrCapabilitySponsorships.id)).leftJoin(events, eq(csrEventAssignments.eventId, events.id)).leftJoin(csrFutureEventConcepts, eq(csrEventAssignments.futureEventConceptId, csrFutureEventConcepts.id)).where(isNotNull(csrSponsorshipRequests.capabilityGrantId)).orderBy(desc(csrSponsorshipRequests.updatedAt)),
  ]);
  return { profiles, budgets, requests, matchingEvents, capabilityRequests, metrics: { sponsors: profiles.length, awaitingReview: requests.filter(row => row.request.status === "submitted").length, awaitingAssignment: requests.filter(row => row.request.status === "approved_pending_assignment").length, assigned: requests.filter(row => row.request.status === "assigned").length, committed: requests.filter(row => row.request.status === "assigned").reduce((sum, row) => sum + row.request.amountPaise, 0) } };
}

type CsrCapabilityFunction = "CSR_BRIEF_SUBMIT" | "CSR_ASSIGNED_EVENT_VIEW" | "CSR_ASSIGNED_PARTICIPANT_VIEW" | "CSR_FUNDING_TRACK";

async function requireCsrCapabilityFunction(userId: number, grantId: number, functionCode: CsrCapabilityFunction, scope: CapabilityResourceScope = {}) {
  if (!isCsrCapabilityWorkspaceEnabled()) throw new Error("The CSR capability workspace is disabled");
  const context = await getActiveCapabilityWorkspaceContext(userId, "CSR_SPONSORSHIP", grantId); if (!context) throw new Error("This CSR workspace is not active for your account");
  if (!context.workspace.functions.some(item => item.code === functionCode)) throw new Error("This CSR function is not selected for the active workspace");
  const authorization = evaluateCapabilityAuthorization({ functionCode, resourceScope: scope, candidates: [{ grantId: context.workspace.grant.id, status: context.workspace.grant.status, scopeType: context.workspace.grant.scopeType, state: context.workspace.grant.scopeState, district: context.workspace.grant.scopeDistrict, city: context.workspace.grant.scopeCity, zone: context.workspace.grant.scopeZone, ward: context.workspace.grant.scopeWard, startsAt: context.workspace.grant.startsAt, endsAt: context.workspace.grant.endsAt, functionCodes: context.workspace.functions.map(item => item.code) }] });
  if (!authorization.allowed || authorization.grantId !== grantId) throw new Error(authorization.allowed ? "This action is not available through the selected CSR workspace" : authorization.reason);
  return context;
}

export async function getCsrCapabilityWorkspaceData(userId: number, grantId: number) {
  const context = await getActiveCapabilityWorkspaceContext(userId, "CSR_SPONSORSHIP", grantId); if (!context || !isCsrCapabilityWorkspaceEnabled()) return undefined;
  const profile = await csrProfileForUser(userId); if (!profile) return { workspace: context.workspace, profile: null, budgets: [], assignments: [], metrics: { drafts: 0, submitted: 0, assigned: 0, committed: 0 } };
  const [budgets, rows] = await Promise.all([
    db().select().from(csrBudgets).where(eq(csrBudgets.csrProfileId, profile.id)).orderBy(desc(csrBudgets.updatedAt)),
    db().select({ request: csrSponsorshipRequests, budget: csrBudgets, sponsorship: csrCapabilitySponsorships, assignment: csrEventAssignments, event: events, concept: csrFutureEventConcepts }).from(csrSponsorshipRequests).innerJoin(csrBudgets, eq(csrSponsorshipRequests.budgetId, csrBudgets.id)).leftJoin(csrCapabilitySponsorships, eq(csrCapabilitySponsorships.requestId, csrSponsorshipRequests.id)).leftJoin(csrEventAssignments, eq(csrEventAssignments.sponsorshipId, csrCapabilitySponsorships.id)).leftJoin(events, eq(csrEventAssignments.eventId, events.id)).leftJoin(csrFutureEventConcepts, eq(csrEventAssignments.futureEventConceptId, csrFutureEventConcepts.id)).where(and(eq(csrSponsorshipRequests.csrProfileId, profile.id), eq(csrSponsorshipRequests.capabilityGrantId, grantId))).orderBy(desc(csrSponsorshipRequests.updatedAt)),
  ]);
  return { workspace: context.workspace, profile, budgets, assignments: rows, metrics: { drafts: rows.filter(row => row.request.status === "draft" || row.request.status === "changes_requested").length, submitted: rows.filter(row => row.request.status === "submitted").length, assigned: rows.filter(row => row.assignment?.status === "assigned").length, committed: rows.filter(row => row.sponsorship?.fundingStatus === "committed" || row.sponsorship?.fundingStatus === "funded" || row.sponsorship?.fundingStatus === "complete").reduce((sum, row) => sum + row.request.amountPaise, 0) } };
}

export async function saveCsrCapabilityProfile(userId: number, grantId: number, input: CsrProfileInput) {
  await requireCsrCapabilityFunction(userId, grantId, "CSR_BRIEF_SUBMIT");
  const companyName = input.companyName.trim().slice(0, 180); const contactName = input.contactName.trim().slice(0, 140); const contactEmail = input.contactEmail.trim().toLowerCase();
  if (companyName.length < 2 || contactName.length < 2 || !contactEmail.includes("@")) throw new Error("Complete company, authorized contact, and official email details");
  const values = { companyName, registrationNumber: input.registrationNumber?.trim().slice(0, 120) || null, foundationName: input.foundationName?.trim().slice(0, 180) || null, contactName, contactEmail, contactPhone: input.contactPhone?.trim().slice(0, 40) || null, focusAreas: input.focusAreas?.trim().slice(0, 2000) || null, active: true };
  await db().insert(csrProfiles).values({ userId, ...values }).onDuplicateKeyUpdate({ set: values });
  const profile = await csrProfileForUser(userId); if (!profile) throw new Error("CSR profile update failed");
  await recordCapabilityExecutionAuthorization(userId, { grantId, capabilityCode: "CSR_SPONSORSHIP", functionCode: "CSR_BRIEF_SUBMIT", context: { profileId: profile.id, action: "profile_saved" } }); return profile;
}

export async function csrCreateCapabilityBudget(userId: number, grantId: number, input: CsrBudgetInput) {
  await requireCsrCapabilityFunction(userId, grantId, "CSR_BRIEF_SUBMIT");
  const budget = await csrCreateBudget(userId, input); await recordCapabilityExecutionAuthorization(userId, { grantId, capabilityCode: "CSR_SPONSORSHIP", functionCode: "CSR_BRIEF_SUBMIT", context: { budgetId: budget.id, action: "budget_created" } }); return budget;
}

export async function csrSaveCapabilitySponsorshipRequest(userId: number, grantId: number, input: CsrSponsorshipRequestInput, requestId?: number | null) {
  await requireCsrCapabilityFunction(userId, grantId, "CSR_BRIEF_SUBMIT", { city: input.cityPreference, zone: input.zonePreference, ward: input.wardPreference });
  const profile = await csrProfileForUser(userId); if (!profile) throw new Error("Complete the CSR profile before saving a sponsorship request");
  if (requestId) { const existing = (await db().select().from(csrSponsorshipRequests).where(and(eq(csrSponsorshipRequests.id, requestId), eq(csrSponsorshipRequests.csrProfileId, profile.id))).limit(1))[0]; if (!existing || existing.capabilityGrantId !== grantId) throw new Error("This request does not belong to the selected CSR workspace"); }
  const request = await csrSaveSponsorshipRequest(userId, input, requestId); if (!requestId) await db().update(csrSponsorshipRequests).set({ capabilityGrantId: grantId }).where(eq(csrSponsorshipRequests.id, request.id));
  const linked = (await db().select().from(csrSponsorshipRequests).where(eq(csrSponsorshipRequests.id, request.id)).limit(1))[0]; if (!linked || linked.capabilityGrantId !== grantId) throw new Error("CSR request workspace link failed");
  await recordCapabilityExecutionAuthorization(userId, { grantId, capabilityCode: "CSR_SPONSORSHIP", functionCode: "CSR_BRIEF_SUBMIT", context: { requestId: linked.id, requestPublicId: linked.publicId, action: requestId ? "request_updated" : "request_drafted" } }); return linked;
}

export async function csrSubmitCapabilitySponsorshipRequest(userId: number, grantId: number, requestId: number, note: string) {
  const profile = await csrProfileForUser(userId); if (!profile) throw new Error("Complete the CSR profile before submitting a sponsorship request");
  const request = (await db().select().from(csrSponsorshipRequests).where(and(eq(csrSponsorshipRequests.id, requestId), eq(csrSponsorshipRequests.csrProfileId, profile.id), eq(csrSponsorshipRequests.capabilityGrantId, grantId))).limit(1))[0];
  if (!request) throw new Error("CSR sponsorship request not found");
  await requireCsrCapabilityFunction(userId, grantId, "CSR_BRIEF_SUBMIT", { city: request.cityPreference, zone: request.zonePreference, ward: request.wardPreference });
  const submitted = await csrSubmitSponsorshipRequest(userId, requestId, note);
  await recordCapabilityExecutionAuthorization(userId, { grantId, capabilityCode: "CSR_SPONSORSHIP", functionCode: "CSR_BRIEF_SUBMIT", context: { requestId, requestPublicId: submitted.publicId } });
  const administrator = (await db().select().from(users).where(eq(users.role, "admin")).limit(1))[0];
  if (administrator) await recordCapabilityDecisionNotification({ userId: administrator.id, grantId, kind: "csr_request_submitted", title: "CSR capability request awaiting review", body: `Request ${submitted.publicId || `#${submitted.id}`} is ready for administrator review.`, actionUrl: "/admin?view=csr" });
  return submitted;
}

export async function adminReviewCsrCapabilityRequest(adminId: number, requestId: number, decision: "approved" | "changes_requested" | "rejected", note: string) {
  const stageRequest = (await db().select().from(csrSponsorshipRequests).where(and(eq(csrSponsorshipRequests.id, requestId), isNotNull(csrSponsorshipRequests.capabilityGrantId))).limit(1))[0]; if (!stageRequest) throw new Error("This is not a Stage 8 CSR capability request");
  const reviewed = await adminReviewCsrSponsorshipRequest(adminId, requestId, decision, note);
  const profile = (await db().select().from(csrProfiles).where(eq(csrProfiles.id, reviewed.csrProfileId)).limit(1))[0]; if (!profile) throw new Error("CSR profile not found for review notification");
  await recordCapabilityDecisionNotification({ userId: profile.userId, kind: `csr_request_${decision}`, title: decision === "approved" ? "CSR request approved for matching" : decision === "changes_requested" ? "CSR request returned for revision" : "CSR request rejected", body: note, actionUrl: "/dashboard/workspaces/CSR_SPONSORSHIP" });
  return reviewed;
}

export async function adminAssignCsrCapabilityRequest(adminId: number, input: { requestId: number; eventId?: number | null; concept?: { title: string; notes: string } | null; assignmentNote: string; approvedParticipantFields: string[] }) {
  const before = (await db().select().from(csrSponsorshipRequests).where(eq(csrSponsorshipRequests.id, input.requestId)).limit(1))[0];
  if (!before || !before.capabilityGrantId || before.status !== "approved_pending_assignment") throw new Error("Only approved Stage 8 CSR requests awaiting assignment can be matched");
  const eventId = input.eventId || null; const hasConcept = Boolean(input.concept); if ((eventId ? 1 : 0) + (hasConcept ? 1 : 0) !== 1) throw new Error("Choose exactly one live event or one future-event concept");
  const note = input.assignmentNote.trim().slice(0, 1000); if (note.length < 4) throw new Error("Add a clear assignment reason");
  const allowedFields = ["name", "email", "registrationStatus", "attendanceStatus", "participationDate"]; const approvedFields = [...new Set(input.approvedParticipantFields.filter(field => allowedFields.includes(field)))];
  const [budget, event] = await Promise.all([db().select().from(csrBudgets).where(eq(csrBudgets.id, before.budgetId)).limit(1), eventId ? db().select().from(events).where(and(eq(events.id, eventId), eq(events.status, "live"))).limit(1) : Promise.resolve([])]);
  if (!budget[0] || budget[0].committedPaise + before.amountPaise > budget[0].totalPaise) throw new Error("Assignment exceeds the remaining CSR budget");
  if (eventId && !event[0]) throw new Error("Assign only a currently live event");
  if (hasConcept && before.requestKind !== "future_event") throw new Error("A future-event concept can be assigned only to a future-event CSR request");
  const result = await db().transaction(async tx => {
    let conceptId: number | null = null;
    if (input.concept) {
      const title = input.concept.title.trim().slice(0, 180); const notes = input.concept.notes.trim().slice(0, 4000); if (title.length < 3 || notes.length < 10) throw new Error("Provide a title and clear future-event concept notes");
      const createdConcept = await tx.insert(csrFutureEventConcepts).values({ publicId: createPublicCsrConceptId(), requestId: before.id, title, activityType: before.eventType, city: before.cityPreference, zone: before.zonePreference, ward: before.wardPreference, proposedStartsAt: before.preferredStartDate, proposedEndsAt: before.preferredEndDate, notes, createdByAdminId: adminId }); conceptId = Number(createdConcept[0].insertId);
    }
    const createdSponsorship = await tx.insert(csrCapabilitySponsorships).values({ publicId: createPublicCsrSponsorshipId(), requestId: before.id, fundingStatus: "committed" }); const sponsorshipId = Number(createdSponsorship[0].insertId);
    const createdAssignment = await tx.insert(csrEventAssignments).values({ publicId: createPublicCsrAssignmentId(), sponsorshipId, eventId, futureEventConceptId: conceptId, approvedParticipantFields: approvedFields, assignmentNote: note, assignedByAdminId: adminId }); const assignmentId = Number(createdAssignment[0].insertId);
    await tx.update(csrBudgets).set({ committedPaise: budget[0].committedPaise + before.amountPaise }).where(eq(csrBudgets.id, budget[0].id));
    await tx.update(csrSponsorshipRequests).set({ status: "assigned", assignedEventId: eventId, assignedByAdminId: adminId, assignedAt: new Date(), adminReviewNote: note }).where(eq(csrSponsorshipRequests.id, before.id));
    const after = (await tx.select().from(csrSponsorshipRequests).where(eq(csrSponsorshipRequests.id, before.id)).limit(1))[0];
    if (!after) throw new Error("CSR assignment failed");
    await recordAdminAudit(adminId, "csr_capability.request_assigned", "csr_sponsorship_request", before.id, before, { request: after, sponsorshipId, assignmentId, eventId, conceptId, approvedFields }, tx);
    return { request: after, sponsorshipId, assignmentId, conceptId };
  });
  const profile = (await db().select().from(csrProfiles).where(eq(csrProfiles.id, before.csrProfileId)).limit(1))[0]; if (profile) await recordCapabilityDecisionNotification({ userId: profile.userId, kind: "csr_request_assigned", title: "CSR request assigned", body: note, actionUrl: "/dashboard/workspaces/CSR_SPONSORSHIP" });
  return result;
}

export async function adminRecordCsrCapabilityFunding(adminId: number, sponsorshipId: number, input: { transactionReference: string; transactionDate: Date | null; reportSummary?: string | null; complete?: boolean }) {
  const before = (await db().select().from(csrCapabilitySponsorships).where(eq(csrCapabilitySponsorships.id, sponsorshipId)).limit(1))[0]; if (!before) throw new Error("CSR sponsorship not found");
  const assignment = (await db().select().from(csrEventAssignments).where(eq(csrEventAssignments.sponsorshipId, sponsorshipId)).limit(1))[0]; if (!assignment?.eventId) throw new Error("Funding can be recorded only after a real assigned event exists");
  const reference = input.transactionReference.trim().slice(0, 160); if (reference.length < 3) throw new Error("Record a funding transaction reference"); const reportSummary = input.reportSummary?.trim().slice(0, 4000) || null;
  if (input.complete && !reportSummary) throw new Error("Record the approved event report before completing a sponsorship");
  const status = input.complete ? "complete" as const : "funded" as const;
  await db().update(csrCapabilitySponsorships).set({ fundingStatus: status, transactionReference: reference, transactionDate: input.transactionDate, fundingRecordedAt: new Date(), reportSummary, reportRecordedAt: reportSummary ? new Date() : null, completedAt: input.complete ? new Date() : null }).where(eq(csrCapabilitySponsorships.id, sponsorshipId));
  const after = (await db().select().from(csrCapabilitySponsorships).where(eq(csrCapabilitySponsorships.id, sponsorshipId)).limit(1))[0]; if (!after) throw new Error("CSR funding update failed");
  await recordAdminAudit(adminId, "csr_capability.funding_recorded", "csr_capability_sponsorship", sponsorshipId, before, after); return after;
}

export async function getCsrCapabilityAssignedParticipants(userId: number, grantId: number, assignmentPublicId: string) {
  const context = await requireCsrCapabilityFunction(userId, grantId, "CSR_ASSIGNED_PARTICIPANT_VIEW"); const profile = await csrProfileForUser(userId); if (!profile || !/^CSR-ASN-[A-F0-9]{16}$/.test(assignmentPublicId)) return undefined;
  const assignmentRow = (await db().select({ assignment: csrEventAssignments, request: csrSponsorshipRequests }).from(csrEventAssignments).innerJoin(csrCapabilitySponsorships, eq(csrEventAssignments.sponsorshipId, csrCapabilitySponsorships.id)).innerJoin(csrSponsorshipRequests, eq(csrCapabilitySponsorships.requestId, csrSponsorshipRequests.id)).where(and(eq(csrEventAssignments.publicId, assignmentPublicId), eq(csrSponsorshipRequests.csrProfileId, profile.id), eq(csrSponsorshipRequests.capabilityGrantId, grantId))).limit(1))[0];
  if (!assignmentRow?.assignment.eventId) return { workspace: context.workspace, assignment: assignmentRow?.assignment || null, participants: [] };
  const fields = new Set(assignmentRow.assignment.approvedParticipantFields || []); const rows = await db().select({ registration: registrations, attendee: users }).from(registrations).innerJoin(users, eq(registrations.attendeeId, users.id)).where(eq(registrations.eventId, assignmentRow.assignment.eventId)).orderBy(desc(registrations.createdAt));
  return { workspace: context.workspace, assignment: assignmentRow.assignment, participants: rows.map(row => ({ name: fields.has("name") ? row.attendee.name : undefined, email: fields.has("email") ? row.attendee.email : undefined, registrationStatus: fields.has("registrationStatus") ? row.registration.status : undefined, attendanceStatus: fields.has("attendanceStatus") ? row.registration.status : undefined, participationDate: fields.has("participationDate") ? row.registration.createdAt : undefined })) };
}

export async function localAuthorityModerateEvent(localAuthorityId: number, eventId: number, moderationStatus: "approved" | "rejected" | "frozen" | "suspended", note: string) {
  const before = (await db().select().from(events).where(eq(events.id, eventId)).limit(1))[0];
  if (!before) throw new Error("Event not found");
  const authorization = await authorizeCapabilityExecution(localAuthorityId, { capabilityCode: "LOCAL_AUTHORITY", functionCode: "LA_EVENT_REVIEW", resourceScope: { city: before.city, zone: before.zone, ward: before.ward } });
  if (!authorization.allowed) throw new Error(authorization.reason);
  if ((moderationStatus === "approved" || moderationStatus === "rejected") && before.moderationStatus !== "submitted") throw new Error("Only submitted events can be approved or sent back for changes");
  if ((moderationStatus === "frozen" || moderationStatus === "suspended") && before.moderationStatus !== "approved") throw new Error("Only approved events can be frozen or suspended");
  const moderationNote = note.trim().slice(0, 1000);
  if (requiresModerationNote(moderationStatus) && moderationNote.length < 4) throw new Error("Provide clear organizer-facing guidance for this decision");
  const status = moderationStatus === "approved" ? "live" : "draft";
  await db().update(events).set({ status, moderationStatus, moderationNote: moderationNote || null, reviewedAt: new Date(), reviewedByAdminId: localAuthorityId, publishedAt: moderationStatus === "approved" && !before.publishedAt ? new Date() : before.publishedAt }).where(eq(events.id, eventId));
  const after = (await db().select().from(events).where(eq(events.id, eventId)).limit(1))[0];
  if (!after) throw new Error("Local Authority event review failed");
  const organizerParticipation = moderationStatus === "approved" ? await ensureOrganizerParticipation(after) : undefined;
  await recordAdminAudit(localAuthorityId, `local_authority.event.${moderationStatus}`, "event", eventId, before, organizerParticipation ? { event: after, organizerParticipation: { created: organizerParticipation.created, eventPublicId: after.publicId, orderNumber: organizerParticipation.registration.orderNumber, attendeePublicId: organizerParticipation.registration.attendeePublicId } } : after);
  if (authorization.grantId) await recordCapabilityAudit(localAuthorityId, "capability.execution_authorized", { grantId: authorization.grantId, afterState: { capabilityCode: "LOCAL_AUTHORITY", functionCode: "LA_EVENT_REVIEW", eventId, decision: moderationStatus, resourceScope: { city: before.city, zone: before.zone, ward: before.ward } } });
  return { event: after, organizerParticipation };
}

/** @deprecated Stage 1 compatibility alias. New code must use localAuthorityModerateEvent. */
export const mcdModerateEvent = localAuthorityModerateEvent;

export async function adminModerateEvent(adminId: number, eventId: number, moderationStatus: Exclude<ModerationStatus, "draft" | "submitted">, note: string, platformFeePercent: number) {
  const rows = await db().select().from(events).where(eq(events.id, eventId)).limit(1); const before = rows[0];
  if (!before) throw new Error("Event not found");
  const moderationNote = note.trim().slice(0, 1000);
  if (requiresModerationNote(moderationStatus) && moderationNote.length < 4) throw new Error("Provide a clear organizer-facing reason or suggestion for this action");
  const status = moderationStatus === "approved" ? "live" : "draft";
  const nextFee = normalizePlatformFeePercent(platformFeePercent);
  if (before.moderationStatus === moderationStatus && before.status === status && before.platformFeePercent === nextFee && before.moderationNote === (moderationNote || null)) {
    const organizerParticipation = moderationStatus === "approved" ? await ensureOrganizerParticipation(before) : undefined;
    return { event: before, organizerParticipation };
  }
  await db().update(events).set({ status, moderationStatus, moderationNote: moderationNote || null, platformFeePercent: nextFee, reviewedAt: new Date(), reviewedByAdminId: adminId, publishedAt: moderationStatus === "approved" && !before.publishedAt ? new Date() : before.publishedAt }).where(eq(events.id, eventId));
  const after = (await db().select().from(events).where(eq(events.id, eventId)).limit(1))[0];
  if (!after) throw new Error("Event update failed");
  const organizerParticipation = moderationStatus === "approved" ? await ensureOrganizerParticipation(after) : undefined;
  await recordAdminAudit(adminId, `event.${moderationStatus}`, "event", eventId, before, organizerParticipation ? { event: after, organizerParticipation: { created: organizerParticipation.created, eventPublicId: after.publicId, orderNumber: organizerParticipation.registration.orderNumber, attendeePublicId: organizerParticipation.registration.attendeePublicId } } : after);
  return { event: after, organizerParticipation };
}

export async function adminSetRegistrationStatus(adminId: number, registrationId: number, status: "confirmed" | "cancelled" | "checked_in") {
  const rows = await db().select().from(registrations).where(eq(registrations.id, registrationId)).limit(1); const before = rows[0];
  if (!before) throw new Error("Registration not found");
  if (before.status === status) return before;
  await db().update(registrations).set({ status, checkedInAt: status === "checked_in" ? new Date() : null }).where(eq(registrations.id, registrationId));
  const after = (await db().select().from(registrations).where(eq(registrations.id, registrationId)).limit(1))[0];
  if (!after) throw new Error("Registration update failed");
  await recordAdminAudit(adminId, "registration.status_updated", "registration", registrationId, before, after);
  return after;
}

export async function adminSetPaymentStatus(adminId: number, registrationId: number, paymentStatus: "not_required" | "pending" | "paid" | "failed" | "refunded") {
  const rows = await db().select().from(registrations).where(eq(registrations.id, registrationId)).limit(1); const before = rows[0];
  if (!before) throw new Error("Registration not found");
  if (before.paymentStatus === paymentStatus) return before;
  await db().update(registrations).set({ paymentStatus }).where(eq(registrations.id, registrationId));
  const after = (await db().select().from(registrations).where(eq(registrations.id, registrationId)).limit(1))[0];
  if (!after) throw new Error("Payment update failed");
  await recordAdminAudit(adminId, "registration.payment_updated", "registration", registrationId, before, after);
  return after;
}

export async function adminSetPromotionStatus(adminId: number, promotionId: number, status: "draft" | "scheduled" | "active" | "completed") {
  const rows = await db().select().from(promotions).where(eq(promotions.id, promotionId)).limit(1); const before = rows[0];
  if (!before) throw new Error("Promotion not found");
  if (before.status === status) return before;
  await db().update(promotions).set({ status }).where(eq(promotions.id, promotionId));
  const after = (await db().select().from(promotions).where(eq(promotions.id, promotionId)).limit(1))[0];
  if (!after) throw new Error("Promotion update failed");
  await recordAdminAudit(adminId, "promotion.status_updated", "promotion", promotionId, before, after);
  return after;
}

export async function getSavedWorkspaceDefaultExpiryAlert(userId: number, now = new Date(), days = 30) {
  if (!isWorkspaceDefaultExpiryAlertsEnabled() || !isWorkspaceLandingPreferencesEnabled()) return undefined;
  const preference = (await db().select().from(userWorkspacePreferences).where(eq(userWorkspacePreferences.userId, userId)).limit(1))[0];
  if (!preference?.defaultCapabilityGrantId) return undefined;
  const workspace = (await getActiveCapabilityWorkspaces(userId, now)).find(item => item.grant.id === preference.defaultCapabilityGrantId);
  if (!workspace) return undefined;
  const remainingMs = workspace.grant.endsAt.getTime() - now.getTime(); const limitMs = days * 86_400_000;
  if (remainingMs <= 0 || remainingMs > limitMs) return undefined;
  return { grantId: workspace.grant.id, capabilityCode: workspace.capability.code, capabilityName: workspace.capability.displayName, endsAt: workspace.grant.endsAt, daysRemaining: Math.ceil(remainingMs / 86_400_000), actionUrl: `/dashboard/workspaces/${workspace.capability.code}?grant=${workspace.grant.id}` };
}

export async function getAdminCsrGrantUsageReport() {
  if (!isCsrGrantUsageExportEnabled()) return [];
  const [governance, capabilityRequests, audits] = await Promise.all([
    getAdminCapabilityGovernanceData(),
    db().select({ request: csrSponsorshipRequests, sponsorship: csrCapabilitySponsorships, assignment: csrEventAssignments, event: events }).from(csrSponsorshipRequests).leftJoin(csrCapabilitySponsorships, eq(csrCapabilitySponsorships.requestId, csrSponsorshipRequests.id)).leftJoin(csrEventAssignments, eq(csrEventAssignments.sponsorshipId, csrCapabilitySponsorships.id)).leftJoin(events, eq(csrEventAssignments.eventId, events.id)).where(isNotNull(csrSponsorshipRequests.capabilityGrantId)),
    db().select().from(capabilityAuditRecords).orderBy(desc(capabilityAuditRecords.createdAt)),
  ]);
  return governance.grants.filter(row => row.capability.code === "CSR_SPONSORSHIP").map(row => {
    const linked = capabilityRequests.filter(item => item.request.capabilityGrantId === row.grant.id); const grantAudits = audits.filter(item => item.grantId === row.grant.id && item.action === "capability.execution_authorized");
    return { grant: row.grant, user: row.user, functions: row.functions, effectiveStatus: row.effectiveStatus, requests: linked.length, assignedEvents: linked.filter(item => item.assignment?.eventId).length, futureConcepts: linked.filter(item => item.assignment?.futureEventConceptId).length, fundingRecords: linked.filter(item => item.sponsorship?.fundingRecordedAt).length, executionCount: grantAudits.length, lastExecutionAt: grantAudits[0]?.createdAt || null };
  });
}

export async function getAdminCsrAssignmentTimeline() {
  if (!isCsrAssignmentTimelineEnabled()) return [];
  const rows = await db().select({ request: csrSponsorshipRequests, profile: csrProfiles, sponsorship: csrCapabilitySponsorships, assignment: csrEventAssignments, event: events, concept: csrFutureEventConcepts }).from(csrSponsorshipRequests).innerJoin(csrProfiles, eq(csrSponsorshipRequests.csrProfileId, csrProfiles.id)).leftJoin(csrCapabilitySponsorships, eq(csrCapabilitySponsorships.requestId, csrSponsorshipRequests.id)).leftJoin(csrEventAssignments, eq(csrEventAssignments.sponsorshipId, csrCapabilitySponsorships.id)).leftJoin(events, eq(csrEventAssignments.eventId, events.id)).leftJoin(csrFutureEventConcepts, eq(csrEventAssignments.futureEventConceptId, csrFutureEventConcepts.id)).where(isNotNull(csrSponsorshipRequests.capabilityGrantId)).orderBy(desc(csrSponsorshipRequests.updatedAt));
  return rows.flatMap(row => {
    const entries = [{ occurredAt: row.request.createdAt, kind: "request_created", label: "Capability request created" }, row.request.status !== "draft" ? { occurredAt: row.request.updatedAt, kind: "request_submitted", label: "Submitted for administrator review" } : null, row.request.reviewedAt ? { occurredAt: row.request.reviewedAt, kind: `review_${row.request.status}`, label: `Administrator review: ${row.request.status.replaceAll("_", " ")}` } : null, row.assignment ? { occurredAt: row.assignment.createdAt, kind: "assignment_created", label: row.event ? `Assigned event: ${row.event.displayName}` : row.concept ? `Future concept: ${row.concept.title}` : "Assignment created" } : null, row.sponsorship?.fundingRecordedAt ? { occurredAt: row.sponsorship.fundingRecordedAt, kind: "funding_recorded", label: "Funding record captured" } : null, row.sponsorship?.completedAt ? { occurredAt: row.sponsorship.completedAt, kind: "report_completed", label: "Funding report completed" } : null].filter(Boolean) as { occurredAt: Date; kind: string; label: string }[];
    return entries.map(entry => ({ ...entry, requestId: row.request.id, requestPublicId: row.request.publicId || `#${row.request.id}`, companyName: row.profile.companyName, grantId: row.request.capabilityGrantId!, assignmentPublicId: row.assignment?.publicId || null, sponsorshipPublicId: row.sponsorship?.publicId || null }));
  }).sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
}

type AuthorityCapabilityCode = "LOCAL_AUTHORITY" | "DISTRICT_LEVEL" | "STATE_LEVEL";
type AuthorityFunctionCode = "LA_EVENT_REVIEW" | "LA_TERRITORY_MONITOR" | "LA_MIS_EXPORT" | "LA_LOCATION_MONITOR" | "LA_HEALTH_AGGREGATE_VIEW" | "DISTRICT_PLAN_CREATE" | "DISTRICT_EVENT_REVIEW" | "DISTRICT_DELIVERY_MONITOR" | "DISTRICT_MIS_EXPORT" | "DISTRICT_EXCEPTION_MANAGE" | "DISTRICT_HEALTH_AGGREGATE_VIEW" | "STATE_PROGRAMME_CREATE" | "STATE_DISTRICT_PERFORMANCE_VIEW" | "STATE_COVERAGE_VIEW" | "STATE_MIS_EXPORT" | "STATE_ESCALATION_MANAGE" | "STATE_CSR_IMPACT_VIEW" | "STATE_HEALTH_AGGREGATE_VIEW";

function authorityScope(grant: ActiveCapabilityWorkspace["grant"]) { return { scopeType: grant.scopeType, state: grant.scopeState, district: grant.scopeDistrict, city: grant.scopeCity, zone: grant.scopeZone, ward: grant.scopeWard } as const; }

async function requireAuthorityCapabilityFunction(userId: number, capabilityCode: AuthorityCapabilityCode, grantId: number, functionCode: AuthorityFunctionCode, resourceScope?: CapabilityResourceScope) {
  if (!isAuthorityCapabilityWorkspaceEnabled()) throw new Error("Authority capability workspaces are disabled");
  const context = await getActiveCapabilityWorkspaceContext(userId, capabilityCode, grantId); if (!context) throw new Error("This authority workspace is not active for your account");
  if (!context.workspace.functions.some(item => item.code === functionCode)) throw new Error("This authority function is not selected for the active workspace");
  if (resourceScope) { const grant = context.workspace.grant; const decision = evaluateCapabilityAuthorization({ functionCode, resourceScope, candidates: [{ grantId: grant.id, status: grant.status, ...authorityScope(grant), startsAt: grant.startsAt, endsAt: grant.endsAt, functionCodes: context.workspace.functions.map(item => item.code) }] }); if (!decision.allowed || decision.grantId !== grantId) throw new Error(decision.reason); }
  return context;
}

function inAuthorityScope(grant: ActiveCapabilityWorkspace["grant"], resource: CapabilityResourceScope) { return capabilityScopeMatches(authorityScope(grant), resource); }

export async function getAuthorityCapabilityWorkspaceData(userId: number, capabilityCode: AuthorityCapabilityCode, grantId: number) {
  const context = await getActiveCapabilityWorkspaceContext(userId, capabilityCode, grantId); if (!context || !isAuthorityCapabilityWorkspaceEnabled()) return undefined;
  const grant = context.workspace.grant; const [eventRows, registrationRows, venueRows, plans, programmes, exceptions, csrRows] = await Promise.all([
    db().select({ event: events, organizer: users, category: categories }).from(events).innerJoin(users, eq(events.organizerId, users.id)).leftJoin(categories, eq(events.categoryId, categories.id)).orderBy(desc(events.updatedAt)),
    db().select({ registration: registrations, event: events }).from(registrations).innerJoin(events, eq(registrations.eventId, events.id)),
    db().select().from(approvedVenues).where(eq(approvedVenues.active, true)),
    db().select().from(authorityDeliveryPlans).where(eq(authorityDeliveryPlans.grantId, grantId)).orderBy(desc(authorityDeliveryPlans.updatedAt)),
    db().select().from(authorityStateProgrammes).where(eq(authorityStateProgrammes.grantId, grantId)).orderBy(desc(authorityStateProgrammes.updatedAt)),
    db().select().from(authorityExceptions).where(eq(authorityExceptions.grantId, grantId)).orderBy(desc(authorityExceptions.updatedAt)),
    db().select({ request: csrSponsorshipRequests, sponsorship: csrCapabilitySponsorships, assignment: csrEventAssignments, event: events }).from(csrSponsorshipRequests).innerJoin(csrCapabilitySponsorships, eq(csrCapabilitySponsorships.requestId, csrSponsorshipRequests.id)).innerJoin(csrEventAssignments, eq(csrEventAssignments.sponsorshipId, csrCapabilitySponsorships.id)).innerJoin(events, eq(csrEventAssignments.eventId, events.id)).where(isNotNull(csrSponsorshipRequests.capabilityGrantId)),
  ]);
  const scopedEvents = eventRows.filter(row => inAuthorityScope(grant, { city: row.event.city, zone: row.event.zone, ward: row.event.ward })); const ids = new Set(scopedEvents.map(row => row.event.id)); const scopedRegistrations = registrationRows.filter(row => ids.has(row.event.id)); const scopedVenues = venueRows.filter(venue => inAuthorityScope(grant, { city: venue.city, zone: venue.zone, ward: venue.ward })); const scopedCsr = csrRows.filter(row => inAuthorityScope(grant, { city: row.event.city, zone: row.event.zone, ward: row.event.ward }));
  const territories = new Map<string, { city: string; zone: string; ward: string; events: number; live: number; registrations: number; checkedIn: number; locations: number }>(); const ensure = (city: string | null, zone: string | null, ward: string | null) => { const value = { city: city || "Not recorded", zone: zone || "Not recorded", ward: ward || "Not recorded" }; const key = `${value.city}|${value.zone}|${value.ward}`; if (!territories.has(key)) territories.set(key, { ...value, events: 0, live: 0, registrations: 0, checkedIn: 0, locations: 0 }); return territories.get(key)!; };
  scopedEvents.forEach(row => { const item = ensure(row.event.city, row.event.zone, row.event.ward); item.events += 1; item.live += row.event.status === "live" ? 1 : 0; }); scopedRegistrations.forEach(row => { const item = ensure(row.event.city, row.event.zone, row.event.ward); item.registrations += 1; item.checkedIn += row.registration.status === "checked_in" ? 1 : 0; }); scopedVenues.forEach(row => ensure(row.city, row.zone, row.ward).locations += 1);
  return { workspace: context.workspace, events: scopedEvents, venues: scopedVenues, territories: [...territories.values()].sort((a, b) => b.registrations - a.registrations || b.events - a.events), plans, programmes, exceptions, csrImpact: { assignments: scopedCsr.length, funded: scopedCsr.filter(row => row.sponsorship.fundingRecordedAt).length, committedPaise: scopedCsr.reduce((sum, row) => sum + row.request.amountPaise, 0) }, metrics: { events: scopedEvents.length, registrations: scopedRegistrations.length, checkedIn: scopedRegistrations.filter(row => row.registration.status === "checked_in").length, locations: scopedVenues.length } };
}

export async function createAuthorityDeliveryPlan(userId: number, grantId: number, input: { title: string; objective: string; startsAt?: Date | null; endsAt?: Date | null }) {
  const context = await requireAuthorityCapabilityFunction(userId, "DISTRICT_LEVEL", grantId, "DISTRICT_PLAN_CREATE"); const title = input.title.trim().slice(0, 180); const objective = input.objective.trim().slice(0, 4000); if (title.length < 3 || objective.length < 12) throw new Error("Enter a delivery-plan title and clear objective"); if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) throw new Error("Plan end must be after plan start"); const scope = authorityScope(context.workspace.grant); const result = await db().insert(authorityDeliveryPlans).values({ publicId: `DPL-${identitySuffix()}`, grantId, createdByUserId: userId, title, objective, ...scope, startsAt: input.startsAt || null, endsAt: input.endsAt || null, status: "draft" }); const id = Number(result[0].insertId); const row = (await db().select().from(authorityDeliveryPlans).where(eq(authorityDeliveryPlans.id, id)).limit(1))[0]; if (!row) throw new Error("District plan could not be created"); await recordCapabilityExecutionAuthorization(userId, { grantId, capabilityCode: "DISTRICT_LEVEL", functionCode: "DISTRICT_PLAN_CREATE", context: { planId: row.id, publicId: row.publicId } }); return row;
}

export async function createAuthorityStateProgramme(userId: number, grantId: number, input: { title: string; objective: string; startsAt?: Date | null; endsAt?: Date | null }) {
  const context = await requireAuthorityCapabilityFunction(userId, "STATE_LEVEL", grantId, "STATE_PROGRAMME_CREATE"); const title = input.title.trim().slice(0, 180); const objective = input.objective.trim().slice(0, 4000); if (title.length < 3 || objective.length < 12) throw new Error("Enter a programme title and clear objective"); if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) throw new Error("Programme end must be after programme start"); const scope = authorityScope(context.workspace.grant); const result = await db().insert(authorityStateProgrammes).values({ publicId: `STP-${identitySuffix()}`, grantId, createdByUserId: userId, title, objective, ...scope, startsAt: input.startsAt || null, endsAt: input.endsAt || null, status: "draft" }); const id = Number(result[0].insertId); const row = (await db().select().from(authorityStateProgrammes).where(eq(authorityStateProgrammes.id, id)).limit(1))[0]; if (!row) throw new Error("State programme could not be created"); await recordCapabilityExecutionAuthorization(userId, { grantId, capabilityCode: "STATE_LEVEL", functionCode: "STATE_PROGRAMME_CREATE", context: { programmeId: row.id, publicId: row.publicId } }); return row;
}

export async function createAuthorityException(userId: number, capabilityCode: "DISTRICT_LEVEL" | "STATE_LEVEL", grantId: number, input: { title: string; details: string }) {
  const functionCode: AuthorityFunctionCode = capabilityCode === "DISTRICT_LEVEL" ? "DISTRICT_EXCEPTION_MANAGE" : "STATE_ESCALATION_MANAGE"; const context = await requireAuthorityCapabilityFunction(userId, capabilityCode, grantId, functionCode); const title = input.title.trim().slice(0, 180); const details = input.details.trim().slice(0, 4000); if (title.length < 3 || details.length < 12) throw new Error("Enter an exception title and clear details"); const scope = authorityScope(context.workspace.grant); const result = await db().insert(authorityExceptions).values({ publicId: `AEX-${identitySuffix()}`, grantId, createdByUserId: userId, capabilityCode, title, details, ...scope, status: "open" }); const id = Number(result[0].insertId); const row = (await db().select().from(authorityExceptions).where(eq(authorityExceptions.id, id)).limit(1))[0]; if (!row) throw new Error("Authority exception could not be created"); await recordCapabilityExecutionAuthorization(userId, { grantId, capabilityCode, functionCode, context: { exceptionId: row.id, publicId: row.publicId, action: "created" } }); return row;
}

export async function resolveAuthorityException(userId: number, capabilityCode: "DISTRICT_LEVEL" | "STATE_LEVEL", grantId: number, exceptionId: number, resolutionNote: string) {
  const functionCode: AuthorityFunctionCode = capabilityCode === "DISTRICT_LEVEL" ? "DISTRICT_EXCEPTION_MANAGE" : "STATE_ESCALATION_MANAGE"; const context = await requireAuthorityCapabilityFunction(userId, capabilityCode, grantId, functionCode); const before = (await db().select().from(authorityExceptions).where(and(eq(authorityExceptions.id, exceptionId), eq(authorityExceptions.grantId, grantId), eq(authorityExceptions.capabilityCode, capabilityCode))).limit(1))[0]; if (!before || before.status !== "open" || !inAuthorityScope(context.workspace.grant, { state: before.state, district: before.district, city: before.city, zone: before.zone, ward: before.ward })) throw new Error("Open scoped authority exception not found"); const note = resolutionNote.trim().slice(0, 4000); if (note.length < 4) throw new Error("Provide a resolution note"); await db().update(authorityExceptions).set({ status: "resolved", resolutionNote: note, resolvedByUserId: userId, resolvedAt: new Date() }).where(eq(authorityExceptions.id, exceptionId)); const after = (await db().select().from(authorityExceptions).where(eq(authorityExceptions.id, exceptionId)).limit(1))[0]; if (!after) throw new Error("Authority exception could not be resolved"); await recordCapabilityExecutionAuthorization(userId, { grantId, capabilityCode, functionCode, context: { exceptionId, action: "resolved" } }); return after;
}

export async function moderateAuthorityCapabilityEvent(userId: number, capabilityCode: "LOCAL_AUTHORITY" | "DISTRICT_LEVEL", grantId: number, eventId: number, moderationStatus: "approved" | "rejected" | "frozen" | "suspended", note: string) {
  const functionCode: AuthorityFunctionCode = capabilityCode === "LOCAL_AUTHORITY" ? "LA_EVENT_REVIEW" : "DISTRICT_EVENT_REVIEW"; const before = (await db().select().from(events).where(eq(events.id, eventId)).limit(1))[0]; if (!before) throw new Error("Event not found"); const context = await requireAuthorityCapabilityFunction(userId, capabilityCode, grantId, functionCode, { city: before.city, zone: before.zone, ward: before.ward });
  if ((moderationStatus === "approved" || moderationStatus === "rejected") && before.moderationStatus !== "submitted") throw new Error("Only submitted events can be approved or returned"); if ((moderationStatus === "frozen" || moderationStatus === "suspended") && before.moderationStatus !== "approved") throw new Error("Only approved events can be frozen or suspended"); const moderationNote = note.trim().slice(0, 1000); if (requiresModerationNote(moderationStatus) && moderationNote.length < 4) throw new Error("Provide clear organizer-facing guidance for this decision");
  const status = moderationStatus === "approved" ? "live" : "draft"; await db().update(events).set({ status, moderationStatus, moderationNote: moderationNote || null, reviewedAt: new Date(), reviewedByAdminId: userId, publishedAt: moderationStatus === "approved" && !before.publishedAt ? new Date() : before.publishedAt }).where(eq(events.id, eventId)); const after = (await db().select().from(events).where(eq(events.id, eventId)).limit(1))[0]; if (!after) throw new Error("Authority event review failed"); const organizerParticipation = moderationStatus === "approved" ? await ensureOrganizerParticipation(after) : undefined;
  await recordAdminAudit(userId, `authority_capability.${capabilityCode.toLowerCase()}.event.${moderationStatus}`, "event", eventId, before, after); await recordCapabilityExecutionAuthorization(userId, { grantId, capabilityCode, functionCode, context: { eventId, decision: moderationStatus, resourceScope: { city: before.city, zone: before.zone, ward: before.ward }, workspaceGrantId: context.workspace.grant.id } }); return { event: after, organizerParticipation };
}

type ParticipantHistoryEntryType = "health" | "education" | "community" | "experience";
const historyTypeForCategory = (slug: string): ParticipantHistoryEntryType => slug === "running" || slug === "wellness" ? "health" : slug === "learning" ? "education" : slug === "community" ? "community" : "experience";
const historyFieldsForType = (entryType: ParticipantHistoryEntryType) => entryType === "health" ? { title: "Health check-in", description: "A voluntary wellbeing record for this event. It is not medical advice or a clinical assessment.", fields: ["wellbeing", "energyLevel", "comfort", "note"] } : entryType === "education" ? { title: "Education reflection", description: "Record your learning goal and takeaway for this event day.", fields: ["learningGoal", "keyTakeaway", "supportTopic"] } : entryType === "community" ? { title: "Community check-in", description: "Record your participation intent and connection goal for this event day.", fields: ["participationIntent", "connectionGoal", "feedback"] } : { title: "Event experience reflection", description: "Record an optional experience reflection for this event day.", fields: ["experienceRating", "highlight", "feedback"] };

function eventLocalDate(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "Asia/Calcutta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); const get = (type: string) => parts.find(part => part.type === type)?.value || ""; return `${get("year")}-${get("month")}-${get("day")}`;
}
function normalizeHistoryDate(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Choose a valid event date"); return value; }
function cleanHistoryPayload(entryType: ParticipantHistoryEntryType, input: Record<string, unknown>) {
  const clean = (key: string, limit = 600) => String(input[key] || "").trim().slice(0, limit);
  if (entryType === "health") { const wellbeing = clean("wellbeing", 24); const energyLevel = Number(input.energyLevel); const comfort = clean("comfort", 32); const note = clean("note", 1000); if (!["great", "good", "okay", "low"].includes(wellbeing) || !Number.isInteger(energyLevel) || energyLevel < 1 || energyLevel > 5 || !["comfortable", "needs_support", "prefer_not_to_say"].includes(comfort)) throw new Error("Complete the health check-in choices"); return { wellbeing, energyLevel, comfort, note: note || null } as Record<string, string | number | boolean | null>; }
  if (entryType === "education") { const learningGoal = clean("learningGoal"); const keyTakeaway = clean("keyTakeaway", 1000); const supportTopic = clean("supportTopic"); if (learningGoal.length < 2 || keyTakeaway.length < 2) throw new Error("Add a learning goal and takeaway"); return { learningGoal, keyTakeaway, supportTopic: supportTopic || null } as Record<string, string | number | boolean | null>; }
  if (entryType === "community") { const participationIntent = clean("participationIntent"); const connectionGoal = clean("connectionGoal"); const feedback = clean("feedback", 1000); if (participationIntent.length < 2 || connectionGoal.length < 2) throw new Error("Add a participation intent and connection goal"); return { participationIntent, connectionGoal, feedback: feedback || null } as Record<string, string | number | boolean | null>; }
  const experienceRating = Number(input.experienceRating); const highlight = clean("highlight", 1000); const feedback = clean("feedback", 1000); if (!Number.isInteger(experienceRating) || experienceRating < 1 || experienceRating > 5 || highlight.length < 2) throw new Error("Add an experience rating and highlight"); return { experienceRating, highlight, feedback: feedback || null } as Record<string, string | number | boolean | null>;
}
async function recordParticipantHistoryAudit(actorUserId: number, action: string, input: { entryId?: number; correctionId?: number; grantId?: number; context?: Record<string, unknown> } = {}) { await db().insert(participantHistoryAuditRecords).values({ actorUserId, action, entryId: input.entryId, correctionId: input.correctionId, grantId: input.grantId, context: input.context || null }); }

export async function getParticipantHistoryWorkspace(userId: number) {
  if (!isParticipantHistoryEnabled()) return { consent: undefined, registrations: [], entries: [], corrections: [] };
  const [consent] = await db().select().from(participantHistoryConsents).where(eq(participantHistoryConsents.userId, userId)).limit(1);
  const registrationRows = await db().select({ registration: registrations, event: events, category: categories }).from(registrations).innerJoin(events, eq(registrations.eventId, events.id)).leftJoin(categories, eq(events.categoryId, categories.id)).where(and(eq(registrations.attendeeId, userId), or(eq(registrations.status, "confirmed"), eq(registrations.status, "checked_in")))).orderBy(desc(events.startsAt));
  const registrationIds = registrationRows.map(row => row.registration.id); const entryRows = registrationIds.length ? await db().select().from(participantHistoryEntries).where(and(eq(participantHistoryEntries.userId, userId), inArray(participantHistoryEntries.registrationId, registrationIds))).orderBy(desc(participantHistoryEntries.createdAt)) : [];
  const entryIds = entryRows.map(row => row.id); const corrections = entryIds.length ? await db().select().from(participantHistoryCorrections).where(and(eq(participantHistoryCorrections.userId, userId), inArray(participantHistoryCorrections.originalEntryId, entryIds))).orderBy(desc(participantHistoryCorrections.createdAt)) : [];
  if (entryRows.length) await recordParticipantHistoryAudit(userId, "participant_history.view", { context: { entryCount: entryRows.length } });
  return { consent, registrations: registrationRows.map(row => ({ ...row, entryType: historyTypeForCategory(row.category?.slug || "experience"), form: historyFieldsForType(historyTypeForCategory(row.category?.slug || "experience")), startDate: row.event.startsAt ? eventLocalDate(row.event.startsAt, row.event.timezone) : null, endDate: row.event.endsAt ? eventLocalDate(row.event.endsAt, row.event.timezone) : row.event.startsAt ? eventLocalDate(row.event.startsAt, row.event.timezone) : null })), entries: entryRows, corrections };
}

export async function setParticipantHealthConsent(userId: number, granted: boolean) {
  if (!isParticipantHistoryEnabled()) throw new Error("Participant history is disabled"); const now = new Date(); await db().insert(participantHistoryConsents).values({ userId, healthConsentGranted: granted, grantedAt: granted ? now : null, withdrawnAt: granted ? null : now }).onDuplicateKeyUpdate({ set: { healthConsentGranted: granted, grantedAt: granted ? now : null, withdrawnAt: granted ? null : now, policyVersion: "stage10-v1" } }); await recordParticipantHistoryAudit(userId, granted ? "participant_history.health_consent_granted" : "participant_history.health_consent_withdrawn"); return (await db().select().from(participantHistoryConsents).where(eq(participantHistoryConsents.userId, userId)).limit(1))[0];
}

export async function createParticipantHistoryEntry(userId: number, input: { registrationId: number; entryDate: string; payload: Record<string, unknown> }) {
  if (!isParticipantHistoryEnabled()) throw new Error("Participant history is disabled"); const row = (await db().select({ registration: registrations, event: events, category: categories }).from(registrations).innerJoin(events, eq(registrations.eventId, events.id)).leftJoin(categories, eq(events.categoryId, categories.id)).where(and(eq(registrations.id, input.registrationId), eq(registrations.attendeeId, userId), or(eq(registrations.status, "confirmed"), eq(registrations.status, "checked_in")))).limit(1))[0]; if (!row) throw new Error("Confirmed participant registration not found"); const entryDate = normalizeHistoryDate(input.entryDate); const startDate = row.event.startsAt ? eventLocalDate(row.event.startsAt, row.event.timezone) : null; const endDate = row.event.endsAt ? eventLocalDate(row.event.endsAt, row.event.timezone) : startDate; if (!startDate || !endDate || entryDate < startDate || entryDate > endDate) throw new Error("Choose a date within this event"); const entryType = historyTypeForCategory(row.category?.slug || "experience"); if (entryType === "health") { const consent = (await db().select().from(participantHistoryConsents).where(eq(participantHistoryConsents.userId, userId)).limit(1))[0]; if (!consent?.healthConsentGranted) throw new Error("Give health check-in consent before submitting"); }
  const payload = cleanHistoryPayload(entryType, input.payload); const result = await db().insert(participantHistoryEntries).values({ publicId: createPublicParticipantHistoryId(), registrationId: row.registration.id, eventId: row.event.id, userId, categorySlug: row.category?.slug || "uncategorized", entryType, entryDate, payload }); const id = Number(result[0].insertId); const entry = (await db().select().from(participantHistoryEntries).where(eq(participantHistoryEntries.id, id)).limit(1))[0]; if (!entry) throw new Error("History entry could not be created"); await recordParticipantHistoryAudit(userId, "participant_history.entry_created", { entryId: entry.id, context: { entryType, entryDate, eventId: entry.eventId } }); return entry;
}

export async function createParticipantHistoryCorrection(userId: number, input: { entryId: number; reason: string; payload: Record<string, unknown> }) {
  if (!isParticipantHistoryEnabled()) throw new Error("Participant history is disabled"); const original = (await db().select().from(participantHistoryEntries).where(and(eq(participantHistoryEntries.id, input.entryId), eq(participantHistoryEntries.userId, userId))).limit(1))[0]; if (!original) throw new Error("Your original history entry was not found"); const reason = input.reason.trim().slice(0, 1000); if (reason.length < 8) throw new Error("Explain the correction in at least 8 characters"); const correctedPayload = cleanHistoryPayload(original.entryType, input.payload); const result = await db().insert(participantHistoryCorrections).values({ publicId: createPublicParticipantHistoryCorrectionId(), originalEntryId: original.id, userId, reason, correctedPayload }); const id = Number(result[0].insertId); const correction = (await db().select().from(participantHistoryCorrections).where(eq(participantHistoryCorrections.id, id)).limit(1))[0]; if (!correction) throw new Error("History correction could not be created"); await recordParticipantHistoryAudit(userId, "participant_history.correction_created", { entryId: original.id, correctionId: correction.id, context: { originalPublicId: original.publicId } }); return correction;
}

type AuthorityHealthFunction = "LA_HEALTH_AGGREGATE_VIEW" | "DISTRICT_HEALTH_AGGREGATE_VIEW" | "STATE_HEALTH_AGGREGATE_VIEW";
function healthFunctionForAuthority(code: AuthorityCapabilityCode): AuthorityHealthFunction { return code === "LOCAL_AUTHORITY" ? "LA_HEALTH_AGGREGATE_VIEW" : code === "DISTRICT_LEVEL" ? "DISTRICT_HEALTH_AGGREGATE_VIEW" : "STATE_HEALTH_AGGREGATE_VIEW"; }
export async function getAuthorityHealthAnalytics(userId: number, capabilityCode: AuthorityCapabilityCode, grantId: number) {
  if (!isStage10AuthorityAnalyticsEnabled()) return undefined; const functionCode = healthFunctionForAuthority(capabilityCode); const context = await requireAuthorityCapabilityFunction(userId, capabilityCode, grantId, functionCode as AuthorityFunctionCode); const rows = await db().select({ entry: participantHistoryEntries, event: events }).from(participantHistoryEntries).innerJoin(events, eq(participantHistoryEntries.eventId, events.id)).where(eq(participantHistoryEntries.entryType, "health")); const scoped = rows.filter(row => inAuthorityScope(context.workspace.grant, { city: row.event.city, zone: row.event.zone, ward: row.event.ward })); const byDate = new Map<string, number>(); const byWellbeing = new Map<string, number>(); scoped.forEach(({ entry }) => { byDate.set(entry.entryDate, (byDate.get(entry.entryDate) || 0) + 1); const wellbeing = typeof entry.payload?.wellbeing === "string" ? entry.payload.wellbeing : "not_recorded"; byWellbeing.set(wellbeing, (byWellbeing.get(wellbeing) || 0) + 1); }); await recordParticipantHistoryAudit(userId, "participant_history.authority_aggregate_view", { grantId, context: { capabilityCode, entryCount: scoped.length, aggregateOnly: true } }); await recordCapabilityExecutionAuthorization(userId, { grantId, capabilityCode, functionCode: functionCode as AuthorityFunctionCode, context: { action: "health_aggregate_view", aggregateOnly: true, entryCount: scoped.length } }); return { totalEntries: scoped.length, byDate: [...byDate].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)), byWellbeing: [...byWellbeing].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count) };
}

export async function getExpiringAuthorityGrantAlerts(userId: number, now = new Date()) {
  if (!isStage10GrantReminderAutomationEnabled()) return []; const rows = await db().select({ grant: capabilityGrants, capability: capabilities }).from(capabilityGrants).innerJoin(userAccountProfiles, eq(capabilityGrants.userAccountProfileId, userAccountProfiles.id)).innerJoin(capabilities, eq(capabilityGrants.capabilityId, capabilities.id)).where(and(eq(userAccountProfiles.userId, userId), eq(capabilityGrants.status, "active"), lte(capabilityGrants.endsAt, new Date(now.getTime() + 30 * 86_400_000)), gt(capabilityGrants.endsAt, now), inArray(capabilities.code, ["LOCAL_AUTHORITY", "DISTRICT_LEVEL", "STATE_LEVEL"]))); return rows.map(({ grant, capability }) => ({ grantId: grant.id, capabilityCode: capability.code, capabilityName: capability.displayName, endsAt: grant.endsAt, daysRemaining: Math.max(1, Math.ceil((grant.endsAt.getTime() - now.getTime()) / 86_400_000)) }));
}

function reminderWindow(daysRemaining: number) { return daysRemaining <= 1 ? "1d" : daysRemaining <= 3 ? "3d" : daysRemaining <= 7 ? "7d" : daysRemaining <= 14 ? "14d" : "30d"; }
export async function deliverExpiringAuthorityGrantReminders(now = new Date()) {
  if (!isStage10GrantReminderAutomationEnabled() || !isCapabilityDecisionNotificationsEnabled()) return { processed: 0, skipped: "disabled" as const }; const rows = await db().select({ grant: capabilityGrants, capability: capabilities, user: users }).from(capabilityGrants).innerJoin(userAccountProfiles, eq(capabilityGrants.userAccountProfileId, userAccountProfiles.id)).innerJoin(users, eq(userAccountProfiles.userId, users.id)).innerJoin(capabilities, eq(capabilityGrants.capabilityId, capabilities.id)).where(and(eq(capabilityGrants.status, "active"), lte(capabilityGrants.endsAt, new Date(now.getTime() + 30 * 86_400_000)), gt(capabilityGrants.endsAt, now), inArray(capabilities.code, ["LOCAL_AUTHORITY", "DISTRICT_LEVEL", "STATE_LEVEL"]))); let processed = 0; for (const { grant, capability, user } of rows) { const daysRemaining = Math.max(1, Math.ceil((grant.endsAt.getTime() - now.getTime()) / 86_400_000)); const window = reminderWindow(daysRemaining); try { const delivered = await db().transaction(async tx => { const existing = await tx.select().from(capabilityGrantReminderDeliveries).where(and(eq(capabilityGrantReminderDeliveries.grantId, grant.id), eq(capabilityGrantReminderDeliveries.recipientUserId, user.id), eq(capabilityGrantReminderDeliveries.reminderWindow, window))).limit(1); if (existing[0]) return false; const notice = await tx.insert(capabilityDecisionNotifications).values({ userId: user.id, grantId: grant.id, kind: "authority_grant_expiry", title: `${capability.displayName} approval expires soon`, body: `Your active authority grant expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. Request renewal before it ends; this reminder does not extend access.`, actionUrl: "/dashboard/capabilities" }); await tx.insert(capabilityGrantReminderDeliveries).values({ grantId: grant.id, recipientUserId: user.id, reminderWindow: window, notificationId: Number(notice[0].insertId) }); return true; }); if (delivered) processed += 1; } catch (error) { if (!String(error).toLowerCase().includes("duplicate")) throw error; } } return { processed };
}
