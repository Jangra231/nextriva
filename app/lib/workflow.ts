export type PublishableEvent = {
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  city: string | null;
  venueName: string | null;
  description: string | null;
  coverUrl: string | null;
  currentStep: number;
};

export function canPublishEvent(event: PublishableEvent) {
  return Boolean(event.startsAt && event.endsAt && event.city && event.venueName && event.description && event.coverUrl && event.currentStep >= 6);
}

export function nextWizardStep(currentStep: number) {
  return Math.min(6, Math.max(1, currentStep + 1));
}

export function createEventSlug(title: string, suffix = Date.now().toString(36)) {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
  return `${base}-${suffix}`;
}

export function isRegistrationStatus(value: string): value is "confirmed" | "cancelled" | "checked_in" {
  return ["confirmed", "cancelled", "checked_in"].includes(value);
}

export function canAccessOrganizerResource(ownerId: number, userId: number | null | undefined) {
  return Number.isInteger(userId) && ownerId === userId;
}

export function hasAuthenticatedAccount(userId: number | null | undefined) {
  return Number.isInteger(userId) && (userId as number) > 0;
}

export function canSubmitWizardStep(unlockedStep: number, submittedStep: number) {
  return Number.isInteger(submittedStep) && submittedStep >= 1 && submittedStep <= 6 && submittedStep <= Math.min(6, Math.max(1, unlockedStep));
}

export function isValidTicketSaleWindow(salesStartAt: Date, salesEndAt: Date, eventStartsAt: Date | string | null) {
  const eventStart = eventStartsAt ? new Date(eventStartsAt) : new Date("invalid");
  return Number.isFinite(salesStartAt.valueOf()) && Number.isFinite(salesEndAt.valueOf()) && Number.isFinite(eventStart.valueOf()) && salesStartAt < salesEndAt && salesEndAt < eventStart;
}

export function normalizeTicketGst(ticketCategory: "paid" | "free" | "donation", gstApplicable: unknown, gstRatePercent: unknown) {
  const applicable = ticketCategory !== "free" && gstApplicable === true;
  const rate = Number(gstRatePercent);
  return { gstApplicable: applicable, gstRatePercent: applicable && [0, 5, 12, 18, 28].includes(rate) ? rate : 0 };
}

export function canCreateRegistration(eventStatus: "draft" | "live" | "completed" | undefined, ticket?: { quantitySold: number; quantityLimit: number } | null) {
  if (eventStatus !== "live") return false;
  return !ticket || ticket.quantitySold < ticket.quantityLimit;
}

export function paymentStatusForRegistration(ticket?: { ticketCategory: "paid" | "free" | "donation"; pricePaise: number } | null) {
  return ticket && ticket.ticketCategory !== "free" && ticket.pricePaise > 0 ? "pending" as const : "not_required" as const;
}

export function canConfirmManualPayment(paymentStatus: "not_required" | "pending" | "paid" | "failed" | "refunded", paymentEvidence?: string | null) {
  return paymentStatus === "pending" && Boolean(paymentEvidence?.trim());
}

export function shouldSendRegistrationConfirmation(paymentStatus: "not_required" | "pending" | "paid" | "failed" | "refunded") {
  return paymentStatus === "not_required" || paymentStatus === "paid";
}
