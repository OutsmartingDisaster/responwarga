"use client";
import { useEffect, useState, useRef } from "react";
import { createApiClient } from "@/lib/api-client";
import { Upload, Building2 } from "lucide-react";
import ResponderManagement from "./ResponderManagement";
import ResponderProfile from "./ResponderProfile";

export default function OrganizationProfile() {
  const api = createApiClient();
  const [org, setOrg] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profilOrganisasi');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only fetch org data if the org profile tab is active initially or becomes active
    // Or fetch it always if needed by other tabs indirectly
    if (activeTab === 'profilOrganisasi') {
      fetchOrg();
    }
    // Potentially fetch data for other tabs if needed here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // Refetch org if tab changes back to it

  const fetchOrg = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current user profile
      const user = (await api.auth.getUser()).data.user;
      if (!user) throw new Error("User not authenticated");
      const { data: profile } = await api
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();
      if (!profile?.organization_id) throw new Error("No organization assigned");

      // Get organization
      const { data: orgData, error: orgError } = await api
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single();
      if (orgError) throw orgError;
      setOrg(orgData);
      setForm(orgData);
      setLogoPreview(orgData?.logo_url || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("File terlalu besar. Maksimal 2MB.");
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setError("Format tidak didukung. Gunakan PNG atau JPG.");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
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
      let logoUrl = form.logo_url;

      // Upload logo if new file selected
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const fileName = `logo_${id}_${Date.now()}.${ext}`;
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('bucket', 'organizations');
        formData.append('path', fileName);

        const uploadRes = await fetch('/api/uploads', { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error('Gagal mengunggah logo');
        const { data: uploadData } = await uploadRes.json();
        logoUrl = `/uploads/organizations/${uploadData.path}`;
      }

      const { error: updateError } = await api
        .from("organizations")
        .update({ ...updateData, logo_url: logoUrl })
        .eq("id", id);

      if (updateError) throw updateError;
      setForm({ ...form, logo_url: logoUrl });
      setLogoFile(null);
      setSuccess("Profil organisasi berhasil disimpan.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!form && activeTab === 'profilOrganisasi') return null; // Only return null if form is needed and not loaded

  const TabButton = ({ tabKey, label }: { tabKey: string, label: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(tabKey)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-150 
        ${activeTab === tabKey
          ? 'bg-zinc-800 border-b-2 border-blue-500 text-white'
          : 'text-zinc-400 hover:text-zinc-200 border-b-2 border-transparent hover:border-zinc-600'
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-zinc-900 text-zinc-100 p-4 sm:p-6 md:p-8 rounded">
      <h2 className="text-2xl font-bold mb-6">Pengaturan</h2>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-zinc-700 flex space-x-1">
        <TabButton tabKey="profilOrganisasi" label="Profil Organisasi" />
        <TabButton tabKey="manajemenAnggota" label="Manajemen Anggota" />
        <TabButton tabKey="profilSaya" label="Profil Saya" />
      </div>

      {/* Tab Content */}
      <div>
        {/* == Profil Organisasi Tab == */} 
        {activeTab === 'profilOrganisasi' && (
          <div className="max-w-2xl mx-auto">
             {loading && <div className="p-4 text-center">Memuat profil organisasi...</div>} 
             {error && <div className="p-4 text-red-400">Error memuat profil: {error}</div>} 
             {!loading && !error && form && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {success && <p className="text-green-400 bg-green-900/30 p-3 rounded mb-4">{success}</p>} 
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
                  <div className="flex flex-col sm:flex-row gap-2">
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
                    <label className="block font-medium mb-1 text-zinc-200">Logo Organisasi</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-zinc-700 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-600">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-10 h-10 text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm">
                          <Upload className="w-4 h-4" />
                          <span>Unggah Logo</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-zinc-400 mt-2">PNG atau JPG, maks 2MB</p>
                      </div>
                    </div>
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
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 text-white px-6 py-2 rounded font-semibold"
                    >
                      {saving ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                  </div>
                </form>
             )}
          </div>
        )}

        {/* == Manajemen Anggota Tab == */}
        {activeTab === 'manajemenAnggota' && (
          <div>
            {/* Render ResponderManagement component here */}
            {/* Pass necessary props if needed, e.g., orgId */}
            <ResponderManagement /> 
          </div>
        )}

        {/* == Profil Saya Tab == */} 
        {activeTab === 'profilSaya' && (
          <div>
            {/* Render ResponderProfile component here */}
            {/* Pass necessary props if needed, e.g., userId */}
            <ResponderProfile /> 
          </div>
        )}
      </div>
    </div>
  );
}
