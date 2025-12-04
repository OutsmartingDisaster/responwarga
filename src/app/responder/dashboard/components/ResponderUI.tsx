"use client";
import React from 'react';
import {
    MapPin,
    Clock,
    Users,
    ChevronRight,
    Camera,
    Edit2,
    Trash2
} from 'lucide-react';
import { Badge } from '../../../components/DashboardSharedUI';

export const ResponderTaskCard = ({ title, priority, distance, time, crew, desc, onAction }: any) => (
    <div onClick={onAction} className="bg-slate-800/60 backdrop-blur-md border border-white/5 hover:bg-slate-800 hover:border-white/20 p-5 rounded-2xl cursor-pointer transition-all group relative overflow-hidden active:scale-95 duration-200">
        <div className={`absolute top-0 left-0 w-1.5 h-full ${priority === 'URGENT' ? 'bg-red-500' : 'bg-orange-500'}`} />
        <div className="pl-4">
            <div className="flex justify-between items-start mb-2">
                <Badge color={priority === 'URGENT' ? 'red' : 'orange'}>{priority}</Badge>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">{title}</h3>
            <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-3">
                <span className="flex items-center gap-1"><MapPin size={12} /> {distance}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
                <span className="flex items-center gap-1"><Users size={12} /> {crew}</span>
            </div>
            <p className="text-sm text-slate-400 mb-4 line-clamp-2">{desc}</p>
            <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-white/5 transition-colors">
                    <Camera size={16} /> Unggah Bukti
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white rounded-lg text-xs font-medium border border-orange-500/20 hover:border-orange-500 transition-colors">
                    {priority === 'URGENT' ? 'Selesai' : 'Proses'}
                </button>
            </div>
        </div>
    </div>
);

export const LogEntry = ({ time, title, location, desc, photos, duration }: any) => (
    <div className="flex gap-4 p-4 rounded-xl bg-slate-800/20 border border-white/5 hover:bg-slate-800/40 transition-all">
        <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300">
                {time.split(':')[0]}
            </div>
            <div className="w-0.5 h-full bg-white/5 my-2"></div>
        </div>
        <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
                <h4 className="text-white font-bold">{time} - {title}</h4>
                <div className="flex gap-2">
                    <button className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"><Edit2 size={14} /></button>
                    <button className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
                </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-1"><MapPin size={12} /> {location}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {duration}</span>
            </div>
            <p className="text-sm text-slate-300 mb-3">{desc}</p>
            {photos > 0 && (
                <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded w-fit border border-blue-500/20">
                    <Camera size={12} /> {photos} foto terlampir
                </div>
            )}
        </div>
    </div>
);
