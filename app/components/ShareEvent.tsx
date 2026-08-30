"use client";

import { Check, Copy, Facebook, Linkedin, MessageCircle, Share2, Twitter } from "lucide-react";
import { useState } from "react";
import { buildShareUrls } from "../lib/share";

export default function ShareEvent({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const currentUrl = () => url || window.location.href;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this event link", currentUrl());
    }
  };
  const nativeShare = async () => {
    if (navigator.share) await navigator.share({ title, url: currentUrl() });
    else await copyLink();
  };
  const links = buildShareUrls(url, title);
  return <section className="share-event" aria-labelledby="share-event-title">
    <div><span className="share-label">Help spread the word</span><h2 id="share-event-title">Share this event</h2></div>
    <div className="share-actions">
      <button type="button" className="share-button native-share" onClick={nativeShare}><Share2 size={16} aria-hidden="true" /> Share</button>
      <a className="share-button whatsapp" href={links.whatsapp} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp"><MessageCircle size={16} aria-hidden="true" /> WhatsApp</a>
      <a className="share-icon facebook" href={links.facebook} target="_blank" rel="noreferrer" aria-label="Share on Facebook"><Facebook size={17} aria-hidden="true" /></a>
      <a className="share-icon x" href={links.x} target="_blank" rel="noreferrer" aria-label="Share on X"><Twitter size={17} aria-hidden="true" /></a>
      <a className="share-icon linkedin" href={links.linkedin} target="_blank" rel="noreferrer" aria-label="Share on LinkedIn"><Linkedin size={17} aria-hidden="true" /></a>
      <button type="button" className="share-icon" onClick={copyLink} aria-label={copied ? "Event link copied" : "Copy event link"}>{copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}</button>
    </div>
    <p className="share-status" aria-live="polite">{copied ? "Event link copied to your clipboard." : "Invite your community with one link."}</p>
  </section>;
}
