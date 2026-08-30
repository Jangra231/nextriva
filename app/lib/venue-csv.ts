import { coordinateToE6, normalizeLocationText } from "./location";

export type VenueImportInput = { zone: string; ward: string; location: string; venueName: string; city: string; address: string | null; sector: string | null; area: string | null; latitudeE6: number; longitudeE6: number; setting: "indoor" | "outdoor"; capacity: number | null; isAccessible: boolean; accessibilityNotes: string | null; active: boolean };
export type VenueImportIssue = { row: number; message: string };

const requiredColumns = ["zone", "ward", "location", "venuename", "city", "latitude", "longitude", "setting"] as const;
const optionalColumns = ["address", "sector", "area", "capacity", "isaccessible", "accessibilitynotes", "active"] as const;

function parseRow(line: string) {
  const values: string[] = []; let value = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const current = line[index];
    if (current === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; }
    else if (current === '"') quoted = !quoted;
    else if (current === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += current;
  }
  values.push(value.trim());
  return values;
}

function truthy(value: string, fallback: boolean) {
  if (!value) return fallback;
  return ["true", "yes", "1", "y"].includes(value.trim().toLowerCase());
}

export function parseVenueCsv(source: string) {
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  const issues: VenueImportIssue[] = [];
  if (lines.length < 2) return { rows: [] as VenueImportInput[], issues: [{ row: 1, message: "Add a header row and at least one venue row." }] };
  const headers = parseRow(lines[0]).map(value => value.toLowerCase().replace(/[ _-]/g, ""));
  const missing = requiredColumns.filter(column => !headers.includes(column));
  if (missing.length) return { rows: [] as VenueImportInput[], issues: [{ row: 1, message: `Missing required CSV columns: ${missing.join(", ")}.` }] };
  const positions = new Map(headers.map((header, index) => [header, index]));
  const get = (values: string[], key: string) => values[positions.get(key) ?? -1] || "";
  const rows: VenueImportInput[] = [];
  const seen = new Set<string>();
  for (let index = 1; index < lines.length; index += 1) {
    if (rows.length >= 500) { issues.push({ row: index + 1, message: "A single import supports at most 500 venues." }); break; }
    const values = parseRow(lines[index]);
    const zone = normalizeLocationText(get(values, "zone"), 100); const ward = normalizeLocationText(get(values, "ward"), 100); const location = normalizeLocationText(get(values, "location"), 160); const venueName = normalizeLocationText(get(values, "venuename"), 160); const city = normalizeLocationText(get(values, "city"), 100);
    const latitudeE6 = coordinateToE6(get(values, "latitude"), "latitude"); const longitudeE6 = coordinateToE6(get(values, "longitude"), "longitude"); const settingValue = get(values, "setting").toLowerCase(); const setting = settingValue === "indoor" || settingValue === "outdoor" ? settingValue : null;
    const capacityText = get(values, "capacity"); const capacity = capacityText ? Number(capacityText) : null;
    if (!zone || !ward || !location || !venueName || !city || latitudeE6 === null || longitudeE6 === null || !setting) { issues.push({ row: index + 1, message: "Provide zone, ward, location, venueName, city, valid latitude/longitude, and indoor or outdoor setting." }); continue; }
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 1_000_000)) { issues.push({ row: index + 1, message: "Capacity must be a whole number between 1 and 1000000 when provided." }); continue; }
    const key = [zone, ward, location, venueName, city].map(value => value.toLocaleLowerCase()).join("|");
    if (seen.has(key)) { issues.push({ row: index + 1, message: "This venue is duplicated within the CSV file." }); continue; }
    seen.add(key);
    rows.push({ zone, ward, location, venueName, city, address: normalizeLocationText(get(values, "address"), 1000) || null, sector: normalizeLocationText(get(values, "sector"), 100) || null, area: normalizeLocationText(get(values, "area"), 120) || null, latitudeE6, longitudeE6, setting, capacity, isAccessible: truthy(get(values, "isaccessible"), false), accessibilityNotes: normalizeLocationText(get(values, "accessibilitynotes"), 1500) || null, active: truthy(get(values, "active"), true) });
  }
  return { rows, issues };
}

export const venueCsvTemplate = `${[...requiredColumns, ...optionalColumns].join(",")}\nCentral,Ward 9,Sector 62,Community Centre,Noida,28.629000,77.364000,outdoor,1200,yes,Step-free entry and accessible washroom,true\n`;
