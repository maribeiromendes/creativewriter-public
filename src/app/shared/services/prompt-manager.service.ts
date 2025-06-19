import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { Story, Scene, Chapter } from '../../stories/models/story.interface';
import { StoryService } from '../../stories/services/story.service';

export interface FlatScene {
  id: string;
  title: string;
  fullText: string; // Content without beat metadata
  summary?: string;
  chapterId: string;
  chapterTitle: string;
  sceneOrder: number;
  chapterOrder: number;
  globalOrder: number; // Overall position in story
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PromptManagerService {
  private flatScenesSubject = new BehaviorSubject<FlatScene[]>([]);
  private currentStoryIdSubject = new BehaviorSubject<string | null>(null);
  
  public flatScenes$ = this.flatScenesSubject.asObservable();
  public currentStoryId$ = this.currentStoryIdSubject.asObservable();

  constructor(private storyService: StoryService) {
    this.initializeStoryWatching();
  }

  /**
   * Initialize watching for story changes
   */
  private initializeStoryWatching(): void {
    // Watch for story ID changes and update flat scenes
    this.currentStoryId$.pipe(
      map(currentStoryId => {
        if (!currentStoryId) return [];
        const story = this.storyService.getStory(currentStoryId);
        return story ? this.buildFlatScenesList(story) : [];
      }),
      distinctUntilChanged((prev, curr) => 
        JSON.stringify(prev) === JSON.stringify(curr)
      )
    ).subscribe(flatScenes => {
      this.flatScenesSubject.next(flatScenes);
    });
  }

  /**
   * Set the current story to watch
   */
  setCurrentStory(storyId: string | null): void {
    this.currentStoryIdSubject.next(storyId);
    
    // Force immediate update
    if (storyId) {
      const story = this.storyService.getStory(storyId);
      if (story) {
        const flatScenes = this.buildFlatScenesList(story);
        this.flatScenesSubject.next(flatScenes);
      }
    }
  }

  /**
   * Get current flat scenes list
   */
  getCurrentFlatScenes(): FlatScene[] {
    return this.flatScenesSubject.value;
  }

  /**
   * Build flat scenes list from story structure
   */
  private buildFlatScenesList(story: Story): FlatScene[] {
    
    const flatScenes: FlatScene[] = [];
    let globalOrder = 0;

    if (!story.chapters || story.chapters.length === 0) {
      return flatScenes;
    }

    // Sort chapters by order
    const sortedChapters = [...story.chapters].sort((a, b) => a.order - b.order);

    for (const chapter of sortedChapters) {
      
      if (!chapter.scenes || chapter.scenes.length === 0) continue;
      
      // Sort scenes by order within chapter
      const sortedScenes = [...chapter.scenes].sort((a, b) => a.order - b.order);

      for (const scene of sortedScenes) {
        const flatScene = {
          id: scene.id,
          title: scene.title,
          fullText: this.extractFullTextFromScene(scene),
          summary: scene.summary,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          sceneOrder: scene.order,
          chapterOrder: chapter.order,
          globalOrder: globalOrder++,
          updatedAt: scene.updatedAt
        };
        flatScenes.push(flatScene);
      }
    }

    return flatScenes;
  }

  /**
   * Extract full text content from scene, removing beat metadata
   */
  private extractFullTextFromScene(scene: Scene): string {
    if (!scene.content) return '';

    let cleanText = scene.content;

    // Remove beat AI nodes (HTML divs with beat-ai-node class)
    cleanText = cleanText.replace(/<div[^>]*class="beat-ai-node"[^>]*>.*?<\/div>/gs, '');
    
    // Remove beat markers like [Beat: description]
    cleanText = cleanText.replace(/\[Beat:[^\]]*\]/g, '');
    
    // Remove beat metadata comments
    cleanText = cleanText.replace(/<!--\s*Beat\s*:.*?-->/gs, '');
    
    // Remove any remaining beat-related HTML elements
    cleanText = cleanText.replace(/<div[^>]*beat[^>]*>.*?<\/div>/gis, '');
    
    // Clean up HTML tags and convert to plain text
    cleanText = cleanText.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    cleanText = cleanText.replace(/&nbsp;/g, ' ');
    cleanText = cleanText.replace(/&amp;/g, '&');
    cleanText = cleanText.replace(/&lt;/g, '<');
    cleanText = cleanText.replace(/&gt;/g, '>');
    cleanText = cleanText.replace(/&quot;/g, '"');
    cleanText = cleanText.replace(/&#39;/g, "'");
    
    // Remove extra whitespace and empty lines
    cleanText = cleanText.replace(/\n\s*\n\s*\n/g, '\n\n');
    cleanText = cleanText.replace(/^\s+|\s+$/gm, ''); // Trim each line
    cleanText = cleanText.trim();

    return cleanText;
  }

  /**
   * Get scenes up to a specific scene (for context)
   */
  getScenesUpTo(targetSceneId: string): FlatScene[] {
    const flatScenes = this.getCurrentFlatScenes();
    
    const targetIndex = flatScenes.findIndex(scene => scene.id === targetSceneId);
    
    if (targetIndex === -1) {
      return [];
    }
    
    const scenesUpTo = flatScenes.slice(0, targetIndex);
    return scenesUpTo;
  }

  /**
   * Get full story context as text
   */
  getFullStoryContext(): string {
    const scenes = this.getCurrentFlatScenes();
    return scenes.map(scene => {
      const chapterHeader = scene.sceneOrder === 0 ? `\n## ${scene.chapterTitle}\n\n` : '';
      return `${chapterHeader}${scene.fullText}`;
    }).join('\n\n');
  }

  /**
   * Get story context using summaries
   */
  getSummaryContext(): string {
    const scenes = this.getCurrentFlatScenes();
    return scenes.map(scene => {
      const chapterHeader = scene.sceneOrder === 0 ? `\n## ${scene.chapterTitle}\n\n` : '';
      const content = scene.summary || scene.fullText.substring(0, 200) + '...';
      return `${chapterHeader}${content}`;
    }).join('\n\n');
  }

  /**
   * Get context up to a specific scene
   */
  getContextUpTo(targetSceneId: string, useSummaries: boolean = false): string {
    const scenes = this.getScenesUpTo(targetSceneId);
    
    return scenes.map(scene => {
      const chapterHeader = scene.sceneOrder === 0 ? `\n## ${scene.chapterTitle}\n\n` : '';
      const content = useSummaries && scene.summary 
        ? scene.summary 
        : scene.fullText;
      return `${chapterHeader}${content}`;
    }).join('\n\n');
  }

  /**
   * Get summaries of all scenes before the current scene (cross-chapter)
   */
  getSummariesBeforeScene(targetSceneId: string): string {
    const scenes = this.getScenesUpTo(targetSceneId);
    
    return scenes
      .filter(scene => scene.summary) // Only scenes with summaries
      .map(scene => scene.summary!)
      .join('\n\n');
  }

  /**
   * Get full text of the scene immediately before the target scene (cross-chapter)
   */
  getPreviousSceneText(targetSceneId: string): string {
    const flatScenes = this.getCurrentFlatScenes();
    const targetIndex = flatScenes.findIndex(scene => scene.id === targetSceneId);
    
    if (targetIndex <= 0) return ''; // No previous scene or target not found
    
    const previousScene = flatScenes[targetIndex - 1];
    return previousScene.fullText;
  }

  /**
   * Force refresh of current story data
   */
  refresh(): void {
    const currentStoryId = this.currentStoryIdSubject.value;
    if (currentStoryId) {
      // Force reload from StoryService
      const story = this.storyService.getStory(currentStoryId);
      if (story) {
        const flatScenes = this.buildFlatScenesList(story);
        // Force update by creating a new array reference to bypass distinctUntilChanged
        this.flatScenesSubject.next([...flatScenes]);
      }
    }
  }

  /**
   * Get statistics about current story
   */
  getStoryStats(): {
    totalScenes: number;
    totalChapters: number;
    totalWords: number;
    scenesWithSummaries: number;
  } {
    const scenes = this.getCurrentFlatScenes();
    const chapters = new Set(scenes.map(s => s.chapterId));
    
    return {
      totalScenes: scenes.length,
      totalChapters: chapters.size,
      totalWords: scenes.reduce((total, scene) => 
        total + (scene.fullText.split(/\s+/).length || 0), 0),
      scenesWithSummaries: scenes.filter(s => s.summary).length
    };
  }
}