"use client";

import { ImagePlus, LoaderCircle, Trash2, UserRound } from "lucide-react";
import { useState } from "react";

export default function ProfileAvatarUpload({ initialUrl, name }: { initialUrl?: string | null; name: string | null }) {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl || "");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setMessage("Choose a JPEG, PNG, or WebP image up to 3MB.");
      return;
    }
    setUploading(true); setMessage("Uploading avatar…");
    const payload = new FormData(); payload.set("file", file);
    try {
      const response = await fetch("/api/profile-avatar", { method: "POST", body: payload });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Avatar upload failed.");
      setAvatarUrl(result.url); setMessage("Avatar uploaded. Save profile changes to apply it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Avatar upload failed.");
    } finally { setUploading(false); }
  }

  return <div className="avatar-upload"><input type="hidden" name="avatarUrl" value={avatarUrl} /><div className="avatar-preview">{avatarUrl ? <img src={avatarUrl} alt="Avatar preview" /> : <UserRound size={27} aria-hidden="true" />}</div><div className="avatar-upload-copy"><b>Profile photo</b><span>JPEG, PNG, or WebP · max 3MB</span><div className="avatar-upload-actions"><label className="avatar-file-picker">{uploading ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : <ImagePlus size={15} aria-hidden="true" />}<span>{uploading ? "Uploading" : "Choose photo"}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => upload(event.target.files?.[0])} disabled={uploading} /></label>{avatarUrl ? <button className="text-button" type="button" onClick={() => { setAvatarUrl(""); setMessage("Avatar removed. Save profile changes to apply it."); }}><Trash2 size={14} aria-hidden="true" /> Remove</button> : null}</div>{message ? <p className="upload-message" role="status">{message}</p> : null}</div></div>;
}
