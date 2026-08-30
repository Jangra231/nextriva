import Link from "next/link";
import { Landmark, LockKeyhole } from "lucide-react";
import { localAuthorityLoginAction } from "../../actions";

export default async function LocalAuthorityLogin({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const { error, returnTo } = await searchParams;
  const destination = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/local-authority";
  return <main className="auth-wrap"><aside className="auth-aside"><Link href="/" className="brand"><span className="brand-mark">F</span><span>fitizen</span></Link><div><span className="eyebrow"><Landmark size={14} /> Public-health authority</span><h1>Monitor city activity with accountable oversight.</h1><p>This workspace is restricted to Local Authority accounts created by a Fitizen master administrator.</p></div></aside><section className="auth-panel"><div className="auth-box"><h2>Local Authority login</h2><p>Use the Local Authority account issued by the administrator.</p>{error ? <div className="error-note" role="alert">{error}</div> : null}<form action={localAuthorityLoginAction} className="form-stack"><input type="hidden" name="returnTo" value={destination} /><label className="form-label">Official email<input className="input" name="email" type="email" required autoComplete="email" /></label><label className="form-label">Password<input className="input" name="password" type="password" required autoComplete="current-password" /></label><button className="btn btn-coral" type="submit"><LockKeyhole size={16} /> Enter Local Authority workspace</button></form><p className="fine-print"><Link href="/login">Return to standard sign in</Link></p></div></section></main>;
}
