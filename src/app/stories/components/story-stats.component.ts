import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel,
  IonGrid, IonRow, IonCol, IonChip, IonList
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  close, statsChartOutline, bookOutline, documentTextOutline, 
  timeOutline, trendingUpOutline, trendingDownOutline, layersOutline, serverOutline, analyticsOutline
} from 'ionicons/icons';
import { Story } from '../models/story.interface';
import { StoryStatsService } from '../services/story-stats.service';

export interface StoryStatistics {
  totalWords: number;
  chapterCounts: { 
    chapterId: string; 
    chapterTitle: string; 
    wordCount: number; 
    sceneCount: number;
    averageWordsPerScene: number;
  }[];
  totalScenes: number;
  totalChapters: number;
  averageWordsPerChapter: number;
  averageWordsPerScene: number;
  longestChapter: { title: string; wordCount: number; } | null;
  shortestChapter: { title: string; wordCount: number; } | null;
  storageUsage: {
    storySize: number;
    storySizeFormatted: string;
    storyTextSize: number;
    storyTextSizeFormatted: string;
    storyImageSize: number;
    storyImageSizeFormatted: string;
    storyImageCount: number;
    totalLocalStorage: number;
    totalLocalStorageFormatted: string;
    percentageUsed: number;
  };
}

@Component({
  selector: 'app-story-stats',
  standalone: true,
  imports: [
    CommonModule,
    IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel,
    IonGrid, IonRow, IonCol, IonChip, IonList
  ],
  template: `
    <ion-modal 
      [isOpen]="isOpen" 
      (didDismiss)="onClose()"
      [showBackdrop]="true"
      [backdropDismiss]="true"
      class="story-stats-modal">
      <ng-template>
        <ion-header class="modal-header">
          <ion-toolbar>
            <ion-title>
              <div class="modal-title">
                <ion-icon name="stats-chart-outline"></ion-icon>
                Story Statistiken
              </div>
            </ion-title>
            <ion-button 
              slot="end" 
              fill="clear" 
              (click)="onClose()"
              aria-label="Schließen"
              class="close-button">
              <ion-icon name="close" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-toolbar>
        </ion-header>
        
        <ion-content 
          class="stats-content" 
          [scrollY]="true"
          [scrollEvents]="true"
          [fullscreen]="false">
          <div class="stats-container" *ngIf="statistics">
          
          <!-- Overview Stats -->
          <ion-card class="overview-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="stats-chart-outline"></ion-icon>
                Übersicht
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-grid>
                <ion-row>
                  <ion-col size="6">
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.totalWords | number }}</div>
                      <div class="stat-label">Gesamtwörter</div>
                    </div>
                  </ion-col>
                  <ion-col size="6">
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.totalChapters }}</div>
                      <div class="stat-label">Kapitel</div>
                    </div>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col size="6">
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.totalScenes }}</div>
                      <div class="stat-label">Szenen</div>
                    </div>
                  </ion-col>
                  <ion-col size="6">
                    <div class="stat-item">
                      <div class="stat-value">{{ getEstimatedReadingTime() }}</div>
                      <div class="stat-label">Lesezeit (Min.)</div>
                    </div>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-card-content>
          </ion-card>

          <!-- Average Stats -->
          <ion-card class="averages-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="trending-up-outline"></ion-icon>
                Durchschnittswerte
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-grid>
                <ion-row>
                  <ion-col size="6">
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.averageWordsPerChapter | number:'1.0-0' }}</div>
                      <div class="stat-label">Wörter pro Kapitel</div>
                    </div>
                  </ion-col>
                  <ion-col size="6">
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.averageWordsPerScene | number:'1.0-0' }}</div>
                      <div class="stat-label">Wörter pro Szene</div>
                    </div>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-card-content>
          </ion-card>

          <!-- Chapter Extremes -->
          <ion-card class="extremes-card" *ngIf="statistics.longestChapter || statistics.shortestChapter">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="layers-outline"></ion-icon>
                Kapitel-Extremwerte
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-item *ngIf="statistics.longestChapter" lines="none">
                <ion-icon name="trending-up-outline" slot="start" color="success"></ion-icon>
                <ion-label>
                  <h3>Längstes Kapitel</h3>
                  <p>{{ statistics.longestChapter.title }}</p>
                  <ion-chip color="success">{{ statistics.longestChapter.wordCount | number }} Wörter</ion-chip>
                </ion-label>
              </ion-item>
              
              <ion-item *ngIf="statistics.shortestChapter" lines="none">
                <ion-icon name="trending-down-outline" slot="start" color="warning"></ion-icon>
                <ion-label>
                  <h3>Kürzestes Kapitel</h3>
                  <p>{{ statistics.shortestChapter.title }}</p>
                  <ion-chip color="warning">{{ statistics.shortestChapter.wordCount | number }} Wörter</ion-chip>
                </ion-label>
              </ion-item>
            </ion-card-content>
          </ion-card>

          <!-- Chapter Details -->
          <ion-card class="chapters-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="book-outline"></ion-icon>
                Kapitel Details
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                <ion-item *ngFor="let chapter of statistics.chapterCounts; trackBy: trackChapter" lines="inset">
                  <ion-label>
                    <h3>{{ chapter.chapterTitle }}</h3>
                    <p>{{ chapter.sceneCount }} Szenen • Ø {{ chapter.averageWordsPerScene | number:'1.0-0' }} Wörter/Szene</p>
                  </ion-label>
                  <ion-chip 
                    slot="end" 
                    [color]="getChapterChipColor(chapter.wordCount)"
                    class="word-count-chip">
                    {{ chapter.wordCount | number }} Wörter
                  </ion-chip>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Storage Usage -->
          <ion-card class="storage-card" *ngIf="statistics?.storageUsage">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="server-outline"></ion-icon>
                Speicherverbrauch
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-grid>
                <ion-row>
                  <ion-col size="6">
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.storageUsage.storySizeFormatted }}</div>
                      <div class="stat-label">Diese Story (Total)</div>
                    </div>
                  </ion-col>
                  <ion-col size="6">
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.storageUsage.totalLocalStorageFormatted }}</div>
                      <div class="stat-label">Gesamt localStorage</div>
                    </div>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col size="4">
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.storageUsage.storyTextSizeFormatted }}</div>
                      <div class="stat-label">Text-Inhalt</div>
                    </div>
                  </ion-col>
                  <ion-col size="4">
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.storageUsage.storyImageSizeFormatted }}</div>
                      <div class="stat-label">Bilder</div>
                    </div>
                  </ion-col>
                  <ion-col size="4">
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.storageUsage.storyImageCount }}</div>
                      <div class="stat-label">Bilder-Anzahl</div>
                    </div>
                  </ion-col>
                </ion-row>
                <ion-row>
                  <ion-col size="12">
                    <div class="storage-progress">
                      <div class="storage-bar">
                        <div class="storage-fill" [style.width.%]="statistics.storageUsage.percentageUsed"></div>
                      </div>
                      <div class="storage-percentage">{{ statistics.storageUsage.percentageUsed }}% des localStorage belegt</div>
                    </div>
                  </ion-col>
                </ion-row>
                <ion-row *ngIf="showDetailedBreakdown">
                  <ion-col size="12">
                    <ion-button 
                      fill="outline" 
                      size="small" 
                      (click)="toggleDetailedBreakdown()"
                      class="breakdown-toggle">
                      <ion-icon name="analytics-outline" slot="start"></ion-icon>
                      Detaillierte Speicher-Analyse
                    </ion-button>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-card-content>
          </ion-card>

          <!-- Progress Indicator (if story has targets) -->
          <ion-card class="progress-card" *ngIf="showProgressInfo()">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="time-outline"></ion-icon>
                Fortschritt
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="progress-info">
                <p>Basierend auf der aktuellen Länge:</p>
                <ion-grid>
                  <ion-row>
                    <ion-col size="4">
                      <div class="progress-item">
                        <div class="progress-value">{{ getNovellaStatus() }}</div>
                        <div class="progress-label">Novelle</div>
                      </div>
                    </ion-col>
                    <ion-col size="4">
                      <div class="progress-item">
                        <div class="progress-value">{{ getNovelStatus() }}</div>
                        <div class="progress-label">Roman</div>
                      </div>
                    </ion-col>
                    <ion-col size="4">
                      <div class="progress-item">
                        <div class="progress-value">{{ getEpicStatus() }}</div>
                        <div class="progress-label">Epos</div>
                      </div>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </div>
            </ion-card-content>
          </ion-card>

          </div>
          
          <div class="loading-state" *ngIf="!statistics">
            <p>Statistiken werden berechnet...</p>
          </div>
          
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    /* Modal styling to match app theme */
    .story-stats-modal {
      --backdrop-opacity: 0.6;
      --border-radius: 16px;
      --box-shadow: 0 28px 48px rgba(0, 0, 0, 0.4);
      --width: 90%;
      --max-width: 800px;
      --height: 85%;
      --max-height: 90vh;
    }
    
    .story-stats-modal ion-content {
      --overflow: auto;
      overflow-y: auto !important;
    }
    
    .modal-header {
      --background: 
        /* Enhanced dark overlay with gradient for depth */
        linear-gradient(135deg, rgba(45, 45, 45, 0.95) 0%, rgba(30, 30, 50, 0.95) 50%, rgba(20, 20, 35, 0.95) 100%),
        /* Main anime image */
        url('/assets/cyberpunk-anime-girl.png'),
        /* Fallback dark background */
        #1a1a2e;
      background-size: cover, cover, auto;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 2px solid rgba(139, 180, 248, 0.3);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    
    .modal-header ion-toolbar {
      --background: transparent;
      --color: #f8f9fa;
      --border-width: 0;
      --padding-start: 20px;
      --padding-end: 20px;
      --min-height: 60px;
    }
    
    .modal-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: linear-gradient(135deg, #ffffff 0%, #8bb4f8 50%, #4776e6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-size: 1.4rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-shadow: 0 2px 10px rgba(139, 180, 248, 0.3);
    }
    
    .modal-title ion-icon {
      font-size: 1.5rem;
      color: #8bb4f8;
      filter: drop-shadow(0 2px 4px rgba(139, 180, 248, 0.3));
    }
    
    .close-button {
      --color: rgba(255, 255, 255, 0.8);
      --background: rgba(255, 255, 255, 0.1);
      --background-hover: rgba(255, 255, 255, 0.2);
      --border-radius: 12px;
      --padding-start: 12px;
      --padding-end: 12px;
      transition: all 0.3s ease;
    }
    
    .close-button:hover {
      transform: scale(1.1) rotate(90deg);
      --background: rgba(255, 107, 107, 0.2);
      --color: #ff6b6b;
    }
    
    .stats-content {
      --background: 
        /* Dark overlay for text readability */
        linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)),
        /* Main anime image */
        url('/assets/cyberpunk-anime-girl.png'),
        /* Fallback dark background */
        #1a1a2e;
      background-size: 100% 100%, cover, auto;
      background-position: center center, center center, center;
      background-repeat: no-repeat, no-repeat, repeat;
      background-attachment: scroll, scroll, scroll;
      --padding-top: 0;
      --padding-bottom: 0;
      --padding-start: 0;
      --padding-end: 0;
      --overflow: auto;
      overflow-y: auto !important;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .stats-container {
      padding: 1.5rem;
      width: 100%;
      box-sizing: border-box;
      flex: 1;
      min-height: min-content;
      overflow-y: visible;
    }
    
    ion-card {
      --background: rgba(42, 42, 42, 0.85);
      --color: #f8f9fa;
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid rgba(139, 180, 248, 0.2);
      border-radius: 16px;
      margin-bottom: 1.5rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      transition: all 0.3s ease;
    }
    
    ion-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
      border-color: rgba(139, 180, 248, 0.4);
    }
    
    ion-card-header {
      --background: rgba(139, 180, 248, 0.1);
      border-bottom: 1px solid rgba(139, 180, 248, 0.2);
      --padding-top: 16px;
      --padding-bottom: 16px;
      --padding-start: 20px;
      --padding-end: 20px;
    }
    
    ion-card-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.2rem;
      font-weight: 600;
      color: #8bb4f8;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
    
    ion-card-title ion-icon {
      font-size: 1.3rem;
      filter: drop-shadow(0 1px 2px rgba(139, 180, 248, 0.5));
    }
    
    ion-card-content {
      --padding-top: 20px;
      --padding-bottom: 20px;
      --padding-start: 20px;
      --padding-end: 20px;
    }
    
    .stat-item {
      text-align: center;
      padding: 0.75rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(139, 180, 248, 0.1);
      transition: all 0.2s ease;
    }
    
    .stat-item:hover {
      background: rgba(139, 180, 248, 0.1);
      border-color: rgba(139, 180, 248, 0.3);
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.5rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    .stat-label {
      font-size: 0.8rem;
      color: #adb5bd;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }
    
    .overview-card .stat-value {
      color: #8bb4f8;
      text-shadow: 0 0 20px rgba(139, 180, 248, 0.3);
    }
    
    .averages-card .stat-value {
      color: #4ecdc4;
      text-shadow: 0 0 20px rgba(78, 205, 196, 0.3);
    }
    
    ion-item {
      --background: rgba(255, 255, 255, 0.05);
      --color: #f8f9fa;
      --border-color: rgba(139, 180, 248, 0.1);
      --border-radius: 12px;
      --padding-start: 16px;
      --padding-end: 16px;
      margin-bottom: 8px;
      transition: all 0.2s ease;
    }
    
    ion-item:hover {
      --background: rgba(139, 180, 248, 0.1);
      --border-color: rgba(139, 180, 248, 0.3);
      transform: translateX(4px);
    }
    
    ion-item h3 {
      color: #ffffff;
      font-weight: 600;
      margin-bottom: 0.25rem;
      font-size: 1rem;
    }
    
    ion-item p {
      color: #adb5bd;
      font-size: 0.9rem;
      margin: 0;
    }
    
    .word-count-chip {
      font-weight: 600;
      --border-radius: 12px;
      font-size: 0.85rem;
    }
    
    /* Storage Usage Styles */
    .storage-card .stat-value {
      color: #ff9f43;
      text-shadow: 0 0 20px rgba(255, 159, 67, 0.3);
    }
    
    .storage-progress {
      margin-top: 1rem;
      text-align: center;
    }
    
    .storage-bar {
      width: 100%;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.5rem;
      border: 1px solid rgba(139, 180, 248, 0.2);
    }
    
    .storage-fill {
      height: 100%;
      background: linear-gradient(90deg, #4ecdc4 0%, #44a08d 50%, #ff9f43 100%);
      transition: width 0.5s ease;
      box-shadow: 0 0 8px rgba(78, 205, 196, 0.3);
    }
    
    .storage-percentage {
      font-size: 0.85rem;
      color: #adb5bd;
      font-weight: 500;
    }
    
    .progress-info {
      text-align: center;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(139, 180, 248, 0.1);
    }
    
    .progress-item {
      text-align: center;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      border: 1px solid rgba(139, 180, 248, 0.1);
      transition: all 0.2s ease;
    }
    
    .progress-item:hover {
      background: rgba(139, 180, 248, 0.1);
      border-color: rgba(139, 180, 248, 0.3);
    }
    
    .progress-value {
      font-size: 1.4rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      color: #8bb4f8;
      text-shadow: 0 0 10px rgba(139, 180, 248, 0.3);
    }
    
    .progress-label {
      font-size: 0.8rem;
      color: #adb5bd;
      text-transform: uppercase;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    
    .loading-state {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 300px;
      color: #adb5bd;
      font-size: 1.1rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      margin: 2rem;
    }
    
    /* Improved mobile responsiveness */
    @media (max-width: 768px) {
      ion-modal {
        --width: 95%;
        --height: 90%;
      }
      
      .stats-container {
        padding: 1rem;
      }
      
      .stat-value {
        font-size: 1.6rem;
      }
      
      .modal-title {
        font-size: 1.2rem;
      }
      
      ion-card-title {
        font-size: 1rem;
      }
      
      ion-card {
        margin-bottom: 1rem;
      }
      
      ion-card-header, ion-card-content {
        --padding-top: 12px;
        --padding-bottom: 12px;
        --padding-start: 16px;
        --padding-end: 16px;
      }
    }
    
    @media (max-width: 480px) {
      .modal-title {
        font-size: 1.1rem;
        gap: 0.5rem;
      }
      
      .stat-value {
        font-size: 1.4rem;
      }
      
      .progress-value {
        font-size: 1.2rem;
      }
    }
  `]
})
export class StoryStatsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;
  @Input() story: Story | null = null;
  @Output() closed = new EventEmitter<void>();

  statistics: StoryStatistics | null = null;
  showDetailedBreakdown = true; // Show detailed breakdown button

  private readonly storyStatsService = inject(StoryStatsService);

  constructor() {
    addIcons({ 
      close, statsChartOutline, bookOutline, documentTextOutline, 
      timeOutline, trendingUpOutline, trendingDownOutline, layersOutline, serverOutline, analyticsOutline
    });
  }

  ngOnInit(): void {
    if (this.story && this.isOpen) {
      this.calculateStatistics();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue && this.story) {
      this.calculateStatistics();
    }
  }


  onClose(): void {
    this.closed.emit();
  }

  private calculateStatistics(): void {
    if (!this.story) return;

    const stats = this.storyStatsService.getStoryWordCountStats(this.story);

    // Enhanced statistics
    const enhancedChapterCounts = stats.chapterCounts.map(chapter => ({
      ...chapter,
      averageWordsPerScene: chapter.sceneCount > 0 ? Math.round(chapter.wordCount / chapter.sceneCount) : 0
    }));

    // Find longest and shortest chapters
    const sortedChapters = [...enhancedChapterCounts].sort((a, b) => b.wordCount - a.wordCount);
    const longestChapter = sortedChapters.length > 0 ? {
      title: sortedChapters[0].chapterTitle,
      wordCount: sortedChapters[0].wordCount
    } : null;
    
    const shortestChapter = sortedChapters.length > 1 ? {
      title: sortedChapters[sortedChapters.length - 1].chapterTitle,
      wordCount: sortedChapters[sortedChapters.length - 1].wordCount
    } : null;

    this.statistics = {
      ...stats,
      chapterCounts: enhancedChapterCounts,
      averageWordsPerChapter: stats.totalChapters > 0 ? Math.round(stats.totalWords / stats.totalChapters) : 0,
      averageWordsPerScene: stats.totalScenes > 0 ? Math.round(stats.totalWords / stats.totalScenes) : 0,
      longestChapter,
      shortestChapter
    };
  }

  getEstimatedReadingTime(): number {
    if (!this.statistics) return 0;
    // Average reading speed: 200-250 words per minute, we use 225
    return Math.round(this.statistics.totalWords / 225);
  }

  getChapterChipColor(wordCount: number): string {
    if (!this.statistics) return 'medium';
    
    const average = this.statistics.averageWordsPerChapter;
    if (wordCount > average * 1.2) return 'success';
    if (wordCount < average * 0.8) return 'warning';
    return 'primary';
  }

  trackChapter(index: number, chapter: {chapterId: string}): string {
    return chapter.chapterId;
  }

  showProgressInfo(): boolean {
    return this.statistics !== null && this.statistics.totalWords > 0;
  }

  getNovellaStatus(): string {
    if (!this.statistics) return '0%';
    // Novella: 17,500 - 40,000 words
    const progress = Math.min(100, (this.statistics.totalWords / 17500) * 100);
    return Math.round(progress) + '%';
  }

  getNovelStatus(): string {
    if (!this.statistics) return '0%';
    // Novel: 40,000+ words
    const progress = Math.min(100, (this.statistics.totalWords / 40000) * 100);
    return Math.round(progress) + '%';
  }

  getEpicStatus(): string {
    if (!this.statistics) return '0%';
    // Epic: 200,000+ words
    const progress = Math.min(100, (this.statistics.totalWords / 200000) * 100);
    return Math.round(progress) + '%';
  }

  toggleDetailedBreakdown(): void {
    // This could open a separate detailed breakdown modal
    // For now, just show an alert with detailed info
    const breakdown = this.storyStatsService.getDetailedStorageBreakdown();
    
    let message = `Detaillierte Speicher-Analyse:\n\n`;
    message += `Gesamtspeicher: ${breakdown.totalSizeFormatted}\n\n`;
    
    message += `localStorage Einträge:\n`;
    breakdown.items.forEach(item => {
      message += `• ${item.description}: ${item.sizeFormatted}\n`;
    });
    
    if (breakdown.storiesBreakdown.length > 0) {
      message += `\nStories Einzeln:\n`;
      breakdown.storiesBreakdown.forEach(story => {
        message += `• ${story.title}: ${story.sizeFormatted} (${story.textSizeFormatted} Text + ${story.imageSizeFormatted} Bilder [${story.imageCount}x])\n`;
      });
    }
    
    alert(message);
  }
}