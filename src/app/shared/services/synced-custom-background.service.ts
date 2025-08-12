import { Injectable, signal, computed, inject } from '@angular/core';
import { DatabaseService } from '../../core/services/database.service';
import { AuthService } from '../../core/services/auth.service';
import { FirestoreDocument } from '../../core/services/firestore.service';

export interface CustomBackground extends FirestoreDocument {
  type: 'custom-background';
  name: string;
  filename: string;
  contentType: string;
  size: number;
  createdBy: string; // username
  attachmentData?: string; // Base64 encoded data
}

export interface CustomBackgroundOption {
  id: string;
  name: string;
  filename: string;
  blobUrl: string;
  size: number;
  createdAt: Date;
  createdBy: string;
}

@Injectable({
  providedIn: 'root'
})
export class SyncedCustomBackgroundService {
  private databaseService = inject(DatabaseService);
  private authService = inject(AuthService);
  
  private customBackgrounds = signal<CustomBackgroundOption[]>([]);
  private blobUrlCache = new Map<string, string>();
  
  // Computed signal for reactive access
  backgrounds = computed(() => this.customBackgrounds());

  constructor() {
    this.loadCustomBackgrounds();
    
    // React to user changes - but don't clear cache immediately
    this.authService.currentUser$.subscribe((user) => {
      // Only reload if user actually changed (not initial load)
      if (user !== null || this.customBackgrounds().length > 0) {
        this.loadCustomBackgrounds();
      }
    });
  }

  /**
   * Upload and store a custom background image with PouchDB attachments
   */
  async uploadBackground(file: File, customName?: string): Promise<CustomBackground> {
    // Validate file
    if (!this.isValidImageFile(file)) {
      throw new Error('Ungültiger Dateityp. Nur PNG, JPG, JPEG und WebP sind erlaubt.');
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('Datei ist zu groß. Maximum 5MB erlaubt.');
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to upload custom backgrounds.');
    }

    // Convert file to base64
    const base64Data = await this.fileToBase64(file);
    const attachmentName = `image_${Date.now()}.${this.getFileExtension(file.name)}`;
    const name = customName || file.name.replace(/\.[^/.]+$/, ""); // Remove extension

    const backgroundDoc: Omit<CustomBackground, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'custom-background',
      name,
      filename: attachmentName,
      contentType: file.type,
      size: file.size,
      createdBy: currentUser.username,
      attachmentData: base64Data.split(',')[1] // Remove data:image/... prefix
    };

    // Save to Firestore
    const result = await this.databaseService.create('custom-backgrounds', backgroundDoc);

    // Small delay to ensure document is persisted and indexed
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Reload backgrounds to update signals
    await this.loadCustomBackgrounds();

