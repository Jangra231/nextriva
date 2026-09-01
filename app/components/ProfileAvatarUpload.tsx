"use client";

import { ImagePlus, LoaderCircle, Palette, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { generateInitialsAvatar } from "../lib/avatar";

/** Predefined emoji avatar options as SVG data URIs */
const PRESET_AVATARS: { id: string; label: string; emoji: string; bg: string }[] = [
  { id: "runner", label: "Runner", emoji: "\u{1F3C3}", bg: "#2f6b4f" },
  { id: "cyclist", label: "Cyclist", emoji: "\u{1F6B4}", bg: "#1f5f5b" },
  { id: "yogi", label: "Yogi", emoji: "\u{1F9D8}", bg: "#5b3fa0" },
  { id: "foodie", label: "Foodie", emoji: "\u{1F37D}\u{FE0F}", bg: "#7a4a2b" },
  { id: "musician", label: "Musician", emoji: "\u{1F3B5}", bg: "#a63a5f" },
  { id: "hiker", label: "Hiker", emoji: "\u{1F97E}", bg: "#1f3c4f" },
  { id: "artist", label: "Artist", emoji: "\u{1F3A8}", bg: "#3a4a63" },
  { id: "star", label: "Star", emoji: "\u{2B50}", bg: "#bf3d2b" },
  { id: "earth", label: "Earth", emoji: "\u{1F30D}", bg: "#1f5f5b" },
  { id: "fire", label: "Fire", emoji: "\u{1F525}", bg: "#bf3d2b" },
  { id: "leaf", label: "Leaf", emoji: "\u{1F33F}", bg: "#2f6b4f" },
  { id: "rocket", label: "Rocket", emoji: "\u{1F680}", bg: "#3a4a63" },
];

function buildEmojiAvatar(emoji: string, bg: string): string {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">`,
    `<rect width="256" height="256" fill="${bg}" rx="32"/>`,
    `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="120">${emoji}</text>`,
    `</svg>`,
  ].join("");
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function ProfileAvatarUpload({ initialUrl, name, onAvatarChange }: { initialUrl?: string | null; name: string | null; onAvatarChange?: (url: string) => void }) {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl || "");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const placeholder = useMemo(() => generateInitialsAvatar(name), [name]);

  async function upload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setMessage("Choose a JPEG, PNG, or WebP image up to 3MB.");
      return;
    }
    setUploading(true); setMessage("Uploading avatar\u2026");
    const payload = new FormData(); payload.set("file", file);
    try {
      const response = await fetch("/api/profile-avatar", { method: "POST", body: payload });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Avatar upload failed.");
      setAvatarUrl(result.url); setMessage("Avatar uploaded. Save profile changes to apply it."); onAvatarChange?.(result.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Avatar upload failed.");
    } finally { setUploading(false); }
  }

  function selectPreset(emoji: string, bg: string) {
    const url = buildEmojiAvatar(emoji, bg);
    setAvatarUrl(url); setMessage("Avatar selected. Save profile changes to apply it."); onAvatarChange?.(url);
  }

  return (
    <div className="avatar-upload">
      <input type="hidden" name="avatarUrl" value={avatarUrl} />
      <div className="avatar-preview">
        {avatarUrl ? <img src={avatarUrl} alt="Avatar preview" /> : <img src={placeholder} alt="Generated avatar preview" />}
      </div>
      <div className="avatar-upload-copy">
        <b>Profile photo</b>
        <span>Upload a photo, pick an avatar, or keep your generated monogram.</span>
        <div className="avatar-upload-actions">
          <label className="avatar-file-picker">
            {uploading ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : <ImagePlus size={15} aria-hidden="true" />}
            <span>{uploading ? "Uploading" : "Choose photo"}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => upload(event.target.files?.[0])} disabled={uploading} />
          </label>
          <button className="avatar-file-picker" type="button" onClick={() => setShowPresets(p => !p)}>
            <Palette size={15} aria-hidden="true" /> <span>{showPresets ? "Hide avatars" : "Pick avatar"}</span>
          </button>
          {avatarUrl ? (
            <button className="text-button" type="button" onClick={() => { setAvatarUrl(""); setMessage("Avatar removed. Save profile changes to apply it."); onAvatarChange?.(""); }}>
              <Trash2 size={14} aria-hidden="true" /> Remove
            </button>
          ) : null}
        </div>
        {showPresets ? (
          <div className="avatar-preset-grid">
            {PRESET_AVATARS.map(a => (
              <button key={a.id} type="button" className={`avatar-preset ${avatarUrl === buildEmojiAvatar(a.emoji, a.bg) ? "selected" : ""}`} onClick={() => selectPreset(a.emoji, a.bg)} title={a.label}>
                <img src={buildEmojiAvatar(a.emoji, a.bg)} alt={a.label} />
              </button>
            ))}
          </div>
        ) : null}
        {message ? <p className="upload-message" role="status">{message}</p> : null}
      </div>
    </div>
  );
}
