"use client";

import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export default function WorkflowSubmitButton({ children, pendingLabel = "Saving…", className = "" }: { children: ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={`workflow-submit ${className}`.trim()} disabled={pending} aria-disabled={pending} aria-live="polite">{pending ? <><LoaderCircle className="workflow-submit-spinner" size={15} aria-hidden="true" /> {pendingLabel}</> : children}</button>;
}
