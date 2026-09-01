"use client";

import { Building2 } from "lucide-react";
import { useState } from "react";
import { adminCreateCsrAccountAction } from "../actions";
import { INDIAN_STATES, CITIES_BY_STATE } from "../lib/location-data";

export default function AdminCsrProvisioner() {
  const [state, setState] = useState("");
  const cities = state ? CITIES_BY_STATE[state as keyof typeof CITIES_BY_STATE] || [] : [];

  return (
    <section className="panel" aria-labelledby="csr-provision-title">
      <div className="section-head">
        <div>
          <span className="eyebrow"><Building2 size={13} /> Corporate social responsibility</span>
          <h3 id="csr-provision-title">Create CSR sponsor account</h3>
          <p>A CSR sponsor is a funding role, not an event-organiser role. Master administrators create each company account with a linked company profile and an audited MASTER confirmation.</p>
        </div>
      </div>
      <form action={adminCreateCsrAccountAction} className="venue-editor">
        <h4>Identity</h4>
        <div className="two-col">
          <label className="form-label">Account contact name *
            <input className="input" name="name" required minLength={2} placeholder="e.g. CSR programme lead" />
          </label>
          <label className="form-label">Account email *
            <input className="input" name="email" type="email" required placeholder="csr.account@company.example" />
          </label>
        </div>

        <h4>Company Details</h4>
        <div className="two-col">
          <label className="form-label">Company legal name *
            <input className="input" name="companyName" required minLength={2} placeholder="e.g. Example Foundation" />
          </label>
          <label className="form-label">Company registration number
            <input className="input" name="registrationNumber" placeholder="Optional registration reference" />
          </label>
        </div>
        <div className="two-col">
          <label className="form-label">Foundation or CSR brand
            <input className="input" name="foundationName" placeholder="Optional programme or foundation name" />
          </label>
          <label className="form-label">Designation
            <input className="input" name="designation" placeholder="e.g. CSR Head" maxLength={100} />
          </label>
        </div>
        <label className="form-label">Department
          <input className="input" name="department" placeholder="e.g. CSR &amp; Sustainability" maxLength={100} />
        </label>

        <h4>CSR Contact</h4>
        <div className="two-col">
          <label className="form-label">CSR profile contact *
            <input className="input" name="contactName" required minLength={2} placeholder="Named accountable contact" />
          </label>
          <label className="form-label">CSR profile email *
            <input className="input" name="contactEmail" type="email" required placeholder="csr.team@company.example" />
          </label>
        </div>
        <div className="two-col">
          <label className="form-label">Phone
            <input className="input" name="contactPhone" placeholder="Optional contact number" />
          </label>
          <label className="form-label">CSR focus areas
            <input className="input" name="focusAreas" placeholder="e.g. Education, Health, Environment" />
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
            <input className="input" name="zone" placeholder="e.g. South Region" maxLength={80} />
          </label>
          <label className="form-label">Ward
            <input className="input" name="ward" placeholder="e.g. Ward 7" maxLength={80} />
          </label>
        </div>

        <h4>Additional Details</h4>
        <label className="form-label">Area of Work
          <input className="input" name="areaOfWork" placeholder="e.g. Rural education, skill development" maxLength={200} />
        </label>
        <label className="form-label">Notes
          <textarea className="input textarea" name="notes" placeholder="Any additional notes about this CSR account" rows={3} />
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
        <button type="submit" className="btn btn-coral">Create CSR sponsor account</button>
      </form>
    </section>
  );
}
