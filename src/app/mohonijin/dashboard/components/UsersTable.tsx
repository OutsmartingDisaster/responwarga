'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createApiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';

// Updated User interface to match the structure returned by the API route
interface User {
  id: string; // This is the auth.users id (UUID)
  email: string;
  created_at: string; // auth.users created_at
  last_sign_in_at: string | null;
  app_metadata: {
    provider?: string;
    [key: string]: any;
  };
  user_metadata: { // This is where profile data is often stored
    name?: string;
    organization?: string;
    role?: 'admin' | 'co-admin' | 'responder' | 'user' | 'org_admin';
    [key: string]: any;
  };
  // Include profile-specific fields fetched separately (if the API returns them this way)
  profile_name?: string;
  profile_organization?: string;
  profile_role?: 'admin' | 'co-admin' | 'responder' | 'user' | 'org_admin';
  organization_id?: string;
  memberCount?: number;
  activeAssignments?: number;
  disasterResponses?: any[];
}

interface EditingUser {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: 'admin' | 'co-admin' | 'responder' | 'user' | 'org_admin';
  password?: string;
}

export default function UsersTable() {
  const api = createApiClient(); // Use client for non-admin operations if needed
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    organization: '',
    role: 'user' as 'admin' | 'co-admin' | 'responder' | 'user' | 'org_admin',
  });

  useEffect(() => {
    console.log('UsersTable: Component mounted, fetching users...');
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      console.log('UsersTable: Attempting to fetch users from /api/admin/users...');
      // Fetch all users from the API route
      const response = await fetch('/api/admin/users');

      console.log('UsersTable: Received response from /api/admin/users');
      console.log('UsersTable: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('UsersTable: Error fetching users from API:', errorData);
        throw new Error(errorData.error || 'Failed to fetch users from API');
      }

      const data = await response.json();
      console.log('UsersTable: Fetched users data:', data);

      if (!Array.isArray(data)) {
        console.error('UsersTable: fetched data is not an array:', data);
        setUsers([]);
        return;
      }

      const fetchedUsers: User[] = data;

      // Fetch additional details for org_admins if the API doesn't provide them directly
      // (Based on the API route code, it seems it doesn't fetch these details,
      // so we'll keep the client-side fetching for now, but ideally this would be
      // moved to the API route for efficiency)
      const usersWithDetails = await Promise.all(
        fetchedUsers.map(async (user: User) => {
          // Use profile_role if available, fallback to user_metadata role
          const userRole = user.profile_role || user.user_metadata?.role;

          if (userRole === 'org_admin' && user.organization_id) {
            console.log(`UsersTable: Fetching details for org admin user ${user.id}, org ID: ${user.organization_id}`);
            // Fetch member count for the organization
            let memberCount = 0;
            try {
              const { count, error: countError } = await api
                .from('profiles')
                .select('*', { count: 'exact' })
                .eq('organization_id', user.organization_id);

              if (countError) console.error(`UsersTable: Error fetching member count for org ${user.organization_id}:`, countError);
              else {
                memberCount = count || 0;
                console.log(`UsersTable: Member count for org ${user.organization_id}: ${memberCount}`);
              }
            } catch (e) {
              console.error(`UsersTable: Exception fetching member count for org ${user.organization_id}:`, e);
            }

            // Fetch active assignments count for the organization
            let activeAssignments = 0;
            try {
              const { count, error: assignmentError } = await api
                .from('assignments')
                .select('*', { count: 'exact' })
                .eq('organization_id', user.organization_id)
                .in('status', ['assigned', 'accepted', 'in_progress']);

              if (assignmentError) console.error(`UsersTable: Error fetching assignments for org ${user.organization_id}:`, JSON.stringify(assignmentError));
              else {
                activeAssignments = count || 0;
                console.log(`UsersTable: Assignment count for org ${user.organization_id}: ${activeAssignments}`);
              }
            } catch (e) {
              console.error(`UsersTable: Exception fetching assignments for org ${user.organization_id}:`, e);
            }

            // Fetch disaster responses for the organization
            let disasterResponses: any[] = [];
            try {
              const { data: disasterData, error: disasterError } = await api
                .from('disaster_responses')
                .select('*')
                .eq('organization_id', user.organization_id)
                .order('created_at', { ascending: false });

              if (disasterError) console.error(`UsersTable: Error fetching disaster responses for org ${user.organization_id}:`, JSON.stringify(disasterError));
              else {
                disasterResponses = disasterData || [];
                console.log(`UsersTable: Disaster responses for org ${user.organization_id}:`, disasterResponses.length);
              }
            } catch (e) {
              console.error(`UsersTable: Exception fetching disaster responses for org ${user.organization_id}:`, e);
            }

            return {
              ...user,
              memberCount,
              activeAssignments,
              disasterResponses,
            };
          }

          return user;
        })
      );


      // Sort users by creation date (from auth.users)
      usersWithDetails.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('UsersTable: Setting users state with:', usersWithDetails);
      setUsers(usersWithDetails);
    } catch (err: any) {
      console.error('UsersTable: Caught error during fetchUsers:', err);
      setError(err.message);
    } finally {
      console.log('UsersTable: fetchUsers finished, setting loading to false.');
      setLoading(false);
    }
  };

  const updateUser = async (id: string) => {
    if (!editingUser) return;

    try {
      console.log(`UsersTable: Attempting to update user ${id} via API...`);
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: id,
          name: editingUser.name,
          organization: editingUser.organization,
          role: editingUser.role,
          password: editingUser.password, // Include password if provided
        }),
      });

      console.log('UsersTable: Received response from PUT /api/admin/users');
      console.log('UsersTable: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('UsersTable: Error updating user via API:', errorData);
        throw new Error(errorData.error || 'Failed to update user via API');
      }

      const result = await response.json();
      console.log('UsersTable: Update user API result:', result);

      toast.success('User updated successfully.');
      fetchUsers(); // Refetch users to get the latest data
      setEditingUser(null);

    } catch (err: any) {
      console.error('UsersTable: Caught error during updateUser:', err);
      setError(err.message);
      toast.error(`Failed to update user: ${err.message}`);
    }
  };

  const addUser = async () => {
    try {
      console.log('UsersTable: Attempting to add user via API...');
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      console.log('UsersTable: Received response from POST /api/admin/users');
      console.log('UsersTable: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('UsersTable: Error adding user via API:', errorData);
        throw new Error(errorData.error || 'Failed to add user via API');
      }

      const result = await response.json();
      console.log('UsersTable: Add user API result:', result);

      toast.success('User added successfully.');
      setShowAddUserModal(false);
      setNewUser({ email: '', password: '', name: '', organization: '', role: 'user' });
      fetchUsers(); // Refetch users to include the new one

    } catch (err: any) {
      console.error('UsersTable: Caught error during addUser:', err);
      setError(err.message);
      toast.error(`Failed to add user: ${err.message}`);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      console.log(`UsersTable: Attempting to delete user ${id} via API...`);
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: id }),
      });

      console.log('UsersTable: Received response from DELETE /api/admin/users');
      console.log('UsersTable: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('UsersTable: Error deleting user via API:', errorData);
        throw new Error(errorData.error || 'Failed to delete user via API');
      }

      const result = await response.json();
      console.log('UsersTable: Delete user API result:', result);

      toast.success('User deleted successfully.');
      fetchUsers(); // Refetch users to remove the deleted one

    } catch (err: any) {
      console.error('UsersTable: Caught error during deleteUser:', err);
      setError(err.message);
      toast.error(`Failed to delete user: ${err.message}`);
    }
  };

  const startEditing = (user: User) => {
    setEditingUser({
      id: user.id,
      email: user.email, // Include email for display
      name: user.profile_name || user.user_metadata?.name || '', // Use profile name if available, fallback to user_metadata
      organization: user.profile_organization || user.user_metadata?.organization || '', // Use profile org if available, fallback to user_metadata
      role: user.profile_role || user.user_metadata?.role || 'user', // Use profile role if available, fallback to user_metadata
      password: '', // Initialize password field as empty
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
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
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAddUserModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Add User
        </button>
      </div>

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
                  user.profile_name || user.user_metadata?.name || '-' // Display profile name or user_metadata name
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
                  user.profile_organization || user.user_metadata?.organization || '-' // Display profile org or user_metadata org
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
                  <span className={`px-2 py-1 rounded text-xs font-medium ${(user.profile_role || user.user_metadata?.role) === 'admin' ? 'bg-red-900/50 text-red-200' :
                    (user.profile_role || user.user_metadata?.role) === 'co-admin' ? 'bg-purple-900/50 text-purple-200' :
                      (user.profile_role || user.user_metadata?.role) === 'responder' ? 'bg-blue-900/50 text-blue-200' :
                        (user.profile_role || user.user_metadata?.role) === 'org_admin' ? 'bg-indigo-900/50 text-indigo-200' :
                          'bg-green-900/50 text-green-200'
                    }`}>
                    {user.profile_role || user.user_metadata?.role || 'user'} {/* Display profile role or user_metadata role */}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {user.profile_role === 'org_admin' ? (user.memberCount || 0) : '-'}
              </td>
              <td className="px-4 py-3">
                {user.profile_role === 'org_admin' ? (user.activeAssignments || 0) : '-'}
              </td>
              <td className="px-4 py-3">
                {new Date(user.created_at).toLocaleDateString()} {/* Use auth.users created_at */}
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
                    <button
                      onClick={() => toggleRow(user.id)}
                      className="text-indigo-500 hover:text-indigo-400"
                    >
                      View Details
                    </button>
                  </>
                )}
              </td>
            </tr>,
            expandedRows[user.id] && (
              <tr key={`${user.id}-expanded`} className="bg-zinc-800/30">
                <td colSpan={9} className="px-4 py-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-zinc-400">Profile Details</h4>
                      <div className="mt-1 space-y-1 text-sm">
                        <p><span className="text-zinc-400">User ID:</span> {user.id}</p>
                        <p><span className="text-zinc-400">Email:</span> {user.email}</p>
                        <p><span className="text-zinc-400">Name:</span> {user.profile_name || user.user_metadata?.name || '-'}</p> {/* Display profile name or user_metadata name */}
                        <p><span className="text-zinc-400">Organization:</span> {user.profile_organization || user.user_metadata?.organization || '-'}</p> {/* Display profile org or user_metadata org */}
                        <p><span className="text-zinc-400">Role:</span> {user.profile_role || user.user_metadata?.role || 'user'}</p> {/* Display profile role or user_metadata role */}
                        <p><span className="text-zinc-400">Created At:</span> {new Date(user.created_at).toLocaleString()}</p> {/* Use auth.users created_at */}
                        <p><span className="text-zinc-400">Last Sign In At:</span> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '-'}</p> {/* Display last_sign_in_at */}
                        <p><span className="text-zinc-400">Provider:</span> {user.app_metadata?.provider || '-'}</p> {/* Display provider */}
                        {/* Add other profile fields as needed */}
                      </div>
                    </div>
                    {(user.profile_role || user.user_metadata?.role) === 'org_admin' && ( // Check profile role or user_metadata role
                      <>
                        <div>
                          <h4 className="text-sm font-medium text-zinc-400">Organization Summary</h4>
                          <div className="mt-1 space-y-1 text-sm">
                            <p>
                              <span className="text-zinc-400">Total Members:</span> {user.memberCount || 0}
                            </p>
                            <p>
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
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          ])}
        </tbody>
      </table>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Add New User</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="newUserEmail" className="block text-sm font-medium text-zinc-400">Email</label>
                <input
                  type="email"
                  id="newUserEmail"
                  name="email"
                  value={newUser.email}
                  onChange={handleNewUserChange}
                  className="mt-1 block w-full bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                  required
                />
              </div>
              <div>
                <label htmlFor="newUserPassword" className="block text-sm font-medium text-zinc-400">Password</label>
                <input
                  type="password"
                  id="newUserPassword"
                  name="password"
                  value={newUser.password}
                  onChange={handleNewUserChange}
                  className="mt-1 block w-full bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                  required
                />
              </div>
              <div>
                <label htmlFor="newUserRole" className="block text-sm font-medium text-zinc-400">Role</label>
                <select
                  id="newUserRole"
                  name="role"
                  value={newUser.role}
                  onChange={handleNewUserChange}
                  className="mt-1 block w-full bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                >
                  <option value="user">User</option>
                  <option value="responder">Responder</option>
                  <option value="co-admin">Co-Admin</option>
                  <option value="admin">Admin</option>
                  <option value="org_admin">Org Admin</option>
                </select>
              </div>
              <div>
                <label htmlFor="newUserName" className="block text-sm font-medium text-zinc-400">Name (Optional)</label>
                <input
                  type="text"
                  id="newUserName"
                  name="name"
                  value={newUser.name}
                  onChange={handleNewUserChange}
                  className="mt-1 block w-full bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                />
              </div>
              <div>
                <label htmlFor="newUserOrganization" className="block text-sm font-medium text-zinc-400">Organization (Optional)</label>
                <input
                  type="text"
                  id="newUserOrganization"
                  name="organization"
                  value={newUser.organization}
                  onChange={handleNewUserChange}
                  className="mt-1 block w-full bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 text-zinc-400 rounded-md hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={addUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal (for password) */}
      {editingUser?.id && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Edit User: {editingUser.email}</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="editUserName" className="block text-sm font-medium text-zinc-400">Name</label>
                <input
                  type="text"
                  id="editUserName"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="mt-1 block w-full bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                />
              </div>
              <div>
                <label htmlFor="editUserOrganization" className="block text-sm font-medium text-zinc-400">Organization</label>
                <input
                  type="text"
                  id="editUserOrganization"
                  value={editingUser.organization}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, organization: e.target.value } : null)}
                  className="mt-1 block w-full bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                />
              </div>
              <div>
                <label htmlFor="editUserRole" className="block text-sm font-medium text-zinc-400">Role</label>
                <select
                  id="editUserRole"
                  value={editingUser.role}
                  onChange={(e) => setEditingUser(prev => prev ? {
                    ...prev,
                    role: e.target.value as 'admin' | 'co-admin' | 'responder' | 'user' | 'org_admin'
                  } : null)}
                  className="mt-1 block w-full bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                >
                  <option value="user">User</option>
                  <option value="responder">Responder</option>
                  <option value="co-admin">Co-Admin</option>
                  <option value="admin">Admin</option>
                  <option value="org_admin">Org Admin</option>
                </select>
              </div>
              <div>
                <label htmlFor="editUserPassword" className="block text-sm font-medium text-zinc-400">New Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  id="editUserPassword"
                  value={editingUser.password || ''} // Use empty string for controlled input
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, password: e.target.value } : null)}
                  className="mt-1 block w-full bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-zinc-400 rounded-md hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => updateUser(editingUser.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
