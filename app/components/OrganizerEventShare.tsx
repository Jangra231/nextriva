"use client";

import { Check, Copy, Facebook, Linkedin, MessageCircle, QrCode, Share2, Twitter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildOrganizerShareTargets } from "../lib/organizer-share";
import styles from "./OrganizerEventShare.module.css";

type ShareLinkProps = { href: string; label: string; children: React.ReactNode };
function ShareLink({ href, label, children }: ShareLinkProps) {
  return <a href={href} target="_blank" rel="noreferrer" aria-label={label}>{children}</a>;
}

export default function OrganizerEventShare({ eventName, slug, origin: initialOrigin = "", registrationQrAvailable = false }: { eventName: string; slug: string; origin?: string; registrationQrAvailable?: boolean }) {
  const [clientOrigin, setClientOrigin] = useState("");
  const [copied, setCopied] = useState("");
  useEffect(() => { if (!initialOrigin) setClientOrigin(window.location.origin); }, [initialOrigin]);
  const origin = initialOrigin || clientOrigin;
  const targets = useMemo(() => origin ? buildOrganizerShareTargets(origin, slug, eventName) : null, [eventName, origin, slug]);
  const copy = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(""), 1800); }
    catch { window.prompt(`Copy ${label.toLowerCase()}`, value); }
  };
  const nativeShare = async (url: string, title: string) => {
    if (navigator.share) { try { await navigator.share({ title, text: `Discover ${eventName} on Fitizen.`, url }); } catch { /* Share sheet dismissed. */ } }
    else await copy(url, "Link");
  };

  return <details className={styles.root}>
    <summary aria-label={`Share ${eventName}`}><Share2 size={14} aria-hidden="true" /> Share</summary>
    <div className={styles.popup}>
      <div><span className={styles.label}>Public event page</span><div className={styles.actions}>{targets ? <><button type="button" onClick={() => nativeShare(targets.eventUrl, eventName)} aria-label="Share event"><Share2 size={14} aria-hidden="true" /></button><ShareLink href={targets.eventPlatforms.whatsapp} label="Share event on WhatsApp"><MessageCircle size={14} aria-hidden="true" /></ShareLink><ShareLink href={targets.eventPlatforms.facebook} label="Share event on Facebook"><Facebook size={14} aria-hidden="true" /></ShareLink><ShareLink href={targets.eventPlatforms.x} label="Share event on X"><Twitter size={14} aria-hidden="true" /></ShareLink><ShareLink href={targets.eventPlatforms.linkedin} label="Share event on LinkedIn"><Linkedin size={14} aria-hidden="true" /></ShareLink><button type="button" onClick={() => copy(targets.eventUrl, "Event link")} aria-label="Copy event link">{copied === "Event link" ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}</button></> : null}</div></div>
      {registrationQrAvailable ? <div><span className={styles.label}><QrCode size={12} aria-hidden="true" /> Registration QR</span><div className={styles.actions}>{targets ? <><button type="button" onClick={() => nativeShare(targets.registrationUrl, `Register for ${eventName}`)} aria-label="Share registration QR link"><Share2 size={14} aria-hidden="true" /></button><ShareLink href={targets.registrationPlatforms.whatsapp} label="Share registration QR link on WhatsApp"><MessageCircle size={14} aria-hidden="true" /></ShareLink><ShareLink href={targets.registrationPlatforms.facebook} label="Share registration QR link on Facebook"><Facebook size={14} aria-hidden="true" /></ShareLink><ShareLink href={targets.registrationPlatforms.x} label="Share registration QR link on X"><Twitter size={14} aria-hidden="true" /></ShareLink><ShareLink href={targets.registrationPlatforms.linkedin} label="Share registration QR link on LinkedIn"><Linkedin size={14} aria-hidden="true" /></ShareLink><button type="button" onClick={() => copy(targets.registrationUrl, "Registration link")} aria-label="Copy QR registration link">{copied === "Registration link" ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}</button></> : null}</div></div> : <p>Registration QR sharing unlocks after administrator approval.</p>}
      <p aria-live="polite">{copied ? `${copied} copied.` : "Share the event page or registration QR link."}</p>
    </div>
  </details>;
}
