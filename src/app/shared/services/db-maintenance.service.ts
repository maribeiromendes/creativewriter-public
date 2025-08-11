import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DatabaseService } from '../../core/services/database.service';
import { ImageService } from './image.service';
import { VideoService } from './video.service';
import { StoryService } from '../../stories/services/story.service';
import { StoredImage } from './image.service';
import { ImageVideoAssociation } from '../models/video.interface';

export interface OrphanedImage {
  id: string;
  name: string;
  size: number;
  createdAt: Date;
  base64Data: string;
  mimeType: string;
}

export interface OrphanedVideo {
  id: string;
  name: string;
  size: number;
  createdAt: Date;
  base64Data: string;
  mimeType: string;
}

export interface DatabaseStats {
  totalImages: number;
  totalVideos: number;
  totalStories: number;
  orphanedImages: number;
  orphanedVideos: number;
  totalImageSize: number;
  totalVideoSize: number;
  orphanedImageSize: number;
  orphanedVideoSize: number;
  databaseSizeEstimate: number;
}

export interface DuplicateImage {
  originalId: string;
  duplicateIds: string[];
  name: string;
  size: number;
  base64Data: string;
}

export interface IntegrityIssue {
  type: 'missing_chapters' | 'missing_scenes' | 'corrupt_data' | 'invalid_references';
  storyId: string;
  storyTitle: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

@Injectable({
  providedIn: 'root'
})
export class DbMaintenanceService {
  private readonly databaseService = inject(DatabaseService);
  private readonly imageService = inject(ImageService);
  private readonly videoService = inject(VideoService);
  private readonly storyService = inject(StoryService);

  private operationProgress = new BehaviorSubject<{ operation: string; progress: number; message: string }>({
    operation: '',
    progress: 0,
    message: ''
  });

  public operationProgress$ = this.operationProgress.asObservable();

  constructor() {
    // Service initialization
  }

  private updateProgress(operation: string, progress: number, message: string): void {
    this.operationProgress.next({ operation, progress, message });
  }

