'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, MapPin, Image, BarChart3, Map } from 'lucide-react';
import { defaultGeoJSONStyle, highlightGeoJSONStyle } from '@/lib/geo/indonesia';
import { DEFAULT_BASEMAP } from '@/lib/map/config';

// Local GeoJSON file for provinces
const PROVINCES_GEOJSON_URL = '/geo/provinces.geojson';

// Province ID mapping (from zone name to prov_id in GeoJSON)
const PROVINCE_IDS: Record<string, string> = {
  'provinsi aceh': '11',
  'aceh': '11',
  'provinsi sumatera utara': '12',
  'sumatera utara': '12',
  'provinsi sumatera barat': '13',
  'sumatera barat': '13',
};

interface Submission {
  id: string;
  latitude: number;
  longitude: number;
  caption: string;
  media_url: string;
  media_type: string;
  address: string;
  status: string;
  location_uncertain?: boolean;
}

interface MapLayer {
  id: string;
  layer_name: string;
  layer_type: string;
  source_url: string;
  opacity: number;
  is_default_on: boolean;
  bounds_north?: number;
  bounds_south?: number;
  bounds_east?: number;
  bounds_west?: number;
}

interface Zone {
  zone_name: string;
  latitude: number;
  longitude: number;
  zone_level: string;
}

interface ProjectMapViewProps {
  submissions: Submission[];
  layers?: MapLayer[];
  zones?: Zone[];
  center?: { lat: number; lng: number };
  onMarkerClick?: (submission: Submission) => void;
}

