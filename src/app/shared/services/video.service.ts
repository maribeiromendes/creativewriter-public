import { Injectable, inject } from '@angular/core';
import { DatabaseService } from '../../core/services/database.service';
import { StoredVideo, ImageVideoAssociation } from '../models/video.interface';

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private readonly MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB max for videos
  private readonly MAX_VIDEOS = 10; // Max number of videos to keep
  private databaseService = inject(DatabaseService);

  /**
   * Upload a video file and store it locally
   */
  async uploadVideo(file: File): Promise<string> {
    // Validate file size
    if (file.size > this.MAX_VIDEO_SIZE) {
      throw new Error(`Video ist zu groß. Maximale Größe: ${this.formatFileSize(this.MAX_VIDEO_SIZE)}`);
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      throw new Error('Nur Videodateien sind erlaubt');
    }

    try {
      // Clean up old videos first to make space
      await this.cleanupVideos();

      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      
      // Create video record
      const videoId = this.generateVideoId();
      const videoData = {
        name: file.name,
        base64Data,
        mimeType: file.type,
        size: file.size,
        type: 'video' as const
      };

      // Store in Firestore
      await this.databaseService.create<StoredVideo>('videos', videoData, videoId);

      // Return video ID for association
      return videoId;
    } catch (error) {
      console.error('Error uploading video:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error uploading video');
    }
  }

  /**
   * Get all stored videos
   */
  async getAllVideos(): Promise<StoredVideo[]> {
    try {
      return await this.databaseService.getAll<StoredVideo>('videos', {
        where: [{ field: 'type', operator: '==', value: 'video' }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }]
      });
    } catch (error) {
      console.error('Error loading videos:', error);
      return [];
    }
  }

  /**
   * Get a specific video by ID
   */
  async getVideo(id: string): Promise<StoredVideo | null> {
    try {
      return await this.databaseService.get<StoredVideo>('videos', id);
    } catch (error) {
      console.error('Error loading video:', error);
      return null;
    }
  }

  /**
   * Delete a video
   */
  async deleteVideo(id: string): Promise<boolean> {
    try {
      await this.databaseService.delete('videos', id);
      return true;
    } catch (error) {
      console.error('Error deleting video:', error);
      return false;
    }
  }

  /**
   * Get data URL for a video
   */
  getVideoDataUrl(video: StoredVideo): string {
    return `data:${video.mimeType};base64,${video.base64Data}`;
  }

  /**
   * Associate an image with a video
   */
  async associateImageWithVideo(imageId: string, videoId: string): Promise<boolean> {
    try {
      const associationId = this.generateAssociationId();
      const associationData = {
        imageId,
        videoId,
        type: 'image-video-association' as const
      };

      await this.databaseService.create<ImageVideoAssociation>('associations', associationData, associationId);
      return true;
    } catch (error) {
      console.error('Error linking image and video:', error);
      return false;
    }
  }

  /**
   * Get video associated with an image
   */
  async getVideoForImage(imageId: string): Promise<StoredVideo | null> {
    try {
      console.log('Searching for video association for imageId:', imageId);
      
      const associations = await this.databaseService.getAll<ImageVideoAssociation>('associations', {
        where: [
          { field: 'type', operator: '==', value: 'image-video-association' },
          { field: 'imageId', operator: '==', value: imageId }
        ]
      });

      console.log('Found associations:', associations.length);
      
      if (associations.length === 0) {
        return null;
      }

      const association = associations[0];
      console.log('Found association:', association);
      
      const video = await this.getVideo(association.videoId);
      console.log('Found video:', !!video);
      
      return video;
    } catch (error) {
      console.error('Error loading linked video:', error);
      return null;
    }
  }

  /**
   * Remove association between image and video
   */
  async removeImageVideoAssociation(imageId: string): Promise<boolean> {
    try {
      const associations = await this.databaseService.getAll<ImageVideoAssociation>('associations', {
        where: [
          { field: 'type', operator: '==', value: 'image-video-association' },
          { field: 'imageId', operator: '==', value: imageId }
        ]
      });

      const associationIds = associations.map(assoc => assoc.id);
      if (associationIds.length > 0) {
        await this.databaseService.deleteMany('associations', associationIds);
      }
      
      return true;
    } catch (error) {
      console.error('Error removing association:', error);
      return false;
    }
  }

  /**
   * Clean up old videos to manage storage space
   */
  async cleanupVideos(): Promise<void> {
    try {
      const videos = await this.getAllVideos();
      
      // If we have more than MAX_VIDEOS, remove the oldest ones
      if (videos.length >= this.MAX_VIDEOS) {
        const videosToDelete = videos.slice(this.MAX_VIDEOS - 1);
        
        for (const video of videosToDelete) {
          await this.deleteVideo(video.id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up videos:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ count: number; totalSize: number; formattedSize: string }> {
    const videos = await this.getAllVideos();
    const totalSize = videos.reduce((sum, vid) => sum + vid.size, 0);
    
    return {
      count: videos.length,
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
        reject(new Error('Error reading file'));
      };
      
      reader.readAsDataURL(file);
    });
  }


  private generateVideoId(): string {
    return `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAssociationId(): string {
    return `assoc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}