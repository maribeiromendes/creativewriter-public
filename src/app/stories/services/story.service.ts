import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Story, Chapter, Scene, DEFAULT_STORY_SETTINGS } from '../models/story.interface';
import { DatabaseService } from '../../core/services/database.service';
import { FirestoreDocument } from '../../core/services/firestore.service';

interface StoryDoc extends Omit<Story, 'createdAt' | 'updatedAt'>, FirestoreDocument {}

@Injectable({
  providedIn: 'root'
})
export class StoryService {
  private readonly databaseService = inject(DatabaseService);

  async getAllStories(): Promise<Story[]> {
    try {
      const stories = await this.databaseService.getAll<StoryDoc>('stories', {
        orderBy: [{ field: 'updatedAt', direction: 'desc' }]
      });
      
      return stories.map(story => this.convertFromFirestore(story));
    } catch (error) {
      console.error('Error getting all stories:', error);
      return [];
    }
  }

  async getStoryById(id: string): Promise<Story | null> {
    try {
      const story = await this.databaseService.get<StoryDoc>('stories', id);
      return story ? this.convertFromFirestore(story) : null;
    } catch (error) {
      console.error('Error getting story by id:', error);
      return null;
    }
  }

  // Legacy method name for backwards compatibility
  async getStory(id: string): Promise<Story | null> {
    return this.getStoryById(id);
  }

  getStoriesObservable(): Observable<Story[]> {
    return new Observable(subscriber => {
      this.databaseService.getAllObservable<StoryDoc>('stories', {
        orderBy: [{ field: 'updatedAt', direction: 'desc' }]
      }).subscribe({
        next: (stories) => {
          subscriber.next(stories.map(story => this.convertFromFirestore(story)));
        },
        error: (err) => subscriber.error(err)
      });
    });
  }

  async createStory(story: Omit<Story, 'createdAt' | 'updatedAt'>): Promise<Story> {
    try {
      const storyData = {
        ...story,
        chapters: story.chapters || [],
        settings: story.settings || DEFAULT_STORY_SETTINGS,
        order: story.order || 0
      };
      
      const created = await this.databaseService.create<StoryDoc>('stories', storyData, story.id);
      return this.convertFromFirestore(created);
    } catch (error) {
      console.error('Error creating story:', error);
      throw error;
    }
  }

  async updateStory(story: Story): Promise<void> {
    try {
      const { id, createdAt, ...updateData } = story;
      await this.databaseService.update<StoryDoc>('stories', id, updateData);
    } catch (error) {
      console.error('Error updating story:', error);
      throw error;
    }
  }

