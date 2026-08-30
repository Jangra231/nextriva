import { describe, expect, it } from "vitest";
import { issuerNotice, taxInvoiceFilename } from "./tax-invoice";

describe("tax invoice helpers", () => {
  it("creates a safe download filename and never pretends missing tax registration data is available", () => {
    expect(taxInvoiceFilename("NXR-00001234")).toBe("nxr-00001234-tax-invoice.pdf");
    expect(issuerNotice(null)).toContain("not been configured");
    expect(issuerNotice("29ABCDE1234F1Z5")).toBeNull();
  });
});
