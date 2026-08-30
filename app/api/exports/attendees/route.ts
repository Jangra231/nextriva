import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "../../../lib/auth";
import { getEventAttendees, getOrganizerEvent } from "../../../lib/db";
import { createAttendeeCsv, resolveAttendeeExportColumns } from "../../../lib/attendee-export";

export async function GET(request: NextRequest) {
  const user = await currentUser(); const eventId = Number(request.nextUrl.searchParams.get("eventId"));
  if (!user || !Number.isInteger(eventId)) return new NextResponse("Unauthorized", { status: 401 });
  const event = await getOrganizerEvent(eventId, user.id); if (!event) return new NextResponse("Not found", { status: 404 });
  const rows = await getEventAttendees(eventId, user.id);
  const csv = createAttendeeCsv(rows.map(row => ({ ...row, isOrganizer: row.attendee.id === event.organizerId, eventPublicId: event.publicId })), resolveAttendeeExportColumns(request.nextUrl.searchParams.getAll("columns")));
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${event.slug}-attendees.csv"`, "Cache-Control": "no-store" } });
}
