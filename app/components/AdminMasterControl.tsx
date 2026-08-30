import { adminMasterUpdateAction } from "../actions";
import styles from "./AdminMasterControl.module.css";
import WorkflowSubmitButton from "./WorkflowSubmitButton";

type Option = { value: string; label: string };

export function MasterControl({ view, intent, targetId, currentValue, options }: { view: "users" | "events" | "payments" | "reports"; intent: "user-role" | "registration-status" | "payment-status" | "promotion-status"; targetId: number; currentValue: string; options: Option[] }) {
  return <form action={adminMasterUpdateAction} className={styles.form}><input type="hidden" name="view" value={view} /><input type="hidden" name="intent" value={intent} /><input type="hidden" name="targetId" value={targetId} /><select name="value" defaultValue={currentValue} aria-label="Select new status">{options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select><input name="confirmation" aria-label="Type MASTER to confirm" placeholder="MASTER" required /><WorkflowSubmitButton pendingLabel="Applying…">Apply</WorkflowSubmitButton></form>;
}

export function EventModerationControl({ targetId, currentValue, platformFeePercent }: { targetId: number; currentValue: string; platformFeePercent: number }) {
  return <form action={adminMasterUpdateAction} className={styles.moderationForm}><input type="hidden" name="view" value="events" /><input type="hidden" name="intent" value="event-moderation" /><input type="hidden" name="targetId" value={targetId} /><label>Decision<select name="value" defaultValue={currentValue === "draft" ? "approved" : currentValue} aria-label="Administrator event decision"><option value="approved">Approve & make live</option><option value="rejected">Request changes</option><option value="frozen">Freeze event</option><option value="suspended">Suspend event</option><option value="deleted">Remove event</option></select></label><label>Platform fee (%)<input name="platformFeePercent" type="number" min="0" max="100" defaultValue={platformFeePercent} aria-label="Platform fee percentage" /></label><label className={styles.noteField}>Organizer guidance<textarea name="note" rows={2} placeholder="Required for changes, freeze, suspension, or removal" aria-label="Organizer-facing moderation note" /></label><div className={styles.confirmRow}><input name="confirmation" aria-label="Type MASTER to confirm moderation action" placeholder="MASTER" required /><WorkflowSubmitButton pendingLabel="Applying…">Apply decision</WorkflowSubmitButton></div></form>;
}

export function MasterControlNote() {
  return <p className={styles.note}>Master changes are audited. Type <b>MASTER</b> before applying an action. Event rejections, freezes, suspensions, and removals require organizer-facing guidance.</p>;
}
