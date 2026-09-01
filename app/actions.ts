"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminAssignCsrCapabilityRequest, adminAssignCsrSponsorshipRequest, adminCreateCsrAccount, adminCreateDistrictAccount, adminCreateLocalAuthorityAccount, adminCreateStateAccount, adminImportVenues, adminModerateEvent, adminRecordCsrCapabilityFunding, adminReleaseVenueReservation, adminReviewCapabilityApplication, adminReviewCsrCapabilityRequest, adminReviewCsrSponsorshipRequest, adminReviewVenueApprovalRequest, adminSaveVenue, adminSeedSampleVenues, adminSetPaymentStatus, adminSetPromotionStatus, adminSetRegistrationStatus, adminSetUserRole, adminUpdateCapabilityGrant, adminUpdatePlatformSettings, completeOrganizerEvent, confirmManualPayment, createAuthorityDeliveryPlan, createAuthorityException, createAuthorityStateProgramme, createOrganizerVenueApprovalRequest, createOrganizerVenueFilterPreset, createParticipantHistoryCorrection, createParticipantHistoryEntry, createPhoneUser, createPasswordUser, createDraftEvent, createPromotion, csrCreateBudget, csrCreateCapabilityBudget, csrSaveCapabilitySponsorshipRequest, csrSaveSponsorshipRequest, csrSubmitCapabilitySponsorshipRequest, csrSubmitSponsorshipRequest, deleteOrganizerVenueFilterPreset, findActiveVenueConflict, findUserByEmail, findUserById, findUserByPhone, completeUserProfile, getApprovedVenue, getOrganizerEvent, getRegistrationNotificationDataByOrder, localAuthorityModerateEvent, markOrganizerVenueAvailabilityNotificationRead, markRegistrationConfirmationSent, moderateAuthorityCapabilityEvent, recordUserSignIn, registerForEvent, rejectManualPayment, replaceQuestions, replaceTickets, resolveAuthorityException, resolveWorkspaceLandingPath, saveCapabilityApplication, saveCsrCapabilityProfile, saveWorkspaceLandingPreference, setParticipantHealthConsent, submitCapabilityApplication, submitEventForApproval, submitManualPaymentProof, subscribeOrganizerToVenueAvailability, toggleEventFavorite, updateEvent, updateRegistrationStatus, updateUserProfile, updateUserPasswordHash } from "./lib/db";
import { adminCreateCsrMigrationGrant, adminCreateLocalAuthorityMigrationGrant } from "./lib/db";
import { adminExpireDueCapabilityGrants } from "./lib/db";
import { markCapabilityDecisionNotificationRead } from "./lib/db";
import { markCapabilityDecisionNotificationsRead } from "./lib/db";
import { addCapabilityApplicationDocument } from "./lib/db";
import { clearSession, currentUser, hashPassword, setSession, verifyPassword } from "./lib/auth";
import { canPublishEvent, canSubmitWizardStep, createEventSlug, hasAuthenticatedAccount, isRegistrationStatus, isValidTicketSaleWindow, nextWizardStep, normalizeTicketGst } from "./lib/workflow";
import { sendOrganizerParticipationConfirmation, sendRegistrationConfirmation } from "./lib/email";
import { normalizeFillingFastThreshold } from "./lib/registration-status";
import { isAdministrator, isCsrSponsor, isDistrictAuthority, isLocalAuthority, isStateAuthority } from "./lib/admin";
import { canEditEventForModeration, normalizePlatformFeePercent } from "./lib/moderation";
import { coordinateToE6, normalizeLocationText } from "./lib/location";
import { parseVenueCsv } from "./lib/venue-csv";
import { venueConflictMessage } from "./lib/venue-booking";
import { hasEventBannerSignature, validateEventBanner } from "./lib/event-banner";
import { nativeTicketDraftFromForm } from "./lib/ticket-form-fallback";
import { storagePut } from "../server/storage";

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function safeReturnTo(value: FormDataEntryValue | null, fallback = "/dashboard/manage-events/events") {
  const destination = text(value);
  return destination.startsWith("/") && !destination.startsWith("//") ? destination : fallback;
}

const NEW_DRAFT_PATH = "/dashboard/manage-events/create-event/new";

async function redirectAfterAuthentication(user: { id: number; role: "user" | "admin" | "mcd" | "csr" | "state" | "district" }, returnTo: FormDataEntryValue | null) {
	const destination = safeReturnTo(returnTo);
	if (isLocalAuthority(user) && !destination.startsWith("/local-authority") && !destination.startsWith("/mcd")) redirect("/local-authority");
	if (isCsrSponsor(user) && !destination.startsWith("/csr")) redirect("/csr");
	if (isStateAuthority(user) && !destination.startsWith("/state-authority")) redirect("/state-authority");
	if (isDistrictAuthority(user) && !destination.startsWith("/district-authority")) redirect("/district-authority");
	if (!text(returnTo) && user.role === "user") { const preferredPath = await resolveWorkspaceLandingPath(user.id); if (preferredPath) redirect(preferredPath); }
	redirect(destination);
}

async function requireUser(returnTo = "/dashboard/manage-events/events") {
  const user = await currentUser();
  if (!user || !hasAuthenticatedAccount(user.id)) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  if (isLocalAuthority(user)) redirect("/local-authority");
  if (isCsrSponsor(user)) redirect("/csr");
  if (isStateAuthority(user)) redirect("/state-authority");
  if (isDistrictAuthority(user)) redirect("/district-authority");
  return user;
}

async function requireAdministratorAction(returnTo = "/admin") {
  const user = await currentUser();
  if (!user || !isAdministrator(user)) redirect(`/admin/login?returnTo=${encodeURIComponent(returnTo)}`);
  return user;
}

async function requestOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  return `${protocol}://${host}`;
}

function eventDateTime(dateValue: FormDataEntryValue | null, timeValue: FormDataEntryValue | null) {
  const date = text(dateValue);
  const time = text(timeValue);
  return date && time ? new Date(`${date}T${time}`) : new Date("invalid");
}

export async function signupAction(formData: FormData) {
  const name = text(formData.get("name"));
  const email = text(formData.get("email")).toLowerCase();
  const password = text(formData.get("password"));
  if (name.length < 2 || !email.includes("@") || password.length < 8) redirect("/signup?error=Use+a+name,+valid+email,+and+an+8-character+password.");
  if (await findUserByEmail(email)) redirect("/login?error=An+account+with+that+email+already+exists.");
  const user = await createPasswordUser({ name, email, passwordHash: hashPassword(password) });
  if (!user) redirect("/signup?error=We+could+create+your+account.");
  await setSession(user.id);
  redirect("/dashboard/profile");
}

export async function loginAction(formData: FormData) {
  const email = text(formData.get("email")).toLowerCase();
  const password = text(formData.get("password"));
  const user = await findUserByEmail(email);
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) redirect("/login/email?error=The+email+or+password+is+incorrect.");
  const signedInUser = await recordUserSignIn(user.id);
  if (!signedInUser) redirect("/login/email?error=We+could+start+your+session.");
  await setSession(signedInUser.id);
	await redirectAfterAuthentication(signedInUser, formData.get("returnTo"));
}

export async function saveWorkspaceLandingPreferenceAction(formData: FormData) {
		const user = await requireUser("/dashboard/workspaces/preferences");
		const defaultView = text(formData.get("defaultView")); const grantIdText = text(formData.get("defaultCapabilityGrantId")); const grantId = grantIdText ? Number(grantIdText) : null;
		if ((defaultView !== "participant" && defaultView !== "organizer" && defaultView !== "capability") || (defaultView === "capability" && (!Number.isInteger(grantId) || grantId! < 1))) redirect("/dashboard/workspaces/preferences?error=Choose+a+valid+default+workspace.");
		try { await saveWorkspaceLandingPreference(user.id, { defaultView: defaultView as "participant" | "organizer" | "capability", defaultCapabilityGrantId: defaultView === "capability" ? grantId : null }); } catch (error) { redirect(`/dashboard/workspaces/preferences?error=${encodeURIComponent(error instanceof Error ? error.message : "Could not save your workspace preference")}`); }
		revalidatePath("/dashboard/workspaces"); redirect("/dashboard/workspaces/preferences?updated=Default+workspace+saved.");
}

function participantHistoryPayload(formData: FormData) {
	return { wellbeing: text(formData.get("wellbeing")), energyLevel: text(formData.get("energyLevel")), comfort: text(formData.get("comfort")), note: text(formData.get("note")), learningGoal: text(formData.get("learningGoal")), keyTakeaway: text(formData.get("keyTakeaway")), supportTopic: text(formData.get("supportTopic")), participationIntent: text(formData.get("participationIntent")), connectionGoal: text(formData.get("connectionGoal")), feedback: text(formData.get("feedback")), experienceRating: text(formData.get("experienceRating")), highlight: text(formData.get("highlight")) };
}

export async function setParticipantHealthConsentAction(formData: FormData) {
	const user = await requireUser("/dashboard/history"); const granted = text(formData.get("healthConsentGranted")) === "true";
	try { await setParticipantHealthConsent(user.id, granted); } catch (error) { redirect(`/dashboard/history?error=${encodeURIComponent(error instanceof Error ? error.message : "Could not update consent")}`); }
	revalidatePath("/dashboard/history"); redirect(`/dashboard/history?updated=${granted ? "Health+consent+saved" : "Health+consent+withdrawn"}`);
}

export async function createParticipantHistoryEntryAction(formData: FormData) {
	const user = await requireUser("/dashboard/history"); const registrationId = Number(text(formData.get("registrationId"))); if (!Number.isInteger(registrationId) || registrationId < 1) redirect("/dashboard/history?error=Choose+a+valid+event+registration.");
	try { await createParticipantHistoryEntry(user.id, { registrationId, entryDate: text(formData.get("entryDate")), payload: participantHistoryPayload(formData) }); } catch (error) { redirect(`/dashboard/history?error=${encodeURIComponent(error instanceof Error ? error.message : "Could not save your event entry")}`); }
	revalidatePath("/dashboard/history"); redirect("/dashboard/history?updated=New+dated+event+entry+saved.");
}

export async function createParticipantHistoryCorrectionAction(formData: FormData) {
	const user = await requireUser("/dashboard/history"); const entryId = Number(text(formData.get("entryId"))); if (!Number.isInteger(entryId) || entryId < 1) redirect("/dashboard/history?error=Choose+a+valid+history+entry.");
	try { await createParticipantHistoryCorrection(user.id, { entryId, reason: text(formData.get("reason")), payload: participantHistoryPayload(formData) }); } catch (error) { redirect(`/dashboard/history?error=${encodeURIComponent(error instanceof Error ? error.message : "Could not record a separate correction")}`); }
	revalidatePath("/dashboard/history"); redirect("/dashboard/history?updated=Separate+correction+recorded.+Your+original+entry+is+unchanged.");
}

