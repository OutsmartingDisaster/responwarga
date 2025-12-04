"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { createApiClient } from '@/lib/api-client';
import {
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Activity,
  Map,
  Shield,
  Settings,
  ChevronRight,
  Bell,
  Send,
  MapPin,
  Radio,
  UserCheck,
  X
} from 'lucide-react';
import { LiveMap, SummaryCard, Badge } from '../components/DashboardSharedUI';
import { TeamManagementView, ReportsView, MapView, SettingsView } from './components/AdminViews';
import { toast, Toaster } from 'react-hot-toast';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  organization_id: string;
  status: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  last_location_update?: string;
  created_at: string;
}

interface Assignment {
  id: string;
  organization_id: string;
  responder_id: string;
  disaster_response_id?: string;
  emergency_report_id?: string;
  contribution_id?: string;
  status: string;
  notes?: string;
  assigned_at: string;
  accepted_at?: string;
  completed_at?: string;
}

interface DisasterResponse {
  id: string;
  name: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  urgency?: string;
  disaster_types?: string[];
  created_at: string;
}

export default function AdminDashboard() {
  const api = useMemo(() => createApiClient(), []);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const dataFetchedRef = React.useRef(false);

  // Organization data
  const [orgId, setOrgId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<any>(null);
  
  // Stats
  const [stats, setStats] = useState({
    personnel: 0,
    activeResponders: 0,
    activeResponses: 0,
    completedTasks: 0,
  });

  // Data
  const [activeResponses, setActiveResponses] = useState<DisasterResponse[]>([]);
  const [recentTasks, setRecentTasks] = useState<DisasterResponse[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [responders, setResponders] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Dispatch modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DisasterResponse | null>(null);
  const [selectedResponder, setSelectedResponder] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data
  const fetchData = async () => {
    try {
      const { data: { user } } = await api.auth.getUser();
      if (!user) return;

      const { data: profile } = await api.from('profiles').select('organization_id').eq('user_id', user.id).single();
      if (!profile?.organization_id) return;
      
      const currentOrgId = profile.organization_id;
      setOrgId(currentOrgId);

      // Get organization details
      const { data: orgData } = await api.from('organizations').select('*').eq('id', currentOrgId).single();
      setOrganization(orgData);

      // Fetch all members
      const { data: membersData } = await api
        .from('profiles')
        .select('*')
        .eq('organization_id', currentOrgId)
        .order('full_name', { ascending: true });
      
      setMembers(membersData || []);

      // Filter responders
      const respondersList = (membersData || []).filter((m: Profile) => m.role === 'org_responder');
      setResponders(respondersList);

      // Count active responders
      const activeResponderCount = respondersList.filter(
        (r: Profile) => r.status === 'active' || r.status === 'on_duty'
      ).length;

      // Fetch active responses
      const { data: activeData } = await api
        .from('disaster_responses')
        .select('*')
        .eq('organization_id', currentOrgId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setActiveResponses(activeData || []);

      // Fetch recent tasks
      const { data: tasks } = await api
        .from('disaster_responses')
        .select('*')
        .eq('organization_id', currentOrgId)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentTasks(tasks || []);

      // Fetch assignments
      const { data: assignmentsData } = await api
        .from('assignments')
        .select('*')
        .eq('organization_id', currentOrgId)
        .order('assigned_at', { ascending: false });

      setAssignments(assignmentsData || []);

      // Count completed
      const { data: completedData } = await api
        .from('disaster_responses')
        .select('id')
        .eq('organization_id', currentOrgId)
        .eq('status', 'finished');

      setStats({
        personnel: membersData?.length || 0,
        activeResponders: activeResponderCount,
        activeResponses: activeData?.length || 0,
        completedTasks: completedData?.length || 0,
      });

    } catch (err) {
      console.error("Admin dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;
    fetchData();
  }, []);

  // Polling for real-time updates
  useEffect(() => {
    if (!orgId) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [orgId]);

  // Dispatch task to responder
  const handleDispatch = async () => {
    if (!selectedTask || !selectedResponder || !orgId) return;

    setDispatching(true);
    try {
      const { error } = await api.from('assignments').insert([{
        organization_id: orgId,
        responder_id: selectedResponder,
        disaster_response_id: selectedTask.id,
        status: 'assigned',
        notes: dispatchNotes || null,
        assigned_at: new Date().toISOString(),
      }]);

      if (error) throw error;

      toast.success('Tugas berhasil ditugaskan!');
      setShowDispatchModal(false);
      setSelectedTask(null);
      setSelectedResponder('');
      setDispatchNotes('');
      fetchData();
    } catch (err: any) {
      toast.error('Gagal menugaskan: ' + err.message);
    } finally {
      setDispatching(false);
    }
  };

  // Get assignment status for a task
  const getTaskAssignment = (taskId: string) => {
    return assignments.find(a => a.disaster_response_id === taskId);
  };

  // Get responder by ID
  const getResponder = (responderId: string) => {
    return responders.find(r => r.id === responderId);
  };

  // Map center based on organization location or default
  const mapCenter = useMemo<[number, number]>(() => {
    if (organization?.longitude && organization?.latitude) {
      return [organization.longitude, organization.latitude];
    }
    return [106.8456, -6.1588]; // Default Jakarta
  }, [organization]);

  // Combine markers: active responses + active responders with locations
  const mapMarkers = useMemo(() => {
    const markers: any[] = [...activeResponses];
    
    // Add responder locations
    responders.forEach(r => {
      if (r.latitude && r.longitude && (r.status === 'active' || r.status === 'on_duty')) {
        markers.push({
          id: `responder-${r.id}`,
          latitude: r.latitude,
          longitude: r.longitude,
          name: r.full_name,
          type: 'responder',
          status: r.status,
        });
      }
    });

    return markers;
  }, [activeResponses, responders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-blue-500/30 overflow-hidden">
      <Toaster position="top-right" />

      {/* --- Sidebar --- */}
      <aside
        className={`relative flex flex-col h-full border-r border-white/5 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] z-50
        ${sidebarCollapsed ? 'w-20' : 'w-72'}
        bg-[#0f172a]
        `}
      >
        <div className="flex items-center gap-3 p-6 mb-2">
          <div className="relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 bg-blue-600 shadow-blue-500/20 overflow-hidden">
            {organization?.logo_url ? (
              <img src={organization.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Shield className="text-white" size={24} />
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <h1 className="font-bold text-white text-lg leading-none tracking-tight">{organization?.name || 'Loading...'}</h1>
              <span className="text-xs font-medium text-blue-500 tracking-wider">Admin</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <SidebarItem icon={Activity} label="Dashboard Overview" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} collapsed={sidebarCollapsed} theme="blue" />
          <SidebarItem icon={Users} label="Kelola Tim" active={activeTab === 'team'} onClick={() => setActiveTab('team')} collapsed={sidebarCollapsed} theme="blue" badge={`${stats.activeResponders}`} />
          <SidebarItem icon={FileText} label="Laporan Masuk" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} collapsed={sidebarCollapsed} theme="blue" />
          <SidebarItem icon={Map} label="Peta Wilayah" active={activeTab === 'map'} onClick={() => setActiveTab('map')} collapsed={sidebarCollapsed} theme="blue" />
        </nav>

        <div className="px-4 py-6 border-t border-white/5 space-y-2">
          <SidebarItem icon={Settings} label="Pengaturan" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} collapsed={sidebarCollapsed} />
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
        <div className="absolute top-0 left-0 w-full h-96 blur-[120px] pointer-events-none transition-colors duration-1000 bg-blue-600/10" />

        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-5 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {activeTab === 'dashboard' ? 'Command Center' :
                  activeTab === 'team' ? 'Manajemen Tim' :
                    activeTab === 'reports' ? 'Laporan Masuk' :
                      activeTab === 'map' ? 'Peta Wilayah' : 'Pengaturan'}
              </h2>
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {stats.activeResponders} Responder Aktif
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
              {assignments.filter(a => a.status === 'assigned').length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                  {assignments.filter(a => a.status === 'assigned').length}
                </span>
              )}
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br border-2 border-slate-900 shadow-lg cursor-pointer flex items-center justify-center text-white font-bold transition-all duration-500 from-blue-500 to-indigo-600">
              AD
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-8 z-10 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <DashboardOverview 
              stats={stats} 
              activeResponses={activeResponses} 
              recentTasks={recentTasks}
              responders={responders}
              assignments={assignments}
              mapCenter={mapCenter}
              mapMarkers={mapMarkers}
              onDispatch={(task) => {
                setSelectedTask(task);
                setShowDispatchModal(true);
              }}
              getTaskAssignment={getTaskAssignment}
              getResponder={getResponder}
            />
          )}
          {activeTab === 'team' && <TeamManagementView members={members} />}
          {activeTab === 'reports' && <ReportsView reports={activeResponses} />}
          {activeTab === 'map' && <MapView activeResponses={activeResponses} />}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* Dispatch Modal */}
      {showDispatchModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Send size={20} className="text-blue-400" />
                Tugaskan Responder
              </h3>
              <button onClick={() => setShowDispatchModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                <div className="text-xs text-slate-400 mb-1">Tugas</div>
                <div className="text-white font-medium">{selectedTask.name}</div>
                <div className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin size={12} /> {selectedTask.location || 'Lokasi tidak tersedia'}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Pilih Responder</label>
                <select
                  value={selectedResponder}
                  onChange={(e) => setSelectedResponder(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                >
                  <option value="">-- Pilih Responder --</option>
                  {responders.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.full_name} {r.status === 'on_duty' ? '🟢' : r.status === 'active' ? '🟡' : '⚪'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Catatan (Opsional)</label>
                <textarea
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Instruksi tambahan..."
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-white/10">
              <button
                onClick={() => setShowDispatchModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDispatch}
                disabled={!selectedResponder || dispatching}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {dispatching ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={16} /> Tugaskan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
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

// --- Dashboard Overview View ---
interface DashboardOverviewProps {
  stats: any;
  activeResponses: DisasterResponse[];
  recentTasks: DisasterResponse[];
  responders: Profile[];
  assignments: Assignment[];
  mapCenter: [number, number];
  mapMarkers: any[];
  onDispatch: (task: DisasterResponse) => void;
  getTaskAssignment: (taskId: string) => Assignment | undefined;
  getResponder: (responderId: string) => Profile | undefined;
}

const DashboardOverview = ({ 
  stats, 
  activeResponses, 
  recentTasks, 
  responders,
  mapCenter,
  mapMarkers,
  onDispatch,
  getTaskAssignment,
  getResponder
}: DashboardOverviewProps) => (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-10">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard icon={FileText} label="Tugas Aktif" value={stats.activeResponses.toString()} color="bg-blue-500" />
      <SummaryCard icon={Users} label="Total Personil" value={stats.personnel.toString()} color="bg-slate-500" />
      <SummaryCard icon={Radio} label="Responder Aktif" value={stats.activeResponders.toString()} color="bg-green-500" />
      <SummaryCard icon={CheckCircle2} label="Tugas Selesai" value={stats.completedTasks.toString()} color="bg-purple-500" />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Map Section */}
      <div className="xl:col-span-2 space-y-6">
        <div className="relative bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden h-[450px]">
          <div className="absolute top-6 left-6 z-10 pointer-events-none bg-slate-900/80 p-3 rounded-xl backdrop-blur-md border border-white/10 shadow-2xl">
            <Badge color="blue">LIVE OPS</Badge>
            <h3 className="text-base font-bold text-white mt-2">Peta Respons Aktif</h3>
            <p className="text-xs text-slate-400">{activeResponses.length} Insiden • {responders.filter(r => r.status === 'on_duty' || r.status === 'active').length} Responder</p>
          </div>
          <LiveMap center={mapCenter} zoom={12} markers={mapMarkers} />

          {/* Legend */}
          <div className="absolute bottom-6 left-6 z-10 flex gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 rounded-lg border border-white/10 text-xs text-white">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Insiden
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 rounded-lg border border-white/10 text-xs text-white">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Responder
            </div>
          </div>
        </div>

        {/* Active Responders Panel */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <UserCheck size={16} className="text-green-400" /> Responder Aktif
          </h3>
          <div className="flex flex-wrap gap-2">
            {responders.filter(r => r.status === 'on_duty' || r.status === 'active').length === 0 ? (
              <p className="text-slate-500 text-sm">Tidak ada responder aktif.</p>
            ) : (
              responders
                .filter(r => r.status === 'on_duty' || r.status === 'active')
                .map(r => (
                  <div key={r.id} className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 rounded-lg border border-white/5">
                    <span className={`w-2 h-2 rounded-full ${r.status === 'on_duty' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    <span className="text-sm text-white">{r.full_name}</span>
                    {r.latitude && r.longitude && (
                      <MapPin size={12} className="text-blue-400" />
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Task Queue */}
      <div className="flex flex-col h-full bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-3xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            📋 Antrian Tugas 
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
              {recentTasks.filter(t => !getTaskAssignment(t.id)).length}
            </span>
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
          {recentTasks.length === 0 ? (
            <p className="text-slate-500 text-center text-sm">Belum ada tugas.</p>
          ) : (
            recentTasks.map((task) => {
              const assignment = getTaskAssignment(task.id);
              const assignedResponder = assignment ? getResponder(assignment.responder_id) : null;

              return (
                <div key={task.id} className="bg-slate-900/50 border border-white/5 rounded-xl p-4 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-2">
                      <Badge color={task.urgency === 'HIGH' || task.urgency === 'CRITICAL' ? 'red' : 'orange'}>
                        {task.urgency || 'MEDIUM'}
                      </Badge>
                      <Badge color="blue">{task.disaster_types?.[0] || 'UMUM'}</Badge>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <h4 className="text-white font-medium mb-1">{task.name}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-3">
                    <MapPin size={12} /> {task.location || 'Lokasi tidak tersedia'}
                  </p>

                  {assignment ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          assignment.status === 'completed' ? 'bg-green-500' :
                          assignment.status === 'in_progress' ? 'bg-blue-500 animate-pulse' :
                          assignment.status === 'accepted' ? 'bg-yellow-500' : 'bg-orange-500'
                        }`}></span>
                        <span className="text-xs text-slate-300">
                          {assignedResponder?.full_name || 'Unknown'} - {
                            assignment.status === 'assigned' ? 'Ditugaskan' :
                            assignment.status === 'accepted' ? 'Diterima' :
                            assignment.status === 'in_progress' ? 'Dalam Proses' :
                            assignment.status === 'completed' ? 'Selesai' : assignment.status
                          }
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onDispatch(task)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Send size={14} /> Tugaskan
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  </div>
);

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed, badge, theme = 'blue' }: any) => {
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
