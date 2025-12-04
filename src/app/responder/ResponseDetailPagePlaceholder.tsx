'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createApiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
// import { Response } from '@/types/responses'; // Removed unused import

// --- Define Types (Reuse/Import later) ---
type DisasterResponse = {
    id: string;
    name: string;
    location: string | null;
    start_date: string | null;
    status: string;
    disaster_types: string[];
    created_at: string;
    latitude?: number | null;
    longitude?: number | null;
    parsed_address?: any | null; // Re-use ParsedAddress type if available
    organization_id: string;
};

type AssignedMember = {
    id: string; // User ID (uuid)
    name: string;
    role: string;
    // Add other relevant fields if needed
};

// TODO: Add types for different log entries (Checkin, Inventory, Activity, Delivery)

export default function ResponseDetailPage() {
    const router = useRouter();
    const params = useParams();
    const api = createApiClient();

    // --- IMPORTANT: These will be undefined when running this placeholder directly ---
    // --- They rely on the actual Next.js routing context ---
    const slug = params.slug as string;
    const responseId = params.responseId as string;
    console.warn("Running ResponseDetailPagePlaceholder: slug and responseId might be undefined here.", { slug, responseId });
    // --- End Important Note ---

    const [response, setResponse] = useState<DisasterResponse | null>(null);
    const [assignedMembers, setAssignedMembers] = useState<AssignedMember[]>([]);
    // TODO: Add state for different log types
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [orgIdFromSlug, setOrgIdFromSlug] = useState<string | null>(null); // To store org ID derived from slug

    useEffect(() => {
        // Add checks for slug and responseId existence before proceeding
        if (!responseId || !slug) {
            setError("ID Respon atau slug organisasi tidak ditemukan di URL. Placeholder might not receive params correctly.");
            setLoading(false);
            return;
        }

        const fetchInitialData = async () => {
            setLoading(true);
            setError(null);
            let fetchedOrgId = ''; // Temporary variable for org ID

            try {
                // 1. Get Organization ID from Slug
                const { data: orgData, error: orgError } = await api
                    .from('organizations')
                    .select('id')
                    .eq('slug', slug)
                    .single();

                if (orgError || !orgData) {
                    throw new Error(orgError?.message || "Organisasi tidak ditemukan untuk slug ini.");
                }
                fetchedOrgId = orgData.id;
                setOrgIdFromSlug(fetchedOrgId); // Store it for potential use

                // 2. Fetch Disaster Response Details
                const { data: responseData, error: responseError } = await api
                    .from('disaster_responses')
                    .select('*')
                    .eq('id', responseId)
                    .single();

                if (responseError) throw responseError;
                if (!responseData) throw new Error("Detail respon tidak ditemukan.");

                // 3. *** Verify Ownership ***
                if (responseData.organization_id !== fetchedOrgId) {
                    console.error(`Ownership mismatch: Response Org ID (${responseData.organization_id}) vs Slug Org ID (${fetchedOrgId})`);
                    throw new Error("Anda tidak memiliki izin untuk melihat respon ini.");
                }

                setResponse(responseData);

                // 4. Fetch Assigned Members
                const { data: assignmentsData, error: assignmentsError } = await api
                    .from('team_assignments')
                    .select(`
                        member_id,
                        profiles ( user_id, name, role )
                    `)
                    .eq('disaster_response_id', responseId); // Filter by response ID

                if (assignmentsError) throw assignmentsError;

                const members: AssignedMember[] = (assignmentsData || [])
                    .filter((a: any) => a.profiles) // Ensure profile exists
                    .map((a: any) => ({
                        id: a.profiles.user_id, // Use user_id from profiles
                        name: a.profiles.name || 'Nama Tidak Ada',
                        role: a.profiles.role || 'responder',
                    }));
                setAssignedMembers(members);


                // --- TODO: Fetch related logs (Check-in, Activity, etc.) ---
                // Example for Activity Logs (assuming 'activity_logs' table exists and has 'disaster_response_id')
                /*
                const { data: activityLogs, error: activityError } = await api
                    .from('activity_logs')
                    .select('*') // Select specific columns needed
                    .eq('disaster_response_id', responseId)
                    .order('when_time', { ascending: false }); // Or relevant timestamp field

                if (activityError) console.error("Error fetching activity logs:", activityError);
                // setActivityLogsState(activityLogs || []);
                */


            } catch (err: any) {
                console.error("Error fetching response detail data:", err);
                setError(`Gagal memuat data detail respon: ${err.message}`);
                setResponse(null);
                setAssignedMembers([]);
                // Clear other fetched data states
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [responseId, slug, api]); // Dependencies


    if (loading) return <div className="p-6 text-center text-zinc-400">Memuat detail respon...</div>;
    if (error) return <div className="p-6 text-center text-red-400">Error: {error}</div>;
    // Modify the check for placeholder usage
    if (!response && (!responseId || !slug)) return <div className="p-6 text-center text-zinc-400">Menunggu parameter URL (slug/responseId)...</div>;
    if (!response) return <div className="p-6 text-center text-zinc-400">Detail respon tidak ditemukan untuk ID: {responseId}.</div>;


    // --- Helper function to format dates ---
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('id-ID', {
                year: 'numeric', month: 'long', day: 'numeric',
                // hour: '2-digit', minute: '2-digit' // Optional: Add time if needed
            });
        } catch (e) {
            return 'Tanggal Tidak Valid';
        }
    };


    return (
        <div className="p-4 md:p-6 bg-zinc-900 text-zinc-100 min-h-screen">
            {/* Back Button - Needs slug which might be null in placeholder */}
            <button
                onClick={() => router.push(slug ? `/responder/${slug}/dashboard?menu=response_management` : '/responder')}
                className="mb-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-zinc-300 bg-zinc-700 hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-blue-500"
            >
                &larr; Kembali ke Manajemen Respon
            </button>

            <h1 className="text-3xl font-bold mb-6 text-zinc-100">{response.name}</h1>

            {/* --- Basic Info Section --- */}
            <section className="mb-8 p-6 bg-zinc-800 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4 text-zinc-200 border-b border-zinc-700 pb-2">Informasi Dasar</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="font-medium text-zinc-400 block">Jenis Bencana:</span>
                        <span className="text-zinc-100">{response.disaster_types?.join(', ') || '-'}</span>
                    </div>
                    <div>
                        <span className="font-medium text-zinc-400 block">Tanggal Mulai:</span>
                        <span className="text-zinc-100">{formatDate(response.start_date)}</span>
                    </div>
                    <div>
                        <span className="font-medium text-zinc-400 block">Status:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${response.status === 'active' ? 'bg-green-600 text-green-100' :
                            response.status === 'archived' ? 'bg-zinc-600 text-zinc-100' :
                                'bg-yellow-600 text-yellow-100' // Default/other status
                            }`}>{response.status}</span>
                    </div>
                    <div>
                        <span className="font-medium text-zinc-400 block">Dibuat Pada:</span>
                        <span className="text-zinc-100">{formatDate(response.created_at)}</span>
                    </div>
                    <div className="md:col-span-2">
                        <span className="font-medium text-zinc-400 block">Deskripsi Lokasi:</span>
                        <p className="text-zinc-100 whitespace-pre-wrap">{response.location || '-'}</p>
                    </div>
                    {/* TODO: Add Parsed Address Details if available */}
                    {/* TODO: Add Map Display */}
                </div>
            </section>

            {/* --- Assigned Team Section --- */}
            <section className="mb-8 p-6 bg-zinc-800 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4 text-zinc-200 border-b border-zinc-700 pb-2">Tim Ditugaskan</h2>
                {assignedMembers.length > 0 ? (
                    <ul className="space-y-2">
                        {assignedMembers.map(member => (
                            <li key={member.id} className="flex justify-between items-center text-sm p-2 bg-zinc-700/50 rounded">
                                <span>{member.name}</span>
                                <span className="text-xs text-zinc-400 capitalize">{member.role}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-zinc-400 italic text-sm">Belum ada anggota tim yang ditugaskan.</p>
                )}
                {/* TODO: Add button/UI to manage assignments if needed on this page */}
            </section>

            {/* --- Log Sections (Placeholder) --- */}
            <section className="p-6 bg-zinc-800 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4 text-zinc-200 border-b border-zinc-700 pb-2">Log Terkait</h2>
                {/* TODO: Implement Tabs or Accordions for different log types */}
                <p className="text-zinc-400 italic text-sm">Bagian log (Check-in, Aktivitas, Inventaris, Pengiriman) akan ditampilkan di sini...</p>

                {/* Example: Displaying Activity Logs if fetched */}
                {/*
                <h3 className="text-lg font-semibold mt-4 mb-2 text-zinc-300">Log Aktivitas</h3>
                {activityLogs && activityLogs.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                        {activityLogs.map(log => (
                            <li key={log.id} className="p-2 bg-zinc-700/50 rounded">
                                <span className="font-medium">{formatDate(log.when_time)}:</span> {log.what}
                                {log.notes && <p className="text-xs text-zinc-400 pl-2">Catatan: {log.notes}</p>}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-zinc-400 italic text-xs">Tidak ada log aktivitas.</p>
                )}
                */}
            </section>

        </div>
    );
} 