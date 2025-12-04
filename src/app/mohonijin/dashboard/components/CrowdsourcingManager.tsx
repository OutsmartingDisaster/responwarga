'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Camera, Eye, Edit, Trash2, FileText, Users, BarChart3, Download } from 'lucide-react';

interface Project {
  id: string; title: string; disaster_type: string; location_name: string;
  status: string; created_at: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-600', active: 'bg-green-600', closed: 'bg-orange-600', archived: 'bg-zinc-700'
};

export default function CrowdsourcingManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/crowdsourcing/projects?status=all');
      const { data } = await res.json();
      setProjects(data || []);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus project ini?')) return;
    try {
      await fetch(`/api/crowdsourcing/projects/${id}`, { method: 'DELETE' });
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      alert('Gagal menghapus project');
    }
  };

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Camera size={24} /> Data Crowdsourcing
          </h2>
          <p className="text-sm text-zinc-400">Kelola project Data Crowdsourcing Respon Warga</p>
        </div>
        <Link href="/mohonijin/crowdsourcing/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm">
          <Plus size={18} /> Buat Project
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'draft', 'active', 'closed', 'archived'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}>
            {s === 'all' ? 'Semua' : s}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Camera size={48} className="mx-auto mb-4 opacity-50" />
          <p>Belum ada project</p>
        </div>
      ) : (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Lokasi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Dibuat</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{p.title}</p>
                    <p className="text-xs text-zinc-500">{p.disaster_type}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{p.location_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full text-white ${statusColors[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {new Date(p.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/crowdsourcing/${p.id}`}
                        className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400" title="Lihat">
                        <Eye size={16} />
                      </Link>
                      <Link href={`/mohonijin/crowdsourcing/${p.id}`}
                        className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400" title="Edit">
                        <Edit size={16} />
                      </Link>
                      <Link href={`/mohonijin/crowdsourcing/${p.id}/submissions`}
                        className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400" title="Submissions">
                        <FileText size={16} />
                      </Link>
                      <Link href={`/mohonijin/crowdsourcing/${p.id}/moderators`}
                        className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400" title="Moderators">
                        <Users size={16} />
                      </Link>
                      <Link href={`/mohonijin/crowdsourcing/${p.id}/analytics`}
                        className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400" title="Analytics">
                        <BarChart3 size={16} />
                      </Link>
                      <a href={`/api/crowdsourcing/export/${p.id}?format=csv`}
                        className="p-1.5 hover:bg-zinc-700 rounded text-green-400" title="Export CSV">
                        <Download size={16} />
                      </a>
                      <button onClick={() => handleDelete(p.id)}
                        className="p-1.5 hover:bg-red-600/20 text-red-400 rounded" title="Hapus">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
