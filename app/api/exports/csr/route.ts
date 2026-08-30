import ExcelJS from "exceljs";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "../../../lib/auth";
import { isCsrSponsor } from "../../../lib/admin";
import { authorizeCapabilityExecution, getCsrWorkspaceData, recordCapabilityExecutionAuthorization } from "../../../lib/db";
import { isCsrCapabilityAuthorizationEnforced } from "../../../lib/capability-authorization";

export const runtime = "nodejs";

const money = (value: number) => `₹${(value / 100).toLocaleString("en-IN")}`;
const date = (value: Date | null) => value ? new Date(value).toLocaleString("en-IN") : "—";
const fileName = (extension: "xlsx" | "pdf") => `fitizen-csr-report-${new Date().toISOString().slice(0, 10)}.${extension}`;
const requestStatus = (status: string) => ({ draft: "Draft", submitted: "Awaiting administrator", changes_requested: "Additions requested", approved_pending_assignment: "Approved — matching event", rejected: "Rejected", assigned: "Event assigned", cancelled: "Cancelled" }[status] || status);

function addSheet(workbook: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width: number }[], rows: Record<string, unknown>[]) {
  const sheet = workbook.addWorksheet(name); sheet.columns = columns; sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF153F33" } }; rows.forEach(row => sheet.addRow(row)); sheet.views = [{ state: "frozen", ySplit: 1 }]; sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + columns.length)}1` };
}

async function createXlsx(data: Awaited<ReturnType<typeof getCsrWorkspaceData>>) {
  const workbook = new ExcelJS.Workbook(); workbook.creator = "Fitizen CSR Report"; workbook.created = new Date();
  addSheet(workbook, "Summary", [{ header: "Metric", key: "metric", width: 34 }, { header: "Value", key: "value", width: 30 }], [
    { metric: "CSR company", value: data.profile.companyName }, { metric: "CSR budget", value: money(data.metrics.totalBudget) }, { metric: "Committed after assignment", value: money(data.metrics.committed) }, { metric: "Uncommitted budget", value: money(data.metrics.remaining) }, { metric: "Assigned events", value: data.metrics.fundedEvents }, { metric: "Recorded participation", value: data.metrics.participation }, { metric: "Checked in", value: data.metrics.checkedIn }, { metric: "Awaiting administrator review", value: data.metrics.awaitingReview }, { metric: "Approved briefs awaiting event match", value: data.metrics.awaitingAssignment }, { metric: "Settlement and disbursement data", value: "Not captured in current platform model" }, { metric: "Verified social outcomes", value: "Not captured in current platform model" },
  ]);
  addSheet(workbook, "Budgets", [{ header: "Budget", key: "label", width: 32 }, { header: "Total", key: "total", width: 18 }, { header: "Committed", key: "committed", width: 18 }, { header: "Remaining", key: "remaining", width: 18 }, { header: "Start", key: "start", width: 22 }, { header: "End", key: "end", width: 22 }, { header: "Active", key: "active", width: 12 }], data.budgets.map(budget => ({ label: budget.label, total: money(budget.totalPaise), committed: money(budget.committedPaise), remaining: money(budget.totalPaise - budget.committedPaise), start: date(budget.startsAt), end: date(budget.endsAt), active: budget.active ? "Yes" : "No" })));
  addSheet(workbook, "Sponsorship briefs", [{ header: "Route", key: "route", width: 20 }, { header: "Event type", key: "eventType", width: 24 }, { header: "Audience", key: "audience", width: 28 }, { header: "Location preference", key: "location", width: 28 }, { header: "Funding", key: "amount", width: 18 }, { header: "Budget", key: "budget", width: 24 }, { header: "Status", key: "status", width: 24 }, { header: "Assigned event", key: "event", width: 30 }, { header: "Organiser", key: "organizer", width: 28 }, { header: "Administrator guidance", key: "adminNote", width: 36 }, { header: "Updated", key: "updated", width: 22 }], data.requests.map(({ request, budget, event, organizer }) => ({ route: request.requestKind === "future_event" ? "Future event brief" : "Existing-event interest", eventType: request.eventType, audience: request.intendedAudience, location: [request.cityPreference, request.zonePreference, request.wardPreference].filter(Boolean).join(" · ") || "Open", amount: money(request.amountPaise), budget: budget.label, status: requestStatus(request.status), event: event?.displayName || "Not assigned", organizer: organizer?.name || organizer?.email || "—", adminNote: request.adminReviewNote || "—", updated: date(request.updatedAt) })));
  addSheet(workbook, "Impact by city", [{ header: "City", key: "city", width: 24 }, { header: "Commitments", key: "commitments", width: 18 }, { header: "Assigned events", key: "events", width: 16 }, { header: "Participation", key: "participation", width: 16 }, { header: "Checked in", key: "checkedIn", width: 14 }], data.impactByCity.map(row => ({ city: row.city, commitments: money(row.commitments), events: row.events, participation: row.participations, checkedIn: row.checkedIn })));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function createPdf(data: Awaited<ReturnType<typeof getCsrWorkspaceData>>) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 44 }); const chunks: Buffer[] = []; doc.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    doc.fillColor("#153f33").fontSize(22).text("Fitizen CSR Sponsorship Report"); doc.fillColor("#687b72").fontSize(10).text(`${data.profile.companyName} · Generated ${new Date().toLocaleString("en-IN")}`); doc.moveDown();
    [["CSR budget", money(data.metrics.totalBudget)], ["Committed after matching", money(data.metrics.committed)], ["Uncommitted budget", money(data.metrics.remaining)], ["Assigned events", data.metrics.fundedEvents], ["Recorded participation", data.metrics.participation], ["Checked in", data.metrics.checkedIn]].forEach(([label, value]) => doc.fillColor("#153f33").fontSize(11).text(`${label}: `, { continued: true }).fillColor("#333333").text(String(value)));
    doc.moveDown().fillColor("#153f33").fontSize(15).text("Assigned sponsored events"); const assigned = data.requests.filter(row => row.request.status === "assigned" && row.event); if (assigned.length) assigned.slice(0, 28).forEach(({ request, event, organizer }) => doc.fillColor("#333333").fontSize(9).text(`${event!.displayName} — ${money(request.amountPaise)} · Organizer: ${organizer?.name || organizer?.email || "recorded organizer"}`)); else doc.fillColor("#333333").fontSize(9).text("No events have been assigned to this sponsor.");
    doc.moveDown().fillColor("#153f33").fontSize(15).text("Data boundaries"); doc.fillColor("#333333").fontSize(9).text("This report displays only this sponsor’s sponsorship briefs and explicitly assigned events. It distinguishes company funding from event organisation and does not report unrelated platform events, settlement/disbursement, or verified social-impact outcomes."); doc.end();
  });
}

