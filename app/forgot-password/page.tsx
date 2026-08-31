"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { forgotPasswordAction } from "../actions";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setLoading(true); setError("");
    const fd = new FormData(); fd.set("email", email);
    const res = await forgotPasswordAction(fd);
    setLoading(false);
    if ("error" in res) { setError(res.error || ""); return; }
    setSent(true);
  }

  return (
    <main className="auth-wrap">
      <aside className="auth-aside">
        <Link href="/" className="brand"><span className="brand-mark">N</span><span>nexriva</span></Link>
        <div><span className="eyebrow">Password help</span><h1>Back into <em>your events.</em></h1><p>Enter your account email and we'll send you a secure link to reset your password.</p></div>
        <p className="auth-note">The reset link expires in 1 hour.</p>
      </aside>
      <section className="auth-panel">
        <div className="auth-box">
          <h2>Forgot password</h2>
          <p>{sent ? "Check your inbox. If an account exists for that email, a reset link has been sent." : "Enter your account email."}</p>
          {error ? <div className="error-note" role="alert" aria-live="assertive">{error}</div> : null}
          {sent ? <div className="success-note">A reset link has been sent if the email is registered.</div> : (
            <div className="form-stack">
              <label className="form-label">Email<input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
              <button className="btn btn-coral" type="button" onClick={handleSubmit} disabled={loading}>{loading ? <LoaderCircle className="spin" size={15} /> : null}Send reset link <ArrowRight size={16} /></button>
            </div>
          )}
          <p className="fine-print" style={{ textAlign: "center" }}><Link href="/login">Back to login</Link></p>
        </div>
      </section>
    </main>
  );
}