import { describe, expect, it } from "vitest";
import { buildOrganizerShareTargets } from "./organizer-share";

describe("buildOrganizerShareTargets", () => {
  it("creates distinct platform-ready public event and QR registration links", () => {
    const targets = buildOrganizerShareTargets("https://fitizen.example/", "noida-10k run", "Noida 10K Run");
    expect(targets.eventUrl).toBe("https://fitizen.example/events/noida-10k%20run");
    expect(targets.registrationUrl).toBe("https://fitizen.example/events/noida-10k%20run/register");
    expect(targets.eventPlatforms.whatsapp).toContain(encodeURIComponent(targets.eventUrl));
    expect(targets.registrationPlatforms.linkedin).toContain(encodeURIComponent(targets.registrationUrl));
  });
});
