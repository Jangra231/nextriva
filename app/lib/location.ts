export type VenueSetting = "indoor" | "outdoor";

export function coordinateToE6(value: string | number, axis: "latitude" | "longitude") {
  const coordinate = typeof value === "number" ? value : Number(value);
  const maximum = axis === "latitude" ? 90 : 180;
  if (!Number.isFinite(coordinate) || coordinate < -maximum || coordinate > maximum) return null;
  return Math.round(coordinate * 1_000_000);
}

export function coordinateFromE6(value: number | null | undefined) {
  return typeof value === "number" ? (value / 1_000_000).toFixed(6) : "";
}

export function normalizeLocationText(value: string | undefined, limit: number) {
  return (value || "").trim().slice(0, limit);
}

export function mapUrl(latitudeE6: number | null | undefined, longitudeE6: number | null | undefined) {
  if (typeof latitudeE6 !== "number" || typeof longitudeE6 !== "number") return null;
  return `https://www.google.com/maps/search/?api=1&query=${latitudeE6 / 1_000_000},${longitudeE6 / 1_000_000}`;
}
