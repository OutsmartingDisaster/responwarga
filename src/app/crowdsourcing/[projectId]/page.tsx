'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, MapPin, Calendar, Camera, Video, Upload, Grid, Map, List, Info, AlertCircle } from 'lucide-react';
import SubmissionGallery from '@/components/crowdsourcing/SubmissionGallery';
import RegionalStats from '@/components/crowdsourcing/RegionalStats';
import SubmissionsTable from '@/components/crowdsourcing/SubmissionsTable';
import type { CrowdsourceProject, CrowdsourceSubmission } from '@/lib/crowdsourcing/types';

const ProjectMapView = dynamic(() => import('@/components/crowdsourcing/ProjectMapView'), { ssr: false });

// SVG Palm Tree illustration for Sumatra flood
const PalmTreeIcon = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14">
    {/* Trunk */}
    <path d="M30 58 L32 28 L34 58 Z" fill="#8B4513" />
    <path d="M28 58 L32 35 L36 58 Z" fill="#A0522D" />
    {/* Leaves */}
    <path d="M32 28 Q20 20 8 24 Q18 22 32 28" fill="#228B22" />
    <path d="M32 28 Q44 20 56 24 Q46 22 32 28" fill="#228B22" />
    <path d="M32 28 Q24 12 16 8 Q22 14 32 28" fill="#2E8B57" />
    <path d="M32 28 Q40 12 48 8 Q42 14 32 28" fill="#2E8B57" />
    <path d="M32 28 Q32 8 32 4 Q32 12 32 28" fill="#32CD32" />
    {/* Coconuts */}
    <circle cx="30" cy="30" r="3" fill="#8B4513" />
    <circle cx="34" cy="31" r="2.5" fill="#A0522D" />
    {/* Water */}
    <ellipse cx="32" cy="60" rx="20" ry="4" fill="#3B82F6" opacity="0.6" />
  </svg>
);

const disasterIcons: Record<string, string> = {
  flood: '🌴', earthquake: '🌍', fire: '🔥', landslide: '⛰️',
  tsunami: '🌊', volcano: '🌋', storm: '🌪️', drought: '☀️', default: '⚠️'
};

