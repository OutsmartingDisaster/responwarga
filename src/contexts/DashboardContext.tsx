"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createApiClient } from '@/lib/api-client';

// Types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: 'admin' | 'org_admin' | 'org_responder';
  organization_id: string;
  status: 'active' | 'inactive' | 'on_duty' | 'off_duty';
  phone?: string;
  latitude?: number;
  longitude?: number;
  last_location_update?: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  organization_id: string;
  responder_id: string;
  emergency_report_id?: string;
  contribution_id?: string;
  disaster_response_id?: string;
  status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  assigned_at: string;
  accepted_at?: string;
  completed_at?: string;
  responder?: Profile;
}

export interface DisasterResponse {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  status: 'active' | 'finished' | 'cancelled';
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  disaster_types?: string[];
  start_date?: string;
  created_at: string;
  updated_at?: string;
}

interface DashboardContextType {
  // User & Org
  user: any;
  profile: Profile | null;
  organization: Organization | null;
  orgId: string | null;
  
  // Data
  members: Profile[];
  activeResponders: Profile[];
  assignments: Assignment[];
  activeResponses: DisasterResponse[];
  finishedResponses: DisasterResponse[];
  
  // Loading states
  loading: boolean;
  
  // Actions
  refreshData: () => Promise<void>;
  dispatchTask: (taskId: string, responderId: string, taskType: 'disaster_response' | 'emergency_report' | 'contribution', notes?: string) => Promise<boolean>;
  acceptTask: (assignmentId: string) => Promise<boolean>;
  updateTaskStatus: (assignmentId: string, status: Assignment['status']) => Promise<boolean>;
  updateResponderLocation: (latitude: number, longitude: number) => Promise<boolean>;
  updateResponderStatus: (status: Profile['status']) => Promise<boolean>;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

interface DashboardProviderProps {
  children: React.ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const api = React.useMemo(() => createApiClient(), []);
  const dataFetchedRef = useRef(false);
  
  // State
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [activeResponders, setActiveResponders] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeResponses, setActiveResponses] = useState<DisasterResponse[]>([]);
  const [finishedResponses, setFinishedResponses] = useState<DisasterResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data for the organization
  const fetchData = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await api.auth.getUser();
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setUser(currentUser);

      // Get profile with organization
      const { data: profileData } = await api
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (!profileData?.organization_id) {
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setOrgId(profileData.organization_id);

      // Get organization details
      const { data: orgData } = await api
        .from('organizations')
        .select('*')
        .eq('id', profileData.organization_id)
        .single();

      if (orgData) {
        setOrganization(orgData);
      }

      // Fetch all org members
      const { data: membersData } = await api
        .from('profiles')
        .select('*')
        .eq('organization_id', profileData.organization_id)
        .order('full_name', { ascending: true });

      setMembers(membersData || []);
      
      // Filter active responders (those with recent location updates or active status)
      const responders = (membersData || []).filter(
        (m: Profile) => m.role === 'org_responder' && (m.status === 'active' || m.status === 'on_duty')
      );
      setActiveResponders(responders);

      // Fetch assignments for this org
      const { data: assignmentsData } = await api
        .from('assignments')
        .select('*')
        .eq('organization_id', profileData.organization_id)
        .order('assigned_at', { ascending: false });

      setAssignments(assignmentsData || []);

      // Fetch active disaster responses
      const { data: activeData } = await api
        .from('disaster_responses')
        .select('*')
        .eq('organization_id', profileData.organization_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setActiveResponses(activeData || []);

      // Fetch finished responses
      const { data: finishedData } = await api
        .from('disaster_responses')
        .select('*')
        .eq('organization_id', profileData.organization_id)
        .eq('status', 'finished')
        .order('updated_at', { ascending: false })
        .limit(20);

      setFinishedResponses(finishedData || []);

    } catch (err) {
      console.error('Dashboard context fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Initial fetch
  useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;
    fetchData();
  }, [fetchData]);

  // Polling for real-time updates (every 30 seconds)
  useEffect(() => {
    if (!orgId) return;
    
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [orgId, fetchData]);

  // Dispatch a task to a responder
  const dispatchTask = useCallback(async (
    taskId: string,
    responderId: string,
    taskType: 'disaster_response' | 'emergency_report' | 'contribution',
    notes?: string
  ): Promise<boolean> => {
    if (!orgId) return false;

    try {
      const assignmentPayload: any = {
        organization_id: orgId,
        responder_id: responderId,
        status: 'assigned',
        notes: notes || null,
        assigned_at: new Date().toISOString(),
      };

      if (taskType === 'disaster_response') {
        assignmentPayload.disaster_response_id = taskId;
      } else if (taskType === 'emergency_report') {
        assignmentPayload.emergency_report_id = taskId;
      } else {
        assignmentPayload.contribution_id = taskId;
      }

      const { error } = await api.from('assignments').insert([assignmentPayload]);
      
      if (error) {
        console.error('Dispatch error:', error);
        return false;
      }

      // Refresh data after dispatch
      await fetchData();
      return true;
    } catch (err) {
      console.error('Dispatch task error:', err);
      return false;
    }
  }, [api, orgId, fetchData]);

  // Accept a task (for responders)
  const acceptTask = useCallback(async (assignmentId: string): Promise<boolean> => {
    try {
      const { error } = await api
        .from('assignments')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) {
        console.error('Accept task error:', error);
        return false;
      }

      await fetchData();
      return true;
    } catch (err) {
      console.error('Accept task error:', err);
      return false;
    }
  }, [api, fetchData]);

  // Update task status
  const updateTaskStatus = useCallback(async (
    assignmentId: string,
    status: Assignment['status']
  ): Promise<boolean> => {
    try {
      const updateData: any = { status };
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await api
        .from('assignments')
        .update(updateData)
        .eq('id', assignmentId);

      if (error) {
        console.error('Update task status error:', error);
        return false;
      }

      await fetchData();
      return true;
    } catch (err) {
      console.error('Update task status error:', err);
      return false;
    }
  }, [api, fetchData]);

  // Update responder location
  const updateResponderLocation = useCallback(async (
    latitude: number,
    longitude: number
  ): Promise<boolean> => {
    if (!profile?.id) return false;

    try {
      const { error } = await api
        .from('profiles')
        .update({
          latitude,
          longitude,
          last_location_update: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Update location error:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Update location error:', err);
      return false;
    }
  }, [api, profile]);

  // Update responder status
  const updateResponderStatus = useCallback(async (
    status: Profile['status']
  ): Promise<boolean> => {
    if (!profile?.id) return false;

    try {
      const { error } = await api
        .from('profiles')
        .update({ status })
        .eq('id', profile.id);

      if (error) {
        console.error('Update status error:', error);
        return false;
      }

      await fetchData();
      return true;
    } catch (err) {
      console.error('Update status error:', err);
      return false;
    }
  }, [api, profile, fetchData]);

  const value: DashboardContextType = {
    user,
    profile,
    organization,
    orgId,
    members,
    activeResponders,
    assignments,
    activeResponses,
    finishedResponses,
    loading,
    refreshData: fetchData,
    dispatchTask,
    acceptTask,
    updateTaskStatus,
    updateResponderLocation,
    updateResponderStatus,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export default DashboardContext;
