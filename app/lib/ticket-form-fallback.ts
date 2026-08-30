export type NativeTicketFormDraft = {
  name: string;
  description: string;
  ticketCategory: "paid" | "free" | "donation";
  price: number;
  gstApplicable: boolean;
  gstRatePercent: number;
  quantityLimit: number;
  minPerBooking: number;
  maxPerBooking: number;
  platformFeePayer: "organizer" | "buyer";
  fitizenFeePayer: "organizer" | "buyer";
  gatewayFeePayer: "organizer" | "buyer";
  salesStartDate: string;
  salesStartTime: string;
  salesEndDate: string;
  salesEndTime: string;
  attendeeMessage: string;
};

const value = (formData: FormData, name: string) => {
  const item = formData.get(name);
  return typeof item === "string" ? item.trim() : "";
};

const payer = (raw: string): "organizer" | "buyer" => (raw === "buyer" ? "buyer" : "organizer");

/**
 * Native form fallback for the event wizard. It keeps ticket creation usable
 * when a browser has not hydrated client components yet.
 */
export function nativeTicketDraftFromForm(formData: FormData): NativeTicketFormDraft | null {
  const name = value(formData, "nativeTicketName");
  if (!name) return null;

  const rawCategory = value(formData, "nativeTicketCategory");
  const ticketCategory = rawCategory === "paid" || rawCategory === "donation" ? rawCategory : "free";
  const rawPrice = ticketCategory === "paid"
    ? value(formData, "nativeTicketPricePaid")
    : ticketCategory === "donation"
      ? value(formData, "nativeTicketPriceDonation")
      : "0";

  const gstApplicable = ticketCategory !== "free" && value(formData, "nativeTicketGstApplicable") === "yes";

  return {
    name,
    description: value(formData, "nativeTicketDescription"),
    ticketCategory,
    price: Number(rawPrice || 0),
    gstApplicable,
    gstRatePercent: gstApplicable ? Number(value(formData, "nativeTicketGstRatePercent") || 0) : 0,
    quantityLimit: Number(value(formData, "nativeTicketQuantityLimit") || 100),
    minPerBooking: Number(value(formData, "nativeTicketMinPerBooking") || 1),
    maxPerBooking: Number(value(formData, "nativeTicketMaxPerBooking") || 10),
    platformFeePayer: payer(value(formData, "nativeTicketPlatformFeePayer")),
    fitizenFeePayer: payer(value(formData, "nativeTicketFitizenFeePayer")),
    gatewayFeePayer: payer(value(formData, "nativeTicketGatewayFeePayer")),
    salesStartDate: value(formData, "nativeTicketSalesStartDate"),
    salesStartTime: value(formData, "nativeTicketSalesStartTime"),
    salesEndDate: value(formData, "nativeTicketSalesEndDate"),
    salesEndTime: value(formData, "nativeTicketSalesEndTime"),
    attendeeMessage: value(formData, "nativeTicketAttendeeMessage"),
  };
}
