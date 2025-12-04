/**
 * Map Configuration - Custom Grey Basemap
 * Uses CartoDB Positron (free, no API key required)
 */

// Grey basemap options (all free, no API key needed)
export const BASEMAPS = {
  // Light grey - good for data visualization
  grey: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  // Dark grey - for dark mode
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  // Voyager - subtle colors
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  // OSM default (fallback)
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abc',
    maxZoom: 19,
  },
} as const;

// Default basemap for the app
export const DEFAULT_BASEMAP = BASEMAPS.grey;

// Dark mode basemap
export const DARK_BASEMAP = BASEMAPS.dark;

// Default map settings
export const MAP_DEFAULTS = {
  center: { lat: -2.5, lng: 118 } as const, // Center of Indonesia
  zoom: 5,
  minZoom: 3,
  maxZoom: 19,
};

// Marker icon URLs (CDN, no local files needed)
export const MARKER_ICONS = {
  default: {
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41] as [number, number],
    iconAnchor: [12, 41] as [number, number],
    popupAnchor: [1, -34] as [number, number],
    shadowSize: [41, 41] as [number, number],
  },
};

// Helper to get tile layer props for react-leaflet
export function getTileLayerProps(theme: 'grey' | 'dark' | 'voyager' | 'osm' = 'grey') {
  const basemap = BASEMAPS[theme];
  return {
    url: basemap.url,
    attribution: basemap.attribution,
    subdomains: basemap.subdomains,
    maxZoom: basemap.maxZoom,
  };
}
