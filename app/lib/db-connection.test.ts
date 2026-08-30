import { describe, expect, it } from "vitest";
import { isRetryableDatabaseConnectionError, withDatabaseReadRetry } from "./db";

describe("database read connection recovery", () => {
  it("recognizes the observed closed-connection failure", () => {
    const error = Object.assign(new Error("Connection lost: The server closed the connection."), { code: "PROTOCOL_CONNECTION_LOST" });
    expect(isRetryableDatabaseConnectionError(error)).toBe(true);
  });

  it("retries a read once and returns the successful result", async () => {
    let attempts = 0;
    const result = await withDatabaseReadRetry(async () => {
      attempts += 1;
      if (attempts === 1) throw Object.assign(new Error("socket reset"), { code: "ECONNRESET" });
      return ["event"];
    });

    expect(result).toEqual(["event"]);
    expect(attempts).toBe(2);
  });

  it("does not retry non-connection failures", async () => {
    let attempts = 0;
    const failure = new Error("invalid query");

    await expect(withDatabaseReadRetry(async () => {
      attempts += 1;
      throw failure;
    })).rejects.toBe(failure);
    expect(attempts).toBe(1);
  });
});
