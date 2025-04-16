'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/../lib/supabase/client';
import React from 'react';

interface EmergencyReport {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  address: string;
  description: string;
  assistance_type: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  status: 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan';
  assigned_to?: string;
  responder_status?: 'diterima' | 'sedang_berjalan' | 'selesai' | 'batal' | null;
  created_at: string;
}

export default function EmergencyReportsTable({
  responderView = false,
  onViewDetails,
}: {
  responderView?: boolean;
  onViewDetails?: (report: EmergencyReport) => void;
}) {
  const supabase = createClient();
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchReports();
    fetchCurrentUser();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('emergency_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
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
        .from('emergency_reports')
        .update({ responder_status })
        .eq('id', id);

      if (error) throw error;
      setReports(prev =>
        prev.map(report =>
          report.id === id ? { ...report, responder_status } : report
        )
      );
    } catch (err: any) {
      console.error('Error updating responder status:', err);
      setError(err.message);
    }
  };

  const updateStatus = async (id: number, status: 'menunggu' | 'diproses' | 'selesai' | 'dibatalkan') => {
    try {
      const { error } = await supabase
        .from('emergency_reports')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      setReports(prev => prev.map(report => 
        report.id === id ? { ...report, status } : report
      ));
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.message);
    }
  };

  const deleteReport = async (id: number) => {
    try {
      const { error } = await supabase
        .from('emergency_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setReports(prev => prev.filter(report => report.id !== id));
    } catch (err: any) {
      console.error('Error deleting report:', err);
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
            {reports.map((report) => (
              <React.Fragment key={report.id}>
                <tr className="border-b border-zinc-700 bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleRow(report.id)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <svg 
                        className={`w-5 h-5 transform transition-transform ${expandedRows[report.id] ? 'rotate-90' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-4 py-3">{report.id}</td>
                  <td className="px-4 py-3">{report.full_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      report.assistance_type === 'evacuation' ? 'bg-red-900/50 text-red-200' :
                      report.assistance_type === 'food_water' ? 'bg-blue-900/50 text-blue-200' :
                      report.assistance_type === 'medical' ? 'bg-green-900/50 text-green-200' :
                      'bg-yellow-900/50 text-yellow-200'
                    }`}>
                      {report.assistance_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={report.status}
                      onChange={(e) => updateStatus(report.id, e.target.value as any)}
                      className="bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                      <option value="menunggu">Menunggu</option>
                      <option value="diproses">Diproses</option>
                      <option value="selesai">Selesai</option>
                      <option value="dibatalkan">Dibatalkan</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {report.responder_status ? (
                      <span className="capitalize">
                        {report.responder_status.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {responderView ? (
                      <>
                        {(!report.assigned_to || report.assigned_to === "") ? (
                          <button
                            onClick={async () => {
                              // Assign to current user/org and set status to "diproses"
                              const user = supabase.auth.getUser();
                              const userData = (await user).data.user;
                              const name = userData?.user_metadata?.full_name || userData?.email || "Responder";
                              await supabase
                                .from('emergency_reports')
                                .update({ assigned_to: name, status: 'diproses' })
                                .eq('id', report.id);
                              setReports(prev => prev.map(r =>
                                r.id === report.id
                                  ? { ...r, assigned_to: name, status: 'diproses' }
                                  : r
                              ));
                            }}
                            className="text-blue-500 hover:text-blue-400"
                          >
                            Assign to me
                          </button>
                        ) : (
                          <>
                            <span className="text-green-400 text-xs font-semibold">
                              Assigned to {report.assigned_to}
                            </span>
                            {/* Responder status actions for assigned responder */}
                            {currentUser &&
                              report.assigned_to &&
                              (report.assigned_to === currentUser.user_metadata?.full_name ||
                                report.assigned_to === currentUser.email) && (
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={() => updateResponderStatus(report.id, 'diterima')}
                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                      report.responder_status === 'diterima'
                                        ? 'bg-blue-700 text-white'
                                        : 'bg-zinc-700 text-blue-300'
                                    }`}
                                  >
                                    Diterima
                                  </button>
                                  <button
                                    onClick={() => updateResponderStatus(report.id, 'sedang_berjalan')}
                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                      report.responder_status === 'sedang_berjalan'
                                        ? 'bg-yellow-700 text-white'
                                        : 'bg-zinc-700 text-yellow-300'
                                    }`}
                                  >
                                    Sedang Berjalan
                                  </button>
                                  <button
                                    onClick={() => updateResponderStatus(report.id, 'selesai')}
                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                      report.responder_status === 'selesai'
                                        ? 'bg-green-700 text-white'
                                        : 'bg-zinc-700 text-green-300'
                                    }`}
                                  >
                                    Selesai
                                  </button>
                                  <button
                                    onClick={() => updateResponderStatus(report.id, 'batal')}
                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                      report.responder_status === 'batal'
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
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => onViewDetails && onViewDetails(report)}
                          className="text-blue-500 hover:text-blue-400"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                {expandedRows[report.id] && (
                  <tr className="bg-zinc-800/30">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-zinc-400">Contact Information</h4>
                            <div className="mt-1 space-y-1">
                              <p className="text-sm">
                                <span className="text-zinc-400">Phone:</span>{' '}
                                <a href={`tel:${report.phone_number}`} className="text-blue-400 hover:text-blue-300">
                                  {report.phone_number}
                                </a>
                              </p>
                              <p className="text-sm">
                                <span className="text-zinc-400">Email:</span>{' '}
                                <a href={`mailto:${report.email}`} className="text-blue-400 hover:text-blue-300">
                                  {report.email}
                                </a>
                              </p>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-zinc-400">Location</h4>
                            <div className="mt-1 space-y-1">
                              <p className="text-sm">{report.address}</p>
                              <p className="text-sm text-zinc-400">
                                Coordinates: {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                              </p>
                              <a
                                href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm inline-block mt-1"
                              >
                                View on Google Maps
                              </a>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-zinc-400">Emergency Details</h4>
                            <p className="mt-1 text-sm whitespace-pre-wrap">{report.description}</p>
                          </div>
                          {report.photo_url && (
                            <div>
                              <h4 className="text-sm font-medium text-zinc-400">Photo</h4>
                              <a
                                href={report.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block"
                              >
                                <img
                                  src={report.photo_url}
                                  alt="Emergency situation"
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
