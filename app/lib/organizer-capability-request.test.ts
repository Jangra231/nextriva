import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("organizer capability-request entry point", () => {
  it("makes CSR, Local Authority, and the complete approved catalog reachable from My Events", () => {
    const page = source("app/dashboard/manage-events/events/page.tsx");

    expect(page).toContain("Request CSR, Local Authority, or other capabilities");
    expect(page).toContain('href="/dashboard/capabilities?q=CSR"');
    expect(page).toContain('href="/dashboard/capabilities?q=Local%20Authority"');
    expect(page).toContain('href="/dashboard/capabilities"');
  });
});
