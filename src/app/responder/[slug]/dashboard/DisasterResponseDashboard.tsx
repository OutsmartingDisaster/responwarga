"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from "@/../lib/supabase/client";
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-hot-toast';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic'; // Import dynamic

// --- Leaflet Icon Fix --- (Needs to run client-side)
// We'll move this logic into a useEffect later
// import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
// import iconUrl from 'leaflet/dist/images/marker-icon.png';
// import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({...

// --- Dynamically import Leaflet components ---
// Add a loading placeholder for the map itself
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false, loading: () => <div className="h-64 w-full flex items-center justify-center bg-zinc-700 text-zinc-400">Memuat peta...</div> });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });

// --- Wrapper component for useMapEvents and Marker logic ---
// Needs to be defined before being dynamically imported below
function LocationMapEventsWrapperComponent({ onLocationSelect, position }: { onLocationSelect: (lat: number, lng: number) => void, position: L.LatLngTuple | null }) {
  const markerRef = useRef<L.Marker>(null);
  // This hook can only be called client-side, hence the dynamic import of the wrapper
  const { useMapEvents } = require('react-leaflet');

  useMapEvents({
    click(e: L.LeafletMouseEvent) { // Type added here
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onLocationSelect(lat, lng);
        }
      },
    }),
    [onLocationSelect],
  );

  // This Marker component is the dynamically imported one
  return position === null ? null : (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}>
    </Marker>
  );
}

// Dynamically import the *wrapper component* itself
const LocationMapEventsWrapper = dynamic(() => Promise.resolve(LocationMapEventsWrapperComponent), { ssr: false });

// Define member type (can be moved to a shared types file later)
type OrgMember = {
  user_id: string; // user_id from auth.users
  name: string;
  role: string;
};

// Define type for parsed address components
type ParsedAddress = {
  road?: string;
  village?: string;
  suburb?: string; // Sometimes village is under suburb
  city_district?: string; // Kecamatan
  county?: string; // Kabupaten
  city?: string; // Kota
  state?: string; // Provinsi
  postcode?: string;
  country?: string;
  display_name?: string; // Full address string
};

// Define type for Disaster Response data (can be expanded)
type DisasterResponse = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  status: string;
  disaster_types: string[];
  created_at: string;
  // Add other fields as needed (latitude, longitude, parsed_address)
  latitude?: number | null;
  longitude?: number | null;
  parsed_address?: ParsedAddress | null;
};

const DISASTER_TYPES = [
  "Banjir",
  "Kebakaran",
  "Gempa Bumi",
  "Tsunami",
  "Angin Puting Beliung",
  "Banjir Bandang",
  "Tanah Longsor",
  // Add more predefined types here
];

