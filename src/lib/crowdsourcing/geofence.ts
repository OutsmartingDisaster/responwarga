/**
 * Check if a point is within a radius from center
 */
export function isWithinRadius(
  pointLat: number, pointLng: number,
  centerLat: number, centerLng: number,
  radiusKm: number
): boolean {
  const R = 6371; // Earth radius in km
  const dLat = (centerLat - pointLat) * Math.PI / 180;
  const dLng = (centerLng - pointLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pointLat * Math.PI / 180) * Math.cos(centerLat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance <= radiusKm;
}

/**
 * Check if a point is inside a polygon
 */
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[]
): boolean {
  if (!polygon || polygon.length < 3) return false;
  
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    if (((yi > point.lat) !== (yj > point.lat)) &&
      (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Validate if location is within project geofence
 */
export function isWithinGeofence(
  lat: number, lng: number,
  project: {
    latitude?: number;
    longitude?: number;
    geofence_radius_km?: number;
    geofence_polygon?: { lat: number; lng: number }[];
  }
): { valid: boolean; message?: string } {
  // If polygon defined, use polygon check
  if (project.geofence_polygon && project.geofence_polygon.length >= 3) {
    const valid = isPointInPolygon({ lat, lng }, project.geofence_polygon);
    return {
      valid,
      message: valid ? undefined : 'Lokasi di luar area bencana yang ditentukan'
    };
  }

  // Otherwise use radius check
  if (project.latitude && project.longitude && project.geofence_radius_km) {
    const valid = isWithinRadius(lat, lng, project.latitude, project.longitude, project.geofence_radius_km);
    return {
      valid,
      message: valid ? undefined : `Lokasi di luar radius ${project.geofence_radius_km}km dari pusat bencana`
    };
  }

  // No geofence defined, allow all
  return { valid: true };
}
