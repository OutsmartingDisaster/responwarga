"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/../lib/supabase/client";

export default function DisasterResponseManager() {
  const supabase = createClient();
  const [responses, setResponses] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    name: "",
    type: "",
    location: "",
    status: "active",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchResponses();
    // eslint-disable-next-line
  }, []);

  const fetchResponses = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("User not authenticated");
      // Get current user's organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();
      if (!profile?.organization_id) throw new Error("No organization assigned");
      // Fetch disaster responses for this org
      const { data, error: fetchError } = await supabase
        .from("disaster_responses")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      setResponses(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEdit = (resp: any) => {
    setEditingId(resp.id);
    setForm({
      name: resp.name,
      type: resp.type,
      location: resp.location,
      status: resp.status,
    });
    setSuccess(null);
    setError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({
      name: "",
      type: "",
      location: "",
      status: "active",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("User not authenticated");
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();
      if (!profile?.organization_id) throw new Error("No organization assigned");
      if (editingId) {
        // Update
        const { error: updateError } = await supabase
          .from("disaster_responses")
          .update({
            name: form.name,
            type: form.type,
            location: form.location,
            status: form.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);
        if (updateError) throw updateError;
        setSuccess("Disaster response updated.");
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from("disaster_responses")
          .insert([
            {
              organization_id: profile.organization_id,
              name: form.name,
              type: form.type,
              location: form.location,
              status: form.status,
            },
          ]);
        if (insertError) throw insertError;
        setSuccess("Disaster response created.");
      }
      fetchResponses();
      handleCancel();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus area/tanggapan bencana ini?")) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: deleteError } = await supabase
        .from("disaster_responses")
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;
      setSuccess("Disaster response deleted.");
      fetchResponses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Memuat data area bencana...</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900 text-zinc-100 p-8 rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Manajemen Area & Jenis Bencana</h2>
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Nama Area / Tanggapan</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Jenis Bencana</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
            required
          >
            <option value="">Pilih jenis</option>
            <option value="Banjir">Banjir</option>
            <option value="Gempa">Gempa</option>
            <option value="Kebakaran">Kebakaran</option>
            <option value="Tanah Longsor">Tanah Longsor</option>
            <option value="Angin Puting Beliung">Angin Puting Beliung</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Lokasi</label>
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
            placeholder="Contoh: Jakarta Selatan"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
          >
            <option value="active">Aktif</option>
            <option value="closed">Selesai</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded font-semibold"
            disabled={saving}
          >
            {editingId ? (saving ? "Menyimpan..." : "Perbarui") : (saving ? "Menyimpan..." : "Tambah")}
          </button>
          {editingId && (
            <button
              type="button"
              className="bg-zinc-700 text-white px-4 py-2 rounded"
              onClick={handleCancel}
            >
              Batal
            </button>
          )}
        </div>
        {success && <div className="text-green-400">{success}</div>}
        {error && <div className="text-red-400">{error}</div>}
      </form>
      <h3 className="font-semibold mb-2 text-zinc-200">Daftar Area & Tanggapan Bencana</h3>
      <ul className="space-y-2">
        {responses.map((resp) => (
          <li key={resp.id} className="bg-zinc-800 rounded px-4 py-2 flex justify-between items-center">
            <div>
              <div className="font-bold">{resp.name}</div>
              <div className="text-sm text-zinc-400">{resp.type} - {resp.location} ({resp.status})</div>
            </div>
            <div className="flex gap-2">
              <button
                className="bg-blue-500 text-white px-3 py-1 rounded"
                onClick={() => handleEdit(resp)}
              >
                Edit
              </button>
              <button
                className="bg-red-500 text-white px-3 py-1 rounded"
                onClick={() => handleDelete(resp.id)}
              >
                Hapus
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
