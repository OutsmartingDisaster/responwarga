'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createApiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';

export function useDashboardData() {
  const api = useMemo(() => createApiClient(), []);
  
  const [orgId, setOrgId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [activeResponses, setActiveResponses] = useState<any[]>([]);
  const [finishedResponses, setFinishedResponses] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const locationWatchRef = useRef<number | null>(null);

  const fetchActiveResponses = useCallback(async (currentOrgId: string) => {
    if (!currentOrgId) return;
    try {
      const { data, error } = await api
        .from('disaster_responses')
        .select('*')
        .eq('organization_id', currentOrgId)
        .eq('status', 'active')
        .order('start_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      setActiveResponses(data || []);
    } catch (err: any) {
      console.error("Error fetching active responses:", err);
    }
  }, [api]);

  const fetchFinishedResponses = useCallback(async (currentOrgId: string) => {
    if (!currentOrgId) return;
    try {
      const { data, error } = await api
        .from('disaster_responses')
        .select('*')
        .eq('organization_id', currentOrgId)
        .eq('status', 'finished')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setFinishedResponses(data || []);
    } catch (err: any) {
      console.error("Error fetching finished responses:", err);
    }
  }, [api]);

  const fetchMyAssignments = useCallback(async (profileId: string) => {
    try {
      const { data, error } = await api
        .from('assignments')
        .select('*')
        .eq('responder_id', profileId)
        .in('status', ['assigned', 'accepted', 'in_progress'])
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      setMyAssignments(data || []);
    } catch (err: any) {
      console.error("Error fetching assignments:", err);
    }
  }, [api]);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const user = (await api.auth.getUser()).data.user;
        if (!user) return;

        const { data: profileData } = await api
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!profileData?.organization_id) return;
        setProfile(profileData);
        setOrgId(profileData.organization_id);

        const { data: orgData } = await api
          .from('organizations')
          .select('*')
          .eq('id', profileData.organization_id)
          .single();
        setOrganization(orgData);

        await Promise.all([
          fetchActiveResponses(profileData.organization_id),
          fetchFinishedResponses(profileData.organization_id),
          fetchMyAssignments(profileData.id)
        ]);
      } catch (err: any) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api, fetchActiveResponses, fetchFinishedResponses, fetchMyAssignments]);

  // Location tracking
  useEffect(() => {
    if (!profile?.id) return;
    if ('geolocation' in navigator) {
      locationWatchRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          try {
            await api.from('profiles').update({
              latitude, longitude,
              last_location_update: new Date().toISOString()
            }).eq('id', profile.id);
          } catch (err) {
            console.error('Failed to update location:', err);
          }
        },
        (error) => console.error('Geolocation error:', error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    }
    return () => {
      if (locationWatchRef.current) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    };
  }, [api, profile?.id]);

  // Polling
  useEffect(() => {
    if (!orgId || !profile?.id) return;
    const interval = setInterval(() => {
      fetchActiveResponses(orgId);
      fetchMyAssignments(profile.id);
    }, 30000);
    return () => clearInterval(interval);
  }, [orgId, profile?.id, fetchActiveResponses, fetchMyAssignments]);

  const getTaskForAssignment = useCallback((assignment: any) => {
    if (assignment.disaster_response_id) {
      return activeResponses.find(r => r.id === assignment.disaster_response_id);
    }
    return null;
  }, [activeResponses]);

  return {
    api,
    orgId,
    profile,
    setProfile,
    organization,
    setOrganization,
    activeResponses,
    finishedResponses,
    myAssignments,
    loading,
    currentLocation,
    fetchMyAssignments,
    getTaskForAssignment
  };
}
