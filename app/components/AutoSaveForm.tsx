"use client";

import { useRef, useState } from "react";

export default function AutoSaveForm({ eventId, step, action, children }: { eventId: number; step: number; action: (formData: FormData) => void | Promise<void>; children: React.ReactNode }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"saved" | "saving" | "error" | "idle">("idle"); const [error, setError] = useState("");
  const queueSave = (form: HTMLFormElement) => {
    if (timer.current) clearTimeout(timer.current);
    setStatus("saving");
    timer.current = setTimeout(async () => {
      const fields = Object.fromEntries(new FormData(form).entries());
      try {
        const response = await fetch("/api/drafts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId, step, fields }) });
        if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error || "Draft autosave failed"); }
        setError(""); setStatus("saved");
      } catch (error) { setError(error instanceof Error ? error.message : "Draft auto-save failed"); setStatus("error"); }
    }, 900);
  };
  return <form action={action} encType="multipart/form-data" onInput={event => queueSave(event.currentTarget)}>{children}<span role="status" aria-live="polite" className={`autosave ${status}`}>{status === "saving" ? "Saving draft…" : status === "saved" ? "Draft auto-saved" : status === "error" ? error : "Draft auto-save enabled"}</span></form>;
}