export async function GET(request: NextRequest) {
  const user = await currentUser(); if (!user || !isCsrSponsor(user)) return new NextResponse("CSR sponsor access required", { status: 403 });
  const authorization = await authorizeCapabilityExecution(user.id, { capabilityCode: "CSR_SPONSORSHIP", functionCode: "CSR_IMPACT_VIEW", resourceScope: {}, enforce: isCsrCapabilityAuthorizationEnforced(), compatibilityReason: "CSR capability enforcement is disabled; retained CSR report access remains authoritative." });
  if (!authorization.allowed) return new NextResponse(authorization.reason, { status: 403 });
  const format = request.nextUrl.searchParams.get("format"); if (format !== "xlsx" && format !== "pdf") return new NextResponse("Choose xlsx or pdf format", { status: 400 }); const data = await getCsrWorkspaceData(user.id);
  await recordCapabilityExecutionAuthorization(user.id, { grantId: authorization.grantId, capabilityCode: "CSR_SPONSORSHIP", functionCode: "CSR_IMPACT_VIEW", context: { format, route: "csr_impact_export", resourceScope: "national" } });
  if (format === "xlsx") { const body = new Uint8Array(await createXlsx(data)); return new NextResponse(body, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${fileName("xlsx")}"`, "Cache-Control": "no-store" } }); }
  if (format === "pdf") { const body = new Uint8Array(await createPdf(data)); return new NextResponse(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${fileName("pdf")}"`, "Cache-Control": "no-store" } }); }
  return new NextResponse("Choose xlsx or pdf format", { status: 400 });
}
