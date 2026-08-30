export type VenueExportRow = { id: number; zone: string; ward: string; location: string; venueName: string; city: string; address: string | null; sector: string | null; area: string | null; latitudeE6: number; longitudeE6: number; setting: "indoor" | "outdoor"; capacity: number | null; isAccessible: boolean; accessibilityNotes: string | null; active: boolean; createdAt: Date | string; updatedAt: Date | string };
const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function createVenueDirectoryCsv(rows: VenueExportRow[]) {
  const headers = ["Venue ID", "Zone", "Ward", "Location", "Venue", "City", "Address", "Sector", "Area", "Latitude", "Longitude", "Setting", "Capacity", "Accessible", "Accessibility details", "Status", "Created at", "Updated at"];
  const lines = rows.map(row => [row.id, row.zone, row.ward, row.location, row.venueName, row.city, row.address, row.sector, row.area, (row.latitudeE6 / 1_000_000).toFixed(6), (row.longitudeE6 / 1_000_000).toFixed(6), row.setting, row.capacity ?? "", row.isAccessible ? "Yes" : "No", row.accessibilityNotes, row.active ? "Active" : "Retired", new Date(row.createdAt).toISOString(), new Date(row.updatedAt).toISOString()].map(quote).join(","));
  return `${headers.map(quote).join(",")}\n${lines.join("\n")}\n`;
}
