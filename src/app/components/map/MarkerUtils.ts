/**
 * Utility functions for handling markers on the map
 */

interface PositionCount {
  [key: string]: number;
}

// Track positions that have been used to detect overlaps
const positionCounts: PositionCount = {};

/**
 * Generates a position key from latitude and longitude
 * @param lat Latitude
 * @param lng Longitude
 * @returns A string key representing the position
 */
export const getPositionKey = (lat: number, lng: number): string => {
  // Use 6 decimal places for precision (about 10cm)
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
};

/**
 * Calculates an offset position for markers that share the same coordinates
 * Arranges overlapping markers in a circular pattern
 * 
 * @param lat Original latitude
 * @param lng Original longitude
 * @returns Adjusted [latitude, longitude] coordinates
 */
export const getOffsetPosition = (lat: number, lng: number): [number, number] => {
  const key = getPositionKey(lat, lng);
  
  // If this is the first marker at this position, no offset needed
  if (!positionCounts[key]) {
    positionCounts[key] = 1;
    return [lat, lng];
  }
  
  // Count this marker
  positionCounts[key]++;
  const count = positionCounts[key];
  
  // Calculate offset based on count (spiral pattern)
  // Using a larger offset to make markers easier to click
  const angle = (count - 1) * (2 * Math.PI / 8); // Divide circle into segments
  
  // Increase the base radius to make markers more spaced out
  // 0.0003 is approximately 30 meters, which should make markers more clickable
  const radius = 0.0003 * Math.ceil(count / 8); // Increase radius for each complete circle
  
  // Calculate new position
  const offsetLat = lat + radius * Math.sin(angle);
  const offsetLng = lng + radius * Math.cos(angle);
  
  // Log offset calculation for debugging
  console.log(`Position offset: Original: [${lat}, ${lng}], Offset: [${offsetLat}, ${offsetLng}], Count: ${count}`);
  
  return [offsetLat, offsetLng];
};

/**
 * Resets the position counts (useful when component unmounts or map recenters)
 */
export const resetPositionCounts = (): void => {
  for (const key in positionCounts) {
    delete positionCounts[key];
  }
}; 