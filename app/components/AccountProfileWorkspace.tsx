import { BadgeCheck, Mail, UserRound } from "lucide-react";
import DashboardShell from "./DashboardShell";
import { updateProfileAction } from "../actions";
import { currentUser } from "../lib/auth";
import { getUserAccountContext } from "../lib/db";
import ProfileAvatarUpload from "./ProfileAvatarUpload";

export default async function AccountProfileWorkspace({ searchParams }: { searchParams: Promise<{ updated?: string; error?: string }> }) {
  const user = await currentUser();
  if (!user) return null;
  const accountContext = await getUserAccountContext(user.id);
  const { updated, error } = await searchParams;
  const profile = accountContext?.profile;
  const profileTerminology = profile?.profileTerminology || "User Profile";
  const accountType = profile?.accountType || "USER";
  return <DashboardShell active=""><div className="dash-page-head"><div><span className="eyebrow">{profileTerminology}</span><h1 className="page-title" style={{ marginTop: 11 }}>View and edit profile</h1><p>Manage the identity shown on your events and registrations. Your permanent platform ID and existing access remain stable.</p></div></div>{updated ? <p className="notice">Your profile has been updated.</p> : null}{error ? <p className="error-note">{error.replaceAll("+", " ")}</p> : null}<div className="profile-grid" data-account-type={accountType}><section className="panel profile-identity"><span className="eyebrow">{profileTerminology}</span><div className="profile-icon profile-avatar-large">{user.avatarUrl ? <img src={user.avatarUrl} alt={`${user.name || "Member"} avatar`} /> : <UserRound size={24} aria-hidden="true" />}</div><h2>{user.name || "Fitizen member"}</h2><p><Mail size={15} aria-hidden="true" /> {user.email || "No email address"}</p><div className="identifier-card"><span>Permanent user ID</span><b>{user.publicId}</b><small>This permanent identifier connects your account to existing events, favorites, and registrations.</small></div><p className="profile-meta"><BadgeCheck size={15} aria-hidden="true" /> {accountType === "PLATFORM_ADMIN" ? "Platform administrator account" : "Standard user account"}</p><p className="profile-meta"><BadgeCheck size={15} aria-hidden="true" /> Account created {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p></section><section className="panel"><span className="eyebrow">Profile details</span><h2>Public display name</h2><p>Use a recognizable name for your organizer and participant views. Capability grants are introduced in a later stage and do not change this profile.</p><form action={updateProfileAction} className="profile-form"><ProfileAvatarUpload initialUrl={user.avatarUrl} name={user.name} /><label className="form-label" htmlFor="profile-name">Full name<input id="profile-name" className="input" name="name" defaultValue={user.name || ""} minLength={2} maxLength={100} required /></label><label className="form-label" htmlFor="profile-email">Email address<input id="profile-email" className="input" value={user.email || ""} disabled readOnly /><small>Email is used for sign-in and cannot be changed here.</small></label><button type="submit" className="btn btn-coral">Save profile changes</button></form></section></div></DashboardShell>;
}
