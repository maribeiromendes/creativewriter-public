import { Injectable } from '@angular/core';
import { Story, Chapter, Scene, DEFAULT_STORY_SETTINGS } from '../models/story.interface';
import { DatabaseService } from '../../core/services/database.service';

@Injectable({
  providedIn: 'root'
})
export class StoryService {
  private db: any;

  constructor(private databaseService: DatabaseService) {
    // Note: this.db will be set asynchronously in each method
  }

  async getAllStories(): Promise<Story[]> {
    try {
      this.db = await this.databaseService.getDatabase();
      const result = await this.db.allDocs({ 
        include_docs: true,
        descending: true 
      });
      
      console.log('Raw PouchDB result:', result);
      
      const stories = result.rows
        .map((row: any) => {
          console.log('Processing row:', row);
          return row.doc as Story;
        })
        .filter((doc: any) => doc && doc.id) // Filter out any design docs
        .map((story: any) => {
          console.log('Before migration:', story);
          const migrated = this.migrateStory(story);
          console.log('After migration:', migrated);
          return migrated;
        });
        
      return stories;
    } catch (error) {
      console.error('Error fetching stories:', error);
      return [];
    }
  }

  async getStory(id: string): Promise<Story | null> {
    try {
      this.db = await this.databaseService.getDatabase();
      console.log('Getting story with id:', id);
      // Try to get by _id first, then by id
      let doc;
      try {
        doc = await this.db.get(id);
        console.log('Found story by _id:', doc);
      } catch (error) {
        if ((error as any).status === 404) {
          console.log('Story not found by _id, trying id field...');
          // Try to find by id field
          const result = await this.db.find({
            selector: { id: id }
          });
          console.log('Find result:', result);
          if (result.docs && result.docs.length > 0) {
            doc = result.docs[0];
            console.log('Found story by id field:', doc);
          } else {
            console.log('Story not found');
            return null;
          }
        } else {
          throw error;
        }
      }
      const migrated = this.migrateStory(doc as Story);
      console.log('Migrated story:', migrated);
      return migrated;
    } catch (error) {
      console.error('Error getting story:', error);
      return null;
    }
  }

  async createStory(): Promise<Story> {
    this.db = await this.databaseService.getDatabase();
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

    const storyId = this.generateId();
    const newStory: Story = {
      _id: storyId,
      id: storyId,
      title: '',
      chapters: [firstChapter],
      settings: { ...DEFAULT_STORY_SETTINGS },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const response = await this.db.put(newStory);
      newStory._rev = response.rev;
      return newStory;
    } catch (error) {
      console.error('Error creating story:', error);
      throw error;
    }
  }

  async updateStory(updatedStory: Story): Promise<void> {
    try {
      this.db = await this.databaseService.getDatabase();
      // Ensure we have the latest revision
      const currentDoc = await this.db.get(updatedStory._id || updatedStory.id);
      updatedStory._rev = currentDoc._rev;
      updatedStory._id = updatedStory._id || updatedStory.id;
      
      await this.db.put(updatedStory);
    } catch (error) {
      console.error('Error updating story:', error);
      throw error;
    }
  }

  async deleteStory(id: string): Promise<void> {
    try {
      this.db = await this.databaseService.getDatabase();
      let doc;
      try {
        doc = await this.db.get(id);
      } catch (error) {
        if ((error as any).status === 404) {
          // Try to find by id field
          const result = await this.db.find({
            selector: { id: id }
          });
          if (result.docs && result.docs.length > 0) {
            doc = result.docs[0];
          } else {
            throw new Error('Story not found');
          }
        } else {
          throw error;
        }
      }
      await this.db.remove(doc);
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  }

  // Migration helper for old stories
  private migrateStory(story: any): Story {
    const migrated: Story = {
      ...story,
      createdAt: new Date(story.createdAt),
      updatedAt: new Date(story.updatedAt)
    };

    // Ensure _id is set
    if (!migrated._id && migrated.id) {
      migrated._id = migrated.id;
    }

    // Add default settings if not present or merge missing fields
    if (!migrated.settings) {
      migrated.settings = { ...DEFAULT_STORY_SETTINGS };
    } else {
      // Ensure all new settings fields are present
      migrated.settings = {
        ...DEFAULT_STORY_SETTINGS,
        ...migrated.settings
      };
      
      // Migrate old beatTemplate to beatGenerationTemplate if needed
      if ((migrated.settings as any).beatTemplate && !migrated.settings.beatGenerationTemplate) {
        migrated.settings.beatGenerationTemplate = DEFAULT_STORY_SETTINGS.beatGenerationTemplate;
      }
      
      // Remove old beatTemplate field
      delete (migrated.settings as any).beatTemplate;
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
      
      // Migration will be automatically saved when story is next updated
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
  async addChapter(storyId: string, title: string = ''): Promise<Chapter> {
    this.db = await this.databaseService.getDatabase();
    const story = await this.getStory(storyId);
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
    await this.updateStory(story);
    
    return newChapter;
  }

  async updateChapter(storyId: string, chapterId: string, updates: Partial<Chapter>): Promise<void> {
    this.db = await this.databaseService.getDatabase();
    const story = await this.getStory(storyId);
    if (!story) return;

    const chapterIndex = story.chapters.findIndex(c => c.id === chapterId);
    if (chapterIndex === -1) return;

    story.chapters[chapterIndex] = {
      ...story.chapters[chapterIndex],
      ...updates,
      updatedAt: new Date()
    };
    story.updatedAt = new Date();
    await this.updateStory(story);
  }

  async deleteChapter(storyId: string, chapterId: string): Promise<void> {
    this.db = await this.databaseService.getDatabase();
    const story = await this.getStory(storyId);
    if (!story) return;

    story.chapters = story.chapters.filter(c => c.id !== chapterId);
    // Reorder remaining chapters
    story.chapters.forEach((chapter, index) => {
      chapter.order = index + 1;
    });
    story.updatedAt = new Date();
    await this.updateStory(story);
  }

  // Scene operations
  async addScene(storyId: string, chapterId: string, title: string = ''): Promise<Scene> {
    this.db = await this.databaseService.getDatabase();
    const story = await this.getStory(storyId);
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
    await this.updateStory(story);
    
    return newScene;
  }

  async updateScene(storyId: string, chapterId: string, sceneId: string, updates: Partial<Scene>): Promise<void> {
    this.db = await this.databaseService.getDatabase();
    const story = await this.getStory(storyId);
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
    await this.updateStory(story);
  }

  async deleteScene(storyId: string, chapterId: string, sceneId: string): Promise<void> {
    this.db = await this.databaseService.getDatabase();
    const story = await this.getStory(storyId);
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
    await this.updateStory(story);
  }

  async getScene(storyId: string, chapterId: string, sceneId: string): Promise<Scene | null> {
    this.db = await this.databaseService.getDatabase();
    const story = await this.getStory(storyId);
    if (!story) return null;

    const chapter = story.chapters.find(c => c.id === chapterId);
    if (!chapter) return null;

    return chapter.scenes.find(s => s.id === sceneId) || null;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}