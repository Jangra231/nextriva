import Link from "next/link";
import { CalendarPlus, ChevronDown, Compass, Heart, LogIn, LogOut, Menu, TicketCheck } from "lucide-react";
import { logoutAction } from "../actions";
import { currentUser, initials } from "../lib/auth";
import { accountProfilePath } from "../lib/admin";
import AccountRoleSelector from "./AccountRoleSelector";

export default async function SiteNav() {
  const user = await currentUser();
  const profilePath = accountProfilePath();
  const primaryAction = user?.role === "mcd" ? { href: "/local-authority", label: "Local Authority", ariaLabel: "Open Local Authority public health console", icon: false } : user?.role === "csr" ? { href: "/csr", label: "CSR Dashboard", ariaLabel: "Open CSR sponsor dashboard", icon: false } : { href: "/dashboard/manage-events/create-event/new", label: "Create Event", ariaLabel: "Create a new event", icon: true };
  const accountControl = user ? <details className="profile-menu site-account-menu"><summary className="btn btn-outline btn-small" aria-label="Open account menu"><span className="avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.name)}</span><ChevronDown size={14} /></summary><div className="profile-pop"><p>{user.name || "Nexriva member"}</p>{user.role === "mcd" ? <><Link href="/local-authority">Local Authority Console</Link><form action={logoutAction}><button type="submit"><LogOut size={14} /> Logout</button></form></> : user.role === "csr" ? <><Link href="/csr">CSR Sponsorship Dashboard</Link><form action={logoutAction}><button type="submit"><LogOut size={14} /> Logout</button></form></> : <><Link href={profilePath}>View and edit profile</Link>{user.role === "admin" ? <Link href="/admin">Administrator Console</Link> : null}<AccountRoleSelector activeMode="participant" /><p>Participant tools</p><Link href="/dashboard/my-bookings"><TicketCheck size={14} /> My bookings</Link><Link href="/dashboard/following"><Heart size={14} /> Following</Link><Link href="/events"><Compass size={15} /> Explore events</Link><form action={logoutAction}><button type="submit"><LogOut size={14} /> Logout</button></form></>}</div></details> : <Link className="btn btn-outline btn-small" aria-label="Login or sign up" href="/login"><LogIn size={15} /> Login | Signup</Link>;
  return (
    <header className="site-header">
      <nav className="shell nav" aria-label="Primary navigation">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Link href="/" className="brand" aria-label="Nexriva home">
          <span className="brand-mark">N</span><span>nexriva</span>
        </Link>
        <div className="nav-links">
          <Link href="/events"><Compass size={15} /> Events</Link>
          <Link href="/worldwide-events">Worldwide</Link>
          <Link href="/about">About</Link>
        </div>
        <div className="nav-actions">
          {accountControl}
          <Link className="btn btn-coral btn-small" href={primaryAction.href} aria-label={primaryAction.ariaLabel}>{primaryAction.icon ? <CalendarPlus size={15} /> : null} {primaryAction.label}</Link>
        </div>
        <details className="nav-mobile-menu">
          <summary className="nav-mobile-trigger" aria-label="Open navigation menu"><Menu size={18} aria-hidden="true" /><span aria-hidden="true">Menu</span></summary>
          <div className="nav-mobile-panel">
            <div className="nav-mobile-links">
              <Link href="/events"><Compass size={15} /> Events</Link>
              <Link href="/worldwide-events">Worldwide</Link>
              <Link href="/about">About</Link>
            </div>
            <div className="nav-mobile-account">{accountControl}</div>
            <Link className="btn btn-coral nav-mobile-primary" href={primaryAction.href} aria-label={primaryAction.ariaLabel}>{primaryAction.icon ? <CalendarPlus size={15} /> : null} {primaryAction.label}</Link>
          </div>
        </details>
      </nav>
    </header>
  );
}
