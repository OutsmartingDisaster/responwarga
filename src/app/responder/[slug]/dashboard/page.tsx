"use client";
import React, { useState, useEffect, useCallback } from "react"; // Add React import
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useSupabase } from "@/contexts/SupabaseClientProvider"; // Import the hook
import dynamic from 'next/dynamic'; // Import dynamic
import Link from 'next/link'; // <-- Add Link import
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
import { Users, Settings, DatabaseZap, ClipboardList } from 'lucide-react'; // Import additional icons

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
];

// --- ADD Admin Menu Items --- 
const ADMIN_MENU = [
  {
    key: "data_respon",
    label: "Manajemen Respon",
    icon: <DatabaseZap className="w-5 h-5 mr-2" />,
  },
  {
    key: "pengaturan_org",
    label: "Pengaturan",
    icon: <Settings className="w-5 h-5 mr-2" />,
  },
  // Add other admin-specific menu items here if needed
];
// --- END Admin Menu Items --- 

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

export default function ResponderDashboardPage() {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [selectedReport, setSelectedReport] = useState<EmergencyReportWithAssignments | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]); // Use OrgMember type for state
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const supabase = useSupabase();
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [errorMembers, setErrorMembers] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Logout function
  const handleLogout = async () => {
    if (!supabase) {
        console.error('Supabase client not available for logout');
        return;
    }
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
      // ... (Keep existing fetchMembers logic) ...
    }

    async function initializeDashboard() {
      console.log(">>> [Main Dashboard] Initializing...");
      if (!supabase) {
        console.log(">>> [Main Dashboard] Supabase client not ready yet, skipping init.");
        return; 
      }
      
      // --- REMOVE DELAY --- 
      // console.log(">>> [Main Dashboard] Waiting 100ms before fetching user...");
      // await new Promise(resolve => setTimeout(resolve, 100)); 
      // --- END DELAY --- 

      setLoadingPage(true);
      setPageError(null);
      setCurrentUserRole(null); 

      try {
        // Now fetch user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log(">>> [Main Dashboard] Got User:", { email: user?.email, id: user?.id, error: userError?.message });
        
        if (userError) throw new Error(`User fetch error: ${userError.message}`);
        if (!user) {
          console.warn(">>> [Main Dashboard] No authenticated user found after delay.");
          router.replace('/masuk'); 
          return; 
        }
        setUserId(user.id);

        // Fetch organization by slug first
        console.log(">>> [Main Dashboard] Fetching Org by slug:", slug);
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("id, name, onboarding_complete")
          .eq("slug", slug)
          .single();

        if (orgError || !orgData) {
          console.error(">>> [Main Dashboard] Organization not found or error:", orgError?.message || 'Not Found');
          throw new Error(orgError?.message || 'Organisasi tidak ditemukan.');
        }
        setOrgId(orgData.id);
        setOrgName(orgData.name);
        console.log(">>> [Main Dashboard] Fetched Org Details:", { id: orgData.id, name: orgData.name });

        // Fetch user profile including role and check membership
        console.log(">>> [Main Dashboard] Fetching Profile for user:", user.id);
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("organization_id, role")
          .eq("user_id", user.id)
          .single();
        console.log(">>> [Main Dashboard] Got Profile:", { role: profile?.role, profileOrgId: profile?.organization_id, error: profileError?.message });

        if (profileError) {
            console.error(">>> [Main Dashboard] Profile fetch error:", profileError.message);
            throw new Error(`Gagal memuat profil pengguna: ${profileError.message}`);
        }
        if (!profile) {
             console.error(">>> [Main Dashboard] Profile not found for user:", user.id);
             throw new Error('Profil pengguna tidak ditemukan.');
        }

        setCurrentUserRole(profile.role || null); // Set the role state
        console.log(">>> [Main Dashboard] SET User Role State:", profile.role || null);

        // Access control: Check if user belongs to this org or is admin
        const isSuperAdmin = profile.role === "admin"; // Simplified admin check
        if (!isSuperAdmin && profile.organization_id !== orgData.id) {
          console.error(`>>> [Main Dashboard] Access Denied: User ${user.id} (org ${profile.organization_id}) does not belong to Org ${orgData.id}`);
          throw new Error('Anda tidak memiliki akses ke organisasi ini.');
        }

        // Check onboarding status (use profile.role)
        if (profile.role === 'org_admin' && !orgData.onboarding_complete) {
          console.log(">>> [Main Dashboard] Redirecting org_admin to onboarding");
          router.replace('/onboarding/organization');
          return; // Stop further execution if redirecting
        }

        // Fetch members only after orgId is confirmed and access is granted
        console.log(">>> [Main Dashboard] Proceeding to fetch members for org:", orgData.id);
        await fetchMembers(orgData.id); // Call fetchMembers here

      } catch (err: any) {
        console.error('>>> [Main Dashboard] Error during initialization:', err);
        setPageError(err.message);
      } finally {
        console.log(">>> [Main Dashboard] Initialization finished.");
        setLoadingPage(false);
      }
    }

    if (slug) {
      if (supabase) {
        initializeDashboard();
      } else {
        console.log(">>> [Main Dashboard] Waiting for Supabase client...");
      }
    } else {
      console.error(">>> [Main Dashboard] Slug is missing!");
      setPageError("Parameter organisasi (slug) tidak ditemukan di URL.");
      setLoadingPage(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, supabase, router]); // Dependencies

  // Update activeMenu based on searchParams
  useEffect(() => {
     const menuParam = searchParams.get('menu');
     // Set default to 'dashboard' if no menu param or invalid
     const validMenus = [...BASE_MENU, ...ADMIN_MENU].map(m => m.key);
     if (menuParam && validMenus.includes(menuParam)) {
        setActiveMenu(menuParam);
     } else {
        // Check if the default 'dashboard' is valid before setting
        if (validMenus.includes('dashboard')) {
           setActiveMenu('dashboard');
        } else if (validMenus.length > 0) {
           // Fallback to the first available menu item if 'dashboard' isn't available (edge case)
           setActiveMenu(validMenus[0]);
        }
     }
  }, [searchParams]);

  // Build menu based on role
  const isAdminOrOrgAdmin = currentUserRole === 'admin' || currentUserRole === 'org_admin';
  const isOrgAdmin = currentUserRole === 'org_admin'; // Specific check for org_admin only features

  // --- Combine Menus Based on Role --- 
  let visibleMenu = [...BASE_MENU];
  // Ensure base menu doesn't contain admin keys initially
  visibleMenu = visibleMenu.filter(item => !ADMIN_MENU.some(adminItem => adminItem.key === item.key));

  if (isOrgAdmin) {
    // Get all defined admin menus (Manajemen Respon, Pengaturan)
    const adminMenusToAdd = [...ADMIN_MENU]; 
    const manajemenResponMenu = ADMIN_MENU.find(item => item.key === 'data_respon'); // Get the specific menu
    const pengaturanMenu = ADMIN_MENU.find(item => item.key === 'pengaturan_org');
    
    // Remove them from the temporary list to avoid duplication when appending later
    const otherAdminMenus = adminMenusToAdd.filter(item => item.key !== 'data_respon' && item.key !== 'pengaturan_org');
    
    if (manajemenResponMenu) {
      // Insert 'Manajemen Respon' after 'Dasbor' (index 1)
      visibleMenu.splice(1, 0, manajemenResponMenu);
    }

    // Append Pengaturan and any other remaining admin menus
    if (pengaturanMenu) {
        visibleMenu.push(pengaturanMenu);
    }
    visibleMenu = [...visibleMenu, ...otherAdminMenus]; // Append any others

    // Filter out 'responder_profile' if it exists in BASE_MENU, as it's moved to tabs
    visibleMenu = visibleMenu.filter(item => item.key !== 'responder_profile');
  }

  // --- END Combine Menus --- 

  console.log(">>> [Main Dashboard] RENDER CHECK - Role:", currentUserRole, "Is Org Admin:", currentUserRole === 'org_admin');

  if (loadingPage) {
     return <div className="flex h-screen w-full items-center justify-center bg-zinc-900 text-zinc-400">Memuat dasbor...</div>;
  }

  if (pageError) {
     return <div className="flex h-screen w-full items-center justify-center bg-zinc-900 text-red-400">Error: {pageError}</div>;
  }

  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-800 p-4 flex flex-col">
         {/* ... Org Name/Logo ... */} 
         <h1 className="text-xl font-bold mb-6">{orgName || slug}</h1> 
         <nav className="flex-grow space-y-2">
           {visibleMenu.map((item) => (
              <Link
                key={item.key}
                href={`/responder/${slug}/dashboard?menu=${item.key}`}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded ${
                  activeMenu === item.key
                    ? "bg-blue-600 text-white"
                    : "hover:bg-zinc-700 text-zinc-300"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
         </nav>
         {/* ... Bottom Links (Profile, Logout) ... */}
         <div className="mt-auto space-y-2">
             {/* Profil Saya link removed from here, moved to Pengaturan tabs */}
             <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded hover:bg-zinc-700 text-zinc-300"
             >
                <LogOut className="h-5 w-5" /> {/* Use imported Icon */}
                Keluar
             </button>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
         {/* Render content based on activeMenu - Use currentUserRole for checks */}
         {activeMenu === 'dashboard' && <DashboardOverview orgId={orgId} />}
         {activeMenu === 'emergency' && <EmergencyReportsTable />}
         {activeMenu === 'contribution' && <ContributionsTable />}
         {activeMenu === 'spreadsheets' && <SpreadsheetManager />}
         {/* Admin/Org Admin Views - Use correct keys and components */} 
         {activeMenu === 'data_respon' && isOrgAdmin && <DisasterResponseDashboard />}
         {activeMenu === 'pengaturan_org' && isOrgAdmin && <OrganizationProfile />}
         {/* Add other views here */}
      </main>
    </div>
  );
}

// --- Add Placeholder Definitions --- 
const DashboardOverview = ({ orgId }: { orgId: string | null }) => <div>Konten Dasbor Utama {orgId && `(Org: ${orgId})`}</div>;
// Remove UserProfile placeholder if ResponderProfile is used
// const UserProfile = () => <div>Konten Profil Pengguna</div>; 
// Ensure other components like ContributionsTable, ResponderManagement, etc. are imported or defined elsewhere
// ... (Keep any other existing placeholders/imports) ...
