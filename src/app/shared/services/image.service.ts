import { Injectable } from '@angular/core';

export interface StoredImage {
  id: string;
  name: string;
  base64Data: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private readonly STORAGE_KEY = 'creative-writer-images';
  private readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

  constructor() {}

  /**
   * Upload an image file and store it locally
   */
  async uploadImage(file: File): Promise<string> {
    // Validate file size
    if (file.size > this.MAX_IMAGE_SIZE) {
      throw new Error('Datei ist zu groß. Maximale Größe: 5MB');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Nur Bilddateien sind erlaubt');
    }

    try {
      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      
      // Create image record
      const imageId = this.generateImageId();
      const storedImage: StoredImage = {
        id: imageId,
        name: file.name,
        base64Data,
        mimeType: file.type,
        size: file.size,
        createdAt: new Date()
      };

      // Store in localStorage
      this.storeImage(storedImage);

      // Return data URL for immediate use
      return this.getImageDataUrl(storedImage);
    } catch (error) {
      console.error('Fehler beim Hochladen des Bildes:', error);
      throw new Error('Fehler beim Hochladen des Bildes');
    }
  }

  /**
   * Get all stored images
   */
  getAllImages(): StoredImage[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const images = JSON.parse(stored) as StoredImage[];
      // Convert date strings back to Date objects
      return images.map(img => ({
        ...img,
        createdAt: new Date(img.createdAt)
      }));
    } catch (error) {
      console.error('Fehler beim Laden der Bilder:', error);
      return [];
    }
  }

  /**
   * Get a specific image by ID
   */
  getImage(id: string): StoredImage | null {
    const images = this.getAllImages();
    return images.find(img => img.id === id) || null;
  }

  /**
   * Delete an image
   */
  deleteImage(id: string): boolean {
    try {
      const images = this.getAllImages();
      const filteredImages = images.filter(img => img.id !== id);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredImages));
      return true;
    } catch (error) {
      console.error('Fehler beim Löschen des Bildes:', error);
      return false;
    }
  }

  /**
   * Get data URL for an image
   */
  getImageDataUrl(image: StoredImage): string {
    return `data:${image.mimeType};base64,${image.base64Data}`;
  }

  /**
   * Clean up old or large images to manage storage space
   */
  cleanupImages(): void {
    const images = this.getAllImages();
    
    // Sort by creation date, oldest first
    images.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    // Calculate total storage usage
    let totalSize = images.reduce((sum, img) => sum + img.size, 0);
    
    // Remove old images if total size exceeds 50MB
    const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
    const imagesToKeep: StoredImage[] = [];
    
    for (let i = images.length - 1; i >= 0; i--) {
      if (totalSize <= MAX_TOTAL_SIZE) break;
      totalSize -= images[i].size;
    }
    
    // Keep remaining images
    for (let i = Math.max(0, images.length - 1); i >= 0; i--) {
      imagesToKeep.unshift(images[i]);
      if (imagesToKeep.reduce((sum, img) => sum + img.size, 0) >= MAX_TOTAL_SIZE) break;
    }
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(imagesToKeep));
    } catch (error) {
      console.error('Fehler beim Bereinigen der Bilder:', error);
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): { count: number; totalSize: number; formattedSize: string } {
    const images = this.getAllImages();
    const totalSize = images.reduce((sum, img) => sum + img.size, 0);
    
    return {
      count: images.length,
      totalSize,
      formattedSize: this.formatFileSize(totalSize)
    };
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      
      reader.onerror = () => {
        reject(new Error('Fehler beim Lesen der Datei'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  private storeImage(image: StoredImage): void {
    try {
      const images = this.getAllImages();
      images.push(image);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(images));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        // Try to clean up space and retry
        this.cleanupImages();
        try {
          const images = this.getAllImages();
          images.push(image);
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(images));
        } catch (retryError) {
          throw new Error('Nicht genügend Speicherplatz verfügbar');
        }
      } else {
        throw error;
      }
    }
  }

  private generateImageId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}