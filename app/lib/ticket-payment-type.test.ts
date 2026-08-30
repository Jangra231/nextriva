import { describe, expect, it } from "vitest";
import { selectTicketPaymentType } from "./ticket-payment-type";

describe("selectTicketPaymentType", () => {
  const paidTicket = {
    ticketCategory: "paid" as const,
    price: 499,
    gstApplicable: true,
  };

  it("switches a default free ticket to Paid without leaving Free selected", () => {
    const selected = selectTicketPaymentType(
      { ticketCategory: "free" as const, price: 0, gstApplicable: false },
      "paid",
    );

    expect(selected).toEqual({ ticketCategory: "paid", price: 0, gstApplicable: false });
  });

  it("keeps paid and donation amounts editable while changing their single selected type", () => {
    expect(selectTicketPaymentType(paidTicket, "donation")).toEqual({
      ticketCategory: "donation",
      price: 499,
      gstApplicable: true,
    });
  });

  it("clears incompatible price and GST state only when Free is selected", () => {
    expect(selectTicketPaymentType(paidTicket, "free")).toEqual({
      ticketCategory: "free",
      price: 0,
      gstApplicable: false,
    });
  });
});
