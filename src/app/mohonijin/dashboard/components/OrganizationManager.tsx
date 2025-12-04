'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createApiClient } from '@/lib/api-client';
import { toast, Toaster } from 'react-hot-toast';

interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  memberCount: number;
  activeResponders: number;
  activeAssignments: number;
  pendingAssignments: number;
}

export default function OrganizationManager() {
  const api = createApiClient();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [orgAssignments, setOrgAssignments] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all organizations
      const { data: orgData, error: orgError } = await api
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgError) throw new Error(`Failed to fetch organizations: ${JSON.stringify(orgError)}`);

      if (!orgData || orgData.length === 0) {
        setOrganizations([]);
        return;
      }

      // For each organization, fetch stats
      const orgsWithDetails = await Promise.all(
        orgData.map(async (org: any) => {
          // Fetch members
          const { data: membersData } = await api
            .from('profiles')
            .select('*')
            .eq('organization_id', org.id);

          const members = membersData || [];
          const activeResponders = members.filter(
            (m: any) => m.role === 'org_responder' && (m.status === 'active' || m.status === 'on_duty')
          ).length;

          // Fetch assignments
          const { data: assignmentsData } = await api
            .from('assignments')
            .select('*')
            .eq('organization_id', org.id);

          const assignments = assignmentsData || [];
          const activeAssignments = assignments.filter((a: any) => a.status === 'in_progress').length;
          const pendingAssignments = assignments.filter((a: any) => a.status === 'assigned').length;

          return {
            ...org,
            memberCount: members.length,
            activeResponders,
            activeAssignments,
            pendingAssignments,
          };
        })
      );

      setOrganizations(orgsWithDetails);
    } catch (err: any) {
      console.error('Error fetching organizations:', err);
      setError(err.message || 'Failed to load organization data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgDetails = async (org: Organization) => {
    setLoadingDetails(true);
    setSelectedOrg(org);

    try {
      // Fetch members
      const { data: membersData } = await api
        .from('profiles')
        .select('*')
        .eq('organization_id', org.id)
        .order('full_name', { ascending: true });

      setOrgMembers(membersData || []);

      // Fetch recent assignments
      const { data: assignmentsData } = await api
        .from('assignments')
        .select('*')
        .eq('organization_id', org.id)
        .order('assigned_at', { ascending: false })
        .limit(20);

      setOrgAssignments(assignmentsData || []);
    } catch (err: any) {
      console.error('Error fetching org details:', err);
      toast.error('Failed to load organization details');
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-700 rounded text-white">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Organizations</h2>
        <button
          onClick={fetchOrganizations}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{organizations.length}</div>
          <div className="text-sm text-zinc-400">Total Organizations</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {organizations.reduce((sum, org) => sum + org.activeResponders, 0)}
          </div>
          <div className="text-sm text-zinc-400">Active Responders</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            {organizations.reduce((sum, org) => sum + org.activeAssignments, 0)}
          </div>
          <div className="text-sm text-zinc-400">Tasks In Progress</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {organizations.reduce((sum, org) => sum + org.pendingAssignments, 0)}
          </div>
          <div className="text-sm text-zinc-400">Pending Tasks</div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-zinc-300">
            <thead className="text-xs uppercase bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Active Responders</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} className="border-b border-zinc-700 hover:bg-zinc-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-white">{org.name || 'Unnamed'}</div>
                      <div className="text-xs text-zinc-500">{org.slug}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{org.city || org.region || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-zinc-700 rounded text-xs">{org.memberCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${org.activeResponders > 0 ? 'bg-green-900 text-green-300' : 'bg-zinc-700'}`}>
                      {org.activeResponders}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-blue-900 text-blue-300 rounded text-xs" title="In Progress">
                        {org.activeAssignments} active
                      </span>
                      {org.pendingAssignments > 0 && (
                        <span className="px-2 py-1 bg-yellow-900 text-yellow-300 rounded text-xs" title="Pending">
                          {org.pendingAssignments} pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchOrgDetails(org)}
                        className="px-3 py-1 bg-zinc-600 hover:bg-zinc-500 text-white rounded text-xs"
                      >
                        View Details
                      </button>
                      <a
                        href={`/admin`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs"
                      >
                        Open Dashboard
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Organization Details Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-700">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedOrg.name}</h3>
                <p className="text-sm text-zinc-400">{selectedOrg.city || selectedOrg.region || 'No location'}</p>
              </div>
              <button
                onClick={() => setSelectedOrg(null)}
                className="text-zinc-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingDetails ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Members */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-3">Team Members ({orgMembers.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {orgMembers.map((member) => (
                        <div key={member.id} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg">
                          <div className={`w-2 h-2 rounded-full ${
                            member.status === 'on_duty' ? 'bg-green-500' :
                            member.status === 'active' ? 'bg-yellow-500' : 'bg-zinc-500'
                          }`}></div>
                          <div className="flex-1">
                            <div className="text-sm text-white">{member.full_name || 'Unnamed'}</div>
                            <div className="text-xs text-zinc-500">{member.role}</div>
                          </div>
                          {member.latitude && member.longitude && (
                            <span className="text-xs text-blue-400">📍 GPS</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Assignments */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-3">Recent Assignments ({orgAssignments.length})</h4>
                    <div className="space-y-2">
                      {orgAssignments.slice(0, 10).map((assignment) => {
                        const responder = orgMembers.find(m => m.id === assignment.responder_id);
                        return (
                          <div key={assignment.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
                            <div>
                              <div className="text-sm text-white">
                                {responder?.full_name || 'Unknown Responder'}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {new Date(assignment.assigned_at).toLocaleString()}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              assignment.status === 'completed' ? 'bg-green-900 text-green-300' :
                              assignment.status === 'in_progress' ? 'bg-blue-900 text-blue-300' :
                              assignment.status === 'accepted' ? 'bg-yellow-900 text-yellow-300' :
                              'bg-orange-900 text-orange-300'
                            }`}>
                              {assignment.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
