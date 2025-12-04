'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createApiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import ConfirmationModal from '@/app/components/ConfirmationModal';

export default function UserPolicyEditor() {
  const api = createApiClient();
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // State for delete confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await api
        .from('user_policies')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setPolicies(data || []);
    } catch (err: any) {
      console.error('Error fetching policies:', err);
      setError('Failed to load user policies');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (policy: any) => {
    setEditingPolicy(policy);
    setEditTitle(policy.title);
    setEditContent(policy.content);
  };

  const handleSave = async () => {
    if (!editingPolicy) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error } = await api
        .from('user_policies')
        .update({
          title: editTitle,
          content: editContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPolicy.id);

      if (error) throw error;

      setSuccess('Policy updated successfully');
      fetchPolicies();

      // Reset form after short delay
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating policy:', err);
      setError('Failed to update policy');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error } = await api
        .from('user_policies')
        .insert({
          title: 'New Policy',
          content: '<h2>New User Policy</h2><p>Edit this policy content.</p>',
          is_active: false
        });

      if (error) throw error;

      setSuccess('New policy created');
      fetchPolicies();
    } catch (err: any) {
      console.error('Error creating policy:', err);
      setError('Failed to create new policy');
    } finally {
      setSaving(false);
    }
  };

  const togglePolicyStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await api
        .from('user_policies')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      fetchPolicies();
    } catch (err: any) {
      console.error('Error toggling policy status:', err);
      setError('Failed to update policy status');
    }
  };

  const confirmDeletePolicy = async () => {
    if (!policyToDelete) return;

    try {
      const { error } = await api
        .from('user_policies')
        .delete()
        .eq('id', policyToDelete);

      if (error) throw error;

      fetchPolicies();

      if (editingPolicy?.id === policyToDelete) {
        setEditingPolicy(null);
        setEditTitle('');
        setEditContent('');
      }
      toast.success('Policy deleted successfully');
    } catch (err: any) {
      console.error('Error deleting policy:', err);
      setError('Failed to delete policy');
      toast.error('Failed to delete policy');
    }
  };

  const handleDeleteClick = (id: string) => {
    setPolicyToDelete(id);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="bg-zinc-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">User Policies</h2>
          <button
            onClick={handleCreateNew}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
          >
            Create New Policy
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-white">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded text-white">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-1 bg-zinc-700 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4 text-white">Available Policies</h3>
              {policies.length === 0 ? (
                <p className="text-zinc-400">No policies found</p>
              ) : (
                <ul className="space-y-2">
                  {policies.map((policy) => (
                    <li key={policy.id} className="p-3 bg-zinc-800 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className={policy.is_active ? 'text-green-400' : 'text-zinc-400'}>
                          {policy.title}
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(policy)}
                            className="p-1 text-blue-400 hover:text-blue-300"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => togglePolicyStatus(policy.id, policy.is_active)}
                            className={`p-1 ${policy.is_active ? 'text-green-400 hover:text-green-300' : 'text-zinc-400 hover:text-zinc-300'}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(policy.id)}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Last updated: {new Date(policy.updated_at).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="md:col-span-2">
              {editingPolicy ? (
                <div className="bg-zinc-700 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-4 text-white">Edit Policy</h3>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full p-2 bg-zinc-800 border border-zinc-600 rounded-md text-white"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Content (HTML)
                    </label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={15}
                      className="w-full p-2 bg-zinc-800 border border-zinc-600 rounded-md text-white font-mono text-sm"
                    />
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setEditingPolicy(null);
                        setEditTitle('');
                        setEditContent('');
                      }}
                      className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 text-white rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 flex items-center"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-700 p-4 rounded-lg h-full flex items-center justify-center">
                  <p className="text-zinc-400">Select a policy to edit</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeletePolicy}
        title="Delete Policy"
        message="Are you sure you want to delete this policy? This action cannot be undone."
        confirmText="Delete"
        isDangerous={true}
      />
    </div>
  );
}