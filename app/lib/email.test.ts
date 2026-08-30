import nodemailer from "nodemailer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendAttendeeReminder, sendOrganizerParticipationConfirmation, sendOrganizerPublicationConfirmation, sendRegistrationConfirmation } from "./email";

const originalSmtp = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
};

afterEach(() => {
  process.env.SMTP_HOST = originalSmtp.host;
  process.env.SMTP_PORT = originalSmtp.port;
  process.env.SMTP_USER = originalSmtp.user;
  process.env.SMTP_PASS = originalSmtp.pass;
  process.env.SMTP_FROM = originalSmtp.from;
  vi.restoreAllMocks();
});

describe("Nodemailer preview fallback", () => {
  it("renders a registration confirmation safely without SMTP credentials", async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    const logger = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(sendRegistrationConfirmation({
      attendeeEmail: "attendee@example.com",
      attendeeName: "Test Attendee",
      eventName: "Fitizen Test Event",
      ticketName: "General Entry",
      startsAt: new Date("2026-12-28T08:00:00Z"),
      orderNumber: "FZ-TEST123",
      eventUrl: "https://example.com/events/test",
    })).resolves.toBeUndefined();

    expect(logger).toHaveBeenCalledWith(expect.stringContaining("[MailPreview]"), expect.any(String));
  });

  it("uses only environment-provided SMTP settings and dispatches publication and reminder messages", async () => {
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "nexriva-user";
    process.env.SMTP_PASS = "nexriva-password";
    process.env.SMTP_FROM = "Nexriva <events@example.test>";
    const sendMail = vi.fn().mockResolvedValue({ messageId: "smtp-message" });
    const createTransport = vi.spyOn(nodemailer, "createTransport").mockReturnValue({ sendMail } as never);

    await sendOrganizerPublicationConfirmation({ organizerEmail: "organizer@example.test", organizerName: "<Organizer>", eventName: "<Run>", startsAt: new Date("2026-12-28T08:00:00Z"), eventUrl: "https://example.test/events/run" });
    await sendOrganizerParticipationConfirmation({ organizerEmail: "organizer@example.test", organizerName: "<Organizer>", eventName: "<Run>", startsAt: new Date("2026-12-28T08:00:00Z"), eventUrl: "https://example.test/events/run", userPublicId: "USR-ORGANIZER", eventPublicId: "EVT-RUN", orderNumber: "FZ-ORG-123", ticketName: "Organizer Entry" });
    await sendAttendeeReminder({ attendeeEmail: "attendee@example.test", attendeeName: "Attendee", eventName: "Reminder Run", venue: "Central Park", city: "Noida", startsAt: new Date("2026-12-28T08:00:00Z"), eventUrl: "https://example.test/events/run" });

    expect(createTransport).toHaveBeenCalledWith({ host: "smtp.example.test", port: 465, secure: true, auth: { user: "nexriva-user", pass: "nexriva-password" } });
    expect(sendMail).toHaveBeenCalledTimes(3);
    expect(sendMail).toHaveBeenNthCalledWith(1, expect.objectContaining({ from: "Nexriva <events@example.test>", to: "organizer@example.test", subject: "Your Nexriva event is live: <Run>", html: expect.stringContaining("&lt;Run&gt;") }));
    expect(sendMail).toHaveBeenNthCalledWith(2, expect.objectContaining({ from: "Nexriva <events@example.test>", to: "organizer@example.test", subject: "Approved: you are participant #1 for <Run>", html: expect.stringContaining("EVT-RUN") }));
    expect(sendMail).toHaveBeenNthCalledWith(3, expect.objectContaining({ from: "Nexriva <events@example.test>", to: "attendee@example.test", subject: "Reminder: Reminder Run is tomorrow" }));
  });
});
