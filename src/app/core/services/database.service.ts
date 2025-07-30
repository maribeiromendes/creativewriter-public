import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

declare let PouchDB: any;

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
  private initializationPromise: Promise<void> | null = null;
  private syncStatusSubject = new BehaviorSubject<SyncStatus>({
    isOnline: navigator.onLine,
    isSync: false
  });

  public syncStatus$: Observable<SyncStatus> = this.syncStatusSubject.asObservable();

  constructor(private authService: AuthService) {
    // PouchDB is loaded globally from CDN
    if (typeof PouchDB === 'undefined') {
      throw new Error('PouchDB is not loaded. Please check index.html');
    }
    
    // Initialize with default database (will be updated when user logs in)
    this.initializationPromise = this.initializeDatabase('creative-writer-stories');
    
    // Subscribe to user changes to switch databases
    this.authService.currentUser$.subscribe(user => {
      this.handleUserChange(user);
    });

    // Setup online/offline detection
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }

  private async initializeDatabase(dbName: string): Promise<void> {
    console.log('Initializing database:', dbName);
    
    // Stop sync first
    await this.stopSync();
    
    // Close existing database safely
    if (this.db) {
      try {
        await this.db.close();
      } catch (error) {
        console.warn('Error closing database:', error);
      }
    }
    
    // Small delay to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.db = new PouchDB(dbName);
    
    // Create indexes for better query performance
    try {
      await this.db.createIndex({
        index: { fields: ['createdAt'] }
      });
    } catch (err: any) {
      console.warn('Could not create createdAt index:', err);
    }
    
    try {
      await this.db.createIndex({
        index: { fields: ['id'] }
      });
    } catch (err: any) {
      console.warn('Could not create id index:', err);
    }

    // Setup sync for the new database
    await this.setupSync();
  }

  private handleUserChange(user: any): void {
    // Use setTimeout to avoid immediate database switching during constructor
    setTimeout(async () => {
      if (user) {
        const userDbName = this.authService.getUserDatabaseName();
        if (userDbName && userDbName !== (this.db?.name)) {
          this.initializationPromise = this.initializeDatabase(userDbName);
          await this.initializationPromise;
        }
      } else {
        // User logged out - switch to anonymous/demo database
        const anonymousDb = 'creative-writer-stories-anonymous';
        if (this.db?.name !== anonymousDb) {
          this.initializationPromise = this.initializeDatabase(anonymousDb);
          await this.initializationPromise;
        }
      }
    }, 100);
  }

  async getDatabase(): Promise<any> {
    // Wait for initialization to complete
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    return this.db;
  }

  // Synchronous getter for backwards compatibility (use with caution)
  getDatabaseSync(): any {
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
    const port = window.location.port;
    
    // Get the current database name (user-specific)
    const dbName = this.db ? this.db.name : 'creative-writer-stories-anonymous';
    
    // Check if we're running with nginx reverse proxy (through /_db/ path)
    const baseUrl = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
    
    // For development with direct CouchDB access
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && !this.isReverseProxySetup()) {
      return `${protocol}//${hostname}:5984/${dbName}`;
    }
    
    // For production or reverse proxy setup - use /_db/ prefix
    return `${baseUrl}/_db/${dbName}`;
  }

  private isReverseProxySetup(): boolean {
    // Check if we can detect reverse proxy setup by testing for nginx-specific headers
    // or by checking if the current port is not 5984 (standard CouchDB port)
    const port = window.location.port;
    // If running on port 3080 (nginx proxy port) or any non-5984 port, assume reverse proxy
    return port === '3080' || (port !== '5984' && port !== '');
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
      try {
        this.syncHandler.cancel();
      } catch (error) {
        console.warn('Error canceling sync:', error);
      }
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