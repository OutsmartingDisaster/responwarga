'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/../lib/supabase/client';
import React from 'react';

interface Contribution {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  address: string;
  description: string;
  contribution_type: string;
  capacity: string | null;
  facilities: Record<string, boolean> | null;
  quantity: string | null;
  unit: string | null;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  status: 'active' | 'inactive' | 'verified' | 'assigned';
  assigned_to?: string;
  responder_status?: 'diterima' | 'sedang_berjalan' | 'selesai' | 'batal' | null;
  shelter?: string;
  created_at: string;
  show_contact_info: boolean;
}

export default function ContributionsTable({ responderView = false }: { responderView?: boolean }) {
  const supabase = createClient();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchContributions();
    fetchCurrentUser();
  }, []);

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContributions(data || []);
    } catch (err: any) {
      console.error('Error fetching contributions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    setCurrentUser(data.user);
  };

  const updateResponderStatus = async (
    id: number,
    responder_status: 'diterima' | 'sedang_berjalan' | 'selesai' | 'batal'
  ) => {
    try {
      const { error } = await supabase
        .from('contributions')
        .update({ responder_status })
        .eq('id', id);

      if (error) throw error;
      setContributions(prev =>
        prev.map(contribution =>
          contribution.id === id ? { ...contribution, responder_status } : contribution
        )
      );
    } catch (err: any) {
      console.error('Error updating responder status:', err);
      setError(err.message);
    }
  };

  const updateStatus = async (id: number, status: 'active' | 'inactive') => {
    try {
      const { error } = await supabase
        .from('contributions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      setContributions(prev => prev.map(contribution => 
        contribution.id === id ? { ...contribution, status } : contribution
      ));
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.message);
    }
  };

  const deleteContribution = async (id: number) => {
    try {
      const { error } = await supabase
        .from('contributions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setContributions(prev => prev.filter(contribution => contribution.id !== id));
    } catch (err: any) {
      console.error('Error deleting contribution:', err);
      setError(err.message);
    }
  };

  const toggleRow = (id: number) => {
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
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-zinc-300">
          <thead className="text-xs uppercase bg-zinc-800 text-zinc-400">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Responder Status</th>
              <th className="px-4 py-3">Created At</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map((contribution) => (
              <React.Fragment key={contribution.id}>
                <tr className="border-b border-zinc-700 bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleRow(contribution.id)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <svg 
                        className={`w-5 h-5 transform transition-transform ${expandedRows[contribution.id] ? 'rotate-90' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-4 py-3">{contribution.id}</td>
                  <td className="px-4 py-3">{contribution.full_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      contribution.contribution_type === 'shelter' ? 'bg-purple-900/50 text-purple-200' :
                      contribution.contribution_type === 'food_water' ? 'bg-blue-900/50 text-blue-200' :
                      contribution.contribution_type === 'medical' ? 'bg-green-900/50 text-green-200' :
                      'bg-yellow-900/50 text-yellow-200'
                    }`}>
                      {contribution.contribution_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={contribution.status}
                      onChange={(e) => updateStatus(contribution.id, e.target.value as any)}
                      className="bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {contribution.responder_status ? (
                      <span className="capitalize">
                        {contribution.responder_status.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(contribution.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {responderView ? (
                      <div className="flex flex-col gap-1">
                        {(!contribution.assigned_to || contribution.assigned_to === "") ? (
                          <button
                            onClick={async () => {
                              // Assign to current user/org and set status to "assigned"
                              const user = supabase.auth.getUser();
                              const userData = (await user).data.user;
                              const name = userData?.user_metadata?.full_name || userData?.email || "Responder";
                              await supabase
                                .from('contributions')
                                .update({ assigned_to: name, status: 'assigned' })
                                .eq('id', contribution.id);
                              setContributions(prev => prev.map(c =>
                                c.id === contribution.id
                                  ? { ...c, assigned_to: name, status: 'assigned' }
                                  : c
                              ));
                            }}
                            className="text-blue-500 hover:text-blue-400"
                          >
                            Assign to me
                          </button>
                        ) : (
                          <>
                            <span className="text-green-400 text-xs font-semibold">
                              Assigned to {contribution.assigned_to}
                            </span>
                            {/* Responder status actions for assigned responder */}
                            {currentUser &&
                              contribution.assigned_to &&
                              (contribution.assigned_to === currentUser.user_metadata?.full_name ||
                                contribution.assigned_to === currentUser.email) && (
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={() => updateResponderStatus(contribution.id, 'diterima')}
                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                      contribution.responder_status === 'diterima'
                                        ? 'bg-blue-700 text-white'
                                        : 'bg-zinc-700 text-blue-300'
                                    }`}
                                  >
                                    Diterima
                                  </button>
                                  <button
                                    onClick={() => updateResponderStatus(contribution.id, 'sedang_berjalan')}
                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                      contribution.responder_status === 'sedang_berjalan'
                                        ? 'bg-yellow-700 text-white'
                                        : 'bg-zinc-700 text-yellow-300'
                                    }`}
                                  >
                                    Sedang Berjalan
                                  </button>
                                  <button
                                    onClick={() => updateResponderStatus(contribution.id, 'selesai')}
                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                      contribution.responder_status === 'selesai'
                                        ? 'bg-green-700 text-white'
                                        : 'bg-zinc-700 text-green-300'
                                    }`}
                                  >
                                    Selesai
                                  </button>
                                  <button
                                    onClick={() => updateResponderStatus(contribution.id, 'batal')}
                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                      contribution.responder_status === 'batal'
                                        ? 'bg-red-700 text-white'
                                        : 'bg-zinc-700 text-red-300'
                                    }`}
                                  >
                                    Batal
                                  </button>
                                </div>
                              )}
                          </>
                        )}
                        {/* Verify button */}
                        {contribution.status !== "verified" && contribution.assigned_to && (
                          <button
                            onClick={async () => {
                              await supabase
                                .from('contributions')
                                .update({ status: 'verified' })
                                .eq('id', contribution.id);
                              setContributions(prev => prev.map(c =>
                                c.id === contribution.id
                                  ? { ...c, status: 'verified' }
                                  : c
                              ));
                            }}
                            className="text-green-500 hover:text-green-400 text-xs"
                          >
                            Verify
                          </button>
                        )}
                        {/* Assign to shelter */}
                        <div className="flex items-center gap-1 mt-1">
                          <label className="text-xs text-zinc-400">Shelter:</label>
                          <select
                            value={contribution.shelter || ""}
                            onChange={async (e) => {
                              const shelter = e.target.value;
                              await supabase
                                .from('contributions')
                                .update({ shelter })
                                .eq('id', contribution.id);
                              setContributions(prev => prev.map(c =>
                                c.id === contribution.id
                                  ? { ...c, shelter }
                                  : c
                              ));
                            }}
                            className="bg-zinc-700 border border-zinc-600 text-white text-xs rounded p-1"
                          >
                            <option value="">-</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => deleteContribution(contribution.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
                {expandedRows[contribution.id] && (
                  <tr className="bg-zinc-800/30">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-zinc-400">Contact Information</h4>
                            <div className="mt-1 space-y-1">
                              {contribution.show_contact_info ? (
                                <>
                                  <p className="text-sm">
                                    <span className="text-zinc-400">Phone:</span>{' '}
                                    <a href={`tel:${contribution.phone_number}`} className="text-blue-400 hover:text-blue-300">
                                      {contribution.phone_number}
                                    </a>
                                  </p>
                                  <p className="text-sm">
                                    <span className="text-zinc-400">Email:</span>{' '}
                                    <a href={`mailto:${contribution.email}`} className="text-blue-400 hover:text-blue-300">
                                      {contribution.email}
                                    </a>
                                  </p>
                                </>
                              ) : (
                                <p className="text-sm text-zinc-400">Contact information is private</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-zinc-400">Location</h4>
                            <div className="mt-1 space-y-1">
                              <p className="text-sm">{contribution.address}</p>
                              {typeof contribution.latitude === 'number' && typeof contribution.longitude === 'number' ? (
                                <>
                                  <p className="text-sm text-zinc-400">
                                    Coordinates: {contribution.latitude.toFixed(6)}, {contribution.longitude.toFixed(6)}
                                  </p>
                                  <a
                                    href={`https://www.google.com/maps?q=${contribution.latitude},${contribution.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 text-sm inline-block mt-1"
                                  >
                                    View on Google Maps
                                  </a>
                                </>
                              ) : (
                                <p className="text-sm text-zinc-400">Coordinates not available</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-zinc-400">Contribution Details</h4>
                            {contribution.contribution_type === 'shelter' ? (
                              <div className="mt-2 space-y-2">
                                <p className="text-sm">
                                  <span className="text-zinc-400">Capacity:</span> {contribution.capacity} people
                                </p>
                                {contribution.facilities && (
                                  <div>
                                    <p className="text-sm text-zinc-400">Available Facilities:</p>
                                    <ul className="mt-1 space-y-1">
                                      {Object.entries(contribution.facilities)
                                        .filter(([_, value]) => value)
                                        .map(([key]) => (
                                          <li key={key} className="text-sm flex items-center">
                                            <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            {key.replace('_', ' ')}
                                          </li>
                                        ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="mt-2">
                                <p className="text-sm">
                                  <span className="text-zinc-400">Quantity:</span> {contribution.quantity} {contribution.unit}
                                </p>
                              </div>
                            )}
                            <p className="mt-2 text-sm whitespace-pre-wrap">{contribution.description}</p>
                          </div>
                          {contribution.photo_url && (
                            <div>
                              <h4 className="text-sm font-medium text-zinc-400">Photo</h4>
                              <a
                                href={contribution.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block"
                              >
                                <img
                                  src={contribution.photo_url}
                                  alt="Contribution"
                                  className="max-w-sm rounded-lg shadow-lg"
                                />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
