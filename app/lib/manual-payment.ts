export type ManualPaymentSettings = {
  enabled: boolean;
  method: "upi" | "bank" | "both" | null | undefined;
  upiId?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
};

export function hasManualPaymentInstructions(settings: ManualPaymentSettings) {
  if (!settings.enabled) return false;
  const upiReady = Boolean(settings.upiId?.trim() && settings.upiId.trim().length >= 3);
  const bankReady = Boolean(settings.bankAccountName?.trim() && settings.bankAccountName.trim().length >= 2 && settings.bankAccountNumber?.trim() && settings.bankAccountNumber.trim().length >= 6 && settings.bankIfsc?.trim() && settings.bankIfsc.trim().length >= 4);
  if (settings.method === "upi") return upiReady;
  if (settings.method === "bank") return bankReady;
  return settings.method === "both" && upiReady && bankReady;
}

export function normalizeManualPaymentReference(value?: string | null) {
  return value?.trim().slice(0, 128) || "";
}
