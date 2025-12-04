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

// Province bounding boxes for Indonesia (approximate)
const PROVINCE_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  'Provinsi Aceh': { minLat: 2.0, maxLat: 6.0, minLng: 95.0, maxLng: 98.5 },
  'Provinsi Sumatera Utara': { minLat: 1.0, maxLat: 4.5, minLng: 97.0, maxLng: 100.5 },
  'Provinsi Sumatera Barat': { minLat: -3.5, maxLat: 1.5, minLng: 98.5, maxLng: 102.0 },
  'Provinsi Riau': { minLat: -1.0, maxLat: 4.5, minLng: 100.0, maxLng: 105.0 },
  'Provinsi Jambi': { minLat: -2.5, maxLat: 0.5, minLng: 101.0, maxLng: 105.0 },
  'Provinsi Sumatera Selatan': { minLat: -5.0, maxLat: -1.5, minLng: 102.5, maxLng: 106.5 },
  'Provinsi Bengkulu': { minLat: -5.5, maxLat: -2.0, minLng: 101.0, maxLng: 104.5 },
  'Provinsi Lampung': { minLat: -6.0, maxLat: -3.5, minLng: 103.5, maxLng: 106.5 },
  'Provinsi Kepulauan Bangka Belitung': { minLat: -4.0, maxLat: -1.5, minLng: 105.0, maxLng: 109.0 },
  'Provinsi Kepulauan Riau': { minLat: -1.0, maxLat: 5.0, minLng: 103.0, maxLng: 109.5 },
};

/**
 * Check if a point is within a province boundary
 */
export function isWithinProvince(
  lat: number, lng: number,
  provinceName: string
): boolean {
  const bounds = PROVINCE_BOUNDS[provinceName];
  if (!bounds) {
    // If province not in our list, use a generous 500km radius from center
    return true;
  }
  return lat >= bounds.minLat && lat <= bounds.maxLat && 
         lng >= bounds.minLng && lng <= bounds.maxLng;
}

export interface GeofenceZone {
  zone_name: string;
  zone_level: 'radius' | 'kelurahan' | 'kecamatan' | 'kabupaten' | 'provinsi';
  latitude: number;
  longitude: number;
  radius_km: number;
}

/**
 * Validate if location is within any of the project's geofence zones
 */
export function isWithinZones(
  lat: number, lng: number,
  zones: GeofenceZone[]
): { valid: boolean; message?: string; matchedZone?: string } {
  if (!zones || zones.length === 0) {
    return { valid: true };
  }

  for (const zone of zones) {
    // For province-level zones, check against province boundaries
    if (zone.zone_level === 'provinsi') {
      if (isWithinProvince(lat, lng, zone.zone_name)) {
        return { valid: true, matchedZone: zone.zone_name };
      }
    } 
    // For kabupaten/kecamatan/kelurahan, use a larger default radius
    else if (['kabupaten', 'kecamatan', 'kelurahan'].includes(zone.zone_level)) {
      const defaultRadius = zone.zone_level === 'kabupaten' ? 100 : 
                           zone.zone_level === 'kecamatan' ? 30 : 10;
      const radius = zone.radius_km > 5 ? zone.radius_km : defaultRadius;
      if (isWithinRadius(lat, lng, zone.latitude, zone.longitude, radius)) {
        return { valid: true, matchedZone: zone.zone_name };
      }
    }
    // For explicit radius zones, use the specified radius
    else if (zone.zone_level === 'radius') {
      if (isWithinRadius(lat, lng, zone.latitude, zone.longitude, zone.radius_km)) {
        return { valid: true, matchedZone: zone.zone_name };
      }
    }
  }

  const zoneNames = zones.map(z => z.zone_name).join(', ');
  return { 
    valid: false, 
    message: `Lokasi di luar area yang ditentukan (${zoneNames})`
  };
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
