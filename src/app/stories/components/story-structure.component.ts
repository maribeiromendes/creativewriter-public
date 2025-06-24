import { Component, Input, Output, EventEmitter, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonList, IonItem, IonLabel, IonButton, IonIcon, IonInput,
  IonChip, IonTextarea, IonSelect, IonSelectOption,
  IonButtons, IonHeader, IonToolbar, IonTitle, IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  chevronForward, chevronDown, add, trash, createOutline,
  flashOutline, documentTextOutline, timeOutline, sparklesOutline
} from 'ionicons/icons';
import { Story, Chapter, Scene } from '../models/story.interface';
import { StoryService } from '../services/story.service';
import { OpenRouterApiService } from '../../core/services/openrouter-api.service';
import { ModelService } from '../../core/services/model.service';
import { SettingsService } from '../../core/services/settings.service';
import { PromptManagerService } from '../../shared/services/prompt-manager.service';
import { ModelOption } from '../../core/models/model.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-story-structure',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonList, IonItem, IonLabel, IonButton, IonIcon, IonInput,
    IonChip, IonTextarea, IonSelect, IonSelectOption,
    IonButtons, IonHeader, IonToolbar, IonTitle, IonBadge
  ],
  template: `
    <div class="story-structure">
      <ion-header class="structure-header">
        <ion-toolbar color="dark">
          <ion-title size="small">{{ story.title || 'Unbenannte Geschichte' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button size="small" (click)="addChapter()">
              <ion-icon name="add" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      
      <ion-content color="dark" class="structure-content">
        <ion-list class="chapters-list">
          <div *ngFor="let chapter of story.chapters; trackBy: trackChapter" 
               class="chapter-item">
            
            <ion-item button detail="false" (click)="toggleChapter(chapter.id)" class="chapter-header">
              <ion-icon 
                [name]="expandedChapters.has(chapter.id) ? 'chevron-down' : 'chevron-forward'" 
                slot="start" 
                class="expand-icon">
              </ion-icon>
              <ion-input 
                [(ngModel)]="chapter.title" 
                (ionBlur)="updateChapter(chapter)"
                (click)="$event.stopPropagation()"
                class="chapter-title-input"
                placeholder="Kapitel Titel"
              ></ion-input>
              <ion-button 
                fill="clear" 
                color="danger" 
                slot="end" 
                (click)="deleteChapter(chapter.id, $event)">
                <ion-icon name="trash" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-item>
            
            <div class="scenes-list" *ngIf="expandedChapters.has(chapter.id)">
              <ion-list>
                <ng-container *ngFor="let scene of chapter.scenes; trackBy: trackScene">
                  <ion-item 
                    button
                    detail="false"
                    [class.active-scene]="isActiveScene(chapter.id, scene.id)"
                    (click)="selectScene(chapter.id, scene.id)"
                    class="scene-item">
                    
                    <ion-input 
                      [(ngModel)]="scene.title" 
                      (ionBlur)="updateScene(chapter.id, scene)"
                      (click)="$event.stopPropagation()"
                      class="scene-title-input"
                      placeholder="Szenen Titel"
                    ></ion-input>
                    
                    <ion-button 
                      fill="clear" 
                      size="small"
                      slot="end"
                      [color]="isGeneratingTitle.has(scene.id) ? 'medium' : 'primary'"
                      (click)="generateSceneTitle(chapter.id, scene.id, $event)"
                      [disabled]="isGeneratingTitle.has(scene.id) || !selectedModel || !scene.content.trim()"
                      class="ai-title-btn">
                      <ion-icon 
                        [name]="isGeneratingTitle.has(scene.id) ? 'time-outline' : 'sparkles-outline'" 
                        slot="icon-only">
                      </ion-icon>
                    </ion-button>
                    
                    <ion-badge slot="end" color="medium">{{ getWordCount(scene.content) }} W.</ion-badge>
                    
                    <ion-button 
                      fill="clear" 
                      slot="end"
                      [color]="scene.summary ? 'success' : 'medium'"
                      (click)="toggleSceneDetails(scene.id, $event)"
                      class="expand-scene-btn">
                      <ion-icon 
                        [name]="expandedScenes.has(scene.id) ? 'chevron-down' : 'chevron-forward'" 
                        slot="icon-only">
                      </ion-icon>
                    </ion-button>
                    
                    <ion-button 
                      fill="clear" 
                      color="danger" 
                      slot="end" 
                      (click)="deleteScene(chapter.id, scene.id, $event)">
                      <ion-icon name="trash" slot="icon-only"></ion-icon>
                    </ion-button>
                  </ion-item>
                  
                  <div class="scene-details" *ngIf="expandedScenes.has(scene.id)">
                    <ion-item class="scene-summary-section">
                      <ion-label position="stacked">
                        <div class="summary-header">
                          <span>Zusammenfassung</span>
                          <ion-button 
                            size="small"
                            fill="solid"
                            [color]="isGeneratingSummary.has(scene.id) ? 'medium' : 'success'"
                            (click)="generateSceneSummary(chapter.id, scene.id)"
                            [disabled]="isGeneratingSummary.has(scene.id) || !selectedModel || !scene.content.trim()">
                            <ion-icon 
                              [name]="isGeneratingSummary.has(scene.id) ? 'time-outline' : 'flash-outline'" 
                              slot="icon-only">
                            </ion-icon>
                          </ion-button>
                        </div>
                      </ion-label>
                      
                      <ion-select 
                        [(ngModel)]="selectedModel"
                        placeholder="AI-Modell wählen..."
                        interface="popover"
                        class="model-select">
                        <ion-select-option *ngFor="let model of availableModels" [value]="model.id">
                          {{ model.label }}
                        </ion-select-option>
                      </ion-select>
                      
                      <ion-textarea 
                        [(ngModel)]="scene.summary"
                        (ionBlur)="updateSceneSummary(chapter.id, scene.id, scene.summary || '')"
                        (ionInput)="autoResizeTextarea($event)"
                        [attr.data-scene-id]="scene.id"
                        placeholder="Hier wird die AI-generierte Zusammenfassung der Szene angezeigt..."
                        class="summary-textarea"
                        rows="2"
                        auto-grow="true">
                      </ion-textarea>
                      
                      <ion-chip *ngIf="scene.summaryGeneratedAt" color="medium" class="summary-info">
                        <ion-icon name="time-outline"></ion-icon>
                        <ion-label>{{ scene.summaryGeneratedAt | date:'short' }}</ion-label>
                      </ion-chip>
                    </ion-item>
                  </div>
                </ng-container>
              </ion-list>
              
              <ion-button 
                expand="block" 
                fill="outline" 
                color="primary" 
                class="add-scene-btn" 
                (click)="addScene(chapter.id)">
                <ion-icon name="add" slot="start"></ion-icon>
                Neue Szene
              </ion-button>
            </div>
          </div>
        </ion-list>
      </ion-content>
    </div>
  `,
  styles: [`
    .story-structure {
      width: 280px;
      background: var(--ion-color-dark);
      border-right: 1px solid var(--ion-color-dark-shade);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 128px; /* Below the header */
      left: 0;
      height: calc(100vh - 128px);
      z-index: 100;
    }

    /* Mobile: Keep existing responsive behavior */
    @media (max-width: 768px) {
      .story-structure {
        position: relative;
        height: auto;
        width: 100%;
        z-index: auto;
      }
    }
    
    .structure-header {
      --background: var(--ion-color-dark-shade);
      --border-width: 0 0 1px 0;
      --border-color: var(--ion-color-dark-tint);
    }
    
    .structure-header ion-title {
      font-size: 1.1rem;
    }
    
    .structure-content {
      --background: var(--ion-color-dark);
      flex: 1;
      overflow-y: auto;
    }
    
    .chapters-list {
      background: transparent;
      padding-top: 0.5rem; /* Add top padding to prevent header overlap */
    }
    
    .chapter-item {
      margin-bottom: 0.5rem;
      border: 1px solid var(--ion-color-dark-shade);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .chapter-header {
      --background: var(--ion-color-dark-shade);
      --background-hover: var(--ion-color-dark-tint);
      --color: var(--ion-color-light);
    }
    
    .expand-icon {
      color: var(--ion-color-medium);
      font-size: 1rem;
    }
    
    .chapter-title-input {
      --color: var(--ion-color-light);
      --placeholder-color: var(--ion-color-medium);
      font-weight: 500;
      font-size: 0.9rem;
    }
    
    .scenes-list {
      background: var(--ion-color-dark);
      padding: 0.5rem;
    }
    
    .scenes-list ion-list {
      background: transparent;
    }
    
    .scene-item {
      --background: var(--ion-color-dark-tint);
      --background-hover: var(--ion-color-medium-tint);
      --border-radius: 4px;
      margin-bottom: 0.25rem;
    }
    
    .scene-item.active-scene {
      --background: var(--ion-color-primary);
      --color: var(--ion-color-primary-contrast);
    }
    
    .scene-title-input {
      --color: var(--ion-color-light);
      --placeholder-color: var(--ion-color-medium);
      font-size: 0.85rem;
    }
    
    .scene-item.active-scene .scene-title-input {
      --color: var(--ion-color-primary-contrast);
    }
    
    .expand-scene-btn {
      --padding-start: 4px;
      --padding-end: 4px;
    }
    
    .scene-item.active-scene ion-badge {
      --background: var(--ion-color-primary-contrast);
      --color: var(--ion-color-primary);
    }
    
    .scene-details {
      background: var(--ion-color-dark);
      padding: 0.5rem;
    }
    
    .scene-summary-section {
      --background: var(--ion-color-dark-shade);
      --padding-start: 8px;
      --padding-end: 8px;
      margin: 0;
    }
    
    .summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      color: var(--ion-color-medium);
      font-weight: 500;
    }
    
    .model-select {
      width: 100%;
      margin-bottom: 0.5rem;
      --placeholder-color: var(--ion-color-medium);
    }
    
    .summary-textarea {
      --background: var(--ion-color-dark);
      --color: var(--ion-color-light);
      --placeholder-color: var(--ion-color-medium);
      --padding-start: 8px;
      --padding-end: 8px;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
    
    .summary-info {
      margin-top: 0.5rem;
      float: right;
    }
    
    .add-scene-btn {
      margin: 0.5rem;
      --border-style: dashed;
      --border-width: 1px;
    }

    /* Mobile adjustments */
    @media (max-width: 768px) {
      .story-structure {
        width: 100%;
        max-width: 320px;
        height: 100vh;
        overflow-y: auto;
      }
      
      .structure-content {
        overflow-y: auto;
        height: calc(100vh - 56px); /* Subtract header height */
        -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
      }
      
      .chapters-list {
        padding-top: 0.75rem; /* Extra top padding on mobile */
        padding-bottom: 2rem; /* Extra padding at bottom */
      }
      
      .scenes-list {
        max-height: none; /* Remove any height restrictions */
      }
      
      .scene-details {
        max-height: none; /* Remove any height restrictions */
      }
    }

    /* Force scrollbar visibility on touch devices */
    @media (max-width: 768px) and (pointer: coarse) {
      .structure-content::-webkit-scrollbar {
        width: 6px;
        display: block;
      }
      
      .structure-content::-webkit-scrollbar-track {
        background: var(--ion-color-dark-shade);
        border-radius: 3px;
      }
      
      .structure-content::-webkit-scrollbar-thumb {
        background: var(--ion-color-medium);
        border-radius: 3px;
      }
      
      .structure-content::-webkit-scrollbar-thumb:hover {
        background: var(--ion-color-medium-tint);
      }
    }
  `]
})
export class StoryStructureComponent implements AfterViewInit {
  @Input() story!: Story;
  @Input() activeChapterId: string | null = null;
  @Input() activeSceneId: string | null = null;
  @Output() sceneSelected = new EventEmitter<{chapterId: string, sceneId: string}>();
  
