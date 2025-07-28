import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel,
  IonGrid, IonRow, IonCol, IonChip, IonList
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  close, statsChartOutline, bookOutline, documentTextOutline, 
  timeOutline, trendingUpOutline, trendingDownOutline, layersOutline
} from 'ionicons/icons';
import { Story } from '../models/story.interface';
import { StoryStatsService } from '../services/story-stats.service';

export interface StoryStatistics {
  totalWords: number;
  chapterCounts: Array<{ 
    chapterId: string; 
    chapterTitle: string; 
    wordCount: number; 
    sceneCount: number;
    averageWordsPerScene: number;
  }>;
  totalScenes: number;
  totalChapters: number;
  averageWordsPerChapter: number;
  averageWordsPerScene: number;
  longestChapter: { title: string; wordCount: number; } | null;
  shortestChapter: { title: string; wordCount: number; } | null;
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
    <ion-modal [isOpen]="isOpen" (didDismiss)="onClose()">
      <ion-header>
        <ion-toolbar>
          <ion-title>Story Statistiken</ion-title>
          <ion-button 
            slot="end" 
            fill="clear" 
            (click)="onClose()"
            aria-label="Schließen">
            <ion-icon name="close" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-toolbar>
      </ion-header>
      
      <ion-content class="stats-content">
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
    </ion-modal>
  `,
  styles: [`
    .stats-content {
      --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    }
    
    .stats-container {
      padding: 1rem;
      max-width: 800px;
      margin: 0 auto;
    }
    
    ion-card {
      --background: rgba(30, 30, 50, 0.9);
      --color: #f8f9fa;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(139, 180, 248, 0.2);
      border-radius: 16px;
      margin-bottom: 1rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    
    ion-card-header {
      --background: rgba(139, 180, 248, 0.1);
      border-bottom: 1px solid rgba(139, 180, 248, 0.2);
    }
    
    ion-card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      color: #8bb4f8;
    }
    
    ion-card-title ion-icon {
      font-size: 1.2rem;
    }
    
    .stat-item {
      text-align: center;
      padding: 0.5rem;
    }
    
    .stat-value {
      font-size: 1.8rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.25rem;
    }
    
    .stat-label {
      font-size: 0.8rem;
      color: #adb5bd;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .overview-card .stat-value {
      color: #8bb4f8;
    }
    
    .averages-card .stat-value {
      color: #4ecdc4;
    }
    
    ion-item {
      --background: transparent;
      --color: #f8f9fa;
      --border-color: rgba(139, 180, 248, 0.1);
    }
    
    ion-item h3 {
      color: #ffffff;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    ion-item p {
      color: #adb5bd;
      font-size: 0.9rem;
    }
    
    .word-count-chip {
      font-weight: 600;
      --border-radius: 12px;
    }
    
    .progress-info {
      text-align: center;
    }
    
    .progress-item {
      text-align: center;
      padding: 0.5rem;
    }
    
    .progress-value {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    .progress-label {
      font-size: 0.8rem;
      color: #adb5bd;
      text-transform: uppercase;
    }
    
    .loading-state {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
      color: #adb5bd;
    }
    
    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .stats-container {
        padding: 0.5rem;
      }
      
      .stat-value {
        font-size: 1.5rem;
      }
      
      ion-card-title {
        font-size: 1rem;
      }
    }
  `]
})
export class StoryStatsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() story: Story | null = null;
  @Input() currentSceneContent?: string;
  @Input() currentChapterId?: string;
  @Input() currentSceneId?: string;
  @Output() closed = new EventEmitter<void>();

  statistics: StoryStatistics | null = null;

  constructor(private storyStatsService: StoryStatsService) {
    addIcons({ 
      close, statsChartOutline, bookOutline, documentTextOutline, 
      timeOutline, trendingUpOutline, trendingDownOutline, layersOutline
    });
  }

  ngOnInit(): void {
    if (this.story && this.isOpen) {
      this.calculateStatistics();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('StoryStatsComponent ngOnChanges:', changes);
    if (changes['isOpen']?.currentValue && this.story) {
      console.log('Calculating statistics for story:', this.story.title);
      this.calculateStatistics();
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  onClose(): void {
    this.closed.emit();
  }

  private calculateStatistics(): void {
    if (!this.story) return;

    const stats = this.storyStatsService.getStoryWordCountStats(
      this.story,
      this.currentSceneContent,
      this.currentChapterId,
      this.currentSceneId
    );

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

  trackChapter(index: number, chapter: any): string {
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
}