// Background sync service for offline field reports
import { fieldReportStore, PendingFieldReport } from './fieldReportStore';

class SyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  async start() {
    if (typeof window === 'undefined') return;

    // Listen for online events
    window.addEventListener('online', () => this.sync());

    // Periodic sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) this.sync();
    }, 30000);

    // Initial sync if online
    if (navigator.onLine) this.sync();
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async sync(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    this.isSyncing = true;

    let synced = 0;
    let failed = 0;

    try {
      const pending = await fieldReportStore.getPending();
      
      for (const report of pending) {
        try {
          await this.syncReport(report);
          await fieldReportStore.delete(report.id);
          synced++;
        } catch (err) {
          console.error(`Failed to sync report ${report.id}:`, err);
          const newRetryCount = report.retryCount + 1;
          if (newRetryCount >= 3) {
            await fieldReportStore.updateStatus(report.id, 'failed', newRetryCount);
          } else {
            await fieldReportStore.updateStatus(report.id, 'pending', newRetryCount);
          }
          failed++;
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { synced, failed };
  }

  private async syncReport(report: PendingFieldReport): Promise<void> {
    await fieldReportStore.updateStatus(report.id, 'syncing');

    // First upload photos if any
    const uploadedPhotos: string[] = [];
    for (const photo of report.photos) {
      const formData = new FormData();
      formData.append('file', photo.blob, photo.filename);
      formData.append('bucket', 'field-reports');
      formData.append('path', `${report.operationId}/${photo.filename}`);

      const uploadRes = await fetch('/api/uploads', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Photo upload failed');
      
      uploadedPhotos.push(`/uploads/field-reports/${report.operationId}/${photo.filename}`);
    }

    // Then submit the report
    const response = await fetch(`/api/operations/${report.operationId}/field-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...report.data, photos: uploadedPhotos })
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Sync failed');
    }
  }

  async getPendingCount(): Promise<number> {
    return fieldReportStore.count();
  }

  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
}

export const syncService = new SyncService();
