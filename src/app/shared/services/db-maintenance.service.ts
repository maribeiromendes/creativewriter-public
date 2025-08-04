import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DatabaseService } from '../../core/services/database.service';
import { ImageService } from './image.service';
import { StoryService } from '../../stories/services/story.service';
import { StoredImage } from './image.service';

export interface OrphanedImage {
  id: string;
  name: string;
  size: number;
  createdAt: Date;
  base64Data: string;
  mimeType: string;
}

export interface DatabaseStats {
  totalImages: number;
  totalStories: number;
  orphanedImages: number;
  totalImageSize: number;
  orphanedImageSize: number;
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
    this.updateProgress('orphaned-scan', 0, 'Lade alle Bilder...');
    
    try {
      // Get all images from database
      const allImages = await this.imageService.getAllImages();
      this.updateProgress('orphaned-scan', 20, `${allImages.length} Bilder gefunden`);

      // Get all stories
      const allStories = await this.storyService.getAllStories();
      this.updateProgress('orphaned-scan', 40, `${allStories.length} Geschichten gefunden`);

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
          `Verarbeite Geschichte ${processedStories}/${allStories.length}`);
      }

      this.updateProgress('orphaned-scan', 80, 'Analysiere verwaiste Bilder...');

      // Find orphaned images by checking if their base64 data is used
      const orphanedImages: OrphanedImage[] = [];
      let processedImages = 0;

      for (const image of allImages) {
        if (!usedImageData.has(image.base64Data)) {
          orphanedImages.push({
            id: image.id,
            name: image.name,
            size: image.size,
            createdAt: image.createdAt,
            base64Data: image.base64Data,
            mimeType: image.mimeType
          });
        }
        processedImages++;
        this.updateProgress('orphaned-scan', 80 + (processedImages / allImages.length) * 20, 
          `Analysiere Bild ${processedImages}/${allImages.length}`);
      }

      this.updateProgress('orphaned-scan', 100, `${orphanedImages.length} verwaiste Bilder gefunden`);
      
      return orphanedImages;
    } catch (error) {
      console.error('Error finding orphaned images:', error);
      this.updateProgress('orphaned-scan', 0, 'Fehler beim Scannen der verwaisten Bilder');
      throw error;
    }
  }

  /**
   * Deletes orphaned images by their IDs
   */
  async deleteOrphanedImages(imageIds: string[]): Promise<number> {
    this.updateProgress('delete-images', 0, `Lösche ${imageIds.length} Bilder...`);
    
    let deletedCount = 0;
    
    for (let i = 0; i < imageIds.length; i++) {
      try {
        await this.imageService.deleteImage(imageIds[i]);
        deletedCount++;
        this.updateProgress('delete-images', ((i + 1) / imageIds.length) * 100, 
          `Gelöscht: ${deletedCount}/${imageIds.length}`);
      } catch (error) {
        console.error(`Failed to delete image ${imageIds[i]}:`, error);
      }
    }

    this.updateProgress('delete-images', 100, `${deletedCount} Bilder erfolgreich gelöscht`);
    return deletedCount;
  }

  /**
   * Compacts the PouchDB database to reduce size
   */
  async compactDatabase(): Promise<{ sizeBefore: number; sizeAfter: number; saved: number }> {
    this.updateProgress('compact', 0, 'Analysiere Datenbankgröße...');
    
    try {
      const db = await this.databaseService.getDatabase();
      
      // Get size before compaction (estimate)
      const infoBefore = await db.info();
      const sizeBefore = infoBefore.doc_count;

      this.updateProgress('compact', 30, 'Komprimiere Datenbank...');
      
      // Compact database
      await db.compact();

      this.updateProgress('compact', 80, 'Analysiere neue Datenbankgröße...');
      
      // Get size after compaction
      const infoAfter = await db.info();
      const sizeAfter = infoAfter.doc_count;
      const saved = sizeBefore - sizeAfter;

      this.updateProgress('compact', 100, `Komprimierung abgeschlossen. ${saved} Dokumente entfernt`);
      
      return {
        sizeBefore,
        sizeAfter,
        saved
      };
    } catch (error) {
      console.error('Error compacting database:', error);
      this.updateProgress('compact', 0, 'Fehler bei der Datenbankkomparimierung');
      throw error;
    }
  }

  /**
   * Finds duplicate images based on base64 content
   */
  async findDuplicateImages(): Promise<DuplicateImage[]> {
    this.updateProgress('duplicates', 0, 'Lade alle Bilder...');
    
    try {
      const allImages = await this.imageService.getAllImages();
      this.updateProgress('duplicates', 30, `${allImages.length} Bilder geladen`);

      const duplicates: DuplicateImage[] = [];
      const base64Map = new Map<string, StoredImage[]>();

      // Group images by base64 content
      this.updateProgress('duplicates', 50, 'Gruppiere Bilder nach Inhalt...');
      
      for (const image of allImages) {
        const existing = base64Map.get(image.base64Data) || [];
        existing.push(image);
        base64Map.set(image.base64Data, existing);
      }

      // Find duplicates
      this.updateProgress('duplicates', 80, 'Identifiziere Duplikate...');
      
      for (const [, images] of base64Map) {
        if (images.length > 1) {
          const [original, ...duplicateImages] = images.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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

      this.updateProgress('duplicates', 100, `${duplicates.length} Duplikate gefunden`);
      
      return duplicates;
    } catch (error) {
      console.error('Error finding duplicate images:', error);
      this.updateProgress('duplicates', 0, 'Fehler beim Suchen von Duplikaten');
      throw error;
    }
  }

  /**
   * Deletes duplicate images, keeping only the original
   */
  async deleteDuplicateImages(duplicates: DuplicateImage[]): Promise<number> {
    this.updateProgress('delete-duplicates', 0, 'Lösche Duplikate...');
    
    let deletedCount = 0;
    const totalToDelete = duplicates.reduce((sum, dup) => sum + dup.duplicateIds.length, 0);

    for (const duplicate of duplicates) {
      for (const duplicateId of duplicate.duplicateIds) {
        try {
          await this.imageService.deleteImage(duplicateId);
          deletedCount++;
          this.updateProgress('delete-duplicates', (deletedCount / totalToDelete) * 100, 
            `Gelöscht: ${deletedCount}/${totalToDelete}`);
        } catch (error) {
          console.error(`Failed to delete duplicate image ${duplicateId}:`, error);
        }
      }
    }

    this.updateProgress('delete-duplicates', 100, `${deletedCount} Duplikate gelöscht`);
    return deletedCount;
  }

  /**
   * Checks story integrity and finds issues
   */
  async checkStoryIntegrity(): Promise<IntegrityIssue[]> {
    this.updateProgress('integrity', 0, 'Lade alle Geschichten...');
    
    try {
      const allStories = await this.storyService.getAllStories();
      this.updateProgress('integrity', 20, `${allStories.length} Geschichten geladen`);

      const issues: IntegrityIssue[] = [];
      let processedCount = 0;

      for (const story of allStories) {
        // Check for missing chapters
        if (!story.chapters || story.chapters.length === 0) {
          issues.push({
            type: 'missing_chapters',
            storyId: story.id,
            storyTitle: story.title || 'Unbenannte Geschichte',
            description: 'Geschichte hat keine Kapitel',
            severity: 'high'
          });
        } else {
          // Check each chapter for missing scenes
          for (const chapter of story.chapters) {
            if (!chapter.scenes || chapter.scenes.length === 0) {
              issues.push({
                type: 'missing_scenes',
                storyId: story.id,
                storyTitle: story.title || 'Unbenannte Geschichte',
                description: `Kapitel "${chapter.title}" hat keine Szenen`,
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
            storyTitle: story.title || 'Unbenannte Geschichte',
            description: 'Geschichte hat fehlende oder korrupte Metadaten',
            severity: 'high'
          });
        }

        processedCount++;
        this.updateProgress('integrity', 20 + (processedCount / allStories.length) * 80, 
          `Überprüfe Geschichte ${processedCount}/${allStories.length}`);
      }

      this.updateProgress('integrity', 100, `${issues.length} Integritätsprobleme gefunden`);
      
      return issues;
    } catch (error) {
      console.error('Error checking story integrity:', error);
      this.updateProgress('integrity', 0, 'Fehler bei der Integritätsprüfung');
      throw error;
    }
  }

  /**
   * Gets database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    this.updateProgress('stats', 0, 'Sammle Statistiken...');
    
    try {
      const [allImages, allStories, orphanedImages] = await Promise.all([
        this.imageService.getAllImages(),
        this.storyService.getAllStories(),
        this.findOrphanedImages()
      ]);

      this.updateProgress('stats', 80, 'Berechne Größen...');

      const totalImageSize = allImages.reduce((sum, img) => sum + img.size, 0);
      const orphanedImageSize = orphanedImages.reduce((sum, img) => sum + img.size, 0);

      // Estimate database size (rough calculation)
      const avgStorySize = 50000; // ~50KB per story estimate
      const databaseSizeEstimate = totalImageSize + (allStories.length * avgStorySize);

      const stats: DatabaseStats = {
        totalImages: allImages.length,
        totalStories: allStories.length,
        orphanedImages: orphanedImages.length,
        totalImageSize,
        orphanedImageSize,
        databaseSizeEstimate
      };

      this.updateProgress('stats', 100, 'Statistiken erstellt');
      
      return stats;
    } catch (error) {
      console.error('Error getting database stats:', error);
      this.updateProgress('stats', 0, 'Fehler beim Sammeln der Statistiken');
      throw error;
    }
  }

  /**
   * Exports complete database as JSON
   */
  async exportDatabase(): Promise<string> {
    this.updateProgress('export', 0, 'Sammle alle Daten...');
    
    try {
      const [allStories, allImages] = await Promise.all([
        this.storyService.getAllStories(),
        this.imageService.getAllImages()
      ]);

      this.updateProgress('export', 70, 'Erstelle Export...');

      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        stories: allStories,
        images: allImages
      };

      this.updateProgress('export', 100, 'Export erstellt');
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting database:', error);
      this.updateProgress('export', 0, 'Fehler beim Export');
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