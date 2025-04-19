'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';

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
  status: EmergencyReportStatus;
  assigned_to?: string;
  responder_status?: 'diterima' | 'sedang_berjalan' | 'selesai' | 'batal' | null;
  created_at: string;
  org_responder_id?: string;
  responder_id?: string;
  org_responder_name?: string;
  responder_name?: string;
  cancellation_reason?: string;
  cancellation_requester_id?: string;
  cancellation_requested_at?: string;
}

// Central type definition for all possible statuses
export type EmergencyReportStatus =
  | 'pending'
  | 'verified'
  | 'ditugaskan'
  | 'on progress'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'cancellation_pending';

// Define props type for the cancellation modal
interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  reason: string;
  setReason: (reason: string) => void;
}

// RE-INSERT Cancellation Modal Component Definition
const CancellationModal: React.FC<CancellationModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  reason, 
  setReason 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-zinc-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-white">Request Report Cancellation</h2>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please provide a reason for cancellation..."
          className="w-full p-2 rounded bg-zinc-700 border border-zinc-600 text-white placeholder-zinc-400 focus:ring-blue-500 focus:border-blue-500 mb-4 h-24 resize-none"
          rows={4}
        />
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded bg-zinc-600 hover:bg-zinc-500 text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onSubmit} 
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
            disabled={!reason.trim()} // Disable if reason is empty
          >
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
};

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (responderId: string) => void;
  responders: { id: string; name: string }[];
  selectedResponder: string;
  setSelectedResponder: (id: string) => void;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ 
  isOpen, onClose, onSubmit, responders, selectedResponder, setSelectedResponder
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-zinc-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-white">Assign Responder</h2>
        {responders.length === 0 ? (
          <p className="text-zinc-400">No available responders found for your organization.</p>
        ) : (
          <select 
            value={selectedResponder}
            onChange={(e) => setSelectedResponder(e.target.value)}
            className="w-full p-2 rounded bg-zinc-700 border border-zinc-600 text-white mb-4"
          >
            <option value="">Select Responder</option>
            {responders.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-zinc-600 hover:bg-zinc-500 text-white">Cancel</button>
          <button 
            onClick={() => onSubmit(selectedResponder)}
            disabled={!selectedResponder || responders.length === 0}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
};

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
  
  // State for cancellation modal - RE-ADD
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [reportToCancel, setReportToCancel] = useState<EmergencyReport | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // State for assignment modal - ADD
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [reportToAssign, setReportToAssign] = useState<EmergencyReport | null>(null);
  const [availableResponders, setAvailableResponders] = useState<{ id: string; name: string }[]>([]);
  const [selectedResponderId, setSelectedResponderId] = useState('');

  useEffect(() => {
    fetchReports();
    fetchCurrentUser();
    fetchResponders(); // Fetch responders on mount
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // Select all necessary fields
      const { data, error } = await supabase
        .from('emergency_reports')
        .select('*' 
          // Optionally join names if not denormalized:
          // , org_responder:organizations ( name ), responder:profiles ( full_name ) 
        )
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

  // Fetch Responders for the current admin's org (Placeholder)
  const fetchResponders = async () => {
    // TODO: Implement actual fetching logic
    // 1. Get current admin's org_id (from currentUser.user_metadata?)
    // 2. Query profiles/users table: SELECT id, full_name from profiles where org_id = 'admin_org_id' AND role = 'org_responder'
    console.log("Placeholder: Fetching responders...");
    // Example data
    setAvailableResponders([
      { id: 'responder-uuid-1', name: 'Responder Satu' },
      { id: 'responder-uuid-2', name: 'Responder Dua' },
    ]);
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

  const updateStatus = async (id: number, status: EmergencyReportStatus) => {
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

  // Function to open the cancellation modal - RE-ADD
  const openCancellationModal = (report: EmergencyReport) => {
    setReportToCancel(report);
    setCancellationReason(''); 
    setIsCancelModalOpen(true);
  };

  // Function to close the cancellation modal - RE-ADD
  const closeCancellationModal = () => {
    setIsCancelModalOpen(false);
    setReportToCancel(null);
  };

  // handleCancellationSubmit uses fixed state var names
  const handleCancellationSubmit = async () => {
    if (!reportToCancel || !cancellationReason.trim()) return;
    
    // Define variables needed within the function scope
    const reportId = reportToCancel.id;
    const reason = cancellationReason.trim();

    try {
      setLoading(true);
      const { error: rpcError } = await supabase.rpc('request_cancellation', {
        p_report_id: reportId,
        p_reason: reason
      });

      if (rpcError) throw rpcError;
      
      setReports(prevReports =>
        prevReports.map(report =>
          report.id === reportId
            ? { 
                ...report, 
                status: 'cancellation_pending', 
                cancellation_reason: reason,
              } 
            : report
        )
      );
      closeCancellationModal();
      alert('Cancellation request submitted successfully.');
    } catch (err: any) { 
      console.error('Error requesting cancellation via RPC:', err);
      setError(`Failed to request cancellation: ${err.message}`);
      alert(`Error requesting cancellation: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  // Functions for Assignment Modal - ADD
  const openAssignModal = (report: EmergencyReport) => {
    setReportToAssign(report);
    setSelectedResponderId(''); // Reset selection
    setIsAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setReportToAssign(null);
  };

  const handleAssignSubmit = async (responderId: string) => {
    if (!reportToAssign || !responderId) return;

    const reportId = reportToAssign.id;
    const orgId = currentUser?.user_metadata?.org_id; // Get admin's org id

    if (!orgId) {
        alert("Error: Could not determine your organization ID.");
        return;
    }

    console.log(`Assigning report ${reportId} to responder ${responderId} in org ${orgId}`);
    // TODO: Call assign_emergency_report RPC
    try {
      setLoading(true);
      const { error: rpcError } = await supabase.rpc('assign_emergency_report', {
        report_id: reportId,
        p_org_responder_id: orgId, // Admin's Org ID
        p_responder_id: responderId // Selected Responder ID
      });
      if (rpcError) throw rpcError;

      // Optimistic update or refetch reports
      // For optimistic, we need responder/org names somehow
      const assignedResponder = availableResponders.find(r => r.id === responderId);
      // Assuming org name is in admin metadata or fetched elsewhere
      const orgName = currentUser?.user_metadata?.org_name || 'Unknown Org'; 

      setReports(prev => prev.map(r => 
        r.id === reportId 
          ? { ...r, 
              status: 'ditugaskan', 
              responder_id: responderId, 
              org_responder_id: orgId,
              responder_name: assignedResponder?.name || 'Unknown Responder',
              org_responder_name: orgName
            }
          : r
      ));

      closeAssignModal();
      alert('Report assigned successfully (Placeholder).');
    } catch (err: any) {
      console.error("Error assigning report:", err);
      setError(`Failed to assign report: ${err.message}`);
      alert(`Error assigning report: ${err.message}`);
    } finally {
      setLoading(false);
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
                    {responderView ? (
                      // --- RESPONDER VIEW --- 
                      <>
                        {(!report.responder_id) ? ( 
                           // TODO: Per discussion, remove "Assign to me" button for responders
                           <span className="text-zinc-500">Not Assigned</span> 
                        ) : (
                          <>
                            {/* Display "Ditugaskan ke..." message */}
                            <span className="text-indigo-400 text-xs font-semibold">
                              Ditugaskan ke {report.responder_name || 'N/A'} dari {report.org_responder_name || 'N/A'}
                            </span>
                            {currentUser &&
                              report.responder_id &&
                              report.responder_id === currentUser.id && (
                                <div className="mt-2 flex gap-2">
                                   {/* Diterima, Sedang Berjalan, Selesai buttons */}
                                   {/* ... */}
                                  <button
                                    onClick={() => updateResponderStatus(report.id, 'diterima')}
                                    /* ... className ... */
                                  > Diterima </button>
                                  <button
                                    onClick={() => updateResponderStatus(report.id, 'sedang_berjalan')}
                                    /* ... className ... */
                                  > Sedang Berjalan </button>
                                  <button
                                    onClick={() => updateResponderStatus(report.id, 'selesai')}
                                    /* ... className ... */
                                  > Selesai </button>
                                  {/* Batal Button (Responder) -> Opens Cancel Modal */}
                                  <button
                                    onClick={() => openCancellationModal(report)} 
                                    className={`px-2 py-1 rounded text-xs font-semibold bg-zinc-700 text-red-300`}
                                  >
                                    Batal
                                  </button>
                                </div>
                              )}
                          </>
                        )}
                      </>
                    ) : (
                      // --- ADMIN VIEW --- 
                      <select
                        value={report.status} // Ensure report.status matches one of the option values
                        onChange={(e) =>
                          updateStatus(report.id, e.target.value as EmergencyReportStatus)
                        }
                        className={`p-1 rounded text-xs bg-zinc-700 border border-zinc-600 placeholder-zinc-400 text-white focus:ring-blue-500 focus:border-blue-500 ...`}
                        // TODO: Disable based on role/permissions if needed
                      >
                        {/* Add all relevant status options for admin */}
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="ditugaskan">Ditugaskan</option>
                        <option value="on progress">On Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancellation_pending">Cancellation Pending</option>
                      </select>
                    )}
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
                       // Actions are in Status column for responder
                       <span className="text-zinc-500">-</span> 
                    ) : (
                      // --- ADMIN VIEW ACTIONS --- 
                      <div className="flex items-center gap-3"> {/* Use items-center for vertical alignment */} 
                        {/* Details Button */}
                        <button
                          onClick={() => onViewDetails ? onViewDetails(report) : toggleRow(report.id)} // Can toggle details if no specific handler
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="View Details"
                        >
                          {/* Simple Icon for Details - replace if you have a better one */}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </button>

                        {/* Assign ("Tugaskan") Button - Show only if status is 'verified' */}
                        {report.status === 'verified' && (
                          <button
                            onClick={() => openAssignModal(report)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors shadow"
                            title="Assign Responder"
                          >
                            Tugaskan
                          </button>
                        )}
                        
                        {/* Cancel Button - Show unless completed/cancelled? */}
                        {report.status !== 'completed' && report.status !== 'cancelled' && (
                          <button
                            onClick={() => openCancellationModal(report)} 
                            className="text-yellow-500 hover:text-yellow-400 transition-colors"
                            title="Request Cancellation"
                          >
                             {/* Simple Icon for Cancel - replace if you have a better one */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L10 8.586 7.707 6.293a1 1 0 00-1.414 1.414L8.586 10l-2.293 2.293a1 1 0 101.414 1.414L10 11.414l2.293 2.293a1 1 0 001.414-1.414L11.414 10l2.293-2.293z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="text-red-500 hover:text-red-400 transition-colors"
                           title="Delete Report"
                        >
                           {/* Simple Icon for Delete - replace if you have a better one */}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                             <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                           </svg>
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
      {/* Render Modals */}
      <CancellationModal 
        isOpen={isCancelModalOpen}
        onClose={closeCancellationModal}
        onSubmit={handleCancellationSubmit}
        reason={cancellationReason}
        setReason={setCancellationReason}
      />
      <AssignmentModal 
        isOpen={isAssignModalOpen}
        onClose={closeAssignModal}
        onSubmit={handleAssignSubmit}
        responders={availableResponders}
        selectedResponder={selectedResponderId}
        setSelectedResponder={setSelectedResponderId}
      />
    </div>
  );
}

// Remove the renaming attempt as the component should be defined earlier
// const CancellationModalComponent = CancellationModal; 
