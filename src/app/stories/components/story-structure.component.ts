import { Component, Input, Output, EventEmitter, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="story-structure">
      <div class="structure-header">
        <h3>{{ story.title || 'Unbenannte Geschichte' }}</h3>
        <button class="add-chapter-btn" (click)="addChapter()">+ Kapitel</button>
      </div>
      
      <div class="chapters-list">
        <div *ngFor="let chapter of story.chapters; trackBy: trackChapter" 
             class="chapter-item" 
             [class.expanded]="expandedChapters.has(chapter.id)">
          
          <div class="chapter-header" (click)="toggleChapter(chapter.id)">
            <span class="expand-icon">{{ expandedChapters.has(chapter.id) ? '▼' : '▶' }}</span>
            <input 
              type="text" 
              [(ngModel)]="chapter.title" 
              (blur)="updateChapter(chapter)"
              (click)="$event.stopPropagation()"
              class="chapter-title-input"
            />
            <button class="delete-btn" (click)="deleteChapter(chapter.id, $event)">×</button>
          </div>
          
          <div class="scenes-list" *ngIf="expandedChapters.has(chapter.id)">
            <div *ngFor="let scene of chapter.scenes; trackBy: trackScene" 
                 class="scene-item"
                 [class.active]="isActiveScene(chapter.id, scene.id)"
                 [class.expanded]="expandedScenes.has(scene.id)">
              
              <div class="scene-header" (click)="selectScene(chapter.id, scene.id)">
                <input 
                  type="text" 
                  [(ngModel)]="scene.title" 
                  (blur)="updateScene(chapter.id, scene)"
                  (click)="$event.stopPropagation()"
                  class="scene-title-input"
                />
                <span class="word-count">{{ getWordCount(scene.content) }}</span>
                <button 
                  class="expand-scene-btn" 
                  (click)="toggleSceneDetails(scene.id, $event)"
                  title="Zusammenfassung anzeigen"
                  [class.has-summary]="scene.summary">
                  {{ expandedScenes.has(scene.id) ? '▼' : '▶' }}
                </button>
                <button class="delete-btn" (click)="deleteScene(chapter.id, scene.id, $event)">×</button>
              </div>
              
              <div class="scene-details" *ngIf="expandedScenes.has(scene.id)">
                <div class="scene-summary-section">
                  <div class="summary-header">
                    <span class="summary-label">Zusammenfassung</span>
                    <button 
                      class="generate-summary-btn"
                      (click)="generateSceneSummary(chapter.id, scene.id)"
                      [disabled]="isGeneratingSummary.has(scene.id) || !selectedModel || !scene.content.trim()"
                      title="Zusammenfassung mit AI generieren">
                      {{ isGeneratingSummary.has(scene.id) ? '⏳' : '🤖' }}
                    </button>
                  </div>
                  
                  <div class="model-selection">
                    <select 
                      [(ngModel)]="selectedModel"
                      class="model-select-simple">
                      <option value="" disabled>AI-Modell wählen...</option>
                      <option *ngFor="let model of availableModels" [value]="model.id">
                        {{ model.label }}
                      </option>
                    </select>
                  </div>
                  
                  <div class="summary-content">
                    <textarea 
                      [(ngModel)]="scene.summary"
                      (blur)="updateSceneSummary(chapter.id, scene.id, scene.summary || '')"
                      (input)="autoResizeTextarea($event)"
                      [attr.data-scene-id]="scene.id"
                      placeholder="Hier wird die AI-generierte Zusammenfassung der Szene angezeigt..."
                      class="summary-textarea"
                      rows="2">
                    </textarea>
                    <div class="summary-info" *ngIf="scene.summaryGeneratedAt">
                      <small>Generiert: {{ scene.summaryGeneratedAt | date:'short' }}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <button class="add-scene-btn" (click)="addScene(chapter.id)">+ Szene</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .story-structure {
      width: 280px;
      height: 100vh;
      background: #2d2d2d;
      border-right: 1px solid #404040;
      overflow-y: auto;
      padding: 0.2rem;
    }
    
    .structure-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.2rem;
      padding-bottom: 0.2rem;
      border-bottom: 1px solid #404040;
    }
    
    .structure-header h3 {
      margin: 0;
      color: #f8f9fa;
      font-size: 1.1rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 200px;
    }
    
    .add-chapter-btn {
      background: #0d6efd;
      color: white;
      border: none;
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .add-chapter-btn:hover {
      background: #0b5ed7;
    }
    
    .chapters-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .chapter-item {
      border: 1px solid #404040;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .chapter-header {
      display: flex;
      align-items: center;
      padding: 0.2rem;
      background: #3a3a3a;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .chapter-header:hover {
      background: #444;
    }
    
    .expand-icon {
      color: #adb5bd;
      margin-right: 0.5rem;
      font-size: 0.8rem;
      width: 12px;
    }
    
    .chapter-title-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #f8f9fa;
      font-weight: 500;
      font-size: 0.9rem;
      padding: 0.25rem;
      margin-right: 0.5rem;
    }
    
    .chapter-title-input:focus {
      outline: 1px solid #0d6efd;
      border-radius: 3px;
    }
    
    .scenes-list {
      background: #2a2a2a;
      padding: 0.3rem;
    }
    
    .scene-item {
      margin-bottom: 0.1rem;
      background: #404040;
      border-radius: 4px;
      overflow: hidden;
      transition: background 0.2s;
    }
    
    .scene-item:hover {
      background: #4a4a4a;
    }
    
    .scene-item.active {
      background: #0d6efd;
    }
    
    .scene-header {
      display: flex;
      align-items: center;
      padding: 0.2rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .scene-item.expanded .scene-header {
      border-bottom: 1px solid #555;
    }
    
    .scene-title-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #e0e0e0;
      font-size: 0.85rem;
      padding: 0.15rem;
      margin-right: 0.2rem;
    }
    
    .scene-item.active .scene-title-input {
      color: white;
    }
    
    .scene-title-input:focus {
      outline: 1px solid #0d6efd;
      border-radius: 3px;
    }
    
    .word-count {
      font-size: 0.7rem;
      color: #6c757d;
      margin-right: 0.2rem;
      white-space: nowrap;
    }
    
    .scene-item.active .word-count {
      color: #b3d9ff;
    }
    
    .expand-scene-btn {
      background: transparent;
      border: none;
      color: #6c757d;
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0.25rem;
      margin-left: 0.25rem;
      border-radius: 3px;
      transition: all 0.2s;
    }
    
    .expand-scene-btn:hover {
      background: #555;
      color: #adb5bd;
    }
    
    .scene-item.active .expand-scene-btn {
      color: #b3d9ff;
    }
    
    .expand-scene-btn.has-summary {
      color: #28a745;
    }
    
    .scene-item.active .expand-scene-btn.has-summary {
      color: #90ee90;
    }
    
    .delete-btn {
      background: transparent;
      border: none;
      color: #dc3545;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0.22rem;
      border-radius: 3px;
      transition: background 0.2s;
      opacity: 0.7;
    }
    
    .delete-btn:hover {
      background: #dc3545;
      color: white;
      opacity: 1;
    }
    
    .scene-details {
      padding: 0.2rem;
      background: #353535;
      border-top: 1px solid #555;
    }
    
    .scene-summary-section {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    
    .summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.2rem;
    }
    
    .summary-label {
      font-size: 0.8rem;
      color: #adb5bd;
      font-weight: 500;
    }
    
    .model-selection {
      margin-bottom: 0.5rem;
    }
    
    .model-select-simple {
      width: 100%;
      font-size: 0.7rem;
      background: #2a2a2a;
      border: 1px solid #555;
      border-radius: 3px;
      color: #e0e0e0;
      padding: 0.2rem;
      height: 28px;
    }
    
    .model-select-simple:focus {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
    }
    
    .model-select-simple option {
      background: #2a2a2a;
      color: #e0e0e0;
    }
    
    .generate-summary-btn {
      background: #28a745;
      border: none;
      color: white;
      padding: 0.25rem;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.75rem;
      transition: all 0.2s;
      min-width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .generate-summary-btn:hover:not(:disabled) {
      background: #218838;
    }
    
    .generate-summary-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .summary-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .summary-textarea {
      width: 100%;
      background: #2a2a2a;
      border: 1px solid #555;
      border-radius: 3px;
      padding: 0.2rem;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 0.75rem;
      line-height: 1.3;
      resize: none;
      min-height: 32px;
      overflow-y: hidden;
      transition: height 0.2s ease;
    }
    
    .summary-textarea:focus {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
    }
    
    .summary-textarea::placeholder {
      color: #6c757d;
    }
    
    .summary-info {
      text-align: right;
    }
    
    .summary-info small {
      color: #6c757d;
      font-size: 0.7rem;
    }
    
    .add-scene-btn {
      width: 100%;
      background: transparent;
      border: 1px dashed #6c757d;
      color: #adb5bd;
      padding: 0.2rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
      margin-top: 0.4rem;
    }
    
    .add-scene-btn:hover {
      border-color: #0d6efd;
      color: #0d6efd;
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
  ) {}

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