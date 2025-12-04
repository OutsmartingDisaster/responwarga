import React, { useEffect, useState } from "react";
import { createApiClient } from "@/lib/api-client";

/**
 * EmergencyEventDetails
 * Dedicated page/modal for viewing and managing a single emergency event.
 * - Displays all event details (name, type, date, impacted areas, etc.)
 * - Allows org_admin to assign/unassign team members
 * - Shows activity log for the event
 * - Handles attachments and resource needs
 */
export interface EmergencyEventDetailsProps {
  orgId: string;
  event: {
    id: string;
    name: string;
    type: string;
    date: string;
    impactedAreas: string[];
    location: string;
    severity: string;
    status: string;
    description: string;
    reportedBy: string;
    resourcesNeeded: string[];
    attachments: string[]; // URLs or file names
    assignedMembers: {
      id: string;
      name: string;
      role: string;
      status: string;
    }[];
    activityLog: {
      id: string;
      timestamp: string;
      action: string;
      by: string;
      notes?: string;
    }[];
  };
  onAssignMember: (memberId: string) => void;
  onUnassignMember: (memberId: string) => void;
  onUpdateEvent: (fields: Partial<EmergencyEventDetailsProps["event"]>) => void;
  onAddAttachment: (file: File) => void;
  onRemoveAttachment: (fileName: string) => void;
}

const EmergencyEventDetails: React.FC<EmergencyEventDetailsProps> = ({
  orgId,
  event,
  onAssignMember,
  onUnassignMember,
  onUpdateEvent,
  onAddAttachment,
  onRemoveAttachment,
}) => {
  const api = React.useMemo(() => createApiClient(), []);
  const [members, setMembers] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  useEffect(() => {
    // Fetch organization members
    async function fetchMembers() {
      const { data, error } = await api
        .from("profiles")
        .select("user_id, full_name, role")
        .eq("organization_id", orgId)
        .in("role", ["responder", "org_admin"]);
      if (data) {
        setMembers(
          data.map((m: any) => ({
            id: m.user_id,
            name: m.full_name,
            role: m.role,
          }))
        );
      }
    }
    if (orgId) fetchMembers();
  }, [orgId, api]);

  // Filter out already assigned members
  const availableMembers = members.filter(
    (m) => !event.assignedMembers.some((am) => am.id === m.id)
  );

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Detail Kejadian Darurat</h2>
      {/* Event Info */}
      <div className="mb-4">
        <label className="block font-semibold">Nama Kejadian</label>
        <div>{event.name}</div>
        <label className="block font-semibold mt-2">Jenis Bencana</label>
        <div>{event.type}</div>
        <label className="block font-semibold mt-2">Tanggal & Waktu</label>
        <div>{event.date}</div>
        <label className="block font-semibold mt-2">Wilayah Terdampak</label>
        <div>{event.impactedAreas.join(", ")}</div>
        <label className="block font-semibold mt-2">Lokasi</label>
        <div>{event.location}</div>
        <label className="block font-semibold mt-2">Tingkat Keparahan</label>
        <div>{event.severity}</div>
        <label className="block font-semibold mt-2">Status</label>
        <div>{event.status}</div>
        <label className="block font-semibold mt-2">Deskripsi</label>
        <div>{event.description}</div>
        <label className="block font-semibold mt-2">Dilaporkan Oleh</label>
        <div>{event.reportedBy}</div>
        <label className="block font-semibold mt-2">Kebutuhan Sumber Daya</label>
        <div>{event.resourcesNeeded.join(", ")}</div>
      </div>

      {/* Attachments */}
      <div className="mb-4">
        <label className="block font-semibold">Lampiran</label>
        <ul>
          {event.attachments.map((file, idx) => (
            <li key={idx} className="flex items-center">
              <a href={file} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{file}</a>
              <button
                className="ml-2 text-red-500"
                onClick={() => onRemoveAttachment(file)}
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
        <input
          type="file"
          className="mt-2"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              onAddAttachment(e.target.files[0]);
            }
          }}
        />
      </div>

      {/* Assigned Members */}
      <div className="mb-4">
        <label className="block font-semibold">Anggota Tim Ditugaskan</label>
        <ul>
          {event.assignedMembers.map(member => (
            <li key={member.id} className="flex items-center">
              <span>{member.name} ({member.role}) - {member.status}</span>
              <button
                className="ml-2 text-red-500"
                onClick={() => onUnassignMember(member.id)}
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
        {/* TODO: Add dropdown to assign new member */}
        <div className="mt-2">
          <label className="block">Tambah Anggota:</label>
          <select
            className="border rounded px-2 py-1 mr-2"
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
          >
            <option value="">Pilih anggota...</option>
            {availableMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>
          <button
            className="bg-blue-500 text-white px-3 py-1 rounded"
            disabled={!selectedMemberId}
            onClick={() => {
              if (selectedMemberId) {
                onAssignMember(selectedMemberId);
                setSelectedMemberId("");
              }
            }}
          >
            Assign
          </button>
        </div>
      </div>

      {/* Activity Log */}
      <div>
        <label className="block font-semibold">Log Aktivitas</label>
        <ul className="mt-2">
          {event.activityLog.map(log => (
            <li key={log.id} className="mb-1">
              <span className="text-gray-600 text-sm">{log.timestamp}</span> - <span className="font-semibold">{log.action}</span> oleh <span>{log.by}</span>
              {log.notes && <span>: {log.notes}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default EmergencyEventDetails;
