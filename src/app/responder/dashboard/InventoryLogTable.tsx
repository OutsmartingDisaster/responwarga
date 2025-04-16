"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/../lib/supabase/client";

export default function InventoryLogTable({ dailyLogId }: { dailyLogId: string }) {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    item_name: "",
    quantity_start: 0,
    quantity_received: 0,
    quantity_delivered: 0,
    quantity_end: 0,
    notes: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, [dailyLogId]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: logsError } = await supabase
        .from("inventory_logs")
        .select("*")
        .eq("daily_log_id", dailyLogId)
        .order("item_name", { ascending: true });
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
    setForm(log);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({
      item_name: "",
      quantity_start: 0,
      quantity_received: 0,
      quantity_delivered: 0,
      quantity_end: 0,
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
          .from("inventory_logs")
          .update({
            item_name: form.item_name,
            quantity_start: Number(form.quantity_start),
            quantity_received: Number(form.quantity_received),
            quantity_delivered: Number(form.quantity_delivered),
            quantity_end: Number(form.quantity_end),
            notes: form.notes,
          })
          .eq("id", editingId);
        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from("inventory_logs")
          .insert([
            {
              daily_log_id: dailyLogId,
              item_name: form.item_name,
              quantity_start: Number(form.quantity_start),
              quantity_received: Number(form.quantity_received),
              quantity_delivered: Number(form.quantity_delivered),
              quantity_end: Number(form.quantity_end),
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
          name="quantity_start"
          value={form.quantity_start}
          onChange={handleChange}
          placeholder="Awal"
          className="bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-2 py-1 w-20"
        />
        <input
          type="number"
          name="quantity_received"
          value={form.quantity_received}
          onChange={handleChange}
          placeholder="Diterima"
          className="bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-2 py-1 w-20"
        />
        <input
          type="number"
          name="quantity_delivered"
          value={form.quantity_delivered}
          onChange={handleChange}
          placeholder="Dikirim"
          className="bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-2 py-1 w-20"
        />
        <input
          type="number"
          name="quantity_end"
          value={form.quantity_end}
          onChange={handleChange}
          placeholder="Akhir"
          className="bg-zinc-800 text-zinc-100 border border-zinc-700 rounded px-2 py-1 w-20"
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
            <th className="px-2 py-1">Awal</th>
            <th className="px-2 py-1">Diterima</th>
            <th className="px-2 py-1">Dikirim</th>
            <th className="px-2 py-1">Akhir</th>
            <th className="px-2 py-1">Catatan</th>
            <th className="px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t border-zinc-700">
              <td className="px-2 py-1">{log.item_name}</td>
              <td className="px-2 py-1">{log.quantity_start}</td>
              <td className="px-2 py-1">{log.quantity_received}</td>
              <td className="px-2 py-1">{log.quantity_delivered}</td>
              <td className="px-2 py-1">{log.quantity_end}</td>
              <td className="px-2 py-1">{log.notes}</td>
              <td className="px-2 py-1">
                <button
                  className="text-blue-400 hover:underline"
                  onClick={() => handleEdit(log)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
