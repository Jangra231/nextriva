import { describe, expect, it } from "vitest";
import { buildShareUrls } from "./share";

describe("buildShareUrls", () => {
  it("encodes the public event URL and event title for each platform", () => {
    const links = buildShareUrls("https://fitizen.test/events/sunday-run", "Sunday Run & Brunch");
    expect(links.whatsapp).toContain("Sunday%20Run%20%26%20Brunch");
    expect(links.facebook).toContain(encodeURIComponent("https://fitizen.test/events/sunday-run"));
    expect(links.x).toContain("Sunday%20Run%20%26%20Brunch");
    expect(links.linkedin).toContain(encodeURIComponent("https://fitizen.test/events/sunday-run"));
  });
});
