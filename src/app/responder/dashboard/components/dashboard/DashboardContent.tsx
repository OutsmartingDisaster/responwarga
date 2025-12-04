'use client';

import { FileText, CheckCircle2, Clock, Activity, MapPin, WifiOff, Navigation, Radio, Locate } from 'lucide-react';
import { LiveMap, SummaryCard } from '@/app/components/DashboardSharedUI';
import AssignmentCard from './AssignmentCard';

interface DashboardContentProps {
  myAssignments: any[];
  activeResponses: any[];
  finishedResponses: any[];
  mapCenter: [number, number];
  currentLocation: { lat: number; lng: number } | null;
  isOffline: boolean;
  isSOSActive: boolean;
  onToggleSOS: () => void;
  onAcceptTask: (id: string) => void;
  onStartTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  getTaskForAssignment: (assignment: any) => any;
}

export default function DashboardContent({
  myAssignments,
  activeResponses,
  finishedResponses,
  mapCenter,
  currentLocation,
  isOffline,
  isSOSActive,
  onToggleSOS,
  onAcceptTask,
  onStartTask,
  onCompleteTask,
  getTaskForAssignment
}: DashboardContentProps) {
  const pendingCount = myAssignments.filter(a => a.status === 'assigned').length;
  const inProgressCount = myAssignments.filter(a => a.status === 'in_progress').length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-24">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={FileText} label="Tugas Saya" value={myAssignments.length.toString()} color="bg-orange-500" />
        <SummaryCard icon={CheckCircle2} label="Selesai" value={finishedResponses.length.toString()} color="bg-green-500" />
        <SummaryCard icon={Clock} label="Pending" value={pendingCount.toString()} color="bg-yellow-500" />
        <SummaryCard icon={Activity} label="In Progress" value={inProgressCount.toString()} color="bg-blue-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Map */}
        <div className="xl:col-span-2 relative bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden h-[400px]">
          <MapOverlay activeResponses={activeResponses} isOffline={isOffline} />
          <LiveMap center={mapCenter} zoom={14} markers={activeResponses} />
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex justify-between items-center">
            Tugas Saya
            <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">{myAssignments.length}</span>
          </h3>
          
          {myAssignments.length === 0 ? (
            <EmptyAssignments />
          ) : (
            myAssignments.map(assignment => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                task={getTaskForAssignment(assignment)}
                onAccept={onAcceptTask}
                onStart={onStartTask}
                onComplete={onCompleteTask}
              />
            ))
          )}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <FloatingActions 
        currentLocation={currentLocation} 
        isSOSActive={isSOSActive} 
        onToggleSOS={onToggleSOS} 
      />
    </div>
  );
}

function MapOverlay({ activeResponses, isOffline }: { activeResponses: any[]; isOffline: boolean }) {
  return (
    <>
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur p-3 rounded-xl border border-white/10 max-w-xs shadow-xl">
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <MapPin size={14} className="text-blue-500" /> Lokasi Saat Ini
        </h3>
        <div className="space-y-1">
          <div className="text-xs text-slate-300">🚨 {activeResponses.length} Tugas Aktif</div>
          <div className="text-xs text-slate-400">🛣️ Rute Optimal Ditampilkan</div>
        </div>
      </div>

      {isOffline && (
        <div className="absolute inset-0 z-20 bg-slate-900/50 backdrop-grayscale flex items-center justify-center pointer-events-none">
          <div className="bg-yellow-500 text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-3 shadow-2xl border-2 border-slate-900">
            <WifiOff size={24} /> OFFLINE MODE - CACHED MAP
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-10">
        <button className="bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-slate-200 transition-colors flex items-center gap-2">
          <Navigation size={14} /> Open in Google Maps
        </button>
      </div>
    </>
  );
}

function EmptyAssignments() {
  return (
    <div className="bg-slate-800/30 border border-white/5 rounded-xl p-6 text-center">
      <FileText size={32} className="mx-auto mb-2 text-slate-600" />
      <p className="text-slate-500 text-sm">Belum ada tugas yang ditugaskan.</p>
    </div>
  );
}

function FloatingActions({ 
  currentLocation, 
  isSOSActive, 
  onToggleSOS 
}: { 
  currentLocation: { lat: number; lng: number } | null;
  isSOSActive: boolean;
  onToggleSOS: () => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-4 z-50">
      <div className={`px-3 py-2 rounded-full text-xs font-medium flex items-center gap-2 ${
        currentLocation ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'
      }`}>
        <Locate size={14} className={currentLocation ? 'animate-pulse' : ''} />
        {currentLocation ? 'GPS Active' : 'GPS Off'}
      </div>
      
      <button className="w-14 h-14 rounded-full bg-slate-800 text-slate-300 border border-white/10 shadow-xl flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all">
        <Radio size={24} />
      </button>
      
      <button
        onClick={onToggleSOS}
        className={`w-16 h-16 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-95 transition-all border-4 border-slate-900 ${
          isSOSActive ? 'bg-red-600 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.5)]' : 'bg-red-500 hover:bg-red-600'
        }`}
      >
        <div className="flex flex-col items-center leading-none">
          <span className="font-black text-lg">SOS</span>
          {isSOSActive && <span className="text-[9px] font-bold">ACTIVE</span>}
        </div>
      </button>
    </div>
  );
}
