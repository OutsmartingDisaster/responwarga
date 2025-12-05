'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createApiClient } from '@/lib/api-client';
import Statistics from './components/Statistics';
import EmergencyReportsTable from './components/EmergencyReportsTable';
import ContributionsTable from './components/ContributionsTable';
import UsersTable from './components/UsersTable';
import ContentTable from './components/ContentTable';
import BannerEditor from './components/BannerEditor';
import AboutEditor from './components/AboutEditor';
import UserPolicyEditor from './components/UserPolicyEditor';
import SpreadsheetManager from './components/SpreadsheetManager';
import OrganizationManager from './components/OrganizationManager';
import CrowdsourcingManager from './components/CrowdsourcingManager';
import HomepageModalEditor from './components/HomepageModalEditor';
import LiveIncidentRoom from './components/LiveIncidentRoom';
import DataExports from './components/DataExports';
import ApiKeyManager from './components/ApiKeyManager';
import GlobalSituation from './components/GlobalSituation';
import OrgHealthCards from './components/OrgHealthCards';
import OrthophotoManager from './components/OrthophotoManager';
import AuditLog from './components/AuditLog';
import ResponseOperationsTab from './components/ResponseOperationsTab';
import OperationDetailModal from './components/OperationDetailModal';

type ActiveTab = 'dashboard' | 'situation' | 'org_health' | 'incidents' | 'operations' | 'emergency' | 'contribution' | 'crowdsourcing' | 'spreadsheet' | 'users' | 'organizations' | 'orthophotos' | 'exports' | 'api_keys' | 'audit_log' | 'content' | 'banner' | 'about' | 'policy' | 'homepage_modal';

export default function AdminDashboard() {
  const router = useRouter();
  const api = createApiClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  
  useEffect(() => {
    checkSession();
  }, [router]);

    const checkSession = async () => {
    try {
      const { data: { session }, error: sessionError } = await api.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        router.push('/mohonijin');
        return;
      }
      
      const { data: profileData, error: profileError } = await api
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Dashboard profile fetch error:', profileError);
        throw profileError;
      }

      if (profileData?.role !== 'admin' && profileData?.role !== 'super_admin') {
        await api.auth.signOut();
        router.push('/mohonijin');
        return;
      }
      
      setUser(session.user);
      setLoading(false);
    } catch (error: any) {
      console.error('Session check error in Dashboard:', error);
      if (error && typeof error === 'object') {
        console.error('Error Details:', JSON.stringify(error));
      }
      try {
        await api.auth.signOut();
      } catch (signOutError) {
        console.error('Error signing out during session check failure:', signOutError);
      }
      router.push('/mohonijin');
    }
  };
  
  const handleSignOut = async () => {
    try {
      await api.auth.signOut();
      // Also call the logout API to clear server-side session
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      // Force hard navigation to clear any cached state
      window.location.href = '/mohonijin';
    } catch (err) {
      console.error('Sign out error:', err);
      window.location.href = '/mohonijin';
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-zinc-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-zinc-800 border-r border-zinc-700 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-700">
          <div className="flex items-center space-x-2 text-zinc-900 flex-none">
            <img src="/icons/response.svg" alt="Logo" className="w-8 h-8" />
            <span className="ml-2 text-xl font-semibold text-white">Admin Panel</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-zinc-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="mt-4 px-2">
          <div className="space-y-1">
            {(
              [
                { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                { id: 'situation', label: 'Global Situation', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                { id: 'org_health', label: 'Org Health', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
                { id: 'incidents', label: 'Live Incidents', icon: 'M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z' },
                { id: 'operations', label: 'Response Operations', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                { id: 'emergency', label: 'Emergency Reports', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
                { id: 'contribution', label: 'Contributions', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
                { id: 'crowdsourcing', label: 'Crowdsourcing', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z' },
                { id: 'spreadsheet', label: 'Spreadsheets', icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z' },
                { id: 'users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
                { id: 'organizations', label: 'Organizations', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
                { id: 'orthophotos', label: 'Orthophotos', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
                { id: 'exports', label: 'Data Exports', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
                { id: 'api_keys', label: 'API Keys', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
                { id: 'audit_log', label: 'Audit Log', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
                { id: 'content', label: 'Content', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' },
                { id: 'banner', label: 'Banner', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
                { id: 'about', label: 'About', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                { id: 'policy', label: 'User Policy', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                { id: 'homepage_modal', label: 'Lock Website', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' }
              ] as Array<{ id: ActiveTab; label: string; icon: string }>
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === item.id 
                    ? 'bg-zinc-700 text-white' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-6 bg-zinc-800 border-b border-zinc-700">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-zinc-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center">
            <span className="text-white">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="ml-4 px-3 py-1 text-sm text-zinc-400 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-zinc-900 p-6">
          <div className="max-w-7xl mx-auto">
        {activeTab === 'dashboard' && <Statistics />}
            {activeTab === 'situation' && <GlobalSituation />}
            {activeTab === 'org_health' && <OrgHealthCards />}
            {activeTab === 'incidents' && <LiveIncidentRoom />}
            {activeTab === 'operations' && <ResponseOperationsTab onViewDetail={(id) => setSelectedOperationId(id)} />}
            {activeTab === 'emergency' && <EmergencyReportsTable />}
            {activeTab === 'contribution' && <ContributionsTable />}
            {activeTab === 'crowdsourcing' && <CrowdsourcingManager />}
        {activeTab === 'spreadsheet' && <SpreadsheetManager />}
            {activeTab === 'users' && <UsersTable />}
            {activeTab === 'organizations' && <OrganizationManager />}
            {activeTab === 'orthophotos' && <OrthophotoManager />}
            {activeTab === 'exports' && <DataExports />}
            {activeTab === 'api_keys' && <ApiKeyManager />}
            {activeTab === 'audit_log' && <AuditLog />}
            {activeTab === 'content' && <ContentTable />}
        {activeTab === 'banner' && <BannerEditor />}
        {activeTab === 'about' && <AboutEditor />}
        {activeTab === 'policy' && <UserPolicyEditor />}
        {activeTab === 'homepage_modal' && <HomepageModalEditor />}
          </div>
          
          {/* Operation Detail Modal */}
          {selectedOperationId && (
            <OperationDetailModal
              operationId={selectedOperationId}
              onClose={() => setSelectedOperationId(null)}
            />
          )}
      </main>
      </div>
    </div>
  );
}