  async deleteStory(id: string): Promise<void> {
    try {
      await this.databaseService.delete('stories', id);
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  }

  async duplicateStory(originalId: string): Promise<Story | null> {
    try {
      const original = await this.getStoryById(originalId);
      if (!original) return null;

      const duplicated = {
        ...original,
        id: `${original.id}_copy_${Date.now()}`,
        title: `${original.title} (Copy)`,
        codexId: undefined // Don't copy codex reference
      };

      return await this.createStory(duplicated);
    } catch (error) {
      console.error('Error duplicating story:', error);
      return null;
    }
  }

  async updateStoryOrder(storyId: string, newOrder: number): Promise<void> {
    try {
      await this.databaseService.update<StoryDoc>('stories', storyId, { order: newOrder });
    } catch (error) {
      console.error('Error updating story order:', error);
      throw error;
    }
  }

  async addChapter(storyId: string, chapter: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const story = await this.getStoryById(storyId);
      if (!story) throw new Error('Story not found');

      const newChapter: Chapter = {
        ...chapter,
        id: `chapter_${Date.now()}`,
        scenes: chapter.scenes || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      story.chapters = story.chapters || [];
      story.chapters.push(newChapter);
      story.updatedAt = new Date();

      await this.updateStory(story);
    } catch (error) {
      console.error('Error adding chapter:', error);
      throw error;
    }
  }

  async updateChapter(storyId: string, chapterId: string, updates: Partial<Chapter>): Promise<void> {
    try {
      const story = await this.getStoryById(storyId);
      if (!story) throw new Error('Story not found');

      const chapterIndex = story.chapters?.findIndex(c => c.id === chapterId);
      if (chapterIndex === undefined || chapterIndex === -1) throw new Error('Chapter not found');

      story.chapters![chapterIndex] = {
        ...story.chapters![chapterIndex],
        ...updates,
        updatedAt: new Date()
      };
      story.updatedAt = new Date();

      await this.updateStory(story);
    } catch (error) {
      console.error('Error updating chapter:', error);
      throw error;
    }
  }

  async deleteChapter(storyId: string, chapterId: string): Promise<void> {
    try {
      const story = await this.getStoryById(storyId);
      if (!story) throw new Error('Story not found');

      story.chapters = story.chapters?.filter(c => c.id !== chapterId) || [];
      story.updatedAt = new Date();

      await this.updateStory(story);
    } catch (error) {
      console.error('Error deleting chapter:', error);
      throw error;
    }
  }

  async addScene(storyId: string, chapterId: string, scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const story = await this.getStoryById(storyId);
      if (!story) throw new Error('Story not found');

      const chapter = story.chapters?.find(c => c.id === chapterId);
      if (!chapter) throw new Error('Chapter not found');

      const newScene: Scene = {
        ...scene,
        id: `scene_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      chapter.scenes = chapter.scenes || [];
      chapter.scenes.push(newScene);
      chapter.updatedAt = new Date();
      story.updatedAt = new Date();

      await this.updateStory(story);
    } catch (error) {
      console.error('Error adding scene:', error);
      throw error;
    }
  }

  async updateScene(storyId: string, chapterId: string, sceneId: string, updates: Partial<Scene>): Promise<void> {
    try {
      const story = await this.getStoryById(storyId);
      if (!story) throw new Error('Story not found');

      const chapter = story.chapters?.find(c => c.id === chapterId);
      if (!chapter) throw new Error('Chapter not found');

      const sceneIndex = chapter.scenes?.findIndex(s => s.id === sceneId);
      if (sceneIndex === undefined || sceneIndex === -1) throw new Error('Scene not found');

      chapter.scenes![sceneIndex] = {
        ...chapter.scenes![sceneIndex],
        ...updates,
        updatedAt: new Date()
      };
      chapter.updatedAt = new Date();
      story.updatedAt = new Date();

      await this.updateStory(story);
    } catch (error) {
      console.error('Error updating scene:', error);
      throw error;
    }
  }

  async deleteScene(storyId: string, chapterId: string, sceneId: string): Promise<void> {
    try {
      const story = await this.getStoryById(storyId);
      if (!story) throw new Error('Story not found');

      const chapter = story.chapters?.find(c => c.id === chapterId);
      if (!chapter) throw new Error('Chapter not found');

      chapter.scenes = chapter.scenes?.filter(s => s.id !== sceneId) || [];
      chapter.updatedAt = new Date();
      story.updatedAt = new Date();

      await this.updateStory(story);
    } catch (error) {
      console.error('Error deleting scene:', error);
      throw error;
    }
  }

  private convertFromFirestore(doc: StoryDoc): Story {
    // Remove Firestore-specific fields and convert to Story interface
    const { id, createdAt, updatedAt, ...storyData } = doc;
    return {
      id,
      createdAt,
      updatedAt,
      ...storyData
    } as Story;
  }

  // Utility methods
  getSceneTotalWordCount(scene: Scene): number {
    if (!scene.content) return 0;
    return scene.content.split(/\s+/).filter(word => word.length > 0).length;
  }

  getChapterWordCount(chapter: Chapter): number {
    return chapter.scenes?.reduce((total, scene) => total + this.getSceneTotalWordCount(scene), 0) || 0;
  }

  getStoryWordCount(story: Story): number {
    return story.chapters?.reduce((total, chapter) => total + this.getChapterWordCount(chapter), 0) || 0;
  }

  getStorySceneCount(story: Story): number {
    return story.chapters?.reduce((total, chapter) => total + (chapter.scenes?.length || 0), 0) || 0;
  }
}