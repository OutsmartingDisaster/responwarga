/**
 * Indonesia Administrative GeoJSON utilities
 * Source: https://github.com/JfrAziz/indonesia-district
 */

// Province codes mapping (multiple variations for matching)
export const PROVINCE_CODES: Record<string, string> = {
  'aceh': 'ID11',
  'provinsi aceh': 'ID11',
  'sumatera utara': 'ID12',
  'provinsi sumatera utara': 'ID12',
  'sumatera barat': 'ID13',
  'provinsi sumatera barat': 'ID13',
  'riau': 'id14',
  'jambi': 'id15',
  'sumatera selatan': 'id16',
  'bengkulu': 'id17',
  'lampung': 'id18',
  'kepulauan bangka belitung': 'id19',
  'kepulauan riau': 'id21',
  'dki jakarta': 'id31',
  'jawa barat': 'id32',
  'jawa tengah': 'id33',
  'di yogyakarta': 'id34',
  'jawa timur': 'id35',
  'banten': 'id36',
  'bali': 'id51',
  'nusa tenggara barat': 'id52',
  'nusa tenggara timur': 'id53',
  'kalimantan barat': 'id61',
  'kalimantan tengah': 'id62',
  'kalimantan selatan': 'id63',
  'kalimantan timur': 'id64',
  'kalimantan utara': 'id65',
  'sulawesi utara': 'id71',
  'sulawesi tengah': 'id72',
  'sulawesi selatan': 'id73',
  'sulawesi tenggara': 'id74',
  'gorontalo': 'id75',
  'sulawesi barat': 'id76',
  'maluku': 'id81',
  'maluku utara': 'id82',
  'papua barat': 'id91',
  'papua': 'id94',
};

// Reverse mapping
export const PROVINCE_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(PROVINCE_CODES).map(([name, code]) => [code, name])
);

// Base URL for GeoJSON files
const GEOJSON_BASE_URL = 'https://raw.githubusercontent.com/JfrAziz/indonesia-district/master';

/**
 * Get GeoJSON URL for a province
 */
export function getProvinceGeoJSONUrl(provinceCode: string): string {
  const code = provinceCode.toLowerCase().replace('id', '');
  const name = PROVINCE_NAMES[`id${code}`]?.replace(/ /g, '_') || '';
  return `${GEOJSON_BASE_URL}/id${code}_${name}/kab.geojson`;
}

/**
 * Get simplified provinces GeoJSON (all Indonesia)
 */
export function getProvincesGeoJSONUrl(): string {
  return `${GEOJSON_BASE_URL}/prov%2037%20simplified.geojson`;
}

/**
 * Get kabupaten GeoJSON URL
 */
export function getKabupatenGeoJSONUrl(): string {
  return `${GEOJSON_BASE_URL}/kab%2037.geojson`;
}

/**
 * Fetch GeoJSON data with caching
 */
const geoJSONCache: Record<string, any> = {};

export async function fetchGeoJSON(url: string): Promise<any> {
  if (geoJSONCache[url]) return geoJSONCache[url];
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
    const data = await res.json();
    geoJSONCache[url] = data;
    return data;
  } catch (err) {
    console.error('GeoJSON fetch error:', err);
    return null;
  }
}

/**
 * Filter GeoJSON features by province codes
 */
export function filterByProvinceCodes(geojson: any, codes: string[]): any {
  if (!geojson?.features) return geojson;
  
  const normalizedCodes = codes.map(c => c.toLowerCase());
  
  return {
    ...geojson,
    features: geojson.features.filter((f: any) => {
      const propCode = f.properties?.ADM1_PCODE?.toLowerCase() || 
                       f.properties?.prov_code?.toLowerCase() ||
                       f.properties?.kode?.toLowerCase() || '';
      return normalizedCodes.some(code => propCode.includes(code.replace('id', '')));
    })
  };
}

/**
 * Get province code from name
 */
export function getProvinceCode(name: string): string | null {
  const normalized = name.toLowerCase()
    .replace('provinsi ', '')
    .replace('prov. ', '')
    .replace('prov ', '')
    .trim();
  
  return PROVINCE_CODES[normalized] || null;
}

/**
 * Style for GeoJSON layers
 */
export const defaultGeoJSONStyle = {
  color: '#3b82f6',
  weight: 2,
  opacity: 0.8,
  fillColor: '#3b82f6',
  fillOpacity: 0.1,
};

export const highlightGeoJSONStyle = {
  color: '#2563eb',
  weight: 3,
  opacity: 1,
  fillColor: '#3b82f6',
  fillOpacity: 0.2,
};
