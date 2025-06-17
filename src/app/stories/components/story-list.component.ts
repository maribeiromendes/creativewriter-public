import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StoryService } from '../services/story.service';
import { Story } from '../models/story.interface';

@Component({
  selector: 'app-story-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="story-list-container">
      <h1>Meine Geschichten</h1>
      
      <button class="new-story-btn" (click)="createNewStory()">
        Neue Geschichte schreiben
      </button>
      
      <div class="stories-grid" *ngIf="stories.length > 0; else noStories">
        <div class="story-card" *ngFor="let story of stories" (click)="openStory(story.id)">
          <h3>{{ story.title || 'Unbenannte Geschichte' }}</h3>
          <p class="story-preview">{{ getStoryPreview(story.content) }}</p>
          <div class="story-meta">
            <span class="word-count">{{ getWordCount(story.content) }} Wörter</span>
            <span class="last-modified">{{ story.updatedAt | date:'short' }}</span>
          </div>
          <button class="delete-btn" (click)="deleteStory($event, story.id)">Löschen</button>
        </div>
      </div>
      
      <ng-template #noStories>
        <div class="no-stories">
          <p>Noch keine Geschichten vorhanden.</p>
          <p>Beginne mit dem Schreiben deiner ersten Geschichte!</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .story-list-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    h1 {
      text-align: center;
      margin-bottom: 2rem;
      color: #e0e0e0;
    }
    
    .new-story-btn {
      display: block;
      margin: 0 auto 2rem;
      padding: 1rem 2rem;
      background: #0d6efd;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    .new-story-btn:hover {
      background: #0b5ed7;
    }
    
    .stories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    
    .story-card {
      background: #2d2d2d;
      border: 1px solid #404040;
      border-radius: 12px;
      padding: 1.5rem;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      position: relative;
    }
    
    .story-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      border-color: #0d6efd;
    }
    
    .story-card h3 {
      margin: 0 0 1rem 0;
      color: #f8f9fa;
    }
    
    .story-preview {
      color: #adb5bd;
      line-height: 1.4;
      margin-bottom: 1rem;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }
    
    .story-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: #6c757d;
      margin-bottom: 1rem;
    }
    
    .delete-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 0.25rem 0.5rem;
      font-size: 0.8rem;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s, background 0.2s;
    }
    
    .story-card:hover .delete-btn {
      opacity: 1;
    }
    
    .delete-btn:hover {
      background: #c82333;
    }
    
    .no-stories {
      text-align: center;
      padding: 3rem;
      color: #adb5bd;
    }
    
    .no-stories p {
      margin-bottom: 1rem;
      font-size: 1.1rem;
    }
  `]
})
export class StoryListComponent implements OnInit {
  stories: Story[] = [];

  constructor(
    private storyService: StoryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStories();
  }

  loadStories(): void {
    this.stories = this.storyService.getAllStories();
  }

  createNewStory(): void {
    const newStory = this.storyService.createStory();
    this.router.navigate(['/stories/editor', newStory.id]);
  }

  openStory(storyId: string): void {
    this.router.navigate(['/stories/editor', storyId]);
  }

  deleteStory(event: Event, storyId: string): void {
    event.stopPropagation();
    if (confirm('Möchten Sie diese Geschichte wirklich löschen?')) {
      this.storyService.deleteStory(storyId);
      this.loadStories();
    }
  }

  getStoryPreview(content: string): string {
    return content.length > 150 ? content.substring(0, 150) + '...' : content;
  }

  getWordCount(content: string): number {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}