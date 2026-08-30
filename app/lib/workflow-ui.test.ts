import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("workflow UI feedback contracts", () => {
  it("defines semantic status tones, hover feedback, and a reduced-motion fallback", () => {
    const styles = source("app/globals.css");
    expect(styles).toContain(".status-pill.live");
    expect(styles).toContain(".status-pill.attention");
    expect(styles).toContain(".status-pill.critical");
    expect(styles).toContain("@media (hover:hover)");
    expect(styles).toContain("@media (prefers-reduced-motion:reduce)");
  });

  it("uses pending form status and accessible route loading feedback", () => {
    expect(source("app/components/WorkflowSubmitButton.tsx")).toContain("useFormStatus");
    expect(source("app/components/WorkflowSubmitButton.tsx")).toContain("disabled={pending}");
    expect(source("app/loading.tsx")).toContain('aria-busy="true"');
    expect(source("app/components/AdminMasterControl.tsx")).toContain("WorkflowSubmitButton");
  });
});