export async function createAuthorityPlanAction(formData: FormData) {
	const user = await requireUser("/dashboard/workspaces/DISTRICT_LEVEL"); const grantId = Number(text(formData.get("grantId"))); if (!Number.isInteger(grantId) || grantId < 1) redirect("/dashboard/workspaces?error=Invalid+authority+workspace.");
	try { await createAuthorityDeliveryPlan(user.id, grantId, { title: text(formData.get("title")), objective: text(formData.get("objective")), startsAt: text(formData.get("startsAt")) ? new Date(text(formData.get("startsAt"))) : null, endsAt: text(formData.get("endsAt")) ? new Date(text(formData.get("endsAt"))) : null }); } catch (error) { redirect(`/dashboard/workspaces/DISTRICT_LEVEL?grant=${grantId}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not create district plan")}`); }
	revalidatePath("/dashboard/workspaces/DISTRICT_LEVEL"); redirect(`/dashboard/workspaces/DISTRICT_LEVEL?grant=${grantId}&updated=District+plan+created.`);
}

export async function createAuthorityProgrammeAction(formData: FormData) {
	const user = await requireUser("/dashboard/workspaces/STATE_LEVEL"); const grantId = Number(text(formData.get("grantId"))); if (!Number.isInteger(grantId) || grantId < 1) redirect("/dashboard/workspaces?error=Invalid+authority+workspace.");
	try { await createAuthorityStateProgramme(user.id, grantId, { title: text(formData.get("title")), objective: text(formData.get("objective")), startsAt: text(formData.get("startsAt")) ? new Date(text(formData.get("startsAt"))) : null, endsAt: text(formData.get("endsAt")) ? new Date(text(formData.get("endsAt"))) : null }); } catch (error) { redirect(`/dashboard/workspaces/STATE_LEVEL?grant=${grantId}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not create state programme")}`); }
	revalidatePath("/dashboard/workspaces/STATE_LEVEL"); redirect(`/dashboard/workspaces/STATE_LEVEL?grant=${grantId}&updated=State+programme+created.`);
}

export async function createAuthorityExceptionAction(formData: FormData) {
	const user = await requireUser("/dashboard/workspaces"); const capabilityCode = text(formData.get("capabilityCode")); const grantId = Number(text(formData.get("grantId"))); if ((capabilityCode !== "DISTRICT_LEVEL" && capabilityCode !== "STATE_LEVEL") || !Number.isInteger(grantId) || grantId < 1) redirect("/dashboard/workspaces?error=Invalid+authority+workspace.");
	try { await createAuthorityException(user.id, capabilityCode, grantId, { title: text(formData.get("title")), details: text(formData.get("details")) }); } catch (error) { redirect(`/dashboard/workspaces/${capabilityCode}?grant=${grantId}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not create authority exception")}`); }
	revalidatePath(`/dashboard/workspaces/${capabilityCode}`); redirect(`/dashboard/workspaces/${capabilityCode}?grant=${grantId}&updated=Authority+exception+created.`);
}

export async function resolveAuthorityExceptionAction(formData: FormData) {
	const user = await requireUser("/dashboard/workspaces"); const capabilityCode = text(formData.get("capabilityCode")); const grantId = Number(text(formData.get("grantId"))); const exceptionId = Number(text(formData.get("exceptionId"))); if ((capabilityCode !== "DISTRICT_LEVEL" && capabilityCode !== "STATE_LEVEL") || !Number.isInteger(grantId) || !Number.isInteger(exceptionId)) redirect("/dashboard/workspaces?error=Invalid+authority+exception.");
	try { await resolveAuthorityException(user.id, capabilityCode, grantId, exceptionId, text(formData.get("resolutionNote"))); } catch (error) { redirect(`/dashboard/workspaces/${capabilityCode}?grant=${grantId}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not resolve authority exception")}`); }
	revalidatePath(`/dashboard/workspaces/${capabilityCode}`); redirect(`/dashboard/workspaces/${capabilityCode}?grant=${grantId}&updated=Authority+exception+resolved.`);
}

export async function moderateAuthorityCapabilityEventAction(formData: FormData) {
	const user = await requireUser("/dashboard/workspaces"); const capabilityCode = text(formData.get("capabilityCode")); const grantId = Number(text(formData.get("grantId"))); const eventId = Number(text(formData.get("eventId"))); const decision = text(formData.get("decision")); if ((capabilityCode !== "LOCAL_AUTHORITY" && capabilityCode !== "DISTRICT_LEVEL") || !Number.isInteger(grantId) || !Number.isInteger(eventId) || !["approved", "rejected", "frozen", "suspended"].includes(decision)) redirect("/dashboard/workspaces?error=Invalid+authority+event+review.");
	try { await moderateAuthorityCapabilityEvent(user.id, capabilityCode, grantId, eventId, decision as "approved" | "rejected" | "frozen" | "suspended", text(formData.get("note"))); } catch (error) { redirect(`/dashboard/workspaces/${capabilityCode}?grant=${grantId}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not record authority review")}`); }
	revalidatePath(`/dashboard/workspaces/${capabilityCode}`); redirect(`/dashboard/workspaces/${capabilityCode}?grant=${grantId}&updated=Authority+event+review+recorded.`);
}

export async function adminLoginAction(formData: FormData) {
  const email = text(formData.get("email")).toLowerCase();
  const password = text(formData.get("password"));
  const user = await findUserByEmail(email);
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) redirect("/admin/login?error=The+email+or+password+is+incorrect.");
  if (!isAdministrator(user)) redirect("/admin/login?error=This+account+does+not+have+administrator+access.");
  const signedInUser = await recordUserSignIn(user.id);
  if (!signedInUser) redirect("/admin/login?error=We+could+not+start+your+administrator+session.");
  await setSession(signedInUser.id);
  redirect(safeReturnTo(formData.get("returnTo"), "/admin"));
}

export async function localAuthorityLoginAction(formData: FormData) {
  const email = text(formData.get("email")).toLowerCase(); const password = text(formData.get("password"));
  const user = await findUserByEmail(email);
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) redirect("/local-authority/login?error=The+email+or+password+is+incorrect.");
  if (!isLocalAuthority(user)) redirect("/local-authority/login?error=This+account+does+not+have+Local+Authority+access.");
  const signedInUser = await recordUserSignIn(user.id);
  if (!signedInUser) redirect("/local-authority/login?error=We+could+not+start+your+Local+Authority+session.");
  await setSession(signedInUser.id);
  redirect(safeReturnTo(formData.get("returnTo"), "/local-authority"));
}

/** @deprecated Stage 1 compatibility alias. */
export const mcdLoginAction = localAuthorityLoginAction;

export async function csrLoginAction(formData: FormData) {
  const email = text(formData.get("email")).toLowerCase(); const password = text(formData.get("password"));
  const user = await findUserByEmail(email);
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) redirect("/csr/login?error=The+email+or+password+is+incorrect.");
  if (!isCsrSponsor(user)) redirect("/csr/login?error=This+account+does+not+have+CSR+sponsor+access.");
  const signedInUser = await recordUserSignIn(user.id);
  if (!signedInUser) redirect("/csr/login?error=We+could+not+start+your+CSR+session.");
  await setSession(signedInUser.id);
  redirect(safeReturnTo(formData.get("returnTo"), "/csr"));
}

export async function adminMasterUpdateAction(formData: FormData) {
  const admin = await requireAdministratorAction();
  const requestedView = text(formData.get("view"));
  const view = ["users", "events", "payments", "venues", "reports", "csr"].includes(requestedView) ? requestedView : "overview";
  const intent = text(formData.get("intent"));
  const targetId = Number(text(formData.get("targetId")));
  const value = text(formData.get("value"));
  if (!Number.isInteger(targetId) || targetId < 1 || text(formData.get("confirmation")) !== "MASTER") redirect(`/admin?view=${view}&error=Type+MASTER+to+confirm+the+change.`);
  if (intent === "user-role" && (value === "user" || value === "admin" || value === "mcd" || value === "csr" || value === "state" || value === "district")) await adminSetUserRole(admin.id, targetId, value);
  else if (intent === "event-moderation" && (value === "approved" || value === "rejected" || value === "frozen" || value === "suspended" || value === "deleted")) {
    const moderated = await adminModerateEvent(admin.id, targetId, value, text(formData.get("note")), normalizePlatformFeePercent(text(formData.get("platformFeePercent"))));
    if (value === "approved" && moderated.organizerParticipation?.created) {
      const organizer = await findUserById(moderated.event.organizerId);
      try {
        await sendOrganizerParticipationConfirmation({ organizerEmail: organizer?.email, organizerName: organizer?.name, eventName: moderated.event.displayName, startsAt: moderated.event.startsAt, eventUrl: `${await requestOrigin()}/events/${moderated.event.slug}`, userPublicId: moderated.organizerParticipation.registration.attendeePublicId, eventPublicId: moderated.event.publicId, orderNumber: moderated.organizerParticipation.registration.orderNumber, ticketName: moderated.organizerParticipation.ticket?.name });
      } catch (error) { console.error("[OrganizerParticipation] Approval email delivery failed", error); }
    }
  }
  else if (intent === "registration-status" && (value === "confirmed" || value === "cancelled" || value === "checked_in")) await adminSetRegistrationStatus(admin.id, targetId, value);
  else if (intent === "payment-status" && (value === "not_required" || value === "pending" || value === "paid" || value === "failed" || value === "refunded")) await adminSetPaymentStatus(admin.id, targetId, value);
  else if (intent === "promotion-status" && (value === "draft" || value === "scheduled" || value === "active" || value === "completed")) await adminSetPromotionStatus(admin.id, targetId, value);
  else redirect(`/admin?view=${view}&error=Unsupported+master+action.`);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/events");
  redirect(`/admin?view=${view}&updated=Master+change+applied+and+recorded+in+the+audit+log.`);
}

export async function adminUpdatePlatformSettingsAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=settings");
  if (text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=settings&error=Type+MASTER+to+save+gateway+settings.");
  await adminUpdatePlatformSettings(admin.id, { gatewayFeePercent: Number(text(formData.get("gatewayFeePercent"))), invoicePrefix: text(formData.get("invoicePrefix")), issuerLegalName: text(formData.get("issuerLegalName")) || null, issuerTaxRegistrationNumber: text(formData.get("issuerTaxRegistrationNumber")) || null, issuerAddress: text(formData.get("issuerAddress")) || null });
  revalidatePath("/admin"); revalidatePath("/"); revalidatePath("/events");
  redirect("/admin?view=settings&updated=Gateway+fee+and+invoice+settings+saved.+Future+registrations+use+the+new+rate.");
}

export async function adminCreateLocalAuthorityAccountAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=users");
  const name = text(formData.get("name")); const email = text(formData.get("email")).toLowerCase(); const password = text(formData.get("password"));
  if (text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=users&error=Type+MASTER+to+create+a+Local+Authority+account.");
  if (name.length < 2 || !email.includes("@") || password.length < 8) redirect("/admin?view=users&error=Enter+a+name,+valid+email,+and+an+8-character+password+for+the+Local+Authority+account.");
  try { await adminCreateLocalAuthorityAccount(admin.id, { name, email, passwordHash: hashPassword(password), designation: text(formData.get("designation")) || null, department: text(formData.get("department")) || null, state: text(formData.get("state")) || null, city: text(formData.get("city")) || null, zone: text(formData.get("zone")) || null, ward: text(formData.get("ward")) || null, areaOfWork: text(formData.get("areaOfWork")) || null, notes: text(formData.get("notes")) || null }); } catch (error) { redirect(`/admin?view=users&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not create the Local Authority account")}`); }
  revalidatePath("/admin");
  redirect("/admin?view=users&updated=Local+Authority+account+created+and+recorded+in+the+audit+log.");
}

