"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { requestLoginOtp, verifyLoginOtp } from "../actions";

export default function OtpLoginForm({ returnTo = "" }: { returnTo?: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("+91");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOtp() {
    setLoading(true); setError("");
    const fd = new FormData(); fd.set("phone", phone);
    const res = await requestLoginOtp(fd);
    setLoading(false);
    if ("error" in res) { setError(res.error || ""); return; }
    setOtpSent(true);
  }

  async function handleVerifyOtp() {
    setLoading(true); setError("");
    const fd = new FormData(); fd.set("phone", phone); fd.set("code", code); fd.set("returnTo", returnTo);
    const res = await verifyLoginOtp(fd);
    setLoading(false);
    if ("error" in res) { setError(res.error || ""); return; }
    router.push(res.redirect || "/dashboard/manage-events/events");
  }

  return (
    <div className="otp-login-form">
      {error ? <div className="error-note" role="alert" aria-live="assertive" style={{ marginBottom: 14 }}>{error}</div> : null}
      <div className="form-stack">
        <label className="form-label">Phone number
          <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" disabled={otpSent} />
        </label>
        {otpSent ? (
          <label className="form-label">Enter OTP
            <input className="input" type="text" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="6-digit code" autoFocus />
          </label>
        ) : null}
        <button className="btn btn-coral" type="button" onClick={otpSent ? handleVerifyOtp : handleSendOtp} disabled={loading}>
          {loading ? <LoaderCircle className="spin" size={15} /> : null}
          {otpSent ? "Verify OTP" : "Send OTP"} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}