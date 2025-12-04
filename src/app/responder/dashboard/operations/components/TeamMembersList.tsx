'use client';

import { Users, UserPlus, Phone } from 'lucide-react';
import { ResponseTeamMember } from '@/types/operations';

interface TeamMembersListProps {
  teamMembers: ResponseTeamMember[];
  onInvite: () => void;
}

export default function TeamMembersList({ teamMembers, onInvite }: TeamMembersListProps) {
  if (teamMembers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Anggota Tim</h3>
          <InviteButton onClick={onInvite} />
        </div>
        <EmptyState onInvite={onInvite} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Anggota Tim</h3>
        <InviteButton onClick={onInvite} />
      </div>
      <div className="grid gap-3">
        {teamMembers.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}

function InviteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
    >
      <UserPlus className="w-4 h-4" />
      <span>Undang Anggota</span>
    </button>
  );
}

function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-white/5">
      <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">Belum ada anggota tim</h3>
      <p className="text-slate-400 mb-6">Undang anggota organisasi untuk bergabung</p>
      <button
        onClick={onInvite}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        <span>Undang Anggota</span>
      </button>
    </div>
  );
}

function MemberCard({ member }: { member: ResponseTeamMember }) {
  const statusColors: Record<string, string> = {
    accepted: 'bg-green-500/20 text-green-400',
    declined: 'bg-red-500/20 text-red-400',
    invited: 'bg-yellow-500/20 text-yellow-400'
  };

  const statusLabels: Record<string, string> = {
    accepted: 'Bergabung',
    declined: 'Menolak',
    invited: 'Menunggu'
  };

  const userName = (member as any).user_name || 'Unknown';
  const userPhone = (member as any).user_phone;

  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
          <span className="text-white font-medium">{userName.charAt(0)}</span>
        </div>
        <div>
          <p className="text-white font-medium">{userName}</p>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="capitalize">{member.role}</span>
            {userPhone && (
              <>
                <span>•</span>
                <Phone className="w-3 h-3" />
                <span>{userPhone}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[member.status]}`}>
        {statusLabels[member.status]}
      </span>
    </div>
  );
}
