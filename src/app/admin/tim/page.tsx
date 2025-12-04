"use client";
import React, { useState, useEffect } from 'react';
import { createApiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import { saveAs } from 'file-saver';

type Profile = {
    user_id: string;
    name: string;
    role: string;
    email?: string; // Assuming we can fetch email or it's in profile
    phone?: string;
};

type Shift = {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
};

export default function TeamManagementPage() {
    const api = createApiClient();
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<Profile[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);

    // Shift Form State
    const [newShift, setNewShift] = useState({ name: '', start_time: '', end_time: '' });
    const [isAddingShift, setIsAddingShift] = useState(false);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await api.auth.getUser();
            if (!user) return;

            const { data: profile } = await api.from('profiles').select('organization_id').eq('user_id', user.id).single();
            if (!profile?.organization_id) return;
            setOrgId(profile.organization_id);

            // Fetch Members
            const { data: membersData } = await api
                .from('profiles')
                .select('*')
                .eq('organization_id', profile.organization_id);
            setMembers(membersData || []);

            // Fetch Shifts
            const { data: shiftsData } = await api
                .from('shifts')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .order('start_time', { ascending: true });
            setShifts(shiftsData || []);

        } catch (err) {
            console.error("Error fetching team data:", err);
            toast.error("Gagal memuat data tim.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgId) return;
        setIsAddingShift(true);
        try {
            const { error } = await api
                .from('shifts')
                .insert([{ ...newShift, organization_id: orgId }]);

            if (error) throw error;

            toast.success("Shift berhasil ditambahkan");
            setNewShift({ name: '', start_time: '', end_time: '' });
            fetchData(); // Refresh list
        } catch (err: any) {
            toast.error(`Gagal menambah shift: ${err.message}`);
        } finally {
            setIsAddingShift(false);
        }
    };

    const handleDeleteShift = async (id: string) => {
        if (!confirm("Hapus shift ini?")) return;
        try {
            const { error } = await api.from('shifts').delete().eq('id', id);
            if (error) throw error;
            toast.success("Shift dihapus");
            setShifts(prev => prev.filter(s => s.id !== id));
        } catch (err: any) {
            toast.error(`Gagal hapus shift: ${err.message}`);
        }
    };

    const handleExportCSV = () => {
        const csvContent = [
            ["Nama", "Role", "Telepon"],
            ...members.map(m => [m.name, m.role, m.phone || '-'])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        saveAs(blob, "tim_respon_warga.csv");
    };

    if (loading) return <div className="p-8 text-center text-zinc-400">Memuat data tim...</div>;

    return (
        <div className="p-6 bg-zinc-900 min-h-screen text-zinc-100 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Manajemen Tim</h1>
                    <p className="text-zinc-400 text-sm">Kelola anggota dan jadwal shift.</p>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
                >
                    📥 Export CSV
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Member List (2/3) */}
                <section className="lg:col-span-2 bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
                    <div className="p-4 border-b border-zinc-700 bg-zinc-800/50">
                        <h3 className="font-semibold">👥 Daftar Anggota ({members.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-900/50 text-zinc-400 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Nama</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Kontak</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700">
                                {members.map(member => (
                                    <tr key={member.user_id} className="hover:bg-zinc-700/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-zinc-200">{member.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${member.role === 'org_admin' ? 'bg-purple-900/50 text-purple-400' : 'bg-blue-900/50 text-blue-400'}`}>
                                                {member.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-400">{member.phone || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-green-400 text-xs">● Aktif</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Shift Management (1/3) */}
                <section className="bg-zinc-800 rounded-xl border border-zinc-700 flex flex-col">
                    <div className="p-4 border-b border-zinc-700 bg-zinc-800/50">
                        <h3 className="font-semibold">🕒 Jadwal Shift</h3>
                    </div>

                    {/* Add Shift Form */}
                    <div className="p-4 border-b border-zinc-700 bg-zinc-900/30">
                        <form onSubmit={handleAddShift} className="space-y-3">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Nama Shift (e.g. Pagi)"
                                    required
                                    value={newShift.name}
                                    onChange={e => setNewShift({ ...newShift, name: e.target.value })}
                                    className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="time"
                                    required
                                    value={newShift.start_time}
                                    onChange={e => setNewShift({ ...newShift, start_time: e.target.value })}
                                    className="w-1/2 bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:ring-blue-500"
                                />
                                <input
                                    type="time"
                                    required
                                    value={newShift.end_time}
                                    onChange={e => setNewShift({ ...newShift, end_time: e.target.value })}
                                    className="w-1/2 bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:ring-blue-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isAddingShift}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                {isAddingShift ? 'Menambah...' : '+ Tambah Shift'}
                            </button>
                        </form>
                    </div>

                    {/* Shift List */}
                    <div className="flex-grow overflow-y-auto p-4 space-y-2 custom-scrollbar max-h-[300px]">
                        {shifts.length === 0 ? (
                            <p className="text-zinc-500 text-center text-sm">Belum ada shift.</p>
                        ) : (
                            shifts.map(shift => (
                                <div key={shift.id} className="flex justify-between items-center bg-zinc-700/30 p-3 rounded-lg border border-zinc-700">
                                    <div>
                                        <div className="font-medium text-zinc-200 text-sm">{shift.name}</div>
                                        <div className="text-xs text-zinc-400">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteShift(shift.id)}
                                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
