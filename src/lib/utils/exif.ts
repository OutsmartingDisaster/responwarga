/**
 * Extract GPS coordinates from image EXIF data
 */

interface ExifGPS {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp?: Date;
}

// Convert DMS (degrees, minutes, seconds) to decimal degrees
function dmsToDecimal(dms: number[], ref: string): number {
  const [degrees, minutes, seconds] = dms;
  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (ref === 'S' || ref === 'W') decimal = -decimal;
  return decimal;
}

// Read EXIF data from ArrayBuffer
function readExifFromBuffer(buffer: ArrayBuffer): ExifGPS | null {
  const view = new DataView(buffer);
  
  // Check for JPEG SOI marker
  if (view.getUint16(0) !== 0xFFD8) return null;
  
  let offset = 2;
  while (offset < view.byteLength) {
    const marker = view.getUint16(offset);
    
    // APP1 marker (EXIF)
    if (marker === 0xFFE1) {
      const length = view.getUint16(offset + 2);
      const exifOffset = offset + 4;
      
      // Check for "Exif\0\0"
      const exifHeader = String.fromCharCode(
        view.getUint8(exifOffset),
        view.getUint8(exifOffset + 1),
        view.getUint8(exifOffset + 2),
        view.getUint8(exifOffset + 3)
      );
      
      if (exifHeader === 'Exif') {
        return parseExifData(buffer, exifOffset + 6);
      }
    }
    
    // Move to next marker
    if ((marker & 0xFF00) !== 0xFF00) break;
    const segmentLength = view.getUint16(offset + 2);
    offset += 2 + segmentLength;
  }
  
  return null;
}

function parseExifData(buffer: ArrayBuffer, tiffOffset: number): ExifGPS | null {
  const view = new DataView(buffer);
  
  // Check byte order (II = little endian, MM = big endian)
  const byteOrder = view.getUint16(tiffOffset);
  const littleEndian = byteOrder === 0x4949;
  
  // Get IFD0 offset
  const ifd0Offset = view.getUint32(tiffOffset + 4, littleEndian);
  
  // Find GPS IFD pointer in IFD0
  const numEntries = view.getUint16(tiffOffset + ifd0Offset, littleEndian);
  let gpsIfdOffset = 0;
  
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = tiffOffset + ifd0Offset + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);
    
    // GPS IFD Pointer tag (0x8825)
    if (tag === 0x8825) {
      gpsIfdOffset = view.getUint32(entryOffset + 8, littleEndian);
      break;
    }
  }
  
  if (!gpsIfdOffset) return null;
  
  // Parse GPS IFD
  const gpsEntries = view.getUint16(tiffOffset + gpsIfdOffset, littleEndian);
  let latRef = '', lonRef = '';
  let latDms: number[] = [], lonDms: number[] = [];
  
  for (let i = 0; i < gpsEntries; i++) {
    const entryOffset = tiffOffset + gpsIfdOffset + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);
    const valueOffset = view.getUint32(entryOffset + 8, littleEndian);
    
    switch (tag) {
      case 0x0001: // GPSLatitudeRef
        latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
        break;
      case 0x0002: // GPSLatitude
        latDms = readRational(view, tiffOffset + valueOffset, littleEndian, 3);
        break;
      case 0x0003: // GPSLongitudeRef
        lonRef = String.fromCharCode(view.getUint8(entryOffset + 8));
        break;
      case 0x0004: // GPSLongitude
        lonDms = readRational(view, tiffOffset + valueOffset, littleEndian, 3);
        break;
    }
  }
  
  if (latDms.length === 3 && lonDms.length === 3 && latRef && lonRef) {
    return {
      latitude: dmsToDecimal(latDms, latRef),
      longitude: dmsToDecimal(lonDms, lonRef)
    };
  }
  
  return null;
}

function readRational(view: DataView, offset: number, littleEndian: boolean, count: number): number[] {
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const num = view.getUint32(offset + i * 8, littleEndian);
    const den = view.getUint32(offset + i * 8 + 4, littleEndian);
    values.push(num / den);
  }
  return values;
}

/**
 * Extract GPS coordinates from an image file
 */
export async function extractGPSFromImage(file: File): Promise<ExifGPS | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const gps = readExifFromBuffer(buffer);
        resolve(gps);
      } catch (err) {
        console.error('EXIF parse error:', err);
        resolve(null);
      }
    };
    
    reader.onerror = () => resolve(null);
    
    // Only read first 128KB for EXIF (it's always at the beginning)
    const slice = file.slice(0, 128 * 1024);
    reader.readAsArrayBuffer(slice);
  });
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`
    );
    const data = await res.json();
    return data.display_name || '';
  } catch {
    return '';
  }
}