/** @deprecated Stage 1 compatibility alias. */
export const adminCreateMcdAccountAction = adminCreateLocalAuthorityAccountAction;

export async function adminCreateCsrAccountAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=users");
  const name = text(formData.get("name")); const email = text(formData.get("email")).toLowerCase(); const password = text(formData.get("password"));
  const companyName = text(formData.get("companyName")); const contactName = text(formData.get("contactName")); const contactEmail = text(formData.get("contactEmail")).toLowerCase();
  if (text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=users&error=Type+MASTER+to+create+a+CSR+sponsor+account.");
  if (name.length < 2 || !email.includes("@") || password.length < 8 || companyName.length < 2 || contactName.length < 2 || !contactEmail.includes("@")) redirect("/admin?view=users&error=Complete+the+CSR+account,+company,+contact,+email,+and+password+fields.");
  try { await adminCreateCsrAccount(admin.id, { name, email, passwordHash: hashPassword(password), profile: { companyName, registrationNumber: text(formData.get("registrationNumber")) || null, foundationName: text(formData.get("foundationName")) || null, contactName, contactEmail, contactPhone: text(formData.get("contactPhone")) || null, focusAreas: text(formData.get("focusAreas")) || null }, designation: text(formData.get("designation")) || null, department: text(formData.get("department")) || null, state: text(formData.get("state")) || null, city: text(formData.get("city")) || null, zone: text(formData.get("zone")) || null, ward: text(formData.get("ward")) || null, areaOfWork: text(formData.get("areaOfWork")) || null, notes: text(formData.get("notes")) || null }); } catch (error) { redirect(`/admin?view=users&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not create the CSR sponsor account")}`); }
  revalidatePath("/admin"); redirect("/admin?view=users&updated=CSR+sponsor+account+created+and+recorded+in+the+audit+log.");
}

export async function adminCreateStateAccountAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=users");
  const name = text(formData.get("name")); const email = text(formData.get("email")).toLowerCase(); const password = text(formData.get("password"));
  if (text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=users&error=Type+MASTER+to+create+a+State+Authority+account.");
  if (name.length < 2 || !email.includes("@") || password.length < 8) redirect("/admin?view=users&error=Enter+a+name,+valid+email,+and+an+8-character+password+for+the+State+Authority+account.");
  try { await adminCreateStateAccount(admin.id, { name, email, passwordHash: hashPassword(password), designation: text(formData.get("designation")) || null, department: text(formData.get("department")) || null, state: text(formData.get("state")) || null, city: text(formData.get("city")) || null, zone: text(formData.get("zone")) || null, ward: text(formData.get("ward")) || null, areaOfWork: text(formData.get("areaOfWork")) || null, notes: text(formData.get("notes")) || null }); } catch (error) { redirect(`/admin?view=users&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not create the State Authority account")}`); }
  revalidatePath("/admin");
  redirect("/admin?view=users&updated=State+Authority+account+created+and+recorded+in+the+audit+log.");
}

export async function adminCreateDistrictAccountAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=users");
  const name = text(formData.get("name")); const email = text(formData.get("email")).toLowerCase(); const password = text(formData.get("password"));
  if (text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=users&error=Type+MASTER+to+create+a+District+Authority+account.");
  if (name.length < 2 || !email.includes("@") || password.length < 8) redirect("/admin?view=users&error=Enter+a+name,+valid+email,+and+an+8-character+password+for+the+District+Authority+account.");
  try { await adminCreateDistrictAccount(admin.id, { name, email, passwordHash: hashPassword(password), designation: text(formData.get("designation")) || null, department: text(formData.get("department")) || null, state: text(formData.get("state")) || null, city: text(formData.get("city")) || null, zone: text(formData.get("zone")) || null, ward: text(formData.get("ward")) || null, areaOfWork: text(formData.get("areaOfWork")) || null, notes: text(formData.get("notes")) || null }); } catch (error) { redirect(`/admin?view=users&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not create the District Authority account")}`); }
  revalidatePath("/admin");
  redirect("/admin?view=users&updated=District+Authority+account+created+and+recorded+in+the+audit+log.");
}

async function requireLocalAuthorityAction(returnTo = "/local-authority") {
  const user = await currentUser();
  if (!user || !isLocalAuthority(user)) redirect(`/local-authority/login?returnTo=${encodeURIComponent(returnTo)}`);
  return user;
}

async function requireCsrSponsorAction(returnTo = "/csr") {
  const user = await currentUser();
  if (!user || !isCsrSponsor(user)) redirect(`/csr/login?returnTo=${encodeURIComponent(returnTo)}`);
  return user;
}

function paiseFromRupees(value: FormDataEntryValue | null) {
  const rupees = Number(text(value)); return Number.isFinite(rupees) ? Math.round(rupees * 100) : 0;
}

function optionalDate(value: FormDataEntryValue | null) {
  const raw = text(value); if (!raw) return null; const parsed = new Date(`${raw}T00:00:00`); return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function csrCreateBudgetAction(formData: FormData) {
  const sponsor = await requireCsrSponsorAction();
  try { await csrCreateBudget(sponsor.id, { label: text(formData.get("label")), totalPaise: paiseFromRupees(formData.get("amountRupees")), startsAt: optionalDate(formData.get("startsAt")), endsAt: optionalDate(formData.get("endsAt")) }); } catch (error) { redirect(`/csr?view=budgets&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not create CSR budget")}`); }
  revalidatePath("/csr"); redirect("/csr?view=budgets&updated=CSR+budget+created+and+audit+logged.");
}

export async function csrCreateSponsorshipRequestAction(formData: FormData) {
  const sponsor = await requireCsrSponsorAction();
  const budgetId = Number(text(formData.get("budgetId"))); const requestIdText = text(formData.get("requestId")); const requestId = requestIdText ? Number(requestIdText) : null; const requestKind = text(formData.get("requestKind")) === "future_event" ? "future_event" as const : "existing_event" as const;
  const capacityText = text(formData.get("estimatedCapacity")); const estimatedCapacity = capacityText ? Number(capacityText) : null;
  if (!Number.isInteger(budgetId) || budgetId < 1) redirect("/csr?view=sponsor&error=Choose+an+active+CSR+budget.");
  if (requestId !== null && (!Number.isInteger(requestId) || requestId < 1)) redirect("/csr?view=sponsor&error=Invalid+sponsorship+request.");
  try { await csrSaveSponsorshipRequest(sponsor.id, { budgetId, requestKind, eventType: text(formData.get("eventType")), titlePreference: text(formData.get("titlePreference")) || null, intendedAudience: text(formData.get("intendedAudience")), cityPreference: text(formData.get("cityPreference")) || null, zonePreference: text(formData.get("zonePreference")) || null, wardPreference: text(formData.get("wardPreference")) || null, preferredStartDate: optionalDate(formData.get("preferredStartDate")), preferredEndDate: optionalDate(formData.get("preferredEndDate")), estimatedCapacity, accessibilityNeeds: text(formData.get("accessibilityNeeds")) || null, successIndicators: text(formData.get("successIndicators")) || null, details: text(formData.get("details")), amountPaise: paiseFromRupees(formData.get("amountRupees")), submissionNote: text(formData.get("submissionNote")) || null }, requestId); } catch (error) { redirect(`/csr?view=sponsor${requestId ? `&edit=${requestId}` : ""}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not save the sponsorship request")}`); }
  revalidatePath("/csr"); redirect(`/csr?view=sponsor${requestId ? `&edit=${requestId}` : ""}&updated=${requestId ? "CSR+sponsorship+brief+updated.+Submit+it+for+administrator+review+when+ready." : "CSR+sponsorship+brief+saved.+Submit+it+for+administrator+review+when+ready."}`);
}

export async function csrSubmitSponsorshipRequestAction(formData: FormData) {
  const sponsor = await requireCsrSponsorAction(); const requestId = Number(text(formData.get("requestId")));
  if (!Number.isInteger(requestId) || requestId < 1) redirect("/csr?view=sponsor&error=Invalid+sponsorship+request.");
  try { await csrSubmitSponsorshipRequest(sponsor.id, requestId, text(formData.get("submissionNote"))); } catch (error) { redirect(`/csr?view=sponsor&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not submit the sponsorship request")}`); }
  revalidatePath("/csr"); revalidatePath("/admin"); redirect("/csr?view=sponsor&updated=Sponsorship+request+sent+to+the+administrator+for+review.");
}

export async function saveCsrCapabilityProfileAction(formData: FormData) {
  const user = await requireUser("/dashboard/workspaces"); const grantId = Number(text(formData.get("grantId"))); const base = `/dashboard/workspaces/CSR_SPONSORSHIP?grant=${grantId}`;
  if (!Number.isInteger(grantId) || grantId < 1) redirect("/dashboard/workspaces?error=Invalid+CSR+workspace.");
  try { await saveCsrCapabilityProfile(user.id, grantId, { companyName: text(formData.get("companyName")), registrationNumber: text(formData.get("registrationNumber")) || null, foundationName: text(formData.get("foundationName")) || null, contactName: text(formData.get("contactName")), contactEmail: text(formData.get("contactEmail")).toLowerCase(), contactPhone: text(formData.get("contactPhone")) || null, focusAreas: text(formData.get("focusAreas")) || null }); } catch (error) { redirect(`${base}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not save CSR profile")}`); }
  revalidatePath(base); redirect(`${base}&updated=CSR+profile+saved.`);
}

export async function createCsrCapabilityBudgetAction(formData: FormData) {
  const user = await requireUser("/dashboard/workspaces"); const grantId = Number(text(formData.get("grantId"))); const base = `/dashboard/workspaces/CSR_SPONSORSHIP?grant=${grantId}`;
  if (!Number.isInteger(grantId) || grantId < 1) redirect("/dashboard/workspaces?error=Invalid+CSR+workspace.");
  try { await csrCreateCapabilityBudget(user.id, grantId, { label: text(formData.get("label")), totalPaise: paiseFromRupees(formData.get("amountRupees")), startsAt: optionalDate(formData.get("startsAt")), endsAt: optionalDate(formData.get("endsAt")) }); } catch (error) { redirect(`${base}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not create CSR budget")}`); }
  revalidatePath(base); redirect(`${base}&updated=CSR+budget+created.`);
}

export async function saveCsrCapabilitySponsorshipRequestAction(formData: FormData) {
  const user = await requireUser("/dashboard/workspaces"); const grantId = Number(text(formData.get("grantId"))); const requestIdText = text(formData.get("requestId")); const requestId = requestIdText ? Number(requestIdText) : null; const budgetId = Number(text(formData.get("budgetId"))); const capacityText = text(formData.get("estimatedCapacity")); const estimatedCapacity = capacityText ? Number(capacityText) : null; const base = `/dashboard/workspaces/CSR_SPONSORSHIP?grant=${grantId}`;
  if (!Number.isInteger(grantId) || grantId < 1 || !Number.isInteger(budgetId) || budgetId < 1 || (requestId !== null && (!Number.isInteger(requestId) || requestId < 1))) redirect(`${base}&error=Complete+the+CSR+request+details.`);
  try { await csrSaveCapabilitySponsorshipRequest(user.id, grantId, { budgetId, requestKind: text(formData.get("requestKind")) === "future_event" ? "future_event" : "existing_event", eventType: text(formData.get("eventType")), titlePreference: text(formData.get("titlePreference")) || null, intendedAudience: text(formData.get("intendedAudience")), cityPreference: text(formData.get("cityPreference")) || null, zonePreference: text(formData.get("zonePreference")) || null, wardPreference: text(formData.get("wardPreference")) || null, preferredStartDate: optionalDate(formData.get("preferredStartDate")), preferredEndDate: optionalDate(formData.get("preferredEndDate")), estimatedCapacity, accessibilityNeeds: text(formData.get("accessibilityNeeds")) || null, successIndicators: text(formData.get("successIndicators")) || null, details: text(formData.get("details")), amountPaise: paiseFromRupees(formData.get("amountRupees")), submissionNote: text(formData.get("submissionNote")) || null }, requestId); } catch (error) { redirect(`${base}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not save CSR request")}`); }
  revalidatePath(base); redirect(`${base}&updated=CSR+sponsorship+request+saved+as+a+draft.`);
}

export async function csrSubmitCapabilitySponsorshipRequestAction(formData: FormData) {
  const user = await requireUser("/dashboard/workspaces"); const grantId = Number(text(formData.get("grantId"))); const requestId = Number(text(formData.get("requestId"))); const base = `/dashboard/workspaces/CSR_SPONSORSHIP?grant=${grantId}`;
  if (!Number.isInteger(grantId) || grantId < 1 || !Number.isInteger(requestId) || requestId < 1) redirect(`${base}&error=Invalid+CSR+workspace+request.`);
  try { await csrSubmitCapabilitySponsorshipRequest(user.id, grantId, requestId, text(formData.get("submissionNote"))); } catch (error) { redirect(`${base}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not submit the CSR request")}`); }
  revalidatePath(base); revalidatePath("/admin"); redirect(`${base}&updated=CSR+sponsorship+request+submitted+for+administrator+review.`);
}

export async function adminReviewCsrCapabilityRequestAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=csr"); const requestId = Number(text(formData.get("requestId"))); const decision = text(formData.get("decision")); const note = text(formData.get("reviewNote"));
  if (text(formData.get("confirmation")) !== "MASTER" || !Number.isInteger(requestId) || requestId < 1 || (decision !== "approved" && decision !== "changes_requested" && decision !== "rejected")) redirect("/admin?view=csr&error=Provide+a+valid+MASTER-confirmed+CSR+review.");
  try { await adminReviewCsrCapabilityRequest(admin.id, requestId, decision, note); } catch (error) { redirect(`/admin?view=csr&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not review CSR request")}`); }
  revalidatePath("/admin"); revalidatePath("/dashboard/workspaces"); redirect("/admin?view=csr&updated=CSR+capability+review+recorded.");
}

export async function adminAssignCsrCapabilityRequestAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=csr"); const requestId = Number(text(formData.get("requestId"))); const eventIdText = text(formData.get("eventId")); const eventId = eventIdText ? Number(eventIdText) : null; const useConcept = text(formData.get("assignmentTarget")) === "concept";
  if (text(formData.get("confirmation")) !== "MASTER" || !Number.isInteger(requestId) || requestId < 1 || (eventId !== null && (!Number.isInteger(eventId) || eventId < 1))) redirect("/admin?view=csr&error=Provide+a+valid+MASTER-confirmed+CSR+assignment.");
  try { await adminAssignCsrCapabilityRequest(admin.id, { requestId, eventId: useConcept ? null : eventId, concept: useConcept ? { title: text(formData.get("conceptTitle")), notes: text(formData.get("conceptNotes")) } : null, assignmentNote: text(formData.get("assignmentNote")), approvedParticipantFields: formData.getAll("approvedParticipantFields").map(value => text(value)) }); } catch (error) { redirect(`/admin?view=csr&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not assign CSR request")}`); }
  revalidatePath("/admin"); revalidatePath("/dashboard/workspaces"); redirect("/admin?view=csr&updated=CSR+sponsorship+and+assignment+records+created.");
}

export async function adminRecordCsrCapabilityFundingAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=csr"); const sponsorshipId = Number(text(formData.get("sponsorshipId")));
  if (text(formData.get("confirmation")) !== "MASTER" || !Number.isInteger(sponsorshipId) || sponsorshipId < 1) redirect("/admin?view=csr&error=Provide+a+valid+MASTER-confirmed+funding+record.");
  try { await adminRecordCsrCapabilityFunding(admin.id, sponsorshipId, { transactionReference: text(formData.get("transactionReference")), transactionDate: optionalDate(formData.get("transactionDate")), reportSummary: text(formData.get("reportSummary")) || null, complete: text(formData.get("complete")) === "true" }); } catch (error) { redirect(`/admin?view=csr&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not record CSR funding")}`); }
  revalidatePath("/admin"); revalidatePath("/dashboard/workspaces"); redirect("/admin?view=csr&updated=CSR+funding+record+updated.");
}

export async function saveCapabilityApplicationAction(formData: FormData) {
  const user = await requireUser("/dashboard/capabilities"); const applicationIdText = text(formData.get("applicationId")); const applicationId = applicationIdText ? Number(applicationIdText) : null; const capabilityId = Number(text(formData.get("capabilityId")));
  if (!Number.isInteger(capabilityId) || capabilityId < 1 || (applicationId !== null && (!Number.isInteger(applicationId) || applicationId < 1))) redirect("/dashboard/capabilities?error=Choose+a+valid+capability+application.");
  const scopeType = text(formData.get("scopeType"));
  if (!["national", "state", "district", "city", "zone", "ward"].includes(scopeType)) redirect("/dashboard/capabilities?error=Choose+a+supported+scope.");
  const roleSpecificData = Object.fromEntries(["companyName", "registrationNumber", "contactPerson", "officialEmail", "mobile", "programmeName", "fundsAvailable", "proposalPurpose", "transactionStatus", "referenceNumber", "referenceDate", "proposedActivity", "serviceArea", "expectedParticipants", "expectedImpact", "declarationAccepted", "authorityName", "department", "officerName", "officialId", "officialMobile"].map(key => [key, text(formData.get(key))]));
  const supportingDocument = formData.get("supportingDocument");
  try {
    const application = await saveCapabilityApplication(user.id, { capabilityId, functionIds: formData.getAll("functionIds").map(value => Number(text(value))), justification: text(formData.get("justification")), scopeType: scopeType as "national" | "state" | "district" | "city" | "zone" | "ward", state: text(formData.get("scopeState")) || null, district: text(formData.get("scopeDistrict")) || null, city: text(formData.get("scopeCity")) || null, zone: text(formData.get("scopeZone")) || null, ward: text(formData.get("scopeWard")) || null, startsAt: optionalDate(formData.get("startsAt")), endsAt: optionalDate(formData.get("endsAt")), applicantNote: text(formData.get("applicantNote")) || null, roleSpecificData }, applicationId);
    if (supportingDocument instanceof File && supportingDocument.size > 0) {
      const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
      if (!allowedTypes.has(supportingDocument.type) || supportingDocument.size > 8 * 1024 * 1024) throw new Error("Attach a PDF, JPEG, or PNG supporting document no larger than 8 MB");
      const safeName = supportingDocument.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 140) || "supporting-document";
      const upload = await storagePut(`capability-applications/${user.id}/${application.id}/${safeName}`, Buffer.from(await supportingDocument.arrayBuffer()), supportingDocument.type);
      await addCapabilityApplicationDocument(user.id, application.id, { storageKey: upload.key, fileName: safeName, contentType: supportingDocument.type, sizeBytes: supportingDocument.size });
    }
  } catch (error) { redirect(`/dashboard/capabilities${applicationId ? `?edit=${applicationId}&` : "?"}error=${encodeURIComponent(error instanceof Error ? error.message : "Could not save capability application")}`); }
  revalidatePath("/dashboard/capabilities"); revalidatePath("/admin"); redirect(`/dashboard/capabilities${applicationId ? `?edit=${applicationId}&` : "?"}updated=${applicationId ? "Capability+application+updated.+Submit+when+ready." : "Capability+application+saved.+Submit+when+ready."}`);
}

export async function submitCapabilityApplicationAction(formData: FormData) {
  const user = await requireUser("/dashboard/capabilities"); const applicationId = Number(text(formData.get("applicationId")));
  if (!Number.isInteger(applicationId) || applicationId < 1) redirect("/dashboard/capabilities?error=Invalid+capability+application.");
  try { await submitCapabilityApplication(user.id, applicationId, text(formData.get("applicantNote")) || null); } catch (error) { redirect(`/dashboard/capabilities?error=${encodeURIComponent(error instanceof Error ? error.message : "Could not submit capability application")}`); }
  revalidatePath("/dashboard/capabilities"); revalidatePath("/admin"); redirect("/dashboard/capabilities?updated=Capability+application+sent+for+master+review.");
}

export async function markCapabilityDecisionNotificationReadAction(formData: FormData) {
  const user = await requireUser("/dashboard/capabilities"); const notificationId = Number(text(formData.get("notificationId")));
  await markCapabilityDecisionNotificationRead(user.id, notificationId);
  revalidatePath("/dashboard/capabilities"); redirect("/dashboard/capabilities#capability-decision-notifications");
}

export async function markCapabilityDecisionNotificationsReadAction(formData: FormData) {
  const user = await requireUser("/dashboard/capabilities"); const requested = text(formData.get("decisionFilter"));
  const decisionFilter = ["all", "unread", "approved", "returned", "rejected", "grant"].includes(requested) ? requested as "all" | "unread" | "approved" | "returned" | "rejected" | "grant" : "all";
  await markCapabilityDecisionNotificationsRead(user.id, decisionFilter);
  revalidatePath("/dashboard/capabilities"); redirect(`/dashboard/capabilities?decisionFilter=${decisionFilter}#capability-decision-notifications`);
}

export async function adminReviewCapabilityApplicationAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=capabilities"); const applicationId = Number(text(formData.get("applicationId"))); const decision = text(formData.get("decision"));
  if (!Number.isInteger(applicationId) || applicationId < 1 || text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=capabilities&error=Type+MASTER+to+review+the+capability+application.");
  if (!["approved", "changes_requested", "rejected"].includes(decision)) redirect("/admin?view=capabilities&error=Choose+a+valid+capability+application+decision.");
  const scopeType = text(formData.get("scopeType"));
  try { await adminReviewCapabilityApplication(admin.id, { applicationId, decision: decision as "approved" | "changes_requested" | "rejected", note: text(formData.get("reviewNote")), selectedFunctionIds: formData.getAll("functionIds").map(value => Number(text(value))), scope: { scopeType: (["national", "state", "district", "city", "zone", "ward"].includes(scopeType) ? scopeType : "national") as "national" | "state" | "district" | "city" | "zone" | "ward", state: text(formData.get("scopeState")) || null, district: text(formData.get("scopeDistrict")) || null, city: text(formData.get("scopeCity")) || null, zone: text(formData.get("scopeZone")) || null, ward: text(formData.get("scopeWard")) || null }, startsAt: optionalDate(formData.get("startsAt")), endsAt: optionalDate(formData.get("endsAt")) }); } catch (error) { redirect(`/admin?view=capabilities&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not review capability application")}`); }
  revalidatePath("/admin"); revalidatePath("/dashboard/capabilities"); redirect("/admin?view=capabilities&updated=Capability+application+decision+and+any+grant+were+recorded+in+the+audit+log.");
}

export async function adminUpdateCapabilityGrantAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=capabilities"); const grantId = Number(text(formData.get("grantId"))); const status = text(formData.get("status"));
  if (!Number.isInteger(grantId) || grantId < 1 || text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=capabilities&error=Type+MASTER+to+update+the+capability+grant.");
  if (!["active", "suspended", "revoked", "expired"].includes(status)) redirect("/admin?view=capabilities&error=Choose+a+valid+capability+grant+status.");
  try { await adminUpdateCapabilityGrant(admin.id, grantId, status as "active" | "suspended" | "revoked" | "expired", text(formData.get("administrativeReason"))); } catch (error) { redirect(`/admin?view=capabilities&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not update capability grant")}`); }
  revalidatePath("/admin"); revalidatePath("/dashboard/capabilities"); redirect("/admin?view=capabilities&updated=Capability+grant+status+recorded+in+the+audit+log.");
}

export async function adminExpireDueCapabilityGrantsAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=capabilities");
  if (text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=capabilities&error=Type+MASTER+to+process+due+grant+expiries.");
  try { const expired = await adminExpireDueCapabilityGrants(admin.id, text(formData.get("administrativeReason"))); revalidatePath("/dashboard/capabilities"); revalidatePath("/local-authority"); revalidatePath("/mcd"); revalidatePath("/admin"); redirect(`/admin?view=capabilities&updated=${encodeURIComponent(`${expired} due capability grant${expired === 1 ? "" : "s"} expired and audit logged.`)}`); } catch (error) { redirect(`/admin?view=capabilities&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not process due grant expiries")}`); }
}

export async function adminCreateLocalAuthorityMigrationGrantAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=capabilities"); const userId = Number(text(formData.get("userId"))); const scopeType = text(formData.get("scopeType"));
  if (!Number.isInteger(userId) || userId < 1 || text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=capabilities&error=Choose+a+Local+Authority+account+and+type+MASTER+to+create+the+migration+grant.");
  if (!["national", "state", "district", "city", "zone", "ward"].includes(scopeType)) redirect("/admin?view=capabilities&error=Choose+a+supported+grant+scope.");
  try { await adminCreateLocalAuthorityMigrationGrant(admin.id, { userId, functionIds: formData.getAll("functionIds").map(value => Number(text(value))), scope: { scopeType: scopeType as "national" | "state" | "district" | "city" | "zone" | "ward", state: text(formData.get("scopeState")) || null, district: text(formData.get("scopeDistrict")) || null, city: text(formData.get("scopeCity")) || null, zone: text(formData.get("scopeZone")) || null, ward: text(formData.get("scopeWard")) || null }, startsAt: optionalDate(formData.get("startsAt")), endsAt: optionalDate(formData.get("endsAt")), reason: text(formData.get("administrativeReason")) }); } catch (error) { redirect(`/admin?view=capabilities&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not create Local Authority migration grant")}`); }
	revalidatePath("/admin"); revalidatePath("/local-authority"); revalidatePath("/mcd"); redirect("/admin?view=capabilities&updated=Local+Authority+migration+grant+created+and+audit+logged.+Enable+Stage+4+enforcement+only+after+reviewing+scope.");
}

export async function adminCreateCsrMigrationGrantAction(formData: FormData) {
	const admin = await requireAdministratorAction("/admin?view=capabilities"); const userId = Number(text(formData.get("userId"))); const scopeType = text(formData.get("scopeType"));
	if (!Number.isInteger(userId) || userId < 1 || text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=capabilities&error=Choose+a+CSR+account+and+type+MASTER+to+create+the+migration+grant.");
	if (!["national", "state", "district", "city", "zone", "ward"].includes(scopeType)) redirect("/admin?view=capabilities&error=Choose+a+supported+grant+scope.");
	try { await adminCreateCsrMigrationGrant(admin.id, { userId, functionIds: formData.getAll("functionIds").map(value => Number(text(value))), scope: { scopeType: scopeType as "national" | "state" | "district" | "city" | "zone" | "ward", state: text(formData.get("scopeState")) || null, district: text(formData.get("scopeDistrict")) || null, city: text(formData.get("scopeCity")) || null, zone: text(formData.get("scopeZone")) || null, ward: text(formData.get("scopeWard")) || null }, startsAt: optionalDate(formData.get("startsAt")), endsAt: optionalDate(formData.get("endsAt")), reason: text(formData.get("administrativeReason")) }); } catch (error) { redirect(`/admin?view=capabilities&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not create CSR migration grant")}`); }
	revalidatePath("/admin"); revalidatePath("/csr"); redirect("/admin?view=capabilities&updated=CSR+migration+grant+created+and+audit+logged.+Enable+Stage+5+CSR+enforcement+only+after+reviewing+scope.");
}

export async function adminReviewCsrSponsorshipRequestAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=csr"); const requestId = Number(text(formData.get("requestId"))); const decision = text(formData.get("decision")); const note = text(formData.get("reviewNote"));
  if (!Number.isInteger(requestId) || requestId < 1 || text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=csr&error=Type+MASTER+to+review+the+CSR+request.");
  if (decision !== "approved" && decision !== "changes_requested" && decision !== "rejected") redirect("/admin?view=csr&error=Choose+a+valid+CSR+request+decision.");
  try { await adminReviewCsrSponsorshipRequest(admin.id, requestId, decision, note); } catch (error) { redirect(`/admin?view=csr&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not review the CSR request")}`); }
  revalidatePath("/admin"); revalidatePath("/csr"); redirect("/admin?view=csr&updated=CSR+request+review+recorded+in+the+audit+log.");
}

export async function adminAssignCsrSponsorshipRequestAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=csr"); const requestId = Number(text(formData.get("requestId"))); const eventId = Number(text(formData.get("eventId"))); const note = text(formData.get("assignmentNote"));
  if (!Number.isInteger(requestId) || requestId < 1 || !Number.isInteger(eventId) || eventId < 1 || text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=csr&error=Choose+an+event+and+type+MASTER+to+confirm+the+CSR+assignment.");
  try { await adminAssignCsrSponsorshipRequest(admin.id, requestId, eventId, note); } catch (error) { redirect(`/admin?view=csr&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not assign the sponsored event")}`); }
  revalidatePath("/admin"); revalidatePath("/csr"); revalidatePath("/local-authority"); revalidatePath("/mcd"); redirect("/admin?view=csr&updated=CSR+request+matched+to+an+event,+budget+committed,+and+assignment+audited.");
}

export async function localAuthorityEventReviewAction(formData: FormData) {
  const authority = await requireLocalAuthorityAction("/local-authority?view=events"); const eventId = Number(text(formData.get("eventId"))); const decision = text(formData.get("decision")); const note = text(formData.get("note"));
  const confirmation = text(formData.get("confirmation"));
  if (!Number.isInteger(eventId) || eventId < 1 || (confirmation !== "LOCAL" && confirmation !== "MCD")) redirect("/local-authority?view=events&error=Type+LOCAL+to+confirm+the+event+review.");
  if (decision !== "approved" && decision !== "rejected" && decision !== "frozen" && decision !== "suspended") redirect("/local-authority?view=events&error=Choose+a+valid+Local+Authority+event+decision.");
  try { await localAuthorityModerateEvent(authority.id, eventId, decision, note); } catch (error) { redirect(`/local-authority?view=events&error=${encodeURIComponent(error instanceof Error ? error.message : "Local Authority event review failed")}`); }
  revalidatePath("/local-authority"); revalidatePath("/mcd"); revalidatePath("/admin"); revalidatePath("/"); revalidatePath("/events");
  redirect("/local-authority?view=events&updated=Event+review+recorded+in+the+audit+log.");
}

/** @deprecated Stage 1 compatibility alias. */
export const mcdEventReviewAction = localAuthorityEventReviewAction;

export async function adminVenueDirectoryAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=venues");
  if (text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=venues&error=Type+MASTER+to+confirm+the+venue+change.");
  const latitudeE6 = coordinateToE6(text(formData.get("latitude")), "latitude");
  const longitudeE6 = coordinateToE6(text(formData.get("longitude")), "longitude");
  const zone = normalizeLocationText(text(formData.get("zone")), 100); const ward = normalizeLocationText(text(formData.get("ward")), 100); const location = normalizeLocationText(text(formData.get("location")), 160); const venueName = normalizeLocationText(text(formData.get("venueName")), 160); const city = normalizeLocationText(text(formData.get("city")), 100);
  const capacityText = text(formData.get("capacity")); const capacity = capacityText ? Number(capacityText) : null;
  if (!zone || !ward || !location || !venueName || !city || latitudeE6 === null || longitudeE6 === null) redirect("/admin?view=venues&error=Complete+all+required+venue+details+and+valid+GPS+coordinates.");
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 1_000_000)) redirect("/admin?view=venues&error=Capacity+must+be+a+whole+number+between+1+and+1000000.");
  const venueId = Number(text(formData.get("venueId"))) || null;
  await adminSaveVenue(admin.id, venueId, { zone, ward, location, venueName, city, address: normalizeLocationText(text(formData.get("address")), 1000) || null, sector: normalizeLocationText(text(formData.get("sector")), 100) || null, area: normalizeLocationText(text(formData.get("area")), 120) || null, latitudeE6, longitudeE6, setting: text(formData.get("setting")) === "indoor" ? "indoor" : "outdoor", capacity, isAccessible: formData.getAll("isAccessible").includes("true"), accessibilityNotes: normalizeLocationText(text(formData.get("accessibilityNotes")), 1500) || null, active: formData.getAll("active").includes("true") });
  revalidatePath("/admin");
  revalidatePath("/dashboard/manage-events/create-event");
  redirect("/admin?view=venues&updated=Venue+directory+change+applied+and+recorded+in+the+audit+log.");
}

export async function adminVenueCsvImportAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=venues");
  if (text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=venues&error=Type+MASTER+to+confirm+the+CSV+import.");
  const file = formData.get("venueCsv");
  if (!(file instanceof File) || !file.size) redirect("/admin?view=venues&error=Choose+a+non-empty+CSV+file+to+import.");
  if (file.size > 1_000_000) redirect("/admin?view=venues&error=CSV+files+must+be+1MB+or+smaller.");
  if (!file.name.toLowerCase().endsWith(".csv")) redirect("/admin?view=venues&error=Upload+a+.csv+file.");
  const parsed = parseVenueCsv(await file.text());
  if (parsed.issues.length || !parsed.rows.length) {
    const errors = parsed.issues.slice(0, 10).map(issue => `Row ${issue.row}: ${issue.message}`).join(" | ");
    redirect(`/admin?view=venues&error=${encodeURIComponent(errors || "No valid venue rows were found.")}`);
  }
  const outcome = await adminImportVenues(admin.id, parsed.rows);
  revalidatePath("/admin");
  revalidatePath("/dashboard/manage-events/create-event");
  redirect(`/admin?view=venues&updated=${encodeURIComponent(`CSV import complete: ${outcome.created} created, ${outcome.updated} updated. All rows were recorded in the audit log.`)}`);
}

export async function adminSeedSampleVenuesAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=venues");
  if (text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=venues&error=Type+MASTER+to+confirm+the+sample+venue+load.");
  const outcome = await adminSeedSampleVenues(admin.id);
  revalidatePath("/admin"); revalidatePath("/dashboard/manage-events/create-event");
  redirect(`/admin?view=venues&updated=${encodeURIComponent(`Sample venue load complete: ${outcome.created} created, ${outcome.updated} already-present records refreshed. Each row is labelled Sample and audit logged.`)}`);
}

export async function adminReleaseVenueReservationAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=venues"); const eventId = Number(text(formData.get("eventId"))); const note = text(formData.get("note"));
  if (!Number.isInteger(eventId) || eventId < 1 || text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=venues&error=Type+MASTER+to+confirm+the+venue+release.");
  if (note.length < 8) redirect("/admin?view=venues&error=Provide+a+clear+exceptional-circumstance+note+for+the+venue+release.");
  await adminReleaseVenueReservation(admin.id, eventId, note);
  revalidatePath("/admin"); revalidatePath("/dashboard/manage-events/create-event"); revalidatePath("/dashboard/manage-events/events");
  redirect("/admin?view=venues&updated=Venue+reservation+released,+organizers+watching+the+venue+notified,+and+the+override+recorded+in+the+audit+log.");
}

export async function adminVenueApprovalRequestAction(formData: FormData) {
  const admin = await requireAdministratorAction("/admin?view=venues"); const requestId = Number(text(formData.get("requestId"))); const decision = text(formData.get("decision")); const note = text(formData.get("reviewNote"));
  if (!Number.isInteger(requestId) || requestId < 1 || text(formData.get("confirmation")) !== "MASTER") redirect("/admin?view=venues&error=Type+MASTER+to+confirm+the+venue+request+review.");
  if (decision !== "approved" && decision !== "changes_requested" && decision !== "rejected") redirect("/admin?view=venues&error=Choose+a+valid+venue+request+decision.");
  try { await adminReviewVenueApprovalRequest(admin.id, requestId, decision, note); } catch (error) { redirect(`/admin?view=venues&error=${encodeURIComponent(error instanceof Error ? error.message : "Venue request review failed")}`); }
  revalidatePath("/admin"); revalidatePath("/dashboard/manage-events/create-event");
  redirect(`/admin?view=venues&updated=${encodeURIComponent(decision === "approved" ? "Venue request approved, added to the directory, and linked to its event." : "Venue request review recorded and the organizer can see the guidance.")}`);
}

function venuePresetReturnPath(eventId: number) { return `/dashboard/manage-events/create-event/${eventId}?step=2`; }

export async function requestVenueApprovalAction(formData: FormData) {
  const user = await requireUser(); const eventId = Number(text(formData.get("eventId"))); const destination = venuePresetReturnPath(eventId);
  if (!(await getOrganizerEvent(eventId, user.id))) redirect("/dashboard/manage-events/events");
  const latitudeE6 = coordinateToE6(text(formData.get("latitude")), "latitude"); const longitudeE6 = coordinateToE6(text(formData.get("longitude")), "longitude");
  const zone = normalizeLocationText(text(formData.get("zone")), 100); const ward = normalizeLocationText(text(formData.get("ward")), 100); const location = normalizeLocationText(text(formData.get("area")), 160); const venueName = normalizeLocationText(text(formData.get("venueName")), 160); const city = normalizeLocationText(text(formData.get("city")), 100); const capacityText = text(formData.get("venueCapacity")); const capacity = capacityText ? Number(capacityText) : null;
  if (!zone || !ward || !location || !venueName || !city || latitudeE6 === null || longitudeE6 === null) redirect(`${destination}&error=Complete+city,+venue,+zone,+ward,+area,+and+valid+GPS+coordinates+before+submitting+a+venue+request.`);
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 1_000_000)) redirect(`${destination}&error=Venue+capacity+must+be+a+whole+number+between+1+and+1000000.`);
  await createOrganizerVenueApprovalRequest(user.id, { eventId, zone, ward, location, venueName, city, address: normalizeLocationText([text(formData.get("addressLine1")), text(formData.get("addressLine2"))].filter(Boolean).join(", "), 1000) || null, sector: normalizeLocationText(text(formData.get("sector")), 100) || null, area: location, latitudeE6, longitudeE6, setting: text(formData.get("venueSetting")) === "indoor" ? "indoor" : "outdoor", capacity, isAccessible: formData.getAll("venueIsAccessible").includes("true"), accessibilityNotes: normalizeLocationText(text(formData.get("venueAccessibilityNotes")), 1500) || null, organizerNote: normalizeLocationText(text(formData.get("venueRequestNote")), 1000) || null });
  revalidatePath(destination); revalidatePath("/admin"); redirect(`${destination}&venueRequest=submitted`);
}

export async function subscribeVenueAvailabilityAction(formData: FormData) {
  const user = await requireUser(); const eventId = Number(text(formData.get("eventId"))); const venueId = Number(text(formData.get("venueId"))); const destination = venuePresetReturnPath(eventId);
  if (!(await getOrganizerEvent(eventId, user.id))) redirect("/dashboard/manage-events/events");
  try { await subscribeOrganizerToVenueAvailability(user.id, venueId, eventId); } catch (error) { redirect(`${destination}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not watch venue availability")}`); }
  revalidatePath(destination); redirect(`${destination}&venueWatch=1`);
}

export async function markVenueAvailabilityNotificationReadAction(formData: FormData) {
  const user = await requireUser("/dashboard/manage-events/events"); const notificationId = Number(text(formData.get("notificationId")));
  if (Number.isInteger(notificationId) && notificationId > 0) await markOrganizerVenueAvailabilityNotificationRead(user.id, notificationId);
  revalidatePath("/dashboard/manage-events/events"); redirect("/dashboard/manage-events/events");
}

export async function saveVenueFilterPresetAction(formData: FormData) {
  const user = await requireUser(); const eventId = Number(text(formData.get("eventId"))); const destination = venuePresetReturnPath(eventId);
  if (!(await getOrganizerEvent(eventId, user.id))) redirect("/dashboard/manage-events/events");
  const capacityText = text(formData.get("minimumCapacity")); const radiusText = text(formData.get("radiusKm")); const accessibilityValue = text(formData.get("accessibility"));
  try {
    await createOrganizerVenueFilterPreset(user.id, { name: text(formData.get("presetName")), query: text(formData.get("query")) || null, zone: text(formData.get("zone")) || null, ward: text(formData.get("ward")) || null, minimumCapacity: capacityText ? Number(capacityText) : null, accessibility: accessibilityValue === "accessible" || accessibilityValue === "standard" ? accessibilityValue : "all", radiusKm: radiusText ? Number(radiusText) : null });
  } catch (error) { redirect(`${destination}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not save the venue filter preset")}`); }
  revalidatePath(destination); redirect(`${destination}&savedPreset=1`);
}

export async function deleteVenueFilterPresetAction(formData: FormData) {
  const user = await requireUser(); const eventId = Number(text(formData.get("eventId"))); const destination = venuePresetReturnPath(eventId);
  if (!(await getOrganizerEvent(eventId, user.id))) redirect("/dashboard/manage-events/events");
  try { await deleteOrganizerVenueFilterPreset(user.id, Number(text(formData.get("presetId")))); } catch (error) { redirect(`${destination}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not remove the venue filter preset")}`); }
  revalidatePath(destination); redirect(`${destination}&savedPreset=deleted`);
}

export async function logoutAction() {
  await clearSession();
  revalidatePath("/");
  redirect("/");
}

export async function createEventAction() {
  await requireUser(NEW_DRAFT_PATH);
  redirect(NEW_DRAFT_PATH);
}

export async function completeOrganizerEventAction(formData: FormData) {
  const user = await requireUser("/dashboard/manage-events/events"); const eventId = Number(text(formData.get("eventId")));
  try { await completeOrganizerEvent(eventId, user.id); } catch (error) { redirect(`/dashboard/manage-events/events?status=live&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not complete the event")}`); }
  revalidatePath("/dashboard/manage-events/events"); revalidatePath("/dashboard/manage-events/create-event"); redirect("/dashboard/manage-events/events?status=completed&completed=1");
}

export async function createEventFromBasicsAction(formData: FormData) {
  const user = await requireUser(NEW_DRAFT_PATH);
  const title = text(formData.get("title"));
  const displayName = text(formData.get("displayName"));
  const startsAt = eventDateTime(formData.get("startsDate"), formData.get("startsTime"));
  const endsAt = eventDateTime(formData.get("endsDate"), formData.get("endsTime"));
  if (title.length < 2 || displayName.length < 2 || !Number.isFinite(startsAt.valueOf()) || !Number.isFinite(endsAt.valueOf()) || endsAt <= startsAt) redirect(`${NEW_DRAFT_PATH}?error=Complete+all+required+timing+details.`);
  const eventId = await createDraftEvent({ id: user.id, publicId: user.publicId });
  await updateEvent(eventId, user.id, {
    title,
    displayName,
    slug: createEventSlug(displayName),
    visibility: text(formData.get("visibility")) as "public" | "private" | "external",
    categoryId: Number(text(formData.get("categoryId"))) || null,
    startsAt,
    endsAt,
    timezone: text(formData.get("timezone")) || "Asia/Calcutta",
    currentStep: 2,
  });
  revalidatePath("/dashboard/manage-events/events");
  redirect(`/dashboard/manage-events/create-event/${eventId}?step=2&saved=1`);
}

