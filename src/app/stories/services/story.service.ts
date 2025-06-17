import { Injectable } from '@angular/core';
import { Story } from '../models/story.interface';

@Injectable({
  providedIn: 'root'
})
export class StoryService {
  private readonly STORAGE_KEY = 'creative-writer-stories';

  constructor() {}

  getAllStories(): Story[] {
    const stories = localStorage.getItem(this.STORAGE_KEY);
    if (stories) {
      return JSON.parse(stories).map((story: any) => ({
        ...story,
        createdAt: new Date(story.createdAt),
        updatedAt: new Date(story.updatedAt)
      }));
    }
    return [];
  }

  getStory(id: string): Story | null {
    const stories = this.getAllStories();
    return stories.find(story => story.id === id) || null;
  }

  createStory(): Story {
    const newStory: Story = {
      id: this.generateId(),
      title: '',
      content: '',
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

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}