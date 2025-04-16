"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/../lib/supabase/client";

export default function AssignmentManager() {
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [responders, setResponders] = useState<any[]>([]);
  const [emergencyReports, setEmergencyReports] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    type: "emergency_report",
    targetId: "",
    responderId: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOrgAndData();
    // eslint-disable-next-line
  }, []);

  const fetchOrgAndData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get org id for current user
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();
      if (!profile?.organization_id) throw new Error("No organization assigned");
      setOrgId(profile.organization_id);

      // Fetch responders in org
      const { data: respondersData } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("organization_id", profile.organization_id)
        .neq("role", "org_admin");
      setResponders(respondersData || []);

      // Fetch unassigned emergency reports
      const { data: reportsData } = await supabase
        .from("emergency_reports")
        .select("id, full_name, description, status")
        .order("created_at", { ascending: false });
      setEmergencyReports(reportsData || []);

      // Fetch unassigned contributions
      const { data: contribData } = await supabase
        .from("contributions")
        .select("id, full_name, description, status")
        .order("created_at", { ascending: false });
      setContributions(contribData || []);

      // Fetch current assignments for org
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select("*, profiles!responder_id(name)")
        .eq("organization_id", profile.organization_id)
        .order("assigned_at", { ascending: false });
      setAssignments(assignmentsData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!form.responderId || !form.targetId) throw new Error("Pilih responder dan target");
      let assignmentPayload: any = {
        organization_id: orgId,
        responder_id: form.responderId,
        status: "assigned",
        notes: form.notes,
      };
      if (form.type === "emergency_report") {
        assignmentPayload.emergency_report_id = form.targetId;
      } else {
        assignmentPayload.contribution_id = form.targetId;
      }
      // Insert assignment (unique constraint will prevent duplicates)
      const { error: insertError } = await supabase
        .from("assignments")
        .insert([assignmentPayload]);
      if (insertError) throw insertError;
      setForm({ ...form, targetId: "", responderId: "", notes: "" });
      fetchOrgAndData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Memuat data penugasan...</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;

  // Filter out already assigned reports/contributions for this org
  const assignedReportIds = assignments.map(a => a.emergency_report_id).filter(Boolean);
  const assignedContributionIds = assignments.map(a => a.contribution_id).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto bg-zinc-900 text-zinc-100 p-8 rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Dispatcher: Penugasan Responden</h2>
      <form onSubmit={handleAssign} className="mb-8 space-y-4">
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Jenis Penugasan</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
          >
            <option value="emergency_report">Laporan Darurat</option>
            <option value="contribution">Kontribusi</option>
          </select>
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Target</label>
          <select
            name="targetId"
            value={form.targetId}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
          >
            <option value="">Pilih target</option>
            {form.type === "emergency_report"
              ? emergencyReports
                  .filter(r => !assignedReportIds.includes(r.id))
                  .map(r => (
                    <option key={r.id} value={r.id}>
                      {r.full_name} - {r.description?.slice(0, 30)}... [{r.status}]
                    </option>
                  ))
              : contributions
                  .filter(c => !assignedContributionIds.includes(c.id))
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} - {c.description?.slice(0, 30)}... [{c.status}]
                    </option>
                  ))}
          </select>
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Responder</label>
          <select
            name="responderId"
            value={form.responderId}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
          >
            <option value="">Pilih responder</option>
            {responders.map(r => (
              <option key={r.id} value={r.id}>
                {r.name || r.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium mb-1 text-zinc-200">Catatan Penugasan</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            className="w-full border border-zinc-700 bg-zinc-800 text-zinc-100 rounded px-3 py-2"
            rows={2}
            placeholder="Catatan tambahan (opsional)"
          />
        </div>
        <div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded font-semibold"
            disabled={saving}
          >
            {saving ? "Menugaskan..." : "Tugaskan"}
          </button>
        </div>
      </form>
      <h3 className="font-semibold mb-2 text-zinc-200">Penugasan Aktif</h3>
      <ul className="space-y-2">
        {assignments.map(a => (
          <li key={a.id} className="bg-zinc-800 rounded px-4 py-2 flex justify-between items-center">
            <div>
              <div className="font-bold">
                {a.emergency_report_id
                  ? `Laporan Darurat: ${emergencyReports.find(r => r.id === a.emergency_report_id)?.full_name || a.emergency_report_id}`
                  : `Kontribusi: ${contributions.find(c => c.id === a.contribution_id)?.full_name || a.contribution_id}`}
              </div>
              <div className="text-sm text-zinc-400">
                Responder: {a.profiles?.name || a.responder_id} | Status: {a.status}
              </div>
              {a.notes && <div className="text-xs text-zinc-300 mt-1">Catatan: {a.notes}</div>}
            </div>
            {/* Future: add status update/cancel buttons here */}
          </li>
        ))}
      </ul>
    </div>
  );
}
