"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { resetPasswordAction } from "../actions";

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setLoading(true); setError("");
    const fd = new FormData(); fd.set("token", token); fd.set("email", email);
    fd.set("password", password); fd.set("confirmPassword", confirm);
    const res = await resetPasswordAction(fd);
    setLoading(false);
    if ("error" in res) { setError(res.error || ""); return; }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <main className="auth-wrap">
      <aside className="auth-aside">
        <Link href="/" className="brand"><span className="brand-mark">N</span><span>nexriva</span></Link>
        <div><span className="eyebrow">New password</span><h1>Set a fresh <em>password.</em></h1><p>Choose a new password for your Nexriva account.</p></div>
        <p className="auth-note">Use at least 8 characters.</p>
      </aside>
      <section className="auth-panel">
        <div className="auth-box">
          <h2>Reset password</h2>
          <p>{done ? "Password updated! Redirecting to login…" : "Enter your new password."}</p>
          {error ? <div className="error-note" role="alert" aria-live="assertive">{error}</div> : null}
          {done ? <div className="success-note">Your password has been updated.</div> : (
            <div className="form-stack">
              <label className="form-label">Email<input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
              <label className="form-label">New password<input className="input" type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
              <label className="form-label">Confirm password<input className="input" type="password" minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" /></label>
              <button className="btn btn-coral" type="button" onClick={handleSubmit} disabled={loading}>{loading ? <LoaderCircle className="spin" size={15} /> : null}Reset password <ArrowRight size={16} /></button>
            </div>
          )}
          <p className="fine-print" style={{ textAlign: "center" }}><Link href="/login">Back to login</Link></p>
        </div>
      </section>
    </main>
  );
}