export async function saveWizardAction(formData: FormData) {
  const user = await requireUser();
  const eventId = Number(text(formData.get("eventId")));
  const step = Number(text(formData.get("step")));
  const event = await getOrganizerEvent(eventId, user.id);
  if (!event) redirect("/dashboard/manage-events/events");
  if (!canEditEventForModeration(event.moderationStatus)) redirect(`/dashboard/manage-events/create-event/${eventId}?step=${event.currentStep}&error=This+event+is+under+administrator+review.+Wait+for+feedback+before+editing.`);
  if (!canSubmitWizardStep(event.currentStep, step)) redirect(`/dashboard/manage-events/create-event/${eventId}?step=${event.currentStep}&error=Complete+the+current+event+step+before+moving+forward.`);
  if (step === 1) {
    const title = text(formData.get("title"));
    const displayName = text(formData.get("displayName"));
    const startsAt = eventDateTime(formData.get("startsDate"), formData.get("startsTime"));
    const endsAt = eventDateTime(formData.get("endsDate"), formData.get("endsTime"));
    if (title.length < 2 || displayName.length < 2 || !Number.isFinite(startsAt.valueOf()) || !Number.isFinite(endsAt.valueOf()) || endsAt <= startsAt) redirect(`/dashboard/manage-events/create-event/${eventId}?step=1&error=Complete+all+required+timing+details.`);
    await updateEvent(eventId, user.id, { title, displayName, slug: createEventSlug(displayName), visibility: text(formData.get("visibility")) as "public" | "private" | "external", categoryId: Number(text(formData.get("categoryId"))) || null, startsAt, endsAt, timezone: text(formData.get("timezone")) || "Asia/Calcutta", currentStep: 2 });
  }
  if (step === 2) {
    const locationMode = text(formData.get("locationMode")) === "undecided" ? "undecided" : "address"; const bibExpo = text(formData.get("bibExpoDate")); const bibExpoDate = bibExpo ? new Date(`${bibExpo}T00:00:00`) : null;
    if (locationMode === "undecided") await updateEvent(eventId, user.id, { locationMode, locationSource: "manual", approvedVenueId: null, bibExpoDate: Number.isFinite(bibExpoDate?.valueOf()) ? bibExpoDate : null, currentStep: 3 });
    else if (text(formData.get("locationSource")) === "directory") {
      const venue = await getApprovedVenue(Number(text(formData.get("approvedVenueId")))); if (!venue) redirect(`/dashboard/manage-events/create-event/${eventId}?step=2&error=Choose+an+active+approved+venue+or+use+manual+location.`);
      const conflict = await findActiveVenueConflict(eventId, venue.id); if (conflict) redirect(`/dashboard/manage-events/create-event/${eventId}?step=2&venueSource=directory&calendarVenueId=${venue.id}&error=${encodeURIComponent(venueConflictMessage(conflict))}`);
      const address = venue.address || [venue.location, venue.sector, venue.area, venue.city].filter(Boolean).join(", ");
      await updateEvent(eventId, user.id, { locationMode, locationSource: "directory", approvedVenueId: venue.id, city: venue.city, venueName: venue.venueName, addressLine1: venue.location, addressLine2: venue.address || null, address, zone: venue.zone, ward: venue.ward, sector: venue.sector, area: venue.area, latitudeE6: venue.latitudeE6, longitudeE6: venue.longitudeE6, venueSetting: venue.setting, venueCapacity: venue.capacity, venueIsAccessible: venue.isAccessible, venueAccessibilityNotes: venue.accessibilityNotes, bibExpoDate: Number.isFinite(bibExpoDate?.valueOf()) ? bibExpoDate : null, currentStep: 3 });
    } else {
      const city = text(formData.get("city")); const venueName = text(formData.get("venueName")); const addressLine1 = text(formData.get("addressLine1")); const addressLine2 = text(formData.get("addressLine2"));
      if (city.length < 2 || addressLine1.length < 3) redirect(`/dashboard/manage-events/create-event/${eventId}?step=2&error=Add+your+city+and+address+details,+or+choose+Venue+not+decided.`);
      await updateEvent(eventId, user.id, { locationMode, locationSource: "manual", approvedVenueId: null, city, venueName: venueName || null, addressLine1, addressLine2: addressLine2 || null, address: [addressLine1, addressLine2].filter(Boolean).join(", "), bibExpoDate: Number.isFinite(bibExpoDate?.valueOf()) ? bibExpoDate : null, currentStep: 3 });
    }
  }
  if (step === 3) {
    const description = text(formData.get("description"));
    if (description.length < 20) redirect(`/dashboard/manage-events/create-event/${eventId}?step=3&error=Add+at+least+20+characters+of+event+description.`);
    await updateEvent(eventId, user.id, { description, currentStep: 4 });
  }
  if (step === 4) {
    let coverUrl = event.coverUrl;
    const coverFile = formData.get("coverFile");
    if (coverFile instanceof File && coverFile.size > 0) {
      const validationError = validateEventBanner(coverFile.type, coverFile.size);
      if (validationError) redirect(`/dashboard/manage-events/create-event/${eventId}?step=4&error=${encodeURIComponent(validationError)}`);
      const bytes = new Uint8Array(await coverFile.arrayBuffer());
      if (!hasEventBannerSignature(bytes, coverFile.type)) redirect(`/dashboard/manage-events/create-event/${eventId}?step=4&error=The+selected+file+is+not+a+valid+image.`);
      const extension = coverFile.type === "image/png" ? "png" : coverFile.type === "image/webp" ? "webp" : "jpg";
      coverUrl = (await storagePut(`events/covers/${user.id}/${eventId}/${Date.now()}.${extension}`, bytes, coverFile.type)).url;
    }
    if (!coverUrl) redirect(`/dashboard/manage-events/create-event/${eventId}?step=4&error=Choose+a+valid+event+banner+before+continuing.`);
    await updateEvent(eventId, user.id, { coverUrl, currentStep: 5 });
  }
  if (step === 5) {
    let parsed: Array<Record<string, unknown>> = [];
    try { const candidate = JSON.parse(text(formData.get("ticketsJson"))); if (Array.isArray(candidate)) parsed = candidate; } catch { parsed = []; }
    const nativeTicket = nativeTicketDraftFromForm(formData);
    if (nativeTicket) parsed = [...parsed, nativeTicket];
    const feePayer = (value: unknown) => value === "buyer" ? "buyer" as const : "organizer" as const;
    const ticketItems = parsed.map(item => { const ticketCategory: "paid" | "free" | "donation" = item.ticketCategory === "paid" || item.ticketCategory === "donation" ? item.ticketCategory : "free"; const gst = normalizeTicketGst(ticketCategory, item.gstApplicable, item.gstRatePercent); const salesStartAt = new Date(`${String(item.salesStartDate || "")}T${String(item.salesStartTime || "")}`); const salesEndAt = new Date(`${String(item.salesEndDate || "")}T${String(item.salesEndTime || "")}`); return { id: Number(item.id) || undefined, name: String(item.name || "").trim(), description: item.description ? String(item.description) : undefined, pricePaise: ticketCategory === "free" ? 0 : Math.max(0, Math.round(Number(item.price) * 100)), quantityLimit: Math.max(1, Number(item.quantityLimit) || 1), ticketCategory, ...gst, minPerBooking: Math.max(1, Number(item.minPerBooking) || 1), maxPerBooking: Math.max(1, Number(item.maxPerBooking) || 10), platformFeePayer: feePayer(item.platformFeePayer), fitizenFeePayer: feePayer(item.fitizenFeePayer), gatewayFeePayer: feePayer(item.gatewayFeePayer), attendeeMessage: item.attendeeMessage ? String(item.attendeeMessage) : undefined, salesStartAt, salesEndAt }; });
    if (!ticketItems.length || ticketItems.some(item => item.name.length < 2 || !Number.isFinite(item.pricePaise) || (item.ticketCategory === "paid" && item.pricePaise <= 0) || !isValidTicketSaleWindow(item.salesStartAt, item.salesEndAt, event.startsAt))) redirect(`/dashboard/manage-events/create-event/${eventId}?step=5&error=Add+a+valid+paid+price+and+ticket+sale+window+that+ends+before+the+event+starts.`);
    const hasPaidTickets = ticketItems.some(item => item.ticketCategory !== "free" && item.pricePaise > 0);
    const manualPaymentEnabled = text(formData.get("manualPaymentEnabled")) === "yes";
    const manualPaymentMethod = text(formData.get("manualPaymentMethod"));
    const upiId = text(formData.get("upiId")); const bankAccountName = text(formData.get("bankAccountName")); const bankAccountNumber = text(formData.get("bankAccountNumber")); const bankIfsc = text(formData.get("bankIfsc")).toUpperCase(); const bankName = text(formData.get("bankName")); const manualPaymentNote = text(formData.get("manualPaymentNote"));
    const validMethod = manualPaymentMethod === "upi" || manualPaymentMethod === "bank" || manualPaymentMethod === "both";
    const upiReady = upiId.length >= 3; const bankReady = bankAccountName.length >= 2 && bankAccountNumber.length >= 6 && bankIfsc.length >= 4;
    if (hasPaidTickets && (!manualPaymentEnabled || !validMethod || (manualPaymentMethod === "upi" && !upiReady) || (manualPaymentMethod === "bank" && !bankReady) || (manualPaymentMethod === "both" && (!upiReady || !bankReady)))) redirect(`/dashboard/manage-events/create-event/${eventId}?step=5&error=Add+the+manual+UPI+or+bank+payment+details+needed+for+your+paid+tickets.`);
    await replaceTickets(eventId, user.id, ticketItems);
    await updateEvent(eventId, user.id, { manualPaymentEnabled, manualPaymentMethod: validMethod ? manualPaymentMethod : null, upiId: upiId || null, bankAccountName: bankAccountName || null, bankAccountNumber: bankAccountNumber || null, bankIfsc: bankIfsc || null, bankName: bankName || null, manualPaymentNote: manualPaymentNote || null, fillingFastThresholdPercent: normalizeFillingFastThreshold(text(formData.get("fillingFastThresholdPercent"))), currentStep: 6 });
  }
  if (step === 6) {
    let questions: Array<{ question: string; fieldType: "short_text" | "long_text" | "select" | "checkbox"; required: boolean }> = [];
    try { const parsed = JSON.parse(text(formData.get("questionsJson"))); if (Array.isArray(parsed)) questions = parsed.filter(item => item && typeof item.question === "string" && item.question.trim()).map(item => ({ question: item.question.trim(), fieldType: ["short_text", "long_text", "select", "checkbox"].includes(item.fieldType) ? item.fieldType : "short_text", required: Boolean(item.required) })); } catch { questions = []; }
    const nativeQuestionCount = Math.max(0, Math.min(50, Number(text(formData.get("customQuestionCount"))) || 0));
    if (nativeQuestionCount) questions = Array.from({ length: nativeQuestionCount }, (_, index) => {
      const fieldType = text(formData.get(`customQuestion_${index}_fieldType`));
      return { question: text(formData.get(`customQuestion_${index}_question`)).trim(), fieldType: ["short_text", "long_text", "select", "checkbox"].includes(fieldType) ? fieldType as "short_text" | "long_text" | "select" | "checkbox" : "short_text", required: text(formData.get(`customQuestion_${index}_required`)) === "yes" };
    }).filter(item => item.question);
    await replaceQuestions(eventId, user.id, questions);
    await updateEvent(eventId, user.id, { currentStep: 6 });
  }
  revalidatePath(`/dashboard/manage-events/create-event/${eventId}`);
  redirect(`/dashboard/manage-events/create-event/${eventId}?step=${nextWizardStep(step)}&saved=1`);
}

export async function publishEventAction(formData: FormData) {
  const user = await requireUser();
  const eventId = Number(text(formData.get("eventId")));
  const event = await getOrganizerEvent(eventId, user.id);
  if (!event || !canPublishEvent(event)) redirect(`/dashboard/manage-events/create-event/${eventId}?error=Complete+all+six+steps+before+submitting+for+approval.`);
  try { await submitEventForApproval(eventId, user.id); } catch (error) { redirect(`/dashboard/manage-events/create-event/${eventId}?error=${encodeURIComponent(error instanceof Error ? error.message : "We could not submit this event for review.")}`); }
  revalidatePath("/events");
  revalidatePath("/admin");
  redirect("/dashboard/manage-events/events?status=submitted&submitted=1");
}

