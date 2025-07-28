import { Injectable } from '@angular/core';
import { Story, Scene } from '../models/story.interface';

@Injectable({
  providedIn: 'root'
})
export class StoryStatsService {

  constructor() { }

  /**
   * Calculate total word count for an entire story (all chapters and scenes)
   * Uses only saved content from localStorage/database
   * @param story The story to calculate word count for
   * @returns Total word count across all scenes from saved data
   */
  calculateTotalStoryWordCount(story: Story): number {
    if (!story || !story.chapters) {
      return 0;
    }

    let totalWordCount = 0;

    for (const chapter of story.chapters) {
      if (!chapter.scenes) continue;

      for (const scene of chapter.scenes) {
        if (scene.content) {
          const words = this.countWordsInContent(scene.content);
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
   * Uses only saved content from localStorage/database
   * @param scenes Array of scenes in the chapter
   * @returns Total word count for the chapter from saved data
   */
  calculateChapterWordCount(scenes: Scene[]): number {
    if (!scenes) {
      return 0;
    }

    let chapterWordCount = 0;

    for (const scene of scenes) {
      if (scene.content) {
        const words = this.countWordsInContent(scene.content);
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
   * Strip HTML tags from content and return plain text, excluding Beat AI content
   * @param html HTML content
   * @returns Plain text content without formatting or Beat AI suggestions
   */
  private stripHtmlTags(html: string): string {
    // Create a temporary div element to parse HTML and extract text content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove Beat AI elements before extracting text
    const beatAIElements = tempDiv.querySelectorAll(
      '.beat-ai-wrapper, .beat-ai-node, .beat-ai-container, .beat-ai-suggestion, ' +
      '.beat-ai-input, .ai-suggestion, .beat-suggestion, [data-beat-ai], ' +
      '[class*="beat-ai"], [class*="ai-beat"]'
    );
    
    beatAIElements.forEach(element => element.remove());
    
    // Also remove any elements with Beat AI specific attributes or content
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(element => {
      // Remove elements that contain Beat AI markers in their attributes
      if (element.getAttribute('data-type') === 'beat-ai' ||
          element.getAttribute('data-ai') === 'true' ||
          element.className.includes('beat') && element.className.includes('ai')) {
        element.remove();
      }
    });
    
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  /**
   * Get word count statistics for a story
   * Uses only saved content from localStorage/database
   * @param story The story to analyze
   * @returns Object with detailed word count statistics from saved data
   */
  getStoryWordCountStats(story: Story): {
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

      const chapterWordCount = this.calculateChapterWordCount(chapter.scenes);

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