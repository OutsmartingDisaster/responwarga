import React, { useState, useEffect, useRef } from 'react';
import { 
  Map, 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Menu, 
  Bell, 
  Search, 
  Settings, 
  LogOut,
  Navigation,
  Droplets,
  Flame,
  Camera,
  FileText,
  PhoneCall,
  X,
  ChevronRight,
  Filter,
  Users,
  Calendar,
  BarChart3,
  UserPlus,
  Download,
  Mail,
  Smartphone,
  MapPin,
  Trash2,
  Edit2,
  Shield,
  MoreHorizontal,
  ArrowLeft,
  Send,
  Save,
  Image as ImageIcon,
  LocateFixed,
  Maximize2,
  Mic,
  Wifi,
  WifiOff,
  Radio
} from 'lucide-react';

// --- OpenLayers Hook & Component ---
const useOpenLayers = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.ol) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/ol@v8.2.0/dist/ol.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/ol@v8.2.0/ol.css';
    document.head.appendChild(link);

    return () => {
      // Cleanup if needed
    };
  }, []);

  return loaded;
};

const LiveMap = ({ center, zoom = 15, markers = [] }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const olLoaded = useOpenLayers();

  useEffect(() => {
    if (!olLoaded || !mapRef.current) return;

    if (!mapInstance.current) {
      // Initialize Map
      mapInstance.current = new window.ol.Map({
        target: mapRef.current,
        layers: [
          new window.ol.layer.Tile({
            source: new window.ol.source.OSM({
              // Standard OSM
            })
          })
        ],
        view: new window.ol.View({
          center: window.ol.proj.fromLonLat(center), // [Lon, Lat]
          zoom: zoom
        }),
        controls: [] // Hide default controls for custom look
      });

      // Add Marker Layer
      const vectorSource = new window.ol.source.Vector();
      const vectorLayer = new window.ol.layer.Vector({
        source: vectorSource,
        style: new window.ol.style.Style({
          image: new window.ol.style.Circle({
            radius: 8,
            fill: new window.ol.style.Fill({ color: '#EF4444' }),
            stroke: new window.ol.style.Stroke({ color: '#fff', width: 2 })
          })
        })
      });
      mapInstance.current.addLayer(vectorLayer);

      // Add central marker
       const feature = new window.ol.Feature({
         geometry: new window.ol.geom.Point(window.ol.proj.fromLonLat(center))
       });
       vectorSource.addFeature(feature);
    } else {
        // Update view if props change (simple implementation)
        mapInstance.current.getView().setCenter(window.ol.proj.fromLonLat(center));
        mapInstance.current.getView().setZoom(zoom);
    }

  }, [olLoaded, center, zoom]);

  return (
    <div className="w-full h-full relative bg-slate-900 group">
      {!olLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
          Loading Map Engine...
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
      {/* Dark Mode Overlay for standard OSM tiles */}
      <div className="absolute inset-0 bg-slate-900/40 pointer-events-none mix-blend-multiply" />
      
      {/* Map Controls Overlay */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
         <button className="p-2 bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-700 transition-colors border border-white/10" title="Zoom In">
            <Maximize2 size={16} />
         </button>
      </div>
    </div>
  );
};

// --- Shared Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed, badge, theme = 'blue' }) => {
    const activeClass = theme === 'blue' 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
        : 'bg-orange-600 text-white shadow-lg shadow-orange-900/20';

    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-4 p-3 w-full rounded-xl transition-all duration-300 group relative overflow-hidden
            ${active 
            ? activeClass
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
        >
            <Icon size={20} className={`z-10 ${active ? 'animate-pulse-slow' : ''}`} />
            {!collapsed && (
            <span className="z-10 font-medium text-sm tracking-wide whitespace-nowrap opacity-100 transition-opacity flex-1 text-left">
                {label}
            </span>
            )}
            {!collapsed && badge && (
            <span className={`z-10 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ${theme === 'blue' ? 'bg-blue-800' : 'bg-orange-800'}`}>
                {badge}
            </span>
            )}
            {active && (
            <div className={`absolute inset-0 z-0 bg-gradient-to-r ${theme === 'blue' ? 'from-blue-600 to-blue-500' : 'from-orange-600 to-orange-500'}`} />
            )}
        </button>
    );
};

const Badge = ({ children, color }) => {
  const colors = {
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

// --- Admin Dashboard Components ---

const SummaryCard = ({ icon: Icon, label, value, trend, trendVal, color }) => (
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

const TaskQueueItem = ({ title, type, time, crew, location, status, priority }) => (
  <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 hover:border-white/10 p-4 rounded-xl transition-all mb-3">
    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${priority === 'URGENT' ? 'bg-red-500' : 'bg-yellow-500'}`} />
    <div className="pl-4">
      <div className="flex items-center gap-2 mb-1">
        <Badge color={priority === 'URGENT' ? 'red' : 'orange'}>{priority}</Badge>
        <span className="text-xs text-slate-500 font-mono">{type}</span>
      </div>
      <h4 className="text-white font-semibold text-base mb-1">{title}</h4>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1"><Clock size={12}/> {time}</span>
        <span className="flex items-center gap-1"><Users size={12}/> {crew}</span>
        <span className="flex items-center gap-1"><MapPin size={12}/> {location}</span>
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

// --- Responder Components ---

const ResponderTaskCard = ({ title, priority, distance, time, crew, desc, onAction }) => (
  <div onClick={onAction} className="bg-slate-800/60 backdrop-blur-md border border-white/5 hover:bg-slate-800 hover:border-white/20 p-5 rounded-2xl cursor-pointer transition-all group relative overflow-hidden active:scale-95 duration-200">
    <div className={`absolute top-0 left-0 w-1.5 h-full ${priority === 'URGENT' ? 'bg-red-500' : 'bg-orange-500'}`} />
    <div className="pl-4">
      <div className="flex justify-between items-start mb-2">
        <Badge color={priority === 'URGENT' ? 'red' : 'orange'}>{priority}</Badge>
        <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">{title}</h3>
      <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-3">
        <span className="flex items-center gap-1"><MapPin size={12} /> {distance}</span>
        <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
        <span className="flex items-center gap-1"><Users size={12} /> {crew}</span>
      </div>
      <p className="text-sm text-slate-400 mb-4 line-clamp-2">{desc}</p>
      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-white/5 transition-colors">
          <Camera size={16} /> Unggah Bukti
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white rounded-lg text-xs font-medium border border-orange-500/20 hover:border-orange-500 transition-colors">
           {priority === 'URGENT' ? 'Selesai' : 'Proses'}
        </button>
      </div>
    </div>
  </div>
);

const LogEntry = ({ time, title, location, desc, photos, duration }) => (
  <div className="flex gap-4 p-4 rounded-xl bg-slate-800/20 border border-white/5 hover:bg-slate-800/40 transition-all">
    <div className="flex flex-col items-center">
      <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300">
        {time.split(':')[0]}
      </div>
      <div className="w-0.5 h-full bg-white/5 my-2"></div>
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-start mb-1">
        <h4 className="text-white font-bold">{time} - {title}</h4>
        <div className="flex gap-2">
          <button className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"><Edit2 size={14} /></button>
          <button className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
        <span className="flex items-center gap-1"><MapPin size={12} /> {location}</span>
        <span className="flex items-center gap-1"><Clock size={12} /> {duration}</span>
      </div>
      <p className="text-sm text-slate-300 mb-3">{desc}</p>
      {photos > 0 && (
        <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded w-fit border border-blue-500/20">
          <Camera size={12} /> {photos} foto terlampir
        </div>
      )}
    </div>
  </div>
);


// --- Main App Component ---

export default function Dashboard() {
  const [currentPersona, setCurrentPersona] = useState('admin'); // 'admin' | 'responder'
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Responder Specific State
  const [isOffline, setIsOffline] = useState(false);
  const [isSOSActive, setIsSOSActive] = useState(false);

  useEffect(() => {
    setActiveTab('dashboard');
    // Reset states when switching persona
    if (currentPersona === 'admin') {
        setIsOffline(false);
    }
  }, [currentPersona]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSOS = () => {
    if (isSOSActive) {
        setIsSOSActive(false);
    } else {
        // In real app, this would require long press
        if (window.confirm("AKTIFKAN SOS? Lokasi anda akan disiarkan ke semua unit.")) {
            setIsSOSActive(true);
        }
    }
  };

  // --- Views ---

  const AdminDashboardView = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={FileText} label="Laporan Terbuka" value="12" trend="up" trendVal="+3" color="bg-blue-500" />
        <SummaryCard icon={Users} label="Personil Aktif" value="8/10" trend="up" trendVal="+2" color="bg-green-500" />
        <SummaryCard icon={CheckCircle2} label="Kontribusi" value="25" trend="up" trendVal="+5" color="bg-purple-500" />
        <SummaryCard icon={Clock} label="Rata-rata Respon" value="18m" trend="up" trendVal="-2m" color="bg-orange-500" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="relative bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden h-[450px]">
             <div className="absolute top-6 left-6 z-10 pointer-events-none bg-slate-900/80 p-3 rounded-xl backdrop-blur-md border border-white/10 shadow-2xl">
                <Badge color="blue">LIVE OPS</Badge>
                <h3 className="text-base font-bold text-white mt-2">Peta Respons Aktif</h3>
                <p className="text-xs text-slate-400">Jakarta Utara • 5 Insiden</p>
             </div>
             <LiveMap center={[106.8456, -6.1588]} zoom={12} />
             
             {/* Admin Legend Overlay */}
             <div className="absolute bottom-6 left-6 z-10 flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 rounded-lg border border-white/10 text-xs text-white">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Banjir
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 rounded-lg border border-white/10 text-xs text-white">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Kebakaran
                </div>
             </div>
          </div>
        </div>
        <div className="flex flex-col h-full bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">📋 Antrian Tugas <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">2</span></h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <TaskQueueItem title="Banjir Kelapa Gading" type="EVAKUASI" priority="URGENT" time="15m" crew="5" location="2km" status="Unassigned" />
            <TaskQueueItem title="Kebakaran Menteng" type="PEMADAM" priority="MEDIUM" time="25m" crew="2" location="5km" status="Tim A" />
            <TaskQueueItem title="Pohon Tumbang" type="BERSIH" priority="LOW" time="1h" crew="3" location="1km" status="Tim C" />
          </div>
        </div>
      </div>
    </div>
  );

  const ResponderDashboardView = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-24">
      {/* 2.1 Responder Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={FileText} label="Tugas" value="5" color="bg-slate-500" />
        <SummaryCard icon={CheckCircle2} label="Selesai" value="3" color="bg-green-500" />
        <SummaryCard icon={Clock} label="Respon" value="18m" color="bg-orange-500" />
        <SummaryCard icon={Users} label="Aktif" value="8/10" color="bg-blue-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 2.1 Map */}
        <div className="xl:col-span-2 relative bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden h-[400px]">
           <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur p-3 rounded-xl border border-white/10 max-w-xs shadow-xl">
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2"><MapPin size={14} className="text-blue-500"/> Lokasi Saat Ini</h3>
              <div className="space-y-1">
                <div className="text-xs text-slate-300 flex items-center gap-2">🚨 3 Tugas Aktif</div>
                <div className="text-xs text-slate-400">🛣️ Rute Optimal Ditampilkan</div>
              </div>
           </div>
           
           {/* Offline Indicator Overlay on Map */}
           {isOffline && (
             <div className="absolute inset-0 z-20 bg-slate-900/50 backdrop-grayscale flex items-center justify-center pointer-events-none">
                <div className="bg-yellow-500 text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-3 shadow-2xl border-2 border-slate-900">
                    <WifiOff size={24} />
                    OFFLINE MODE - CACHED MAP
                </div>
             </div>
           )}

           <div className="absolute bottom-4 right-4 z-10">
              <button className="bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-slate-200 transition-colors flex items-center gap-2">
                <Navigation size={14}/> Open in Google Maps
              </button>
           </div>
           <LiveMap center={[106.7890, -6.1234]} zoom={14} />
        </div>

        {/* 2.1 Task List */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex justify-between items-center">
            Tugas Saya (Prioritas)
            <button className="text-xs text-blue-400">Lihat Semua</button>
          </h3>
          <ResponderTaskCard 
            title="Banjir Kelapa Gading" 
            priority="URGENT" 
            distance="2.5km" 
            time="15 min" 
            crew="5 org" 
            desc="1 rumah terendam, 5 orang terjebak. Butuh evakuasi segera."
            onAction={() => setActiveTab('task-detail')}
          />
          <ResponderTaskCard 
            title="Kebakaran Menteng" 
            priority="MEDIUM" 
            distance="5.2km" 
            time="25 min" 
            crew="2 org" 
            desc="Kebakaran rumah 2 lantai. Tim pemadam tambahan."
            onAction={() => {}}
          />
        </div>
      </div>
      
      {/* Responder Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-4 z-50">
        <button className="w-14 h-14 rounded-full bg-slate-800 text-slate-300 border border-white/10 shadow-xl flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all">
            <Radio size={24} />
        </button>
        <button 
            onClick={toggleSOS}
            className={`w-16 h-16 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-95 transition-all border-4 border-slate-900 ${isSOSActive ? 'bg-red-600 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.5)]' : 'bg-red-500 hover:bg-red-600'}`}
        >
            <div className="flex flex-col items-center leading-none">
                <span className="font-black text-lg">SOS</span>
                {isSOSActive && <span className="text-[9px] font-bold">ACTIVE</span>}
            </div>
        </button>
      </div>

    </div>
  );

  const TaskDetailView = () => (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 pb-10 max-w-4xl mx-auto">
      <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={18} /> Kembali ke Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <Badge color="red">URGENSI: TINGGI</Badge>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Banjir Kelapa Gading</h1>
            <div className="flex flex-wrap gap-4 text-sm text-slate-300 mb-6">
              <span className="flex items-center gap-1.5"><Droplets size={16} className="text-blue-400"/> Banjir</span>
              <span className="flex items-center gap-1.5"><Users size={16} className="text-orange-400"/> 10 Terdampak</span>
              <span className="flex items-center gap-1.5"><Clock size={16} className="text-slate-400"/> 14:30 WIB</span>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-200 text-sm mb-4">
              ⚠️ <strong>Laporan:</strong> Rumah terendam 50cm, akses jalan terputus. Mohon bawa perahu karet.
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button className="flex flex-col items-center justify-center p-3 bg-slate-700/30 hover:bg-slate-700/60 rounded-xl border border-white/5 transition-all text-xs font-medium text-slate-300">
                <Camera size={20} className="mb-2 text-blue-400"/> Foto Lokasi
              </button>
              <button className="flex flex-col items-center justify-center p-3 bg-slate-700/30 hover:bg-slate-700/60 rounded-xl border border-white/5 transition-all text-xs font-medium text-slate-300">
                <Users size={20} className="mb-2 text-orange-400"/> Foto Korban
              </button>
              <button className="flex flex-col items-center justify-center p-3 bg-slate-700/30 hover:bg-slate-700/60 rounded-xl border border-white/5 transition-all text-xs font-medium text-slate-300">
                <PhoneCall size={20} className="mb-2 text-green-400"/> Hubungi
              </button>
              <button className="flex flex-col items-center justify-center p-3 bg-slate-700/30 hover:bg-slate-700/60 rounded-xl border border-white/5 transition-all text-xs font-medium text-slate-300">
                <AlertTriangle size={20} className="mb-2 text-red-400"/> SOS
              </button>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Update Status</h3>
            <div className="flex gap-3">
              <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all">
                ✅ Tandai Selesai
              </button>
              <button className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium border border-white/5 transition-all">
                🆘 Minta Bantuan
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800/40 border border-white/5 rounded-2xl overflow-hidden">
             <div className="h-48 bg-slate-900 relative">
               <LiveMap center={[106.7890, -6.1234]} zoom={15} />
               <div className="absolute bottom-3 right-3">
                  <button className="p-2 bg-white text-slate-900 rounded-lg shadow-lg hover:bg-slate-200">
                    <Maximize2 size={16} />
                  </button>
               </div>
             </div>
             <div className="p-4 space-y-3">
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-400">Jarak</span>
                 <span className="text-white font-bold">2.5 km</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-400">Estimasi</span>
                 <span className="text-white font-bold">15 menit</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-400">Rute</span>
                 <span className="text-green-400 font-bold">Lancar</span>
               </div>
               <button className="w-full py-2 bg-slate-700/50 hover:bg-slate-700 border border-white/5 rounded-lg text-sm text-white mt-2 flex items-center justify-center gap-2">
                 <Navigation size={14} /> Navigasi Google Maps
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const DailyLogView = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-10 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-white">Log Harian</h2>
           <p className="text-slate-400 text-sm">27 Nov 2024 • Ahmad (Responder)</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-sm text-slate-300">
             <BarChart3 size={16}/> Statistik
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm text-white font-medium shadow-lg shadow-orange-600/20">
             <Send size={16}/> Kirim Laporan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 h-fit">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Edit2 size={16} /> Entri Log Baru</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Waktu & Lokasi</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value="14:30" readOnly className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none transition-colors" />
                <input type="text" value="Kelapa Gading" readOnly className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none transition-colors" />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Jenis Aktivitas</label>
              <select className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none transition-colors">
                <option>Evakuasi</option>
                <option>Patroli</option>
                <option>Medis</option>
                <option>Logistik</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Deskripsi</label>
              <textarea className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none transition-colors h-24 resize-none" placeholder="Deskripsikan kegiatan..." defaultValue="Evakuasi warga terdampak banjir di RT 05." />
            </div>

            <button className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-orange-600/20">
              Simpan Entri
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-white text-sm">Riwayat Hari Ini</h3>
          <div className="space-y-3">
             <LogEntry time="14:30" title="Evakuasi Warga" location="Kelapa Gading" desc="Evakuasi 10 orang dari rumah terendam menggunakan perahu karet." photos={5} duration="90 min" />
             <LogEntry time="11:30" title="Bantuan Medis" location="Menteng" desc="Memberikan pertolongan pertama pada korban luka ringan." photos={2} duration="30 min" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-blue-500/30 overflow-hidden ${currentPersona === 'responder' ? 'selection:bg-orange-500/30' : ''}`}>
      
      {/* --- Sidebar --- */}
      <aside 
        className={`relative flex flex-col h-full border-r border-white/5 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] z-50
        ${sidebarCollapsed ? 'w-20' : 'w-72'}
        ${currentPersona === 'admin' ? 'bg-[#0f172a]' : 'bg-[#18181b]'}
        `}
      >
        <div className="flex items-center gap-3 p-6 mb-2">
          <div className={`relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${currentPersona === 'admin' ? 'bg-blue-600 shadow-blue-500/20' : 'bg-orange-600 shadow-orange-500/20'}`}>
            <Shield className="text-white" size={24} />
          </div>
          {!sidebarCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <h1 className="font-bold text-white text-lg leading-none tracking-tight">BPBD <span className={currentPersona === 'admin' ? 'text-blue-500' : 'text-orange-500'}>{currentPersona === 'admin' ? 'Admin' : 'Field'}</span></h1>
              <span className="text-xs font-medium text-slate-500 tracking-wider">JAKARTA UTARA</span>
            </div>
          )}
        </div>

        {/* Persona Switcher */}
        {!sidebarCollapsed && (
          <div className="px-4 mb-6">
            <div className="p-1 bg-white/5 rounded-lg flex border border-white/5">
              <button 
                onClick={() => setCurrentPersona('admin')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${currentPersona === 'admin' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}
              >
                Admin
              </button>
              <button 
                onClick={() => setCurrentPersona('responder')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${currentPersona === 'responder' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}
              >
                Responder
              </button>
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 space-y-2">
          {currentPersona === 'admin' ? (
            <>
              <SidebarItem icon={Activity} label="Dashboard Overview" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} collapsed={sidebarCollapsed} theme="blue" />
              <SidebarItem icon={Users} label="Kelola Tim" active={activeTab === 'team'} onClick={() => setActiveTab('team')} collapsed={sidebarCollapsed} theme="blue" />
              <SidebarItem icon={FileText} label="Laporan Masuk" collapsed={sidebarCollapsed} theme="blue" />
              <SidebarItem icon={Map} label="Peta Wilayah" collapsed={sidebarCollapsed} theme="blue" />
            </>
          ) : (
            <>
              <SidebarItem icon={Activity} label="My Dashboard" active={activeTab === 'dashboard' || activeTab === 'task-detail'} onClick={() => setActiveTab('dashboard')} collapsed={sidebarCollapsed} theme="orange" />
              <SidebarItem icon={FileText} label="Log Harian" active={activeTab === 'log'} onClick={() => setActiveTab('log')} collapsed={sidebarCollapsed} badge="New" theme="orange" />
              <SidebarItem icon={Camera} label="Unggah Bukti" collapsed={sidebarCollapsed} theme="orange" />
              <SidebarItem icon={Wifi} label="Offline Mode" collapsed={sidebarCollapsed} theme={isOffline ? 'orange' : 'slate'} onClick={() => setIsOffline(!isOffline)} />
            </>
          )}
        </nav>

        <div className="px-4 py-6 border-t border-white/5 space-y-2">
           <SidebarItem icon={Settings} label="Pengaturan" collapsed={sidebarCollapsed} />
           <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center justify-center w-full p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
           >
             {sidebarCollapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest">Collapse Sidebar</div>}
           </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Dynamic Backgrounds */}
        <div className={`absolute top-0 left-0 w-full h-96 blur-[120px] pointer-events-none transition-colors duration-1000 ${currentPersona === 'admin' ? 'bg-blue-600/10' : 'bg-orange-600/10'}`} />
        
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-5 z-10 shrink-0">
          <div className="flex items-center gap-4">
             <div className="flex flex-col">
               <h2 className="text-2xl font-bold text-white tracking-tight">
                 {currentPersona === 'admin' 
                    ? (activeTab === 'dashboard' ? 'Command Center' : 'Team Management')
                    : (activeTab === 'dashboard' ? 'Field Dashboard' : activeTab === 'task-detail' ? 'Detail Tugas' : 'Log Harian')
                 }
               </h2>
               <p className="text-sm text-slate-400 flex items-center gap-2">
                 <span className={`w-2 h-2 rounded-full ${currentPersona === 'admin' ? 'bg-green-500' : 'bg-green-500 animate-pulse'}`}></span>
                 {currentPersona === 'admin' ? 'System Operational' : isOffline ? 'Offline Mode Active' : 'Online • GPS Active'}
               </p>
             </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-white/5 text-sm">
              <Clock size={14} className="text-slate-400" />
              <span className="font-mono text-slate-300">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <button className="relative p-2.5 rounded-full bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 text-slate-300 hover:text-white transition-colors">
              <Bell size={20} />
              {currentPersona === 'responder' && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>}
            </button>
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br border-2 border-slate-900 shadow-lg cursor-pointer flex items-center justify-center text-white font-bold transition-all duration-500 ${currentPersona === 'admin' ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-red-600'}`}>
              {currentPersona === 'admin' ? 'AD' : 'AH'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-8 z-10 custom-scrollbar">
          {currentPersona === 'admin' ? (
            activeTab === 'dashboard' ? <AdminDashboardView /> : <div className="p-10 text-center text-slate-500">Team Management Module</div>
          ) : (
            activeTab === 'dashboard' ? <ResponderDashboardView /> 
            : activeTab === 'task-detail' ? <TaskDetailView /> 
            : <DailyLogView />
          )}
        </div>

      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .8; transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}