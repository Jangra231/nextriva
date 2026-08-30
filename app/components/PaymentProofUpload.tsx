"use client";

import { ImageUp } from "lucide-react";
import { useState } from "react";

export default function PaymentProofUpload({ orderNumber }: { orderNumber: string }) {
  const [proofUrl, setProofUrl] = useState("");
  const [status, setStatus] = useState("Upload a clear screenshot or photo of your successful transfer.");
  const [uploading, setUploading] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 5 * 1024 * 1024) { setStatus("Use a JPEG, PNG, or WebP image up to 5MB."); return; }
    setUploading(true); setStatus("Uploading payment proof…");
    const payload = new FormData(); payload.set("file", file); payload.set("orderNumber", orderNumber);
    try {
      const response = await fetch("/api/payment-proofs", { method: "POST", body: payload }); const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");
      setProofUrl(result.url); setStatus("Payment proof uploaded. You can now submit it for organizer review.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Upload failed. Please try again."); }
    finally { setUploading(false); }
  }

  return <div className="payment-proof-upload"><input type="hidden" name="paymentProofUrl" value={proofUrl} /><label className="upload-control"><ImageUp size={16} aria-hidden="true" /><span>{uploading ? "Uploading…" : proofUrl ? "Replace proof image" : "Upload payment proof"}</span><input className="upload-file-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a payment proof image" onChange={event => upload(event.target.files?.[0])} disabled={uploading} /></label><p role="status" aria-live="polite" className={proofUrl ? "success-note" : "field-note"}>{status}</p></div>;
}
