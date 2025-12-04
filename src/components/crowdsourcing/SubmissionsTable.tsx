'use client';

import { useState } from 'react';
import { MapPin, Clock, CheckCircle, AlertTriangle, Image, Video, ExternalLink } from 'lucide-react';

interface Submission {
  id: string;
  caption: string;
  address: string;
  media_type: string;
  media_url: string;
  submitted_at: string;
  status: string;
  location_uncertain?: boolean;
  location_level?: string;
}

interface SubmissionsTableProps {
  submissions: Submission[];
  onViewDetail?: (submission: Submission) => void;
}

export default function SubmissionsTable({ submissions, onViewDetail }: SubmissionsTableProps) {
  const [page, setPage] = useState(0);
  const perPage = 10;
  
  const approved = submissions.filter(s => s.status === 'approved');
  const paged = approved.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(approved.length / perPage);

  if (!approved.length) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Image size={48} className="mx-auto mb-3 opacity-50" />
        <p>Belum ada kontribusi yang dipublikasikan</p>
        <p className="text-sm mt-1">Jadilah yang pertama mengirim dokumentasi!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Kontribusi Terbaru</h3>
        <span className="text-sm text-slate-400">{approved.length} dokumentasi</span>
      </div>
      
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paged.map((sub, i) => (
          <div key={sub.id} onClick={() => onViewDetail?.(sub)}
            className="bg-slate-800/40 border border-white/5 rounded-xl p-3 cursor-pointer hover:border-white/20">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-700">
                {sub.media_type === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video size={24} className="text-slate-400" />
                  </div>
                ) : (
                  <img src={sub.media_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white line-clamp-2">{sub.caption}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin size={10} /> {sub.address.split(',')[0]}
                  {sub.location_uncertain && <AlertTriangle size={10} className="text-orange-400" />}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(sub.submitted_at).toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-slate-400">
              <th className="pb-3 font-medium">No</th>
              <th className="pb-3 font-medium">Media</th>
              <th className="pb-3 font-medium">Lokasi</th>
              <th className="pb-3 font-medium">Deskripsi</th>
              <th className="pb-3 font-medium">Waktu</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {paged.map((sub, i) => (
              <tr key={sub.id} onClick={() => onViewDetail?.(sub)}
                className="border-b border-white/5 hover:bg-white/5 cursor-pointer">
                <td className="py-3">{page * perPage + i + 1}</td>
                <td className="py-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700">
                    {sub.media_type === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video size={16} className="text-slate-400" />
                      </div>
                    ) : (
                      <img src={sub.media_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    <span className="truncate max-w-[150px]">{sub.address.split(',')[0]}</span>
                    {sub.location_uncertain && (
                      <span className="text-orange-400" title="Lokasi tidak pasti">
                        <AlertTriangle size={12} />
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3">
                  <span className="line-clamp-1 max-w-[200px]">{sub.caption}</span>
                </td>
                <td className="py-3 text-slate-400">
                  {new Date(sub.submitted_at).toLocaleDateString('id-ID')}
                </td>
                <td className="py-3">
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle size={14} /> Terverifikasi
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={`w-8 h-8 rounded-lg text-sm ${page === i ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
