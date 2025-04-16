"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/../lib/supabase/client'; // Adjust path as needed
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic'; // Import dynamic
import { toast } from 'react-hot-toast'; // Import toast

// --- Leaflet Icon Fix --- (Moved to useEffect)
// import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
// ... (other icon imports)
// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({ ... });

// --- Dynamically import Leaflet components ---
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false, loading: () => <div className="h-64 w-full flex items-center justify-center bg-zinc-700 text-zinc-400">Memuat peta...</div> });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });

// Types (should ideally be shared in src/types/index.ts later)
type ParsedAddress = {
  road?: string; village?: string; suburb?: string; city_district?: string;
  county?: string; city?: string; state?: string; postcode?: string;
  country?: string; display_name?: string;
};

type DisasterResponse = {
  id: string; name: string; location: string | null; start_date: string | null;
  status: string; disaster_types: string[]; created_at: string;
  latitude?: number | null; longitude?: number | null;
  parsed_address?: ParsedAddress | null; organization_id: string;
};

type AssignedMember = {
  id: string; // user_id (uuid) from member_id
  name: string; // Fetched from profiles
  role: string; // Fetched from profiles
};

// --- Log Types (Define based on your actual table columns) ---
type ActivityLog = {
    id: string;
    what: string | null;
    when_time: string | null;
    where_location: string | null;
    why: string | null;
    how: string | null;
    notes: string | null;
    created_at: string | null;
    // responder_id: number | null; // If you need to show who logged it
};

type InventoryLog = {
    id: string;
    item_name: string;
    quantity_start: number | null;
    quantity_received: number | null;
    quantity_delivered: number | null;
    quantity_end: number | null;
    notes: string | null;
};

type DeliveryLog = {
    id: string;
    item_name: string;
    quantity: number | null;
    destination: string | null;
    notes: string | null;
    // delivered_by: number | null; // If you need to show who delivered
};

// Assuming responder_logs are for check-ins/outs
type ResponderLog = {
    id: string;
    responder_id: number | null; // Link to profiles.id (integer?)
    responder_name?: string; // Add name fetched from profiles
    check_in_time: string | null;
    check_in_location: string | null;
    check_out_time: string | null;
    check_out_location: string | null;
    notes: string | null;
}
// --- End Log Types ---

// Add EmergencyReport type (ensure it matches your table)
// Should probably be moved to a shared types file
interface EmergencyReport {
  id: number;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  assistance_type: string;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  status: 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan';
  assigned_to?: string | null; // user_id of assigned responder
  created_at: string;
  disaster_response_id?: string | null;
  // Add other fields if displayed
}