  expandedChapters = new Set<string>();
  expandedScenes = new Set<string>();
  isGeneratingSummary = new Set<string>();
  isGeneratingTitle = new Set<string>();
  selectedModel: string = '';
  availableModels: ModelOption[] = [];
  private subscription = new Subscription();

  constructor(
    private storyService: StoryService,
    private openRouterApiService: OpenRouterApiService,
    private modelService: ModelService,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
    private promptManager: PromptManagerService
  ) {
    addIcons({ 
      chevronForward, chevronDown, add, trash, createOutline,
      flashOutline, documentTextOutline, timeOutline, sparklesOutline
    });
  }

  ngOnInit() {
    // Auto-expand first chapter
    if (this.story && this.story.chapters && this.story.chapters.length > 0) {
      this.expandedChapters.add(this.story.chapters[0].id);
    }
    
    // Load available models and set default
    this.loadAvailableModels();
    this.setDefaultModel();
  }
  
  ngAfterViewInit() {
    // Resize all existing textareas after view initialization
    setTimeout(() => this.resizeAllTextareas(), 100);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  trackChapter(index: number, chapter: Chapter): string {
    return chapter.id;
  }

  trackScene(index: number, scene: Scene): string {
    return scene.id;
  }

  toggleChapter(chapterId: string): void {
    if (this.expandedChapters.has(chapterId)) {
      this.expandedChapters.delete(chapterId);
    } else {
      this.expandedChapters.add(chapterId);
    }
  }

  async addChapter(): Promise<void> {
    await this.storyService.addChapter(this.story.id);
    // Refresh story data
    const updatedStory = await this.storyService.getStory(this.story.id);
    if (updatedStory) {
      this.story = updatedStory;
      // Auto-expand new chapter
      const newChapter = this.story.chapters[this.story.chapters.length - 1];
      this.expandedChapters.add(newChapter.id);
    }
  }

  async updateChapter(chapter: Chapter): Promise<void> {
    await this.storyService.updateChapter(this.story.id, chapter.id, { title: chapter.title });
    // Refresh prompt manager when chapter title changes
    this.promptManager.refresh();
  }

  async deleteChapter(chapterId: string, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.story.chapters.length <= 1) {
      alert('Eine Geschichte muss mindestens ein Kapitel haben.');
      return;
    }
    
    if (confirm('Kapitel wirklich löschen? Alle Szenen gehen verloren.')) {
      await this.storyService.deleteChapter(this.story.id, chapterId);
      const updatedStory = await this.storyService.getStory(this.story.id);
      if (updatedStory) {
        this.story = updatedStory;
        this.expandedChapters.delete(chapterId);
      }
    }
  }

