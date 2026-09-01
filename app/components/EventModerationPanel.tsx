import { CircleAlert, CircleCheck, Clock3, LockKeyhole, RotateCcw, ShieldOff, Trash2 } from "lucide-react";
import { moderationLabel, type ModerationStatus } from "../lib/moderation";
import { formatUTCDateTime } from "../lib/date-format";
import type { OrganizerApprovalTimelineEntry } from "../lib/db";
import styles from "./EventModerationPanel.module.css";

const content: Record<ModerationStatus, { title: string; message: string; Icon: typeof Clock3 }> = {
  draft: { title: "Draft in progress", message: "Complete all six event setup steps, then submit this event to the administrator for approval.", Icon: Clock3 },
  submitted: { title: "Submitted for administrator approval", message: "Your event is locked while it is being reviewed. You will be able to update it if the administrator requests changes.", Icon: Clock3 },
  approved: { title: "Approved and live", message: "Your event is now available based on its public visibility and administrator approval.", Icon: CircleCheck },
  rejected: { title: "Changes requested", message: "Review the administrator feedback below, update the event, and submit it again for approval.", Icon: RotateCcw },
  frozen: { title: "Event frozen", message: "The administrator has temporarily frozen this event. Review the note below before contacting support or making changes.", Icon: LockKeyhole },
  suspended: { title: "Event suspended", message: "This event has been suspended and is not visible to participants. Review the administrator note below.", Icon: ShieldOff },
  deleted: { title: "Event removed", message: "This event has been removed from the platform and cannot be edited or submitted again.", Icon: Trash2 },
};

export default function EventModerationPanel({ status, note, submittedAt, reviewedAt, timeline = [] }: { status: ModerationStatus; note?: string | null; submittedAt?: Date | string | null; reviewedAt?: Date | string | null; timeline?: OrganizerApprovalTimelineEntry[] }) {
  const { title, message, Icon } = content[status];
  const time = reviewedAt || submittedAt;
  return <section className={`${styles.panel} ${styles[status]}`} aria-label={`Moderation status: ${moderationLabel(status)}`}><Icon size={20} /><div><span className={styles.eyebrow}>{moderationLabel(status)}</span><h3>{title}</h3><p>{message}</p>{note ? <blockquote className={styles.note}><b>Administrator feedback</b><br />{note}</blockquote> : null}{time ? <small>{status === "submitted" ? "Submitted" : "Last reviewed"} {formatUTCDateTime(time)}</small> : null}<ol className={styles.timeline} aria-label="Event approval timeline">{timeline.map((entry, index) => <li className={entry.status === status && index === timeline.length - 1 ? styles.current : ""} key={`${entry.status}-${entry.occurredAt.toISOString()}-${index}`}><i aria-hidden="true" /><div><b>{entry.label}</b><time dateTime={entry.occurredAt.toISOString()}>{formatUTCDateTime(entry.occurredAt)}</time>{entry.note ? <span>{entry.note}</span> : null}</div></li>)}</ol></div></section>;
}
