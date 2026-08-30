import Link from "next/link";
import { BarChart3, Building2, ClipboardList, Landmark, LogOut, WalletCards } from "lucide-react";
import { logoutAction } from "../actions";
import { requireCsrSponsor } from "../lib/admin";

const items = [
  { view: "overview", label: "Overview", icon: Building2 },
  { view: "budgets", label: "CSR budgets", icon: WalletCards },
  { view: "sponsor", label: "Sponsorship briefs", icon: ClipboardList },
  { view: "impact", label: "Impact", icon: Landmark },
  { view: "reports", label: "CSR reports", icon: BarChart3 },
];

export default async function CsrShell({ active, children }: { active: string; children: React.ReactNode }) {
  const user = await requireCsrSponsor(`/csr?view=${encodeURIComponent(active)}`);
  return <div className="dashboard"><header className="dash-top"><Link href="/csr" className="brand"><span className="brand-mark">N</span><span>nexriva</span></Link><nav className="dash-nav" aria-label="CSR sponsor navigation">{items.map(({ view, label, icon: Icon }) => <Link key={view} href={view === "overview" ? "/csr" : `/csr?view=${view}`} className={active === view ? "active" : ""}><Icon size={15} /> {label}</Link>)}</nav><details className="profile-menu"><summary aria-label="Open CSR account menu"><span className="avatar">C</span><span className="account-label">CSR</span></summary><div className="profile-pop"><p>{user.name || "CSR sponsor"}</p><small>Corporate funding access</small><form action={logoutAction}><button type="submit"><LogOut size={14} /> Logout</button></form></div></details></header><main id="main-content" className="dash-main">{children}</main></div>;
}
