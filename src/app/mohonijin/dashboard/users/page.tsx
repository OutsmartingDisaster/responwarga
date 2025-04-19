'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client'; // Client-side Supabase
import { toast } from 'react-hot-toast';
import { UserPlus, Edit, Trash2 } from 'lucide-react';

// Define a type for the combined user data
interface ManagedUser {
  id: string; // Auth User ID (UUID)
  email?: string;
  name?: string | null;
  role?: string | null;
  created_at?: string;
}

// Define available roles
type UserRole = 'org_admin' | 'org_responder' | 'admin';
const availableRoles: UserRole[] = ['org_responder', 'org_admin', 'admin'];

export default function UserManagementPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null); // For table-level errors

  // State for the Add User form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('org_responder');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // State for the Edit User form
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('org_responder');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch users function
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setGeneralError(null);
    try {
      const { data, error: fetchError } = await supabase.rpc('get_all_users_with_profiles');

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch users.');
      }
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setGeneralError('Failed to fetch users. Check permissions or function existence.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Add User form submission
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    setAddError(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newUserEmail, password: newUserPassword, name: newUserName, role: newUserRole }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to add user');
      toast.success(`User ${result.email} created successfully!`);
      setShowAddModal(false);
      setNewUserEmail(''); setNewUserPassword(''); setNewUserName(''); setNewUserRole('org_responder');
      fetchUsers(); // Refresh list
    } catch (err: any) {
      console.error('Add user error:', err);
      setAddError(err.message);
      toast.error(`Add failed: ${err.message}`);
    } finally {
      setIsAddingUser(false);
    }
  };

  // Handle Edit User click
  const handleEditClick = (user: ManagedUser) => {
    setEditingUser(user);
    setEditUserName(user.name || '');
    setEditUserRole((user.role as UserRole) || 'org_responder'); // Ensure role is valid
    setEditError(null);
    setShowEditModal(true);
  };

  // Handle Edit User form submission
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingUser(true);
    setEditError(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editingUser.id, name: editUserName, role: editUserRole }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update user');
      toast.success(`User ${editingUser.email} updated successfully!`);
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers(); // Refresh list
    } catch (err: any) {
      console.error('Update user error:', err);
      setEditError(err.message);
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Handle Delete User click
  const handleDeleteUser = async (userId: string, email?: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${email || userId}? This action cannot be undone.`)) {
      return;
    }
    // Optimistic UI update (optional): remove user from state immediately
    // setUsers(users.filter(u => u.id !== userId));
    const toastId = toast.loading(`Deleting user ${email || userId}...`);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete user');
      toast.success(`User ${email || userId} deleted successfully!`, { id: toastId });
      fetchUsers(); // Refresh list
    } catch (err: any) {
      console.error('Delete user error:', err);
      toast.error(`Delete failed: ${err.message}`, { id: toastId });
      // Revert optimistic update if it failed (if implemented)
      // fetchUsers();
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header and Add Button */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">User Management</h1>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
          <UserPlus size={18} className="mr-1" /> Add User
        </button>
      </div>

      {generalError && <div className="alert alert-error mb-4">{generalError}</div>}

      {/* User Table */}
      <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-4">Loading users...</td></tr>
            ) : users.length === 0 && !generalError ? (
              <tr><td colSpan={5} className="text-center py-4">No users found.</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email || 'N/A'}</td>
                  <td>{user.name || 'N/A'}</td>
                  <td><span className="badge badge-ghost badge-sm">{user.role || 'N/A'}</span></td>
                  <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <button onClick={() => handleEditClick(user)} className="btn btn-ghost btn-xs">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteUser(user.id, user.email)} className="btn btn-ghost btn-xs text-error">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Add New User</h3>
            <form onSubmit={handleAddUser}>
              {/* Email */}
              <div className="form-control w-full mb-2">
                <label className="label"><span className="label-text">Email</span></label>
                <input type="email" placeholder="user@example.com" className="input input-bordered w-full" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required disabled={isAddingUser} />
              </div>
              {/* Password */}
              <div className="form-control w-full mb-2">
                <label className="label"><span className="label-text">Password</span></label>
                <input type="password" placeholder="********" className="input input-bordered w-full" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required minLength={6} disabled={isAddingUser} />
              </div>
              {/* Name */}
              <div className="form-control w-full mb-2">
                <label className="label"><span className="label-text">Name</span></label>
                <input type="text" placeholder="Full Name" className="input input-bordered w-full" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required disabled={isAddingUser} />
              </div>
              {/* Role */}
              <div className="form-control w-full mb-4">
                <label className="label"><span className="label-text">Role</span></label>
                <select className="select select-bordered w-full" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as UserRole)} required disabled={isAddingUser}>
                  {availableRoles.map(role => (<option key={role} value={role}>{role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>))}
                </select>
              </div>
              {addError && <p className="text-error text-sm mb-2">Error: {addError}</p>}
              {/* Actions */}
              <div className="modal-action">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn" disabled={isAddingUser}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isAddingUser}>{isAddingUser ? 'Adding...' : 'Add User'}</button>
              </div>
            </form>
          </div>
          <label className="modal-backdrop" htmlFor="add-user-modal-close" onClick={() => !isAddingUser && setShowAddModal(false)}>Close</label>
          <input type="checkbox" id="add-user-modal-close" className="modal-toggle" checked={showAddModal} readOnly />
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Edit User: {editingUser.email}</h3>
            <form onSubmit={handleUpdateUser}>
              {/* Name */}
              <div className="form-control w-full mb-2">
                <label className="label"><span className="label-text">Name</span></label>
                <input type="text" placeholder="Full Name" className="input input-bordered w-full" value={editUserName} onChange={(e) => setEditUserName(e.target.value)} required disabled={isUpdatingUser} />
              </div>
              {/* Role */}
              <div className="form-control w-full mb-4">
                <label className="label"><span className="label-text">Role</span></label>
                <select className="select select-bordered w-full" value={editUserRole} onChange={(e) => setEditUserRole(e.target.value as UserRole)} required disabled={isUpdatingUser}>
                   {availableRoles.map(role => (<option key={role} value={role}>{role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>))}
                </select>
              </div>
              {editError && <p className="text-error text-sm mb-2">Error: {editError}</p>}
              {/* Actions */}
              <div className="modal-action">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn" disabled={isUpdatingUser}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isUpdatingUser}>{isUpdatingUser ? 'Updating...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
          <label className="modal-backdrop" htmlFor="edit-user-modal-close" onClick={() => !isUpdatingUser && setShowEditModal(false)}>Close</label>
          <input type="checkbox" id="edit-user-modal-close" className="modal-toggle" checked={showEditModal} readOnly />
        </div>
      )}
    </div>
  );
} 