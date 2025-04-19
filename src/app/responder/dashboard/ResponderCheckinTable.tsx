"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResponderCheckinTable({ dailyLogId }: { dailyLogId: string }) {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, [dailyLogId]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: logsError } = await supabase
        .from("responder_logs")
        .select("*, profiles!responder_id(name)")
        .eq("daily_log_id", dailyLogId)
        .order("check_in_time", { ascending: true });
      if (logsError) throw logsError;
      setLogs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    setError(null);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Pengguna tidak terautentikasi");
      // Check if already checked in
      const already = logs.find((l) => l.responder_id === user.id && l.check_in_time && !l.check_out_time);
      if (already) throw new Error("Sudah check-in dan belum check-out.");
      const now = new Date().toISOString();
      const { error: insertError } = await supabase
        .from("responder_logs")
        .insert([
          {
            daily_log_id: dailyLogId,
            responder_id: user.id,
            check_in_time: now,
            check_in_location: "N/A", // TODO: Add location picker
          },
        ]);
      if (insertError) throw insertError;
      fetchLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    setError(null);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Pengguna tidak terautentikasi");
      // Find today's log for this user
      const log = logs.find((l) => l.responder_id === user.id && l.check_in_time && !l.check_out_time);
      if (!log) throw new Error("Tidak ditemukan check-in aktif.");
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("responder_logs")
        .update({
          check_out_time: now,
          check_out_location: "N/A", // TODO: Add location picker
        })
        .eq("id", log.id);
      if (updateError) throw updateError;
      fetchLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) return <div className="p-2">Memuat...</div>;
  if (error) return <div className="p-2 text-red-400">{error}</div>;

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <button
          className="bg-green-600 text-white px-4 py-1 rounded font-semibold"
          onClick={handleCheckIn}
          disabled={checkingIn}
        >
          {checkingIn ? "Sedang Check In..." : "Check In"}
        </button>
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded font-semibold"
          onClick={handleCheckOut}
          disabled={checkingOut}
        >
          {checkingOut ? "Sedang Check Out..." : "Check Out"}
        </button>
      </div>
      <table className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded">
        <thead>
          <tr className="bg-zinc-800 text-zinc-200">
            <th className="px-2 py-1">Responder</th>
            <th className="px-2 py-1">Check In</th>
            <th className="px-2 py-1">Check Out</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t border-zinc-700">
              <td className="px-2 py-1">{log.responder?.name || log.responder_id}</td>
              <td className="px-2 py-1">{log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString() : "-"}</td>
              <td className="px-2 py-1">{log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString() : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