  /**
   * Finds all orphaned images that are not referenced in any story content
   */
  async findOrphanedImages(): Promise<OrphanedImage[]> {
    this.updateProgress('orphaned-scan', 0, 'Loading all images...');
    
    try {
      // Get all images from database
      const allImages = await this.imageService.getAllImages();
      this.updateProgress('orphaned-scan', 20, `${allImages.length} images found`);

      // Get all stories
      const allStories = await this.storyService.getAllStories();
      this.updateProgress('orphaned-scan', 40, `${allStories.length} stories found`);

      // Extract all base64 image data from story content
      const usedImageData = new Set<string>();
      let processedStories = 0;

      for (const story of allStories) {
        for (const chapter of story.chapters) {
          for (const scene of chapter.scenes) {
            const base64Matches = scene.content.match(/<img[^>]*src="data:image\/[^;]+;base64,([^"]+)"/gi);
            if (base64Matches) {
              base64Matches.forEach(match => {
                const base64Data = match.match(/base64,([^"]+)/)?.[1];
                if (base64Data) {
                  usedImageData.add(base64Data);
                }
              });
            }
          }
        }
        processedStories++;
        this.updateProgress('orphaned-scan', 40 + (processedStories / allStories.length) * 40, 
          `Processing story ${processedStories}/${allStories.length}`);
      }

      this.updateProgress('orphaned-scan', 80, 'Analyzing orphaned images...');

      // Find orphaned images by checking if their base64 data is used
      const orphanedImages: OrphanedImage[] = [];
      let processedImages = 0;

      for (const image of allImages) {
        if (!usedImageData.has(image.base64Data)) {
          orphanedImages.push({
            id: image.id,
            name: image.name,
            size: image.size,
            createdAt: image.createdAt || new Date(),
            base64Data: image.base64Data,
            mimeType: image.mimeType
          });
        }
        processedImages++;
        this.updateProgress('orphaned-scan', 80 + (processedImages / allImages.length) * 20, 
          `Analyzing image ${processedImages}/${allImages.length}`);
      }

      this.updateProgress('orphaned-scan', 100, `${orphanedImages.length} orphaned images found`);
      
      return orphanedImages;
    } catch (error) {
      console.error('Error finding orphaned images:', error);
      this.updateProgress('orphaned-scan', 0, 'Error scanning orphaned images');
      throw error;
    }
  }

  /**
   * Finds all orphaned videos that are not associated with any images
   */
  async findOrphanedVideos(): Promise<OrphanedVideo[]> {
    this.updateProgress('orphaned-video-scan', 0, 'Loading all videos...');
    
    try {
      // Get all videos from database
      const allVideos = await this.videoService.getAllVideos();
      this.updateProgress('orphaned-video-scan', 30, `${allVideos.length} videos found`);

      // Get all image-video associations using Firestore
      const associationsResult = await this.databaseService.getAll('associations', {
        where: [{ field: 'type', operator: '==', value: 'image-video-association' }]
      });
      
      this.updateProgress('orphaned-video-scan', 60, `${associationsResult.length} associations found`);

      // Extract video IDs that are associated with images
      const associatedVideoIds = new Set<string>();
      associationsResult.forEach((doc) => {
        const assoc = doc as ImageVideoAssociation;
        if (assoc.videoId) {
          associatedVideoIds.add(assoc.videoId);
        }
      });

      // Find orphaned videos by checking if they are associated
      const orphanedVideos: OrphanedVideo[] = [];
      let processedVideos = 0;

      for (const video of allVideos) {
        if (!associatedVideoIds.has(video.id)) {
          orphanedVideos.push({
            id: video.id,
            name: video.name,
            size: video.size,
            createdAt: video.createdAt || new Date(),
            base64Data: video.base64Data,
            mimeType: video.mimeType
          });
        }
        processedVideos++;
        this.updateProgress('orphaned-video-scan', 60 + (processedVideos / allVideos.length) * 40, 
          `Analyzing video ${processedVideos}/${allVideos.length}`);
      }

      this.updateProgress('orphaned-video-scan', 100, `${orphanedVideos.length} orphaned videos found`);
      
      return orphanedVideos;
    } catch (error) {
      console.error('Error finding orphaned videos:', error);
      this.updateProgress('orphaned-video-scan', 0, 'Error scanning orphaned videos');
      throw error;
    }
  }

  /**
   * Deletes orphaned images by their IDs
   */
  async deleteOrphanedImages(imageIds: string[]): Promise<number> {
    this.updateProgress('delete-images', 0, `Deleting ${imageIds.length} images...`);
    
    let deletedCount = 0;
    
    for (let i = 0; i < imageIds.length; i++) {
      try {
        await this.imageService.deleteImage(imageIds[i]);
        deletedCount++;
        this.updateProgress('delete-images', ((i + 1) / imageIds.length) * 100, 
          `Deleted: ${deletedCount}/${imageIds.length}`);
      } catch (error) {
        console.error(`Failed to delete image ${imageIds[i]}:`, error);
      }
    }

    this.updateProgress('delete-images', 100, `${deletedCount} images successfully deleted`);
    return deletedCount;
  }

  /**
   * Deletes orphaned videos by their IDs
   */
  async deleteOrphanedVideos(videoIds: string[]): Promise<number> {
    this.updateProgress('delete-videos', 0, `Deleting ${videoIds.length} videos...`);
    
    let deletedCount = 0;
    
    for (let i = 0; i < videoIds.length; i++) {
      try {
        await this.videoService.deleteVideo(videoIds[i]);
        deletedCount++;
        this.updateProgress('delete-videos', ((i + 1) / videoIds.length) * 100, 
          `Deleted: ${deletedCount}/${videoIds.length}`);
      } catch (error) {
        console.error(`Failed to delete video ${videoIds[i]}:`, error);
      }
    }

    this.updateProgress('delete-videos', 100, `${deletedCount} videos successfully deleted`);
    return deletedCount;
  }

  /**
   * Firestore handles compaction automatically - this method is kept for compatibility
   */
  async compactDatabase(): Promise<{ sizeBefore: number; sizeAfter: number; saved: number }> {
    this.updateProgress('compact', 0, 'Analyzing database...');
    
    try {
      // Get current database stats as estimate
      const stats = await this.getDatabaseStats();
      const sizeBefore = stats.totalImages + stats.totalVideos + stats.totalStories;

      this.updateProgress('compact', 30, 'Firestore handles compaction automatically...');
      
      // Firestore manages compaction internally - no action needed
      
      this.updateProgress('compact', 80, 'Database analysis complete...');
      
      // Firestore manages compaction automatically
      const sizeAfter = sizeBefore; // No actual compaction performed
      const saved = 0; // Firestore handles this automatically

      this.updateProgress('compact', 100, 'Firestore manages compaction automatically');
      
      return {
        sizeBefore,
        sizeAfter,
        saved
      };
    } catch (error) {
      console.error('Error analyzing database:', error);
      this.updateProgress('compact', 0, 'Error analyzing database');
      throw error;
    }
  }

  /**
   * Finds duplicate images based on base64 content
   */
  async findDuplicateImages(): Promise<DuplicateImage[]> {
    this.updateProgress('duplicates', 0, 'Loading all images...');
    
    try {
      const allImages = await this.imageService.getAllImages();
      this.updateProgress('duplicates', 30, `${allImages.length} images loaded`);

      const duplicates: DuplicateImage[] = [];
      const base64Map = new Map<string, StoredImage[]>();

      // Group images by base64 content
      this.updateProgress('duplicates', 50, 'Grouping images by content...');
      
      for (const image of allImages) {
        const existing = base64Map.get(image.base64Data) || [];
        existing.push(image);
        base64Map.set(image.base64Data, existing);
      }

      // Find duplicates
      this.updateProgress('duplicates', 80, 'Identifying duplicates...');
      
      for (const [, images] of base64Map) {
        if (images.length > 1) {
          const [original, ...duplicateImages] = images.sort((a, b) => 
            new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
          );
          
          duplicates.push({
            originalId: original.id,
            duplicateIds: duplicateImages.map(img => img.id),
            name: original.name,
            size: original.size,
            base64Data: original.base64Data
          });
        }
      }

      this.updateProgress('duplicates', 100, `${duplicates.length} duplicates found`);
      
      return duplicates;
    } catch (error) {
      console.error('Error finding duplicate images:', error);
      this.updateProgress('duplicates', 0, 'Error finding duplicates');
      throw error;
    }
  }

  /**
   * Deletes duplicate images, keeping only the original
   */
  async deleteDuplicateImages(duplicates: DuplicateImage[]): Promise<number> {
    this.updateProgress('delete-duplicates', 0, 'Deleting duplicates...');
    
    let deletedCount = 0;
    const totalToDelete = duplicates.reduce((sum, dup) => sum + dup.duplicateIds.length, 0);

    for (const duplicate of duplicates) {
      for (const duplicateId of duplicate.duplicateIds) {
        try {
          await this.imageService.deleteImage(duplicateId);
          deletedCount++;
          this.updateProgress('delete-duplicates', (deletedCount / totalToDelete) * 100, 
            `Deleted: ${deletedCount}/${totalToDelete}`);
        } catch (error) {
          console.error(`Failed to delete duplicate image ${duplicateId}:`, error);
        }
      }
    }

    this.updateProgress('delete-duplicates', 100, `${deletedCount} duplicates deleted`);
    return deletedCount;
  }

  /**
   * Checks story integrity and finds issues
   */
  async checkStoryIntegrity(): Promise<IntegrityIssue[]> {
    this.updateProgress('integrity', 0, 'Loading all stories...');
    
    try {
      const allStories = await this.storyService.getAllStories();
      this.updateProgress('integrity', 20, `${allStories.length} stories loaded`);

      const issues: IntegrityIssue[] = [];
      let processedCount = 0;

      for (const story of allStories) {
        // Check for missing chapters
        if (!story.chapters || story.chapters.length === 0) {
          issues.push({
            type: 'missing_chapters',
            storyId: story.id,
            storyTitle: story.title || 'Untitled Story',
            description: 'Story has no chapters',
            severity: 'high'
          });
        } else {
          // Check each chapter for missing scenes
          for (const chapter of story.chapters) {
            if (!chapter.scenes || chapter.scenes.length === 0) {
              issues.push({
                type: 'missing_scenes',
                storyId: story.id,
                storyTitle: story.title || 'Untitled Story',
                description: `Chapter "${chapter.title}" has no scenes`,
                severity: 'medium'
              });
            }
          }
        }

        // Check for corrupt data (basic validation)
        if (!story.id || !story.createdAt || !story.updatedAt) {
          issues.push({
            type: 'corrupt_data',
            storyId: story.id || 'unknown',
            storyTitle: story.title || 'Untitled Story',
            description: 'Story has missing or corrupt metadata',
            severity: 'high'
          });
        }

        processedCount++;
        this.updateProgress('integrity', 20 + (processedCount / allStories.length) * 80, 
          `Checking story ${processedCount}/${allStories.length}`);
      }

      this.updateProgress('integrity', 100, `${issues.length} integrity issues found`);
      
      return issues;
    } catch (error) {
      console.error('Error checking story integrity:', error);
      this.updateProgress('integrity', 0, 'Error checking integrity');
      throw error;
    }
  }

  /**
   * Gets database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    this.updateProgress('stats', 0, 'Collecting statistics...');
    
    try {
      const [allImages, allVideos, allStories, orphanedImages, orphanedVideos] = await Promise.all([
        this.imageService.getAllImages(),
        this.videoService.getAllVideos(),
        this.storyService.getAllStories(),
        this.findOrphanedImages(),
        this.findOrphanedVideos()
      ]);

      this.updateProgress('stats', 40, 'Counting images in stories...');

      // Count images embedded in story content
      let embeddedImageCount = 0;
      let embeddedImageSize = 0;

      for (const story of allStories) {
        for (const chapter of story.chapters) {
          for (const scene of chapter.scenes) {
            // Find base64 images in HTML content using the same regex as StoryStatsService
            const base64Regex = /<img[^>]*src="data:image\/([^;]+);base64,([^"]+)"/gi;
            let match;
            
            while ((match = base64Regex.exec(scene.content)) !== null) {
              embeddedImageCount++;
              const base64Data = match[2];
              // Calculate size of base64 data (each base64 char is ~0.75 bytes)
              embeddedImageSize += Math.round(base64Data.length * 0.75);
            }
          }
        }
      }

      this.updateProgress('stats', 80, 'Calculating sizes...');

      // Calculate total images: standalone images + embedded images
      const totalImages = allImages.length + embeddedImageCount;
      const standaloneImageSize = allImages.reduce((sum, img) => sum + img.size, 0);
      const totalImageSize = standaloneImageSize + embeddedImageSize;
      const orphanedImageSize = orphanedImages.reduce((sum, img) => sum + img.size, 0);

      // Calculate video statistics
      const totalVideos = allVideos.length;
      const totalVideoSize = allVideos.reduce((sum, vid) => sum + vid.size, 0);
      const orphanedVideoSize = orphanedVideos.reduce((sum, vid) => sum + vid.size, 0);

      // Estimate database size (rough calculation)
      const avgStorySize = 50000; // ~50KB per story estimate
      const databaseSizeEstimate = totalImageSize + totalVideoSize + (allStories.length * avgStorySize);

      const stats: DatabaseStats = {
        totalImages,
        totalVideos,
        totalStories: allStories.length,
        orphanedImages: orphanedImages.length,
        orphanedVideos: orphanedVideos.length,
        totalImageSize,
        totalVideoSize,
        orphanedImageSize,
        orphanedVideoSize,
        databaseSizeEstimate
      };

      this.updateProgress('stats', 100, 'Statistics created');
      
      return stats;
    } catch (error) {
      console.error('Error getting database stats:', error);
      this.updateProgress('stats', 0, 'Error collecting statistics');
      throw error;
    }
  }

  /**
   * Exports complete database as JSON
   */
  async exportDatabase(): Promise<string> {
    this.updateProgress('export', 0, 'Collecting all data...');
    
    try {
      const [allStories, allImages] = await Promise.all([
        this.storyService.getAllStories(),
        this.imageService.getAllImages()
      ]);

      this.updateProgress('export', 70, 'Creating export...');

      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        stories: allStories,
        images: allImages
      };

      this.updateProgress('export', 100, 'Export created');
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting database:', error);
      this.updateProgress('export', 0, 'Error creating export');
      throw error;
    }
  }

  /**
   * Formats bytes to human readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clears operation progress
   */
  clearProgress(): void {
    this.operationProgress.next({ operation: '', progress: 0, message: '' });
  }
}