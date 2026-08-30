export const money = (paise: number) => `₹${(Math.max(0, paise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function taxInvoiceFilename(invoiceNumber: string) {
  return `${invoiceNumber.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-tax-invoice.pdf`;
}

export function issuerNotice(issuerTaxRegistrationNumber: string | null) {
  return issuerTaxRegistrationNumber ? null : "Issuer tax registration details have not been configured. Review this invoice before statutory filing.";
}
