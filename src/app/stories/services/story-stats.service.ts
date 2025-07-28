import { Injectable } from '@angular/core';
import { Story, Scene } from '../models/story.interface';

@Injectable({
  providedIn: 'root'
})
export class StoryStatsService {

  constructor() { }

  /**
   * Calculate total word count for an entire story (all chapters and scenes)
   * @param story The story to calculate word count for
   * @param currentSceneContent Optional: current content of active scene if being edited
   * @param currentChapterId Optional: ID of currently active chapter
   * @param currentSceneId Optional: ID of currently active scene
   * @returns Total word count across all scenes
   */
  calculateTotalStoryWordCount(
    story: Story, 
    currentSceneContent?: string, 
    currentChapterId?: string, 
    currentSceneId?: string
  ): number {
    if (!story || !story.chapters) {
      return 0;
    }

    let totalWordCount = 0;

    for (const chapter of story.chapters) {
      if (!chapter.scenes) continue;

      for (const scene of chapter.scenes) {
        let sceneContent = scene.content;

        // If this is the currently active scene being edited, use the provided current content
        if (currentChapterId === chapter.id && currentSceneId === scene.id && currentSceneContent !== undefined) {
          sceneContent = currentSceneContent;
        }

        if (sceneContent) {
          const words = this.countWordsInContent(sceneContent);
          totalWordCount += words;
        }
      }
    }

    return totalWordCount;
  }

  /**
   * Calculate word count for a specific scene
   * @param scene The scene to calculate word count for
   * @returns Word count for the scene
   */
  calculateSceneWordCount(scene: Scene): number {
    if (!scene || !scene.content) {
      return 0;
    }

    return this.countWordsInContent(scene.content);
  }

  /**
   * Calculate word count for a specific chapter (all its scenes)
   * @param scenes Array of scenes in the chapter
   * @param currentSceneContent Optional: current content of active scene if being edited
   * @param currentSceneId Optional: ID of currently active scene
   * @returns Total word count for the chapter
   */
  calculateChapterWordCount(
    scenes: Scene[], 
    currentSceneContent?: string, 
    currentSceneId?: string
  ): number {
    if (!scenes) {
      return 0;
    }

    let chapterWordCount = 0;

    for (const scene of scenes) {
      let sceneContent = scene.content;

      // If this is the currently active scene being edited, use the provided current content
      if (currentSceneId === scene.id && currentSceneContent !== undefined) {
        sceneContent = currentSceneContent;
      }

      if (sceneContent) {
        const words = this.countWordsInContent(sceneContent);
        chapterWordCount += words;
      }
    }

    return chapterWordCount;
  }

  /**
   * Count words in HTML content by stripping tags and counting words
   * @param htmlContent HTML content to count words in
   * @returns Number of words
   */
  private countWordsInContent(htmlContent: string): number {
    if (!htmlContent || htmlContent.trim() === '') {
      return 0;
    }

    // Strip HTML tags and get plain text
    const textContent = this.stripHtmlTags(htmlContent);
    
    // Split by whitespace and filter out empty strings
    const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
    
    return words.length;
  }

  /**
   * Strip HTML tags from content and return plain text
   * @param html HTML content
   * @returns Plain text content
   */
  private stripHtmlTags(html: string): string {
    // Create a temporary div element to parse HTML and extract text content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  /**
   * Get word count statistics for a story
   * @param story The story to analyze
   * @param currentSceneContent Optional: current content of active scene if being edited
   * @param currentChapterId Optional: ID of currently active chapter
   * @param currentSceneId Optional: ID of currently active scene
   * @returns Object with detailed word count statistics
   */
  getStoryWordCountStats(
    story: Story, 
    currentSceneContent?: string, 
    currentChapterId?: string, 
    currentSceneId?: string
  ): {
    totalWords: number;
    chapterCounts: Array<{ chapterId: string; chapterTitle: string; wordCount: number; sceneCount: number }>;
    totalScenes: number;
    totalChapters: number;
  } {
    const stats = {
      totalWords: 0,
      chapterCounts: [] as Array<{ chapterId: string; chapterTitle: string; wordCount: number; sceneCount: number }>,
      totalScenes: 0,
      totalChapters: 0
    };

    if (!story || !story.chapters) {
      return stats;
    }

    stats.totalChapters = story.chapters.length;

    for (const chapter of story.chapters) {
      if (!chapter.scenes) continue;

      const chapterWordCount = this.calculateChapterWordCount(
        chapter.scenes, 
        currentChapterId === chapter.id ? currentSceneContent : undefined,
        currentChapterId === chapter.id ? currentSceneId : undefined
      );

      stats.chapterCounts.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title || `Chapter ${chapter.chapterNumber || chapter.order || '?'}`,
        wordCount: chapterWordCount,
        sceneCount: chapter.scenes.length
      });

      stats.totalWords += chapterWordCount;
      stats.totalScenes += chapter.scenes.length;
    }

    return stats;
  }
}