    return {
      ...backgroundDoc,
      id: result.id,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    };
  }

  /**
   * Delete a custom background
   */
  async deleteBackground(id: string): Promise<void> {
    try {
      const doc = await this.databaseService.get<CustomBackground>('custom-backgrounds', id);
      if (!doc) {
        throw new Error('Background not found.');
      }
      
      // Check if user can delete this background
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser || doc.createdBy !== currentUser.username) {
        throw new Error('You can only delete your own backgrounds.');
      }
      
      await this.databaseService.delete('custom-backgrounds', id);
      
      // Clean up blob URL
      const cachedUrl = this.blobUrlCache.get(id);
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl);
        this.blobUrlCache.delete(id);
      }
      
      // Reload backgrounds to update signals
      await this.loadCustomBackgrounds();
    } catch (error) {
      console.error('Error deleting background:', error);
      throw new Error('Error deleting background');
    }
  }

  /**
   * Get a specific custom background
   */
  async getBackground(id: string): Promise<CustomBackground | null> {
    try {
      const doc = await this.databaseService.get<CustomBackground>('custom-backgrounds', id);
      return doc;
    } catch (error) {
      console.error('Error getting background:', error);
      return null;
    }
  }

  /**
   * Get background image as blob URL
   */
  async getBackgroundBlobUrl(id: string, attachmentName: string): Promise<string | null> {
    // Check cache first
    const cacheKey = `${id}_${attachmentName}`;
    if (this.blobUrlCache.has(cacheKey)) {
      return this.blobUrlCache.get(cacheKey)!;
    }

    try {
      const doc = await this.databaseService.get<CustomBackground>('custom-backgrounds', id);
      
      if (doc?.attachmentData) {
        const blobUrl = await this.createBlobUrlFromBase64(doc.attachmentData, doc.contentType);
        this.blobUrlCache.set(cacheKey, blobUrl);
        return blobUrl;
      }
      return null;
    } catch (error) {
      console.error('Error getting background blob:', error);
      return null;
    }
  }

  /**
   * Load all custom backgrounds from PouchDB
   */
  private async loadCustomBackgrounds(): Promise<void> {
    try {
      const backgrounds: CustomBackgroundOption[] = [];
      const customBackgrounds = await this.databaseService.getAll<CustomBackground>('custom-backgrounds');

      for (const doc of customBackgrounds) {
        // Verify document structure
        if (doc && doc.type === 'custom-background' && doc.attachmentData) {
          try {
            const blobUrl = await this.createBlobUrlFromBase64(doc.attachmentData, doc.contentType);
            if (blobUrl) {
              backgrounds.push({
                id: doc.id,
                name: doc.name,
                filename: doc.filename,
                blobUrl,
                size: doc.size,
                createdAt: doc.createdAt || new Date(),
                createdBy: doc.createdBy
              });
            }
          } catch (error) {
            console.warn(`Could not load background ${doc.id}:`, error);
            // Skip this background if processing fails
            continue;
          }
        }
      }

      // Sort by creation date (newest first)
      backgrounds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      this.customBackgrounds.set(backgrounds);
    } catch (error) {
      console.error('Error loading custom backgrounds:', error);
      this.customBackgrounds.set([]);
    }
  }

  /**
   * Convert File to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'png';
  }

  /**
   * Validate if file is a supported image format
   */
  private isValidImageFile(file: File): boolean {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    return validTypes.includes(file.type);
  }

  /**
   * Get total storage usage
   */
  getTotalStorageSize(): number {
    return this.customBackgrounds().reduce((total, bg) => total + bg.size, 0);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Create blob URL from base64 data
   */
  private async createBlobUrlFromBase64(base64Data: string, contentType: string): Promise<string> {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: contentType });
      
      // Create and cache blob URL
      const blobUrl = URL.createObjectURL(blob);
      return blobUrl;
    } catch (error) {
      console.error('Error creating blob URL from base64:', error);
      throw error;
    }
  }

  /**
   * Clear all custom backgrounds for current user
   */
  async clearAllBackgrounds(): Promise<void> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Sie müssen angemeldet sein.');
      }

      // Get all custom backgrounds for the current user
      const userBackgrounds = await this.databaseService.getAll<CustomBackground>('custom-backgrounds');
      const userOwnedBackgrounds = userBackgrounds.filter(bg => bg.createdBy === currentUser.username);

      // Delete each background
      for (const background of userOwnedBackgrounds) {
        await this.databaseService.delete('custom-backgrounds', background.id);
      }

      if (userOwnedBackgrounds.length > 0) {
        this.clearBlobCache();
        await this.loadCustomBackgrounds();
      }
    } catch (error) {
      console.error('Error clearing backgrounds:', error);
      throw new Error('Error deleting all backgrounds');
    }
  }

  /**
   * Clear blob URL cache
   */
  private clearBlobCache(): void {
    // Cleanup all blob URLs for memory management
    this.blobUrlCache.forEach(url => URL.revokeObjectURL(url));
    this.blobUrlCache.clear();
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; count: number; userBackgrounds: number } {
    const backgrounds = this.customBackgrounds();
    const currentUser = this.authService.getCurrentUser();
    const userBackgrounds = currentUser ? 
      backgrounds.filter(bg => bg.createdBy === currentUser.username).length : 0;
    
    return {
      used: this.getTotalStorageSize(),
      count: backgrounds.length,
      userBackgrounds
    };
  }

  /**
   * Check if user is logged in
   */
  isUserLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  /**
   * Get current user info
   */
  getCurrentUser() {
    return this.authService.getCurrentUser();
  }

  /**
   * Force sync with remote database
   */
  async syncNow(): Promise<void> {
    try {
      // Force a pull to get latest data
      await this.databaseService.forcePull();
      // Then reload backgrounds
      await this.loadCustomBackgrounds();
    } catch (error) {
      console.error('Error syncing backgrounds:', error);
      throw new Error('Synchronisation fehlgeschlagen');
    }
  }

  /**
   * Get sync status
   */
  get syncStatus$() {
    return this.databaseService.syncStatus$;
  }
}