import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("organizer approval timeline contracts", () => {
  it("derives owner-scoped moderation history from event timestamps and existing administrator audits", () => {
    const db = source("app/lib/db.ts");
    expect(db).toContain("export async function getOrganizerEventApprovalTimeline");
    expect(db).toContain("const event = await getOrganizerEvent(eventId, organizerId)");
    expect(db).toContain('eq(adminAuditLogs.entityType, "event")');
    expect(db).toContain("auditModerationStatus");
    expect(db).toContain("Submitted for approval");
  });

  it("renders the timeline in the organizer wizard without changing administrator decision safeguards", () => {
    const page = source("app/dashboard/manage-events/create-event/[eventId]/page.tsx"); const panel = source("app/components/EventModerationPanel.tsx");
    expect(page).toContain("getOrganizerEventApprovalTimeline");
    expect(page).toContain("timeline={approvalTimeline}");
    expect(panel).toContain('aria-label="Event approval timeline"');
    expect(panel).toContain("Administrator feedback");
  });
});
