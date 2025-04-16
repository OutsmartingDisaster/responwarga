'use client';

import { useState } from 'react';
import WeatherPanel from './info/WeatherPanel';
import UpdatesPanel from './info/UpdatesPanel';

interface InfoPanelProps {
  onClose: () => void;
}

export default function InfoPanel({ onClose }: InfoPanelProps) {
  const [activeTab, setActiveTab] = useState<'weather' | 'updates'>('weather');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md bg-zinc-800 rounded-lg shadow-xl overflow-hidden">
        <div className="p-4 bg-zinc-700 flex justify-between items-center">
          <h2 className="text-xl font-heading font-bold text-white">Info Terbaru</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-zinc-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-zinc-700">
          <button
            onClick={() => setActiveTab('weather')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'weather'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Cuaca
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'updates'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Info Terkini
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'weather' ? (
            <WeatherPanel />
          ) : (
            <UpdatesPanel formatDate={formatDate} />
          )}
        </div>
      </div>
    </div>
  );
}
