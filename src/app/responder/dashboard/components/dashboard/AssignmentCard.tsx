'use client';

import { MapPin, Check, Play, CheckCircle2, Navigation } from 'lucide-react';
import { Badge } from '@/app/components/DashboardSharedUI';

interface AssignmentCardProps {
  assignment: any;
  task: any;
  onAccept: (id: string) => void;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
}

export default function AssignmentCard({ 
  assignment, 
  task, 
  onAccept, 
  onStart, 
  onComplete 
}: AssignmentCardProps) {
  if (!task) return null;

  const getStatusBadge = () => {
    const statusMap: Record<string, { color: string; label: string }> = {
      assigned: { color: 'orange', label: 'BARU' },
      accepted: { color: 'green', label: 'DITERIMA' },
      in_progress: { color: 'blue', label: 'PROSES' }
    };
    return statusMap[assignment.status] || { color: 'orange', label: assignment.status };
  };

  const urgencyColor = task.urgency === 'HIGH' || task.urgency === 'CRITICAL' ? 'red' : 'orange';
  const statusBadge = getStatusBadge();

  return (
    <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4 hover:bg-slate-800/70 transition-colors">
      {/* Badges */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex gap-2">
          <Badge color={urgencyColor}>{task.urgency || 'MEDIUM'}</Badge>
          <Badge color={statusBadge.color}>{statusBadge.label}</Badge>
        </div>
      </div>

      {/* Task Info */}
      <h4 className="text-white font-medium mb-1">{task.name}</h4>
      <p className="text-xs text-slate-400 flex items-center gap-1 mb-3">
        <MapPin size={12} /> {task.location || 'Lokasi tidak tersedia'}
      </p>

      {assignment.notes && (
        <p className="text-xs text-slate-500 mb-3 italic">Catatan: {assignment.notes}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {assignment.status === 'assigned' && (
          <button
            onClick={() => onAccept(assignment.id)}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <Check size={14} /> Terima
          </button>
        )}
        {assignment.status === 'accepted' && (
          <button
            onClick={() => onStart(assignment.id)}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <Play size={14} /> Mulai
          </button>
        )}
        {assignment.status === 'in_progress' && (
          <button
            onClick={() => onComplete(assignment.id)}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <CheckCircle2 size={14} /> Selesai
          </button>
        )}
        {task.latitude && task.longitude && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
          >
            <Navigation size={14} /> Navigasi
          </a>
        )}
      </div>
    </div>
  );
}
