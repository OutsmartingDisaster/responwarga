'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import Sidebar from './components/sidebar/Sidebar';
import DashboardHeader from './components/header/DashboardHeader';
import DashboardContent from './components/dashboard/DashboardContent';
import OperationsManager from './operations';
import MyOperationsManager from './my-operations';
import AssignmentsManager from './assignments';
import ProfileSettings from './components/settings/ProfileSettings';
import DailyLog from './DailyLog';
import { useDashboardData } from './hooks/useDashboardData';

export default function DisasterResponseDashboard() {
  const {
    api, profile, setProfile, organization, activeResponses,
    finishedResponses, myAssignments, loading, currentLocation,
    fetchMyAssignments, getTaskForAssignment
  } = useDashboardData();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOffline, setIsOffline] = useState(false);
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const mapCenter = useMemo<[number, number]>(() => {
    if (currentLocation) return [currentLocation.lng, currentLocation.lat];
    if (organization?.longitude && organization?.latitude) {
      return [organization.longitude, organization.latitude];
    }
    return [106.7890, -6.1234];
  }, [currentLocation, organization]);

  const toggleSOS = () => {
    if (isSOSActive) {
      setIsSOSActive(false);
    } else if (window.confirm("AKTIFKAN SOS?")) {
      setIsSOSActive(true);
      toast.error("SOS ACTIVATED!");
    }
  };

  const handleAcceptTask = async (id: string) => {
    try {
      const { error } = await api.from('assignments')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Tugas diterima!');
      if (profile?.id) fetchMyAssignments(profile.id);
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    }
  };

  const handleStartTask = async (id: string) => {
    try {
      const { error } = await api.from('assignments').update({ status: 'in_progress' }).eq('id', id);
      if (error) throw error;
      toast.success('Tugas dimulai!');
      if (profile?.id) fetchMyAssignments(profile.id);
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    }
  };

  const handleCompleteTask = async (id: string) => {
    try {
      const { error } = await api.from('assignments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Tugas selesai!');
      if (profile?.id) fetchMyAssignments(profile.id);
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!profile?.id) return;
    try {
      const { error } = await api.from('profiles').update({ status }).eq('id', profile.id);
      if (error) throw error;
      setProfile({ ...profile, status });
      toast.success('Status: ' + (status === 'on_duty' ? 'On Duty' : 'Off Duty'));
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-300 overflow-hidden">
      <Toaster position="top-right" />
      <Sidebar
        collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed}
        activeTab={activeTab} setActiveTab={setActiveTab}
        organizationName={organization?.name} organizationLogo={organization?.logo_url}
        isOffline={isOffline} setIsOffline={setIsOffline} userRole={profile?.role}
      />
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-96 blur-[120px] pointer-events-none bg-orange-600/10" />
        <DashboardHeader
          activeTab={activeTab} profile={profile} currentTime={currentTime}
          currentLocation={currentLocation} isOffline={isOffline}
          pendingAssignments={myAssignments.filter(a => a.status === 'assigned').length}
          onUpdateStatus={handleUpdateStatus}
        />
        <div className="flex-1 overflow-y-auto px-8 z-10">
          {activeTab === 'dashboard' && (
            <DashboardContent
              myAssignments={myAssignments} activeResponses={activeResponses}
              finishedResponses={finishedResponses} mapCenter={mapCenter}
              currentLocation={currentLocation} isOffline={isOffline}
              isSOSActive={isSOSActive} onToggleSOS={toggleSOS}
              onAcceptTask={handleAcceptTask} onStartTask={handleStartTask}
              onCompleteTask={handleCompleteTask} getTaskForAssignment={getTaskForAssignment}
            />
          )}
          {activeTab === 'operations' && <OperationsManager />}
          {activeTab === 'my-operations' && <MyOperationsManager />}
          {activeTab === 'assignments' && <AssignmentsManager />}
          {activeTab === 'settings' && <ProfileSettings profile={profile} onUpdate={setProfile} />}
          {activeTab === 'log' && <DailyLog />}
        </div>
      </main>
    </div>
  );
}
