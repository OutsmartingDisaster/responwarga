"use client";
import React, { useEffect, useState, useCallback } from "react";
import { createApiClient } from "@/lib/api-client";
import { toast } from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: "menunggu", label: "Menunggu" },
  { value: "diproses", label: "Diproses" },
  { value: "selesai", label: "Selesai" },
  { value: "dibatalkan", label: "Dibatalkan" },
];

export default function ActivityLogTable({ dailyLogId }: { dailyLogId: string }) {
  const api = createApiClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({
    status: "menunggu",
    action: "",
    notes: "",
    when_time: "",
    emergency_report_id: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [emergencyReports, setEmergencyReports] = useState<any[]>([]);

  useEffect(() => {
    fetchLogs();
    fetchEmergencyReports();
    // eslint-disable-next-line
  }, [dailyLogId]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = (await api.auth.getUser()).data.user;
      if (!user) throw new Error("Pengguna tidak terautentikasi");
      setUserId(user.id);
      const { data, error: logsError } = await api
        .from("activity_logs")
        .select("*, profiles!responder_id(name)")
        .eq("daily_log_id", dailyLogId)
        .order("when_time", { ascending: true });
      if (logsError) throw logsError;
      setLogs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmergencyReports = async () => {
    try {
      const { data, error } = await api
        .from("emergency_reports")
        .select("id, full_name, description, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setEmergencyReports(data || []);
    } catch (err) {
      // ignore for now
    }
  };

  const openModal = (log?: any) => {
    if (log) {
      setEditingId(log.id);
      setForm({
        status: log.status || "menunggu",
        action: log.action || "",
        notes: log.notes || "",
        when_time: log.when_time ? log.when_time.slice(0, 16) : "",
        emergency_report_id: log.emergency_report_id || "",
      });
    } else {
      setEditingId(null);
      setForm({
        status: "menunggu",
        action: "",
        notes: "",
        when_time: "",
        emergency_report_id: "",
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({
      status: "menunggu",
      action: "",
      notes: "",
      when_time: "",
      emergency_report_id: "",
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        // Update
        const { error: updateError } = await api
          .from("activity_logs")
          .update({
            status: form.status,
            action: form.action,
            notes: form.notes,
            when_time: form.when_time,
            emergency_report_id: form.emergency_report_id,
          })
          .eq("id", editingId);
        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await api
          .from("activity_logs")
          .insert([
            {
              daily_log_id: dailyLogId,
              responder_id: userId,
              status: form.status,
              action: form.action,
              notes: form.notes,
              when_time: form.when_time,
              emergency_report_id: form.emergency_report_id,
            },
          ]);
        if (insertError) throw insertError;
      }
      fetchLogs();
      closeModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-2">Memuat...</div>;
  if (error) return <div className="p-2 text-red-400">{error}</div>;

  return (
    <div>
      <div className="mb-4">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold"
          onClick={() => openModal()}
        >
          Tambah Aktivitas
        </button>
      </div>
      {/* Floating Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-zinc-400 hover:text-white"
              onClick={closeModal}
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-4">{editingId ? "Edit Aktivitas" : "Tambah Aktivitas"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-medium mb-1 text-zinc-200">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
                  required
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1 text-zinc-200">Tindakan</label>
                <input
                  type="text"
                  name="action"
                  value={form.action}
                  onChange={handleChange}
                  className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
                  placeholder="Tindakan yang dilakukan"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-zinc-200">Catatan</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
                  placeholder="Catatan tambahan"
                  rows={2}
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-zinc-200">Waktu</label>
                <input
                  type="datetime-local"
                  name="when_time"
                  value={form.when_time}
                  onChange={handleChange}
                  className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-zinc-200">Laporan Darurat (Opsional)</label>
                <select
                  name="emergency_report_id"
                  value={form.emergency_report_id}
                  onChange={handleChange}
                  className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
                >
                  <option value="">Pilih laporan</option>
                  {emergencyReports.map((rep: any) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.full_name} - {rep.description?.slice(0, 30)}... [{rep.status}]
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded font-semibold"
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : (editingId ? "Perbarui" : "Tambah")}
                </button>
                <button
                  type="button"
                  className="bg-zinc-700 text-white px-4 py-2 rounded"
                  onClick={closeModal}
                >
                  Batal
                </button>
              </div>
              {error && <div className="text-red-400">{error}</div>}
            </form>
          </div>
        </div>
      )}
      <table className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded">
        <thead>
          <tr className="bg-zinc-800 text-zinc-200">
            <th className="px-2 py-1">Responder</th>
            <th className="px-2 py-1">Status</th>
            <th className="px-2 py-1">Tindakan</th>
            <th className="px-2 py-1">Catatan</th>
            <th className="px-2 py-1">Waktu</th>
            <th className="px-2 py-1">Laporan Darurat</th>
            <th className="px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t border-zinc-700">
              <td className="px-2 py-1">{log.responder?.name || log.responder_id}</td>
              <td className="px-2 py-1">{log.status}</td>
              <td className="px-2 py-1">{log.action}</td>
              <td className="px-2 py-1">{log.notes}</td>
              <td className="px-2 py-1">{log.when_time ? new Date(log.when_time).toLocaleString() : ""}</td>
              <td className="px-2 py-1">
                {log.emergency_report_id
                  ? (emergencyReports.find((r) => r.id === log.emergency_report_id)?.full_name || log.emergency_report_id)
                  : "-"}
              </td>
              <td className="px-2 py-1">
                {userId === log.responder_id && (
                  <button
                    className="text-blue-400 hover:underline"
                    onClick={() => openModal(log)}
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
