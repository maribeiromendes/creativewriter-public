import { Injectable } from '@angular/core';

declare var PouchDB: any;

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: any;

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
  }

  getDatabase(): any {
    return this.db;
  }

  async compact(): Promise<void> {
    await this.db.compact();
  }

  async destroy(): Promise<void> {
    await this.db.destroy();
  }
}