export async function registerAction(formData: FormData) {
  const user = await requireUser();
  const eventId = Number(text(formData.get("eventId")));
  const ticketId = Number(text(formData.get("ticketId"))) || null;
  let registration: Awaited<ReturnType<typeof registerForEvent>>;
  try {
    registration = await registerForEvent(eventId, ticketId, { id: user.id, publicId: user.publicId });
  } catch (error) {
    console.error("[Registration] Failed to create registration", error);
    redirect("/events?error=We+could+complete+that+registration.");
  }
  if (registration.alreadyRegistered) redirect(`/events/${registration.eventSlug}?qr=registered&booking=${registration.orderNumber}`);
  const notification = await getRegistrationNotificationDataByOrder(registration.orderNumber);
  if (notification && !registration.paymentPending) {
    await sendRegistrationConfirmation({ attendeeEmail: notification.attendee.email, attendeeName: notification.attendee.name, eventName: notification.event.displayName, ticketName: notification.ticket?.name, startsAt: notification.event.startsAt, orderNumber: notification.registration.orderNumber, eventUrl: `${await requestOrigin()}/events/${notification.event.slug}` });
    await markRegistrationConfirmationSent(notification.registration.id);
  }
  redirect(registration.paymentPending ? `/events/${registration.eventSlug}?booking=${registration.orderNumber}&payment=created` : `/dashboard/my-bookings?success=${registration.orderNumber}`);
}

export async function submitPaymentProofAction(formData: FormData) {
  const user = await requireUser();
  const orderNumber = text(formData.get("orderNumber")); const proofUrl = text(formData.get("paymentProofUrl")); const slug = text(formData.get("slug"));
  try { await submitManualPaymentProof(orderNumber, user.id, proofUrl, text(formData.get("manualPaymentReference"))); } catch (error) { console.error("[ManualPayment] Proof submission failed", error); redirect(`/events/${slug}?booking=${orderNumber}&payment=error`); }
  revalidatePath("/dashboard/my-bookings");
  redirect(`/events/${slug}?booking=${orderNumber}&payment=submitted`);
}

export async function confirmManualPaymentAction(formData: FormData) {
  const user = await requireUser();
  const eventId = Number(text(formData.get("eventId"))); const registrationId = Number(text(formData.get("registrationId")));
  if (!Number.isInteger(eventId) || !Number.isInteger(registrationId)) return;
  const notification = await confirmManualPayment(eventId, registrationId, user.id);
  if (notification) {
    await sendRegistrationConfirmation({ attendeeEmail: notification.attendee.email, attendeeName: notification.attendee.name, eventName: notification.event.displayName, ticketName: notification.ticket?.name, startsAt: notification.event.startsAt, orderNumber: notification.registration.orderNumber, eventUrl: `${await requestOrigin()}/events/${notification.event.slug}` });
    await markRegistrationConfirmationSent(notification.registration.id);
  }
  revalidatePath(`/dashboard/attendees?eventId=${eventId}`);
  revalidatePath("/dashboard/my-bookings");
}

export async function rejectManualPaymentAction(formData: FormData) {
  const user = await requireUser();
  const eventId = Number(text(formData.get("eventId"))); const registrationId = Number(text(formData.get("registrationId")));
  if (!Number.isInteger(eventId) || !Number.isInteger(registrationId)) return;
  try { await rejectManualPayment(eventId, registrationId, user.id, text(formData.get("rejectionNote"))); } catch (error) { console.error("[ManualPayment] Rejection failed", error); }
  revalidatePath(`/dashboard/attendees?eventId=${eventId}`); revalidatePath("/dashboard/my-bookings");
}

export async function toggleFavoriteAction(formData: FormData) {
  const slug = text(formData.get("slug"));
  const eventId = Number(text(formData.get("eventId")));
  const user = await requireUser(slug ? `/events/${slug}` : "/events");
  if (!Number.isInteger(eventId) || !slug) redirect("/events");
  const saved = await toggleEventFavorite(eventId, user.id);
  revalidatePath(`/events/${slug}`);
  revalidatePath("/dashboard/following");
  redirect(`/events/${slug}?favorite=${saved ? "saved" : "removed"}`);
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser("/dashboard/profile");
  try {
    await updateUserProfile(user.id, { name: text(formData.get("name")), avatarUrl: text(formData.get("avatarUrl")) });
  } catch (error) {
    console.error("[Profile] Update failed", error);
    redirect("/dashboard/profile?error=Enter+a+name+with+at+least+two+characters.");
  }
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/my-bookings");
  redirect("/dashboard/profile?updated=1");
}

export async function updateExtendedProfileAction(formData: FormData) {
  const user = await requireUser("/dashboard/profile");
  try {
    const name = text(formData.get("name"));
    if (name.length < 2) redirect("/dashboard/profile?error=Enter+a+name+with+at+least+two+characters.");
    const gender = text(formData.get("gender")) || null;
    const dateOfBirth = text(formData.get("dateOfBirth")) || null;
    const state = text(formData.get("state")) || null;
    const city = text(formData.get("city")) || null;
    const interestsRaw = text(formData.get("interests"));
    const eventFormatRaw = text(formData.get("eventFormat"));
    const eventFrequency = text(formData.get("eventFrequency")) || null;
    const avatarUrl = text(formData.get("avatarUrl")) || null;
    const interests = interestsRaw ? interestsRaw.split(",").filter(Boolean) : null;
    const eventFormat = eventFormatRaw ? eventFormatRaw.split(",").filter(Boolean) : null;
    const notificationPrefs = {
      email: text(formData.get("notifEmail")) !== "false",
      push: text(formData.get("notifPush")) !== "false",
      sms: text(formData.get("notifSms")) !== "false",
    };
    await completeUserProfile(user.id, { name, gender, dateOfBirth, state, city, interests, eventFormat, eventFrequency, notificationPrefs, avatarUrl });
  } catch (error) {
    console.error("[Profile] Extended update failed", error);
    redirect("/dashboard/profile?error=Could+not+save+profile.+Please+try+again.");
  }
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/my-bookings");
  redirect("/dashboard/profile?updated=1");
}

export async function createPromotionAction(formData: FormData) {
  const user = await requireUser();
  const eventId = Number(text(formData.get("eventId")));
  await createPromotion(user.id, { eventId, title: text(formData.get("title")), channel: text(formData.get("channel")) as "social" | "email" | "partner" | "featured", budgetPaise: Math.max(0, Math.round(Number(text(formData.get("budget"))) * 100)) });
  revalidatePath("/dashboard/promotions");
}

export async function updateRegistrationAction(formData: FormData) {
  const user = await requireUser();
  const eventId = Number(text(formData.get("eventId")));
  const registrationId = Number(text(formData.get("registrationId")));
  const status = text(formData.get("status")) as "confirmed" | "cancelled" | "checked_in";
  if (!isRegistrationStatus(status)) return;
  await updateRegistrationStatus(eventId, registrationId, user.id, status);
  revalidatePath(`/dashboard/attendees?eventId=${eventId}`);
}

// ─── OTP Signup Actions ──────────────────────────────────────────────

export async function requestSignupOtp(formData: FormData) {
  const phone = text(formData.get("phone")).replace(/\s+/g, "");
  if (!/^\+?\d{10,13}$/.test(phone)) return { error: "Enter a valid phone number with country code." };
  const existing = await findUserByPhone(phone);
  if (existing) return { error: "An account with this phone number already exists." };
  const { createOtp } = await import("./lib/otp");
  const { sendSms, buildOtpMessage } = await import("./lib/sms");
  const code = await createOtp(phone, "signup");
  const result = await sendSms(phone, buildOtpMessage(code, "signup"));
  if (!result.success) return { error: "Failed to send OTP. Please try again." };
  return { ok: true, phone };
}

export async function verifySignupOtp(formData: FormData) {
  const phone = text(formData.get("phone")).replace(/\s+/g, "");
  const code = text(formData.get("code"));
  if (!phone || !code) return { error: "Phone and code are required." };
  const { verifyOtp } = await import("./lib/otp");
  const valid = await verifyOtp(phone, code, "signup");
  if (!valid) return { error: "The OTP is invalid or has expired." };
  const user = await createPhoneUser(phone);
  if (!user) return { error: "Could not create your account." };
  await setSession(user.id);
  return { ok: true, redirect: "/dashboard/profile" };
}

// ─── OTP Login Actions ───────────────────────────────────────────────

export async function requestLoginOtp(formData: FormData) {
  const phone = text(formData.get("phone")).replace(/\s+/g, "");
  if (!/^\+?\d{10,13}$/.test(phone)) return { error: "Enter a valid phone number with country code." };
  const existing = await findUserByPhone(phone);
  if (!existing) return { error: "No account found with this phone number." };
  const { createOtp } = await import("./lib/otp");
  const { sendSms, buildOtpMessage } = await import("./lib/sms");
  const code = await createOtp(phone, "login");
  const result = await sendSms(phone, buildOtpMessage(code, "login"));
  if (!result.success) return { error: "Failed to send OTP. Please try again." };
  return { ok: true, phone };
}

export async function verifyLoginOtp(formData: FormData) {
  const phone = text(formData.get("phone")).replace(/\s+/g, "");
  const code = text(formData.get("code"));
  const returnTo = text(formData.get("returnTo"));
  if (!phone || !code) return { error: "Phone and code are required." };
  const { verifyOtp } = await import("./lib/otp");
  const valid = await verifyOtp(phone, code, "login");
  if (!valid) return { error: "The OTP is invalid or has expired." };
  const user = await findUserByPhone(phone);
  if (!user) return { error: "Account not found." };
  const signedInUser = await recordUserSignIn(user.id);
  if (!signedInUser) return { error: "Could not start your session." };
  await setSession(signedInUser.id);
  return { ok: true, redirect: returnTo || "/dashboard/manage-events/events" };
}

// ─── Forgot / Reset / Change Password Actions ────────────────────────

export async function forgotPasswordAction(formData: FormData) {
  const email = text(formData.get("email")).toLowerCase();
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  const user = await findUserByEmail(email);
  if (!user) return { ok: true, message: "If an account with that email exists, a reset link has been sent." };
  const { createPasswordResetToken, sendPasswordResetEmail } = await import("./lib/password-reset");
  const token = await createPasswordResetToken(user.id);
  await sendPasswordResetEmail(email, token);
  return { ok: true, message: "If an account with that email exists, a reset link has been sent." };
}

export async function resetPasswordAction(formData: FormData) {
  const token = text(formData.get("token"));
  const email = text(formData.get("email")).toLowerCase();
  const password = text(formData.get("password"));
  const confirmPassword = text(formData.get("confirmPassword"));
  if (!token || !email) return { error: "Invalid reset link." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };
  const user = await findUserByEmail(email);
  if (!user) return { error: "Invalid reset link." };
  const { verifyPasswordResetToken } = await import("./lib/password-reset");
  const valid = await verifyPasswordResetToken(user.id, token);
  if (!valid) return { error: "The reset link is invalid or has expired." };
  await updateUserPasswordHash(user.id, hashPassword(password));
  return { ok: true, message: "Your password has been updated.", redirect: "/login" };
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser("/dashboard/change-password");
  const currentPassword = text(formData.get("currentPassword"));
  const newPassword = text(formData.get("newPassword"));
  const confirmPassword = text(formData.get("confirmPassword"));
  if (!user.passwordHash || !verifyPassword(currentPassword, user.passwordHash)) redirect("/dashboard/change-password?error=The+current+password+is+incorrect.");
  if (newPassword.length < 8) redirect("/dashboard/change-password?error=The+new+password+must+be+at+least+8+characters.");
  if (newPassword !== confirmPassword) redirect("/dashboard/change-password?error=The+passwords+do+not+match.");
  await updateUserPasswordHash(user.id, hashPassword(newPassword));
  redirect("/dashboard/change-password?updated=1");
}
