"use client";

import React, { useEffect, useRef } from 'react';
import {
    Clock,
    Users,
    MapPin
} from 'lucide-react';

// Create a simple map component that works reliably
export const LiveMap = ({ center, zoom = 15, markers = [] }: { center: [number, number], zoom?: number, markers?: any[] }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const vectorSourceRef = useRef<any>(null);

    // Validate center coordinates
    const safeCenter: [number, number] = Array.isArray(center) && center.length === 2 && 
        typeof center[0] === 'number' && typeof center[1] === 'number' &&
        !isNaN(center[0]) && !isNaN(center[1])
        ? center 
        : [106.8456, -6.2088]; // Default to Jakarta

    useEffect(() => {
        const initMap = async () => {
            if (!mapContainerRef.current) {
                console.error('Map container not found');
                return;
            }

            try {
                console.log('Starting map initialization...');
                
                // Dynamically import OpenLayers modules to avoid SSR issues
                const { default: Map } = await import('ol/Map');
                const { default: View } = await import('ol/View');
                const { default: TileLayer } = await import('ol/layer/Tile');
                const { default: XYZ } = await import('ol/source/XYZ');
                const { default: VectorLayer } = await import('ol/layer/Vector');
                const { default: VectorSource } = await import('ol/source/Vector');
                const { fromLonLat } = await import('ol/proj');
                const { default: Feature } = await import('ol/Feature');
                const { default: Point } = await import('ol/geom/Point');
                const { default: Style } = await import('ol/style/Style');
                const { default: Icon } = await import('ol/style/Icon');

                // Import CSS
                await import('ol/ol.css');

                console.log('OpenLayers modules imported successfully');

                // Clear container
                mapContainerRef.current.innerHTML = '';

                // Create Vector Source for markers
                const vectorSource = new VectorSource();
                vectorSourceRef.current = vectorSource;

                // Create Vector Layer for markers
                const vectorLayer = new VectorLayer({
                    source: vectorSource,
                    style: new Style({
                        image: new Icon({
                            anchor: [0.5, 1],
                            src: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                            scale: 1
                        })
                    })
                });

                console.log('Initializing map with center:', safeCenter, 'zoom:', zoom);

                // Create Map
                const map = new Map({
                    target: mapContainerRef.current,
                    layers: [
                        // Grey basemap - no API key needed
                        new TileLayer({
                            source: new XYZ({
                                url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                                attributions: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            })
                        }),
                        vectorLayer
                    ],
                    view: new View({
                        center: fromLonLat(safeCenter),
                        zoom: zoom
                    }),
                    controls: []
                });

                mapInstanceRef.current = map;

                // Add initial markers
                updateMarkers(vectorSource, markers, Feature, Point, fromLonLat);

                console.log('OpenLayers Map initialized successfully');
                console.log('Map size:', map.getSize());

                // Force map to render
                setTimeout(() => {
                    map.updateSize();
                    console.log('Map size updated:', map.getSize());
                }, 100);

            } catch (error) {
                console.error('Failed to initialize OpenLayers map:', error);
                // Show fallback UI
                if (mapContainerRef.current) {
                    mapContainerRef.current.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-size: 14px;">Map loading failed. Please check console for details.</div>';
                }
            }
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.setTarget(undefined);
                mapInstanceRef.current = null;
            }
        };
    }, []); // Run once on mount

    // Update markers when they change
    useEffect(() => {
        if (vectorSourceRef.current) {
            const update = async () => {
                const { default: Feature } = await import('ol/Feature');
                const { default: Point } = await import('ol/geom/Point');
                const { fromLonLat } = await import('ol/proj');
                updateMarkers(vectorSourceRef.current, markers, Feature, Point, fromLonLat);
            };
            update();
        }
    }, [markers]);

    // Update view when center/zoom changes
    useEffect(() => {
        if (mapInstanceRef.current) {
            const updateView = async () => {
                const { fromLonLat } = await import('ol/proj');
                const view = mapInstanceRef.current.getView();
                view.setCenter(fromLonLat(safeCenter));
                view.setZoom(zoom);
            };
            updateView();
        }
    }, [safeCenter, zoom]);

    const updateMarkers = (source: any, markers: any[], Feature: any, Point: any, fromLonLat: any) => {
        source.clear();

        // Add Center Marker
        const centerFeature = new Feature({
            geometry: new Point(fromLonLat(safeCenter)),
            name: 'Center'
        });
        source.addFeature(centerFeature);

        // Add other markers
        markers.forEach((marker: any) => {
            if (marker.latitude && marker.longitude) {
                const feature = new Feature({
                    geometry: new Point(fromLonLat([Number(marker.longitude), Number(marker.latitude)])),
                    name: marker.name || 'Location',
                    ...marker
                });
                source.addFeature(feature);
            }
        });
    };

    return (
        <div className="w-full h-full relative bg-slate-900">
            <div
                ref={mapContainerRef}
                className="w-full h-full"
                style={{
                    height: '100%',
                    width: '100%',
                    backgroundColor: '#1e293b',
                    borderRadius: '0.75rem',
                    overflow: 'hidden', // Important for OpenLayers
                    minHeight: '400px' // Ensure minimum height
                }}
            />
        </div>
    );
};

export const Badge = ({ children, color }: { children: React.ReactNode, color: string }) => {
    const colors: Record<string, string> = {
        red: "bg-red-500/10 text-red-400 border-red-500/20",
        green: "bg-green-500/10 text-green-400 border-green-500/20",
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors[color] || colors.slate} uppercase tracking-wider`}>
            {children}
        </span>
    );
};

export const SummaryCard = ({ icon: Icon, label, value, trend, trendVal, color }: any) => (
    <div className="relative overflow-hidden bg-slate-800/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl group hover:border-white/10 transition-all duration-300">
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity ${color}`} />
        <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-lg bg-slate-900/50 border border-white/5 ${color.replace('bg-', 'text-')}`}>
                <Icon size={20} />
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-slate-900/50 border border-white/5 ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    {trend === 'up' ? '↗' : '↘'} {trendVal}
                </div>
            )}
        </div>
        <div>
            <h3 className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</h3>
            <p className="text-slate-400 text-sm font-medium">{label}</p>
        </div>
    </div>
);

export const TaskQueueItem = ({ title, type, time, crew, location, status, priority }: any) => (
    <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 hover:border-white/10 p-4 rounded-xl transition-all mb-3">
        <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${priority === 'URGENT' ? 'bg-red-500' : 'bg-yellow-500'}`} />
        <div className="pl-4">
            <div className="flex items-center gap-2 mb-1">
                <Badge color={priority === 'URGENT' ? 'red' : 'orange'}>{priority}</Badge>
                <span className="text-xs text-slate-500 font-mono">{type}</span>
            </div>
            <h4 className="text-white font-semibold text-base mb-1">{title}</h4>
            <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
                <span className="flex items-center gap-1"><Users size={12} /> {crew}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {location}</span>
            </div>
        </div>
        <div className="flex items-center gap-3 pl-4 sm:pl-0">
            {status === 'Unassigned' ? (
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-blue-600/20">
                    Tugaskan
                </button>
            ) : (
                <div className="text-xs font-medium text-green-400 text-right px-2">
                    {status}
                </div>
            )}
        </div>
    </div>
);
