import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("buyer checkout breakdown", () => {
  it("shows the charged ticket, tax, buyer platform fee, allocation disclosures, and final payable amount", () => {
    const panel = source("app/components/RegistrationPanel.tsx");
    expect(panel).toContain("Buyer price breakdown");
    expect(panel).toContain("Ticket price");
    expect(panel).toContain("GST");
    expect(panel).toContain("Platform fee");
    expect(panel).toContain("Nexriva service allocation");
    expect(panel).toContain("Gateway fee");
    expect(panel).toContain("Total payable");
  });
});