interface Zone { zone_name: string; latitude: number; longitude: number; zone_level: string; }
interface MapLayer { id: string; layer_name: string; layer_type: string; source_url: string; opacity: number; is_default_on: boolean; }

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<CrowdsourceProject | null>(null);
  const [submissions, setSubmissions] = useState<CrowdsourceSubmission[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'gallery' | 'list'>('map');
  const [selectedSubmission, setSelectedSubmission] = useState<CrowdsourceSubmission | null>(null);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const [projRes, subRes, zonesRes, layersRes] = await Promise.all([
        fetch(`/api/crowdsourcing/projects/${projectId}`),
        fetch(`/api/crowdsourcing/projects/${projectId}/submissions`),
        fetch(`/api/crowdsourcing/projects/${projectId}/zones`),
        fetch(`/api/crowdsourcing/projects/${projectId}/layers`)
      ]);
      const { data: projData } = await projRes.json();
      const { data: subData } = await subRes.json();
      const { data: zonesData } = await zonesRes.json();
      const { data: layersData } = await layersRes.json();
      setProject(projData);
      setSubmissions(subData || []);
      setZones(zonesData || []);
      setLayers(layersData || []);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate regional stats from submissions
  const getRegionalStats = () => {
    const stats: Record<string, any> = {};
    zones.forEach(z => {
      stats[z.zone_name] = { region_name: z.zone_name, region_level: z.zone_level, total_submissions: 0, photo_count: 0, video_count: 0, approved_count: 0, pending_count: 0 };
    });
    submissions.forEach(s => {
      // Simple matching by address containing zone name
      const zone = zones.find(z => (s as any).address?.includes(z.zone_name.split(' ').pop()));
      if (zone && stats[zone.zone_name]) {
        stats[zone.zone_name].total_submissions++;
        if (s.media_type === 'photo') stats[zone.zone_name].photo_count++;
        if (s.media_type === 'video') stats[zone.zone_name].video_count++;
        if (s.status === 'approved') stats[zone.zone_name].approved_count++;
        if (s.status === 'pending') stats[zone.zone_name].pending_count++;
      }
    });
    return Object.values(stats);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Project tidak ditemukan</p>
          <Link href="/crowdsourcing" className="text-blue-400 hover:underline">
            Kembali ke daftar project
          </Link>
        </div>
      </div>
    );
  }

  const isFlood = project.disaster_type === 'flood';
  const icon = disasterIcons[project.disaster_type || 'default'] || disasterIcons.default;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <header className="bg-slate-800/30 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/crowdsourcing" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft size={18} /> Kembali
          </Link>
          <div className="flex items-start gap-4">
            {isFlood ? <PalmTreeIcon /> : <div className="text-5xl">{icon}</div>}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold rounded uppercase tracking-wider">
                  {project.status}
                </span>
                <span className="text-slate-400 text-sm">{submissions.length} dokumentasi</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
              {project.location_name && (
                <p className="text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin size={16} /> {project.location_name}
                </p>
              )}
            </div>
            <Link
              href={`/crowdsourcing/${projectId}/submit`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 rounded-xl transition-all"
            >
              <Upload size={18} /> Kirim Dokumentasi
            </Link>
          </div>
        </div>
      </header>

      {/* Info */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {project.description && (
          <p className="text-slate-300 mb-6">{project.description}</p>
        )}
        <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-6">
          {project.start_date && (
            <span className="flex items-center gap-1">
              <Calendar size={14} /> Mulai: {new Date(project.start_date).toLocaleDateString('id-ID')}
            </span>
          )}
          {project.allow_photo && <span className="flex items-center gap-1"><Camera size={14} /> Foto</span>}
          {project.allow_video && <span className="flex items-center gap-1"><Video size={14} /> Video</span>}
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-100">
                Bantu kami mendokumentasikan dampak bencana ini. Foto dan video yang Anda kirim akan 
                <strong> dimoderasi terlebih dahulu</strong> sebelum dipublikasikan untuk memastikan kualitas dan keakuratan data.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'map' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
              : 'bg-slate-800/50 text-slate-400 hover:text-white border border-white/5'
            }`}>
            <Map size={16} /> Peta & Statistik
          </button>
          <button onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'gallery' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
              : 'bg-slate-800/50 text-slate-400 hover:text-white border border-white/5'
            }`}>
            <Grid size={16} /> Galeri
          </button>
          <button onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
              : 'bg-slate-800/50 text-slate-400 hover:text-white border border-white/5'
            }`}>
            <List size={16} /> Daftar
          </button>
        </div>

        {/* Content */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            {/* Map */}
            <ProjectMapView 
              submissions={submissions as any} 
              zones={zones} 
              layers={layers}
              onMarkerClick={(sub) => setSelectedSubmission(sub as any)}
            />
            
            {/* Regional Stats */}
            {zones.length > 0 && (
              <RegionalStats stats={getRegionalStats()} />
            )}
            
            {/* Submissions Table */}
            <SubmissionsTable 
              submissions={submissions as any} 
              onViewDetail={(sub) => setSelectedSubmission(sub as any)} 
            />
          </div>
        )}
        
        {activeTab === 'gallery' && (
          <SubmissionGallery submissions={submissions} />
        )}
        
        {activeTab === 'list' && (
          <SubmissionsTable 
            submissions={submissions as any} 
            onViewDetail={(sub) => setSelectedSubmission(sub as any)} 
          />
        )}
      </div>
      
      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedSubmission(null)}>
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {selectedSubmission.media_type === 'video' ? (
              <video src={selectedSubmission.media_url} controls className="w-full rounded-t-2xl" />
            ) : (
              <img src={selectedSubmission.media_url} alt="" className="w-full rounded-t-2xl" />
            )}
            <div className="p-4">
              <p className="text-white mb-2">{selectedSubmission.caption}</p>
              <p className="text-sm text-slate-400 flex items-center gap-1">
                <MapPin size={14} /> {(selectedSubmission as any).address}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {new Date(selectedSubmission.submitted_at).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
