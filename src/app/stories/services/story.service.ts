import { Injectable } from '@angular/core';
import { Story, Chapter, Scene, DEFAULT_STORY_SETTINGS } from '../models/story.interface';

@Injectable({
  providedIn: 'root'
})
export class StoryService {
  private readonly STORAGE_KEY = 'creative-writer-stories';

  constructor() {}

  getAllStories(): Story[] {
    const stories = localStorage.getItem(this.STORAGE_KEY);
    if (stories) {
      return JSON.parse(stories).map((story: any) => this.migrateStory(story));
    }
    return [];
  }

  getStory(id: string): Story | null {
    const stories = this.getAllStories();
    return stories.find(story => story.id === id) || null;
  }

  createStory(): Story {
    const firstChapter: Chapter = {
      id: this.generateId(),
      title: 'Kapitel 1',
      order: 1,
      scenes: [{
        id: this.generateId(),
        title: 'Szene 1',
        content: '',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newStory: Story = {
      id: this.generateId(),
      title: '',
      chapters: [firstChapter],
      settings: { ...DEFAULT_STORY_SETTINGS },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const stories = this.getAllStories();
    stories.unshift(newStory);
    this.saveStories(stories);

    return newStory;
  }

  updateStory(updatedStory: Story): void {
    const stories = this.getAllStories();
    const index = stories.findIndex(story => story.id === updatedStory.id);
    
    if (index !== -1) {
      stories[index] = { ...updatedStory };
      this.saveStories(stories);
    }
  }

  deleteStory(id: string): void {
    const stories = this.getAllStories();
    const filteredStories = stories.filter(story => story.id !== id);
    this.saveStories(filteredStories);
  }

  private saveStories(stories: Story[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stories));
  }

  // Migration helper for old stories
  private migrateStory(story: any): Story {
    const migrated: Story = {
      ...story,
      createdAt: new Date(story.createdAt),
      updatedAt: new Date(story.updatedAt)
    };

    // Add default settings if not present
    if (!migrated.settings) {
      migrated.settings = { ...DEFAULT_STORY_SETTINGS };
    }

    // If old story format with content field, migrate to chapter/scene structure
    if (story.content && !story.chapters) {
      const firstChapter: Chapter = {
        id: this.generateId(),
        title: 'Kapitel 1',
        order: 1,
        scenes: [{
          id: this.generateId(),
          title: 'Szene 1',
          content: story.content,
          order: 1,
          createdAt: new Date(story.createdAt),
          updatedAt: new Date(story.updatedAt)
        }],
        createdAt: new Date(story.createdAt),
        updatedAt: new Date(story.updatedAt)
      };
      
      migrated.chapters = [firstChapter];
      delete migrated.content;
      
      // Save migrated story back to localStorage
      setTimeout(() => this.updateStory(migrated), 0);
    }

    // Ensure chapters have proper date objects
    if (migrated.chapters) {
      migrated.chapters = migrated.chapters.map(chapter => ({
        ...chapter,
        createdAt: new Date(chapter.createdAt),
        updatedAt: new Date(chapter.updatedAt),
        scenes: chapter.scenes.map(scene => ({
          ...scene,
          createdAt: new Date(scene.createdAt),
          updatedAt: new Date(scene.updatedAt),
          summaryGeneratedAt: scene.summaryGeneratedAt ? new Date(scene.summaryGeneratedAt) : undefined
        }))
      }));
    }

    return migrated;
  }

  // Chapter operations
  addChapter(storyId: string, title: string = ''): Chapter {
    const story = this.getStory(storyId);
    if (!story) throw new Error('Story not found');

    const newChapter: Chapter = {
      id: this.generateId(),
      title: title || `Kapitel ${story.chapters.length + 1}`,
      order: story.chapters.length + 1,
      scenes: [{
        id: this.generateId(),
        title: 'Szene 1',
        content: '',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    story.chapters.push(newChapter);
    story.updatedAt = new Date();
    this.updateStory(story);
    
    return newChapter;
  }

  updateChapter(storyId: string, chapterId: string, updates: Partial<Chapter>): void {
    const story = this.getStory(storyId);
    if (!story) return;

    const chapterIndex = story.chapters.findIndex(c => c.id === chapterId);
    if (chapterIndex === -1) return;

    story.chapters[chapterIndex] = {
      ...story.chapters[chapterIndex],
      ...updates,
      updatedAt: new Date()
    };
    story.updatedAt = new Date();
    this.updateStory(story);
  }

  deleteChapter(storyId: string, chapterId: string): void {
    const story = this.getStory(storyId);
    if (!story) return;

    story.chapters = story.chapters.filter(c => c.id !== chapterId);
    // Reorder remaining chapters
    story.chapters.forEach((chapter, index) => {
      chapter.order = index + 1;
    });
    story.updatedAt = new Date();
    this.updateStory(story);
  }

  // Scene operations
  addScene(storyId: string, chapterId: string, title: string = ''): Scene {
    const story = this.getStory(storyId);
    if (!story) throw new Error('Story not found');

    const chapter = story.chapters.find(c => c.id === chapterId);
    if (!chapter) throw new Error('Chapter not found');

    const newScene: Scene = {
      id: this.generateId(),
      title: title || `Szene ${chapter.scenes.length + 1}`,
      content: '',
      order: chapter.scenes.length + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    chapter.scenes.push(newScene);
    chapter.updatedAt = new Date();
    story.updatedAt = new Date();
    this.updateStory(story);
    
    return newScene;
  }

  updateScene(storyId: string, chapterId: string, sceneId: string, updates: Partial<Scene>): void {
    const story = this.getStory(storyId);
    if (!story) return;

    const chapter = story.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    const sceneIndex = chapter.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;

    chapter.scenes[sceneIndex] = {
      ...chapter.scenes[sceneIndex],
      ...updates,
      updatedAt: new Date()
    };
    chapter.updatedAt = new Date();
    story.updatedAt = new Date();
    this.updateStory(story);
  }

  deleteScene(storyId: string, chapterId: string, sceneId: string): void {
    const story = this.getStory(storyId);
    if (!story) return;

    const chapter = story.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    chapter.scenes = chapter.scenes.filter(s => s.id !== sceneId);
    // Reorder remaining scenes
    chapter.scenes.forEach((scene, index) => {
      scene.order = index + 1;
    });
    chapter.updatedAt = new Date();
    story.updatedAt = new Date();
    this.updateStory(story);
  }

  getScene(storyId: string, chapterId: string, sceneId: string): Scene | null {
    const story = this.getStory(storyId);
    if (!story) return null;

    const chapter = story.chapters.find(c => c.id === chapterId);
    if (!chapter) return null;

    return chapter.scenes.find(s => s.id === sceneId) || null;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}