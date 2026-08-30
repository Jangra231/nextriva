import type { Request as ExpressRequest } from "express";
import { NextRequest, NextResponse } from "next/server";
import { claimRegistrationReminder, getUpcomingReminderRegistrations, markRegistrationReminderSent, releaseRegistrationReminderClaim } from "../../../lib/db";
import { sendAttendeeReminder } from "../../../lib/email";
import { sdk } from "../../../../server/_core/sdk";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const cronUser = await sdk.authenticateRequest({ headers: { cookie: request.headers.get("cookie") || undefined, authorization: request.headers.get("authorization") || undefined } } as ExpressRequest);
    if (!cronUser.isCron) return NextResponse.json({ error: "Cron authentication required" }, { status: 403 });
    const upcoming = await getUpcomingReminderRegistrations();
    let processed = 0;
    for (const { registration, event, attendee } of upcoming) {
      if (!(await claimRegistrationReminder(registration.id))) continue;
      try {
        // Persist before network delivery. If this write fails, no email is attempted;
        // if SMTP fails, the catch releases the marker so a later schedule can retry.
        if (!(await markRegistrationReminderSent(registration.id))) continue;
        await sendAttendeeReminder({ attendeeEmail: attendee.email, attendeeName: attendee.name, eventName: event.displayName, venue: event.venueName, city: event.city, startsAt: event.startsAt, eventUrl: `${request.nextUrl.origin}/events/${event.slug}` });
        processed += 1;
      } catch (error) {
        await releaseRegistrationReminderClaim(registration.id);
        throw error;
      }
    }
    return NextResponse.json({ ok: true, processed });
  } catch (error) {
    console.error("[AttendeeReminder] Scheduled delivery failed", error);
    return NextResponse.json({ error: String(error), timestamp: new Date().toISOString() }, { status: 500 });
  }
}
