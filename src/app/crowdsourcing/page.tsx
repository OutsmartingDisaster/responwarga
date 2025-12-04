'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Camera, Search, Filter } from 'lucide-react';
import ProjectCard from '@/components/crowdsourcing/ProjectCard';
import type { CrowdsourceProject } from '@/lib/crowdsourcing/types';

export default function CrowdsourcingPage() {
  const [projects, setProjects] = useState<CrowdsourceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/crowdsourcing/projects?status=active');
      const { data } = await res.json();
      setProjects(data || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchSearch = !search || 
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.location_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filter || p.disaster_type === filter;
    return matchSearch && matchFilter;
  });

  const disasterTypes = [...new Set(projects.map(p => p.disaster_type).filter(Boolean))];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <header className="bg-slate-800/30 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20 flex items-center justify-center">
              <Camera size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Data Crowdsourcing Respon Warga</h1>
              <p className="text-slate-400 text-sm">Data Terbuka Warga Berdaya! Bergerak mengubah tragedi menjadi pengetahuan.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari project..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all"
          >
            <option value="">Semua Tipe</option>
            {disasterTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <Camera size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">Tidak ada project aktif saat ini</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-slate-400">
          <p>Respon Warga - Data Crowdsourcing Respon Warga</p>
        </div>
      </footer>
    </div>
  );
}
