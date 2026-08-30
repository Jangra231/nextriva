export type ModerationStatus = "draft" | "submitted" | "approved" | "rejected" | "frozen" | "suspended" | "deleted";

export function moderationLabel(status: ModerationStatus) {
  return {
    draft: "Draft",
    submitted: "Awaiting approval",
    approved: "Live",
    rejected: "Changes requested",
    frozen: "Frozen",
    suspended: "Suspended",
    deleted: "Deleted",
  }[status];
}

export function effectiveModerationStatus(event: { status: "draft" | "live" | "completed"; moderationStatus: ModerationStatus }): ModerationStatus {
  if (event.status === "live" && event.moderationStatus === "draft") return "approved";
  if (event.status === "completed" && event.moderationStatus === "draft") return "approved";
  return event.moderationStatus;
}

export function canEditEventForModeration(status: ModerationStatus) {
  return status === "draft" || status === "rejected";
}

export function canSubmitForApproval(status: ModerationStatus) {
  return status === "draft" || status === "rejected";
}

export function requiresModerationNote(status: ModerationStatus) {
  return status === "rejected" || status === "frozen" || status === "suspended" || status === "deleted";
}

export function normalizePlatformFeePercent(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(100, Math.max(0, Math.round(numeric))) : 0;
}

export function calculatePlatformFeePaise(ticketPricePaise: number, platformFeePercent: number) {
  if (ticketPricePaise <= 0) return 0;
  return Math.round(ticketPricePaise * normalizePlatformFeePercent(platformFeePercent) / 100);
}

export function registrationPriceBreakdown(input: { ticketPricePaise: number; gstApplicable: boolean; gstRatePercent: number; platformFeePercent: number; platformFeePayer: "organizer" | "buyer"; gatewayFeePercent?: number; gatewayFeePayer?: "organizer" | "buyer" }) {
  const ticketSubtotalPaise = Math.max(0, Math.round(input.ticketPricePaise));
  const gstPaise = input.gstApplicable ? Math.round(ticketSubtotalPaise * Math.max(0, input.gstRatePercent) / 100) : 0;
  const platformFeePaise = calculatePlatformFeePaise(ticketSubtotalPaise, input.platformFeePercent);
  const gatewayFeePaise = calculatePlatformFeePaise(ticketSubtotalPaise, input.gatewayFeePercent || 0);
  const collectedAmountPaise = ticketSubtotalPaise + gstPaise + (input.platformFeePayer === "buyer" ? platformFeePaise : 0) + (input.gatewayFeePayer === "buyer" ? gatewayFeePaise : 0);
  return { ticketSubtotalPaise, gstPaise, platformFeePaise, gatewayFeePaise, collectedAmountPaise };
}
