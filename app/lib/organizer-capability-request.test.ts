import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("organizer capability-request entry point", () => {
  it("no longer exposes a self-service capability request block on the events page", () => {
    const page = source("app/dashboard/manage-events/events/page.tsx");

    expect(page).not.toContain("Request CSR, Local Authority, or other capabilities");
    expect(page).not.toContain('href="/dashboard/capabilities?q=CSR"');
    expect(page).not.toContain('href="/dashboard/capabilities?q=Local%20Authority"');
    expect(page).toContain("CalendarPlus");
  });
});
