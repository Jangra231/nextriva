"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp, Heart, KeyRound, LoaderCircle, MapPin, Bell, Save, User, Shirt } from "lucide-react";
import { updateExtendedProfileAction } from "../actions";
import ProfileAvatarUpload from "./ProfileAvatarUpload";
import { INDIAN_STATES, CITIES_BY_STATE, GENDER_OPTIONS, INTERESTS, EVENT_FORMATS, EVENT_FREQUENCIES } from "../lib/location-data";

type User = {
  name: string | null; email: string | null; phone: string | null; avatarUrl: string | null;
  gender: string | null; dateOfBirth: string | null; state: string | null; city: string | null;
  interests: string[] | null; eventFormat: string[] | null; eventFrequency: string | null;
  notificationPrefs: { email: boolean; push: boolean; sms: boolean } | null;
};

type Section = "identity" | "about" | "location" | "interests" | "notifications";

const SECTIONS: { id: Section; title: string; icon: React.ElementType }[] = [
  { id: "identity", title: "Identity", icon: User },
  { id: "about", title: "About You", icon: Shirt },
  { id: "location", title: "Location", icon: MapPin },
  { id: "interests", title: "Interests & Preferences", icon: Heart },
  { id: "notifications", title: "Notifications", icon: Bell },
];

function buildSummary(
  id: Section,
  { name, gender, dateOfBirth, state, city, selInterests, formats, frequency, notifEmail, notifPush, notifSms }: {
    name: string; gender: string; dateOfBirth: string; state: string; city: string;
    selInterests: Set<string>; formats: Set<string>; frequency: string;
    notifEmail: boolean; notifPush: boolean; notifSms: boolean;
  }
): string {
  switch (id) {
    case "identity": return name || "Not set";
    case "about": return [gender || "Prefer not to say", dateOfBirth || "No DOB"].join(" · ");
    case "location": return [city, state].filter(Boolean).join(", ") || "Not set";
    case "interests": {
      const parts: string[] = [];
      if (selInterests.size) parts.push(`${selInterests.size} interest${selInterests.size === 1 ? "" : "s"}`);
      if (formats.size) parts.push(`${formats.size} format${formats.size === 1 ? "" : "s"}`);
      parts.push(frequency.charAt(0).toUpperCase() + frequency.slice(1));
      return parts.join(" · ");
    }
    case "notifications": {
      const active = [notifEmail && "Email", notifPush && "Push", notifSms && "SMS"].filter(Boolean);
      return active.length ? active.join(", ") : "All off";
    }
  }
}

