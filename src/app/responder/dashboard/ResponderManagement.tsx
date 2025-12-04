"use client";
import { useEffect, useState } from "react";
import { createApiClient } from "@/lib/api-client";

export default function ResponderManagement() {
  const api = createApiClient();
  const [responders, setResponders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState<any | null>(null);
  const [inviteForm, setInviteForm] = useState<any>({ email: "", full_name: "" });
  const [assignmentForm, setAssignmentForm] = useState<any>({ location_name: "", location_lat: "", location_lng: "", notes: "" });
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    fetchResponders();
  }, []);

  const fetchResponders = async () => {
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

      // Get all responders in the org (exclude org_admins)
      const { data: users, error: usersError } = await api
        .from("profiles")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .neq("role", "org_admin")
        .order("name", { ascending: true }); // Use 'name'

      if (usersError) throw usersError;
      setResponders(users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (responder: any) => {
    setSelected(responder);
    setForm(responder);
    setSuccess(null);
    setError(null);
    setAssignmentForm({ location_name: "", location_lat: "", location_lng: "", notes: "" });
    setAssignSuccess(null);
    setAssignError(null);
    fetchAssignments(responder.id);
  };

  const fetchAssignments = async (profileId: number) => {
    try {
      const { data, error } = await api
        .from("team_assignments")
        .select("*")
        .eq("profile_id", profileId)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      setAssignments(data || []);
    } catch (err: any) {
      setAssignError(err.message);
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
      const { error: updateError } = await api
        .from("profiles")
        .update({
          name: form.name, // Use 'name'
          phone_number: form.phone_number,
          email: form.email,
          address: form.address,
        })
        .eq("id", form.id);
      if (updateError) throw updateError;
      setSuccess("Responder profile updated.");
      fetchResponders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Memuat...</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto bg-zinc-900 text-zinc-100 p-8 rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Manajemen Tim</h2>
      <div className="flex gap-8">
        <div className="w-1/2">
          <h3 className="font-semibold mb-2 text-zinc-200">Tim</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setInviting(true);
              setError(null);
              setSuccess(null);
              try {
                // Get current user profile for org_id
                const user = (await api.auth.getUser()).data.user;
                if (!user) throw new Error("Pengguna tidak terautentikasi");
                const { data: profile } = await api
                  .from("profiles")
                  .select("organization_id")
                  .eq("user_id", user.id)
                  .single();
                if (!profile?.organization_id) throw new Error("Tidak ada organisasi");

                // Insert new team member (responder)
                const { error: insertError } = await api
                  .from("profiles")
                  .insert([
                    {
                      email: inviteForm.email,
                      name: inviteForm.name, // Use 'name'
                      organization_id: profile.organization_id,
                      role: "responder",
                    },
                  ]);
                if (insertError) throw insertError;
                setSuccess("Anggota tim berhasil diundang/dibuat.");
                setInviteForm({ email: "", name: "" }); // Use 'name'
                fetchResponders();
              } catch (err: any) {
                setError(err.message);
              } finally {
                setInviting(false);
              }
            }}
            className="mb-4 space-y-2"
          >
            <h4 className="font-semibold text-zinc-200 mb-1">Tambah/Undang Anggota Tim</h4>
            <input
              type="text"
              name="name" // Use 'name'
              value={inviteForm.name} // Use 'name'
              onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} // Use 'name'
              placeholder="Nama Lengkap"
              className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
              required
            />
            <input
              type="email"
              name="email"
              value={inviteForm.email}
              onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="Email"
              className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-1 rounded font-semibold"
              disabled={inviting}
            >
              {inviting ? "Mengundang..." : "Tambah/Undang"}
            </button>
            {success && <div className="text-green-400">{success}</div>}
            {error && <div className="text-red-400">{error}</div>}
          </form>
          <ul className="space-y-2">
            {responders.map((r) => (
              <li key={r.id}>
                <button
                  className={`w-full text-left px-3 py-2 rounded ${
                    selected?.id === r.id
                      ? "bg-blue-700 text-white"
                      : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                  }`}
                  onClick={() => handleSelect(r)}
                >
                  {r.name || r.email} {/* Use 'name' */}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-1/2">
          {selected && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <h4 className="font-semibold text-zinc-200 mb-2">Edit Profil</h4>
                <div>
                  <label className="block font-medium mb-1 text-zinc-200">Nama Lengkap</label>
                  <input
                    type="text"
                    name="name" // Use 'name'
                    value={form.name || ""} // Use 'name'
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
                {success && <div className="text-green-400">Profil responder diperbarui.</div>}
                {error && <div className="text-red-400">{error}</div>}
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded font-semibold"
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </form>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAssigning(true);
                  setAssignSuccess(null);
                  setAssignError(null);
                  try {
                    // Get current user profile for org_id
                    const user = (await api.auth.getUser()).data.user;
                    if (!user) throw new Error("Pengguna tidak terautentikasi");
                    const { data: profile } = await api
                      .from("profiles")
                      .select("organization_id")
                      .eq("user_id", user.id)
                      .single();
                    if (!profile?.organization_id) throw new Error("Tidak ada organisasi");

                    // Insert assignment
                    const { error: insertError } = await api
                      .from("team_assignments")
                      .insert([
                        {
                          profile_id: selected.id,
                          organization_id: profile.organization_id,
                          location_name: assignmentForm.location_name,
                          location_lat: assignmentForm.location_lat ? Number(assignmentForm.location_lat) : null,
                          location_lng: assignmentForm.location_lng ? Number(assignmentForm.location_lng) : null,
                          notes: assignmentForm.notes,
                        },
                      ]);
                    if (insertError) throw insertError;
                    setAssignSuccess("Penugasan berhasil disimpan.");
                    setAssignmentForm({ location_name: "", location_lat: "", location_lng: "", notes: "" });
                    fetchAssignments(selected.id);
                  } catch (err: any) {
                    setAssignError(err.message);
                  } finally {
                    setAssigning(false);
                  }
                }}
                className="space-y-2 mt-8"
              >
                <h4 className="font-semibold text-zinc-200 mb-1">Penugasan Lokasi Respon</h4>
                <input
                  type="text"
                  name="location_name"
                  value={assignmentForm.location_name}
                  onChange={e => setAssignmentForm({ ...assignmentForm, location_name: e.target.value })}
                  placeholder="Nama Lokasi"
                  className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="location_lat"
                    value={assignmentForm.location_lat}
                    onChange={e => setAssignmentForm({ ...assignmentForm, location_lat: e.target.value })}
                    placeholder="Latitude"
                    className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
                  />
                  <input
                    type="text"
                    name="location_lng"
                    value={assignmentForm.location_lng}
                    onChange={e => setAssignmentForm({ ...assignmentForm, location_lng: e.target.value })}
                    placeholder="Longitude"
                    className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
                  />
                </div>
                <input
                  type="text"
                  name="notes"
                  value={assignmentForm.notes}
                  onChange={e => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                  placeholder="Catatan"
                  className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
                />
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-1 rounded font-semibold"
                  disabled={assigning}
                >
                  {assigning ? "Menugaskan..." : "Simpan Penugasan"}
                </button>
                {assignSuccess && <div className="text-green-400">{assignSuccess}</div>}
                {assignError && <div className="text-red-400">{assignError}</div>}
              </form>
              <div className="mt-6">
                <h5 className="font-semibold text-zinc-200 mb-2">Riwayat Penugasan</h5>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
