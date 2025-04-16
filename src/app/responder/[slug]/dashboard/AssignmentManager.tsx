"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";

// Struktur data laporan/kontribusi
type LaporanItem = {
  id: string;
  jenis: string;
  judul: string;
  lokasi: string;
  waktu: string;
  status: string;
  responderId: string;
  responderNama: string;
  catatan: string;
  tipe: "emergency_report" | "contribution";
};

type AnggotaTim = {
  id: string;
  nama: string;
};

// ... (imports and types remain unchanged)

const AssignmentManager = () => {
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [laporan, setLaporan] = useState<LaporanItem[]>([]);
  const [anggotaTim, setAnggotaTim] = useState<AnggotaTim[]>([]);
  const [selectedResponder, setSelectedResponder] = useState<{ [laporanId: string]: string }>({});
  const [catatan, setCatatan] = useState<{ [laporanId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Ambil organization_id dari slug
  useEffect(() => {
    async function fetchOrgId() {
      if (!slug) return;
      const { data, error } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .single();
      if (data?.id) {
        setOrgId(data.id);
      }
    }
    fetchOrgId();
    // eslint-disable-next-line
  }, [slug]);

  // Ambil role user dan organization_id user
  useEffect(() => {
    async function fetchUserProfile() {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, organization_id")
        .eq("user_id", user.id)
        .single();
      // Debug output
      // eslint-disable-next-line no-console
      console.log("Profile fetched:", profile, "orgId:", orgId, "profileError:", profileError);
      setRole(profile?.role || null);
      setUserOrgId(profile?.organization_id || null);
      // Izinkan org_admin, org_manager, dan admin dari organisasi ini
      const allowedRoles = ["org_admin", "org_manager", "admin"];
      if (!allowedRoles.includes(profile?.role) || !orgId || profile?.organization_id !== orgId) {
        // eslint-disable-next-line no-console
        console.error("Access denied debug:", { profile, orgId, allowedRoles });
        setAccessDenied(true);
      }
    }
    if (orgId) {
      fetchUserProfile();
    }
    // eslint-disable-next-line
  }, [orgId]);

  // Ambil data laporan darurat, kontribusi, assignments, dan anggota tim
  useEffect(() => {
    async function fetchData() {
      if (!orgId) return;
      setLoading(true);

      // Fetch anggota tim (role: responder)
      const { data: team, error: teamError } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("role", "responder");
      if (teamError) {
        // eslint-disable-next-line no-console
        console.error("Error fetching team members:", teamError);
      }
      setAnggotaTim(
        (team || []).map((p: any) => ({
          id: p.id,
          nama: p.name,
        }))
      );

      // Fetch assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from("assignments")
        .select("*")
        .eq("organization_id", orgId);
      if (assignmentsError) {
        // eslint-disable-next-line no-console
        console.error("Error fetching assignments:", assignmentsError);
      }

      // Fetch laporan darurat
      const { data: emergencies } = await supabase
        .from("emergency_reports")
        .select("id, title, location, created_at");

      // Fetch kontribusi
      const { data: contributions } = await supabase
        .from("contributions")
        .select("id, title, location, created_at");

      // Gabungkan dan map ke format LaporanItem
      const laporanList: LaporanItem[] = [];

      // Emergency reports
      (emergencies || []).forEach((e: any) => {
        const assignment = (assignments || []).find(
          (a: any) => a.emergency_report_id === e.id
        );
        laporanList.push({
          id: e.id,
          jenis: "Laporan Darurat",
          judul: e.title,
          lokasi: e.location,
          waktu: e.created_at,
          status: assignment
            ? assignment.status === "assigned"
              ? "Ditugaskan"
              : assignment.status === "accepted"
              ? "Diterima"
              : assignment.status === "in_progress"
              ? "Sedang Berjalan"
              : assignment.status === "completed"
              ? "Selesai"
              : assignment.status === "cancelled"
              ? "Dibatalkan"
              : assignment.status
            : "Belum Ditugaskan",
          responderId: assignment?.responder_id || "",
          responderNama: assignment?.responder_id
            ? anggotaTim.find((a) => a.id === assignment.responder_id)?.nama || "-"
            : "",
          catatan: assignment?.notes || "",
          tipe: "emergency_report",
        });
      });

      // Contributions
      (contributions || []).forEach((c: any) => {
        const assignment = (assignments || []).find(
          (a: any) => a.contribution_id === c.id
        );
        laporanList.push({
          id: c.id,
          jenis: "Kontribusi",
          judul: c.title,
          lokasi: c.location,
          waktu: c.created_at,
          status: assignment
            ? assignment.status === "assigned"
              ? "Ditugaskan"
              : assignment.status === "accepted"
              ? "Diterima"
              : assignment.status === "in_progress"
              ? "Sedang Berjalan"
              : assignment.status === "completed"
              ? "Selesai"
              : assignment.status === "cancelled"
              ? "Dibatalkan"
              : assignment.status
            : "Belum Ditugaskan",
          responderId: assignment?.responder_id || "",
          responderNama: assignment?.responder_id
            ? anggotaTim.find((a) => a.id === assignment.responder_id)?.nama || "-"
            : "",
          catatan: assignment?.notes || "",
          tipe: "contribution",
        });
      });

      setLaporan(laporanList);
      setLoading(false);
    }
    if (!accessDenied) {
      fetchData();
    }
    // eslint-disable-next-line
  }, [orgId, accessDenied]);

  // Handler untuk memilih responder
  const handleResponderChange = (laporanId: string, responderId: string) => {
    setSelectedResponder((prev) => ({ ...prev, [laporanId]: responderId }));
  };

  // Handler untuk input catatan
  const handleCatatanChange = (laporanId: string, value: string) => {
    setCatatan((prev) => ({ ...prev, [laporanId]: value }));
  };

  // Handler untuk aksi penugasan
  const handleTugaskan = async (item: LaporanItem) => {
    if (!orgId) return;
    const responderId = selectedResponder[item.id];
    const notes = catatan[item.id] || "";
    if (!responderId) return;

    // Insert ke assignments
    let insertObj: any = {
      organization_id: orgId,
      responder_id: responderId,
      status: "assigned",
      notes,
    };
    if (item.tipe === "emergency_report") {
      insertObj.emergency_report_id = item.id;
    } else {
      insertObj.contribution_id = item.id;
    }

    const { error } = await supabase.from("assignments").insert([insertObj]);
    if (error) {
      alert("Gagal menugaskan: " + error.message);
    } else {
      alert("Penugasan berhasil!");
      // Refresh data
      setSelectedResponder((prev) => ({ ...prev, [item.id]: "" }));
      setCatatan((prev) => ({ ...prev, [item.id]: "" }));
      // Re-fetch data
      if (orgId) {
        setOrgId(orgId);
      }
    }
  };

  if (accessDenied) {
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        Akses ditolak. Hanya admin organisasi yang dapat mengakses halaman ini (org_admin/org_manager).
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Manajer Penugasan</h1>
      <p className="mb-6 text-gray-700">
        Halaman ini digunakan oleh admin organisasi untuk menugaskan anggota tim pada laporan darurat atau kontribusi.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border">Jenis</th>
              <th className="px-4 py-2 border">Judul</th>
              <th className="px-4 py-2 border">Lokasi</th>
              <th className="px-4 py-2 border">Waktu</th>
              <th className="px-4 py-2 border">Status Penugasan</th>
              <th className="px-4 py-2 border">Responder</th>
              <th className="px-4 py-2 border">Catatan</th>
              <th className="px-4 py-2 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  Memuat data...
                </td>
              </tr>
            ) : (
              laporan.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 border">{item.jenis}</td>
                  <td className="px-4 py-2 border">{item.judul}</td>
                  <td className="px-4 py-2 border">{item.lokasi}</td>
                  <td className="px-4 py-2 border">{item.waktu}</td>
                  <td className="px-4 py-2 border">{item.status}</td>
                  <td className="px-4 py-2 border">
                    {item.status === "Belum Ditugaskan" ? (
                      <select
                        className="border rounded px-2 py-1"
                        value={selectedResponder[item.id] || ""}
                        onChange={(e) => handleResponderChange(item.id, e.target.value)}
                      >
                        <option value="">Pilih Responder</option>
                        {anggotaTim.map((anggota) => (
                          <option key={anggota.id} value={anggota.id}>
                            {anggota.nama}
                          </option>
                        ))}
                      </select>
                    ) : (
                      item.responderNama
                    )}
                  </td>
                  <td className="px-4 py-2 border">
                    {item.status === "Belum Ditugaskan" ? (
                      <input
                        type="text"
                        className="border rounded px-2 py-1"
                        placeholder="Catatan"
                        value={catatan[item.id] || ""}
                        onChange={(e) => handleCatatanChange(item.id, e.target.value)}
                      />
                    ) : (
                      item.catatan
                    )}
                  </td>
                  <td className="px-4 py-2 border">
                    {item.status === "Belum Ditugaskan" ? (
                      <button
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        onClick={() => handleTugaskan(item)}
                        disabled={!selectedResponder[item.id]}
                      >
                        Tugaskan
                      </button>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssignmentManager;
