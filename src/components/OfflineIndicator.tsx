'use client';

import React from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { useOfflineFieldReport } from '@/hooks/useOfflineFieldReport';

export default function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, manualSync } = useOfflineFieldReport();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 ${
      isOnline ? 'bg-blue-600' : 'bg-orange-600'
    } text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3`}>
      {isOnline ? (
        <Wifi className="w-5 h-5 flex-shrink-0" />
      ) : (
        <WifiOff className="w-5 h-5 flex-shrink-0" />
      )}
      
      <div className="flex-1 min-w-0">
        {!isOnline ? (
          <p className="text-sm font-medium">Mode Offline</p>
        ) : pendingCount > 0 ? (
          <p className="text-sm font-medium">{pendingCount} laporan menunggu sinkronisasi</p>
        ) : null}
        
        {!isOnline && (
          <p className="text-xs opacity-80">Laporan akan disimpan & dikirim saat online</p>
        )}
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          onClick={manualSync}
          disabled={isSyncing}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          title="Sinkronkan sekarang"
        >
          {isSyncing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <RefreshCw className="w-5 h-5" />
          )}
        </button>
      )}
    </div>
  );
}
