"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "react-hot-toast";

// Types
type LogEntry = {
  id: string;
  created_at: string;
  log_date: string;
  activity_type: string;
  log_content: string;
  duration_minutes?: number;
  photos?: string[];
  status: string;
};

type DailyLogStats = {
  total_entries: number;
  pending_uploads: number;
  hours_logged: number;
};

export default function DailyLog() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<DailyLogStats>({ total_entries: 0, pending_uploads: 0, hours_logged: 0 });

  // Form State
  const [formData, setFormData] = useState({
    activity_type: "patrol",
    log_content: "",
    duration_minutes: 0,
    photos: [] as File[],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Logs using new API
  const fetchLogs = useCallback(async (targetDate: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-logs?date=${targetDate}`, {
        credentials: 'include'
      });
      const result = await res.json();
      
      if (!res.ok) {
        console.error("Error fetching logs:", result.error);
        setEntries([]);
      } else {
        const data = result.data || [];
        setEntries(data);
        
        // Calculate stats
        const totalMinutes = data.reduce((sum: number, e: LogEntry) => sum + (e.duration_minutes || 0), 0);
        setStats({
          total_entries: data.length,
          pending_uploads: 0,
          hours_logged: Math.round(totalMinutes / 60 * 10) / 10
        });
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(date);
  }, [date, fetchLogs]);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({ ...prev, photos: [...prev.photos, ...Array.from(e.target.files || [])] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.log_content.trim()) {
      toast.error("Deskripsi tidak boleh kosong");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          log_date: date,
          log_content: formData.log_content,
          activity_type: formData.activity_type,
          duration_minutes: formData.duration_minutes || null,
          photos: [] // TODO: implement photo upload
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast.success("Log berhasil disimpan!");
      setFormData({ activity_type: "patrol", log_content: "", duration_minutes: 0, photos: [] });
      fetchLogs(date);

    } catch (err: any) {
      toast.error(`Gagal menyimpan log: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeDate = (offset: number) => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + offset);
    setDate(currentDate.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Date Nav */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-800 p-4 rounded-xl border border-zinc-700">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Laporan Harian</h2>
          <p className="text-zinc-400 text-sm">Catat aktivitas dan situasi lapangan.</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-700 p-1 rounded-lg">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-zinc-600 rounded-md text-zinc-300">←</button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-zinc-100 font-medium focus:outline-none"
          />
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-zinc-600 rounded-md text-zinc-300">→</button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.total_entries}</div>
          <div className="text-[10px] text-zinc-400 uppercase">Log Hari Ini</div>
        </div>
        <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.pending_uploads}</div>
          <div className="text-[10px] text-zinc-400 uppercase">Pending Upload</div>
        </div>
        <div className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.hours_logged}h</div>
          <div className="text-[10px] text-zinc-400 uppercase">Jam Kerja</div>
        </div>
      </div>

      {/* Log Entry Form */}
      <section className="bg-zinc-800 p-4 rounded-xl border border-zinc-700">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">📝 Buat Laporan Baru</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Jenis Aktivitas</label>
            <select
              name="activity_type"
              value={formData.activity_type}
              onChange={handleInputChange}
              className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-100 focus:ring-blue-500"
            >
              <option value="patrol">Patroli</option>
              <option value="evacuation">Evakuasi</option>
              <option value="logistics">Logistik</option>
              <option value="coordination">Koordinasi</option>
              <option value="rescue">Penyelamatan</option>
              <option value="distribution">Distribusi Bantuan</option>
              <option value="task_completion">Penyelesaian Tugas</option>
              <option value="other">Lainnya</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Durasi (menit)</label>
            <input
              type="number"
              name="duration_minutes"
              value={formData.duration_minutes || ''}
              onChange={handleInputChange}
              placeholder="Contoh: 60"
              className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-100 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Deskripsi / Catatan</label>
            <textarea
              name="log_content"
              value={formData.log_content}
              onChange={handleInputChange}
              rows={3}
              placeholder="Jelaskan aktivitas atau situasi..."
              className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-zinc-100 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Foto Dokumentasi</label>
            <div className="border-2 border-dashed border-zinc-600 rounded-lg p-4 text-center hover:bg-zinc-700/50 transition-colors cursor-pointer relative">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="text-zinc-400">
                <span className="text-2xl block mb-1">📸</span>
                <span className="text-xs">Klik untuk upload foto</span>
              </div>
            </div>
            {formData.photos.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                {formData.photos.map((file, idx) => (
                  <div key={idx} className="w-16 h-16 bg-zinc-700 rounded-lg flex-shrink-0 flex items-center justify-center text-xs text-zinc-500 overflow-hidden">
                    {file.name.slice(0, 5)}...
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg font-medium transition-colors"
            >
              Simpan Draft
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              {isSubmitting ? 'Menyimpan...' : 'Kirim Laporan'}
            </button>
          </div>
        </form>
      </section>

      {/* Log List */}
      <section>
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Riwayat Hari Ini</h3>
        <div className="space-y-3">
          {loading ? (
            <p className="text-zinc-500 text-center py-4">Memuat riwayat...</p>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-zinc-700 rounded-xl">
              <p className="text-zinc-500">Belum ada laporan hari ini.</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 flex gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-900/30 text-blue-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {entry.activity_type?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start w-full">
                    <h4 className="font-bold text-zinc-200">{entry.activity_type || 'Aktivitas'}</h4>
                    <span className="text-xs text-zinc-500">{new Date(entry.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">{entry.log_content}</p>
                  {entry.duration_minutes && (
                    <div className="flex items-center gap-1 text-xs text-zinc-500 mt-2">
                      <span>⏱️ {entry.duration_minutes} menit</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
