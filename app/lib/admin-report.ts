export type AdminReportRow = { label: string; value: string | number };

export function adminSummaryRows(input: { users: number; admins: number; events: number; liveEvents: number; registrations: number; pendingPayments: number; totalRevenue: number; platformFees: number; awaitingApproval: number; changesRequested: number }): AdminReportRow[] {
  return [
    { label: "Total accounts", value: input.users },
    { label: "Administrator accounts", value: input.admins },
    { label: "Events tracked", value: input.events },
    { label: "Live events", value: input.liveEvents },
    { label: "Awaiting administrator approval", value: input.awaitingApproval },
    { label: "Events requiring changes", value: input.changesRequested },
    { label: "Registrations", value: input.registrations },
    { label: "Pending payments", value: input.pendingPayments },
    { label: "Recorded ticket value (INR)", value: input.totalRevenue / 100 },
    { label: "Recorded platform fees (INR)", value: input.platformFees / 100 },
  ];
}

export function adminReportFilename(extension: "xlsx" | "pdf") {
  return `fitizen-administrator-report-${new Date().toISOString().slice(0, 10)}.${extension}`;
}
