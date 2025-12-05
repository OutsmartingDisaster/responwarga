// IndexedDB store for offline field reports
const DB_NAME = 'responwarga-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-field-reports';

interface PendingFieldReport {
  id: string;
  operationId: string;
  data: any;
  photos: { blob: Blob; filename: string }[];
  createdAt: number;
  syncStatus: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

class FieldReportStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('operationId', 'operationId', { unique: false });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }
      };
    });
  }

  async save(report: Omit<PendingFieldReport, 'id' | 'createdAt' | 'syncStatus' | 'retryCount'>): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const entry: PendingFieldReport = {
      ...report,
      id,
      createdAt: Date.now(),
      syncStatus: 'pending',
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(entry);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<PendingFieldReport[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPending(): Promise<PendingFieldReport[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('syncStatus');
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateStatus(id: string, status: PendingFieldReport['syncStatus'], retryCount?: number): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (entry) {
          entry.syncStatus = status;
          if (retryCount !== undefined) entry.retryCount = retryCount;
          store.put(entry);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async delete(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const fieldReportStore = new FieldReportStore();
export type { PendingFieldReport };
