import { describe, expect, it } from "vitest";
import { createPublicEventId, createPublicUserId } from "./db";

describe("stable public identifier generators", () => {
  it("creates a public user ID with the expected non-numeric format", () => {
    expect(createPublicUserId()).toMatch(/^USR-[A-F0-9]{16}$/);
  });

  it("creates a permanent public event ID with the expected format", () => {
    expect(createPublicEventId()).toMatch(/^EVT-[A-F0-9]{16}$/);
  });

  it("does not repeat generated identifiers across a small batch", () => {
    const eventIds = new Set(Array.from({ length: 40 }, () => createPublicEventId()));
    const userIds = new Set(Array.from({ length: 40 }, () => createPublicUserId()));
    expect(eventIds.size).toBe(40);
    expect(userIds.size).toBe(40);
  });
});
