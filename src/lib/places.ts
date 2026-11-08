/**
 * Approximate city coordinates for the delivery preview.
 * Real orders will measure road distance from the manufacturer's pickup address
 * to the customer's address with a maps service (decided in Phase 5).
 */
export const PLACES: Record<string, { lat: number; lng: number }> = {
  Tbilisi: { lat: 41.7151, lng: 44.8271 },
  Rustavi: { lat: 41.5495, lng: 44.9934 },
  Kutaisi: { lat: 42.2679, lng: 42.6946 },
  Batumi: { lat: 41.6168, lng: 41.6367 },
  Zugdidi: { lat: 42.5088, lng: 41.8709 },
  Gori: { lat: 41.9842, lng: 44.1158 },
  Telavi: { lat: 41.9198, lng: 45.4731 },
  Sighnaghi: { lat: 41.6196, lng: 45.9221 },
  Zestaponi: { lat: 42.1103, lng: 43.0359 },
  Mestia: { lat: 43.0456, lng: 42.7279 },
  Bakuriani: { lat: 41.7497, lng: 43.5297 },
  Poti: { lat: 42.1462, lng: 41.6714 },
  Akhaltsikhe: { lat: 41.6390, lng: 42.9826 },
};

/** Straight-line distance × 1.3 as a rough road distance, in km. */
export function approxRoadKm(from: string, to: string): number | null {
  const a = PLACES[from];
  const b = PLACES[to];
  if (!a || !b) return null;
  if (from === to) return 8; // average delivery within one city
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.3);
}
