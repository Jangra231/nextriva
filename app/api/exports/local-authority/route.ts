import ExcelJS from "exceljs";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "../../../lib/auth";
import { isLocalAuthority } from "../../../lib/admin";
import { authorizeCapabilityExecution, getMcdWorkspaceData, recordCapabilityExecutionAuthorization } from "../../../lib/db";
import { isLocalAuthorityMisExportEnforced } from "../../../lib/capability-authorization";

export const runtime = "nodejs";

const date = (value: Date | null) => value ? new Date(value).toLocaleString("en-IN") : "—";
const fileName = (extension: "xlsx" | "pdf") => `fitizen-local-authority-mis-${new Date().toISOString().slice(0, 10)}.${extension}`;

function addSheet(workbook: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width: number }[], rows: Record<string, unknown>[]) {
  const sheet = workbook.addWorksheet(name); sheet.columns = columns; sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF153F33" } }; rows.forEach(row => sheet.addRow(row)); sheet.views = [{ state: "frozen", ySplit: 1 }]; sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + columns.length)}1` };
}

async function createXlsx(data: Awaited<ReturnType<typeof getMcdWorkspaceData>>) {
  const workbook = new ExcelJS.Workbook(); workbook.creator = "Fitizen Local Authority MIS"; workbook.created = new Date();
  addSheet(workbook, "Summary", [{ header: "Metric", key: "metric", width: 34 }, { header: "Value", key: "value", width: 20 }], [
    { metric: "All events", value: data.metrics.events }, { metric: "Live events", value: data.metrics.liveEvents }, { metric: "Awaiting Local Authority review", value: data.metrics.awaitingApproval }, { metric: "Recorded participations", value: data.metrics.participations }, { metric: "Checked in", value: data.metrics.checkedIn }, { metric: "Organizers monitored", value: data.metrics.organizers }, { metric: "Eligible locations", value: data.metrics.eligibleLocations }, { metric: "Accessible locations", value: data.metrics.accessibleLocations }, { metric: "Observed wards", value: data.metrics.wardsObserved }, { metric: "Partner-channel promotions", value: data.metrics.partnerPromotions }, { metric: "Assigned CSR-supported events", value: data.metrics.csrSupportedActivities }, { metric: "Assigned CSR amount", value: `₹${(data.metrics.csrCommitted / 100).toLocaleString("en-IN")}` }, { metric: "Health-screening data", value: "Not collected in current platform model" }, { metric: "CSR review boundary", value: "Master administrators review briefs and match events; Local Authority monitors assigned activity" },
  ]);
  addSheet(workbook, "Ward activity", [{ header: "City", key: "city", width: 22 }, { header: "Zone", key: "zone", width: 22 }, { header: "Ward", key: "ward", width: 22 }, { header: "Events", key: "events", width: 12 }, { header: "Live events", key: "live", width: 14 }, { header: "Participations", key: "participations", width: 16 }, { header: "Checked in", key: "checkedIn", width: 14 }, { header: "Eligible locations", key: "locations", width: 18 }, { header: "Accessible locations", key: "accessible", width: 20 }], data.wardActivity.map(row => ({ city: row.city, zone: row.zone, ward: row.ward, events: row.events, live: row.liveEvents, participations: row.participations, checkedIn: row.checkedIn, locations: row.eligibleLocations, accessible: row.accessibleLocations })));
  addSheet(workbook, "Events", [{ header: "Event", key: "event", width: 30 }, { header: "Event ID", key: "eventId", width: 24 }, { header: "Activity", key: "activity", width: 20 }, { header: "Organizer", key: "organizer", width: 28 }, { header: "City", key: "city", width: 20 }, { header: "Zone", key: "zone", width: 20 }, { header: "Ward", key: "ward", width: 20 }, { header: "Lifecycle", key: "lifecycle", width: 16 }, { header: "Authority status", key: "authority", width: 20 }, { header: "Participations", key: "participations", width: 16 }, { header: "Checked in", key: "checkedIn", width: 14 }, { header: "Updated", key: "updated", width: 24 }], data.events.map(({ event, organizer, category, participations, checkedIn }) => ({ event: event.displayName, eventId: event.publicId, activity: category?.name || "Not categorized", organizer: organizer.name || organizer.email || "—", city: event.city || "Not recorded", zone: event.zone || "Not recorded", ward: event.ward || "Not recorded", lifecycle: event.status, authority: event.moderationStatus, participations, checkedIn, updated: date(event.updatedAt) })));
  addSheet(workbook, "Eligible locations", [{ header: "Venue", key: "venue", width: 32 }, { header: "City", key: "city", width: 20 }, { header: "Zone", key: "zone", width: 22 }, { header: "Ward", key: "ward", width: 22 }, { header: "Location", key: "location", width: 28 }, { header: "Setting", key: "setting", width: 14 }, { header: "Capacity", key: "capacity", width: 14 }, { header: "Access", key: "access", width: 18 }], data.eligibleLocations.map(venue => ({ venue: venue.venueName, city: venue.city, zone: venue.zone, ward: venue.ward, location: venue.location, setting: venue.setting, capacity: venue.capacity || "Not recorded", access: venue.isAccessible ? "Accessible" : "Standard access" })));
  addSheet(workbook, "CSR supported activity", [{ header: "CSR sponsor", key: "sponsor", width: 30 }, { header: "Assigned event", key: "event", width: 30 }, { header: "Organizer", key: "organizer", width: 28 }, { header: "Event type", key: "eventType", width: 24 }, { header: "Preferred territory", key: "territory", width: 28 }, { header: "Amount", key: "amount", width: 18 }, { header: "Assignment note", key: "note", width: 36 }], data.csrSponsorships.map(({ request, profile, event, organizer }) => ({ sponsor: profile.companyName, event: event.displayName, organizer: organizer?.name || organizer?.email || "—", eventType: request.eventType, territory: [request.cityPreference, request.zonePreference, request.wardPreference].filter(Boolean).join(" · ") || event.city || "Not recorded", amount: `₹${(request.amountPaise / 100).toLocaleString("en-IN")}`, note: request.adminReviewNote || "—" })));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function createPdf(data: Awaited<ReturnType<typeof getMcdWorkspaceData>>) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 44 }); const chunks: Buffer[] = []; doc.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    doc.fillColor("#153f33").fontSize(22).text("Fitizen Local Authority MIS Report"); doc.fillColor("#687b72").fontSize(10).text(`Generated ${new Date().toLocaleString("en-IN")}`); doc.moveDown();
    [["All events", data.metrics.events], ["Live events", data.metrics.liveEvents], ["Awaiting Local Authority review", data.metrics.awaitingApproval], ["Recorded participations", data.metrics.participations], ["Eligible locations", data.metrics.eligibleLocations], ["Observed wards", data.metrics.wardsObserved]].forEach(([label, value]) => doc.fillColor("#153f33").fontSize(11).text(`${label}: `, { continued: true }).fillColor("#333333").text(String(value)));
    doc.moveDown().fillColor("#153f33").fontSize(15).text("Ward activity"); data.wardActivity.slice(0, 28).forEach(row => doc.fillColor("#333333").fontSize(9).text(`${row.city} · ${row.zone} · ${row.ward} — ${row.events} events, ${row.liveEvents} live, ${row.participations} participations, ${row.eligibleLocations} eligible locations`));
    doc.moveDown().fillColor("#153f33").fontSize(15).text("Data availability"); doc.fillColor("#333333").fontSize(9).text("Health screening and settlement records are not captured in the current platform model. CSR support is reported only after a master administrator assigns an approved CSR brief to an event; Local Authority monitors those assigned activities without changing organizer ownership.");
    doc.end();
  });
}

