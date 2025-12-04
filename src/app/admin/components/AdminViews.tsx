import React from 'react';
import {
    Users,
    FileText,
    Settings,
    Search,
    Filter,
    MoreHorizontal,
    Plus,
    Download,
    Shield,
    CheckCircle2,
    AlertTriangle,
    Clock,
    MapPin,
    Save
} from 'lucide-react';
import { LiveMap, Badge } from '../../components/DashboardSharedUI';

// --- Team Management View ---
export const TeamManagementView = ({ members = [] }: { members?: any[] }) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Manajemen Personil</h2>
                    <p className="text-slate-400 text-sm">Kelola anggota tim dan relawan</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-sm text-slate-300 transition-colors">
                        <Download size={16} /> Export
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm text-white font-medium shadow-lg shadow-blue-600/20 transition-colors">
                        <Plus size={16} /> Tambah Anggota
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/40 border border-white/5 p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users size={20} /></div>
                        <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-full">+2 minggu ini</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{members.length}</div>
                    <div className="text-sm text-slate-400">Total Personil</div>
                </div>
                <div className="bg-slate-800/40 border border-white/5 p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><CheckCircle2 size={20} /></div>
                    </div>
                    <div className="text-2xl font-bold text-white">{members.filter(m => m.status === 'active').length}</div>
                    <div className="text-sm text-slate-400">Sedang Aktif</div>
                </div>
                <div className="bg-slate-800/40 border border-white/5 p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400"><Clock size={20} /></div>
                    </div>
                    <div className="text-2xl font-bold text-white">12</div>
                    <div className="text-sm text-slate-400">Menunggu Verifikasi</div>
                </div>
            </div>

            {/* Team Table */}
            <div className="bg-slate-800/40 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Cari personil..."
                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border border-white/5"><Filter size={18} /></button>
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border border-white/5"><Settings size={18} /></button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900/50 text-slate-200 font-medium uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Nama / ID</th>
                                <th className="px-6 py-4">Peran</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Kontak</th>
                                <th className="px-6 py-4">Bergabung</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {members.length > 0 ? members.map((member, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                                                {member.full_name ? member.full_name.substring(0, 2).toUpperCase() : 'UN'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{member.full_name || 'Unnamed'}</div>
                                                <div className="text-xs text-slate-500">ID: {member.id.substring(0, 8)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge color={member.role === 'org_admin' ? 'purple' : 'blue'}>
                                            {member.role === 'org_admin' ? 'ADMIN' : 'RESPONDER'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                                            {member.status === 'active' ? 'Online' : 'Offline'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{member.phone || '-'}</td>
                                    <td className="px-6 py-4">{new Date(member.created_at || Date.now()).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Tidak ada data personil.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Reports View ---
export const ReportsView = ({ reports = [] }: { reports?: any[] }) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Laporan Masuk</h2>
                    <p className="text-slate-400 text-sm">Pantau dan tindak lanjuti laporan masyarakat</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-sm text-slate-300 transition-colors">
                        <Filter size={16} /> Filter
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {reports.length > 0 ? reports.map((report) => (
                    <div key={report.id} className="bg-slate-800/40 border border-white/5 p-5 rounded-2xl hover:bg-slate-800/60 transition-all group">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Image Thumbnail Placeholder */}
                            <div className="w-full md:w-48 h-32 bg-slate-900/50 rounded-xl border border-white/5 flex items-center justify-center text-slate-600 shrink-0">
                                <FileText size={32} />
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex gap-2">
                                        <Badge color={report.urgency === 'HIGH' ? 'red' : 'orange'}>{report.urgency || 'MEDIUM'}</Badge>
                                        <Badge color="blue">{report.disaster_type || 'UMUM'}</Badge>
                                    </div>
                                    <span className="text-xs text-slate-500 font-mono">{new Date(report.created_at).toLocaleString()}</span>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-2">{report.title || report.name || 'Laporan Tanpa Judul'}</h3>
                                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{report.description || 'Tidak ada deskripsi.'}</p>

                                <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                                    <span className="flex items-center gap-1"><MapPin size={14} /> {report.location || 'Lokasi tidak diketahui'}</span>
                                    <span className="flex items-center gap-1"><Users size={14} /> {report.reporter_name || 'Anonim'}</span>
                                </div>

                                <div className="flex gap-3">
                                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors">
                                        Tindak Lanjuti
                                    </button>
                                    <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors">
                                        Lihat Detail
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-12 text-slate-500 bg-slate-800/20 rounded-2xl border border-white/5">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Belum ada laporan masuk.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Map View ---
export const MapView = ({ activeResponses = [] }: { activeResponses?: any[] }) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col pb-6">
            <div className="flex justify-between items-center mb-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-white">Peta Wilayah</h2>
                    <p className="text-slate-400 text-sm">Pemetaan real-time bencana dan personil</p>
                </div>
            </div>

            <div className="flex-1 relative bg-slate-800/30 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden min-h-[500px]">
                <div className="absolute top-6 left-6 z-10 pointer-events-none bg-slate-900/80 p-3 rounded-xl backdrop-blur-md border border-white/10 shadow-2xl">
                    <Badge color="blue">LIVE MONITORING</Badge>
                    <h3 className="text-base font-bold text-white mt-2">Jakarta Utara</h3>
                    <p className="text-xs text-slate-400">{activeResponses.length} Titik Aktif</p>
                </div>

                <LiveMap center={[106.8456, -6.1588]} zoom={12} markers={activeResponses} />

                <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 rounded-lg border border-white/10 text-xs text-white">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Bencana Alam
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 rounded-lg border border-white/10 text-xs text-white">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Personil
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 rounded-lg border border-white/10 text-xs text-white">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span> Posko
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Settings View ---
export const SettingsView = () => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-10 max-w-4xl">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Pengaturan</h2>
                    <p className="text-slate-400 text-sm">Konfigurasi organisasi dan sistem</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm text-white font-medium shadow-lg shadow-blue-600/20 transition-colors">
                    <Save size={16} /> Simpan Perubahan
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Organization Profile */}
                <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Shield size={18} className="text-blue-400" /> Profil Organisasi</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400">Nama Organisasi</label>
                            <input type="text" defaultValue="BPBD Jakarta Utara" className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400">Kode Wilayah</label>
                            <input type="text" defaultValue="JKT-UTR-01" className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs text-slate-400">Alamat Posko Utama</label>
                            <input type="text" defaultValue="Jl. Yos Sudarso No. 1, Tanjung Priok" className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
                        </div>
                    </div>
                </div>

                {/* Notification Settings */}
                <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-orange-400" /> Notifikasi & Alert</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-xl border border-white/5">
                            <div>
                                <div className="text-sm font-medium text-white">Notifikasi Darurat (SOS)</div>
                                <div className="text-xs text-slate-500">Bunyikan alarm saat ada sinyal SOS dari responder</div>
                            </div>
                            <div className="w-10 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-xl border border-white/5">
                            <div>
                                <div className="text-sm font-medium text-white">Laporan Baru</div>
                                <div className="text-xs text-slate-500">Kirim notifikasi email untuk setiap laporan masuk</div>
                            </div>
                            <div className="w-10 h-6 bg-slate-700 rounded-full relative cursor-pointer">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full shadow-sm"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
