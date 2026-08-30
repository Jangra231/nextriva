import { NextResponse } from "next/server";
import { currentUser } from "../../../lib/auth";
import { getReports } from "../../../lib/db";

const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET() {
  const user = await currentUser(); if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const report = await getReports(user.id);
  const csv = [["Event", "Status", "Starts At", "Registrations", "Confirmed", "Checked In", "Cancelled", "Gross Ticket Value (INR)"], ...report.events.map(event => { const rows = report.registrations.filter(row => row.eventId === event.id); return [event.displayName, event.status, event.startsAt ? new Date(event.startsAt).toISOString() : "", rows.length, rows.filter(row => row.status === "confirmed").length, rows.filter(row => row.status === "checked_in").length, rows.filter(row => row.status === "cancelled").length, (rows.reduce((sum, row) => sum + row.paidAmountPaise, 0) / 100).toFixed(2)]; })].map(row => row.map(cell).join(",")).join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=fitizen-event-performance.csv", "Cache-Control": "no-store" } });
}
