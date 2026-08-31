"use client";

import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { changePasswordAction } from "../../actions";

export default function ChangePassword() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const updated = searchParams.get("updated");

  return (
    <div className="dash-main">
      <div className="dash-page-head">
        <div><h1 style={{ margin: 0 }}>Change password</h1><p>Update the password for your account.</p></div>
      </div>
      {updated ? <div className="success-note" style={{ marginBottom: 16 }}>Your password has been updated.</div> : null}
      {errorParam ? <div className="error-note" style={{ marginBottom: 16 }}>{errorParam.replace(/\+/g, " ")}</div> : null}
      <div className="panel" style={{ maxWidth: 520 }}>
        <form action={changePasswordAction} className="form-stack">
          <label className="form-label">Current password<input className="input" type="password" name="currentPassword" required autoComplete="current-password" /></label>
          <label className="form-label">New password<input className="input" type="password" name="newPassword" minLength={8} required autoComplete="new-password" placeholder="At least 8 characters" /></label>
          <label className="form-label">Confirm new password<input className="input" type="password" name="confirmPassword" minLength={8} required autoComplete="new-password" /></label>
          <button className="btn btn-coral" type="submit">Update password <ArrowRight size={16} /></button>
        </form>
      </div>
    </div>
  );
}