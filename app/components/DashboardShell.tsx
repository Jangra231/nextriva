import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Blocks, CalendarDays, ChevronDown, ClipboardPlus, Compass, Heart, LogOut, Megaphone, ShieldCheck, TicketCheck, UsersRound } from "lucide-react";
import { logoutAction } from "../actions";
import { accountProfilePath } from "../lib/admin";
import { currentUser, initials } from "../lib/auth";
import { isCapabilityCatalogEnabled } from "../lib/capability-feature";
import { isCapabilityDecisionNotificationsEnabled } from "../lib/capability-feature";
import { isCapabilityWorkspaceSwitcherEnabled } from "../lib/capability-feature";
import { isStage10GrantReminderAutomationEnabled, isWorkspaceDefaultExpiryAlertsEnabled } from "../lib/capability-feature";
import { getActiveCapabilityWorkspaces, getExpiringAuthorityGrantAlerts, getSavedWorkspaceDefaultExpiryAlert, getUnreadCapabilityDecisionNotificationCount } from "../lib/db";
import AccountRoleSelector from "./AccountRoleSelector";
import badgeStyles from "./CapabilityNavigationBadge.module.css";
import CapabilityWorkspaceSwitcher from "./CapabilityWorkspaceSwitcher";

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
  { href: "/dashboard/capabilities", label: "Capabilities", icon: ShieldCheck },
  { href: "/events", label: "Explore Events", icon: Compass },
];

export default async function DashboardShell({ active, mode = "organizer", activeWorkspaceGrantId, children }: { active: string; mode?: "organizer" | "participant"; activeWorkspaceGrantId?: number; children: React.ReactNode }) {
  const user = await currentUser();
  const profilePath = accountProfilePath();
  if (!user) redirect("/login");
  if (user.role === "mcd") redirect("/mcd");
  if (user.role === "csr") redirect("/csr");
  const capabilityCatalogEnabled = isCapabilityCatalogEnabled();
  const unreadDecisionNotifications = capabilityCatalogEnabled && isCapabilityDecisionNotificationsEnabled() ? await getUnreadCapabilityDecisionNotificationCount(user.id) : 0;
	  const [activeCapabilityWorkspaces, savedDefaultExpiryAlert, expiringAuthorityGrants] = await Promise.all([capabilityCatalogEnabled && isCapabilityWorkspaceSwitcherEnabled() ? getActiveCapabilityWorkspaces(user.id) : Promise.resolve([]), isWorkspaceDefaultExpiryAlertsEnabled() ? getSavedWorkspaceDefaultExpiryAlert(user.id) : Promise.resolve(undefined), isStage10GrantReminderAutomationEnabled() ? getExpiringAuthorityGrantAlerts(user.id) : Promise.resolve([])]);
  const navItems = [...(mode === "participant" ? participantNavItems : organizerNavItems).filter(item => capabilityCatalogEnabled || item.href !== "/dashboard/capabilities"), ...(activeCapabilityWorkspaces.length ? [{ href: "/dashboard/workspaces", label: "Workspaces", icon: Blocks }] : [])];
  return (
    <div className="dashboard">
      <header className="dash-top">
        <Link href="/" className="brand"><span className="brand-mark">N</span><span>nexriva</span></Link>
        <nav className="dash-nav" aria-label={`${mode === "participant" ? "Participant" : "Organizer"} navigation`}>
          {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={active === label ? "active" : ""}><Icon size={15} /> {label}{href === "/dashboard/capabilities" && unreadDecisionNotifications ? <span className={badgeStyles.badge} aria-label={`${unreadDecisionNotifications} unread capability decisions`}>{unreadDecisionNotifications}</span> : null}</Link>)}
        </nav>
        <details className="profile-menu">
          <summary aria-label="Open account menu"><span className="avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.name)}</span><span className="account-label">Account</span><ChevronDown size={14} /></summary>
          <div className="profile-pop">
            <p>{user.name || "Nexriva member"}</p>
            <Link href={profilePath}>View and edit profile</Link>
            {user.role === "admin" ? <Link href="/admin">Administrator Console</Link> : null}
            <AccountRoleSelector activeMode={mode} />
	            {mode === "participant" ? <><p>Attending Events</p><Link href="/dashboard/my-bookings"><TicketCheck size={14} /> My Bookings</Link><Link href="/dashboard/history"><ClipboardPlus size={14} /> My event history</Link><Link href="/dashboard/following"><Heart size={14} /> Following</Link>{capabilityCatalogEnabled ? <Link href="/dashboard/capabilities"><ShieldCheck size={14} /> Capabilities{unreadDecisionNotifications ? <span className={badgeStyles.badge} aria-label={`${unreadDecisionNotifications} unread capability decisions`}>{unreadDecisionNotifications}</span> : null}</Link> : null}{activeCapabilityWorkspaces.length ? <Link href="/dashboard/workspaces"><Blocks size={14} /> Approved workspaces</Link> : null}<Link href="/events"><Compass size={14} /> Explore events</Link></> : <><p>Organizing Events</p><Link href="/dashboard/manage-events/events">Manage Events</Link><Link href="/dashboard/reports">Reports</Link><Link href="/dashboard/promotions">Promotions</Link>{capabilityCatalogEnabled ? <><p>Account capabilities</p><Link href="/dashboard/capabilities"><ShieldCheck size={14} /> Capability applications{unreadDecisionNotifications ? <span className={badgeStyles.badge} aria-label={`${unreadDecisionNotifications} unread capability decisions`}>{unreadDecisionNotifications}</span> : null}</Link>{activeCapabilityWorkspaces.length ? <Link href="/dashboard/workspaces"><Blocks size={14} /> Approved workspaces</Link> : null}</> : null}<p>Attending Events</p><Link href="/dashboard/my-bookings"><TicketCheck size={14} /> My Bookings</Link><Link href="/dashboard/history"><ClipboardPlus size={14} /> My event history</Link><Link href="/dashboard/following">Following</Link></>}
            {activeCapabilityWorkspaces.length ? <CapabilityWorkspaceSwitcher workspaces={activeCapabilityWorkspaces} activeGrantId={activeWorkspaceGrantId} /> : null}
            <form action={logoutAction}><button type="submit"><LogOut size={14} /> Logout</button></form>
          </div>
        </details>
      </header>
	      <main id="main-content" className="dash-main">{savedDefaultExpiryAlert ? <div className="notice" role="status"><b>Your saved {savedDefaultExpiryAlert.capabilityName} workspace permission expires in {savedDefaultExpiryAlert.daysRemaining} day{savedDefaultExpiryAlert.daysRemaining === 1 ? "" : "s"}.</b> Your sign-in destination will fall back safely after {new Date(savedDefaultExpiryAlert.endsAt).toLocaleDateString("en-IN")}. <Link href={savedDefaultExpiryAlert.actionUrl}>Review workspace</Link></div> : null}{expiringAuthorityGrants.map(alert => <div className="notice" role="status" key={alert.grantId}><b>{alert.capabilityName} approval expires in {alert.daysRemaining} day{alert.daysRemaining === 1 ? "" : "s"}.</b> Request renewal before {new Date(alert.endsAt).toLocaleDateString("en-IN")}; this reminder does not extend permission. <Link href="/dashboard/capabilities">Review grant</Link></div>)}{children}</main>
    </div>
  );
}
