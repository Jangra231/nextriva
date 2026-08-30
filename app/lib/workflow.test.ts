import { describe, expect, it } from "vitest";
import { canAccessOrganizerResource, canConfirmManualPayment, canCreateRegistration, canPublishEvent, canSubmitWizardStep, createEventSlug, hasAuthenticatedAccount, isRegistrationStatus, isValidTicketSaleWindow, nextWizardStep, normalizeTicketGst, paymentStatusForRegistration, shouldSendRegistrationConfirmation } from "./workflow";

describe("event platform workflow rules", () => {
  const completeEvent = {
    startsAt: new Date("2026-09-15T06:30:00Z"), endsAt: new Date("2026-09-15T09:30:00Z"), city: "Bengaluru", venueName: "Cubbon Park", description: "Community 5K running event with a guided warm-up.", coverUrl: "https://example.com/cover.jpg", currentStep: 6,
  };

  it("allows publication only after all six required creation steps are complete", () => {
    expect(canPublishEvent(completeEvent)).toBe(true);
    expect(canPublishEvent({ ...completeEvent, coverUrl: null })).toBe(false);
    expect(canPublishEvent({ ...completeEvent, currentStep: 5 })).toBe(false);
  });

  it("keeps wizard progression within the prescribed six-step range", () => {
    expect(nextWizardStep(1)).toBe(2);
    expect(nextWizardStep(5)).toBe(6);
    expect(nextWizardStep(6)).toBe(6);
  });

  it("creates a stable URL-safe event slug only when Basics is submitted", () => {
    expect(createEventSlug("Noida 10 km Running!", "verified")).toBe("noida-10-km-running-verified");
    expect(createEventSlug("   ", "verified")).toBe("event-verified");
  });

  it("accepts only supported attendee registration statuses", () => {
    expect(isRegistrationStatus("confirmed")).toBe(true);
    expect(isRegistrationStatus("checked_in")).toBe(true);
    expect(isRegistrationStatus("pending")).toBe(false);
  });

  it("permits organizer-only resources only to their owner", () => {
    expect(canAccessOrganizerResource(42, 42)).toBe(true);
    expect(canAccessOrganizerResource(42, 7)).toBe(false);
    expect(canAccessOrganizerResource(42, null)).toBe(false);
  });

  it("identifies authenticated accounts before protected workflows run", () => {
    expect(hasAuthenticatedAccount(12)).toBe(true);
    expect(hasAuthenticatedAccount(0)).toBe(false);
    expect(hasAuthenticatedAccount(null)).toBe(false);
  });

  it("blocks future wizard-step submissions until the step is unlocked", () => {
    expect(canSubmitWizardStep(2, 2)).toBe(true);
    expect(canSubmitWizardStep(2, 3)).toBe(false);
    expect(canSubmitWizardStep(6, 6)).toBe(true);
  });

  it("requires a ticket sale window that closes before the event begins", () => {
    const eventStart = new Date("2026-10-10T07:00:00Z");
    expect(isValidTicketSaleWindow(new Date("2026-10-01T09:00:00Z"), new Date("2026-10-09T18:00:00Z"), eventStart)).toBe(true);
    expect(isValidTicketSaleWindow(new Date("2026-10-01T09:00:00Z"), new Date("2026-10-10T08:00:00Z"), eventStart)).toBe(false);
    expect(isValidTicketSaleWindow(new Date("2026-10-09T18:00:00Z"), new Date("2026-10-01T09:00:00Z"), eventStart)).toBe(false);
  });

  it("persists GST only for taxable paid or donation ticket categories at supported rates, including 0%", () => {
    expect(normalizeTicketGst("paid", true, 18)).toEqual({ gstApplicable: true, gstRatePercent: 18 });
    expect(normalizeTicketGst("donation", true, "12")).toEqual({ gstApplicable: true, gstRatePercent: 12 });
    expect(normalizeTicketGst("paid", true, 0)).toEqual({ gstApplicable: true, gstRatePercent: 0 });
    expect(normalizeTicketGst("free", true, 18)).toEqual({ gstApplicable: false, gstRatePercent: 0 });
    expect(normalizeTicketGst("paid", true, 19)).toEqual({ gstApplicable: true, gstRatePercent: 0 });
    expect(normalizeTicketGst("paid", false, 18)).toEqual({ gstApplicable: false, gstRatePercent: 0 });
  });

  it("allows registrations only for live events with available tickets", () => {
    expect(canCreateRegistration("live", { quantitySold: 4, quantityLimit: 5 })).toBe(true);
    expect(canCreateRegistration("live", { quantitySold: 5, quantityLimit: 5 })).toBe(false);
    expect(canCreateRegistration("draft", { quantitySold: 0, quantityLimit: 5 })).toBe(false);
  });

  it("creates a pending payment state only for priced paid or donation tickets", () => {
    expect(paymentStatusForRegistration({ ticketCategory: "paid", pricePaise: 118000 })).toBe("pending");
    expect(paymentStatusForRegistration({ ticketCategory: "donation", pricePaise: 5000 })).toBe("pending");
    expect(paymentStatusForRegistration({ ticketCategory: "free", pricePaise: 0 })).toBe("not_required");
  });

  it("guards manual payment confirmation and attendee emails across the pending-to-paid lifecycle", () => {
    expect(canConfirmManualPayment("pending", "UPI-001")).toBe(true);
    expect(canConfirmManualPayment("pending", "")).toBe(false);
    expect(canConfirmManualPayment("paid", "UPI-001")).toBe(false);
    expect(shouldSendRegistrationConfirmation("pending")).toBe(false);
    expect(shouldSendRegistrationConfirmation("paid")).toBe(true);
    expect(shouldSendRegistrationConfirmation("not_required")).toBe(true);
  });
});
