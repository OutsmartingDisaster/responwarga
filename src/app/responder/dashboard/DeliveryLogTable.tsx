"use client";
import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from 'react-hot-toast';

export default function DeliveryLogTable({ dailyLogId }: { dailyLogId: string }) {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    item_name: "",
    quantity: 0,
    destination: "",
    notes: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, [dailyLogId]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Pengguna tidak terautentikasi");
      setUserId(user.id);
      const { data, error: logsError } = await supabase
        .from("delivery_logs")
        .select("*, profiles!delivered_by(name)")
        .eq("daily_log_id", dailyLogId)
        .order("created_at", { ascending: true });
      if (logsError) throw logsError;
      setLogs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEdit = (log: any) => {
    setEditingId(log.id);
    setForm({
      item_name: log.item_name || "",
      quantity: log.quantity || 0,
      destination: log.destination || "",
      notes: log.notes || "",
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({
      item_name: "",
      quantity: 0,
      destination: "",
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        // Update
        const { error: updateError } = await supabase
          .from("delivery_logs")
          .update({
            item_name: form.item_name,
            quantity: Number(form.quantity),
            destination: form.destination,
            notes: form.notes,
          })
          .eq("id", editingId);
        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from("delivery_logs")
          .insert([
            {
              daily_log_id: dailyLogId,
              item_name: form.item_name,
              quantity: Number(form.quantity),
              destination: form.destination,
              delivered_by: userId, // Assuming current user is the deliverer
              notes: form.notes,
            },
          ]);
        if (insertError) throw insertError;
      }
      fetchLogs();
      handleCancel();
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
      <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-2 items-end">
        <input
          type="text"
          name="item_name"
          value={form.item_name}
          onChange={handleChange}
          placeholder="Nama Barang"
          className="bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-2 py-1"
          required
        />
        <input
          type="number"
          name="quantity"
          value={form.quantity}
          onChange={handleChange}
          placeholder="Jumlah"
          className="bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-2 py-1 w-24"
          required
        />
        <input
          type="text"
          name="destination"
          value={form.destination}
          onChange={handleChange}
          placeholder="Tujuan"
          className="bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-2 py-1"
        />
        <input
          type="text"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Catatan"
          className="bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-2 py-1"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1 rounded font-semibold"
          disabled={saving}
        >
          {editingId ? (saving ? "Menyimpan..." : "Perbarui") : (saving ? "Menyimpan..." : "Tambah")}
        </button>
        {editingId && (
          <button
            type="button"
            className="bg-zinc-700 text-white px-3 py-1 rounded"
            onClick={handleCancel}
          >
            Batal
          </button>
        )}
      </form>
      <table className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded">
        <thead>
          <tr className="bg-zinc-800 text-zinc-200">
            <th className="px-2 py-1">Barang</th>
            <th className="px-2 py-1">Jumlah</th>
            <th className="px-2 py-1">Tujuan</th>
            <th className="px-2 py-1">Dikirim Oleh</th>
            <th className="px-2 py-1">Catatan</th>
            <th className="px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t border-zinc-700">
              <td className="px-2 py-1">{log.item_name}</td>
              <td className="px-2 py-1">{log.quantity}</td>
              <td className="px-2 py-1">{log.destination}</td>
              <td className="px-2 py-1">{log.delivered_by_profile?.name || log.delivered_by}</td>
              <td className="px-2 py-1">{log.notes}</td>
              <td className="px-2 py-1">
                {userId === log.delivered_by && ( // Only allow editing if current user delivered it
                  <button
                  className="text-blue-400 hover:underline"
                  onClick={() => handleEdit(log)}
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