export default function ResponseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const slug = params.slug as string;
  const responseId = params.responseId as string;

  const [response, setResponse] = useState<DisasterResponse | null>(null);
  const [assignedMembers, setAssignedMembers] = useState<AssignedMember[]>([]);
  const [organizationMembers, setOrganizationMembers] = useState<AssignedMember[]>([]);
  const [emergencyReports, setEmergencyReports] = useState<EmergencyReport[]>([]);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // State for fetched logs
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);

  // --- NEW: State for active log tab ---
  const [activeLogTab, setActiveLogTab] = useState<'reports' | 'activity' | 'inventory' | 'delivery'>('reports');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- NEW: Form States ---
  const [activityForm, setActivityForm] = useState({ what: '', when_time: '', where_location: '', notes: '' });
  const [inventoryForm, setInventoryForm] = useState({ item_name: '', quantity_start: '', quantity_received: '', quantity_delivered: '', quantity_end: '', notes: '' });
  const [deliveryForm, setDeliveryForm] = useState({ item_name: '', quantity: '', destination: '', notes: '' });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState<{[key: number]: boolean}>({});

  // --- Client-side effect for Leaflet Icon Fix ---
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

  const fetchResponseDetails = useCallback(async () => {
    if (!responseId || !slug) return;
    setLoading(true);
    setError(null);
    setActivityLogs([]); setInventoryLogs([]); setDeliveryLogs([]); setEmergencyReports([]);
    setAssignedMembers([]); setOrganizationMembers([]);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          setUserId(user.id);
          // Fetch user role
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();
          if (profileError) {
              console.error("Error fetching user role:", profileError.message);
              // Handle error appropriately, maybe prevent status change
          } else {
              setUserRole(profileData?.role || null);
          }
      } else {
           console.warn("User not authenticated");
      }

      // 1. Get Org ID & Name
      const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('slug', slug)
          .single();

      if (orgError || !orgData) throw new Error(orgError?.message || 'Organisasi tidak ditemukan.');
      const currentOrgId = orgData.id;
      setOrgName(orgData.name);

      // 2. Fetch Response Data & Verify Ownership
      const { data: responseData, error: responseError } = await supabase
          .from('disaster_responses')
          .select('*')
          .eq('id', responseId)
          .single();

      if (responseError) throw new Error(`Gagal memuat detail respon: ${responseError.message}`);
      if (!responseData) throw new Error('Respon tidak ditemukan.');
      if (responseData.organization_id !== currentOrgId) throw new Error('Akses ditolak...');
      setResponse(responseData);

      // 3. Fetch Members assigned to *this specific disaster response*
      const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('team_assignments')
          .select('member_id')
          .eq('disaster_response_id', responseId);

      if (assignmentsError) console.error(`Gagal memuat anggota respon: ${assignmentsError.message}`); // Log error but continue
      const assignedMemberIds = assignmentsData?.map(a => a.member_id).filter(id => id != null) as string[] || [];

      if (assignedMemberIds.length > 0) {
        const { data: assignedProfiles, error: assignedProfilesError } = await supabase
            .from('profiles')
            .select('user_id, name, role')
            .in('user_id', assignedMemberIds);

        if (assignedProfilesError) console.error(`Gagal memuat detail anggota respon: ${assignedProfilesError.message}`);
        else {
            const membersMap = assignedProfiles?.reduce((acc, p) => { acc[p.user_id] = { name: p.name || '-', role: p.role || '-' }; return acc; }, {} as any) || {};
            setAssignedMembers(assignedMemberIds.map(id => ({ id: id, name: membersMap[id]?.name, role: membersMap[id]?.role })));
        }
      } else { setAssignedMembers([]); }

      // 4. Fetch ALL members belonging to the organization (for assignment dropdown)
      const { data: orgMembersData, error: orgMembersError } = await supabase
        .from('profiles')
        .select('user_id, name, role')
        .eq('organization_id', currentOrgId)
        .in('role', ['responder', 'org_admin']); // Include admins?

      if (orgMembersError) {
         console.error(`Gagal memuat semua anggota organisasi: ${orgMembersError.message}`);
         setOrganizationMembers([]); // Set empty if fetch fails
      } else {
         setOrganizationMembers(
            orgMembersData?.map(p => ({ id: p.user_id, name: p.name || 'Nama Tidak Diketahui', role: p.role || 'Peran Tidak Diketahui' })) || []
         );
      }

      // --- 5. Fetch Related Logs & Emergency Reports --- 
      const dataPromises = [
        supabase.from('activity_logs').select('*').eq('disaster_response_id', responseId).order('when_time', { ascending: false }),
        supabase.from('inventory_logs').select('*').eq('disaster_response_id', responseId),
        supabase.from('delivery_logs').select('*').eq('disaster_response_id', responseId),
        supabase.from('emergency_reports').select('*').eq('disaster_response_id', responseId).order('created_at', { ascending: false })
      ];
      const [activityResult, inventoryResult, deliveryResult, reportsResult] = await Promise.all(dataPromises);

      // Handle results (log errors but don't block page load)
      if (activityResult.error) console.error("Error fetching activity logs:", activityResult.error.message);
      else setActivityLogs(activityResult.data || []);
      if (inventoryResult.error) console.error("Error fetching inventory logs:", inventoryResult.error.message);
      else setInventoryLogs(inventoryResult.data || []);
      if (deliveryResult.error) console.error("Error fetching delivery logs:", deliveryResult.error.message);
      else setDeliveryLogs(deliveryResult.data || []);
      if (reportsResult.error) console.error("Error fetching emergency reports:", reportsResult.error.message);
      else setEmergencyReports(reportsResult.data || []);

    } catch (err: any) {
      console.error('Error fetching response details:', err);
      setError(err.message);
      setResponse(null); setAssignedMembers([]); setOrganizationMembers([]);
      setActivityLogs([]); setInventoryLogs([]); setDeliveryLogs([]); setEmergencyReports([]);
    } finally {
      setLoading(false);
    }
  }, [responseId, slug, supabase]);

  useEffect(() => {
    fetchResponseDetails();
  }, [fetchResponseDetails]);

  // Helper to format address
  const formatAddress = (addr: ParsedAddress | null | undefined): string => {
    if (!addr) return 'Alamat tidak tersedia';
    return addr.display_name || [addr.road, addr.village, addr.city_district, addr.county, addr.city, addr.state]
        .filter(Boolean).join(', ');
  };

  const mapPosition: [number, number] | null = response?.latitude && response?.longitude ? [response.latitude, response.longitude] : null;

  // Helper to format date/time
  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return '-';
    try {
      return new Date(dateTimeString).toLocaleString('id-ID', {
        dateStyle: 'medium', timeStyle: 'short'
      });
    } catch (e) {
      return dateTimeString; // Return original string if parsing fails
    }
  };

  // --- NEW: Form Submission Handlers ---
  const handleActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.what || !activityForm.when_time) {
        toast.error("Field 'Apa' dan 'Kapan' wajib diisi untuk Log Aktivitas.");
        return;
    }
    setFormSubmitting(true);
    try {
        const { error } = await supabase.from('activity_logs').insert([{
            disaster_response_id: responseId,
            what: activityForm.what,
            when_time: new Date(activityForm.when_time).toISOString(), // Ensure valid ISO format
            where_location: activityForm.where_location || null,
            notes: activityForm.notes || null,
            responder_id: userId // Store who added the log (ensure profiles.id is compatible or adjust schema/logic)
            // why, how can be added if needed
        }]);
        if (error) throw error;
        toast.success("Log Aktivitas ditambahkan!");
        setActivityForm({ what: '', when_time: '', where_location: '', notes: '' }); // Reset form
        fetchResponseDetails(); // Refetch all details including logs
    } catch (error: any) {
        toast.error(`Gagal menambahkan log: ${error.message}`);
    } finally {
        setFormSubmitting(false);
    }
  };

  const handleInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
     if (!inventoryForm.item_name) {
        toast.error("Nama Item wajib diisi untuk Log Inventaris.");
        return;
    }
    setFormSubmitting(true);
    try {
        const { error } = await supabase.from('inventory_logs').insert([{
            disaster_response_id: responseId,
            item_name: inventoryForm.item_name,
            quantity_start: inventoryForm.quantity_start ? parseInt(inventoryForm.quantity_start) : null,
            quantity_received: inventoryForm.quantity_received ? parseInt(inventoryForm.quantity_received) : null,
            quantity_delivered: inventoryForm.quantity_delivered ? parseInt(inventoryForm.quantity_delivered) : null,
            quantity_end: inventoryForm.quantity_end ? parseInt(inventoryForm.quantity_end) : null,
            notes: inventoryForm.notes || null
        }]);
         if (error) throw error;
        toast.success("Log Inventaris ditambahkan!");
        setInventoryForm({ item_name: '', quantity_start: '', quantity_received: '', quantity_delivered: '', quantity_end: '', notes: '' });
        fetchResponseDetails();
    } catch (error: any) {
        toast.error(`Gagal menambahkan log: ${error.message}`);
    } finally {
        setFormSubmitting(false);
    }
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
     if (!deliveryForm.item_name || !deliveryForm.quantity) {
        toast.error("Nama Item dan Jumlah wajib diisi untuk Log Pengiriman.");
        return;
    }
    setFormSubmitting(true);
     try {
        const { error } = await supabase.from('delivery_logs').insert([{
            disaster_response_id: responseId,
            item_name: deliveryForm.item_name,
            quantity: deliveryForm.quantity ? parseInt(deliveryForm.quantity) : null,
            destination: deliveryForm.destination || null,
            notes: deliveryForm.notes || null,
            // delivered_by: userId // Requires schema adjustment if profiles.id != integer
        }]);
         if (error) throw error;
        toast.success("Log Pengiriman ditambahkan!");
        setDeliveryForm({ item_name: '', quantity: '', destination: '', notes: '' });
        fetchResponseDetails();
    } catch (error: any) {
        toast.error(`Gagal menambahkan log: ${error.message}`);
    } finally {
        setFormSubmitting(false);
    }
  };

  // Generic input change handler for forms
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, formSetter: React.Dispatch<React.SetStateAction<any>>) => {
     const { name, value } = e.target;
     formSetter((prev: any) => ({ ...prev, [name]: value }));
  };

  // --- NEW: Assignment Handler ---
  const handleAssignEmergencyResponder = async (reportId: number, memberUserId: string) => {
    if (!memberUserId) {
        toast.error("Pilih relawan yang akan ditugaskan.");
        return;
    }
    setAssignmentLoading(prev => ({ ...prev, [reportId]: true }));
    try {
        const { error } = await supabase
            .from('emergency_reports')
            .update({ 
                assigned_to: memberUserId, // Store the user_id of the responder
                status: 'diproses' // Update status upon assignment
             })
            .eq('id', reportId)
            .eq('disaster_response_id', responseId); // Ensure we only update report linked to this response

        if (error) throw error;

        toast.success("Relawan berhasil ditugaskan ke laporan.");
        // Refetch just the emergency reports to update the UI state for that report
        const { data: updatedReports, error: refetchError } = await supabase
            .from('emergency_reports')
            .select('*')
            .eq('disaster_response_id', responseId)
            .order('created_at', { ascending: false });
        
        if (refetchError) throw refetchError;
        setEmergencyReports(updatedReports || []);

    } catch (error: any) {
        console.error("Error assigning responder:", error);
        toast.error(`Gagal menugaskan relawan: ${error.message}`);
    } finally {
        setAssignmentLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  // --- NEW: Status Update Handler ---
  const handleUpdateStatus = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStatus = e.target.value;
      if (!response || newStatus === response.status) {
          return; // No change or response not loaded
      }

      // Add confirmation if needed, e.g., for finishing
      if (newStatus === 'finished' && !window.confirm('Apakah Anda yakin ingin menyelesaikan respon ini? Status tidak dapat diubah kembali.')) {
          e.target.value = response.status; // Reset dropdown if cancelled
          return;
      }

      setLoading(true); // Use main loading indicator
      setError(null);

      try {
          const { error: updateError } = await supabase
              .from('disaster_responses')
              .update({ status: newStatus })
              .eq('id', response.id);

          if (updateError) throw updateError;

          toast.success(`Status respon berhasil diubah menjadi ${newStatus}.`);
          // Navigate back to the dashboard list after successful update
          router.push(`/responder/${slug}/dashboard?menu=response_management`);

      } catch (err: any) {
          console.error("Error updating response status:", err);
          setError(`Gagal memperbarui status: ${err.message}`);
          toast.error(`Gagal memperbarui status: ${err.message}`);
          e.target.value = response.status; // Reset dropdown on error
          setLoading(false); // Ensure loading stops on error
      }
      // setLoading(false) // Loading will stop on navigation or error
  };

  if (loading) return <div className="p-6 text-zinc-400">Memuat detail respon...</div>;
  if (error) return <div className="p-6 text-red-500 bg-red-900/30 rounded">Error: {error}</div>;
  if (!response) return <div className="p-6 text-zinc-400">Detail respon tidak ditemukan.</div>;

  return (
    <div className="p-6 bg-zinc-900 text-zinc-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <Link href={`/responder/${slug}/dashboard`} className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Kembali ke {orgName ? `Dasbor ${orgName}` : 'Dasbor'}
        </Link>

        <h1 className="text-3xl font-bold mb-4 text-zinc-100">{response.name}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Details */}
          <div className="md:col-span-2 space-y-4 bg-zinc-800 p-6 rounded-lg shadow">
            <div>
              <h2 className="text-xl font-semibold mb-2 text-zinc-200">Informasi Umum</h2>
              {/* Status Display and Dropdown */}
              <div className="flex items-center gap-3 mb-2">
                  <p className="text-sm"><strong className="text-zinc-400">Status:</strong></p>
                   {/* Conditionally render Select or static text */}
                   {(userRole === 'org_admin' || userRole === 'admin') && response.status === 'active' ? (
                      <select
                          value={response.status}
                          onChange={handleUpdateStatus}
                          disabled={loading} // Disable while any loading is happening
                          className="text-sm capitalize bg-zinc-700 border border-zinc-600 rounded px-2 py-0.5 text-zinc-100 focus:ring-blue-500 focus:border-blue-500 h-7"
                      >
                          <option value="active">Active</option>
                          <option value="finished">Selesai</option>
                          {/* Add other statuses here if needed in the future */}
                      </select>
                  ) : (
                     <span className={`capitalize px-2 py-0.5 rounded text-xs font-medium ${response.status === 'active' ? 'bg-green-700 text-green-100' : 'bg-zinc-600 text-zinc-200'}`}>
                          {response.status}
                      </span>
                  )}
              </div>
              <p className="text-sm"><strong className="text-zinc-400">Jenis Bencana:</strong> {response.disaster_types?.join(', ') || '-'}</p>
              <p className="text-sm"><strong className="text-zinc-400">Tanggal Mulai:</strong> {response.start_date ? new Date(response.start_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</p>
              <p className="text-sm"><strong className="text-zinc-400">Dibuat Tanggal:</strong> {new Date(response.created_at).toLocaleString('id-ID')}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2 text-zinc-200">Lokasi</h2>
              <p className="text-sm"><strong className="text-zinc-400">Deskripsi:</strong> {response.location || '(Tidak ada deskripsi tambahan)'}</p>
              {response.parsed_address ? (
                 <p className="text-sm"><strong className="text-zinc-400">Alamat Parsed:</strong> {formatAddress(response.parsed_address)}</p>
              ): (
                 <p className="text-sm text-zinc-500 italic">(Alamat terstruktur tidak tersedia)</p>
              )}
               {mapPosition && (
                 <p className="text-sm"><strong className="text-zinc-400">Koordinat:</strong> Lat: {response.latitude?.toFixed(6)}, Lng: {response.longitude?.toFixed(6)}</p>
               )}
              {mapPosition && (
                <div className="mt-3 h-64 w-full rounded border border-zinc-700 overflow-hidden">
                   <MapContainer center={mapPosition} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={mapPosition}></Marker>
                  </MapContainer>
                </div>
              )}
            </div>
             {/* TODO: Add sections for Logs, Inventory, etc. related to this response */}
             {/* Need to add disaster_response_id FK to log tables */}
          </div>

          {/* Column 2: Assigned Members */}
          <div className="space-y-4 bg-zinc-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2 text-zinc-200">Anggota Ditugaskan</h2>
            {assignedMembers.length > 0 ? (
              <ul className="space-y-2">
                {assignedMembers.map(member => (
                  <li key={member.id} className="text-sm bg-zinc-700/60 p-2 rounded">
                    <strong className="text-zinc-200">{member.name}</strong>
                    <span className="text-zinc-400 ml-2">({member.role})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-400 italic">Belum ada anggota yang ditugaskan.</p>
            )}
             {/* TODO: Add button to manage assignments? */}
          </div>
        </div>

        {/* --- Section for Logs & Reports --- */}
        <div className="mt-8">
           <h2 className="text-2xl font-semibold mb-4 text-zinc-100">Detail & Log Terkait Respon</h2>
           
           {/* Tab Bar (Added Reports, removed Responder) */}
           <div className="mb-4 border-b border-zinc-700 flex space-x-1 flex-wrap">
             <button onClick={() => setActiveLogTab('reports')} className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeLogTab === 'reports' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>Laporan Darurat ({emergencyReports.length})</button>
             <button onClick={() => setActiveLogTab('activity')} className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeLogTab === 'activity' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>Aktivitas ({activityLogs.length})</button>
             <button onClick={() => setActiveLogTab('inventory')} className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeLogTab === 'inventory' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>Inventaris ({inventoryLogs.length})</button>
             <button onClick={() => setActiveLogTab('delivery')} className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeLogTab === 'delivery' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>Pengiriman ({deliveryLogs.length})</button>
           </div>

           {/* Content Area */}
           <div className="bg-zinc-800 p-4 md:p-6 rounded-b-lg rounded-r-lg shadow">
             {/* --- NEW: Emergency Reports Tab Content --- */}
             {activeLogTab === 'reports' && (
                  emergencyReports.length > 0 ? (
                      <ul className="space-y-4">
                          {emergencyReports.map(report => {
                              const assignedResponder = organizationMembers.find(m => m.id === report.assigned_to);
                              return (
                                  <li key={report.id} className="p-4 bg-zinc-700/50 rounded-md border border-zinc-700">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          {/* Col 1: Contact & Location */}
                                          <div className="space-y-2 text-sm">
                                              <h4 className="font-semibold text-base text-zinc-100 mb-1">Pelapor & Lokasi</h4>
                                              <p><strong className="text-zinc-400">Nama:</strong> {report.full_name || '-'}</p>
                                              <p><strong className="text-zinc-400">Telp:</strong> {report.phone_number || '-'}</p>
                                              <p><strong className="text-zinc-400">Email:</strong> {report.email || '-'}</p>
                                              <p><strong className="text-zinc-400">Alamat:</strong> {report.address || '-'}</p>
                                              <p><strong className="text-zinc-400">Koordinat:</strong> {report.latitude?.toFixed(5)}, {report.longitude?.toFixed(5)}</p>
                                          </div>
                                          {/* Col 2: Details & Photo */}
                                          <div className="space-y-2 text-sm">
                                              <h4 className="font-semibold text-base text-zinc-100 mb-1">Detail Laporan</h4>
                                              <p><strong className="text-zinc-400">Jenis Bantuan:</strong> {report.assistance_type || '-'}</p>
                                              <p><strong className="text-zinc-400">Status Laporan:</strong> <span className="capitalize">{report.status}</span></p>
                                              <p><strong className="text-zinc-400">Deskripsi:</strong></p>
                                              <p className="whitespace-pre-wrap bg-zinc-800 p-2 rounded text-xs">{report.description || '-'}</p>
                                              {report.photo_url && (
                                                  <div>
                                                      <strong className="text-zinc-400 block mb-1">Foto:</strong>
                                                      <img src={report.photo_url} alt="Foto Laporan Darurat" className="max-w-full h-auto rounded max-h-48 object-contain" />
                                                  </div>
                                              )}
                                          </div>
                                          {/* Col 3: Assignment */}
                                          <div className="space-y-2 text-sm">
                                               <h4 className="font-semibold text-base text-zinc-100 mb-1">Penugasan Relawan</h4>
                                               {report.assigned_to && assignedResponder ? (
                                                   <p className="p-2 bg-green-900/50 rounded border border-green-700">
                                                       <strong className="text-green-300">Ditugaskan ke:</strong> {assignedResponder.name} ({assignedResponder.role})
                                                   </p>
                                               ) : report.status === 'menunggu' || report.status === 'diproses' ? (
                                                  <form onSubmit={(e) => {
                                                      e.preventDefault();
                                                      const selectElement = e.currentTarget.elements.namedItem(`assignee-${report.id}`) as HTMLSelectElement;
                                                      handleAssignEmergencyResponder(report.id, selectElement.value);
                                                  }} className="space-y-2">
                                                      <select 
                                                          name={`assignee-${report.id}`}
                                                          defaultValue="" 
                                                          required
                                                          className="w-full text-sm bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-zinc-100 focus:ring-blue-500 focus:border-blue-500"
                                                          disabled={assignmentLoading[report.id]}
                                                      >
                                                          <option value="" disabled>Pilih Relawan...</option>
                                                          {organizationMembers.map(member => (
                                                              <option key={member.id} value={member.id}>{member.name} ({member.role})</option>
                                                          ))}
                                                      </select>
                                                      <button 
                                                          type="submit" 
                                                          className="w-full px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                          disabled={assignmentLoading[report.id]}
                                                      >
                                                          {assignmentLoading[report.id] ? 'Menugaskan...' : 'Tugaskan Relawan'}
                                                      </button>
                                                  </form>
                                               ) : (
                                                   <p className="text-zinc-500 italic">Laporan {report.status}.</p>
                                               )}
                                          </div>
                                      </div>
                                  </li>
                              );
                          })}
                      </ul>
                  ) : (
                      <p className="text-zinc-400 italic">Tidak ada laporan darurat terkait dengan respon ini.</p>
                  )
             )}

             {/* Activity Logs & Form */} 
             {activeLogTab === 'activity' && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-zinc-200">Tambah Log Aktivitas</h3>
                  <form onSubmit={handleActivitySubmit} className="space-y-3 mb-6 p-4 bg-zinc-700/50 rounded-md">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="activity-what" className="block text-xs font-medium text-zinc-300 mb-1">Apa? <span className="text-red-400">*</span></label>
                          <input type="text" id="activity-what" name="what" value={activityForm.what} onChange={(e) => handleFormChange(e, setActivityForm)} required className="w-full text-sm ..." />
                        </div>
                         <div>
                          <label htmlFor="activity-when_time" className="block text-xs font-medium text-zinc-300 mb-1">Kapan? <span className="text-red-400">*</span></label>
                          <input type="datetime-local" id="activity-when_time" name="when_time" value={activityForm.when_time} onChange={(e) => handleFormChange(e, setActivityForm)} required className="w-full text-sm ..." />
                        </div>
                     </div>
                      <div>
                          <label htmlFor="activity-where_location" className="block text-xs font-medium text-zinc-300 mb-1">Di mana?</label>
                          <input type="text" id="activity-where_location" name="where_location" value={activityForm.where_location} onChange={(e) => handleFormChange(e, setActivityForm)} className="w-full text-sm ..." />
                      </div>
                      <div>
                         <label htmlFor="activity-notes" className="block text-xs font-medium text-zinc-300 mb-1">Catatan</label>
                         <textarea id="activity-notes" name="notes" value={activityForm.notes} onChange={(e) => handleFormChange(e, setActivityForm)} rows={2} className="w-full text-sm ..."></textarea>
                      </div>
                      <div className="text-right">
                         <button type="submit" disabled={formSubmitting} className="px-4 py-1.5 text-sm ...">{formSubmitting ? 'Menyimpan...' : 'Tambah Aktivitas'}</button>
                      </div>
                  </form>
                  <h3 className="text-lg font-semibold mb-3 text-zinc-200">Daftar Log Aktivitas</h3>
                  {activityLogs.length > 0 ? (<ul className="space-y-3">{activityLogs.map(log => (<li key={log.id} className="text-sm ...">...</li>))}</ul>) : (<p>...</p>)}
                </div>
             )}

             {/* Inventory Logs & Form */} 
             {activeLogTab === 'inventory' && (
                 <div>
                     <h3 className="text-lg font-semibold mb-3 text-zinc-200">Tambah Log Inventaris</h3>
                     <form onSubmit={handleInventorySubmit} className="space-y-3 mb-6 p-4 bg-zinc-700/50 rounded-md">
                         <div>
                           <label htmlFor="inv-item_name" className="block text-xs font-medium text-zinc-300 mb-1">Nama Item <span className="text-red-400">*</span></label>
                           <input type="text" id="inv-item_name" name="item_name" value={inventoryForm.item_name} onChange={(e) => handleFormChange(e, setInventoryForm)} required className="w-full text-sm ..." />
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                             {/* Quantity fields */}
                             <div><label htmlFor="inv-start" className="...">Qty Awal</label><input type="number" id="inv-start" name="quantity_start" value={inventoryForm.quantity_start} onChange={(e) => handleFormChange(e, setInventoryForm)} className="..." /></div>
                             <div><label htmlFor="inv-received" className="...">Qty Diterima</label><input type="number" id="inv-received" name="quantity_received" value={inventoryForm.quantity_received} onChange={(e) => handleFormChange(e, setInventoryForm)} className="..." /></div>
                             <div><label htmlFor="inv-delivered" className="...">Qty Dikirim</label><input type="number" id="inv-delivered" name="quantity_delivered" value={inventoryForm.quantity_delivered} onChange={(e) => handleFormChange(e, setInventoryForm)} className="..." /></div>
                             <div><label htmlFor="inv-end" className="...">Qty Akhir</label><input type="number" id="inv-end" name="quantity_end" value={inventoryForm.quantity_end} onChange={(e) => handleFormChange(e, setInventoryForm)} className="..." /></div>
                         </div>
                          <div>
                             <label htmlFor="inv-notes" className="block text-xs font-medium text-zinc-300 mb-1">Catatan</label>
                             <textarea id="inv-notes" name="notes" value={inventoryForm.notes} onChange={(e) => handleFormChange(e, setInventoryForm)} rows={2} className="w-full text-sm ..."></textarea>
                          </div>
                          <div className="text-right">
                             <button type="submit" disabled={formSubmitting} className="px-4 py-1.5 text-sm ...">{formSubmitting ? 'Menyimpan...' : 'Tambah Inventaris'}</button>
                          </div>
                     </form>
                     <h3 className="text-lg font-semibold mb-3 text-zinc-200">Daftar Log Inventaris</h3>
                     {inventoryLogs.length > 0 ? (<div className="overflow-x-auto"><table className="min-w-full text-sm">...</table></div>) : (<p>...</p>)}
                 </div>
             )}

             {/* Delivery Logs & Form */} 
             {activeLogTab === 'delivery' && (
                <div>
                   <h3 className="text-lg font-semibold mb-3 text-zinc-200">Tambah Log Pengiriman</h3>
                   <form onSubmit={handleDeliverySubmit} className="space-y-3 mb-6 p-4 bg-zinc-700/50 rounded-md">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                           <div>
                               <label htmlFor="del-item_name" className="...">Nama Item <span className="text-red-400">*</span></label>
                               <input type="text" id="del-item_name" name="item_name" value={deliveryForm.item_name} onChange={(e) => handleFormChange(e, setDeliveryForm)} required className="..." />
                           </div>
                           <div>
                               <label htmlFor="del-quantity" className="...">Jumlah <span className="text-red-400">*</span></label>
                               <input type="number" id="del-quantity" name="quantity" value={deliveryForm.quantity} onChange={(e) => handleFormChange(e, setDeliveryForm)} required className="..." />
                           </div>
                           <div>
                               <label htmlFor="del-destination" className="...">Tujuan</label>
                               <input type="text" id="del-destination" name="destination" value={deliveryForm.destination} onChange={(e) => handleFormChange(e, setDeliveryForm)} className="..." />
                           </div>
                       </div>
                        <div>
                           <label htmlFor="del-notes" className="block text-xs font-medium text-zinc-300 mb-1">Catatan</label>
                           <textarea id="del-notes" name="notes" value={deliveryForm.notes} onChange={(e) => handleFormChange(e, setDeliveryForm)} rows={2} className="w-full text-sm ..."></textarea>
                        </div>
                        <div className="text-right">
                           <button type="submit" disabled={formSubmitting} className="px-4 py-1.5 text-sm ...">{formSubmitting ? 'Menyimpan...' : 'Tambah Pengiriman'}</button>
                        </div>
                   </form>
                   <h3 className="text-lg font-semibold mb-3 text-zinc-200">Daftar Log Pengiriman</h3>
                   {deliveryLogs.length > 0 ? (<div className="overflow-x-auto"><table className="min-w-full text-sm">...</table></div>) : (<p>...</p>)}
                </div>
             )}

           </div>
        </div>
      </div>
    </div>
  );
}
