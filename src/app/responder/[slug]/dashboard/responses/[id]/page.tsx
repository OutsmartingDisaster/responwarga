"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createApiClient } from '@/lib/api-client';
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-hot-toast';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// --- Dynamically import Leaflet components ---
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false, loading: () => <div className="h-64 w-full flex items-center justify-center bg-zinc-700 text-zinc-400">Memuat peta...</div> });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });

// --- Wrapper for Marker ---
function LocationMarker({ position }: { position: [number, number] }) {
    const markerRef = useRef<L.Marker>(null);

    useEffect(() => {
        (async () => {
            const L = (await import('leaflet')).default;
            const iconRetinaUrl = (await import('leaflet/dist/images/marker-icon-2x.png')).default.src;
            const iconUrl = (await import('leaflet/dist/images/marker-icon.png')).default.src;
            const shadowUrl = (await import('leaflet/dist/images/marker-shadow.png')).default.src;

            delete (L.Icon.Default.prototype as any)._getIconUrl;

            L.Icon.Default.mergeOptions({
                iconRetinaUrl: iconRetinaUrl,
                iconUrl: iconUrl,
                shadowUrl: shadowUrl,
            });
        })();
    }, []);

    return <Marker position={position} ref={markerRef} />;
}

type DisasterResponse = {
    id: string;
    name: string;
    location: string | null;
    start_date: string | null;
    status: string; // active, finished, etc.
    task_status?: string; // assigned, accepted, on_the_way, arrived, completed
    disaster_types: string[];
    description?: string;
    urgency?: string;
    affected_count?: number;
    latitude?: number | null;
    longitude?: number | null;
    reported_at?: string;
    completed_at?: string;
};

