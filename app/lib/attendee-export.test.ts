import { describe, expect, it } from "vitest";
import { createAttendeeCsv, resolveAttendeeExportColumns } from "./attendee-export";

const row = { registration: { orderNumber: "FZ-123", status: "confirmed", paymentStatus: "paid", paidAmountPaise: 12500, createdAt: new Date("2026-08-22T09:00:00.000Z") }, attendee: { name: "Asha Patel", publicId: "USR-123", email: "asha@example.com" }, ticket: { name: "Regular" }, isOrganizer: true, eventPublicId: "EVT-123" };

describe("attendee CSV exports", () => {
  it("keeps only selected supported columns in the requested order", () => {
    const columns = resolveAttendeeExportColumns(["participationRole", "eventId", "email", "unknown"]);
    expect(columns).toEqual(["participationRole", "eventId", "email"]);
    expect(createAttendeeCsv([row], columns)).toContain('"Participation Role","Event ID","Email"\n"Organizer (auto-participant)","EVT-123","asha@example.com"');
  });

  it("falls back to the complete export when no supported columns are requested", () => {
    expect(resolveAttendeeExportColumns([])).toHaveLength(11);
    expect(resolveAttendeeExportColumns(["unknown"])).toHaveLength(11);
  });
});
