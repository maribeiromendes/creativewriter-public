import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { 
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip, IonIcon, IonButton, 
  IonFab, IonFabButton, IonFabList, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, download, settings, analytics, trash, create, image } from 'ionicons/icons';
import { StoryService } from '../services/story.service';
import { Story } from '../models/story.interface';
import { SyncStatusComponent } from '../../shared/components/sync-status.component';
import { LoginComponent } from '../../shared/components/login.component';
import { AuthService, User } from '../../core/services/auth.service';

@Component({
  selector: 'app-story-list',
  standalone: true,
  imports: [
    CommonModule, 
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip, IonIcon, IonButton, 
    IonFab, IonFabButton, IonFabList, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent,
    SyncStatusComponent, LoginComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Meine Geschichten</ion-title>
        <ion-buttons slot="end" class="header-buttons">
          <ion-button fill="clear" color="medium" (click)="goToAILogger()" class="desktop-only">
            <ion-icon name="analytics" slot="start"></ion-icon>
            AI Logs
          </ion-button>
          <ion-button fill="clear" color="medium" (click)="goToSettings()" class="desktop-only">
            <ion-icon name="settings" slot="start"></ion-icon>
            Einstellungen
          </ion-button>
          <ion-button fill="clear" color="medium" (click)="goToAILogger()" class="mobile-only">
            <ion-icon name="analytics" slot="icon-only"></ion-icon>
          </ion-button>
          <ion-button fill="clear" color="medium" (click)="goToSettings()" class="mobile-only">
            <ion-icon name="settings" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      
      <ion-toolbar color="dark" *ngIf="currentUser" class="user-toolbar">
        <div class="user-info">
          <span class="user-greeting">👋 {{ currentUser.displayName || currentUser.username }}</span>
          <ion-button size="small" fill="clear" color="danger" (click)="logout()">
            Abmelden
          </ion-button>
        </div>
        <app-sync-status [showActions]="true" slot="end"></app-sync-status>
      </ion-toolbar>
    </ion-header>

    <ion-content color="dark">
      <div class="story-list-container">
      
      <div class="action-buttons">
        <ion-button expand="block" size="large" color="primary" (click)="createNewStory()">
          <ion-icon name="add" slot="start"></ion-icon>
          Neue Geschichte schreiben
        </ion-button>
        <ion-button expand="block" size="large" fill="outline" color="medium" (click)="importNovelCrafter()">
          <ion-icon name="download" slot="start"></ion-icon>
          NovelCrafter Import
        </ion-button>
        <ion-button expand="block" size="large" fill="outline" color="secondary" (click)="goToImageGeneration()">
          <ion-icon name="image" slot="start"></ion-icon>
          Bildgenerierung
        </ion-button>
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
      
      <!-- Mobile FAB -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="primary">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button color="primary" (click)="createNewStory()">
            <ion-icon name="create"></ion-icon>
          </ion-fab-button>
          <ion-fab-button color="secondary" (click)="importNovelCrafter()">
            <ion-icon name="download"></ion-icon>
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>
      
      <!-- Login Modal -->
      <app-login></app-login>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: #1a1a1a;
    }
    
    .story-list-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    .user-toolbar {
      --min-height: 48px;
      --padding-top: 8px;
      --padding-bottom: 8px;
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-left: 16px;
    }
    
    .user-greeting {
      color: #f8f9fa;
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .desktop-only {
      display: inline-flex;
    }
    
    .mobile-only {
      display: none;
    }
    
    .action-buttons {
      display: flex;
      gap: 1rem;
      margin: 0 auto 2rem;
      max-width: 600px;
      flex-wrap: wrap;
    }
    
    .action-buttons ion-button {
      flex: 1;
      min-width: 200px;
    }
    
    /* Hide FAB on desktop, show action buttons */
    @media (min-width: 768px) {
      ion-fab {
        display: none;
      }
    }
    
    /* Hide action buttons on mobile, show FAB */
    @media (max-width: 767px) {
      .action-buttons {
        display: none;
      }
      
      .desktop-only {
        display: none;
      }
      
      .mobile-only {
        display: inline-flex;
      }
      
      .user-info {
        width: 90%;
        justify-content: center;
        margin: 0 auto;
      }
      
      .user-greeting {
        font-size: 0.8rem;
      }
      
      .user-toolbar {
        --padding-start: 8px;
        --padding-end: 8px;
      }
    }
    
    @media (max-width: 480px) {
      .story-list-container {
        padding: 1rem 0.5rem;
      }
      
      .user-info {
        width: 95%;
        padding: 0.4rem 0.8rem;
      }
      
      .user-greeting {
        font-size: 0.75rem;
      }
      
      .stories-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
        padding: 0;
      }
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
    addIcons({ add, download, settings, analytics, trash, create, image });
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
    this.router.navigate(['/logs']);
  }

  importNovelCrafter(): void {
    this.router.navigate(['/stories/import/novelcrafter']);
  }

  goToImageGeneration(): void {
    this.router.navigate(['/stories/image-generation']);
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