import { CalendarClock, CircleAlert, ShieldCheck } from "lucide-react";
import type { getCapabilityGrantAlerts } from "../lib/db";

type GrantAlert = Awaited<ReturnType<typeof getCapabilityGrantAlerts>>[number];

const dateLabel = (value: Date) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function CapabilityGrantAlerts({ alerts, subject = "Your" }: { alerts: GrantAlert[]; subject?: string }) {
  const urgent = alerts.filter(alert => alert.state === "urgent").length;
  const expired = alerts.filter(alert => alert.state === "expired").length;
  return <section className={`grant-alert-widget ${expired ? "has-expired" : urgent ? "has-urgent" : ""}`} aria-labelledby="grant-alert-title"><div className="grant-alert-head"><div><span className="eyebrow"><CalendarClock size={13} /> Grant reminders</span><h2 id="grant-alert-title">{subject} time-bound grant status</h2><p>{alerts.length ? "Review grants nearing their end date before the current authorization window closes." : "No active grants expire within the next 30 days."}</p></div>{alerts.length ? <span className={`status-pill ${expired ? "critical" : urgent ? "attention" : "submitted"}`}>{expired ? `${expired} expired` : `${urgent || alerts.length} reminder${(urgent || alerts.length) === 1 ? "" : "s"}`}</span> : <ShieldCheck size={20} aria-hidden="true" />}</div>{alerts.length ? <div className="grant-alert-list">{alerts.map(alert => <article className={`grant-alert-card ${alert.state}`} key={alert.grant.id}><CircleAlert size={18} aria-hidden="true" /><div><b>{alert.capability.displayName}</b><small>{alert.functions.map(fn => fn.displayName).join(", ") || "Selected functions"}</small><small>Ends {dateLabel(alert.grant.endsAt)} · {alert.daysRemaining <= 0 ? "Authorization window has ended" : alert.daysRemaining === 1 ? "1 day remaining" : `${alert.daysRemaining} days remaining`}</small></div></article>)}</div> : null}</section>;
}
