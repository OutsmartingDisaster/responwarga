"use client"; // Ensure this is a client component

import React, { useState, useEffect } from 'react'; // Import hooks
import { useRouter } from 'next/navigation'; // Import useRouter
import { useSupabase } from "@/contexts/SupabaseClientProvider"; // Import context hook

// Initialize Supabase client // Remove this initialization block
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SharedReport {
  id: string;
  share_id: string;
  type: 'emergency' | 'contribution';
  title: string;
  created_at: string;
  expires_at: string | null;
  created_by: string;
  creator?: {
    name: string;
    organization: string;
  };
}

interface ReportData {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  address: string;
  description: string;
  type: string;
  status: string;
  created_at: string;
  photo_url: string | null;
  show_contact_info?: boolean;
  consent_statement?: boolean;
  details?: {
    capacity?: string;
    facilities?: string[];
    quantity?: string;
    unit?: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
}

interface SharedReportPageProps {
  params: { id: string };
}

export default function SharedReportPage({ params }: SharedReportPageProps) {
  const router = useRouter(); // If needed
  const supabase = useSupabase(); // Get client from hook
  const [reportWithCreator, setReportWithCreator] = useState<any>(null); // Use proper types
  const [data, setData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shareId = params.id; 

  useEffect(() => {
    if (!supabase || !shareId) return;

    const fetchSharedData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch shared report metadata
        const { data: reportData, error: reportError } = await supabase
          .from('shared_reports')
          .select('*')
          .eq('share_id', shareId)
          .eq('is_active', true)
          .single();

        if (reportError) throw new Error(reportError.message);
        if (!reportData) throw new Error('Report not found');
        if (reportData.expires_at && new Date(reportData.expires_at) < new Date()) {
          throw new Error('This shared report has expired');
        }

        let creatorProfile = null;
        if (reportData.created_by) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, organization')
            .eq('id', reportData.created_by)
            .single();
          if (profileData) creatorProfile = profileData;
        }
        const fetchedReportWithCreator = { ...reportData, creator: creatorProfile };
        setReportWithCreator(fetchedReportWithCreator);

        const { data: items, error: itemsError } = await supabase
          .from(reportData.type === 'emergency' ? 'emergency_reports' : 'contributions')
          .select('*')
          // Add filtering/linking based on how shared reports relate to items
          // This likely needs adjustment - assuming shared_reports has a relation (e.g., report_ids array?)
          // Or maybe the items table has a shared_report_id? 
          // For now, fetching ALL items - THIS IS LIKELY INCORRECT AND NEEDS REFINEMENT
          .order('created_at', { ascending: false }); 

        if (itemsError) throw new Error(itemsError.message);
        if (!items) throw new Error('No data found');

        const transformedData = items.map((item: Record<string, any>) => ({
          id: item.id,
          full_name: item.full_name,
          phone_number: item.phone_number,
          email: item.email,
          address: item.address,
          description: item.description,
          photo_url: item.photo_url,
          type: reportData.type === 'emergency' ? item.assistance_type : item.contribution_type,
          status: item.status,
          created_at: item.created_at,
          show_contact_info: reportData.type === 'contribution' ? item.show_contact_info : undefined,
          consent_statement: item.consent_statement,
          details: reportData.type === 'contribution' ? {
            ...(item.capacity && { capacity: item.capacity }),
            ...(item.facilities && { facilities: Object.entries(item.facilities)
              .filter(([_, value]) => value)
              .map(([key]) => key.replace('_', ' '))
            }),
            ...(item.quantity && { quantity: item.quantity }),
            ...(item.unit && { unit: item.unit })
          } : undefined,
          location: { latitude: item.latitude, longitude: item.longitude }
        }));
        setData(transformedData);

      } catch (err: any) {
        console.error('Error in SharedReportPage fetch:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedData();

  }, [supabase, shareId]); // Add dependencies

  // Render loading/error states
  if (loading) return <div>Loading shared report...</div>; // Add better loading UI
  if (error) return <div>Error: {error}</div>; // Add better error UI
  if (!reportWithCreator) return <div>Report not found or access denied.</div>; // Handle case where metadata loaded but not items?

  // Return the JSX structure (needs access to reportWithCreator and data state)
  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      {/* Header using reportWithCreator state */}
      <header className="bg-zinc-800 border-b border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <img 
              src="/icons/response.svg" 
              alt="Respon Warga Logo" 
              className="w-10 h-10"
            />
            <div>
              <h1 className="text-2xl font-bold">{reportWithCreator.title}</h1>
              <p className="text-sm text-zinc-400">
                Generated on {new Date(reportWithCreator.created_at).toLocaleString()}
                {reportWithCreator.expires_at && (
                  <> · Expires on {new Date(reportWithCreator.expires_at).toLocaleString()}</>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content using data state */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-zinc-800 rounded-lg shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-zinc-300">
              <thead className="text-xs uppercase bg-zinc-700 text-zinc-400">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Nama Lengkap</th>
                  {reportWithCreator.type === 'contribution' ? (
                    <th className="px-4 py-3">Jenis Kontribusi</th>
                  ) : (
                    <th className="px-4 py-3">Jenis Bantuan</th>
                  )}
                  <th className="px-4 py-3">Nomor Telepon</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Alamat</th>
                  <th className="px-4 py-3">Foto</th>
                  <th className="px-4 py-3">Deskripsi</th>
                  {reportWithCreator.type === 'contribution' && (
                    <th className="px-4 py-3">Details</th>
                  )}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created At</th>
                  {reportWithCreator.type === 'contribution' && (
                    <th className="px-4 py-3">Consent Tampilkan Kontak</th>
                  )}
                  <th className="px-4 py-3">Consent Pernyataan</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-700 hover:bg-zinc-700/50">
                    <td className="px-4 py-3">{item.id}</td>
                    <td className="px-4 py-3">{item.full_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        reportWithCreator.type === 'emergency'
                          ? item.type === 'evacuation' ? 'bg-red-900/50 text-red-200'
                            : item.type === 'food_water' ? 'bg-blue-900/50 text-blue-200'
                            : item.type === 'medical' ? 'bg-green-900/50 text-green-200'
                            : 'bg-yellow-900/50 text-yellow-200'
                          : item.type === 'shelter' ? 'bg-purple-900/50 text-purple-200'
                            : item.type === 'food_water' ? 'bg-blue-900/50 text-blue-200'
                            : item.type === 'medical' ? 'bg-green-900/50 text-green-200'
                            : 'bg-yellow-900/50 text-yellow-200'
                      }`}>
                        {item.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.phone_number || '-'}</td>
                    <td className="px-4 py-3">{item.email || '-'}</td>
                    <td className="px-4 py-3">
                      <p>{item.address}</p>
                      <a
                        href={`https://www.google.com/maps?q=${item.location.latitude},${item.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        View on Map
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {item.photo_url ? (
                        <a 
                          href={item.photo_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View Photo
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-xs whitespace-normal break-words">{item.description}</p>
                    </td>
                    {reportWithCreator.type === 'contribution' && (
                      <td className="px-4 py-3">
                        {item.details?.capacity && (
                          <p>Capacity: {item.details.capacity} people</p>
                        )}
                        {item.details?.facilities && (
                          <p className="text-sm text-zinc-400">
                            Facilities: {item.details.facilities.join(', ')}
                          </p>
                        )}
                        {item.details?.quantity && (
                          <p>{item.details.quantity} {item.details.unit}</p>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.status === 'active' ? 'bg-green-900/50 text-green-200'
                        : item.status === 'resolved' ? 'bg-blue-900/50 text-blue-200'
                        : item.status === 'needs_verification' ? 'bg-yellow-900/50 text-yellow-200'
                        : 'bg-red-900/50 text-red-200'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    {reportWithCreator.type === 'contribution' && (
                      <td className="px-4 py-3">
                        {item.show_contact_info ? 'Ya' : 'Tidak'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {item.consent_statement ? 'Ya' : 'Tidak'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer using reportWithCreator state */}
      <footer className="bg-zinc-800 border-t border-zinc-700 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-sm text-zinc-400 text-center">
            Generated by Respon Warga · Shared by {reportWithCreator.creator?.name || 'Unknown'} ({reportWithCreator.creator?.organization || 'Unknown'})
          </p>
        </div>
      </footer>
    </div>
  );
} 