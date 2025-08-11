import { Injectable, inject } from '@angular/core';
import { DatabaseService } from '../../core/services/database.service';
import { FirestoreDocument } from '../../core/services/firestore.service';

export interface StoredImage extends FirestoreDocument {
  name: string;
  base64Data: string;
  mimeType: string;
  size: number;
  type: 'image';
}

export interface ImageUploadResult {
  url: string;
  imageId: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private readonly MAX_IMAGE_SIZE = 2 * 1024 * 1024; // Reduced to 2MB
  private readonly MAX_IMAGES = 20; // Max number of images to keep
  private databaseService = inject(DatabaseService);

  /**
   * Upload an image file and store it locally, returning both URL and ID
   */
  async uploadImageWithId(file: File): Promise<ImageUploadResult> {
    // Validate file size
    if (file.size > this.MAX_IMAGE_SIZE) {
      throw new Error(`Datei ist zu groß. Maximale Größe: ${this.formatFileSize(this.MAX_IMAGE_SIZE)}`);
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Nur Bilddateien sind erlaubt');
    }

    try {
      // Clean up old images first to make space
      await this.cleanupImages();

      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      
      // Create image record
      const imageId = this.generateImageId();
      const imageData = {
        name: file.name,
        base64Data,
        mimeType: file.type,
        size: file.size,
        type: 'image' as const
      };

      // Store in Firestore
      const storedImage = await this.databaseService.create<StoredImage>('images', imageData, imageId);

      // Return both URL and ID
      return {
        url: this.getImageDataUrl(storedImage),
        imageId: imageId
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error uploading image');
    }
  }

  /**
   * Upload an image file and store it locally (legacy method)
   */
  async uploadImage(file: File): Promise<string> {
    // Validate file size
    if (file.size > this.MAX_IMAGE_SIZE) {
      throw new Error(`Datei ist zu groß. Maximale Größe: ${this.formatFileSize(this.MAX_IMAGE_SIZE)}`);
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Nur Bilddateien sind erlaubt');
    }

    try {
      // Clean up old images first to make space
      await this.cleanupImages();

      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      
      // Create image record
      const imageId = this.generateImageId();
      const imageData = {
        name: file.name,
        base64Data,
        mimeType: file.type,
        size: file.size,
        type: 'image' as const
      };

      // Store in Firestore
      const storedImage = await this.databaseService.create<StoredImage>('images', imageData, imageId);

      // Return data URL for immediate use
      return this.getImageDataUrl(storedImage);
    } catch (error) {
      console.error('Error uploading image:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error uploading image');
    }
  }

  /**
   * Get all stored images
   */
  async getAllImages(): Promise<StoredImage[]> {
    try {
      return await this.databaseService.getAll<StoredImage>('images', {
        where: [{ field: 'type', operator: '==', value: 'image' }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }]
      });
    } catch (error) {
      console.error('Error loading images:', error);
      return [];
    }
  }

  /**
   * Get a specific image by ID
   */
  async getImage(id: string): Promise<StoredImage | null> {
    try {
      return await this.databaseService.get<StoredImage>('images', id);
    } catch (error) {
      console.error('Error loading image:', error);
      return null;
    }
  }

  /**
   * Delete an image
   */
  async deleteImage(id: string): Promise<boolean> {
    try {
      await this.databaseService.delete('images', id);
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
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
   * Clean up old images to manage storage space
   */
  async cleanupImages(): Promise<void> {
    try {
      const images = await this.getAllImages();
      
      // If we have more than MAX_IMAGES, remove the oldest ones
      if (images.length >= this.MAX_IMAGES) {
        const imagesToDelete = images.slice(this.MAX_IMAGES - 1);
        
        for (const image of imagesToDelete) {
          await this.deleteImage(image.id);
        }
      }
    } catch (error) {
      console.error('Fehler beim Bereinigen der Bilder:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ count: number; totalSize: number; formattedSize: string }> {
    const images = await this.getAllImages();
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