export default function ProjectMapView({ submissions, layers = [], zones = [], center, onMarkerClick }: ProjectMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  
  const [showSubmissions, setShowSubmissions] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const boundaryLayer = useRef<L.GeoJSON | null>(null);

  // Initialize active layers from defaults
  useEffect(() => {
    const defaults = new Set(layers.filter(l => l.is_default_on).map(l => l.id));
    setActiveLayers(defaults);
  }, [layers]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Calculate center from zones or use default
    let mapCenter: [number, number] = [0.5, 101.5]; // Center of Sumatra
    
    // Filter valid zones with coordinates
    const validZones = zones.filter(z => z.latitude && z.longitude && !isNaN(z.latitude) && !isNaN(z.longitude));
    
    if (center && !isNaN(center.lat) && !isNaN(center.lng)) {
      mapCenter = [center.lat, center.lng];
    } else if (validZones.length > 0) {
      const avgLat = validZones.reduce((sum, z) => sum + z.latitude, 0) / validZones.length;
      const avgLng = validZones.reduce((sum, z) => sum + z.longitude, 0) / validZones.length;
      if (!isNaN(avgLat) && !isNaN(avgLng)) {
        mapCenter = [avgLat, avgLng];
      }
    }

    const map = L.map(mapRef.current).setView(mapCenter, 7);
    
    // Grey basemap - no API key needed
    L.tileLayer(DEFAULT_BASEMAP.url, {
      attribution: DEFAULT_BASEMAP.attribution,
      subdomains: DEFAULT_BASEMAP.subdomains,
      maxZoom: DEFAULT_BASEMAP.maxZoom,
    }).addTo(map);

    markersLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    // Load GeoJSON boundaries for zones
    const loadBoundaries = async () => {
      if (validZones.length === 0) return;
      
      // Get province IDs from zone names
      const provinceIds = validZones
        .filter(z => z.zone_level === 'provinsi')
        .map(z => PROVINCE_IDS[z.zone_name.toLowerCase()])
        .filter(Boolean);
      
      if (provinceIds.length === 0) {
        // Fallback to circles if no province IDs found
        validZones.forEach(zone => {
          const radius = zone.zone_level === 'provinsi' ? 80000 : 
                         zone.zone_level === 'kabupaten' ? 30000 : 15000;
          L.circle([zone.latitude, zone.longitude], {
            radius, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 2
          }).addTo(map).bindPopup(`<b>${zone.zone_name}</b><br/>${zone.zone_level}`);
        });
        return;
      }
      
      try {
        const res = await fetch(PROVINCES_GEOJSON_URL);
        const geojson = await res.json();
        
        // Check if map still exists
        if (!mapInstance.current) return;
        
        if (!geojson?.features) {
          console.log('No GeoJSON features found');
          return;
        }
        
        console.log('Province IDs to filter:', provinceIds);
        
        // Filter features by prov_id
        const filteredFeatures = geojson.features.filter((f: any) => {
          const provId = f.properties?.prov_id;
          return provinceIds.includes(provId);
        });
        
        console.log('Filtered features:', filteredFeatures.length);
        
        if (filteredFeatures.length === 0 || !mapInstance.current) {
          // Fallback to circles
          if (mapInstance.current) {
            validZones.forEach(zone => {
              const radius = zone.zone_level === 'provinsi' ? 80000 : 
                             zone.zone_level === 'kabupaten' ? 30000 : 15000;
              L.circle([zone.latitude, zone.longitude], {
                radius, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 2
              }).addTo(mapInstance.current!).bindPopup(`<b>${zone.zone_name}</b><br/>${zone.zone_level}`);
            });
          }
          return;
        }
        
        const filteredGeoJSON = { ...geojson, features: filteredFeatures };
        
        // Check map still exists before adding layer
        if (!mapInstance.current) return;
        
        boundaryLayer.current = L.geoJSON(filteredGeoJSON, {
          style: () => defaultGeoJSONStyle,
          onEachFeature: (feature, layer) => {
            const name = feature.properties?.name || 'Unknown';
            layer.bindPopup(`<b>${name}</b><br/>Provinsi`);
            
            layer.on({
              mouseover: (e) => {
                const l = e.target;
                l.setStyle(highlightGeoJSONStyle);
                l.bringToFront();
              },
              mouseout: (e) => {
                boundaryLayer.current?.resetStyle(e.target);
              }
            });
          }
        }).addTo(mapInstance.current);
        
        // Fit map to boundaries
        const bounds = boundaryLayer.current.getBounds();
        if (bounds.isValid() && mapInstance.current) {
          mapInstance.current.fitBounds(bounds, { padding: [20, 20] });
        }
      } catch (err) {
        console.error('Failed to load GeoJSON boundaries:', err);
        // Fallback to circles - check map exists
        if (mapInstance.current) {
          validZones.forEach(zone => {
            const radius = zone.zone_level === 'provinsi' ? 80000 : 
                           zone.zone_level === 'kabupaten' ? 30000 : 15000;
            L.circle([zone.latitude, zone.longitude], {
              radius, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 2
            }).addTo(mapInstance.current!).bindPopup(`<b>${zone.zone_name}</b><br/>${zone.zone_level}`);
          });
        }
      }
    };
    
    loadBoundaries();

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [zones, center]);

  // Update markers when submissions change
  useEffect(() => {
    if (!markersLayer.current || !showSubmissions) {
      markersLayer.current?.clearLayers();
      return;
    }

    markersLayer.current.clearLayers();
    
    const approvedSubs = submissions.filter(s => s.status === 'approved');
    
    approvedSubs.forEach(sub => {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="w-6 h-6 rounded-full ${sub.location_uncertain ? 'bg-orange-500' : 'bg-blue-500'} border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">
          ${sub.media_type === 'video' ? '▶' : '📷'}
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([sub.latitude, sub.longitude], { icon })
        .bindPopup(`
          <div class="max-w-xs">
            <img src="${sub.media_url}" class="w-full h-24 object-cover rounded mb-2" />
            <p class="text-sm">${sub.caption.substring(0, 100)}...</p>
            <p class="text-xs text-gray-500 mt-1">${sub.address}</p>
          </div>
        `);
      
      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(sub));
      }
      
      markersLayer.current?.addLayer(marker);
    });
  }, [submissions, showSubmissions, onMarkerClick]);

  const toggleLayer = (layerId: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  };

  return (
    <div className="relative">
      {/* Map Container */}
      <div ref={mapRef} className="h-[400px] md:h-[500px] rounded-2xl overflow-hidden" />
      
      {/* Layer Control Panel */}
      <div className="absolute top-3 right-3 z-[1000]">
        <button onClick={() => setShowLayerPanel(!showLayerPanel)}
          className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50">
          <Layers size={20} className="text-gray-700" />
        </button>
        
        {showLayerPanel && (
          <div className="absolute top-12 right-0 w-64 bg-white rounded-xl shadow-xl p-3 space-y-2">
            <p className="text-sm font-semibold text-gray-700 mb-2">Layer Peta</p>
            
            {/* Boundary Layer */}
            <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input type="checkbox" checked={showBoundaries} onChange={e => {
                setShowBoundaries(e.target.checked);
                if (boundaryLayer.current && mapInstance.current) {
                  if (e.target.checked) boundaryLayer.current.addTo(mapInstance.current);
                  else boundaryLayer.current.remove();
                }
              }} />
              <Map size={16} className="text-green-600" />
              <span className="text-sm text-gray-800">Batas Wilayah</span>
            </label>
            
            {/* Submissions Layer */}
            <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input type="checkbox" checked={showSubmissions} onChange={e => setShowSubmissions(e.target.checked)} />
              <MapPin size={16} className="text-blue-600" />
              <span className="text-sm text-gray-800">Kontribusi Warga</span>
              <span className="ml-auto text-xs text-gray-500">{submissions.filter(s => s.status === 'approved').length}</span>
            </label>
            
            {/* Custom Layers */}
            {layers.map(layer => (
              <label key={layer.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <input type="checkbox" checked={activeLayers.has(layer.id)} onChange={() => toggleLayer(layer.id)} />
                {layer.layer_type === 'orthophoto' && <Image size={16} className="text-green-600" />}
                {layer.layer_type === 'analysis' && <BarChart3 size={16} className="text-purple-600" />}
                <span className="text-sm text-gray-800">{layer.layer_name}</span>
              </label>
            ))}
            
            {layers.length === 0 && (
              <p className="text-xs text-gray-500 p-2">Belum ada layer tambahan</p>
            )}
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur rounded-lg p-2 text-xs text-gray-800">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span className="text-gray-800">Lokasi Pasti</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          <span className="text-gray-800">Lokasi Perkiraan</span>
        </div>
      </div>
    </div>
  );
}
