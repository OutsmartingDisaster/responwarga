"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/../lib/supabase/client";

export default function ResponderProfile() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("User not authenticated");
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (profileError) throw profileError;
      setProfile(data);
      setForm(data);

      // Fetch assignments for this profile
      const { data: assignmentData } = await supabase
        .from("team_assignments")
        .select("*")
        .eq("profile_id", data.id)
        .order("assigned_at", { ascending: false });
      setAssignments(assignmentData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          phone_number: form.phone_number,
          email: form.email,
          address: form.address,
        })
        .eq("id", form.id);
      if (updateError) throw updateError;
      setSuccess("Profil diperbarui.");
      fetchProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Memuat...</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;
  if (!form) return null;

  return (
    <div className="max-w-xl mx-auto bg-zinc-900 text-zinc-100 p-8 rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Profil Saya</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Nama Lengkap</label>
          <input
            type="text"
            name="full_name"
            value={form.full_name || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Email</label>
          <input
            type="email"
            name="email"
            value={form.email || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Nomor Telepon</label>
          <input
            type="text"
            name="phone_number"
            value={form.phone_number || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Alamat</label>
          <input
            type="text"
            name="address"
            value={form.address || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
          />
        </div>
        {success && <div className="text-green-400">{success}</div>}
        {error && <div className="text-red-400">{error}</div>}
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded font-semibold"
          disabled={saving}
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
      <div className="mt-8">
        <h3 className="font-semibold text-zinc-200 mb-2">Penugasan Saya</h3>
        <table className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded">
          <thead>
            <tr className="bg-zinc-800 text-zinc-200">
              <th className="px-2 py-1">Lokasi</th>
              <th className="px-2 py-1">Latitude</th>
              <th className="px-2 py-1">Longitude</th>
              <th className="px-2 py-1">Catatan</th>
              <th className="px-2 py-1">Waktu Penugasan</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id} className="border-t border-zinc-700">
                <td className="px-2 py-1">{a.location_name}</td>
                <td className="px-2 py-1">{a.location_lat}</td>
                <td className="px-2 py-1">{a.location_lng}</td>
                <td className="px-2 py-1">{a.notes}</td>
                <td className="px-2 py-1">{a.assigned_at ? new Date(a.assigned_at).toLocaleString() : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
