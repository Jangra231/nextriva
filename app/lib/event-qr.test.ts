import { describe, expect, it } from "vitest";
import { eventRegistrationPath } from "./event-qr";

describe("event registration QR paths", () => {
  it("creates a stable, encoded event registration route for the QR payload", () => {
    expect(eventRegistrationPath("noida 10km run")).toBe("/events/noida%2010km%20run/register");
  });
});
