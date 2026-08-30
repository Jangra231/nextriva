import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { adminAuditLogs, categories, csrBudgets, csrProfiles, csrSponsorshipRequests, events, users } from "../../drizzle/schema";
import { adminAssignCsrSponsorshipRequest, adminCreateCsrAccount, adminReviewCsrSponsorshipRequest, createPublicEventId, createPublicUserId, csrCreateBudget, csrSaveSponsorshipRequest, csrSubmitSponsorshipRequest, db, getCsrWorkspaceData } from "./db";

describe("CSR sponsorship brief workflow", () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let adminId = 0; let sponsorId = 0; let otherSponsorId = 0; let organizerId = 0; let eventId = 0; let categoryId = 0; let budgetId = 0; let otherBudgetId = 0; const requestIds: number[] = [];

  const brief = (overrides: Partial<Parameters<typeof csrSaveSponsorshipRequest>[1]> = {}) => ({
    budgetId, requestKind: "future_event" as const, eventType: "Accessible community fitness walk", titlePreference: "Inclusive active living day", intendedAudience: "Senior citizens and women participants", cityPreference: "Noida", zonePreference: "CSR Test Zone", wardPreference: "CSR Test Ward", preferredStartDate: new Date("2031-05-10T00:00:00Z"), preferredEndDate: new Date("2031-05-11T00:00:00Z"), estimatedCapacity: 180, accessibilityNeeds: "Step-free route, seating and sign-language interpretation", successIndicators: "150 registrations, 100 check-ins, and an accessible participant experience", details: "Fund accessible community fitness programming with trained volunteers, water points, participant materials, and post-event attendance reporting.", amountPaise: 40_000, submissionNote: "Initial CSR sponsorship brief", ...overrides,
  });

  beforeAll(async () => {
    const admin = await db().insert(users).values({ publicId: createPublicUserId(), openId: `csr-admin-${suffix}`, name: "CSR Test Administrator", email: `csr-admin-${suffix}@example.test`, role: "admin", loginMethod: "test", lastSignedIn: new Date() }); adminId = Number(admin[0].insertId);
    const sponsor = await adminCreateCsrAccount(adminId, { name: "CSR Test Contact", email: `csr-sponsor-${suffix}@example.test`, passwordHash: "test-hash", profile: { companyName: `CSR Test Company ${suffix}`, contactName: "CSR Test Contact", contactEmail: `csr-profile-${suffix}@example.test`, focusAreas: "Community activity" } }); sponsorId = sponsor.account.id;
    const otherSponsor = await adminCreateCsrAccount(adminId, { name: "Other CSR Contact", email: `other-csr-sponsor-${suffix}@example.test`, passwordHash: "test-hash", profile: { companyName: `Other CSR Test Company ${suffix}`, contactName: "Other CSR Contact", contactEmail: `other-csr-profile-${suffix}@example.test` } }); otherSponsorId = otherSponsor.account.id;
    const organizer = await db().insert(users).values({ publicId: createPublicUserId(), openId: `csr-organizer-${suffix}`, name: "CSR Event Organizer", email: `csr-organizer-${suffix}@example.test`, role: "user", loginMethod: "test", lastSignedIn: new Date() }); organizerId = Number(organizer[0].insertId);
    const category = await db().insert(categories).values({ name: `CSR Activity ${suffix}`, slug: `csr-activity-${suffix}` }); categoryId = Number(category[0].insertId);
    const organizerRow = (await db().select().from(users).where(eq(users.id, organizerId)).limit(1))[0]; const event = await db().insert(events).values({ organizerId, organizerPublicId: organizerRow.publicId, publicId: createPublicEventId(), categoryId, city: "Noida", zone: "CSR Test Zone", ward: "CSR Test Ward", title: "CSR matching test event", displayName: "CSR matching test event", slug: `csr-matching-event-${suffix}`, status: "live", visibility: "public", moderationStatus: "approved" }); eventId = Number(event[0].insertId);
  }, 30_000);

  afterAll(async () => {
    for (const requestId of requestIds) await db().delete(csrSponsorshipRequests).where(eq(csrSponsorshipRequests.id, requestId));
    if (budgetId) await db().delete(csrBudgets).where(eq(csrBudgets.id, budgetId));
    if (otherBudgetId) await db().delete(csrBudgets).where(eq(csrBudgets.id, otherBudgetId));
    if (eventId) await db().delete(events).where(eq(events.id, eventId));
    if (categoryId) await db().delete(categories).where(eq(categories.id, categoryId));
    if (adminId) await db().delete(adminAuditLogs).where(eq(adminAuditLogs.adminId, adminId));
    if (sponsorId) await db().delete(csrProfiles).where(eq(csrProfiles.userId, sponsorId));
    if (otherSponsorId) await db().delete(csrProfiles).where(eq(csrProfiles.userId, otherSponsorId));
    if (sponsorId) await db().delete(users).where(eq(users.id, sponsorId));
    if (otherSponsorId) await db().delete(users).where(eq(users.id, otherSponsorId));
    if (organizerId) await db().delete(users).where(eq(users.id, organizerId));
    if (adminId) await db().delete(users).where(eq(users.id, adminId));
  }, 30_000);

  it("supports revisions, administrator-only approval, one live-event match, preserved ownership, and sponsor scope isolation", async () => {
    const budget = await csrCreateBudget(sponsorId, { label: "CSR test budget", totalPaise: 100_000 }); budgetId = budget.id;
    const otherBudget = await csrCreateBudget(otherSponsorId, { label: "Other CSR test budget", totalPaise: 100_000 }); otherBudgetId = otherBudget.id;

    const initial = await csrSaveSponsorshipRequest(sponsorId, brief()); requestIds.push(initial.id); expect(initial.status).toBe("draft");
    const submitted = await csrSubmitSponsorshipRequest(sponsorId, initial.id, "Please review this brief"); expect(submitted.status).toBe("submitted");
    const changes = await adminReviewCsrSponsorshipRequest(adminId, initial.id, "changes_requested", "Please specify the accessibility and check-in plan."); expect(changes.status).toBe("changes_requested");
    const beforeAssignmentBudget = (await db().select().from(csrBudgets).where(eq(csrBudgets.id, budgetId)).limit(1))[0]; expect(beforeAssignmentBudget?.committedPaise).toBe(0);

    const revised = await csrSaveSponsorshipRequest(sponsorId, brief({ amountPaise: 50_000, details: "Fund accessible community fitness programming with a step-free route, a documented check-in plan, trained volunteers, water points, participant materials, and post-event attendance reporting.", submissionNote: "Added the requested access and check-in specifications." }), initial.id); expect(revised.status).toBe("changes_requested"); expect(revised.amountPaise).toBe(50_000);
    const resubmitted = await csrSubmitSponsorshipRequest(sponsorId, initial.id, "The accessibility and check-in plan are now included."); expect(resubmitted.status).toBe("submitted");
    const approved = await adminReviewCsrSponsorshipRequest(adminId, initial.id, "approved", "Suitable for matching to a live organizer-owned event."); expect(approved.status).toBe("approved_pending_assignment");
    const stillUncommitted = (await db().select().from(csrBudgets).where(eq(csrBudgets.id, budgetId)).limit(1))[0]; expect(stillUncommitted?.committedPaise).toBe(0);

    await expect(csrSubmitSponsorshipRequest(otherSponsorId, initial.id, "Attempt to access another company request")).rejects.toThrow("Only drafts");
    const assigned = await adminAssignCsrSponsorshipRequest(adminId, initial.id, eventId, "This live Noida event matches the requested territory, audience, access needs, and activity type."); expect(assigned.status).toBe("assigned"); expect(assigned.assignedEventId).toBe(eventId);
    await expect(adminAssignCsrSponsorshipRequest(adminId, initial.id, eventId, "Repeat assignment should be refused.")).rejects.toThrow("awaiting assignment");

    const committedBudget = (await db().select().from(csrBudgets).where(eq(csrBudgets.id, budgetId)).limit(1))[0]; expect(committedBudget?.committedPaise).toBe(50_000);
    const preservedEvent = (await db().select().from(events).where(eq(events.id, eventId)).limit(1))[0]; expect(preservedEvent?.organizerId).toBe(organizerId);
    const sponsorWorkspace = await getCsrWorkspaceData(sponsorId); expect(sponsorWorkspace.metrics.fundedEvents).toBe(1); expect(sponsorWorkspace.metrics.committed).toBe(50_000); expect(sponsorWorkspace.requests.every(row => row.request.csrProfileId === initial.csrProfileId)).toBe(true);
    const otherWorkspace = await getCsrWorkspaceData(otherSponsorId); expect(otherWorkspace.requests).toHaveLength(0); expect(otherWorkspace.metrics.fundedEvents).toBe(0);
    const audit = (await db().select().from(adminAuditLogs).where(and(eq(adminAuditLogs.adminId, adminId), eq(adminAuditLogs.action, "csr.request_event_assigned")))).find(row => row.entityId === initial.id); expect(audit?.entityId).toBe(initial.id);
  }, 30_000);

  it("requires an administrator reason for rejection and retains a rejected brief only for its owning sponsor", async () => {
    const rejectedDraft = await csrSaveSponsorshipRequest(sponsorId, brief({ requestKind: "existing_event", eventType: "Youth sports outreach", details: "Fund a carefully scoped youth sports outreach programme with safety volunteers, participant support, activity equipment, and accessibility planning." })); requestIds.push(rejectedDraft.id);
    await csrSubmitSponsorshipRequest(sponsorId, rejectedDraft.id, "Review a distinct existing-event interest.");
    await expect(adminReviewCsrSponsorshipRequest(adminId, rejectedDraft.id, "rejected", "")).rejects.toThrow("clear reason");
    const rejected = await adminReviewCsrSponsorshipRequest(adminId, rejectedDraft.id, "rejected", "The proposed dates do not align with currently eligible programming."); expect(rejected.status).toBe("rejected");
    const sponsorWorkspace = await getCsrWorkspaceData(sponsorId); expect(sponsorWorkspace.requests.some(row => row.request.id === rejectedDraft.id && row.request.adminReviewNote?.includes("dates"))).toBe(true);
    const otherWorkspace = await getCsrWorkspaceData(otherSponsorId); expect(otherWorkspace.requests.some(row => row.request.id === rejectedDraft.id)).toBe(false);
  }, 30_000);
});
