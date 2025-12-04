'use client';

import { useState } from 'react';
import { MapPin, X, Play } from 'lucide-react';
import type { CrowdsourceSubmission } from '@/lib/crowdsourcing/types';

interface SubmissionGalleryProps {
  submissions: CrowdsourceSubmission[];
}

export default function SubmissionGallery({ submissions }: SubmissionGalleryProps) {
  const [selected, setSelected] = useState<CrowdsourceSubmission | null>(null);

  if (!submissions.length) {
    return (
      <div className="text-center py-8 text-slate-400">
        Belum ada dokumentasi yang terverifikasi
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {submissions.map(sub => (
          <div
            key={sub.id}
            onClick={() => setSelected(sub)}
            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group border border-white/5"
          >
            {sub.media_type === 'video' ? (
              <div className="w-full h-full bg-slate-800/50 flex items-center justify-center">
                <Play size={32} className="text-white" />
              </div>
            ) : (
              <img
                src={sub.media_url}
                alt={sub.caption}
                className="w-full h-full object-cover group-hover:scale-105 transition"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition">
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs text-white line-clamp-2">{sub.caption}</p>
              </div>
            </div>
            {sub.media_type === 'video' && (
              <div className="absolute top-2 right-2 bg-black/50 px-2 py-0.5 rounded text-xs">
                Video
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={() => setSelected(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <X size={24} />
          </button>
          <div className="max-w-4xl w-full">
            {selected.media_type === 'video' ? (
              <video src={selected.media_url} controls className="w-full rounded-lg" />
            ) : (
              <img src={selected.media_url} alt={selected.caption} className="w-full rounded-lg" />
            )}
            <div className="mt-4 text-white">
              <p className="text-lg">{selected.caption}</p>
              <p className="text-sm text-slate-400 flex items-center gap-1 mt-2">
                <MapPin size={14} /> {selected.address}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(selected.submitted_at).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
