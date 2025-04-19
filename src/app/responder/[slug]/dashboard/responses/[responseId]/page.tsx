"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase } from "@/contexts/SupabaseClientProvider";
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic'; // Import dynamic
import { toast } from 'react-hot-toast'; // Import toast
import { EmergencyReportStatus } from "@/app/mohonijin/dashboard/components/EmergencyReportsTable"; // Import status type

// Dynamically import MapLeaflet
const MapLeaflet = dynamic(() => import('@/app/components/MapLeaflet'), { 
    ssr: false, 
    loading: () => <div className="h-64 w-full flex items-center justify-center bg-zinc-700 text-zinc-400">Memuat peta...</div> 
});

// Define Geofence Radius Globally (or pass as prop if needed)
const GEOFENCE_RADIUS_METERS = 15000;

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

// --- Log Types --- 
type ActivityLog = {
    id: string;
    what: string | null;
    when_time: string | null;
    where_location: string | null;
    why: string | null;
    how: string | null;
    notes: string | null; 
    created_at: string | null; 
    // Added fields based on usage in handleAssignMemberSubmit & display logic
    user_id?: string | null; // UUID of user who performed action
    type?: string | null; // e.g., 'assignment', 'manual_log'
    description?: string | null; // Alternative description field
    details?: Record<string, unknown> | null; // For structured details (JSONB)
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

// Update EmergencyReport type to use shared status
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
  status: EmergencyReportStatus; // <-- Use shared type
  assigned_to?: string | null; // user_id of assigned responder - consider replacing with responder_id
  created_at: string;
  disaster_response_id?: string | null;
  // Add fields needed for assignment display if fetched
  org_responder_id?: string; 
  responder_id?: string; 
  org_responder_name?: string; // Keep one instance
  responder_name?: string; 
}

