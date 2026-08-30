import { describe, expect, it } from "vitest";
import { canEditEventForModeration, canSubmitForApproval, calculatePlatformFeePaise, effectiveModerationStatus, registrationPriceBreakdown, requiresModerationNote } from "./moderation";

describe("event moderation", () => {
  it("keeps legacy live events visible as approved without rewriting existing records", () => {
    expect(effectiveModerationStatus({ status: "live", moderationStatus: "draft" })).toBe("approved");
    expect(effectiveModerationStatus({ status: "draft", moderationStatus: "rejected" })).toBe("rejected");
  });

  it("allows edits and resubmission only for drafts or events with requested changes", () => {
    expect(canEditEventForModeration("draft")).toBe(true);
    expect(canEditEventForModeration("rejected")).toBe(true);
    expect(canSubmitForApproval("submitted")).toBe(false);
    expect(canSubmitForApproval("suspended")).toBe(false);
    expect(requiresModerationNote("rejected")).toBe(true);
  });
});

describe("platform fees", () => {
  it("tracks the event fee while charging it to the buyer only when configured", () => {
    expect(calculatePlatformFeePaise(10000, 5)).toBe(500);
    expect(registrationPriceBreakdown({ ticketPricePaise: 10000, gstApplicable: true, gstRatePercent: 18, platformFeePercent: 5, platformFeePayer: "buyer" })).toEqual({ ticketSubtotalPaise: 10000, gstPaise: 1800, platformFeePaise: 500, gatewayFeePaise: 0, collectedAmountPaise: 12300 });
    expect(registrationPriceBreakdown({ ticketPricePaise: 10000, gstApplicable: true, gstRatePercent: 18, platformFeePercent: 5, platformFeePayer: "organizer" }).collectedAmountPaise).toBe(11800);
    expect(registrationPriceBreakdown({ ticketPricePaise: 10000, gstApplicable: false, gstRatePercent: 0, platformFeePercent: 0, platformFeePayer: "organizer", gatewayFeePercent: 2, gatewayFeePayer: "buyer" })).toMatchObject({ gatewayFeePaise: 200, collectedAmountPaise: 10200 });
  });
});
