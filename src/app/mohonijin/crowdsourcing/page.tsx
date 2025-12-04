'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Camera, MapPin, Eye, Edit, Trash2, MoreVertical } from 'lucide-react';
import { getSession } from '@/lib/auth/api';
import type { CrowdsourceProject } from '@/lib/crowdsourcing/types';

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-600', active: 'bg-green-600', closed: 'bg-orange-600', archived: 'bg-zinc-700'
};

export default function CrowdsourcingAdminPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<CrowdsourceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const user = await getSession();
    if (!user) { router.push('/masuk'); return; }
    const role = user.profile?.role || user.role;
    if (role !== 'admin' && role !== 'super_admin') { router.push('/'); return; }
    fetchProjects();
  };

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

  const filteredProjects = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="bg-zinc-800/50 border-b border-zinc-700">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Camera size={24} /> Data Crowdsourcing
              </h1>
              <p className="text-zinc-400 text-sm">Kelola project Data Crowdsourcing Respon Warga</p>
            </div>
            <Link href="/mohonijin/crowdsourcing/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
              <Plus size={18} /> Buat Project
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'draft', 'active', 'closed', 'archived'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                filter === s ? 'bg-blue-600' : 'bg-zinc-800 hover:bg-zinc-700'
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
        ) : filteredProjects.length === 0 ? (
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
                {filteredProjects.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{p.title}</p>
                      <p className="text-xs text-zinc-500">{p.disaster_type}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {p.location_name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {new Date(p.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/crowdsourcing/${p.id}`}
                          className="p-1.5 hover:bg-zinc-700 rounded" title="Lihat">
                          <Eye size={16} />
                        </Link>
                        <Link href={`/mohonijin/crowdsourcing/${p.id}`}
                          className="p-1.5 hover:bg-zinc-700 rounded" title="Edit">
                          <Edit size={16} />
                        </Link>
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
      </main>
    </div>
  );
}
