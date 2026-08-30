import { NextResponse } from "next/server";
import { currentUser } from "../../../lib/auth";
import { getActiveVenueConflicts, getOrganizerEvent } from "../../../lib/db";

export async function GET(request: Request) {
  const user = await currentUser(); const eventId = Number(new URL(request.url).searchParams.get("eventId"));
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!Number.isInteger(eventId) || !(await getOrganizerEvent(eventId, user.id))) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ conflicts: await getActiveVenueConflicts(eventId) });
}
