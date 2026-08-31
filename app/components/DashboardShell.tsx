import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, CalendarDays, ChevronDown, ClipboardPlus, Compass, Heart, LogOut, Megaphone, TicketCheck, UsersRound } from "lucide-react";
import { logoutAction } from "../actions";
import { accountProfilePath } from "../lib/admin";
import { currentUser } from "../lib/auth";
import { generateInitialsAvatar } from "../lib/avatar";
import AccountRoleSelector from "./AccountRoleSelector";

const organizerNavItems = [
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/attendees", label: "Attendees", icon: UsersRound },
  { href: "/dashboard/manage-events/events", label: "My Events", icon: CalendarDays },
  { href: "/dashboard/promotions", label: "Promotions", icon: Megaphone },
];

const participantNavItems = [
  { href: "/dashboard/my-bookings", label: "My Bookings", icon: TicketCheck },
  { href: "/dashboard/history", label: "History", icon: ClipboardPlus },
  { href: "/dashboard/following", label: "Following", icon: Heart },
  { href: "/events", label: "Explore Events", icon: Compass },
];

export default async function DashboardShell({ active, mode = "organizer", children }: { active: string; mode?: "organizer" | "participant"; children: React.ReactNode }) {
  const user = await currentUser();
  const profilePath = accountProfilePath();
  if (!user) redirect("/login");
  if (user.role === "mcd") redirect("/mcd");
  if (user.role === "csr") redirect("/csr");
  if (user.role === "state") redirect("/state-authority");
  if (user.role === "district") redirect("/district-authority");
  const navItems = mode === "participant" ? participantNavItems : organizerNavItems;
  return (
    <div className="dashboard">
      <header className="dash-top">
        <Link href="/" className="brand"><span className="brand-mark">N</span><span>nexriva</span></Link>
        <nav className="dash-nav" aria-label={`${mode === "participant" ? "Participant" : "Organizer"} navigation`}>
          {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={active === label ? "active" : ""}><Icon size={15} /> {label}</Link>)}
        </nav>
        <details className="profile-menu">
          <summary aria-label="Open account menu"><span className="avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <img src={generateInitialsAvatar(user.name)} alt="" />}</span><ChevronDown size={14} /></summary>
          <div className="profile-pop">
            <p>{user.name || "Nexriva member"}</p>
            <Link href={profilePath}>View and edit profile</Link>
            {user.role === "admin" ? <Link href="/admin">Administrator Console</Link> : null}
            <AccountRoleSelector activeMode={mode} />
            <form action={logoutAction}><button type="submit"><LogOut size={14} /> Logout</button></form>
          </div>
        </details>
      </header>
	      <main id="main-content" className="dash-main">{children}</main>
    </div>
  );
}
