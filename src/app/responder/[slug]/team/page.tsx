'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Users, Plus, Edit2, Trash2, X, Clock } from 'lucide-react';

export default function TeamManagement() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'responder' });

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/organization/team');
      if (!res.ok) throw new Error('Failed to fetch');
      const { data } = await res.json();
      setTeam(data);
    } catch (error) {
      toast.error('Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    try {
      const res = await fetch('/api/organization/activity');
      if (!res.ok) throw new Error('Failed to fetch');
      const { data } = await res.json();
      setActivity(data);
    } catch {
      toast.error('Failed to load activity');
    }
  };

  const handleAdd = async () => {
    try {
      const res = await fetch('/api/organization/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to add');
      
      toast.success('Member added successfully');
      setShowAddModal(false);
      setFormData({ name: '', email: '', role: 'responder' });
      fetchTeam();
    } catch (error) {
      toast.error('Failed to add member');
    }
  };

  const handleEdit = async () => {
    try {
      const res = await fetch('/api/organization/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedMember.id, ...formData }),
      });

      if (!res.ok) throw new Error('Failed to update');
      
      toast.success('Member updated successfully');
      setShowEditModal(false);
      setSelectedMember(null);
      setFormData({ name: '', email: '', role: 'responder' });
      fetchTeam();
    } catch (error) {
      toast.error('Failed to update member');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const res = await fetch(`/api/organization/team?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');
      
      toast.success('Member removed successfully');
      fetchTeam();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const openEditModal = (member: any) => {
    setSelectedMember(member);
    setFormData({ name: member.name, email: member.email, role: member.role });
    setShowEditModal(true);
  };

  const openActivityModal = () => {
    fetchActivity();
    setShowActivityModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Team Management</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openActivityModal}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Activity Log
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </button>
          </div>
        </div>

        {/* Team Table */}
        <div className="bg-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Joined</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr key={member.id} className="border-t border-zinc-700 hover:bg-zinc-700/50">
                  <td className="px-6 py-4">{member.name}</td>
                  <td className="px-6 py-4">{member.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      member.role === 'org_admin' ? 'bg-purple-900/50 text-purple-200' :
                      member.role === 'responder' ? 'bg-blue-900/50 text-blue-200' :
                      'bg-zinc-700 text-zinc-300'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">{new Date(member.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(member)}
                      className="p-2 hover:bg-zinc-600 rounded transition mr-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="p-2 hover:bg-red-900/50 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-zinc-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Add Team Member</h2>
                <button onClick={() => setShowAddModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-700 rounded-lg"
                  >
                    <option value="responder">Responder</option>
                    <option value="org_admin">Organization Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    Add Member
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-zinc-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Edit Team Member</h2>
                <button onClick={() => setShowEditModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-700 rounded-lg"
                  >
                    <option value="responder">Responder</option>
                    <option value="org_admin">Organization Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Modal */}
        {showActivityModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-zinc-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Team Activity Log</h2>
                <button onClick={() => setShowActivityModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {activity.map((log) => (
                  <div key={log.id} className="bg-zinc-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{log.action.replace('_', ' ')}</p>
                        <p className="text-sm text-zinc-400">
                          by {log.user_name || 'System'} ({log.user_email || 'N/A'})
                        </p>
                      </div>
                      <span className="text-xs text-zinc-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