// --- ADD Assignment Modal Definition --- 
interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (responderId: string) => void;
  responders: { id: string; name: string }[];
  selectedResponder: string;
  setSelectedResponder: (id: string) => void;
  isLoading?: boolean; // Add loading prop
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ 
  isOpen, onClose, onSubmit, responders, selectedResponder, setSelectedResponder, isLoading = false
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-zinc-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-white">Assign Responder</h2>
        {responders.length === 0 ? (
          <p className="text-zinc-400">No available responders found for your organization.</p>
        ) : (
          <select 
            value={selectedResponder}
            onChange={(e) => setSelectedResponder(e.target.value)}
            className="w-full p-2 rounded bg-zinc-700 border border-zinc-600 text-white mb-4"
            disabled={isLoading}
          >
            <option value="">Select Responder</option>
            {responders.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-zinc-600 hover:bg-zinc-500 text-white" disabled={isLoading}>Cancel</button>
          <button 
            onClick={() => onSubmit(selectedResponder)}
            disabled={!selectedResponder || responders.length === 0 || isLoading}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center"
          >
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>}
            {isLoading ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
};
// --- END Assignment Modal Definition --- 

export default function ResponseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = useSupabase();

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

  // Update activeLogTab state type
  const [activeLogTab, setActiveLogTab] = useState<'reports' | 'activity' | 'inventory' | 'delivery'>('reports');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- NEW: Form States ---
  const [activityForm, setActivityForm] = useState({ what: '', when_time: '', where_location: '', notes: '' });
  const [inventoryForm, setInventoryForm] = useState({ item_name: '', quantity_start: '', quantity_received: '', quantity_delivered: '', quantity_end: '', notes: '' });
  const [deliveryForm, setDeliveryForm] = useState({ item_name: '', quantity: '', destination: '', notes: '' });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState<{[key: number]: boolean}>({});
  // --- NEW: State for Invite Form ---
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  // --- NEW: State for Assignment Form ---
  const [selectedMemberToAssign, setSelectedMemberToAssign] = useState(''); // Store user_id
  const [assignmentSubmitLoading, setAssignmentSubmitLoading] = useState(false);

  // --- NEW: State for Assignment Modal ---
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [reportToAssign, setReportToAssign] = useState<EmergencyReport | null>(null);
  const [selectedResponderId, setSelectedResponderId] = useState('');

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

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
    console.log('>>> [Response Detail] fetchResponseDetails defined');
    console.log('>>> [Response Detail] Using responseId:', responseId, 'and slug:', slug);

    // Ensure supabase client is available
    if (!supabase) {
      console.log(">>> [Response Detail] Supabase client not ready, skipping fetch.");
      setError('Supabase client not available'); // Set error if client isn't ready
      setLoading(false);
      return;
    }
    
    if (!responseId || !slug) {
        console.error('>>> [Response Detail] Missing responseId or slug');
        setError('Parameter respon atau organisasi tidak ditemukan.');
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    // Reset states
    setActivityLogs([]); setInventoryLogs([]); setDeliveryLogs([]); setEmergencyReports([]);
    setAssignedMembers([]); setOrganizationMembers([]);
    setUserRole(null); // Reset user role state at start

    try {
      console.log('>>> [Response Detail] TRY BLOCK START');
      // Use supabase instance from context
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('>>> [Response Detail] Got User:', { email: user?.email, id: user?.id, error: userError?.message });

      if (userError) throw new Error(`User fetch error: ${userError.message}`);
      if (!user) throw new Error('User not authenticated.');

      setUserId(user.id);
      // Fetch user role
      const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
      console.log('>>> Got Profile:', { role: profileData?.role, error: profileError?.message });

      if (profileError) {
          console.error(">>> Profile fetch error:", profileError.message);
          // Don't set role, let it remain null
      } else {
          setUserRole(profileData?.role || null);
          console.log('>>> SET User Role State:', profileData?.role || null);
      }

      console.log('>>> [Response Detail] Proceeding after user/role check...');
      
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

      // --- Get Response Location for Geofencing ---
      const centerLat = responseData.latitude;
      const centerLon = responseData.longitude;
      // --- End Response Location ---

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

      // --- 5. Fetch Related Logs & Geofenced Emergency Reports --- 
      const dataPromises = [
        supabase.from('activity_logs').select('*').eq('disaster_response_id', responseId).order('when_time', { ascending: false }),
        supabase.from('inventory_logs').select('*').eq('disaster_response_id', responseId),
        supabase.from('delivery_logs').select('*').eq('disaster_response_id', responseId),
        // Replace direct fetch with RPC call if location exists
        centerLat != null && centerLon != null
          ? supabase.rpc('get_reports_within_radius', { center_lat: centerLat, center_lon: centerLon, radius_meters: GEOFENCE_RADIUS_METERS })
          : Promise.resolve({ data: [], error: null }) // Resolve with empty if no location
        // supabase.from('emergency_reports').select('*').eq('disaster_response_id', responseId).order('created_at', { ascending: false })
      ];

      const [activityResult, inventoryResult, deliveryResult, reportsResult] = await Promise.all(dataPromises);

      // Handle results and set state
      if (activityResult.error) console.error("Error fetching activity logs:", activityResult.error.message);
      else setActivityLogs(activityResult.data || []);

      if (inventoryResult.error) console.error("Error fetching inventory logs:", inventoryResult.error.message);
      else setInventoryLogs(inventoryResult.data || []);

      if (deliveryResult.error) console.error("Error fetching delivery logs:", deliveryResult.error.message);
      else setDeliveryLogs(deliveryResult.data || []);

      if (reportsResult.error) console.error("Error fetching geofenced emergency reports:", reportsResult.error.message);
      else setEmergencyReports(reportsResult.data || []);

      // --- Fetch Organization Members (Potential Responders) ---
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('user_id, name:full_name, role') // Select user_id and name, role
        .eq('organization_id', currentOrgId)
        .eq('role', 'org_responder'); // Filter for responders only

      if (membersError) {
        console.error("Error fetching organization members:", membersError);
        // Handle error appropriately, maybe set an error state
      } else {
        // Map to the structure needed for the Assignment Modal ({ id: string, name: string })
        setOrganizationMembers(membersData?.map(m => ({ id: m.user_id, name: m.name || 'Unnamed Responder', role: m.role })) || []);
      }
      // --- End Fetch Organization Members ---

    } catch (err: any) {
      console.error('>>> [Response Detail] CATCH BLOCK Error:', err);
      setError(err.message || 'An unknown error occurred');
      // Reset other states on error if needed
      setResponse(null); setAssignedMembers([]); setOrganizationMembers([]);
    } finally {
      console.log('>>> [Response Detail] FINALLY BLOCK');
      setLoading(false);
    }
  }, [responseId, slug, supabase]);

  useEffect(() => {
    console.log('>>> [Response Detail] useEffect triggered. supabase available:', !!supabase);
    if (supabase && responseId && slug) { // Check supabase exists before fetching
      fetchResponseDetails();
    }
    // Add a cleanup function if necessary, e.g., for subscriptions
    // return () => { /* cleanup logic */ };
    // Temporarily remove fetchResponseDetails for diagnostics
  }, [responseId, slug, supabase]); // <--- REMOVED fetchResponseDetails

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
    if (!supabase) { toast.error("Client error"); return; }
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
    if (!supabase) { toast.error("Client error"); return; }
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
    if (!supabase) { toast.error("Client error"); return; }
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
    if (!supabase) { toast.error("Client error"); return; }
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
                status: 'Ditugaskan' // Update status upon assignment to Ditugaskan
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
    if (!supabase) { toast.error("Client error"); return; }
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

  // --- NEW: Invite Member Form Submission Handler ---
  const handleInviteSubmit = async (e: React.FormEvent) => {
    if (!supabase) { toast.error("Client error"); return; }
    e.preventDefault();
    if (!inviteEmail || !response?.organization_id) {
        toast.error("Email anggota dan ID Organisasi diperlukan.");
        return;
    }
    setInviteLoading(true);
    try {
      // Get the current session for the Authorization header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const responseApi = await fetch('/api/invite-member', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
              invitee_email: inviteEmail,
              organization_id: response.organization_id
          }),
      });

      const result = await responseApi.json();

      if (!responseApi.ok) {
        throw new Error(result.error || 'Gagal mengirim undangan.');
      }

      toast.success(result.message || "Undangan berhasil dikirim!");
      setInviteEmail(''); // Reset form
      // Optionally refetch members or wait for user to refresh/navigate
      // fetchResponseDetails(); // Can cause flicker, might be better to just show success

    } catch (error: any) {
      console.error("Error inviting member:", error);
      toast.error(`Gagal mengundang anggota: ${error.message}`);
    } finally {
      setInviteLoading(false);
    }
  };

  // --- Compute list of assignable members ---
  const assignableMembers = organizationMembers.filter(orgMember => 
    orgMember.role === 'org_responder' && 
    !assignedMembers.some(assigned => assigned.id === orgMember.id)
  );

  // --- NEW: Assign Existing Member Form Submission Handler ---
  const handleAssignMemberSubmit = async (e: React.FormEvent) => {
    if (!supabase || !userId) { toast.error("Client error or user not identified"); return; } // Added userId check
    e.preventDefault();
    const assignedMemberId = selectedMemberToAssign;
    if (!assignedMemberId || !responseId) {
        toast.error("Pilih anggota yang akan ditugaskan.");
        return;
    }

    // Find member details for logging
    const memberDetails = organizationMembers.find(m => m.id === assignedMemberId);
    const assignedMemberName = memberDetails?.name || assignedMemberId;

    setAssignmentSubmitLoading(true);
    try {
        // 1. Insert into team_assignments (keep existing logic)
        const { error: assignmentError } = await supabase
            .from('team_assignments')
            .insert({
                disaster_response_id: responseId,
                member_id: assignedMemberId
            });
        
        if (assignmentError) {
            if (assignmentError.code === '23505') { // Unique violation
                 toast.error("Anggota ini sudah ditugaskan untuk respon ini.");
                 setAssignmentSubmitLoading(false); // Stop loading if already assigned
                 return; // Exit early
            } else {
                 throw new Error(`Gagal menambahkan ke team_assignments: ${assignmentError.message}`);
            }
        } 

        // 2. Update Disaster Response status
        const { error: responseUpdateError } = await supabase
            .from('disaster_responses')
            .update({ 
                status: 'assigned', // Set new status
                // Optionally update an array of assigned IDs if schema supports it
                // assigned_responder_ids: supabase.rpc('array_append', { field: 'assigned_responder_ids', value: assignedMemberId })
             })
            .eq('id', responseId);

        if (responseUpdateError) {
            throw new Error(`Gagal update status respon: ${responseUpdateError.message}`);
        }

        // 3. Update linked Emergency Reports status
        const { error: reportsUpdateError } = await supabase
            .from('emergency_reports')
            .update({ status: 'Ditugaskan' }) // Set new status
            .eq('disaster_response_id', responseId)
            .in('status', ['menunggu']); // Only update reports that are waiting

        if (reportsUpdateError) {
            console.warn("Assignment successful, but failed to update some emergency report statuses:", reportsUpdateError.message);
            // Decide if this is critical enough to rollback or just warn
            toast("Warning: Anggota ditugaskan, tapi gagal update status laporan darurat terkait.");
        }

        // 4. Add to Activity Log
        const activityDescription = `Menugaskan ${assignedMemberName} ke respon ini.`;
        const { error: logError } = await supabase
          .from('activity_logs') // Assuming 'activity_logs' table
          .insert({
            disaster_response_id: responseId,
            user_id: userId, // The org_admin performing the action
            type: 'assignment', // Log type
            description: activityDescription,
            details: { assigned_user_id: assignedMemberId, assigned_user_name: assignedMemberName }, // Store extra info
            when_time: new Date().toISOString() // Use current time for assignment log
          });

        if (logError) {
          console.warn("Assignment successful, but failed to add activity log:", logError.message);
          // Non-critical? Proceed but maybe log it centrally.
          toast("Warning: Anggota ditugaskan, tapi gagal mencatat aktivitas.");
        }

        // --- Success --- 
        toast.success(`Anggota ${assignedMemberName} berhasil ditugaskan!`);
        setSelectedMemberToAssign(''); // Reset dropdown
        fetchResponseDetails(); // Refetch details to update UI

    } catch (error: any) {
        console.error("Error assigning member:", error);
        toast.error(`Gagal menugaskan anggota: ${error.message}`);
        // Consider rolling back assignment if critical steps failed?
    } finally {
        setAssignmentSubmitLoading(false);
    }
  };

  // --- NEW: Assignment Modal Handlers ---
  const openAssignModal = (report: EmergencyReport) => {
    setReportToAssign(report);
    setSelectedResponderId(''); // Reset selection
    setIsAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setReportToAssign(null);
  };

  const handleAssignSubmit = async (responderId: string) => {
    if (!reportToAssign || !responderId || !response?.organization_id) {
      toast.error("Missing report, responder, or organization information.");
      return;
    }

    const reportId = reportToAssign.id;
    const orgId = response.organization_id; // Use orgId from the fetched response
    
    setAssignmentSubmitLoading(true); // Use specific loading state
    console.log(`Assigning report ${reportId} to responder ${responderId} in org ${orgId}`);

    try {
      const { error: rpcError } = await supabase.rpc('assign_emergency_report', {
        report_id: reportId,
        p_org_responder_id: orgId, 
        p_responder_id: responderId 
      });
      if (rpcError) throw rpcError;

      // Re-fetch details to get updated report status and names
      await fetchResponseDetails(); 
      
      closeAssignModal();
      toast.success('Report assigned successfully!');

    } catch (err: any) {
      console.error("Error assigning report:", err);
      toast.error(`Failed to assign report: ${err.message}`);
    } finally {
      setAssignmentSubmitLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-zinc-400">Memuat detail respon...</div>;
  if (error) return <div className="p-6 text-center text-red-400">Error: {error}</div>;
  if (!response) return <div className="p-6 text-center text-zinc-400">Respon tidak ditemukan.</div>;

  // --- Debug Log (keep this one too) --- 
  console.log('>>> [Response Detail] RENDER CHECK userRole:', userRole, 'Is Org Admin:', userRole === 'org_admin');
  // --- End Debug Log ---

  return (
    <div className="p-4 md:p-6 space-y-6 bg-zinc-900 min-h-screen text-zinc-100">
      <div className="max-w-4xl mx-auto">
        <Link href={`/responder/${slug}/dashboard`} className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Kembali ke {orgName ? `Dasbor ${orgName}` : 'Dasbor'}
        </Link>

        <h1 className="text-3xl font-bold mb-4 text-zinc-100">{response.name}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Response Details & Map */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Info Card */}
            <div className="bg-zinc-800 p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-zinc-200 mb-3">Informasi Umum</h2>
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
                     <span className={`capitalize px-2 py-0.5 rounded text-xs font-medium 
                        ${response.status === 'active' 
                          ? 'bg-green-700 text-green-100' 
                          : response.status === 'assigned' 
                          ? 'bg-blue-700 text-blue-100' 
                          : 'bg-zinc-600 text-zinc-200' // Default/finished
                        }`
                    }>
                          {response.status}
                      </span>
                  )}
              </div>
              <p className="text-sm"><strong className="text-zinc-400">Jenis Bencana:</strong> {response.disaster_types?.join(', ') || '-'}</p>
              <p className="text-sm"><strong className="text-zinc-400">Tanggal Mulai:</strong> {response.start_date ? new Date(response.start_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</p>
              <p className="text-sm"><strong className="text-zinc-400">Dibuat Tanggal:</strong> {new Date(response.created_at).toLocaleString('id-ID')}</p>
            </div>

            {/* Location Card */}
            <div className="bg-zinc-800 p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-zinc-200 mb-3">Lokasi</h2>
              <p className="text-sm"><strong className="text-zinc-400">Deskripsi:</strong> {response.location || '(Tidak ada deskripsi tambahan)'}</p>
              {response.parsed_address ? (
                 <p className="text-sm"><strong className="text-zinc-400">Alamat Parsed:</strong> {formatAddress(response.parsed_address)}</p>
              ): (
                 <p className="text-sm text-zinc-500 italic">(Alamat terstruktur tidak tersedia)</p>
              )}
               {mapPosition && (
                 <p className="text-sm"><strong className="text-zinc-400">Koordinat:</strong> Lat: {response.latitude?.toFixed(6)}, Lng: {response.longitude?.toFixed(6)}</p>
               )}
              
              {/* Map */}
              <div className="mt-4 h-64 md:h-96 w-full relative z-0">
                {isClient && response && response.latitude && response.longitude && (
                  <MapLeaflet 
                    key={`${response.latitude}-${response.longitude}`} // Force re-render if location changes
                    center={[response.latitude, response.longitude]}
                    zoom={15}
                    className="h-full w-full rounded-lg"
                    emergencyReportsData={emergencyReports} // Pass geofenced data
                    // Pass contribution data if needed later
                    // contributionReportsData={...}
                    // Pass contributionType if needed for filtering inside ContributionMarkers
                    // contributionType={...} 
                    // Keep filterType='all' or adjust as needed for MapLeaflet internal logic
                    filterType='all' 
                  />
                )}
                {/* Display message if no coordinates */}
                {(!response.latitude || !response.longitude) && (
                  <div className="h-full w-full flex items-center justify-center bg-zinc-700 text-zinc-400 rounded-lg">
                    Koordinat lokasi tidak tersedia.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Assigned Members */}
          <div className="space-y-4 bg-zinc-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2 text-zinc-200">Anggota Ditugaskan</h2>
            {assignedMembers.length > 0 ? (
              <ul className="space-y-2 mb-4">
                {assignedMembers.map(member => (
                  <li key={member.id} className="text-sm bg-zinc-700/60 p-2 rounded">
                    <strong className="text-zinc-200">{member.name}</strong>
                    <span className="text-zinc-400 ml-2">({member.role})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-400 italic mb-4">Belum ada anggota yang ditugaskan.</p>
            )}

            {/* --- NEW: Invite Member Form (Visible to org_admin) --- */} 
            {userRole === 'org_admin' && response && (
                <form onSubmit={handleInviteSubmit} className="mt-4 pt-4 border-t border-zinc-700">
                    <h3 className="text-md font-semibold text-zinc-300 mb-2">Undang Anggota Baru (Org. Responder)</h3>
                    <div className="flex items-center gap-2">
                        <input 
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="Email anggota baru..."
                            required
                            className="flex-grow text-sm bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-zinc-100 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500"
                        />
                        <button 
                            type="submit"
                            disabled={inviteLoading}
                            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {inviteLoading ? 'Mengundang...' : 'Undang'}
                        </button>
                    </div>
                </form>
            )}
             {/* TODO: Add button to manage assignments? */}
             {/* --- NEW: Assign Existing Member Form (Visible to org_admin) --- */} 
              {userRole === 'org_admin' && response && assignableMembers.length > 0 && (
                <form onSubmit={handleAssignMemberSubmit} className="mt-4 pt-4 border-t border-zinc-700">
                    <h3 className="text-md font-semibold text-zinc-300 mb-2">Tugaskan Anggota ke Respon Ini</h3>
                    <div className="flex items-center gap-2">
                         <select 
                            value={selectedMemberToAssign}
                            onChange={(e) => setSelectedMemberToAssign(e.target.value)}
                            required
                            className="flex-grow text-sm bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-zinc-100 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="" disabled>Pilih anggota...</option>
                            {assignableMembers.map(member => (
                                <option key={member.id} value={member.id}>{member.name} ({member.role})</option>
                            ))}
                        </select>
                        <button 
                            type="submit"
                            disabled={assignmentSubmitLoading || !selectedMemberToAssign}
                            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            aria-label="Tugaskan anggota yang dipilih"
                        >
                            {assignmentSubmitLoading ? 'Menugaskan...' : 'Tugaskan Anggota'}
                        </button>
                    </div>
                </form>
              )}
          </div>
        </div>

        {/* Detail & Log Tabs Section */}
        <div className="bg-zinc-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Detail & Log Terkait Respon</h2>
            {/* Tab Buttons */}
            <div className="flex border-b border-zinc-700 mb-4">
                {[
                    { key: 'reports', label: `Laporan Darurat (${emergencyReports.length})` },
                    { key: 'activity', label: `Aktivitas (${activityLogs.length})` },
                    { key: 'inventory', label: `Inventaris (${inventoryLogs.length})` },
                    { key: 'delivery', label: `Pengiriman (${deliveryLogs.length})` }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveLogTab(tab.key as any)}
                        className={`px-4 py-2 -mb-px border-b-2 transition-colors duration-150 ease-in-out 
                            ${activeLogTab === tab.key 
                                ? 'border-blue-500 text-blue-400' 
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
                {activeLogTab === 'reports' && (
                    <div>
                        <h3 className="text-md font-semibold mb-3">Laporan Darurat Terkait ({emergencyReports.length})</h3>
                        {emergencyReports.length === 0 ? (
                            <p className="text-zinc-400 italic">Tidak ada laporan darurat terkait dengan respon ini dalam radius {GEOFENCE_RADIUS_METERS / 1000}km.</p>
                        ) : (
                            <div className="space-y-3">
                                {emergencyReports.map((report) => (
                                    <div key={report.id} className="bg-zinc-700/50 rounded-md p-4 shadow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold text-white">{report.full_name || 'Nama Tidak Tersedia'}</h4>
                                                <p className="text-sm text-zinc-300 mt-1">{report.description || 'Deskripsi Tidak Tersedia'}</p>
                                                <p className="text-xs text-zinc-400 mt-2">
                                                    Tipe: <span className="font-medium">{report.assistance_type || 'none'}</span>, 
                                                    Status: <span className="font-medium">{report.status || 'unknown'}</span>
                                                </p>
                                            </div>
                                            {/* --- Add Assign Button Here --- */}
                                            {userRole === 'org_admin' && (report.status === 'pending' || report.status === 'verified') && (
                                                <button
                                                    onClick={() => openAssignModal(report)}
                                                    className="ml-4 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors shadow whitespace-nowrap"
                                                    title="Assign Responder"
                                                    disabled={assignmentSubmitLoading} // Disable while assigning
                                                >
                                                    Tugaskan
                                                </button>
                                            )}
                                            {/* --- End Assign Button --- */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                 {/* ... (keep existing content for other tabs: activity, inventory, delivery) ... */}
                 {/* == Aktivitas Tab == */} 
                {activeLogTab === 'activity' && (
                    <div className="space-y-6">
                        {/* Manual Activity Log Form */} 
                        <form onSubmit={handleActivitySubmit} className="p-4 bg-zinc-700/30 rounded-lg border border-zinc-700 space-y-3">
                            <h3 className="text-md font-semibold">Tambah Log Aktivitas Manual</h3>
                            <div>
                                <label htmlFor="activity_what" className="block text-sm font-medium text-zinc-300 mb-1">Apa yang terjadi? <span className="text-red-400">*</span></label>
                                <input type="text" id="activity_what" name="what" value={activityForm.what} onChange={(e) => handleFormChange(e, setActivityForm)} required className="w-full text-sm bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5" />
                            </div>
                            <div>
                                <label htmlFor="activity_when" className="block text-sm font-medium text-zinc-300 mb-1">Kapan? <span className="text-red-400">*</span></label>
                                <input type="datetime-local" id="activity_when" name="when_time" value={activityForm.when_time} onChange={(e) => handleFormChange(e, setActivityForm)} required className="w-full text-sm bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5" />
                            </div>
                            <div>
                                <label htmlFor="activity_where" className="block text-sm font-medium text-zinc-300 mb-1">Di mana?</label>
                                <input type="text" id="activity_where" name="where_location" value={activityForm.where_location} onChange={(e) => handleFormChange(e, setActivityForm)} className="w-full text-sm bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5" />
                            </div>
                            <div>
                                <label htmlFor="activity_notes" className="block text-sm font-medium text-zinc-300 mb-1">Catatan Tambahan</label>
                                <textarea id="activity_notes" name="notes" value={activityForm.notes} onChange={(e) => handleFormChange(e, setActivityForm)} rows={2} className="w-full text-sm bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5"></textarea>
                            </div>
                            <div className="text-right">
                                <button type="submit" disabled={formSubmitting} className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50">
                                    {formSubmitting ? 'Menyimpan...' : 'Simpan Log'}
                                </button>
                            </div>
                        </form>

                        {/* Activity Log List */} 
                        <div>
                            <h3 className="text-md font-semibold mb-3">Riwayat Aktivitas ({activityLogs.length})</h3>
                            {activityLogs.length === 0 ? (
                                <p className="text-zinc-400 italic">Belum ada aktivitas tercatat.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {activityLogs.map(log => (
                                        <li key={log.id} className="bg-zinc-700/50 p-3 rounded text-sm">
                                            <p className="text-zinc-200">
                                                <strong className="font-medium">{log.what || log.description || 'Aktivitas tidak dijelaskan'}</strong>
                                                {log.where_location && <span className="text-zinc-400"> di {log.where_location}</span>}
                                            </p>
                                            <p className="text-xs text-zinc-400 mt-1">
                                                {formatDateTime(log.when_time || log.created_at)} 
                                                {/* TODO: Fetch/Display user name based on log.user_id if available */} 
                                                {log.user_id && <span className="ml-2">(oleh: {log.user_id.substring(0,8)}...)</span>} 
                                            </p>
                                            {log.notes && <p className="text-xs text-zinc-300 mt-1 pt-1 border-t border-zinc-600/50">Catatan: {log.notes}</p>}
                                            {/* Optionally display log.details for assignment type */} 
                                            {log.type === 'assignment' && log.details && (
                                                <p className="text-xs text-cyan-400 mt-1">Detail: Ditugaskan kepada {log.details.assigned_user_name as string || log.details.assigned_user_id as string}</p> /* Added type assertion */
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* --- Render Assignment Modal --- */} 
      <AssignmentModal
        isOpen={isAssignModalOpen}
        onClose={closeAssignModal}
        onSubmit={handleAssignSubmit}
        // Pass only responders fetched for the org
        responders={organizationMembers.filter(m => m.role === 'org_responder').map(m => ({ id: m.id, name: m.name }))}
        selectedResponder={selectedResponderId}
        setSelectedResponder={setSelectedResponderId}
        isLoading={assignmentSubmitLoading} // Pass loading state
      />
      {/* --- End Assignment Modal --- */}

    </div>
  );
}
