'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/../lib/supabase/client';

interface User {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: 'admin' | 'co-admin' | 'responder' | 'user' | 'org_admin';
  created_at: string;
  organization_id?: string;
  memberCount?: number;
  activeAssignments?: number;
  disasterResponses?: any[];
}

interface EditingUser {
  id: string;
  name: string;
  organization: string;
  role: 'admin' | 'co-admin' | 'responder' | 'user' | 'org_admin';
}

export default function UsersTable() {
  const supabase = createClient();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For users with role 'org_admin', fetch organization details
      const usersWithDetails = await Promise.all(
        (data || []).map(async (user: any) => {
          if (user.role === 'org_admin' && user.organization_id) {
            // Fetch member count
            let memberCount = 0;
            try {
              const { count, error: countError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .eq('organization_id', user.organization_id);

              if (countError) console.error(`Error fetching member count for org ${user.organization_id}:`, countError);
              else memberCount = count || 0;
            } catch (e) {
              console.error(`Exception fetching member count for org ${user.organization_id}:`, e);
            }

            // Fetch active assignments count
            let assignmentCount = 0;
            try {
              const { count, error: assignmentError } = await supabase
                .from('team_assignments')
                .select('*', { count: 'exact' })
                .eq('organization_id', user.organization_id);

              if (assignmentError) console.error(`Error fetching assignments for org ${user.organization_id}:`, assignmentError);
              else assignmentCount = count || 0;
            } catch (e) {
              console.error(`Exception fetching assignments for org ${user.organization_id}:`, e);
            }

            // Fetch disaster responses for the organization
            let disasterResponses = [];
            try {
              const { data: disasterData, error: disasterError } = await supabase
                .from('disaster_responses')
                .select('*')
                .eq('organization_id', user.organization_id)
                .order('created_at', { ascending: false });

              if (disasterError) console.error(`Error fetching disaster responses for org ${user.organization_id}:`, disasterError);
              else disasterResponses = disasterData || [];
            } catch (e) {
              console.error(`Exception fetching disaster responses for org ${user.organization_id}:`, e);
            }

            return {
              ...user,
              memberCount,
              activeAssignments: assignmentCount,
              disasterResponses,
            };
          }
          return user;
        })
      );

      setUsers(usersWithDetails);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: string) => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editingUser.name,
          organization: editingUser.organization,
          role: editingUser.role
        })
        .eq('id', id);

      if (error) throw error;
      
      setUsers(prev => prev.map(user => 
        user.id === id ? { ...user, ...editingUser } : user
      ));
      setEditingUser(null);
    } catch (err: any) {
      console.error('Error updating user:', err);
      setError(err.message);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setUsers(prev => prev.filter(user => user.id !== id));
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message);
    }
  };

  const startEditing = (user: User) => {
    setEditingUser({
      id: user.id,
      name: user.name || '',
      organization: user.organization || '',
      role: user.role
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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
            <th className="px-4 py-3"></th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Organization</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Members</th>
            <th className="px-4 py-3">Assignments</th>
            <th className="px-4 py-3">Created At</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => [
            <tr key={`${user.id}-main`} className="border-b border-zinc-700 bg-zinc-800/50">
              <td className="px-4 py-3">
                {user.role === 'org_admin' && (
                  <button
                    onClick={() => toggleRow(user.id)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <svg 
                      className={`w-5 h-5 transform transition-transform ${expandedRows[user.id] ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </td>
              <td className="px-4 py-3">{user.email}</td>
              <td className="px-4 py-3">
                {editingUser?.id === user.id ? (
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                  />
                ) : (
                  user.name || '-'
                )}
              </td>
              <td className="px-4 py-3">
                {editingUser?.id === user.id ? (
                  <input
                    type="text"
                    value={editingUser.organization}
                    onChange={(e) => setEditingUser(prev => prev ? { ...prev, organization: e.target.value } : null)}
                    className="bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                  />
                ) : (
                  user.organization || '-'
                )}
              </td>
              <td className="px-4 py-3">
                {editingUser?.id === user.id ? (
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser(prev => prev ? { 
                      ...prev, 
                      role: e.target.value as 'admin' | 'co-admin' | 'responder' | 'user' | 'org_admin'
                    } : null)}
                    className="bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                  >
                    <option value="user">User</option>
                    <option value="responder">Responder</option>
                    <option value="co-admin">Co-Admin</option>
                    <option value="admin">Admin</option>
                    <option value="org_admin">Org Admin</option>
                  </select>
                ) : (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.role === 'admin' ? 'bg-red-900/50 text-red-200' :
                    user.role === 'co-admin' ? 'bg-purple-900/50 text-purple-200' :
                    user.role === 'responder' ? 'bg-blue-900/50 text-blue-200' :
                    user.role === 'org_admin' ? 'bg-indigo-900/50 text-indigo-200' :
                    'bg-green-900/50 text-green-200'
                  }`}>
                    {user.role}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {user.role === 'org_admin' ? (user.memberCount || 0) : '-'}
              </td>
              <td className="px-4 py-3">
                {user.role === 'org_admin' ? (user.activeAssignments || 0) : '-'}
              </td>
              <td className="px-4 py-3">
                {new Date(user.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 space-x-2">
                {editingUser?.id === user.id ? (
                  <>
                    <button
                      onClick={() => updateUser(user.id)}
                      className="text-green-500 hover:text-green-400"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingUser(null)}
                      className="text-zinc-400 hover:text-zinc-300"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(user)}
                      className="text-blue-500 hover:text-blue-400"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="text-red-500 hover:text-red-400"
                    >
                      Delete
                    </button>
                    {user.role === 'org_admin' && (
                      <button
                        onClick={() => toggleRow(user.id)}
                        className="text-indigo-500 hover:text-indigo-400"
                      >
                        View Details
                      </button>
                    )}
                  </>
                )}
              </td>
            </tr>,
            user.role === 'org_admin' && expandedRows[user.id] && (
              <tr key={`${user.id}-expanded`} className="bg-zinc-800/30">
              <td colSpan={9} className="px-4 py-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400">Organization Details</h4>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm">
                        <span className="text-zinc-400">Total Members:</span> {user.memberCount || 0}
                      </p>
                      <p className="text-sm">
                        <span className="text-zinc-400">Total Assignments:</span> {user.activeAssignments || 0}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400">Disaster Responses</h4>
                    {user.disasterResponses && user.disasterResponses.length > 0 ? (
                      <ul className="mt-1 space-y-2">
                        {user.disasterResponses.map((resp: any) => (
                          <li key={resp.id} className="text-sm border-b border-zinc-700 pb-2">
                            <span className="font-medium">{resp.name}</span> ({resp.type})
                            {resp.location && <span> - {resp.location}</span>}
                            <div className="text-xs text-zinc-400">
                              Created: {new Date(resp.created_at).toLocaleDateString()}
                              {resp.status && <span> | Status: {resp.status}</span>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-zinc-500 mt-1">No disaster responses found for this organization.</p>
                    )}
                  </div>
                </div>
                </td>
              </tr>
            )
          ])}
        </tbody>
      </table>
    </div>
  );
}
