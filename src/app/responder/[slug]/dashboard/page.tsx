"use client";
import React, { useState, useEffect } from "react"; // Add React import
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client"; // Correct relative path
import dynamic from 'next/dynamic'; // Import dynamic
// import Map from "../../../components/Map"; // Remove static import
import EmergencyReportsTable from "../../../mohonijin/dashboard/components/EmergencyReportsTable";
import EmergencyEventDetails from "./EmergencyEventDetails";
import ContributionsTable from "../../../mohonijin/dashboard/components/ContributionsTable";
import SpreadsheetManager from "../../../mohonijin/dashboard/components/SpreadsheetManager";
import UsersTable from "../../../mohonijin/dashboard/components/UsersTable";

import OrganizationProfile from "../../../responder/dashboard/OrganizationProfile";
import ResponderProfile from "../../../responder/dashboard/ResponderProfile";
import ResponderManagement from "../../../responder/dashboard/ResponderManagement";
import DailyLog from "../../../responder/dashboard/DailyLog";
import DisasterResponseDashboard from "./DisasterResponseDashboard"; // Import the new component
import { LogOut } from 'lucide-react'; // Import an icon for logout

// Dynamically import the Map component
const Map = dynamic(() => import("../../../components/Map"), { 
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center bg-zinc-800 text-zinc-400">Memuat peta...</div> 
});

