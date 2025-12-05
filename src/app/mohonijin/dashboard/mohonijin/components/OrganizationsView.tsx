'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Users, MapPin, Phone, Loader2, Search } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  member_count?: number;
  created_at: string;
}

export default function OrganizationsView() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const response = await fetch('/api/mohonijin/organizations');
        const result = await response.json();
        setOrganizations(result.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  const filtered = organizations.filter(o => 
    !search || o.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Daftar Organisasi ({organizations.length})</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Cari organisasi..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-64" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-white/5">
          <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">Tidak ada organisasi ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(org => (
            <div key={org.id} className="bg-slate-800/40 border border-white/5 rounded-2xl p-5 hover:bg-slate-800/60 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Building2 className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold truncate">{org.name}</h4>
                  <p className="text-sm text-slate-400 capitalize">{org.type || 'Organisasi'}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {org.address && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{org.address}</span>
                  </div>
                )}
                {org.phone && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-4 h-4" />
                    <span>{org.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400">
                  <Users className="w-4 h-4" />
                  <span>{org.member_count || 0} anggota</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
