import { Landmark, Smartphone } from "lucide-react";

type Settings = {
  enabled: boolean;
  method: "upi" | "bank" | "both";
  upiId?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  manualPaymentNote?: string | null;
  fillingFastThresholdPercent?: number;
};

/** Native form controls keep paid-ticket configuration available without JS hydration. */
export default function ManualPaymentSettings({ initial }: { initial: Settings }) {
  return (
    <section className="manual-payment-settings">
      <section className="availability-settings">
        <h3>Registration availability badge</h3>
        <p>Show “Filling Fast” once this percentage of total ticket capacity has been claimed. Sold-out status always appears at full capacity.</p>
        <label className="form-label">Show Filling Fast at<input className="input threshold-input" name="fillingFastThresholdPercent" type="number" inputMode="numeric" min="1" max="99" defaultValue={initial.fillingFastThresholdPercent ?? 70} /><small>% of capacity claimed</small></label>
      </section>
      <div className="manual-payment-setting-head">
        <div><h3>Manual payment instructions</h3><p>Required when you add paid or donation tickets. Attendees will see only the details you choose to publish for this event.</p></div>
        <label className="choice"><input id="manual-payment-enabled" type="checkbox" name="manualPaymentEnabled" value="yes" defaultChecked={initial.enabled} /><span>Accept manual payments</span></label>
      </div>
      <div className="native-manual-payment-details">
        <fieldset className="native-manual-method-panel"><legend>Payment method</legend><div className="native-manual-method-grid" role="radiogroup" aria-label="Manual payment method"><label className="choice"><input id="native-manual-method-upi" type="radio" name="manualPaymentMethod" value="upi" defaultChecked={initial.method === "upi"} /><span>UPI only</span></label><label className="choice"><input id="native-manual-method-bank" type="radio" name="manualPaymentMethod" value="bank" defaultChecked={initial.method === "bank"} /><span>Bank transfer only</span></label><label className="choice"><input id="native-manual-method-both" type="radio" name="manualPaymentMethod" value="both" defaultChecked={initial.method === "both"} /><span>UPI and bank transfer</span></label></div></fieldset>
        <div className="manual-payment-group native-manual-upi"><h4><Smartphone size={16} /> UPI details</h4><label className="form-label">UPI ID <input className="input" name="upiId" defaultValue={initial.upiId || ""} placeholder="name@bank" /></label></div>
        <div className="manual-payment-group native-manual-bank"><h4><Landmark size={16} /> Bank transfer details</h4><div className="two-col"><label className="form-label">Account holder name<input className="input" name="bankAccountName" defaultValue={initial.bankAccountName || ""} /></label><label className="form-label">Bank name<input className="input" name="bankName" defaultValue={initial.bankName || ""} /></label><label className="form-label">Account number<input className="input" name="bankAccountNumber" inputMode="numeric" defaultValue={initial.bankAccountNumber || ""} /></label><label className="form-label">IFSC code<input className="input" name="bankIfsc" defaultValue={initial.bankIfsc || ""} style={{ textTransform: "uppercase" }} /></label></div></div>
        <label className="form-label">Payment note for attendees<textarea className="textarea" name="manualPaymentNote" defaultValue={initial.manualPaymentNote || ""} placeholder="For example: include your booking number in the transfer reference. Payment confirmation normally takes one business day." /></label>
      </div>
      <p className="field-note native-manual-payment-note">Free-only events do not need payment details. Tick “Accept manual payments” when adding a paid or donation ticket.</p>
    </section>
  );
}
