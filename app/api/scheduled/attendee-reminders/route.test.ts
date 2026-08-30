import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getUpcomingReminderRegistrations: vi.fn(),
  claimRegistrationReminder: vi.fn(),
  releaseRegistrationReminderClaim: vi.fn(),
  markRegistrationReminderSent: vi.fn(),
  sendAttendeeReminder: vi.fn(),
}));

vi.mock("../../../lib/db", () => ({
  getUpcomingReminderRegistrations: mocks.getUpcomingReminderRegistrations,
  claimRegistrationReminder: mocks.claimRegistrationReminder,
  releaseRegistrationReminderClaim: mocks.releaseRegistrationReminderClaim,
  markRegistrationReminderSent: mocks.markRegistrationReminderSent,
}));
vi.mock("../../../lib/email", () => ({ sendAttendeeReminder: mocks.sendAttendeeReminder }));
vi.mock("../../../../server/_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));

import { POST } from "./route";

const request = () => new NextRequest("https://fitizen.test/api/scheduled/attendee-reminders", { method: "POST" });
const upcoming = [{ registration: { id: 101 }, event: { displayName: "Morning Run", venueName: "Central Park", city: "Noida", startsAt: new Date("2026-12-28T08:00:00Z"), slug: "morning-run" }, attendee: { email: "attendee@example.test", name: "Asha" } }];

describe("scheduled attendee reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUpcomingReminderRegistrations.mockResolvedValue(upcoming);
    mocks.claimRegistrationReminder.mockResolvedValue(true);
    mocks.sendAttendeeReminder.mockResolvedValue(undefined);
    mocks.markRegistrationReminderSent.mockResolvedValue(true);
  });

  it("rejects non-cron callers without reading registrations", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: false });
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(mocks.getUpcomingReminderRegistrations).not.toHaveBeenCalled();
  });

  it("claims each eligible registration before sending and records a successful reminder", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron_reminders" });
    const response = await POST(request());
    expect(await response.json()).toEqual({ ok: true, processed: 1 });
    expect(mocks.claimRegistrationReminder).toHaveBeenCalledWith(101);
    expect(mocks.markRegistrationReminderSent).toHaveBeenCalledWith(101);
    expect(mocks.sendAttendeeReminder).toHaveBeenCalledWith(expect.objectContaining({ attendeeEmail: "attendee@example.test", eventName: "Morning Run", eventUrl: "https://fitizen.test/events/morning-run" }));
    expect(mocks.markRegistrationReminderSent.mock.invocationCallOrder[0]).toBeLessThan(mocks.sendAttendeeReminder.mock.invocationCallOrder[0]);
  });

  it("skips an already claimed registration without sending a duplicate", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron_reminders" });
    mocks.claimRegistrationReminder.mockResolvedValue(false);
    const response = await POST(request());
    expect(await response.json()).toEqual({ ok: true, processed: 0 });
    expect(mocks.sendAttendeeReminder).not.toHaveBeenCalled();
    expect(mocks.markRegistrationReminderSent).not.toHaveBeenCalled();
  });

  it("does not send when the durable sent marker cannot be persisted", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron_reminders" });
    mocks.markRegistrationReminderSent.mockRejectedValue(new Error("database unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(mocks.sendAttendeeReminder).not.toHaveBeenCalled();
    expect(mocks.releaseRegistrationReminderClaim).toHaveBeenCalledWith(101);
  });

  it("releases the claim and returns structured failure data when delivery fails", async () => {
    mocks.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron_reminders" });
    mocks.sendAttendeeReminder.mockRejectedValue(new Error("SMTP unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(expect.objectContaining({ error: expect.stringContaining("SMTP unavailable"), timestamp: expect.any(String) }));
    expect(mocks.releaseRegistrationReminderClaim).toHaveBeenCalledWith(101);
  });
});
