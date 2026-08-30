import { describe, expect, it } from "vitest";
import { nativeTicketDraftFromForm } from "./ticket-form-fallback";

function ticketForm(values: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

describe("nativeTicketDraftFromForm", () => {
  it("returns no new ticket when the native ticket form is left empty", () => {
    expect(nativeTicketDraftFromForm(new FormData())).toBeNull();
  });

  it("reads a paid ticket from the native non-hydrated form fields", () => {
    const draft = nativeTicketDraftFromForm(ticketForm({
      nativeTicketName: "Paid entry",
      nativeTicketCategory: "paid",
      nativeTicketPricePaid: "499",
      nativeTicketGstApplicable: "yes",
      nativeTicketGstRatePercent: "18",
      nativeTicketQuantityLimit: "50",
      nativeTicketSalesStartDate: "2026-09-01",
      nativeTicketSalesStartTime: "09:00",
      nativeTicketSalesEndDate: "2026-09-10",
      nativeTicketSalesEndTime: "08:00",
    }));

    expect(draft).toMatchObject({
      name: "Paid entry",
      ticketCategory: "paid",
      price: 499,
      gstApplicable: true,
      quantityLimit: 50,
    });
  });

  it("forces a free ticket price to zero regardless of an unrelated paid-price field", () => {
    const draft = nativeTicketDraftFromForm(ticketForm({
      nativeTicketName: "Free entry",
      nativeTicketCategory: "free",
      nativeTicketPricePaid: "999",
    }));

    expect(draft).toMatchObject({ ticketCategory: "free", price: 0, gstApplicable: false });
  });

  it("forces the GST rate to zero when the organizer selects GST No", () => {
    const draft = nativeTicketDraftFromForm(ticketForm({ nativeTicketName: "Non-taxable paid entry", nativeTicketCategory: "paid", nativeTicketPricePaid: "250", nativeTicketGstApplicable: "no", nativeTicketGstRatePercent: "28" }));

    expect(draft).toMatchObject({ gstApplicable: false, gstRatePercent: 0 });
  });
});