export default function TaskDetailPage() {
    const api = createApiClient();
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const id = params.id as string;

    const [response, setResponse] = useState<DisasterResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    // Fetch Response Details
    useEffect(() => {
        const fetchResponse = async () => {
            setLoading(true);
            try {
                const { data, error } = await api
                    .from('disaster_responses')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setResponse(data);
            } catch (err: any) {
                console.error("Error fetching response:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchResponse();
    }, [id, api]);

    const handleStatusUpdate = async (newStatus: string) => {
        if (!response) return;
        setUpdating(true);
        try {
            const updates: any = { status: 'active' }; // Default to active

            // Map button actions to status updates
            // We might need a separate column for 'task_progress' if 'status' is just active/finished
            // For MVP, let's use 'status' field if it allows arbitrary strings, or assume we added 'task_status'
            // Based on schema update, we didn't add 'task_status'. Let's use 'description' to store status for now? 
            // No, that's hacky. Let's assume 'status' can hold these values or we update 'status' to 'finished' only at the end.
            // Actually, let's use a local state simulation for the UI if DB doesn't support it yet, 
            // BUT we want to persist it.
            // Let's assume we can update 'urgency' or just append to description for now if we can't change schema again easily.
            // WAIT, I can run another schema update.
            // For now, let's just update 'status' column. It's text, so it should be fine.

            if (newStatus === 'completed') {
                updates.status = 'finished';
                updates.completed_at = new Date().toISOString();
            } else {
                updates.status = newStatus; // accepted, on_the_way, arrived
            }

            const { error } = await api
                .from('disaster_responses')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            setResponse(prev => prev ? { ...prev, ...updates } : null);
            toast.success(`Status diperbarui: ${newStatus.replace('_', ' ').toUpperCase()}`);

            if (newStatus === 'completed') {
                // Redirect back to dashboard - use new route pattern
                router.push(`/${slug}/responder/dashboard`);
            }

        } catch (err: any) {
            toast.error(`Gagal update status: ${err.message}`);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-zinc-400">Memuat detail tugas...</div>;
    if (error || !response) return <div className="p-8 text-center text-red-400">Error: {error || "Tugas tidak ditemukan"}</div>;

    const mapPosition: [number, number] | null = response.latitude && response.longitude ? [response.latitude, response.longitude] : null;

    // Determine current step for UI
    const steps = ['assigned', 'accepted', 'on_the_way', 'arrived', 'finished'];
    const currentStepIndex = steps.indexOf(response.status) === -1 ? 0 : steps.indexOf(response.status);

    return (
        <div className="space-y-6 pb-20">
            {/* Header / Nav */}
            <div className="flex items-center gap-3">
                <Link href={`/${slug}/responder/dashboard`} className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300">
                    ←
                </Link>
                <div>
                    <h2 className="text-xl font-bold text-zinc-100">Detail Tugas</h2>
                    <p className="text-xs text-zinc-400">#{response.id.slice(0, 8)}</p>
                </div>
            </div>

            {/* Emergency Info Card */}
            <section className="bg-zinc-800 rounded-xl p-4 border border-zinc-700 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 text-xs px-3 py-1 rounded-bl-lg font-bold uppercase tracking-wider">
                    {response.urgency || 'URGENT'}
                </div>

                <h3 className="text-2xl font-bold text-zinc-100 mb-2">{response.name}</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase">Jenis Bencana</p>
                        <p className="text-zinc-200 font-medium">{response.disaster_types?.join(', ')}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 uppercase">Waktu Laporan</p>
                        <p className="text-zinc-200 font-medium">{response.reported_at ? new Date(response.reported_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 uppercase">Terdampak</p>
                        <p className="text-zinc-200 font-medium">{response.affected_count || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 uppercase">Status</p>
                        <p className="text-blue-400 font-medium uppercase">{response.status.replace('_', ' ')}</p>
                    </div>
                </div>

                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-700/50">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        {response.description || "Tidak ada deskripsi tambahan."}
                    </p>
                </div>
            </section>

            {/* Map & Navigation */}
            <section className="bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
                <div className="h-48 w-full relative z-0">
                    {mapPosition ? (
                        <MapContainer center={mapPosition} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <LocationMarker position={mapPosition} />
                        </MapContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-zinc-700 text-zinc-400">
                            Lokasi tidak tersedia
                        </div>
                    )}
                </div>
                <div className="p-3 flex gap-2">
                    <a
                        href={mapPosition ? `https://www.google.com/maps/dir/?api=1&destination=${mapPosition[0]},${mapPosition[1]}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm text-center transition-colors ${!mapPosition ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        🗺️ Navigasi (Google Maps)
                    </a>
                </div>
            </section>

            {/* Action Buttons (Workflow) */}
            <section className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900 border-t border-zinc-800 z-50">
                <div className="max-w-md mx-auto flex flex-col gap-3">
                    {/* Status Progress Bar */}
                    <div className="flex justify-between px-2 mb-2">
                        {steps.map((step, idx) => (
                            <div key={step} className={`w-full h-1 mx-0.5 rounded-full ${idx <= currentStepIndex ? 'bg-blue-500' : 'bg-zinc-700'}`}></div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        {response.status === 'active' || response.status === 'assigned' ? (
                            <button
                                onClick={() => handleStatusUpdate('accepted')}
                                disabled={updating}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transition-all"
                            >
                                {updating ? 'Memproses...' : 'Terima Tugas'}
                            </button>
                        ) : response.status === 'accepted' ? (
                            <button
                                onClick={() => handleStatusUpdate('on_the_way')}
                                disabled={updating}
                                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-yellow-900/20 transition-all"
                            >
                                {updating ? 'Memproses...' : 'Menuju Lokasi 🚚'}
                            </button>
                        ) : response.status === 'on_the_way' ? (
                            <button
                                onClick={() => handleStatusUpdate('arrived')}
                                disabled={updating}
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-orange-900/20 transition-all"
                            >
                                {updating ? 'Memproses...' : 'Sampai di Lokasi 📍'}
                            </button>
                        ) : response.status === 'arrived' ? (
                            <div className="w-full flex gap-2">
                                <button className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-3 rounded-xl font-bold">
                                    📸 Upload Bukti
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate('completed')}
                                    disabled={updating}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-green-900/20 transition-all"
                                >
                                    {updating ? 'Memproses...' : 'Selesai ✅'}
                                </button>
                            </div>
                        ) : (
                            <div className="w-full bg-zinc-800 text-zinc-400 py-3 rounded-xl font-bold text-center border border-zinc-700">
                                Tugas Selesai
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
