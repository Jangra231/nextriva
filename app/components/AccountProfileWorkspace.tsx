import { BadgeCheck, CalendarDays, Mail, MapPin, Phone, Shirt, Sparkles, Tag } from "lucide-react";
import DashboardShell from "./DashboardShell";
import { currentUser } from "../lib/auth";
import { getUserAccountContext } from "../lib/db";
import { generateInitialsAvatar } from "../lib/avatar";
import { INTERESTS, EVENT_FORMATS, EVENT_FREQUENCIES } from "../lib/location-data";
import OnboardingWizard from "./OnboardingWizard";
import ProfileEditForm from "./ProfileEditForm";
import ProfileSummaryChips from "./ProfileSummaryChips";

export default async function AccountProfileWorkspace({ searchParams }: { searchParams: Promise<{ updated?: string; error?: string }> }) {
  const user = await currentUser();
  if (!user) return null;

  /* New users who haven't completed onboarding see the wizard */
  if (!user.profileCompleted) {
    return <OnboardingWizard />;
  }

  const accountContext = await getUserAccountContext(user.id);
  const { updated, error } = await searchParams;
  const profile = accountContext?.profile;
  const profileTerminology = profile?.profileTerminology || "User Profile";
  const accountType = profile?.accountType || "USER";

  const avatarSrc = user.avatarUrl || generateInitialsAvatar(user.name);
  const joinedDate = new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  /* Summary badges derived from saved profile data */
  const interestLabels = (user.interests || []).map(id => INTERESTS.find(i => i.id === id)?.label).filter(Boolean);
  const formatLabels = (user.eventFormat || []).map(id => EVENT_FORMATS.find(f => f.id === id)?.label).filter(Boolean);
  const freqLabel = EVENT_FREQUENCIES.find(f => f.id === user.eventFrequency)?.label || null;
  const location = [user.city, user.state].filter(Boolean).join(", ") || null;

  return (
    <DashboardShell active="">
      <div className="dash-page-head">
        <div>
          <span className="eyebrow">{profileTerminology}</span>
          <h1 className="page-title" style={{ marginTop: 11 }}>Your profile</h1>
          <p>View and manage your public identity, preferences, and notification settings.</p>
        </div>
      </div>

      {updated ? <p className="notice">Your profile has been updated.</p> : null}
      {error ? <p className="error-note">{error.replaceAll("+", " ")}</p> : null}

      <div className="profile-view-grid">
        {/* Left: Identity card */}
        <section className="panel profile-view-identity">
          <div className="pv-banner" aria-hidden="true" />
          <div className="pv-avatar">
            <img src={avatarSrc} alt={`${user.name || "Member"} avatar`} />
          </div>
          <h2>{user.name || "nexriva member"}</h2>
          <p className="pv-role">{accountType === "PLATFORM_ADMIN" ? "Platform administrator" : "Standard user"}</p>

          <div className="pv-contact">
            {user.email ? <p><Mail size={14} aria-hidden="true" /> {user.email}</p> : null}
            {user.phone ? <p><Phone size={14} aria-hidden="true" /> {user.phone}</p> : null}
          </div>

          <div className="pv-badges">
            {location ? <span className="pv-badge"><MapPin size={13} /> {location}</span> : null}
            {user.gender ? <span className="pv-badge"><Shirt size={13} /> {GENDER_LABEL(user.gender)}</span> : null}
            {interestLabels.length ? <span className="pv-badge"><Tag size={13} /> {interestLabels.length} interest{interestLabels.length === 1 ? "" : "s"}</span> : null}
            {freqLabel ? <span className="pv-badge"><Sparkles size={13} /> {freqLabel}</span> : null}
          </div>

          <div className="identifier-card">
            <span>Permanent user ID</span>
            <b>{user.publicId}</b>
            <small>This identifier connects your account across events, bookings, and registrations.</small>
          </div>

          <p className="profile-meta"><BadgeCheck size={14} aria-hidden="true" /> Joined {joinedDate}</p>
          <p className="profile-meta"><CalendarDays size={14} aria-hidden="true" /> Member since {new Date(user.createdAt).getFullYear()}</p>

          <ProfileSummaryChips interestLabels={interestLabels} formatLabels={formatLabels} freqLabel={freqLabel} />
        </section>

        {/* Right: Editable profile details */}
        <section className="panel profile-view-edit">
          <ProfileEditForm user={{
            name: user.name,
            email: user.email,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            gender: user.gender ?? null,
            dateOfBirth: user.dateOfBirth ?? null,
            state: user.state ?? null,
            city: user.city ?? null,
            interests: user.interests ?? null,
            eventFormat: user.eventFormat ?? null,
            eventFrequency: user.eventFrequency ?? null,
            notificationPrefs: user.notificationPrefs ?? null,
          }} />
        </section>
      </div>
    </DashboardShell>
  );
}

function GENDER_LABEL(value: string): string {
  const label = value.charAt(0).toUpperCase() + value.slice(1);
  return label;
}

