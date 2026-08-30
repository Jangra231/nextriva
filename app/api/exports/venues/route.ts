import { NextResponse } from "next/server";
import { currentUser } from "../../../lib/auth";
import { isAdministrator } from "../../../lib/admin";
import { getAdminVenues } from "../../../lib/db";
import { createVenueDirectoryCsv } from "../../../lib/venue-export";

export async function GET() {
  const user = await currentUser();
  if (!isAdministrator(user)) return new NextResponse("Administrator access is required", { status: 403 });
  const csv = createVenueDirectoryCsv(await getAdminVenues());
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=fitizen-venue-directory.csv", "Cache-Control": "no-store" } });
}