  async addScene(chapterId: string): Promise<void> {
    await this.storyService.addScene(this.story.id, chapterId);
    const updatedStory = await this.storyService.getStory(this.story.id);
    if (updatedStory) {
      this.story = updatedStory;
      // Auto-select new scene
      const chapter = this.story.chapters.find(c => c.id === chapterId);
      if (chapter) {
        const newScene = chapter.scenes[chapter.scenes.length - 1];
        this.selectScene(chapterId, newScene.id);
      }
    }
  }

  async updateScene(chapterId: string, scene: Scene): Promise<void> {
    await this.storyService.updateScene(this.story.id, chapterId, scene.id, { title: scene.title });
    // Refresh prompt manager when scene title changes
    this.promptManager.refresh();
  }

  async deleteScene(chapterId: string, sceneId: string, event: Event): Promise<void> {
    event.stopPropagation();
    const chapter = this.story.chapters.find(c => c.id === chapterId);
    if (chapter && chapter.scenes.length <= 1) {
      alert('Ein Kapitel muss mindestens eine Szene haben.');
      return;
    }
    
    if (confirm('Szene wirklich löschen?')) {
      await this.storyService.deleteScene(this.story.id, chapterId, sceneId);
      const updatedStory = await this.storyService.getStory(this.story.id);
      if (updatedStory) {
        this.story = updatedStory;
      }
    }
  }

