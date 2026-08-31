"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateExtendedProfileAction } from "../actions";
import ProfileAvatarUpload from "./ProfileAvatarUpload";
import { INDIAN_STATES, CITIES_BY_STATE, GENDER_OPTIONS, INTERESTS, EVENT_FORMATS, EVENT_FREQUENCIES } from "../lib/location-data";

const STEPS = ["welcome", "about", "location", "preferences"] as const;
type Step = (typeof STEPS)[number];

const STEP_META: Record<Step, { title: string; description: string }> = {
  welcome: { title: "Welcome to nexriva", description: "Let's set up your profile so we can personalize your experience." },
  about: { title: "Tell us about you", description: "A few basics to help us recommend the right events." },
  location: { title: "Where are you based?", description: "We'll find events and communities near you." },
  preferences: { title: "What do you enjoy?", description: "Pick your interests and how you like to attend events." },
};

function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
  setter(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
}

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const stepIndex = STEPS.indexOf(step);

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [selInterests, setSelInterests] = useState<Set<string>>(new Set());
  const [formats, setFormats] = useState<Set<string>>(new Set());
  const [frequency, setFrequency] = useState("monthly");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifSms, setNotifSms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cities = state ? CITIES_BY_STATE[state as keyof typeof CITIES_BY_STATE] || [] : [];
  const canNext = step === "welcome" ? name.trim().length >= 2 : true;

  function goNext() { const i = STEPS.indexOf(step); if (i < STEPS.length - 1) setStep(STEPS[i + 1]); }
  function goBack() { const i = STEPS.indexOf(step); if (i > 0) setStep(STEPS[i - 1]); }

  async function handleSubmit() {
    if (name.trim().length < 2) { setError("Please enter your name."); setStep("welcome"); return; }
    setLoading(true); setError("");
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("avatarUrl", avatarUrl);
    fd.set("gender", gender);
    fd.set("dateOfBirth", dateOfBirth);
    fd.set("state", state);
    fd.set("city", city);
    fd.set("interests", Array.from(selInterests).join(","));
    fd.set("eventFormat", Array.from(formats).join(","));
    fd.set("eventFrequency", frequency);
    fd.set("notifEmail", String(notifEmail));
    fd.set("notifPush", String(notifPush));
    fd.set("notifSms", String(notifSms));
    try {
      await updateExtendedProfileAction(fd);
    } catch {
      router.push("/");
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-top">
        <span className="onboarding-brand"><span className="brand-mark">N</span> nexriva</span>
        <h1>Set up your profile</h1>
        <p>This takes less than a minute. You can always change these later.</p>
      </div>
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {STEPS.map((s, i) => (
            <div key={s} className={`wizard-step-dot ${i === stepIndex ? "active" : ""} ${i < stepIndex ? "done" : ""}`} />
          ))}
        </div>
        {error ? <div className="error-note" role="alert" aria-live="assertive">{error}</div> : null}

        {step === "welcome" && (
          <div className="onboarding-step">
            <div className="onboarding-step-header">
              <Sparkles size={22} className="onboarding-sparkle" aria-hidden="true" />
              <h2>{STEP_META.welcome.title}</h2>
              <p>{STEP_META.welcome.description}</p>
            </div>
            <div className="onboarding-step-body">
              <ProfileAvatarUpload initialUrl={avatarUrl || null} name={name || null} onAvatarChange={setAvatarUrl} />
              <label className="form-label" htmlFor="ob-name">
                What should we call you?
                <input id="ob-name" className="input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" minLength={2} maxLength={100} autoFocus required />
              </label>
            </div>
          </div>
        )}

        {step === "about" && (
          <div className="onboarding-step">
            <div className="onboarding-step-header">
              <h2>{STEP_META.about.title}</h2>
              <p>{STEP_META.about.description}</p>
            </div>
            <div className="onboarding-step-body">
              <label className="form-label" htmlFor="ob-gender">Gender
                <select id="ob-gender" className="input" value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="">Prefer not to say</option>
                  {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </label>
              <label className="form-label" htmlFor="ob-dob">Date of birth
                <input id="ob-dob" className="input" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
              </label>
            </div>
          </div>
        )}

        {step === "location" && (
          <div className="onboarding-step">
            <div className="onboarding-step-header">
              <h2>{STEP_META.location.title}</h2>
              <p>{STEP_META.location.description}</p>
            </div>
            <div className="onboarding-step-body">
              <label className="form-label" htmlFor="ob-state">State
                <select id="ob-state" className="input" value={state} onChange={e => { setState(e.target.value); setCity(""); }}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="form-label" htmlFor="ob-city">City
                <select id="ob-city" className="input" value={city} onChange={e => setCity(e.target.value)}>
                  <option value="">{state ? "Select city" : "Select a state first"}</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
          </div>
        )}

        {step === "preferences" && (
          <div className="onboarding-step">
            <div className="onboarding-step-header">
              <h2>{STEP_META.preferences.title}</h2>
              <p>{STEP_META.preferences.description}</p>
            </div>
            <div className="onboarding-step-body">
              <div className="onboarding-section">
                <b>Interests</b>
                <div className="interest-chip-grid">
                  {INTERESTS.map(i => (
                    <button key={i.id} type="button" className={`interest-chip ${selInterests.has(i.id) ? "selected" : ""}`} onClick={() => toggle(setSelInterests, i.id)}>
                      <span className="interest-chip-emoji">{i.emoji}</span> {i.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="onboarding-section">
                <b>Event formats you prefer</b>
                <div className="format-card-grid">
                  {EVENT_FORMATS.map(f => (
                    <button key={f.id} type="button" className={`format-card ${formats.has(f.id) ? "selected" : ""}`} onClick={() => toggle(setFormats, f.id)}>
                      <span>{f.emoji}</span> {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="onboarding-section">
                <b>How often do you attend events?</b>
                <div className="freq-row">
                  {EVENT_FREQUENCIES.map(f => (
                    <button key={f.id} type="button" className={`freq-chip ${frequency === f.id ? "selected" : ""}`} onClick={() => setFrequency(f.id)}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="onboarding-section">
                <b>Notifications</b>
                <div className="notif-toggle-list">
                  <label className="notif-toggle-row"><span>Email notifications</span><input type="checkbox" checked={notifEmail} onChange={e => setNotifEmail(e.target.checked)} /></label>
                  <label className="notif-toggle-row"><span>Push notifications</span><input type="checkbox" checked={notifPush} onChange={e => setNotifPush(e.target.checked)} /></label>
                  <label className="notif-toggle-row"><span>SMS notifications</span><input type="checkbox" checked={notifSms} onChange={e => setNotifSms(e.target.checked)} /></label>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="onboarding-actions">
          {stepIndex > 0 ? (
            <button type="button" className="btn btn-ghost" onClick={goBack} disabled={loading}>
              <ArrowLeft size={15} /> Back
            </button>
          ) : <div />}
          {stepIndex < STEPS.length - 1 ? (
            <button type="button" className="btn btn-coral" onClick={goNext} disabled={!canNext || loading}>
              Continue <ArrowRight size={15} />
            </button>
          ) : (
            <button type="button" className="btn btn-coral" onClick={handleSubmit} disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Complete setup
            </button>
          )}
        </div>
        {stepIndex > 0 && stepIndex < STEPS.length - 1 ? (
          <button type="button" className="onboarding-skip" onClick={goNext} disabled={loading}>Skip for now</button>
        ) : null}
      </div>
    </div>
  );
}