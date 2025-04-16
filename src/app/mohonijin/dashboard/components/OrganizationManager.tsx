'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/../lib/supabase/client';

interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  created_at: string;
  memberCount: number;
  activeAssignments: number;
}

export default function OrganizationManager() {
  const supabase = createClient();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all organizations
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgError) throw new Error(`Failed to fetch organizations: ${JSON.stringify(orgError)}`);

      // If no organizations, set empty list
      if (!orgData || orgData.length === 0) {
        setOrganizations([]);
        return;
      }

      // For each organization, fetch member count and active assignments
      const orgsWithDetails = await Promise.all(
        orgData.map(async (org: any) => {
          // Fetch member count
          let memberCount = 0;
          try {
            const { count, error: countError } = await supabase
              .from('profiles')
              .select('*', { count: 'exact' })
              .eq('organization_id', org.id);

            if (countError) console.error(`Error fetching member count for org ${org.id}:`, countError);
            else memberCount = count || 0;
          } catch (e) {
            console.error(`Exception fetching member count for org ${org.id}:`, e);
          }

          // Fetch active assignments count
          let assignmentCount = 0;
          try {
            const { count, error: assignmentError } = await supabase
              .from('team_assignments')
              .select('*', { count: 'exact' })
              .eq('organization_id', org.id);

            if (assignmentError) console.error(`Error fetching assignments for org ${org.id}:`, assignmentError);
            else assignmentCount = count || 0;
          } catch (e) {
            console.error(`Exception fetching assignments for org ${org.id}:`, e);
          }

          return {
            ...org,
            memberCount: memberCount,
            activeAssignments: assignmentCount,
          };
        })
      );

      setOrganizations(orgsWithDetails);
    } catch (err: any) {
      console.error('Error fetching organizations:', err);
      setError(err.message || JSON.stringify(err) || 'Failed to load organization data.');
    } finally {
      setLoading(false);
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-zinc-300">
        <thead className="text-xs uppercase bg-zinc-800 text-zinc-400">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Members</th>
            <th className="px-4 py-3">Active Assignments</th>
            <th className="px-4 py-3">Created At</th>
          </tr>
        </thead>
        <tbody>
          {organizations.map((org) => (
            <tr key={org.id} className="border-b border-zinc-700 bg-zinc-800/50">
              <td className="px-4 py-3">{org.id}</td>
              <td className="px-4 py-3">{org.name || '-'}</td>
              <td className="px-4 py-3">{org.slug || '-'}</td>
              <td className="px-4 py-3">{org.email || '-'}</td>
              <td className="px-4 py-3">{org.phone || '-'}</td>
              <td className="px-4 py-3">{org.memberCount}</td>
              <td className="px-4 py-3">{org.activeAssignments}</td>
              <td className="px-4 py-3">
                {new Date(org.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
