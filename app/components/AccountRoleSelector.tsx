import Link from "next/link";
import { BriefcaseBusiness, TicketCheck } from "lucide-react";
import styles from "./AccountRoleSelector.module.css";

export default function AccountRoleSelector({ activeMode }: { activeMode?: "organizer" | "participant" }) {
  return <section className={styles.root} aria-label="Select account view"><span className={styles.heading}>Choose your view</span><div className={styles.choices}><Link href="/dashboard/manage-events/events" className={`${styles.choice} ${activeMode === "organizer" ? styles.active : ""}`} aria-current={activeMode === "organizer" ? "page" : undefined}><span><BriefcaseBusiness size={13} aria-hidden="true" /> Organizer</span><small>Manage events</small></Link><Link href="/" className={`${styles.choice} ${activeMode === "participant" ? styles.active : ""}`} aria-current={activeMode === "participant" ? "page" : undefined}><span><TicketCheck size={13} aria-hidden="true" /> Participant</span><small>Explore events</small></Link></div></section>;
}
