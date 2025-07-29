import { Injectable, signal, computed } from '@angular/core';

export interface CustomBackground {
  id: string;
  name: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: Date;
  data: string; // Base64 encoded image data
}

export interface CustomBackgroundOption {
  id: string;
  name: string;
  filename: string;
  blobUrl: string;
  size: number;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CustomBackgroundStorageService {
  private readonly STORAGE_KEY = 'custom-backgrounds';
  private customBackgrounds = signal<CustomBackgroundOption[]>([]);
  
  // Computed signal for reactive access
  backgrounds = computed(() => this.customBackgrounds());

  constructor() {
    this.loadCustomBackgrounds();
  }

  /**
   * Upload and store a custom background image
   */
  async uploadBackground(file: File, customName?: string): Promise<CustomBackground> {
    // Validate file
    if (!this.isValidImageFile(file)) {
      throw new Error('Ungültiger Dateityp. Nur PNG, JPG, JPEG und WebP sind erlaubt.');
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('Datei ist zu groß. Maximum 5MB erlaubt.');
    }

    // Convert file to base64
    const base64Data = await this.fileToBase64(file);
    const id = `bg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filename = `custom_${Date.now()}_${file.name}`;
    const name = customName || file.name.replace(/\.[^/.]+$/, ""); // Remove extension

    const backgroundDoc: CustomBackground = {
      id,
      name,
      filename,
      contentType: file.type,
      size: file.size,
      createdAt: new Date(),
      data: base64Data
    };

    // Save to localStorage
    const existingBackgrounds = this.getStoredBackgrounds();
    existingBackgrounds.push(backgroundDoc);
    this.saveBackgrounds(existingBackgrounds);

    // Reload backgrounds to update signals
    this.loadCustomBackgrounds();

    return backgroundDoc;
  }

  /**
   * Delete a custom background
   */
  async deleteBackground(id: string): Promise<void> {
    try {
      const existingBackgrounds = this.getStoredBackgrounds();
      const filteredBackgrounds = existingBackgrounds.filter(bg => bg.id !== id);
      
      this.saveBackgrounds(filteredBackgrounds);
      
      // Cleanup blob URLs for memory management
      const backgroundOption = this.customBackgrounds().find(bg => bg.id === id);
      if (backgroundOption) {
        URL.revokeObjectURL(backgroundOption.blobUrl);
      }
      
      // Reload backgrounds to update signals
      this.loadCustomBackgrounds();
    } catch (error) {
      console.error('Error deleting background:', error);
      throw new Error('Fehler beim Löschen des Hintergrunds');
    }
  }

  /**
   * Get a specific custom background
   */
  async getBackground(id: string): Promise<CustomBackground | null> {
    try {
      const backgrounds = this.getStoredBackgrounds();
      return backgrounds.find(bg => bg.id === id) || null;
    } catch (error) {
      console.error('Error getting background:', error);
      return null;
    }
  }

  /**
   * Load all custom backgrounds from localStorage
   */
  private loadCustomBackgrounds(): void {
    try {
      const storedBackgrounds = this.getStoredBackgrounds();
      const backgrounds: CustomBackgroundOption[] = [];

      for (const bg of storedBackgrounds) {
        // Create blob URL from base64 data
        const blobUrl = this.createBlobUrlFromBase64(bg.data, bg.contentType);
        
        backgrounds.push({
          id: bg.id,
          name: bg.name,
          filename: bg.filename,
          blobUrl,
          size: bg.size,
          createdAt: new Date(bg.createdAt)
        });
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
   * Get stored backgrounds from localStorage
   */
  private getStoredBackgrounds(): CustomBackground[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error parsing stored backgrounds:', error);
      return [];
    }
  }

  /**
   * Save backgrounds to localStorage
   */
  private saveBackgrounds(backgrounds: CustomBackground[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backgrounds));
    } catch (error) {
      console.error('Error saving backgrounds to localStorage:', error);
      throw new Error('Fehler beim Speichern. Möglicherweise ist der Speicher voll.');
    }
  }

  /**
   * Create blob URL from base64 data
   */
  private createBlobUrlFromBase64(base64Data: string, contentType: string): string {
    try {
      // Remove data URL prefix if present
      const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      
      // Convert base64 to binary
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: contentType });
      
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creating blob URL:', error);
      return '';
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
   * Clear all custom backgrounds (for debugging/reset)
   */
  async clearAllBackgrounds(): Promise<void> {
    try {
      // Cleanup all blob URLs for memory management
      this.customBackgrounds().forEach(bg => {
        URL.revokeObjectURL(bg.blobUrl);
      });
      
      localStorage.removeItem(this.STORAGE_KEY);
      this.loadCustomBackgrounds();
    } catch (error) {
      console.error('Error clearing backgrounds:', error);
      throw new Error('Fehler beim Löschen aller Hintergründe');
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; maxSize: number; count: number } {
    const backgrounds = this.customBackgrounds();
    const used = this.getTotalStorageSize();
    
    // Rough estimate of localStorage limit (usually ~5-10MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    return {
      used,
      maxSize,
      count: backgrounds.length
    };
  }

  /**
   * Check if storage is near limit
   */
  isStorageNearLimit(): boolean {
    const info = this.getStorageInfo();
    return info.used > (info.maxSize * 0.8); // 80% of estimated max
  }
}