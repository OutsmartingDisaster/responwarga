'use client';

import Link from 'next/link';
import { MapPin, Camera, Video, Calendar } from 'lucide-react';
import type { CrowdsourceProject } from '@/lib/crowdsourcing/types';

const disasterIcons: Record<string, string> = {
  flood: '🌊', earthquake: '🌍', fire: '🔥', landslide: '⛰️',
  tsunami: '🌊', volcano: '🌋', storm: '🌪️', drought: '☀️', default: '⚠️'
};

interface ProjectCardProps {
  project: CrowdsourceProject;
  submissionCount?: number;
}

export default function ProjectCard({ project, submissionCount = 0 }: ProjectCardProps) {
  const icon = disasterIcons[project.disaster_type || 'default'] || disasterIcons.default;

  return (
    <Link href={`/crowdsourcing/${project.id}`}>
      <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 hover:border-white/20 hover:bg-slate-800/60 transition-all cursor-pointer">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{project.title}</h3>
            {project.location_name && (
              <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                <MapPin size={14} /> {project.location_name}
              </p>
            )}
            {project.description && (
              <p className="text-sm text-slate-400 mt-2 line-clamp-2">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {project.allow_photo && <span className="flex items-center gap-1"><Camera size={12} /> Foto</span>}
            {project.allow_video && <span className="flex items-center gap-1"><Video size={12} /> Video</span>}
          </div>
          <div className="text-sm text-blue-400 font-medium">
            {submissionCount} dokumentasi
          </div>
        </div>
      </div>
    </Link>
  );
}
