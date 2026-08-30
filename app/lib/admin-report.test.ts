import { describe, expect, it } from "vitest";
import { adminReportFilename, adminSummaryRows } from "./admin-report";

describe("administrator reports", () => {
  it("creates a complete platform summary without altering any source data", () => {
    const rows = adminSummaryRows({ users: 4, admins: 1, events: 7, liveEvents: 3, registrations: 12, pendingPayments: 2, totalRevenue: 125000, platformFees: 6250, awaitingApproval: 2, changesRequested: 1 });
    expect(rows).toHaveLength(10);
    expect(rows.find(row => row.label === "Recorded ticket value (INR)"))?.toEqual({ label: "Recorded ticket value (INR)", value: 1250 });
    expect(rows.at(-1)).toEqual({ label: "Recorded platform fees (INR)", value: 62.5 });
  });

  it("uses a report filename with the requested download extension", () => {
    expect(adminReportFilename("xlsx")).toMatch(/^fitizen-administrator-report-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(adminReportFilename("pdf")).toMatch(/\.pdf$/);
  });
});