  selectScene(chapterId: string, sceneId: string): void {
    this.sceneSelected.emit({ chapterId, sceneId });
  }

  isActiveScene(chapterId: string, sceneId: string): boolean {
    return this.activeChapterId === chapterId && this.activeSceneId === sceneId;
  }

  getWordCount(content: string): number {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
  
  toggleSceneDetails(sceneId: string, event: Event): void {
    event.stopPropagation();
    if (this.expandedScenes.has(sceneId)) {
      this.expandedScenes.delete(sceneId);
    } else {
      this.expandedScenes.add(sceneId);
      // Resize textarea after expanding
      setTimeout(() => this.resizeTextareaForScene(sceneId), 50);
    }
  }
  
  generateSceneSummary(chapterId: string, sceneId: string): void {
    const chapter = this.story.chapters.find(c => c.id === chapterId);
    const scene = chapter?.scenes.find(s => s.id === sceneId);
    
    if (!scene || !scene.content.trim() || !this.selectedModel) {
      return;
    }
    
    this.isGeneratingSummary.add(sceneId);
    
    const prompt = `Erstelle eine Zusammenfassung der folgenden Szene:

Titel: ${scene.title}

Inhalt:
${scene.content}

Die Zusammenfassung soll die wichtigsten Handlungspunkte und Charakterentwicklungen erfassen.`;

    this.openRouterApiService.generateText(prompt, {
      model: this.selectedModel,
      maxTokens: 150,
      temperature: 0.3
    }).subscribe({
      next: async (response) => {
        if (response.choices && response.choices.length > 0) {
          const summary = response.choices[0].message.content.trim();
          await this.updateSceneSummary(chapterId, sceneId, summary);
          
          // Update the scene summary generated timestamp
          if (scene) {
            scene.summaryGeneratedAt = new Date();
            await this.storyService.updateScene(this.story.id, chapterId, sceneId, {
              summary: summary,
              summaryGeneratedAt: scene.summaryGeneratedAt
            });
            // Resize textarea after content update
            setTimeout(() => this.resizeTextareaForScene(sceneId), 50);
          }
        }
        this.isGeneratingSummary.delete(sceneId);
      },
      error: (error) => {
        console.error('Error generating scene summary:', error);
        alert('Fehler beim Generieren der Zusammenfassung. Bitte versuchen Sie es erneut.');
        this.isGeneratingSummary.delete(sceneId);
      }
    });
  }
  
  generateSceneTitle(chapterId: string, sceneId: string, event: Event): void {
    event.stopPropagation();
    
    const chapter = this.story.chapters.find(c => c.id === chapterId);
    const scene = chapter?.scenes.find(s => s.id === sceneId);
    
    if (!scene || !scene.content.trim() || !this.selectedModel) {
      return;
    }
    
    this.isGeneratingTitle.add(sceneId);
    
    const prompt = `Erstelle einen kurzen, prägnanten Titel für die folgende Szene. Der Titel soll maximal 3 Wörter lang sein und den Kern der Szene erfassen.

Szenencontent:
${scene.content}

Antworte nur mit dem Titel, ohne weitere Erklärungen oder Anführungszeichen.`;

    this.openRouterApiService.generateText(prompt, {
      model: this.selectedModel,
      maxTokens: 20,
      temperature: 0.3
    }).subscribe({
      next: async (response) => {
        if (response.choices && response.choices.length > 0) {
          let title = response.choices[0].message.content.trim();
          
          // Remove quotes if present
          title = title.replace(/^["']|["']$/g, '');
          
          // Limit to 3 words
          const words = title.split(/\s+/);
          if (words.length > 3) {
            title = words.slice(0, 3).join(' ');
          }
          
          // Update scene title
          if (scene) {
            scene.title = title;
            await this.updateScene(chapterId, scene);
          }
        }
        this.isGeneratingTitle.delete(sceneId);
      },
      error: (error) => {
        console.error('Error generating scene title:', error);
        alert('Fehler beim Generieren des Titels. Bitte versuchen Sie es erneut.');
        this.isGeneratingTitle.delete(sceneId);
      }
    });
  }
  
  async updateSceneSummary(chapterId: string, sceneId: string, summary: string): Promise<void> {
    const chapter = this.story.chapters.find(c => c.id === chapterId);
    const scene = chapter?.scenes.find(s => s.id === sceneId);
    
    if (scene) {
      scene.summary = summary;
      await this.storyService.updateScene(this.story.id, chapterId, sceneId, { summary });
      // Refresh prompt manager when scene summary changes
      this.promptManager.refresh();
    }
  }
  
  autoResizeTextarea(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea) {
      this.resizeTextarea(textarea);
    }
  }
  
  private resizeTextarea(textarea: HTMLTextAreaElement): void {
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight to fit content
    const newHeight = Math.max(32, textarea.scrollHeight);
    textarea.style.height = newHeight + 'px';
  }
  
  private resizeAllTextareas(): void {
    const textareas = document.querySelectorAll('.summary-textarea');
    textareas.forEach((textarea) => {
      this.resizeTextarea(textarea as HTMLTextAreaElement);
    });
  }
  
  private resizeTextareaForScene(sceneId: string): void {
    const textarea = document.querySelector(`textarea[data-scene-id="${sceneId}"]`) as HTMLTextAreaElement;
    if (textarea) {
      this.resizeTextarea(textarea);
    }
  }
  
  private loadAvailableModels(): void {
    // Subscribe to model changes
    this.subscription.add(
      this.modelService.openRouterModels$.subscribe(models => {
        this.availableModels = models;
        if (models.length > 0 && !this.selectedModel) {
          this.setDefaultModel();
        }
      })
    );
    
    // Load models if not already loaded
    const currentModels = this.modelService.getCurrentOpenRouterModels();
    if (currentModels.length === 0) {
      this.modelService.loadOpenRouterModels().subscribe();
    } else {
      this.availableModels = currentModels;
    }
  }
  
  private setDefaultModel(): void {
    const settings = this.settingsService.getSettings();
    if (settings.openRouter.enabled && settings.openRouter.model) {
      this.selectedModel = settings.openRouter.model;
    } else if (this.availableModels.length > 0) {
      // Fallback to first available model
      this.selectedModel = this.availableModels[0].id;
    }
  }
}