import { BarChart3, CalendarClock, Ticket } from "lucide-react";

export type TicketDraft = {
  id?: number;
  name: string;
  description: string;
  ticketCategory: "paid" | "free" | "donation";
  price: number;
  gstApplicable: boolean;
  gstRatePercent: number;
  quantityLimit: number;
  quantitySold?: number;
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

export type TicketDateDefaults = Pick<TicketDraft, "salesStartDate" | "salesStartTime" | "salesEndDate" | "salesEndTime">;

export default function TicketManager({ initial, dateDefaults }: { initial: TicketDraft[]; dateDefaults: TicketDateDefaults }) {
  const capacity = initial.reduce(
    (summary, ticket) => ({ total: summary.total + ticket.quantityLimit, sold: summary.sold + (ticket.quantitySold || 0) }),
    { total: 0, sold: 0 },
  );
  const remaining = Math.max(0, capacity.total - capacity.sold);
  const soldPercent = capacity.total ? Math.round((capacity.sold / capacity.total) * 100) : 0;

  return (
    <div className="ticket-manager">
      <input type="hidden" name="ticketsJson" value={JSON.stringify(initial)} />
      {initial.length ? (
        <>
          <section className="capacity-analytics" aria-label="Event capacity analytics">
            <div><span><BarChart3 size={15} /> Event capacity</span><b>{capacity.sold} / {capacity.total}</b><small>{remaining} spaces remaining</small></div>
            <div className="capacity-bar" aria-label={`${soldPercent}% capacity used`}><i style={{ width: `${soldPercent}%` }} /></div>
            <strong>{soldPercent}% filled</strong>
          </section>
          <div className="ticket-card-list">
            {initial.map((ticket, index) => (
              <article className="saved-ticket-card" key={`${ticket.id || ticket.name}-${index}`}>
                <div className="ticket-card-icon"><Ticket size={17} /></div>
                <div>
                  <b>{ticket.name}</b>
                  <p>{ticket.ticketCategory === "free" ? "Free" : ticket.ticketCategory === "donation" ? `Donation${ticket.price > 0 ? ` · suggested ₹${ticket.price}` : ""}` : `₹${ticket.price}${ticket.gstApplicable ? ` + ${ticket.gstRatePercent}% GST` : ""}`} · {ticket.quantitySold || 0} sold / {ticket.quantityLimit}</p>
                  <small><CalendarClock size={12} /> Sales {ticket.salesStartDate} {ticket.salesStartTime} – {ticket.salesEndDate} {ticket.salesEndTime}</small>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : <p className="empty-ticket-note">Choose a payment type below, complete one ticket, then use Save and Next to add it to this event.</p>}
      <NativeTicketForm dateDefaults={dateDefaults} />
    </div>
  );
}

function NativeTicketForm({ dateDefaults }: { dateDefaults: TicketDateDefaults }) {
  return (
    <section className="ticket-composer native-ticket-composer" aria-label="Create a ticket">
      <div className="composer-head"><h3>Create Ticket</h3><p>Select Paid, Free, or Donation. This form works directly with the page save action, including before browser enhancement has loaded.</p></div>
      <div className="two-col">
        <Field label="Ticket Display Name *"><input className="input" name="nativeTicketName" placeholder="Early Bird / Regular Entry / RSVP" /></Field>
        <Field label="Ticket Description"><input className="input" name="nativeTicketDescription" placeholder="Enter a short ticket description" /></Field>
      </div>
      <fieldset className="ticket-type-panel native-ticket-type-panel">
        <legend>Ticket Type *</legend>
        <div className="ticket-type-grid" role="radiogroup" aria-label="Ticket payment type">
          <label className="ticket-type-choice"><input id="native-ticket-type-paid" type="radio" name="nativeTicketCategory" value="paid" /><span><b>Paid</b><small>Set a required price</small></span></label>
          <label className="ticket-type-choice"><input id="native-ticket-type-free" type="radio" name="nativeTicketCategory" value="free" defaultChecked /><span><b>Free</b><small>No payment needed</small></span></label>
          <label className="ticket-type-choice"><input id="native-ticket-type-donation" type="radio" name="nativeTicketCategory" value="donation" /><span><b>Donation</b><small>Optional suggested amount</small></span></label>
        </div>
        <div className="native-ticket-price-fields" aria-live="polite">
          <label className="form-label native-ticket-price native-ticket-price-paid">Ticket Price (₹) *<input className="input" name="nativeTicketPricePaid" type="number" min="1" step="1" inputMode="decimal" placeholder="Enter paid ticket price" /></label>
          <label className="form-label native-ticket-price native-ticket-price-free">Ticket Price (₹)<input className="input" value="Free ticket — no payment needed" disabled readOnly /></label>
          <label className="form-label native-ticket-price native-ticket-price-donation">Suggested Donation (₹)<input className="input" name="nativeTicketPriceDonation" type="number" min="0" step="1" inputMode="decimal" placeholder="Optional suggested amount" /></label>
        </div>
      </fieldset>
      <div className="two-col">
        <Field label="Total Quantity *"><input className="input" name="nativeTicketQuantityLimit" type="number" min="1" defaultValue="100" /></Field>
        <fieldset className="native-gst-choice-panel"><legend>GST applicable?</legend><div className="native-gst-choice-grid" role="radiogroup" aria-label="GST applicability"><label className="choice"><input id="native-gst-no" type="radio" name="nativeTicketGstApplicable" value="no" defaultChecked /><span>No</span></label><label className="choice"><input id="native-gst-yes" type="radio" name="nativeTicketGstApplicable" value="yes" /><span>Yes</span></label></div></fieldset>
      </div>
      <div className="two-col">
        <div className="native-gst-rate-fields"><label className="form-label native-gst-rate-native">GST rate<select className="select" name="nativeTicketGstRatePercent" defaultValue="0">{[0, 5, 12, 18, 28].map(rate => <option key={rate} value={rate}>{rate}%</option>)}</select></label><label className="form-label native-gst-rate-disabled">GST rate<input className="input" value="0% — GST not applicable" disabled readOnly /></label></div>
        <Field label="Minimum per booking"><input className="input" name="nativeTicketMinPerBooking" type="number" min="1" defaultValue="1" /></Field>
      </div>
      <Field label="Maximum per booking"><input className="input" name="nativeTicketMaxPerBooking" type="number" min="1" defaultValue="10" /></Field>
      <div className="fee-grid">
        <FeeField label="Platform fee" name="nativeTicketPlatformFeePayer" />
        <FeeField label="Fitizen fee" name="nativeTicketFitizenFeePayer" />
        <FeeField label="Payment gateway fee" name="nativeTicketGatewayFeePayer" />
      </div>
      <div className="sale-period"><h4>Sale Period</h4><p className="field-note">Defaults come from your event timing. Adjust them if ticket sales should open or close earlier.</p><div className="two-col"><DateTime label="Ticket sale starts from" dateName="nativeTicketSalesStartDate" timeName="nativeTicketSalesStartTime" date={dateDefaults.salesStartDate} time={dateDefaults.salesStartTime} /><DateTime label="Ticket sale ends at" dateName="nativeTicketSalesEndDate" timeName="nativeTicketSalesEndTime" date={dateDefaults.salesEndDate} time={dateDefaults.salesEndTime} /></div></div>
      <Field label="Message to Attendee"><textarea className="textarea" name="nativeTicketAttendeeMessage" placeholder="Enter the message to be sent with this ticket" /></Field>
      <p className="field-note">Enter a ticket name to add this ticket when you select <b>Save and Next</b>. Leave these fields blank to keep the saved tickets above unchanged.</p>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="form-label">{label}{children}</label>;
}

function FeeField({ label, name }: { label: string; name: string }) {
  return <Field label={label}><select className="select" name={name} defaultValue="organizer"><option value="organizer">Me</option><option value="buyer">Buyer</option></select></Field>;
}

function DateTime({ label, dateName, timeName, date, time }: { label: string; dateName: string; timeName: string; date: string; time: string }) {
  return <div className="timing-group"><b>{label}</b><div className="two-col"><Field label="Date *"><input className="input" name={dateName} type="date" defaultValue={date} /></Field><Field label="Time *"><input className="input" name={timeName} type="time" defaultValue={time} /></Field></div></div>;
}
