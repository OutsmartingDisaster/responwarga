'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertTriangle, RefreshCw, Layers, Image } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import for map to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const ImageOverlay = dynamic(() => import('react-leaflet').then(mod => mod.ImageOverlay), { ssr: false });

interface Task {
  id: string;
  report_id: string;
  report_description: string;
  report_lat: number;
  report_lng: number;
  status: string;
  priority: string;
  operation_name: string;
  assigned_at: string;
}

interface Orthophoto {
  id: string;
  name: string;
  disaster_type: string;
  capture_date: string;
  thumbnail_path: string;
  bounds_west: number;
  bounds_east: number;
  bounds_south: number;
  bounds_north: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  normal: '#3b82f6',
  low: '#6b7280',
};

export default function TaskMap() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orthophotos, setOrthophotos] = useState<Orthophoto[]>([]);
  const [activeOrtho, setActiveOrtho] = useState<string | null>(null);
  const [showOrthoPanel, setShowOrthoPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchTasks();
    getUserLocation();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/my-assignments');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const tasksWithCoords = (result.data || []).filter(
        (t: Task) => t.report_lat && t.report_lng && t.status !== 'completed'
      );
      setTasks(tasksWithCoords);
      
      // Fetch orthophotos for task locations
      if (tasksWithCoords.length > 0) {
        const firstTask = tasksWithCoords[0];
        fetchOrthophotos(firstTask.report_lat, firstTask.report_lng);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrthophotos = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/orthophotos/available?lat=${lat}&lng=${lng}`);
      const result = await res.json();
      if (res.ok) setOrthophotos(result.data || []);
    } catch (err) {
      console.error('Failed to fetch orthophotos:', err);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => console.log('Location access denied')
      );
    }
  };

  const selectedOrtho = orthophotos.find(o => o.id === activeOrtho);

  // Calculate map center
  const getMapCenter = (): [number, number] => {
    if (userLocation) return userLocation;
    if (tasks.length > 0) return [tasks[0].report_lat, tasks[0].report_lng];
    return [-2.5, 118]; // Indonesia center
  };

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <MapPin className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Peta Tugas</h3>
            <p className="text-xs text-slate-400">{tasks.length} tugas aktif</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {orthophotos.length > 0 && (
            <button onClick={() => setShowOrthoPanel(!showOrthoPanel)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                activeOrtho ? 'bg-green-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'
              }`}>
              <Layers className="w-4 h-4" />
              {activeOrtho ? 'Ortho On' : 'Layers'}
            </button>
          )}
          <button onClick={fetchTasks} disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-lg">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Orthophoto Panel */}
      {showOrthoPanel && orthophotos.length > 0 && (
        <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Available Orthophotos</span>
            {activeOrtho && (
              <button onClick={() => setActiveOrtho(null)} className="text-xs text-red-400 hover:text-red-300">
                Clear
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {orthophotos.map(ortho => (
              <button
                key={ortho.id}
                onClick={() => setActiveOrtho(activeOrtho === ortho.id ? null : ortho.id)}
                className={`flex-shrink-0 p-2 rounded-lg border transition-all ${
                  activeOrtho === ortho.id
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-white/10 bg-slate-700/50 hover:bg-slate-700'
                }`}
              >
                <div className="w-16 h-12 bg-slate-600 rounded mb-1 flex items-center justify-center">
                  <Image className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-[10px] text-white truncate max-w-[64px]">{ortho.name}</p>
                <p className="text-[9px] text-slate-500">{ortho.disaster_type}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        {Object.entries(PRIORITY_COLORS).map(([priority, color]) => (
          <div key={priority} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-slate-400 capitalize">{priority}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden h-[400px]">
        {error ? (
          <div className="flex items-center justify-center h-full text-red-400">
            <AlertTriangle className="w-5 h-5 mr-2" /> {error}
          </div>
        ) : (
          <MapContainer
            center={getMapCenter()}
            zoom={tasks.length > 0 ? 12 : 5}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {tasks.map(task => (
              <Marker
                key={task.id}
                position={[task.report_lat, task.report_lng]}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold uppercase"
                        style={{ backgroundColor: PRIORITY_COLORS[task.priority] + '20', color: PRIORITY_COLORS[task.priority] }}>
                        {task.priority}
                      </span>
                      <span className="text-xs text-gray-500">{task.status}</span>
                    </div>
                    <p className="text-sm font-medium mb-2">{task.report_description || 'No description'}</p>
                    <p className="text-xs text-gray-500 mb-3">{task.operation_name}</p>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${task.report_lat},${task.report_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                    >
                      <Navigation className="w-3 h-3" /> Navigate
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Task List */}
      {tasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-400">Daftar Tugas</h4>
          {tasks.slice(0, 5).map(task => (
            <div key={task.id} className="bg-slate-800/30 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }} />
                <div>
                  <p className="text-sm text-white truncate max-w-[200px]">{task.report_description || 'No description'}</p>
                  <p className="text-xs text-slate-500">{task.operation_name}</p>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${task.report_lat},${task.report_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
              >
                <Navigation className="w-4 h-4 text-blue-400" />
              </a>
            </div>
          ))}
        </div>
      )}

      {tasks.length === 0 && !loading && (
        <div className="text-center py-8 text-slate-400">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Tidak ada tugas dengan lokasi</p>
        </div>
      )}
    </div>
  );
}
