'use client';

import { useState, useEffect, useCallback } from 'react';
import { fieldReportStore } from '@/lib/offline/fieldReportStore';
import { syncService } from '@/lib/offline/syncService';

export function useOfflineFieldReport() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Start sync service
    syncService.start();

    // Update pending count
    const updateCount = async () => {
      const count = await syncService.getPendingCount();
      setPendingCount(count);
    };
    updateCount();
    const interval = setInterval(updateCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const saveOffline = useCallback(async (
    operationId: string,
    data: any,
    photoFiles: File[]
  ): Promise<string> => {
    // Convert files to blobs for storage
    const photos = await Promise.all(
      photoFiles.map(async (file) => ({
        blob: file,
        filename: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`
      }))
    );

    const id = await fieldReportStore.save({ operationId, data, photos });
    setPendingCount(prev => prev + 1);
    return id;
  }, []);

  const manualSync = useCallback(async () => {
    if (!isOnline) return { synced: 0, failed: 0 };
    
    setIsSyncing(true);
    try {
      const result = await syncService.sync();
      const count = await syncService.getPendingCount();
      setPendingCount(count);
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    saveOffline,
    manualSync
  };
}
