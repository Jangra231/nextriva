import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("native manual payment visibility", () => {
  it("uses mutually exclusive native method radios and method-specific UPI and bank sections", () => {
    const component = source("app/components/ManualPaymentSettings.tsx");
    const styles = source("app/globals.css");
    expect(component).toContain('name="manualPaymentMethod"');
    expect(component).toContain('id="native-manual-method-upi"');
    expect(component).toContain('id="native-manual-method-bank"');
    expect(component).toContain('id="native-manual-method-both"');
    expect(component).toContain("native-manual-upi");
    expect(component).toContain("native-manual-bank");
    expect(styles).toContain("native-manual-method-upi:checked");
    expect(styles).toContain("native-manual-method-bank:checked");
    expect(styles).toContain("native-manual-method-both:checked");
  });
});
