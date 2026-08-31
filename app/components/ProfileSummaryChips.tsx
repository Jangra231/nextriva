"use client";

import { Pencil, Tag, CalendarClock, Sparkles } from "lucide-react";

type Props = {
  interestLabels: (string | undefined)[];
  formatLabels: (string | undefined)[];
  freqLabel: string | null;
};

export default function ProfileSummaryChips({ interestLabels, formatLabels, freqLabel }: Props) {
  const validInterests = interestLabels.filter(Boolean) as string[];
  const validFormats = formatLabels.filter(Boolean) as string[];

  function scrollToSection(sectionId: string) {
    const section = document.querySelector(`[data-edit-section="${sectionId}"]`);
    if (!section) return;
    const btn = section.querySelector<HTMLButtonElement>(".pv-section-head");
    const body = section.querySelector<HTMLDivElement>(".pv-section-body");
    if (btn && body?.getAttribute("aria-hidden") === "true") {
      btn.click();
    }
    section.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (!validInterests.length && !validFormats.length && !freqLabel) return null;

  return (
    <div className="pv-interactive-summary">
      <div className="pv-pref-divider" aria-hidden="true" />

      {validInterests.length ? (
        <div className="pv-pref-card">
          <button type="button" className="pv-pref-card-head" onClick={() => scrollToSection("interests")}>
            <span className="pv-pref-card-icon"><Tag size={13} aria-hidden="true" /></span>
            <b>Interests</b>
            <Pencil size={10} className="pv-pref-edit-icon" aria-hidden="true" />
          </button>
          <div className="pv-pref-tags">
            {validInterests.map(l => (
              <button key={l} type="button" className="pv-pref-chip" onClick={() => scrollToSection("interests")}>
                {l}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {(validFormats.length || freqLabel) ? (
        <div className="pv-pref-card">
          <button type="button" className="pv-pref-card-head" onClick={() => scrollToSection("interests")}>
            <span className="pv-pref-card-icon"><CalendarClock size={13} aria-hidden="true" /></span>
            <b>Attendance</b>
            <Pencil size={10} className="pv-pref-edit-icon" aria-hidden="true" />
          </button>
          <div className="pv-pref-tags">
            {validFormats.map(l => (
              <button key={l} type="button" className="pv-pref-chip" onClick={() => scrollToSection("interests")}>
                {l}
              </button>
            ))}
            {freqLabel ? (
              <button key="freq" type="button" className="pv-pref-chip pv-pref-chip-accent" onClick={() => scrollToSection("interests")}>
                <Sparkles size={10} aria-hidden="true" /> {freqLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