const BASE_MENU = [
  {
    key: "dashboard",
    label: "Dasbor",
    icon: (
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m4-8v8m5 0a2 2 0 002-2V7a2 2 0 00-2-2h-3.5" />
      </svg>
    ),
  },
  {
    key: "emergency",
    label: "Laporan Darurat",
    icon: (
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.918-.816 1.995-1.85l.007-.15V7c0-1.054-.816-1.918-1.85-1.995L18 5H6c-1.054 0-1.918.816-1.995 1.85L4 7v10c0 1.054.816 1.918 1.85 1.995L6 19z" />
      </svg>
    ),
  },
  {
    key: "contribution",
    label: "Kontribusi",
    icon: (
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    key: "spreadsheets",
    label: "Spreadsheet",
    icon: (
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
      </svg>
    ),
  },
  {
    key: "responder_profile",
    label: "Profil Saya",
    icon: (
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z" />
      </svg>
    ),
  },
];

// Define member type
type OrgMember = {
  id: string; // Assuming user_id (uuid) is used as the ID here
  name: string;
  role: string;
};

interface EmergencyReport {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  address: string;
  description: string;
  assistance_type: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  status: 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan';
  assigned_to?: string;
  responder_status?: 'diterima' | 'sedang_berjalan' | 'selesai' | 'batal' | null;
  created_at: string;
  disaster_response_id?: string | null; // Added link to disaster response
}

type AssignedMember = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type ActivityLogEntry = {
  id: string;
  timestamp: string;
  action: string;
  by: string;
  notes?: string;
};

type EmergencyReportWithAssignments = EmergencyReport & {
  assignedMembers: AssignedMember[];
  activityLog: ActivityLogEntry[];
  disaster_response_id?: string | null; // Ensure this is included
};

export default function ResponderDashboard() {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [selectedReport, setSelectedReport] = useState<EmergencyReportWithAssignments | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]); // Use OrgMember type for state
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [errorMembers, setErrorMembers] = useState<string | null>(null);

  // Logout function
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
      // Optionally show a toast notification for error
    } else {
      // Redirect to home/login page after successful logout
      router.push('/'); // Or '/masuk'
    }
  };

  useEffect(() => {
    async function fetchMembers(orgIdToUse: string) {
      setLoadingMembers(true);
      setErrorMembers(null);
      console.log('Fetching members from PROFILES for orgId:', orgIdToUse);

      // Query PROFILES table instead of MEMBERS
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, role') // Select needed fields directly
        .eq('organization_id', orgIdToUse)
        .in('role', ['responder', 'org_admin']); // Filter by relevant roles

      console.log('fetchMembers (from profiles) response:', { data, error });

      if (error) {
        console.error('Error fetching members from profiles for orgId:', orgIdToUse, error);
        setErrorMembers('Gagal memuat anggota: ' + error.message);
      } else if (data) {
        // Map fetched data to OrgMember type
        const fetchedMembers: OrgMember[] = data.map((profile: any) => ({
          id: profile.user_id,
          name: profile.name || 'Unknown Name', // Use name from profile
          role: profile.role || 'Unknown Role',
        }));
        setMembers(fetchedMembers);
      } else {
         setMembers([]); // Set to empty array if no data
      }
      setLoadingMembers(false);
    }

    async function checkOrg() {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      setUserId(user.id);

      // Fetch organization by slug
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, onboarding_complete") // Fetch onboarding status
        .eq("slug", slug)
        .single();

      if (orgError || !orgData) {
        console.error("Organization not found or error:", orgError || {}); // Log error or empty object
        // Consider redirecting to a more specific error page or showing a message
        router.replace("/");
        return;
      }
      setOrgId(orgData.id);
      setOrgName(orgData.name);

      // Fetch user profile and check role/membership
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, role")
        .eq("user_id", user.id) // Use user_id (uuid)
        .single();

      if (profile?.role === "org_admin" && !profile.organization_id) {
        router.replace("/onboarding/organization");
        return;
      }
      setRole(profile?.role || null);

      // Access control: Check if user belongs to this org or is admin
      const isSuperAdmin = userId === "1" || profile?.role === "admin";
      if (!isSuperAdmin && profile?.organization_id !== orgData.id) {
        console.error("Access denied: User does not belong to this organization.");
        router.replace("/"); // Redirect if not authorized
        return;
      }

      // Check if onboarding is complete for org_admin
      if (profile?.role === 'org_admin' && !orgData.onboarding_complete) {
        router.replace('/onboarding/organization');
        return;
      }

      // Fetch members after orgId is set
      if (orgData.id) {
        setOrgId(orgData.id);
        fetchMembers(orgData.id);
      }
    }
    if (slug) {
      checkOrg();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, supabase, router]); // Add dependencies

  // Build menu based on role or admin id
  let menu = [...BASE_MENU];
  const isSuperAdmin = userId === "1" || role === "admin";
  const isAdminOrOrgAdmin = role === "org_admin" || isSuperAdmin;

  if (isAdminOrOrgAdmin) {
    // Insert Response Management menu item
    menu.splice(1, 0, {
      key: "response_management",
      label: "Manajemen Respon",
      icon: (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /> {/* Example icon (lightning bolt) */}
        </svg>
      ),
    });

    menu.splice(3, 0, {
      key: "organization_profile",
      label: "Profil Organisasi",
      icon: (
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    });
  }
  // Remove "My Profile" tab for org_admins and organization members
  if (role !== "org_admin" && !isSuperAdmin) {
    if (!menu.some(item => item.key === "responder_profile")) {
      menu.push({
        key: "responder_profile",
        label: "Profil Saya",
        icon: (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z" />
          </svg>
        ),
      });
    }
  }

  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 text-zinc-100 flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-zinc-800">
          {orgName || "Dasbor Responder"}
        </div>
        <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
          {menu.map((item) => (
            <button
              key={item.key}
              className={`flex items-center px-4 py-2 rounded transition-all text-sm ${
                activeMenu === item.key
                  ? "bg-zinc-800 text-zinc-100 font-semibold"
                  : "hover:bg-zinc-800 text-zinc-400"
              }`}
              onClick={() => setActiveMenu(item.key)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        {/* Logout Button Section */}
        <div className="p-4 border-t border-zinc-800 mt-auto">
           <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 rounded transition-all text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Keluar
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-zinc-900 text-zinc-100">
        {/* Top bar */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
          <h1 className="text-xl font-bold">
            {
              {
                dashboard: "Dasbor",
                response_management: "Manajemen Respon",
                daily_log: "Log Harian",
                organization_profile: "Profil Organisasi",
                responder_management: "Manajemen Tim",
                emergency: "Laporan Darurat",
                contribution: "Kontribusi",
                spreadsheets: "Spreadsheet",
                users: "Pengguna",
                responder_profile: "Profil Saya",
              }[activeMenu]
            }
          </h1>
        </div>
        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto p-4">
          {activeMenu === "dashboard" && (
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0">
                <Map />
              </div>
              {/* Placeholder for stats/summary */}
              <div className="p-4 bg-zinc-900 border-t border-zinc-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-zinc-800 rounded shadow">
                    <div className="text-zinc-400 text-sm">Darurat Aktif</div>
                    {/* TODO: Replace with real data */}
                    <div className="text-2xl font-bold">-</div>
                  </div>
                  <div className="p-4 bg-zinc-800 rounded shadow">
                    <div className="text-zinc-400 text-sm">Kontribusi Aktif</div>
                    <div className="text-2xl font-bold">-</div>
                  </div>
                  <div className="p-4 bg-zinc-800 rounded shadow">
                    <div className="text-zinc-400 text-sm">Ditugaskan ke Saya</div>
                    <div className="text-2xl font-bold">-</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeMenu === "response_management" && isAdminOrOrgAdmin && (
            <DisasterResponseDashboard />
          )}
          {activeMenu === "daily_log" && (
            <div className="p-4">
              <DailyLog />
            </div>
          )}
          {activeMenu === "emergency" && (
            <div className="p-4">
              {selectedReport ? (
                <div>
                  <button
                    className="mb-4 px-3 py-1 bg-zinc-700 text-white rounded"
                    onClick={() => setSelectedReport(null)}
                  >
                    Kembali ke Daftar
                  </button>
                  <EmergencyEventDetails
                    orgId={orgId || ""}
                    event={{
                      id: String(selectedReport.id),
                      name: selectedReport.full_name,
                      type: selectedReport.assistance_type,
                      date: selectedReport.created_at,
                      impactedAreas: [selectedReport.address],
                      location: `${selectedReport.latitude}, ${selectedReport.longitude}`,
                      severity: "-",
                      status: selectedReport.status,
                      description: selectedReport.description,
                      reportedBy: selectedReport.email,
                      resourcesNeeded: [],
                      attachments: selectedReport.photo_url ? [selectedReport.photo_url] : [],
                      assignedMembers: selectedReport.assignedMembers || [],
                      activityLog: selectedReport.activityLog || [], // Pass fetched logs
                    }}
                    onAssignMember={async (memberId: string) => {
                      if (!selectedReport?.disaster_response_id) {
                        console.error("Cannot assign member: Disaster Response ID is missing for this report.");
                        // TODO: Add user feedback (e.g., toast notification)
                        return;
                      }
                      const supabase = createClient();
                      // Explicitly type 'm' in the find callback
                      const member = members.find((m: OrgMember) => m.id === memberId);
                      const memberName = member?.name || memberId;

                      // Assign member to event in DB (team_assignments table)
                      // Note: team_assignments uses emergency_report_id (event_id)
                      await supabase
                        .from("team_assignments")
                        .insert([
                          {
                            emergency_report_id: selectedReport.id, // Use correct FK name
                            member_id: memberId,
                            assigned_at: new Date().toISOString(),
                            status: "assigned",
                            // organization_id: orgId, // Consider adding if needed for RLS
                          },
                        ]);

                      // Log assignment in activity_logs table using disaster_response_id
                      await supabase
                        .from("activity_logs") // Correct table name
                        .insert([
                          {
                            disaster_response_id: selectedReport.disaster_response_id, // Use correct FK
                            what: `Assigned member: ${memberName}`, // Use 'what' field
                            when_time: new Date().toISOString(), // Use 'when_time'
                            responder_id: userId, // Log who performed the action
                            notes: `Member ID: ${memberId}`, // Additional details in notes
                            // where_location, why, how can be added if relevant context is available
                          },
                        ]);

                      // Fetch updated activity log using disaster_response_id
                      const { data: logData } = await supabase
                        .from("activity_logs") // Correct table name
                        .select("id, when_time, what, responder_id, notes") // Adjust selected columns
                        .eq("disaster_response_id", selectedReport.disaster_response_id) // Use correct FK
                        .order("when_time", { ascending: false }); // Order by correct timestamp column

                      // Map fetched data to ActivityLogEntry format expected by component
                      const formattedLogs: ActivityLogEntry[] = (logData || []).map((log: any) => ({
                        id: log.id,
                        timestamp: log.when_time,
                        action: log.what, // Map 'what' to 'action'
                        by: log.responder_id || "System", // Map 'responder_id' to 'by'
                        notes: log.notes,
                      }));

                      // Update local state/UI
                      setSelectedReport((prev: EmergencyReportWithAssignments | null) => // Add type annotation
                        prev
                          ? {
                              ...prev,
                              assignedMembers: [
                                ...(prev.assignedMembers || []),
                                {
                                  id: memberId,
                                  name: memberName, // Use fetched/found member name
                                  role: member?.role || "responder", // Use fetched/found role
                                  status: "assigned",
                                },
                              ],
                              activityLog: formattedLogs, // Use formatted logs
                            }
                          : prev
                      );
                    }}
                    onUnassignMember={async (memberId: string) => {
                       if (!selectedReport?.disaster_response_id) {
                        console.error("Cannot unassign member: Disaster Response ID is missing for this report.");
                        // TODO: Add user feedback
                        return;
                      }
                      const supabase = createClient();
                      // Explicitly type 'm' in the find callback
                      const member = selectedReport.assignedMembers.find((m: AssignedMember) => m.id === memberId);
                      const memberName = member?.name || memberId;

                      // Remove assignment from DB (team_assignments uses emergency_report_id)
                      await supabase
                        .from("team_assignments")
                        .delete()
                        .eq("emergency_report_id", selectedReport.id) // Use correct FK name
                        .eq("member_id", memberId);

                      // Log unassignment in activity_logs table using disaster_response_id
                      await supabase
                        .from("activity_logs") // Correct table name
                        .insert([
                          {
                            disaster_response_id: selectedReport.disaster_response_id, // Use correct FK
                            what: `Unassigned member: ${memberName}`, // Use 'what' field
                            when_time: new Date().toISOString(), // Use 'when_time'
                            responder_id: userId, // Log who performed the action
                            notes: `Member ID: ${memberId}`, // Additional details in notes
                          },
                        ]);

                      // Fetch updated activity log using disaster_response_id
                      const { data: logData } = await supabase
                        .from("activity_logs") // Correct table name
                        .select("id, when_time, what, responder_id, notes") // Adjust selected columns
                        .eq("disaster_response_id", selectedReport.disaster_response_id) // Use correct FK
                        .order("when_time", { ascending: false }); // Order by correct timestamp column

                      // Map fetched data to ActivityLogEntry format
                       const formattedLogs: ActivityLogEntry[] = (logData || []).map((log: any) => ({
                        id: log.id,
                        timestamp: log.when_time,
                        action: log.what,
                        by: log.responder_id || "System",
                        notes: log.notes,
                      }));

                      // Update local state/UI
                      setSelectedReport((prev: EmergencyReportWithAssignments | null) => // Add type annotation
                        prev
                          ? {
                              ...prev,
                              // Explicitly type 'm' in the filter callback
                              assignedMembers: (prev.assignedMembers || []).filter(
                                (m: AssignedMember) => m.id !== memberId
                              ),
                              activityLog: formattedLogs, // Use formatted logs
                            }
                          : prev
                      );
                    }}
                    onUpdateEvent={() => { /* TODO: Implement if needed */ }}
                    onAddAttachment={() => {}}
                    onRemoveAttachment={() => {}}
                  />
                </div>
              ) : (
                <EmergencyReportsTable
                  responderView={false}
                  onViewDetails={async (report: EmergencyReport) => {
                    const supabase = createClient();

                    // Fetch assigned members for this event (uses emergency_report_id)
                    const { data: assignments } = await supabase
                      .from("team_assignments")
                      .select("member_id, profiles:profiles!inner(user_id, name, role)") // Use 'name', ensure profiles join is correct
                      .eq("emergency_report_id", report.id); // Use correct FK name

                    const assignedMembers: AssignedMember[] =
                      assignments?.map((a: any) => ({
                        id: a.member_id, // This should be the profile ID (integer) or user_id (uuid)? Check team_assignments schema
                        name: a.profiles?.name || "Anggota", // Use 'name'
                        role: a.profiles?.role || "responder",
                        status: "assigned", // Assuming status comes from elsewhere or defaults here
                      })) || [];

                    // Fetch activity log using disaster_response_id if it exists
                    let activityLog: ActivityLogEntry[] = [];
                    if (report.disaster_response_id) {
                      const { data: logData } = await supabase
                        .from("activity_logs") // Correct table name
                        .select("id, when_time, what, responder_id, notes") // Adjust columns
                        .eq("disaster_response_id", report.disaster_response_id) // Use correct FK
                        .order("when_time", { ascending: false }); // Order by correct timestamp

                      // Map fetched data to ActivityLogEntry format
                      activityLog = (logData || []).map((log: any) => ({
                          id: log.id,
                          timestamp: log.when_time,
                          action: log.what,
                          by: log.responder_id || "System", // TODO: Fetch profile name for responder_id if needed
                          notes: log.notes,
                        }));
                    } else {
                      console.warn(`No disaster_response_id found for emergency report ${report.id}. Activity log will be empty.`);
                    }

                    setSelectedReport({
                      ...report,
                      assignedMembers,
                      activityLog, // Pass fetched or empty logs
                    });
                  }}
                />
              )}
            </div>
          )}
          {activeMenu === "contribution" && (
            <div className="p-4">
              <ContributionsTable responderView />
            </div>
          )}
          {activeMenu === "spreadsheets" && (
            <div className="p-4">
              <SpreadsheetManager />
            </div>
          )}
          {activeMenu === "organization_profile" && isAdminOrOrgAdmin && (
            <div className="p-4">
              <OrganizationProfile />
            </div>
          )}
          {activeMenu === "responder_profile" && role !== "org_admin" && !isSuperAdmin && (
            <div className="p-4">
              <ResponderProfile />
            </div>
          )}
          {activeMenu === "responder_management" && isAdminOrOrgAdmin && (
            <div className="p-4">
              <ResponderManagement />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