export async function GET(request: NextRequest) {
  const user = await currentUser(); if (!user || !isLocalAuthority(user)) return new NextResponse("Local Authority access required", { status: 403 });
  const authorization = await authorizeCapabilityExecution(user.id, { capabilityCode: "LOCAL_AUTHORITY", functionCode: "LA_MIS_EXPORT", resourceScope: {}, enforce: isLocalAuthorityMisExportEnforced(), compatibilityReason: "Local Authority MIS export grant enforcement is disabled; retained Local Authority export access remains authoritative." });
  if (!authorization.allowed) return new NextResponse(authorization.reason, { status: 403 });
  const format = request.nextUrl.searchParams.get("format"); if (format !== "xlsx" && format !== "pdf") return new NextResponse("Choose xlsx or pdf format", { status: 400 }); const data = await getMcdWorkspaceData();
  await recordCapabilityExecutionAuthorization(user.id, { grantId: authorization.grantId, capabilityCode: "LOCAL_AUTHORITY", functionCode: "LA_MIS_EXPORT", context: { format, route: "local_authority_mis_export", resourceScope: "national" } });
  if (format === "xlsx") { const body = new Uint8Array(await createXlsx(data)); return new NextResponse(body, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${fileName("xlsx")}"`, "Cache-Control": "no-store" } }); }
  if (format === "pdf") { const body = new Uint8Array(await createPdf(data)); return new NextResponse(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${fileName("pdf")}"`, "Cache-Control": "no-store" } }); }
  return new NextResponse("Choose xlsx or pdf format", { status: 400 });
}
