'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle, Clock, XCircle, Flag, Image, Video, Users } from 'lucide-react';

interface Analytics {
  status_counts: Record<string, number>;
  media_types: Record<string, number>;
  daily_stats: { date: string; count: number }[];
  hourly_stats: { hour: number; count: number }[];
  heatmap_data: { lat: number; lng: number; weight: number }[];
  top_submitters: { name: string; count: number }[];
}

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-zinc-400">{label}</p>
      </div>
    </div>
  </div>
);

export default function AnalyticsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [projectId]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/crowdsourcing/analytics/${projectId}`);
      const result = await res.json();
      setData(result.data);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  const total = data ? Object.values(data.status_counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="bg-zinc-800/50 border-b border-zinc-700">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link href={`/mohonijin/crowdsourcing/${projectId}`}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-2">
            <ArrowLeft size={18} /> Kembali
          </Link>
          <h1 className="text-xl font-bold">Analytics</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : !data ? (
          <p className="text-center py-12 text-zinc-500">Gagal memuat data</p>
        ) : (
          <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Clock} label="Pending" value={data.status_counts.pending || 0} color="bg-yellow-600" />
              <StatCard icon={CheckCircle} label="Approved" value={data.status_counts.approved || 0} color="bg-green-600" />
              <StatCard icon={XCircle} label="Rejected" value={data.status_counts.rejected || 0} color="bg-red-600" />
              <StatCard icon={Flag} label="Flagged" value={data.status_counts.flagged || 0} color="bg-orange-600" />
            </div>

            {/* Media Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
                <h3 className="font-semibold mb-4">Tipe Media</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Image size={20} className="text-blue-400" />
                    <span className="text-2xl font-bold">{data.media_types.photo || 0}</span>
                    <span className="text-zinc-400">Foto</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video size={20} className="text-purple-400" />
                    <span className="text-2xl font-bold">{data.media_types.video || 0}</span>
                    <span className="text-zinc-400">Video</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
                <h3 className="font-semibold mb-4">Top Kontributor</h3>
                {data.top_submitters.length === 0 ? (
                  <p className="text-zinc-500 text-sm">Belum ada data</p>
                ) : (
                  <div className="space-y-2">
                    {data.top_submitters.slice(0, 5).map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm truncate">{s.name}</span>
                        <span className="text-sm text-zinc-400">{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Daily Chart */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
              <h3 className="font-semibold mb-4">Submissions per Hari (30 hari terakhir)</h3>
              {data.daily_stats.length === 0 ? (
                <p className="text-zinc-500 text-sm">Belum ada data</p>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {data.daily_stats.map((d, i) => {
                    const max = Math.max(...data.daily_stats.map(x => x.count));
                    const height = max > 0 ? (d.count / max) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group">
                        <div className="w-full bg-blue-600 rounded-t transition-all"
                          style={{ height: `${height}%`, minHeight: d.count > 0 ? '4px' : '0' }} />
                        <div className="hidden group-hover:block absolute -mt-8 bg-zinc-700 px-2 py-1 rounded text-xs">
                          {d.date}: {d.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Hourly Distribution */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
              <h3 className="font-semibold mb-4">Distribusi per Jam</h3>
              {data.hourly_stats.length === 0 ? (
                <p className="text-zinc-500 text-sm">Belum ada data</p>
              ) : (
                <div className="flex items-end gap-1 h-24">
                  {Array.from({ length: 24 }, (_, h) => {
                    const stat = data.hourly_stats.find(s => s.hour === h);
                    const count = stat?.count || 0;
                    const max = Math.max(...data.hourly_stats.map(x => x.count));
                    const height = max > 0 ? (count / max) * 100 : 0;
                    return (
                      <div key={h} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-green-600 rounded-t"
                          style={{ height: `${height}%`, minHeight: count > 0 ? '2px' : '0' }} />
                        {h % 6 === 0 && <span className="text-xs text-zinc-500 mt-1">{h}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Heatmap placeholder */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5">
              <h3 className="font-semibold mb-4">Heatmap Lokasi ({data.heatmap_data.length} titik)</h3>
              <div className="h-48 bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-500">
                Peta heatmap akan ditampilkan di sini
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
