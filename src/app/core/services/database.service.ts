import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

declare var PouchDB: any;

export interface SyncStatus {
  isOnline: boolean;
  isSync: boolean;
  lastSync?: Date;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: any;
  private remoteDb: any;
  private syncHandler: any;
  private syncStatusSubject = new BehaviorSubject<SyncStatus>({
    isOnline: navigator.onLine,
    isSync: false
  });

  public syncStatus$: Observable<SyncStatus> = this.syncStatusSubject.asObservable();

  constructor() {
    // PouchDB is loaded globally from CDN
    if (typeof PouchDB === 'undefined') {
      throw new Error('PouchDB is not loaded. Please check index.html');
    }
    
    this.db = new PouchDB('creative-writer-stories');
    
    // Create indexes for better query performance
    this.db.createIndex({
      index: { fields: ['createdAt'] }
    }).catch((err: any) => {
      console.warn('Could not create createdAt index:', err);
    });
    
    // Create index for id field (for backward compatibility)
    this.db.createIndex({
      index: { fields: ['id'] }
    }).catch((err: any) => {
      console.warn('Could not create id index:', err);
    });

    // Setup online/offline detection
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));

    // Auto-setup sync if remote URL is available
    this.setupSync();
  }

  getDatabase(): any {
    return this.db;
  }

  async setupSync(remoteUrl?: string): Promise<void> {
    try {
      // Use provided URL or try to detect from environment/location
      const couchUrl = remoteUrl || this.getCouchDBUrl();
      
      if (!couchUrl) {
        console.log('No CouchDB URL configured, running in local-only mode');
        return;
      }

      console.log('Setting up sync with:', couchUrl);
      
      this.remoteDb = new PouchDB(couchUrl, {
        auth: {
          username: 'admin',
          password: 'password' // TODO: Make this configurable
        }
      });

      // Test connection
      await this.remoteDb.info();
      console.log('CouchDB connection successful');

      // Start bidirectional sync
      this.startSync();
      
    } catch (error) {
      console.warn('Could not setup sync:', error);
      this.updateSyncStatus({ error: `Sync setup failed: ${error}` });
    }
  }

  private getCouchDBUrl(): string | null {
    // Try to determine CouchDB URL based on current location
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // For development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:5984/creative-writer-stories`;
    }
    
    // For production (assume same host, different port)
    if (hostname && hostname !== 'localhost') {
      return `${protocol}//${hostname}:5984/creative-writer-stories`;
    }
    
    return null;
  }

  private startSync(): void {
    if (!this.remoteDb) return;

    this.syncHandler = this.db.sync(this.remoteDb, {
      live: true,
      retry: true,
      timeout: 30000
    })
    .on('change', (info: any) => {
      console.log('Sync change:', info);
      this.updateSyncStatus({ 
        isSync: false, 
        lastSync: new Date(),
        error: undefined 
      });
    })
    .on('active', () => {
      console.log('Sync active');
      this.updateSyncStatus({ isSync: true, error: undefined });
    })
    .on('paused', (err: any) => {
      console.log('Sync paused:', err);
      this.updateSyncStatus({ 
        isSync: false, 
        error: err ? `Sync paused: ${err}` : undefined 
      });
    })
    .on('error', (err: any) => {
      console.error('Sync error:', err);
      this.updateSyncStatus({ 
        isSync: false, 
        error: `Sync error: ${err}` 
      });
    });
  }

  private updateOnlineStatus(isOnline: boolean): void {
    this.updateSyncStatus({ isOnline });
  }

  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    const current = this.syncStatusSubject.value;
    this.syncStatusSubject.next({ ...current, ...updates });
  }

  async stopSync(): Promise<void> {
    if (this.syncHandler) {
      this.syncHandler.cancel();
      this.syncHandler = null;
    }
    this.updateSyncStatus({ isSync: false });
  }

  async forcePush(): Promise<void> {
    if (!this.remoteDb) return;
    
    try {
      await this.db.replicate.to(this.remoteDb);
      console.log('Force push completed');
    } catch (error) {
      console.error('Force push failed:', error);
      throw error;
    }
  }

  async forcePull(): Promise<void> {
    if (!this.remoteDb) return;
    
    try {
      await this.db.replicate.from(this.remoteDb);
      console.log('Force pull completed');
    } catch (error) {
      console.error('Force pull failed:', error);
      throw error;
    }
  }

  async compact(): Promise<void> {
    await this.db.compact();
  }

  async destroy(): Promise<void> {
    await this.stopSync();
    await this.db.destroy();
  }
}