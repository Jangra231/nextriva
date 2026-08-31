import Link from "next/link";
import { BarChart3, Building2, ChevronDown, ClipboardCheck, Landmark, LogOut, MapPinned, UsersRound } from "lucide-react";
import { logoutAction } from "../actions";
import { authorityWorkspacePath, requireLocalAuthority } from "../lib/admin";

const items = [
  { view: "overview", label: "Overview", icon: Landmark },
  { view: "events", label: "Event review", icon: ClipboardCheck },
  { view: "csr", label: "CSR supported activity", icon: Building2 },
  { view: "territory", label: "Ward activity", icon: MapPinned },
  { view: "organizers", label: "Organizers", icon: UsersRound },
  { view: "reports", label: "MIS reports", icon: BarChart3 },
];

export default async function McdShell({ active, children }: { active: string; children: React.ReactNode }) {
  const workspacePath = authorityWorkspacePath();
  const user = await requireLocalAuthority(`${workspacePath}?view=${encodeURIComponent(active)}`);
  return <div className="dashboard local-authority-workspace"><header className="dash-top"><Link href={workspacePath} className="brand"><span className="brand-mark">N</span><span>nexriva</span></Link><nav className="dash-nav" aria-label="Local Authority public health navigation">{items.map(({ view, label, icon: Icon }) => <Link key={view} href={view === "overview" ? workspacePath : `${workspacePath}?view=${view}`} className={active === view ? "active" : ""}><Icon size={15} /> {label}</Link>)}</nav><details className="profile-menu"><summary aria-label="Open Local Authority account menu"><span className="avatar">L</span><ChevronDown size={14} /></summary><div className="profile-pop"><p>Local Authority account</p><small>Public-health authority access</small><form action={logoutAction}><button type="submit"><LogOut size={14} /> Logout</button></form></div></details></header><main id="main-content" className="dash-main local-authority-main">{children}</main></div>;
}
