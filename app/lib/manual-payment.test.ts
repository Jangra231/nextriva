import { describe, expect, it } from "vitest";
import { hasManualPaymentInstructions, normalizeManualPaymentReference } from "./manual-payment";

describe("manual payment settings", () => {
  it("requires UPI details when UPI is selected", () => {
    expect(hasManualPaymentInstructions({ enabled: true, method: "upi", upiId: "fitizen@upi" })).toBe(true);
    expect(hasManualPaymentInstructions({ enabled: true, method: "upi", upiId: "x" })).toBe(false);
  });

  it("requires complete bank details for bank transfers", () => {
    expect(hasManualPaymentInstructions({ enabled: true, method: "bank", bankAccountName: "Fitizen Events", bankAccountNumber: "1234567890", bankIfsc: "HDFC0001" })).toBe(true);
    expect(hasManualPaymentInstructions({ enabled: true, method: "bank", bankAccountName: "Fitizen Events", bankAccountNumber: "123", bankIfsc: "HDFC0001" })).toBe(false);
  });

  it("requires both valid methods when both are published", () => {
    expect(hasManualPaymentInstructions({ enabled: true, method: "both", upiId: "fitizen@upi", bankAccountName: "Fitizen Events", bankAccountNumber: "1234567890", bankIfsc: "HDFC0001" })).toBe(true);
    expect(hasManualPaymentInstructions({ enabled: true, method: "both", upiId: "fitizen@upi", bankAccountName: "Fitizen Events", bankAccountNumber: "1234567890" })).toBe(false);
  });

  it("trims and limits payment references before persistence", () => {
    expect(normalizeManualPaymentReference("  UPI-123  ")).toBe("UPI-123");
    expect(normalizeManualPaymentReference(" ")).toBe("");
  });
});
