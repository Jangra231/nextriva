import Link from "next/link";
import { BarChart3, Building2, CalendarDays, CreditCard, FileClock, KeyRound, LayoutDashboard, MapPinned, ReceiptText, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import { requireAdministrator } from "../lib/admin";
import { initials } from "../lib/auth";
import { isCapabilityCatalogEnabled } from "../lib/capability-feature";
import styles from "./AdminShell.module.css";

const links = [
  { view: "overview", label: "Overview", icon: LayoutDashboard },
  { view: "users", label: "Accounts", icon: UsersRound },
  { view: "events", label: "Events", icon: CalendarDays },
  { view: "payments", label: "Payments", icon: CreditCard },
  { view: "venues", label: "Venue directory", icon: MapPinned },
  { view: "csr", label: "CSR sponsorships", icon: Building2 },
  { view: "capabilities", label: "Capabilities", icon: KeyRound },
  { view: "reports", label: "Reports", icon: BarChart3 },
  { view: "settings", label: "Fee settings", icon: Settings2 },
  { view: "data-audit", label: "Data audit", icon: ReceiptText },
  { view: "audit", label: "Audit log", icon: FileClock },
];

export default async function AdminShell({ active, children }: { active: string; children: React.ReactNode }) {
  const user = await requireAdministrator();
  const visibleLinks = links.filter(link => isCapabilityCatalogEnabled() || link.view !== "capabilities");
  return <div className={styles.layout}><header className={styles.topbar}><div className={styles.identity}><Link href="/" className="brand"><span className="brand-mark">N</span><span>nexriva</span></Link><span><ShieldCheck size={14} aria-hidden="true" /> Administrator Console</span></div><div className={styles.account}><span className="avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.name)}</span><span>{user.name || "Administrator"}</span><Link href="/">View site</Link></div></header><div className={styles.body}><aside className={styles.sidebar} aria-label="Administrator navigation"><p>Platform management</p>{visibleLinks.map(({ view, label, icon: Icon }) => <Link key={view} href={`/admin?view=${view}`} className={active === view ? "active" : ""}><Icon size={16} aria-hidden="true" />{label}</Link>)}</aside><main id="main-content" className={styles.main}>{children}</main></div></div>;
}
