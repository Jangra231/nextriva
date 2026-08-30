import { localAuthorityEventReviewAction } from "../actions";
import WorkflowSubmitButton from "./WorkflowSubmitButton";

export default function McdEventReviewControl({ eventId }: { eventId: number }) {
  return <form action={localAuthorityEventReviewAction} className="admin-control-stack local-authority-review-control"><input type="hidden" name="eventId" value={eventId} /><select className="select" name="decision" defaultValue="approved" aria-label="Local Authority event decision"><option value="approved">Approve and make live</option><option value="rejected">Request changes</option><option value="frozen">Freeze event</option><option value="suspended">Suspend event</option></select><textarea className="input" name="note" rows={2} placeholder="Required guidance for changes, freeze, or suspension" /><div className="admin-confirm"><input className="input" name="confirmation" required placeholder="Type LOCAL" /><WorkflowSubmitButton className="btn btn-outline" pendingLabel="Recording…">Record review</WorkflowSubmitButton></div></form>;
}
