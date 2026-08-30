export type TicketPaymentCategory = "paid" | "free" | "donation";

export type TicketPaymentTypeState = {
  ticketCategory: TicketPaymentCategory;
  price: number;
  gstApplicable: boolean;
};

/**
 * Changes the single ticket payment type as one state transition. A free ticket
 * always clears its price and GST state; paid and donation tickets retain their
 * editable amount so the form can immediately enable the price control.
 */
export function selectTicketPaymentType<T extends TicketPaymentTypeState>(
  ticket: T,
  ticketCategory: TicketPaymentCategory,
): T {
  if (ticketCategory === "free") {
    return { ...ticket, ticketCategory, price: 0, gstApplicable: false };
  }

  return { ...ticket, ticketCategory };
}