export default function DisasterResponseDashboard() {
  const supabase = createClient();
  const router = useRouter(); // Get router instance
  const params = useParams(); // Get params for slug
  const slug = params.slug as string; // Extract slug
  const [orgId, setOrgId] = useState<string | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State for map coordinates
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // State for reverse geocoding
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [addressString, setAddressString] = useState<string | null>(null);
  const [parsedAddress, setParsedAddress] = useState<ParsedAddress | null>(null);

  // State for forward geocoding (address search)
  const [addressSearchInput, setAddressSearchInput] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  // State for fetched responses
  const [activeResponses, setActiveResponses] = useState<DisasterResponse[]>([]);
  const [finishedResponses, setFinishedResponses] = useState<DisasterResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [errorResponses, setErrorResponses] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    location_description: "",
    start_date: new Date().toISOString().slice(0, 10),
    disaster_types: [] as string[],
    assigned_member_ids: [] as string[],
  });

  // Ref for map instance
  const mapRef = useRef<L.Map | null>(null);

  // --- Client-side effect for Leaflet Icon Fix ---
  useEffect(() => {
    (async () => {
      // Dynamically import Leaflet itself here for client-side access
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

  // Function to fetch active responses
  const fetchActiveResponses = useCallback(async (currentOrgId: string) => {
    if (!currentOrgId) return;
    setLoadingResponses(true);
    setErrorResponses(null);
    try {
      const { data, error } = await supabase
        .from('disaster_responses')
        .select('*') // Select all columns for now
        .eq('organization_id', currentOrgId)
        .eq('status', 'active') // Filter by active status
        .order('start_date', { ascending: false, nullsFirst: false }); // Order by start date

      if (error) throw error;
      setActiveResponses(data || []);
    } catch (err: any) {
      console.error("Error fetching active responses:", err);
      setErrorResponses("Gagal memuat daftar respon aktif.");
      setActiveResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  }, [supabase]); // Dependency: supabase client

  // --- NEW: Function to fetch finished responses ---
  const fetchFinishedResponses = useCallback(async (currentOrgId: string) => {
    if (!currentOrgId) return;
    // No separate loading/error state for finished for now
    try {
      const { data, error } = await supabase
        .from('disaster_responses')
        .select('*')
        .eq('organization_id', currentOrgId)
        .eq('status', 'finished') // Filter by finished status
        .order('updated_at', { ascending: false }); // Order by when it was finished

      if (error) throw error;
      setFinishedResponses(data || []);
    } catch (err: any) {
      console.error("Error fetching finished responses:", err);
      setFinishedResponses([]);
    }
  }, [supabase]);

  // Initial Fetch Effect (Org ID, Members, Active & Finished Responses)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("User not authenticated");

        // Fetch user's organization ID
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        if (profileError) throw new Error(`Profile fetch error: ${profileError.message}`);
        if (!profile?.organization_id) throw new Error("No organization assigned");
        const fetchedOrgId = profile.organization_id;
        setOrgId(fetchedOrgId);

        // Fetch members of the organization (users with profiles linked to this org)
        const { data: membersData, error: membersError } = await supabase
          .from("profiles")
          .select("user_id, name, role") // Select user_id, name, role
          .eq("organization_id", profile.organization_id)
          .in("role", ["responder", "org_admin"]); // Fetch responders and org_admins

        if (membersError) throw new Error(`Error fetching members: ${membersError.message}`);
        setMembers(membersData || []);

        // Fetch active and finished responses AFTER orgId is confirmed
        setLoadingResponses(true); // Set loading before fetching both
        await Promise.all([
           fetchActiveResponses(fetchedOrgId),
           fetchFinishedResponses(fetchedOrgId) // <-- Fetch finished too
        ]);
        setLoadingResponses(false); // Set loading false after both complete

      } catch (err: any) {
        setError(err.message);
        // Clear responses if initial fetch fails badly
        setActiveResponses([]);
        setFinishedResponses([]); // <-- Clear finished on error too
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, fetchActiveResponses, fetchFinishedResponses]); // <-- Add fetchFinishedResponses dependency

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

  const handleMemberAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, assigned_member_ids: selectedOptions }));
  };

  // Function to fetch address from coordinates using Nominatim
  const fetchAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    setIsFetchingAddress(true);
    setAddressString("Mencari alamat...");
    setParsedAddress(null);
    try {
      // Note: Using Nominatim requires adherence to their usage policy (e.g., rate limiting, user agent)
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`);
      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.statusText}`);
      }
      const data = await response.json();

      if (data && data.address) {
        setAddressString(data.display_name || "Alamat tidak ditemukan.");
        const addr = data.address;
        const structuredAddress: ParsedAddress = {
          road: addr.road,
          village: addr.village || addr.suburb, // Use village or suburb
          city_district: addr.city_district, // Kecamatan
          county: addr.county, // Kabupaten
          city: addr.city, // Kota
          state: addr.state, // Provinsi
          postcode: addr.postcode,
          country: addr.country,
          display_name: data.display_name
        };
        setParsedAddress(structuredAddress);

        // Optionally update form's location description if empty
        if (!formData.location_description) {
          setFormData(prev => ({ ...prev, location_description: data.display_name || "" }));
        }
      } else {
        setAddressString("Alamat tidak ditemukan.");
        setParsedAddress(null);
      }
    } catch (error: any) {
      console.error("Reverse geocoding failed:", error);
      setAddressString("Gagal mengambil alamat.");
      setParsedAddress(null);
    } finally {
      setIsFetchingAddress(false);
    }
  }, [formData.location_description]);

  // Forward Geocoding: Address Search -> Coordinates
  const handleGeocodeAddress = async () => {
    if (!addressSearchInput.trim()) {
      setGeocodingError("Masukkan alamat untuk dicari.");
      return;
    }
    setIsGeocoding(true);
    setGeocodingError(null);
    setAddressString("Mencari lokasi...");
    setParsedAddress(null);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearchInput)}&limit=1&countrycodes=id&accept-language=id`); // Limit to Indonesia
      if (!response.ok) {
        throw new Error(`Nominatim Search API error: ${response.statusText}`);
      }
      const results = await response.json();

      if (results && results.length > 0) {
        const bestResult = results[0];
        const lat = parseFloat(bestResult.lat);
        const lon = parseFloat(bestResult.lon);

        setLatitude(lat);
        setLongitude(lon);
        setAddressSearchInput(bestResult.display_name); // Update search input with result

        // Update map view
        mapRef.current?.setView([lat, lon], 16);

        // Fetch structured address for the found coordinates
        await fetchAddressFromCoords(lat, lon);
      } else {
        setGeocodingError("Alamat tidak ditemukan.");
        setAddressString("Alamat tidak ditemukan. Coba lagi atau klik peta.");
        setLatitude(null);
        setLongitude(null);
      }
    } catch (error: any) {
      console.error("Forward geocoding failed:", error);
      setGeocodingError("Gagal mencari alamat.");
      setAddressString("Gagal mencari alamat. Coba lagi atau klik peta.");
      setLatitude(null);
      setLongitude(null);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Map Click or Drag -> Coordinates & Reverse Geocoding
  // Use useCallback to prevent unnecessary re-renders of LocationMarker
  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    fetchAddressFromCoords(lat, lng); // Fetch structured address
    setGeocodingError(null); // Clear search error if user interacts with map
  }, [fetchAddressFromCoords]); // Add fetchAddressFromCoords as dependency

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      setError("Organization ID not found.");
      return;
    }
    if (formData.disaster_types.length === 0) {
        setError("Pilih setidaknya satu jenis bencana.");
        return;
    }

    setFormLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Insert into disaster_responses
      const { data: responseData, error: responseError } = await supabase
        .from('disaster_responses')
        .insert([{
          organization_id: orgId!,
          name: formData.name,
          disaster_types: formData.disaster_types,
          location: formData.location_description,
          start_date: formData.start_date,
          latitude: latitude,
          longitude: longitude,
          parsed_address: parsedAddress,
          status: 'active',
        }])
        .select()
        .single();

      if (responseError) throw new Error(`Gagal membuat respon: ${responseError.message}`);
      if (!responseData) throw new Error("Gagal mendapatkan ID respon baru.");

      const newResponseId = responseData.id;

      // 2. Insert into team_assignments if members are selected
      if (formData.assigned_member_ids.length > 0) {
        // simplified assignment object after dropping columns
        const assignments = formData.assigned_member_ids.map(memberUuid => ({
          disaster_response_id: newResponseId,
          member_id: memberUuid,
        }));

        const { error: assignmentError } = await supabase
          .from('team_assignments')
          .insert(assignments);

        if (assignmentError) {
          console.error("Assignment failed, but response created:", assignmentError);
          throw new Error(`Respon dibuat, tetapi gagal menugaskan anggota: ${assignmentError.message}`);
        }
      }

      setSuccessMessage("Respon bencana berhasil dibuat!");
      // Reset form including coordinates and address
      setFormData({
        name: "",
        location_description: "",
        start_date: new Date().toISOString().slice(0, 10),
        disaster_types: [],
        assigned_member_ids: [],
      });
      setLatitude(null);
      setLongitude(null);
      setAddressString(null);
      setParsedAddress(null);

      // Refetch active and finished responses to include the new one
      if (orgId) {
        fetchActiveResponses(orgId);
        fetchFinishedResponses(orgId);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // --- Placeholder Handlers for Actions ---
  const handleViewDetails = (responseId: string) => {
    console.log("View Details clicked for response ID:", responseId);
    // Navigate to the detail page
    router.push(`/responder/${slug}/dashboard/responses/${responseId}`);
  };

  const handleEditResponse = (responseId: string) => {
    console.log("Edit clicked for response ID:", responseId);
    // Navigate to the edit page for this response
    router.push(`/responder/${slug}/dashboard/responses/${responseId}/edit`);
  };

  const handleDeleteResponse = async (responseId: string) => {
    console.log("Delete clicked for response ID:", responseId);
    if (window.confirm('Apakah Anda yakin ingin menghapus respon ini? Tindakan ini tidak dapat dibatalkan.')) {
      try {
        if (!orgId) throw new Error("Organization ID not found for delete operation.");

        // Delete the response
        const { error } = await supabase
          .from('disaster_responses')
          .delete()
          .eq('id', responseId)
          .eq('organization_id', orgId); // Ensure user can only delete from their org

        if (error) throw error;

        toast.success('Respon berhasil dihapus');
        fetchActiveResponses(orgId); // Refetch the active list
        fetchFinishedResponses(orgId); // <-- Refetch finished list too

      } catch (err: any) {
        console.error("Failed to delete response:", err);
        toast.error(`Gagal menghapus respon: ${err.message}`);
      }
    }
  };

  // --- Render logic ---
   // Loading state for initial data fetch
  if (loading) return <div className="p-4 text-zinc-400">Memuat data organisasi...</div>;
  if (error && !members.length) return <div className="p-4 text-red-400">Error: {error}</div>; // Show error if initial fetch failed

  const mapPosition: [number, number] | null = latitude !== null && longitude !== null ? [latitude, longitude] : null;
  // Default map center (e.g., somewhere in Indonesia)
  const defaultCenter: [number, number] = [-2.5489, 118.0149];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-zinc-100">Manajemen Respon Bencana</h2>

      {/* Section 1: Create New Response Form */}
      <section className="bg-zinc-800 p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-4 text-zinc-200">Buat Respon Baru</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error/Success Messages */}
          {error && <p className="text-red-400 bg-red-900/30 p-3 rounded">Error: {error}</p>}
          {successMessage && <p className="text-green-400 bg-green-900/30 p-3 rounded">{successMessage}</p>}

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
              placeholder="Contoh: Respon Banjir Jakarta Timur"
            />
          </div>

          {/* Address Search Input & Button */}
          <div>
            <label htmlFor="addressSearch" className="block text-sm font-medium text-zinc-300 mb-1">Cari Alamat / Lokasi Awal</label>
            <div className="flex gap-2">
              <input
                type="text"
                id="addressSearch"
                value={addressSearchInput} // Now displays search term OR result
                onChange={(e) => {
                    setAddressSearchInput(e.target.value);
                    if (geocodingError) setGeocodingError(null);
                 }}
                className="flex-grow bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-zinc-100 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan nama jalan, kelurahan, atau area"
              />
              <button
                type="button"
                onClick={handleGeocodeAddress}
                disabled={isGeocoding || !addressSearchInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 text-white px-4 py-2 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500 transition duration-150 ease-in-out"
              >
                {isGeocoding ? "Mencari..." : "Cari"}
              </button>
            </div>
            {geocodingError && <p className="text-xs text-red-400 mt-1">{geocodingError}</p>}
          </div>

          {/* Conditionally Rendered Map Section */}
           {/* Use dynamic components here */}
           {latitude !== null && longitude !== null && (
            <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-300">Perbaiki Pin Lokasi di Peta (Drag & Drop / Klik)</label>
                <div className="h-64 w-full rounded border border-zinc-600 overflow-hidden z-0">
                 <MapContainer ref={mapRef} center={mapPosition || defaultCenter} zoom={mapPosition ? 16 : 5} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                     {/* Use the dynamic wrapper for map events/marker */}
                    <LocationMapEventsWrapper onLocationSelect={handleLocationSelect} position={mapPosition} />
                  </MapContainer>
                 </div>
                 {latitude !== null && longitude !== null && (
                    <p className="text-xs text-zinc-400 mt-1">
                      Koordinat Terpilih: Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
                    </p>
                  )}
                 {/* Display Fetched Address */}
                <div className="mt-1">
                    <p className={`text-sm p-2 rounded bg-zinc-700/50 border border-zinc-700 min-h-[40px] ${isFetchingAddress || !addressString ? 'text-zinc-500 italic' : 'text-zinc-200'}`}>
                        {isFetchingAddress ? "Memverifikasi alamat..." : (addressString || "Alamat belum terverifikasi.")}
                    </p>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Klik atau drag pin di peta jika perlu untuk memperbaiki lokasi.</p>
            </div>
           )}

          {/* Location Description (Manual input remains for notes) */}
          <div>
            <label htmlFor="location_description" className="block text-sm font-medium text-zinc-300 mb-1">Deskripsi/Catatan Lokasi Tambahan (Opsional)</label>
            <textarea
              id="location_description"
              name="location_description"
              value={formData.location_description}
              onChange={handleInputChange}
              rows={2}
              className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-zinc-100 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Misal: Belakang Puskesmas, Rumah pagar hijau"
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
                {/* TODO: Add input for "Tambah Jenis Bencana Lainnya" */}
             </div>
             {formData.disaster_types.length === 0 && <p className="text-xs text-red-400 mt-1">Pilih minimal satu jenis bencana.</p>}
          </div>

           <div>
             <label htmlFor="assigned_member_ids" className="block text-sm font-medium text-zinc-300 mb-1">Anggota Tim Ditugaskan</label>
             <select
                multiple
                id="assigned_member_ids"
                name="assigned_member_ids"
                value={formData.assigned_member_ids}
                onChange={handleMemberAssignmentChange}
                className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-zinc-100 focus:ring-blue-500 focus:border-blue-500 h-32"
             >
                {members.length === 0 && <option disabled>Tidak ada anggota tim</option>}
                {members.map(member => (
                    <option key={member.user_id} value={member.user_id}>
                        {member.name} ({member.role})
                    </option>
                ))}
             </select>
             <p className="text-xs text-zinc-400 mt-1">Tahan Ctrl (atau Cmd di Mac) untuk memilih lebih dari satu.</p>
           </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={formLoading || formData.disaster_types.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 text-white px-6 py-2 rounded font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500 transition duration-150 ease-in-out"
            >
              {formLoading ? "Membuat..." : "Buat Respon"}
            </button>
          </div>
        </form>
      </section>

      {/* Section 2: Active Responses List */}
      <section>
        <h3 className="text-xl font-semibold mb-4 text-zinc-200">Respon Aktif</h3>
        <div className="bg-zinc-800 p-4 rounded-lg shadow min-h-[100px]">
          {loadingResponses ? (
            <p className="text-zinc-400 italic">Memuat respon aktif...</p>
          ) : errorResponses ? (
            <p className="text-red-400">Error: {errorResponses}</p>
          ) : activeResponses.length === 0 ? (
            <p className="text-zinc-400">Belum ada respon bencana yang aktif.</p>
          ) : (
            <ul className="space-y-4">
              {activeResponses.map((response) => (
                <li key={response.id} className="bg-zinc-700/50 p-4 rounded border border-zinc-700 group">
                  <div className="flex justify-between items-start gap-4">
                    {/* Button now correctly uses the updated handleViewDetails */}
                    <button
                      onClick={() => handleViewDetails(response.id)}
                      className="text-left flex-grow hover:bg-zinc-700/60 p-2 -m-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800"
                      aria-label={`Lihat detail untuk ${response.name}`}
                    >
                      <h4 className="font-semibold text-zinc-100 text-lg mb-1">{response.name}</h4>
                      <p className="text-sm text-zinc-300 mb-1">
                        Jenis: <span className="font-medium">{response.disaster_types?.join(', ') || '-'}</span>
                      </p>
                      <p className="text-sm text-zinc-300 mb-1">
                        Tanggal Mulai: <span className="font-medium">{response.start_date ? new Date(response.start_date).toLocaleDateString('id-ID') : '-'}</span>
                      </p>
                      <p className="text-sm text-zinc-400 mb-1 line-clamp-2">
                        Lokasi: {response.location || response.parsed_address?.display_name || '-'}
                      </p>
                    </button>

                    {/* Action Buttons Area */}
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 mt-1">
                      {/* Existing Edit/Delete Buttons */}
                      <button
                        onClick={() => handleEditResponse(response.id)}
                        className="text-xs px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        aria-label={`Edit ${response.name}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteResponse(response.id)}
                        className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label={`Hapus ${response.name}`}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Section 3: Finished Responses List */}
      <section>
        <h3 className="text-xl font-semibold mb-4 text-zinc-200">Respon Selesai</h3>
        <div className="bg-zinc-800 p-4 rounded-lg shadow min-h-[100px]">
          {/* Use main loading state for initial load */}
          {loadingResponses && activeResponses.length === 0 && finishedResponses.length === 0 ? (
            <p className="text-zinc-400 italic">Memuat daftar respon...</p>
          ) : errorResponses ? (
            <p className="text-red-400">Error memuat respon: {errorResponses}</p>
          ) : finishedResponses.length === 0 ? (
            <p className="text-zinc-400">Belum ada respon bencana yang diselesaikan.</p>
          ) : (
            <ul className="space-y-4">
              {finishedResponses.map((response) => (
                <li key={response.id} className="bg-zinc-700/50 p-4 rounded border border-zinc-700 group opacity-80">
                  <div className="flex justify-between items-start gap-4">
                    {/* Response Details (Read-only view essentially) */}
                    <div className="flex-grow">
                       <h4 className="font-semibold text-zinc-300 text-lg mb-1">{response.name}</h4>
                       <p className="text-sm text-zinc-400 mb-1">
                         Jenis: <span className="font-medium">{response.disaster_types?.join(', ') || '-'}</span>
                       </p>
                       <p className="text-sm text-zinc-400 mb-1">
                         Tanggal Mulai: <span className="font-medium">{response.start_date ? new Date(response.start_date).toLocaleDateString('id-ID') : '-'}</span>
                       </p>
                        <p className="text-sm text-zinc-500 mb-1 line-clamp-2">
                          Lokasi: {response.location || response.parsed_address?.display_name || '-'}
                        </p>
                    </div>
                    {/* Action Buttons Area */}
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 mt-1">
                       {/* View Details Button */}
                       <button
                          onClick={() => handleViewDetails(response.id)}
                          className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label={`Lihat detail ${response.name}`}
                       >
                         Lihat Detail
                       </button>
                       {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteResponse(response.id)} // Reuse delete handler
                        className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-800 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-600"
                        aria-label={`Hapus permanen ${response.name}`}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

    </div>
  );
} 