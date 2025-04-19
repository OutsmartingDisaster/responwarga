'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Define type for Disaster Response data (reuse or import if defined elsewhere)
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
    // Add parsed_address if you need to display/edit it
    parsed_address?: any | null;
    organization_id: string;
};

export default function EditDisasterResponsePage() {
    const router = useRouter();
    const params = useParams();
    const supabase = createClient();

    const slug = params.slug as string;
    const responseId = params.responseId as string;

    const [response, setResponse] = useState<DisasterResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

     // Add form state based on DisasterResponse type
    const [formData, setFormData] = useState({
        name: "",
        location_description: "",
        start_date: "",
        disaster_types: [] as string[],
        // Add other fields you want to edit (latitude, longitude?)
    });

    useEffect(() => {
        if (!responseId) {
            setError("Response ID is missing.");
            setLoading(false);
            return;
        }

        const fetchResponseData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('disaster_responses')
                    .select('*')
                    .eq('id', responseId)
                    .single();

                if (fetchError) throw fetchError;
                if (!data) throw new Error("Response not found.");

                setResponse(data);
                // Pre-fill form data
                setFormData({
                    name: data.name || "",
                    location_description: data.location || "",
                    start_date: data.start_date ? data.start_date.slice(0, 10) : "", // Format date for input
                    disaster_types: data.disaster_types || [],
                 });

            } catch (err: any) {
                console.error("Error fetching response data:", err);
                setError(`Gagal memuat data respon: ${err.message}`);
                setResponse(null);
            } finally {
                setLoading(false);
            }
        };

        fetchResponseData();
    }, [responseId, supabase]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

     const handleDisasterTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            disaster_types: checked
                ? [...prev.disaster_types, value]
                : prev.disaster_types.filter(type => type !== value),
        }));
    };


    const handleUpdate = async (e: React.FormEvent) => {
         e.preventDefault();
        if (!response) {
            toast.error("Data respon tidak ditemukan untuk diperbarui.");
            return;
        }

        setFormLoading(true);
        setError(null);

        try {
            // Construct update object - only include fields you allow editing
            const updateData = {
                name: formData.name,
                location: formData.location_description,
                start_date: formData.start_date,
                disaster_types: formData.disaster_types,
                 // Add other fields like latitude, longitude, parsed_address if edited
            };


            const { error: updateError } = await supabase
                .from('disaster_responses')
                .update(updateData)
                .eq('id', response.id);

            if (updateError) throw updateError;

            toast.success('Respon berhasil diperbarui!');
            // Optionally navigate back or show updated data
            router.push(`/responder/${slug}/dashboard?menu=response_management`); // Redirect back to the response list

        } catch (err: any) {
            console.error("Error updating response:", err);
            setError(`Gagal memperbarui respon: ${err.message}`);
            toast.error(`Gagal memperbarui respon: ${err.message}`);
        } finally {
            setFormLoading(false);
        }
    };

     if (loading) return <div className="p-6 text-center text-zinc-400">Memuat data respon...</div>;
     if (error) return <div className="p-6 text-center text-red-400">Error: {error}</div>;
     if (!response) return <div className="p-6 text-center text-zinc-400">Respon tidak ditemukan.</div>;

    // --- TODO: Add DISASTER_TYPES constant or fetch it ---
    const DISASTER_TYPES = [ /* Reuse from DisasterResponseDashboard */
        "Banjir", "Kebakaran", "Gempa Bumi", "Tsunami",
        "Angin Puting Beliung", "Banjir Bandang", "Tanah Longsor"
    ];

    return (
        <div className="p-4 md:p-6 bg-zinc-900 text-zinc-100 min-h-screen">
             <button
                onClick={() => router.back()} // Go back to the previous page
                className="mb-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-zinc-300 bg-zinc-700 hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-blue-500"
            >
                 &larr; Kembali
             </button>

            <h1 className="text-2xl font-bold mb-6">Edit Respon Bencana</h1>

             <form onSubmit={handleUpdate} className="space-y-6 bg-zinc-800 p-6 rounded-lg shadow max-w-3xl mx-auto">
                {error && <p className="text-red-400 bg-red-900/30 p-3 rounded -mt-2 mb-4">Error: {error}</p>}

                {/* Form Fields (Similar to Create Form) */}
                <div>
                     <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1">Nama Respon <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                         className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-zinc-100 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label htmlFor="location_description" className="block text-sm font-medium text-zinc-300 mb-1">Deskripsi Lokasi</label>
                    <textarea
                        id="location_description"
                        name="location_description"
                        value={formData.location_description}
                         onChange={handleInputChange}
                        rows={3}
                        className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-zinc-100 focus:ring-blue-500 focus:border-blue-500"
                    />
                 </div>

                 <div>
                     <label htmlFor="start_date" className="block text-sm font-medium text-zinc-300 mb-1">Tanggal Mulai <span className="text-red-400">*</span></label>
                    <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-zinc-100 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                 <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Jenis Bencana <span className="text-red-400">*</span></label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                         {DISASTER_TYPES.map(type => (
                            <label key={type} className="flex items-center gap-2 bg-zinc-700/50 px-3 py-1 rounded border border-zinc-700 hover:border-zinc-500 cursor-pointer">
                                <input
                                    type="checkbox"
                                    value={type}
                                    checked={formData.disaster_types.includes(type)}
                                    onChange={handleDisasterTypeChange}
                                    className="rounded text-blue-500 focus:ring-blue-500 bg-zinc-800 border-zinc-600"
                                />
                                <span className="text-zinc-200 text-sm">{type}</span>
                            </label>
                        ))}
                    </div>
                     {formData.disaster_types.length === 0 && <p className="text-xs text-red-400 mt-1">Pilih minimal satu jenis bencana.</p>}
                </div>

                {/* --- TODO: Add fields for editing Lat/Lng, Parsed Address, Assigned Members if needed --- */}
                 {/* Example: Display Lat/Lng (if available)
                 {response.latitude && response.longitude && (
                     <p className="text-sm text-zinc-400">Koordinat: {response.latitude}, {response.longitude}</p>
                 )}
                 */}


                 <div className="flex justify-end pt-4">
                    <button
                         type="submit"
                        disabled={formLoading || formData.disaster_types.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 text-white px-6 py-2 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500 transition duration-150 ease-in-out"
                    >
                        {formLoading ? "Memperbarui..." : "Simpan Perubahan"}
                    </button>
                </div>
            </form>
        </div>
    );
} 