import { describe, expect, it } from "vitest";
import { coordinateFromE6, coordinateToE6, mapUrl } from "./location";

describe("precise location helpers", () => {
  it("stores valid latitude and longitude values as stable microdegrees", () => {
    expect(coordinateToE6("28.535516", "latitude")).toBe(28535516);
    expect(coordinateToE6("77.391026", "longitude")).toBe(77391026);
    expect(coordinateFromE6(28535516)).toBe("28.535516");
  });

  it("rejects coordinates outside their valid geographic ranges", () => {
    expect(coordinateToE6("91", "latitude")).toBeNull();
    expect(coordinateToE6("181", "longitude")).toBeNull();
  });

  it("builds a neutral map link only when both coordinates exist", () => {
    expect(mapUrl(28535516, 77391026)).toContain("28.535516,77.391026");
    expect(mapUrl(null, 77391026)).toBeNull();
  });
});
