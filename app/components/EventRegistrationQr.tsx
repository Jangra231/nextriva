"use client";

import { Check, Download, QrCode, Share2 } from "lucide-react";
import { useState } from "react";
import { eventQrFilename, eventQrPosterFilename } from "../lib/event-qr-image";
import styles from "./EventRegistrationQr.module.css";

export default function EventRegistrationQr({ eventName, registrationPath, registrationUrl, banner = false }: { eventName: string; registrationPath: string; registrationUrl: string; banner?: boolean }) {
  const [shareStatus, setShareStatus] = useState("");
  const qrImageUrl = `/api/event-qr?target=${encodeURIComponent(registrationPath)}`;
  const posterUrl = `/api/event-qr-poster?target=${encodeURIComponent(registrationPath)}&name=${encodeURIComponent(eventName)}`;

  const copyRegistrationLink = async (url: string) => {
    try { await navigator.clipboard.writeText(url); }
    catch { const field = document.createElement("textarea"); field.value = url; field.style.position = "fixed"; field.style.opacity = "0"; document.body.appendChild(field); field.select(); document.execCommand("copy"); field.remove(); }
    setShareStatus("Registration link copied."); window.setTimeout(() => setShareStatus(""), 2200);
  };

  const shareRegistration = async () => {
    try { if (navigator.share) { await navigator.share({ title: `Register for ${eventName}`, text: `Register for ${eventName} on Fitizen.`, url: registrationUrl }); setShareStatus("Share sheet opened."); window.setTimeout(() => setShareStatus(""), 2200); } else await copyRegistrationLink(registrationUrl); }
    catch (error) { if ((error as DOMException).name !== "AbortError") await copyRegistrationLink(registrationUrl); }
  };

  return <section className={`event-registration-qr ${styles.root} ${banner ? "banner" : ""}`} aria-label={`Registration QR code for ${eventName}`}><div className={styles.contentRow}><div className={styles.copy}><span className={styles.eyebrow}><QrCode size={14} aria-hidden="true" /> Event registration</span><h3>Scan to register</h3><p>Share this QR with participants to open registration for <b>{eventName}</b>.</p></div><div className={styles.qrVisual}><img src={qrImageUrl} alt={`Registration QR code for ${eventName}`} /></div></div><div className={styles.actions}><a className={`event-qr-action ${styles.imageDownload}`} href={qrImageUrl} download={eventQrFilename(eventName)} title="Download QR code image"><Download size={15} aria-hidden="true" /> <span>Download QR</span></a><a className="event-qr-action" href={posterUrl} download={eventQrPosterFilename(eventName)} title="Download printable QR poster"><Download size={15} aria-hidden="true" /> <span>Download poster</span></a><a className={`event-qr-action ${styles.shareAction}`} href={`https://wa.me/?text=${encodeURIComponent(`Register for ${eventName}: ${registrationUrl}`)}`} target="_blank" rel="noreferrer" title="Share registration link on WhatsApp"><Share2 size={15} aria-hidden="true" /> <span>WhatsApp</span></a><button type="button" className="event-qr-action" onClick={shareRegistration} title="Copy registration link or open native share"><Share2 size={15} aria-hidden="true" /> <span>Copy link</span></button></div>{shareStatus ? <p className="event-qr-status" role="status"><Check size={14} aria-hidden="true" /> {shareStatus}</p> : null}</section>;
}
