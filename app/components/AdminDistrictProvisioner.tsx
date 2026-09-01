"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { adminCreateDistrictAccountAction } from "../actions";
import { INDIAN_STATES, CITIES_BY_STATE } from "../lib/location-data";

export default function AdminDistrictProvisioner() {
  const [state, setState] = useState("");
  const cities = state ? CITIES_BY_STATE[state as keyof typeof CITIES_BY_STATE] || [] : [];

  return (
    <section className="panel" aria-labelledby="district-provision-title">
      <div className="section-head">
        <div>
          <span className="eyebrow"><MapPin size={13} /> District administration</span>
          <h3 id="district-provision-title">Create District Authority account</h3>
          <p>District Authority accounts receive read-only platform access scoped to their role. They cannot change events, users, payments, or the venue directory — those remain master-administrator-only. Creation requires MASTER and is recorded in the audit log.</p>
        </div>
      </div>
      <form action={adminCreateDistrictAccountAction} className="venue-editor">
        <h4>Identity</h4>
        <div className="two-col">
          <label className="form-label">Authority contact name *
            <input className="input" name="name" required minLength={2} placeholder="e.g. District Public Health Desk" />
          </label>
          <label className="form-label">Official email *
            <input className="input" name="email" type="email" required placeholder="district.authority@example.gov.in" />
          </label>
        </div>

        <h4>Organization</h4>
        <div className="two-col">
          <label className="form-label">Designation
            <input className="input" name="designation" placeholder="e.g. District Health Officer" maxLength={100} />
          </label>
          <label className="form-label">Department
            <input className="input" name="department" placeholder="e.g. District Health Department" maxLength={100} />
          </label>
        </div>

        <h4>Geographic Scope</h4>
        <div className="two-col">
          <label className="form-label">State
            <select className="input" name="state" value={state} onChange={e => setState(e.target.value)}>
              <option value="">Select state</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="form-label">City
            <select className="input" name="city" disabled={!state}>
              <option value="">{state ? "Select city" : "Select state first"}</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <div className="two-col">
          <label className="form-label">Zone
            <input className="input" name="zone" placeholder="e.g. East District" maxLength={80} />
          </label>
          <label className="form-label">Ward
            <input className="input" name="ward" placeholder="e.g. Ward 3" maxLength={80} />
          </label>
        </div>

        <h4>Additional Details</h4>
        <label className="form-label">Area of Work
          <input className="input" name="areaOfWork" placeholder="e.g. Community health outreach" maxLength={200} />
        </label>
        <label className="form-label">Notes
          <textarea className="input textarea" name="notes" placeholder="Any additional notes about this authority account" rows={3} />
        </label>

        <h4>Security</h4>
        <div className="two-col">
          <label className="form-label">Initial password *
            <input className="input" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <label className="form-label">Confirmation *
            <input className="input" name="confirmation" required placeholder="Type MASTER" />
          </label>
        </div>
        <button type="submit" className="btn btn-coral">Create District Authority account</button>
      </form>
    </section>
  );
}