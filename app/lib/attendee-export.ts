export const attendeeExportColumns = [
  { key: "attendee", label: "Attendee" },
  { key: "participationRole", label: "Participation Role" },
  { key: "userId", label: "User ID" },
  { key: "eventId", label: "Event ID" },
  { key: "email", label: "Email" },
  { key: "ticket", label: "Ticket" },
  { key: "bookingNumber", label: "Booking Number" },
  { key: "attendanceStatus", label: "Attendance Status" },
  { key: "paymentStatus", label: "Payment Status" },
  { key: "paidAmount", label: "Paid Amount (INR)" },
  { key: "registeredAt", label: "Registered At" },
] as const;

export type AttendeeExportColumn = (typeof attendeeExportColumns)[number]["key"];
export type AttendeeExportRow = {
  registration: { orderNumber: string; status: string; paymentStatus: string; paidAmountPaise: number; createdAt: Date };
  attendee: { name: string | null; publicId: string; email: string | null };
  ticket: { name: string } | null;
  isOrganizer: boolean;
  eventPublicId: string;
};

const exportColumnKeys = new Set<AttendeeExportColumn>(attendeeExportColumns.map(column => column.key));
const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function resolveAttendeeExportColumns(requested: string[]) {
  const selected = requested.filter((value): value is AttendeeExportColumn => exportColumnKeys.has(value as AttendeeExportColumn));
  return selected.length ? selected : attendeeExportColumns.map(column => column.key);
}

function valueFor(column: AttendeeExportColumn, row: AttendeeExportRow) {
  const { registration, attendee, ticket } = row;
  if (column === "attendee") return attendee.name || "Event attendee";
  if (column === "participationRole") return row.isOrganizer ? "Organizer (auto-participant)" : "Participant";
  if (column === "userId") return attendee.publicId;
  if (column === "eventId") return row.eventPublicId;
  if (column === "email") return attendee.email || "";
  if (column === "ticket") return ticket?.name || "Registration";
  if (column === "bookingNumber") return registration.orderNumber;
  if (column === "attendanceStatus") return registration.status;
  if (column === "paymentStatus") return registration.paymentStatus;
  if (column === "paidAmount") return (registration.paidAmountPaise / 100).toFixed(2);
  return new Date(registration.createdAt).toISOString();
}

export function createAttendeeCsv(rows: AttendeeExportRow[], columns: AttendeeExportColumn[]) {
  const labels = columns.map(column => attendeeExportColumns.find(item => item.key === column)?.label || column);
  return [labels, ...rows.map(row => columns.map(column => valueFor(column, row)))].map(row => row.map(cell).join(",")).join("\n");
}
