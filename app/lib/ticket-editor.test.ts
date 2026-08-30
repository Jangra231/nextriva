import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("ticket creation interaction contracts", () => {
  it("exposes a native exclusive ticket-type radio group and CSS-selected price fields that work before hydration", () => {
    const tickets = source("app/components/TicketManager.tsx");
    expect(tickets).toContain("ticket-type-choice");
    expect(tickets).toContain('type="radio"');
    expect(tickets).toContain('name="nativeTicketCategory"');
    expect(tickets).toContain('name="nativeTicketPricePaid"');
    expect(tickets).toContain('name="nativeTicketPriceDonation"');
    expect(tickets).toContain('name="nativeTicketGstApplicable"');
    expect(tickets).toContain('name="nativeTicketGstRatePercent"');
    expect(tickets).toContain("[0, 5, 12, 18, 28]");
    expect(tickets).toContain('inputMode="decimal"');
    expect(tickets).toContain("Save and Next");
  });

  it("provides event-derived sale defaults and retains a server-side paid-price guard", () => {
    const page = source("app/dashboard/manage-events/create-event/[eventId]/page.tsx"); const actions = source("app/actions.ts");
    expect(page).toContain("const dateDefaults =");
    expect(page).toContain("<TicketManager initial={initial} dateDefaults={dateDefaults} />");
    expect(actions).toContain("nativeTicketDraftFromForm(formData)");
    expect(actions).toContain('item.ticketCategory === "paid" && item.pricePaise <= 0');
  });
});
