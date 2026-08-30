import { describe, expect, it } from "vitest";
import { eventQrFilename, eventQrPosterFilename, isEventRegistrationPath } from "./event-qr-image";

describe("event QR image paths", () => {
  it("accepts only local event registration paths", () => {
    expect(isEventRegistrationPath("/events/noida-10km-run-mt2khnky/register")).toBe(true);
    expect(isEventRegistrationPath("https://example.com/events/test/register")).toBe(false);
    expect(isEventRegistrationPath("/events/noida-10km-run-mt2khnky")).toBe(false);
    expect(isEventRegistrationPath("/api/exports/attendees")).toBe(false);
  });

  it("creates a download-safe QR image filename from the event name", () => {
    expect(eventQrFilename("Noida 10km Run!")).toBe("fitizen-noida-10km-run-registration-qr.png");
    expect(eventQrFilename("***")).toBe("fitizen-event-registration-qr.png");
    expect(eventQrPosterFilename("Noida 10km Run!")).toBe("fitizen-noida-10km-run-registration-qr-poster.svg");
  });
});
