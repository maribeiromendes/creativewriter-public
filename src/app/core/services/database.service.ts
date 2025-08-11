import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { AuthService, User } from './auth.service';
import { FirestoreService, FirestoreDocument, QueryOptions } from './firestore.service';

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
  private readonly authService = inject(AuthService);
  private readonly firestoreService = inject(FirestoreService);
  
  private currentUser: User | null = null;
  private syncStatusSubject = new BehaviorSubject<SyncStatus>({
    isOnline: navigator.onLine,
    isSync: false
  });

  public syncStatus$: Observable<SyncStatus> = this.syncStatusSubject.asObservable();

  constructor() {
    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.updateSyncStatus({ 
        isOnline: navigator.onLine, 
        isSync: false,
        lastSync: new Date()
      });
    });

    // Setup online/offline detection
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }

  // Get user-specific collection name
  private getCollectionName(baseCollection: string): string {
    if (this.currentUser?.uid) {
      return `users/${this.currentUser.uid}/${baseCollection}`;
    }
    return `anonymous/${baseCollection}`;
  }

  private updateOnlineStatus(isOnline: boolean): void {
    this.updateSyncStatus({ isOnline });
  }

  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    const current = this.syncStatusSubject.value;
    this.syncStatusSubject.next({ ...current, ...updates });
  }

  // Public API methods that maintain compatibility with existing code
  async getDatabase(): Promise<FirestoreService> {
    return this.firestoreService;
  }

  // Document CRUD operations
  async create<T extends FirestoreDocument>(
    collectionName: string, 
    data: Omit<T, 'id'>, 
    customId?: string
  ): Promise<T> {
    const userCollectionName = this.getCollectionName(collectionName);
    return this.firestoreService.create<T>(userCollectionName, data, customId);
  }

  async get<T extends FirestoreDocument>(
    collectionName: string, 
    id: string
  ): Promise<T | null> {
    const userCollectionName = this.getCollectionName(collectionName);
    return this.firestoreService.get<T>(userCollectionName, id);
  }

  async getAll<T extends FirestoreDocument>(
    collectionName: string, 
    options?: QueryOptions
  ): Promise<T[]> {
    const userCollectionName = this.getCollectionName(collectionName);
    return this.firestoreService.getAll<T>(userCollectionName, options);
  }

  async update<T extends FirestoreDocument>(
    collectionName: string, 
    id: string, 
    data: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<void> {
    const userCollectionName = this.getCollectionName(collectionName);
    return this.firestoreService.update<T>(userCollectionName, id, data);
  }

  async delete(collectionName: string, id: string): Promise<void> {
    const userCollectionName = this.getCollectionName(collectionName);
    return this.firestoreService.delete(userCollectionName, id);
  }

  // Observable methods
  getObservable<T extends FirestoreDocument>(
    collectionName: string, 
    id: string
  ): Observable<T | null> {
    const userCollectionName = this.getCollectionName(collectionName);
    return this.firestoreService.getObservable<T>(userCollectionName, id);
  }

  getAllObservable<T extends FirestoreDocument>(
    collectionName: string, 
    options?: QueryOptions
  ): Observable<T[]> {
    const userCollectionName = this.getCollectionName(collectionName);
    return this.firestoreService.getAllObservable<T>(userCollectionName, options);
  }

  // Bulk operations
  async createMany<T extends FirestoreDocument>(
    collectionName: string, 
    items: Omit<T, 'id'>[]
  ): Promise<T[]> {
    const userCollectionName = this.getCollectionName(collectionName);
    return this.firestoreService.createMany<T>(userCollectionName, items);
  }

  async updateMany<T extends FirestoreDocument>(
    collectionName: string, 
    updates: { id: string; data: Partial<Omit<T, 'id' | 'createdAt'>> }[]
  ): Promise<void> {
    const userCollectionName = this.getCollectionName(collectionName);
    return this.firestoreService.updateMany<T>(userCollectionName, updates);
  }

  async deleteMany(collectionName: string, ids: string[]): Promise<void> {
    const userCollectionName = this.getCollectionName(collectionName);
    return this.firestoreService.deleteMany(userCollectionName, ids);
  }

  // Legacy methods for backwards compatibility
  async setupSync(): Promise<void> {
    this.updateSyncStatus({ 
      isSync: false, 
      lastSync: new Date(),
      error: undefined 
    });
  }

  async stopSync(): Promise<void> {
    this.updateSyncStatus({ isSync: false });
  }

  async forcePush(): Promise<void> {
    // Firebase handles sync automatically
    this.updateSyncStatus({ lastSync: new Date() });
  }

  async forcePull(): Promise<void> {
    // Firebase handles sync automatically
    this.updateSyncStatus({ lastSync: new Date() });
  }

  async compact(): Promise<void> {
    // Not needed with Firestore
  }

  async destroy(): Promise<void> {
    // Not needed with Firestore
  }

  // Synchronous getter for backwards compatibility (deprecated)
  getDatabaseSync(): FirestoreService | null {
    return this.firestoreService;
  }
}