export default function ProfileEditForm({ user }: { user: User }) {
  const [name, setName] = useState(user.name || "");
  const [gender, setGender] = useState(user.gender || "");
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth || "");
  const [state, setState] = useState(user.state || "");
  const [city, setCity] = useState(user.city || "");
  const [selInterests, setSelInterests] = useState<Set<string>>(new Set(user.interests || []));
  const [formats, setFormats] = useState<Set<string>>(new Set(user.eventFormat || []));
  const [frequency, setFrequency] = useState(user.eventFrequency || "monthly");
  const [notifEmail, setNotifEmail] = useState(user.notificationPrefs?.email ?? true);
  const [notifPush, setNotifPush] = useState(user.notificationPrefs?.push ?? true);
  const [notifSms, setNotifSms] = useState(user.notificationPrefs?.sms ?? false);
  const [loading, setLoading] = useState(false);
  const [openSections, setOpenSections] = useState<Set<Section>>(() => new Set(["identity"]));
  const cities = state ? CITIES_BY_STATE[state as keyof typeof CITIES_BY_STATE] || [] : [];

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleSection(id: Section) {
    setOpenSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const summaryState = { name, gender, dateOfBirth, state, city, selInterests, formats, frequency, notifEmail, notifPush, notifSms };

  return (
    <form action={updateExtendedProfileAction} className="profile-edit-form" onSubmit={() => setLoading(true)}>
      <span className="eyebrow">Profile details</span>
      <h2>Edit your profile</h2>
      <p>Update your personal details, interests, and notification preferences.</p>

      <input type="hidden" name="interests" value={Array.from(selInterests).join(",")} />
      <input type="hidden" name="eventFormat" value={Array.from(formats).join(",")} />
      <input type="hidden" name="eventFrequency" value={frequency} />
      <input type="hidden" name="notifEmail" value={String(notifEmail)} />
      <input type="hidden" name="notifPush" value={String(notifPush)} />
      <input type="hidden" name="notifSms" value={String(notifSms)} />

      <div className="pv-accordion">
        {SECTIONS.map(sec => {
          const open = openSections.has(sec.id);
          const summaryText = buildSummary(sec.id, summaryState);
          const Icon = sec.icon;
          return (
            <div key={sec.id} className={`pv-section ${open ? "open" : ""}`} data-edit-section={sec.id}>
              <button type="button" className="pv-section-head" onClick={() => toggleSection(sec.id)}>
                <span className="pv-section-title"><Icon size={16} aria-hidden="true" /> {sec.title}</span>
                <span className="pv-section-right">
                  {!open && summaryText ? <span className="pv-section-summary">{summaryText}</span> : null}
                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>
              <div className="pv-section-body" aria-hidden={!open}>
                {sec.id === "identity" && <>
                  <ProfileAvatarUpload initialUrl={user.avatarUrl} name={user.name} />
                  <label className="form-label" htmlFor="ext-name">Full name
                    <input id="ext-name" className="input" name="name" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={100} required />
                  </label>
                </>}
                {sec.id === "about" && <div className="profile-form-row">
                  <label className="form-label" htmlFor="ext-gender">Gender
                    <select id="ext-gender" className="input" name="gender" value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="">Prefer not to say</option>
                      {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </label>
                  <label className="form-label" htmlFor="ext-dob">Date of birth
                    <input id="ext-dob" className="input" name="dateOfBirth" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
                  </label>
                </div>}
                {sec.id === "location" && <div className="profile-form-row">
                  <label className="form-label" htmlFor="ext-state">State
                    <select id="ext-state" className="input" name="state" value={state} onChange={e => { setState(e.target.value); setCity(""); }}>
                      <option value="">Select state</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="form-label" htmlFor="ext-city">City
                    <select id="ext-city" className="input" name="city" value={city} onChange={e => setCity(e.target.value)}>
                      <option value="">{state ? "Select city" : "Select a state first"}</option>
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                </div>}
                {sec.id === "interests" && <>
                  <div className="profile-section-block">
                    <b style={{ fontSize: 13 }}>Interests</b>
                    <div className="interest-grid">
                      {INTERESTS.map(i => (
                        <button key={i.id} type="button" className={`interest-chip ${selInterests.has(i.id) ? "selected" : ""}`} onClick={() => toggle(setSelInterests, i.id)}>
                          <span>{i.emoji}</span> {i.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="profile-section-block">
                    <b style={{ fontSize: 13 }}>Event formats</b>
                    <div className="format-row">
                      {EVENT_FORMATS.map(f => (
                        <button key={f.id} type="button" className={`format-card ${formats.has(f.id) ? "selected" : ""}`} onClick={() => toggle(setFormats, f.id)}>
                          <span>{f.emoji}</span> {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="profile-section-block">
                    <b style={{ fontSize: 13 }}>Preferred event frequency</b>
                    <div className="freq-row">
                      {EVENT_FREQUENCIES.map(f => (
                        <button key={f.id} type="button" className={`freq-chip ${frequency === f.id ? "selected" : ""}`} onClick={() => setFrequency(f.id)}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>}
                {sec.id === "notifications" && <div className="profile-section-block">
                  <div className="notif-toggle-list">
                    <label className="notif-toggle-row"><span>Email notifications</span><input type="checkbox" checked={notifEmail} onChange={e => setNotifEmail(e.target.checked)} /></label>
                    <label className="notif-toggle-row"><span>Push notifications</span><input type="checkbox" checked={notifPush} onChange={e => setNotifPush(e.target.checked)} /></label>
                    <label className="notif-toggle-row"><span>SMS notifications</span><input type="checkbox" checked={notifSms} onChange={e => setNotifSms(e.target.checked)} /></label>
                  </div>
                </div>}
              </div>
            </div>
          );
        })}
      </div>

      <button type="submit" className="btn btn-coral" disabled={loading}>
        {loading ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />} Save profile
      </button>

      <Link href="/dashboard/change-password" className="profile-change-password-btn">
        <KeyRound size={14} aria-hidden="true" /> Change password
      </Link>
    </form>
  );
}
