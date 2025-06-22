import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip, IonIcon, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, download, settings, analytics, trash } from 'ionicons/icons';
import { StoryService } from '../services/story.service';
import { Story } from '../models/story.interface';
import { SyncStatusComponent } from '../../shared/components/sync-status.component';
import { LoginComponent } from '../../shared/components/login.component';
import { AuthService, User } from '../../core/services/auth.service';

@Component({
  selector: 'app-story-list',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip, IonIcon, IonButton, SyncStatusComponent, LoginComponent],
  template: `
    <div class="story-list-container">
      <div class="header">
        <h1>Meine Geschichten</h1>
        <div class="header-actions">
          <div class="user-info" *ngIf="currentUser">
            <span class="user-greeting">👋 {{ currentUser.displayName || currentUser.username }}</span>
            <button class="logout-btn" (click)="logout()" title="Abmelden">Abmelden</button>
          </div>
          <app-sync-status [showActions]="true"></app-sync-status>
          <button class="ai-logger-btn" (click)="goToAILogger()" title="AI Request Logger">📊 AI Logs</button>
          <button class="settings-btn" (click)="goToSettings()" title="Einstellungen">⚙️</button>
        </div>
      </div>
      
      <div class="action-buttons">
        <button class="new-story-btn" (click)="createNewStory()">
          Neue Geschichte schreiben
        </button>
        <button class="import-btn" (click)="importNovelCrafter()">
          📥 NovelCrafter Import
        </button>
      </div>
      
      <div class="stories-grid" *ngIf="stories.length > 0; else noStories">
        <ion-card class="story-card" *ngFor="let story of stories" (click)="openStory(story.id)" button>
          <ion-card-header>
            <div class="card-header-content">
              <ion-card-title>{{ story.title || 'Unbenannte Geschichte' }}</ion-card-title>
              <ion-button fill="clear" size="small" color="danger" (click)="deleteStory($event, story.id)">
                <ion-icon name="trash" slot="icon-only"></ion-icon>
              </ion-button>
            </div>
          </ion-card-header>
          <ion-card-content>
            <p class="story-preview">{{ getStoryPreview(story) }}</p>
            <div class="story-chips">
              <ion-chip color="medium">
                <span>{{ getWordCount(story) }} Wörter</span>
              </ion-chip>
              <ion-chip color="medium">
                <span>{{ story.updatedAt | date:'short' }}</span>
              </ion-chip>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
      
      <ng-template #noStories>
        <div class="no-stories">
          <p>Noch keine Geschichten vorhanden.</p>
          <p>Beginne mit dem Schreiben deiner ersten Geschichte!</p>
        </div>
      </ng-template>
      
      <!-- Login Modal -->
      <app-login></app-login>
    </div>
  `,
  styles: [`
    .story-list-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    
    h1 {
      color: #e0e0e0;
      margin: 0;
    }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .user-greeting {
      color: #f8f9fa;
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .logout-btn {
      background: rgba(220, 53, 69, 0.8);
      color: white;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .logout-btn:hover {
      background: rgba(220, 53, 69, 1);
    }
    
    .ai-logger-btn,
    .settings-btn {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    .ai-logger-btn:hover,
    .settings-btn:hover {
      background: #5a6268;
    }
    
    .action-buttons {
      display: flex;
      gap: 1rem;
      margin: 0 auto 2rem;
      max-width: 600px;
      flex-wrap: wrap;
    }

    .new-story-btn {
      padding: 1rem 2rem;
      background: #0d6efd;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      cursor: pointer;
      transition: background 0.3s;
      flex: 1;
      min-width: 200px;
    }
    
    .new-story-btn:hover {
      background: #0b5ed7;
    }

    .import-btn {
      padding: 1rem 2rem;
      background: #6f42c1;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      cursor: pointer;
      transition: background 0.3s;
      flex: 1;
      min-width: 200px;
    }
    
    .import-btn:hover {
      background: #5a2d91;
    }
    
    .stories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      padding: 0 8px;
    }
    
    .story-card {
      margin: 0;
      transition: transform 0.2s ease;
    }
    
    .story-card:hover {
      transform: translateY(-4px);
    }
    
    .card-header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
    }
    
    .card-header-content ion-card-title {
      flex: 1;
      margin-right: 8px;
      font-size: 1.1rem;
    }
    
    .story-preview {
      color: var(--ion-color-medium);
      line-height: 1.4;
      margin: 0 0 12px 0;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      font-size: 0.9rem;
    }
    
    .story-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .story-chips ion-chip {
      font-size: 0.75rem;
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
  currentUser: User | null = null;

  constructor(
    private storyService: StoryService,
    private router: Router,
    private authService: AuthService
  ) {
    // Register Ionic icons
    addIcons({ add, download, settings, analytics, trash });
  }

  ngOnInit(): void {
    this.loadStories();
    
    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      // Reload stories when user changes (different database)
      this.loadStories();
    });
  }

  logout(): void {
    if (confirm('Möchten Sie sich wirklich abmelden? Lokale Änderungen bleiben erhalten.')) {
      this.authService.logout();
    }
  }

  async loadStories(): Promise<void> {
    this.stories = await this.storyService.getAllStories();
  }

  async createNewStory(): Promise<void> {
    const newStory = await this.storyService.createStory();
    this.router.navigate(['/stories/editor', newStory.id]);
  }

  openStory(storyId: string): void {
    this.router.navigate(['/stories/editor', storyId]);
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  goToAILogger(): void {
    this.router.navigate(['/ai-logs']);
  }

  importNovelCrafter(): void {
    this.router.navigate(['/stories/import/novelcrafter']);
  }

  async deleteStory(event: Event, storyId: string): Promise<void> {
    event.stopPropagation();
    if (confirm('Möchten Sie diese Geschichte wirklich löschen?')) {
      await this.storyService.deleteStory(storyId);
      await this.loadStories();
    }
  }

  getStoryPreview(story: Story): string {
    // For legacy stories with content
    if (story.content) {
      return story.content.length > 150 ? story.content.substring(0, 150) + '...' : story.content;
    }
    
    // For new chapter/scene structure
    if (story.chapters && story.chapters.length > 0 && story.chapters[0].scenes && story.chapters[0].scenes.length > 0) {
      const firstScene = story.chapters[0].scenes[0];
      const content = firstScene.content || '';
      return content.length > 150 ? content.substring(0, 150) + '...' : content;
    }
    
    return 'Noch kein Inhalt...';
  }

  getWordCount(story: Story): number {
    // For legacy stories with content
    if (story.content) {
      return story.content.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
    
    // For new chapter/scene structure - count all scenes
    let totalWords = 0;
    if (story.chapters) {
      story.chapters.forEach(chapter => {
        if (chapter.scenes) {
          chapter.scenes.forEach(scene => {
            const content = scene.content || '';
            totalWords += content.trim().split(/\s+/).filter(word => word.length > 0).length;
          });
        }
      });
    }
    
    return totalWords;
  }
}