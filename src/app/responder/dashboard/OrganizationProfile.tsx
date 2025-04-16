"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/../lib/supabase/client";

export default function OrganizationProfile() {
  const supabase = createClient();
  const [org, setOrg] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchOrg();
  }, []);

  const fetchOrg = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current user profile
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("User not authenticated");
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();
      if (!profile?.organization_id) throw new Error("No organization assigned");

      // Get organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single();
      if (orgError) throw orgError;
      setOrg(orgData);
      setForm(orgData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.target.name === 'slug') return;
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { slug, id, ...updateData } = form;

      const { error: updateError } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", id);

      if (updateError) throw updateError;
      setSuccess("Organization profile updated successfully.");
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
    <div className="max-w-2xl mx-auto bg-zinc-900 text-zinc-100 p-8 rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Profil Organisasi</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Nama Organisasi</label>
          <input
            type="text"
            name="name"
            value={form.name || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Slug (Tautan Dasbor)</label>
          <input
            type="text"
            name="slug"
            value={form.slug || ""}
            readOnly
            className="w-full border border-zinc-700 bg-zinc-800/50 text-zinc-400 rounded px-3 py-2 cursor-not-allowed"
          />
          <p className="text-xs text-zinc-400 mt-1">Tautan dasbor Anda: /responder/<span className="font-mono">{form.slug || ""}</span>/ (Tidak dapat diubah)</p>
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Tipe</label>
          <input
            type="text"
            name="type"
            value={form.type || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
            placeholder="LSM, Pemerintah, dll."
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
          <label className="block font-medium mb-1 text-zinc-200">Telepon</label>
          <input
            type="text"
            name="phone"
            value={form.phone || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Situs Web</label>
          <input
            type="text"
            name="website"
            value={form.website || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
            placeholder="https://..."
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
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block font-medium mb-1 text-zinc-200">Kota</label>
            <input
              type="text"
              name="city"
              value={form.city || ""}
              onChange={handleChange}
              className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
            />
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1 text-zinc-200">Provinsi</label>
            <input
              type="text"
              name="province"
              value={form.province || ""}
              onChange={handleChange}
              className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
            />
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1 text-zinc-200">Negara</label>
            <input
              type="text"
              name="country"
              value={form.country || ""}
              onChange={handleChange}
              className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Lokasi Peta</label>
          <input
            type="text"
            name="map_location"
            value={form.map_location || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
            placeholder="lat,lng atau alamat"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Deskripsi Singkat</label>
          <input
            type="text"
            name="short_description"
            value={form.short_description || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Deskripsi Lengkap / Misi</label>
          <textarea
            name="description"
            value={form.description || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
            rows={3}
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">URL Logo</label>
          <input
            type="text"
            name="logo_url"
            value={form.logo_url || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Nama Kontak Utama</label>
          <input
            type="text"
            name="primary_contact_name"
            value={form.primary_contact_name || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Email Kontak Utama</label>
          <input
            type="email"
            name="primary_contact_email"
            value={form.primary_contact_email || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Telepon Kontak Utama</label>
          <input
            type="text"
            name="primary_contact_phone"
            value={form.primary_contact_phone || ""}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Onboarding Selesai</label>
          <input
            type="checkbox"
            name="onboarding_complete"
            checked={!!form.onboarding_complete}
            onChange={e => setForm({ ...form, onboarding_complete: e.target.checked })}
            className="mr-2"
          />
          <span className="text-zinc-400 text-sm">Tandai sebagai selesai untuk mengaktifkan organisasi</span>
        </div>
        {success && <div className="text-green-400">{success}</div>}
        {error && <div className="text-red-400">{error}</div>}
        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 text-white font-bold py-2 px-4 rounded"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
