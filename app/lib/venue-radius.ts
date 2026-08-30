export const venueRadiusOptions = [5, 10, 25, 50, 100] as const;

export function venueDistanceKm(origin: { latitude: number; longitude: number }, destination: { latitudeE6: number; longitudeE6: number }) {
  const radians = (value: number) => value * Math.PI / 180; const earthKm = 6371;
  const latitude1 = radians(origin.latitude); const latitude2 = radians(destination.latitudeE6 / 1_000_000); const deltaLatitude = latitude2 - latitude1; const deltaLongitude = radians(destination.longitudeE6 / 1_000_000 - origin.longitude);
  const halfChord = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(halfChord), Math.sqrt(1 - halfChord));
}

export function isWithinVenueRadius(origin: { latitude: number; longitude: number } | null, radiusKm: number | null, venue: { latitudeE6: number; longitudeE6: number }) {
  return !origin || !radiusKm || venueDistanceKm(origin, venue) <= radiusKm;
}
