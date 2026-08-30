import ExcelJS from "exceljs";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "../../../lib/auth";
import { isAdministrator } from "../../../lib/admin";
import { getAdminWorkspaceData } from "../../../lib/db";
import { adminReportFilename, adminSummaryRows } from "../../../lib/admin-report";

export const runtime = "nodejs";

const money = (value: number) => (value / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const date = (value: Date | null) => value ? new Date(value).toLocaleString("en-IN") : "—";

function addSheet(workbook: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width: number }[], rows: Record<string, unknown>[]) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF153F33" } };
  rows.forEach(row => sheet.addRow(row));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + columns.length)}1` };
}

async function createXlsx(data: Awaited<ReturnType<typeof getAdminWorkspaceData>>) {
  const workbook = new ExcelJS.Workbook(); workbook.creator = "Fitizen"; workbook.created = new Date();
  addSheet(workbook, "Summary", [{ header: "Metric", key: "label", width: 34 }, { header: "Value", key: "value", width: 24 }], adminSummaryRows(data.metrics));
  addSheet(workbook, "Events", [{ header: "Event", key: "event", width: 30 }, { header: "Event ID", key: "eventId", width: 24 }, { header: "Organizer", key: "organizer", width: 28 }, { header: "Lifecycle", key: "status", width: 14 }, { header: "Moderation", key: "moderation", width: 20 }, { header: "Platform fee %", key: "platformFee", width: 16 }, { header: "City", key: "city", width: 20 }, { header: "Updated", key: "updated", width: 24 }], data.events.map(({ event, organizer }) => ({ event: event.displayName, eventId: event.publicId, organizer: organizer.name || organizer.email || "—", status: event.status, moderation: event.moderationStatus, platformFee: event.platformFeePercent, city: event.city || "—", updated: date(event.updatedAt) })));
  addSheet(workbook, "Participations", [{ header: "Booking reference", key: "booking", width: 20 }, { header: "Participant", key: "participant", width: 28 }, { header: "User ID", key: "userId", width: 24 }, { header: "Event", key: "event", width: 30 }, { header: "Event ID", key: "eventId", width: 24 }, { header: "Status", key: "status", width: 16 }, { header: "Payment", key: "payment", width: 16 }, { header: "Amount INR", key: "amount", width: 16 }, { header: "Platform fee INR", key: "platformFee", width: 18 }], data.registrations.map(({ registration, attendee, event }) => ({ booking: registration.orderNumber, participant: attendee.name || attendee.email || "—", userId: attendee.publicId, event: event.displayName, eventId: event.publicId, status: registration.status, payment: registration.paymentStatus, amount: money(registration.paidAmountPaise), platformFee: money(registration.platformFeePaise) })));
  addSheet(workbook, "Audit log", [{ header: "When", key: "when", width: 24 }, { header: "Administrator", key: "admin", width: 28 }, { header: "Action", key: "action", width: 30 }, { header: "Entity", key: "entity", width: 20 }, { header: "ID", key: "id", width: 12 }], data.audits.map(({ audit, admin }) => ({ when: date(audit.createdAt), admin: admin.name || admin.email || `User #${admin.id}`, action: audit.action, entity: audit.entityType, id: audit.entityId })));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function createPdf(data: Awaited<ReturnType<typeof getAdminWorkspaceData>>) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 44 }); const chunks: Buffer[] = [];
    doc.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    doc.fillColor("#153f33").fontSize(22).text("Fitizen Administrator Report"); doc.fillColor("#687b72").fontSize(10).text(`Generated ${new Date().toLocaleString("en-IN")}`); doc.moveDown();
    adminSummaryRows(data.metrics).forEach(row => { doc.fillColor("#153f33").fontSize(11).text(`${row.label}: `, { continued: true }).fillColor("#333333").text(String(row.value)); });
    doc.moveDown().fillColor("#153f33").fontSize(15).text("Event performance");
    data.events.slice(0, 24).forEach(({ event }) => { const rows = data.registrations.filter(row => row.registration.eventId === event.id); const revenue = rows.reduce((sum, row) => sum + row.registration.paidAmountPaise, 0); const fees = rows.reduce((sum, row) => sum + row.registration.platformFeePaise, 0); doc.fillColor("#333333").fontSize(10).text(`${event.displayName} (${event.publicId}) — ${event.moderationStatus} — ${rows.length} participations — INR ${money(revenue)} — fees INR ${money(fees)}`); });
    doc.moveDown().fillColor("#153f33").fontSize(15).text("Recent audit activity");
    data.audits.slice(0, 16).forEach(({ audit, admin }) => doc.fillColor("#333333").fontSize(9).text(`${date(audit.createdAt)} · ${admin.name || admin.email || "Administrator"} · ${audit.action} · ${audit.entityType} #${audit.entityId}`));
    doc.end();
  });
}

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!isAdministrator(user)) return new NextResponse("Administrator access required", { status: 403 });
  const format = request.nextUrl.searchParams.get("format"); const data = await getAdminWorkspaceData();
  if (format === "xlsx") { const body = new Uint8Array(await createXlsx(data)); return new NextResponse(body, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${adminReportFilename("xlsx")}"`, "Cache-Control": "no-store" } }); }
  if (format === "pdf") { const body = new Uint8Array(await createPdf(data)); return new NextResponse(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${adminReportFilename("pdf")}"`, "Cache-Control": "no-store" } }); }
  return new NextResponse("Choose xlsx or pdf format", { status: 400 });
}
