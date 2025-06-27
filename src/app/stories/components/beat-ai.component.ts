import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { BeatAI, BeatAIPromptEvent } from '../models/beat-ai.interface';
import { Subscription } from 'rxjs';
import { ModelOption } from '../../core/models/model.interface';
import { ModelService } from '../../core/services/model.service';
import { SettingsService } from '../../core/services/settings.service';
import { BeatAIService } from '../../shared/services/beat-ai.service';

@Component({
  selector: 'app-beat-ai',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  template: `
    <div class="beat-ai-container" [class.editing]="beatData.isEditing" [class.generating]="beatData.isGenerating">
      <!-- Prompt Input Section -->
      <div class="beat-prompt-section" [class.collapsed]="!beatData.isEditing && beatData.generatedContent">
        <div class="beat-header">
          <div class="beat-icon">🎭</div>
          <div class="beat-title">Beat AI</div>
          <div class="beat-actions">
            <button 
              *ngIf="!beatData.isEditing && beatData.prompt" 
              class="edit-btn"
              (click)="startEditing()"
              title="Prompt bearbeiten">
              ✏️
            </button>
            <button 
              *ngIf="beatData.generatedContent && !beatData.isGenerating" 
              class="regenerate-btn"
              (click)="regenerateContent()"
              title="Neu generieren">
              🔄
            </button>
            <button 
              *ngIf="beatData.generatedContent && !beatData.isGenerating" 
              class="delete-after-btn"
              (click)="deleteContentAfterBeat()"
              title="Text nach diesem Beat löschen">
              🗑️
            </button>
          </div>
        </div>
        
        <div class="prompt-input-container" *ngIf="beatData.isEditing || !beatData.prompt">
          <textarea
            #promptInput
            class="prompt-input"
            [(ngModel)]="currentPrompt"
            placeholder="Beschreibe den Beat, den die AI generieren soll..."
            rows="3"
            (keydown.enter)="onPromptKeydown($event)"
            (click)="onTextareaClick($event)"
            (focus)="onTextareaFocus($event)"
            (mousedown)="onTextareaMousedown($event)"
          ></textarea>
          
          <!-- Generation Options -->
          <div class="generation-options" *ngIf="beatData.isEditing || !beatData.prompt">
            <div class="options-row">
              <div class="option-group">
                <ng-select [(ngModel)]="selectedWordCount"
                           [items]="wordCountOptions"
                           bindLabel="label"
                           bindValue="value"
                           [clearable]="false"
                           [searchable]="false"
                           placeholder="Wortanzahl wählen..."
                           class="model-select"
                           appendTo="body">
                </ng-select>
              </div>
              <div class="option-group">
                <ng-select [(ngModel)]="selectedModel"
                           [items]="availableModels"
                           bindLabel="label"
                           bindValue="id"
                           [clearable]="false"
                           [searchable]="true"
                           placeholder="Modell auswählen..."
                           class="model-select"
                           appendTo="body">
                </ng-select>
              </div>
            </div>
          </div>

          <div class="prompt-actions">
            <button 
              class="generate-btn primary"
              (click)="generateContent()"
              [disabled]="!currentPrompt.trim() || beatData.isGenerating || !selectedModel">
              {{ beatData.generatedContent ? 'Regenerieren' : 'Generieren' }}
            </button>
            <button 
              class="generate-btn primary"
              (click)="showPromptPreview()"
              [disabled]="!currentPrompt.trim()"
              title="Prompt-Vorschau anzeigen">
              👁️ Vorschau
            </button>
            <button 
              *ngIf="beatData.prompt && beatData.isEditing"
              class="cancel-btn"
              (click)="cancelEditing()">
              Abbrechen
            </button>
          </div>
        </div>
        
        <div class="prompt-display" *ngIf="!beatData.isEditing && beatData.prompt">
          <div class="prompt-text">{{ beatData.prompt }}</div>
        </div>
      </div>
      
      <!-- Generation Status -->
      <div class="generation-status" *ngIf="beatData.isGenerating">
        <div class="generation-indicator">
          <span class="generating-text">Text wird gestreamt...</span>
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
        <button 
          class="stop-btn"
          (click)="stopGeneration()"
          title="Generierung stoppen">
          ⏹️ Stoppen
        </button>
      </div>
    </div>

    <!-- Prompt Preview Modal -->
    <div class="preview-modal" *ngIf="showPreviewModal" (click)="hidePromptPreview()">
      <div class="preview-content" (click)="$event.stopPropagation()">
        <div class="preview-header">
          <h3>Prompt-Vorschau</h3>
          <button class="close-btn" (click)="hidePromptPreview()">×</button>
        </div>
        <div class="preview-body">
          <pre class="prompt-preview">{{ previewContent }}</pre>
        </div>
        <div class="preview-footer">
          <button class="btn btn-secondary" (click)="hidePromptPreview()">Schließen</button>
          <button class="btn btn-primary" (click)="hidePromptPreview(); generateContent()">
            Jetzt generieren
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .beat-ai-container {
      border: 2px solid #404040;
      border-radius: 8px;
      background: #2d2d2d;
      margin: 1rem 0;
      overflow: hidden;
      transition: all 0.3s ease;
      max-width: 100%;
    }
    
    .beat-ai-container.editing {
      border-color: #0d6efd;
      box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
    }
    
    .beat-ai-container.generating {
      border-color: #ffc107;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }
    
    .beat-prompt-section {
      padding: 0.5rem;
      transition: all 0.3s ease;
    }
    
    .beat-prompt-section.collapsed {
      padding: 0.5rem;
    }
    
    .beat-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    
    .beat-icon {
      font-size: 1.2rem;
    }
    
    .beat-title {
      font-weight: 600;
      color: #f8f9fa;
      flex: 1;
    }
    
    .beat-actions {
      display: flex;
      gap: 0.25rem;
    }
    
    .edit-btn, .regenerate-btn, .delete-after-btn {
      background: none;
      border: none;
      padding: 0.25rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
      font-size: 0.9rem;
    }
    
    .edit-btn:hover, .regenerate-btn:hover, .delete-after-btn:hover {
      background: #404040;
    }
    
    .delete-after-btn:hover {
      background: #5c2020;
    }
    
    .prompt-input-container {
      margin-top: 0.25rem;
    }
    
    .prompt-input {
      width: 100%;
      background: #1a1a1a;
      border: 1px solid #404040;
      border-radius: 6px;
      padding: 0.75rem;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 0.9rem;
      line-height: 1.4;
      resize: vertical;
      min-height: 60px;
    }
    
    .prompt-input:focus {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
    }
    
    .prompt-input::placeholder {
      color: #6c757d;
    }
    
    .generation-options {
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
    }
    
    .options-row {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 1rem;
    }

    @media (max-width: 768px) {
      .options-row {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }
    }
    
    .option-group {
      display: flex;
      flex-direction: column;
    }
    
    .model-select {
      font-size: 0.9rem;
    }
    
    .model-name {
      display: block;
      font-weight: 500;
    }
    
    .model-cost {
      color: #28a745;
      font-weight: 500;
    }

    .prompt-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    
    .generate-btn, .cancel-btn {
      padding: 0.2rem;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .generate-btn.primary {
      background: #0d6efd;
      color: white;
    }
    
    .generate-btn.primary:hover:not(:disabled) {
      background: #0b5ed7;
    }
    
    .generate-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .cancel-btn {
      background: #6c757d;
      color: white;
    }
    
    .cancel-btn:hover {
      background: #5a6268;
    }
    
    .prompt-display {
      margin-top: 0.25rem;
    }
    
    .prompt-text {
      color: #adb5bd;
      font-style: italic;
      font-size: 0.9rem;
      line-height: 1.4;
    }
    
    .generation-status {
      padding: 0.5rem 1rem;
      background: #242424;
      border-top: 1px solid #404040;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .generation-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .stop-btn {
      background: #dc3545;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    
    .stop-btn:hover {
      background: #c82333;
    }
    
    .generating-text {
      color: #ffc107;
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .typing-indicator {
      display: inline-flex;
      gap: 2px;
      margin-left: 4px;
    }
    
    .typing-indicator span {
      width: 4px;
      height: 4px;
      background: #0d6efd;
      border-radius: 50%;
      animation: typing 1.4s infinite;
    }
    
    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }
    
    @keyframes typing {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.4;
      }
      30% {
        transform: translateY(-8px);
        opacity: 1;
      }
    }
    
    /* Custom ng-select styling */
    :global(.model-select .ng-select-container) {
      min-height: 44px !important; /* iOS minimum touch target */
      background: #1a1a1a !important;
      border: 1px solid #404040 !important;
      border-radius: 4px !important;
    }
    
    :global(.model-select .ng-select-container .ng-value-container) {
      padding-left: 0.3rem !important;
      background: transparent !important;
    }
    
    :global(.model-select .ng-select-container .ng-value-container .ng-input > input) {
      color: #e0e0e0 !important;
      background: transparent !important;
    }
    
    :global(.model-select .ng-select-container .ng-value-container .ng-value) {
      color: #e0e0e0 !important;
      background: transparent !important;
    }
    
    :global(.model-select .ng-select-container .ng-value-container .ng-placeholder) {
      color: #6c757d !important;
    }
    
    :global(.model-select.ng-select-focused .ng-select-container) {
      border-color: #0d6efd !important;
      box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25) !important;
    }
    
    :global(.model-select .ng-dropdown-panel) {
      background: #2d2d2d !important;
      border: 1px solid #404040 !important;
      border-radius: 4px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
      z-index: 9999 !important;
    }
    
    :global(.model-select .ng-dropdown-panel .ng-dropdown-panel-items .ng-option) {
      color: #e0e0e0 !important;
      background: #2d2d2d !important;
      padding: 0.5rem !important;
      font-size: 0.9rem !important;
    }
    
    :global(.model-select .ng-dropdown-panel .ng-dropdown-panel-items .ng-option.ng-option-highlighted) {
      background: #383838 !important;
    }
    
    :global(.model-select .ng-dropdown-panel .ng-dropdown-panel-items .ng-option.ng-option-selected) {
      background: #0d6efd !important;
    }

    .preview-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(2px);
    }

    .preview-content {
      background: #2d2d2d;
      border-radius: 8px;
      width: 90%;
      max-width: 800px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .preview-header {
      padding: 0.2rem 0.8rem;
      background: #343a40;
      border-bottom: 1px solid #495057;
      display: flex;
      justify-content: between;
      align-items: center;
    }

    .preview-header h3 {
      margin: 0;
      color: #f8f9fa;
      flex: 1;
    }

    .close-btn {
      background: none;
      border: none;
      color: #adb5bd;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.3s, color 0.3s;
    }

    .close-btn:hover {
      background: #495057;
      color: #f8f9fa;
    }

    .preview-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .prompt-preview {
      background: #1a1a1a;
      border: 1px solid #404040;
      border-radius: 6px;
      padding: 0.5rem;
      color: #e0e0e0;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      line-height: 1.5;
      white-space: pre-wrap;
      margin: 0;
      overflow-x: auto;
    }

    .preview-footer {
      padding: 1rem 1.5rem;
      background: #343a40;
      border-top: 1px solid #495057;
      display: flex;
      gap: 0.2rem;
      justify-content: flex-end;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.3s;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    .btn-primary {
      background: #0d6efd;
      color: white;
    }

    .btn-primary:hover {
      background: #0b5ed7;
    }

    /* Mobile optimizations for Beat AI */
    @media (max-width: 768px) {
      .beat-ai-container {
        margin: 0.2rem 0;
        border-radius: 6px;
      }
      
      .beat-prompt-section {
        padding: 0.4rem;
      }
      
      .beat-header {
        margin-bottom: 0.4rem;
      }
      
      .beat-title {
        font-size: 0.9rem;
      }
      
      .prompt-input {
        font-size: 0.9rem;
        padding: 0.2rem;
        min-height: 50px;
      }
      
      .generation-options {
        margin-top: 0.4rem;
        margin-bottom: 0.4rem;
      }
                  
      .prompt-actions {
        margin-top: 0.4rem;
        gap: 0.25rem;
      }
      
      .generate-btn, .cancel-btn {
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
        min-width: 80px;
      }
      
      .preview-modal .preview-content {
        width: 95%;
        max-height: 90vh;
        margin: 0.5rem;
      }
      
      .preview-header {
        padding: 0.75rem 1rem;
      }
      
      .preview-header h3 {
        font-size: 1.1rem;
      }
      
      .preview-body {
        padding: 1rem;
      }
      
      .prompt-preview {
        font-size: 0.8rem;
        padding: 0.75rem;
      }
      
      .preview-footer {
        padding: 0.75rem 1rem;
        gap: 0.5rem;
      }
      
      .btn {
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
      }
      
      .generation-status {
        padding: 0.4rem 0.75rem;
        flex-direction: column;
        gap: 0.4rem;
        align-items: stretch;
      }
      
      .stop-btn {
        padding: 0.4rem 0.8rem;
        font-size: 0.8rem;
        align-self: center;
        min-width: 100px;
      }
    }

    @media (max-width: 480px) {
      .beat-ai-container {
        margin: 0.25rem 0;
      }
      
      .beat-prompt-section {
        padding: 0.3rem;
      }
      
      .beat-header {
        margin-bottom: 0.3rem;
      }
      
      .prompt-actions {
        justify-content: center;
      }
      
      .generate-btn, .cancel-btn {
        flex: 1;
        min-width: auto;
        max-width: 120px;
      }
      
      .preview-modal .preview-content {
        width: 98%;
        margin: 0.25rem;
      }
      
      .prompt-preview {
        font-size: 0.75rem;
      }
    }
  `]
})
export class BeatAIComponent implements OnInit, OnDestroy {
  @Input() beatData!: BeatAI;
  @Input() storyId?: string;
  @Input() chapterId?: string;
  @Input() sceneId?: string;
  @Output() promptSubmit = new EventEmitter<BeatAIPromptEvent>();
  @Output() contentUpdate = new EventEmitter<BeatAI>();
  @Output() delete = new EventEmitter<string>();
  @Output() focus = new EventEmitter<void>();
  
  @ViewChild('promptInput') promptInput!: ElementRef<HTMLTextAreaElement>;
  
  currentPrompt: string = '';
  selectedWordCount: number = 400;
  selectedModel: string = '';
  availableModels: ModelOption[] = [];
  wordCountOptions = [
    { value: 20, label: '~20 Wörter' },
    { value: 50, label: '~50 Wörter' },
    { value: 100, label: '~100 Wörter' },
    { value: 200, label: '~200 Wörter' },
    { value: 400, label: '~400 Wörter' },
    { value: 600, label: '~600 Wörter' },
    { value: 800, label: '~800 Wörter' },
    { value: 1000, label: '~1.000 Wörter' },
    { value: 1500, label: '~1.500 Wörter' },
    { value: 2000, label: '~2.000 Wörter' },
    { value: 3000, label: '~3.000 Wörter' },
    { value: 5000, label: '~5.000 Wörter' },
    { value: 8000, label: '~8.000 Wörter' }
  ];
  showPreviewModal: boolean = false;
  previewContent: string = '';
  private subscription = new Subscription();
  
  constructor(
    private modelService: ModelService,
    private settingsService: SettingsService,
    private beatAIService: BeatAIService
  ) {}
  
  ngOnInit(): void {
    this.currentPrompt = this.beatData.prompt;
    
    // Load available models and set default
    this.loadAvailableModels();
    this.setDefaultModel();
    
    // Auto-focus prompt input if it's a new beat
    if (!this.beatData.prompt) {
      this.beatData.isEditing = true;
      setTimeout(() => this.focusPromptInput(), 200);
    }
    
    // Subscribe to generation events for this beat
    this.subscription.add(
      this.beatAIService.generation$.subscribe(generationEvent => {
        if (generationEvent.beatId === this.beatData.id) {
          if (generationEvent.isComplete) {
            // Generation completed
            this.beatData.isGenerating = false;
            this.contentUpdate.emit(this.beatData);
          }
          // Note: Streaming text is handled directly in the editor via ProseMirror service
          // The component just tracks the generation state
        }
      })
    );
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  startEditing(): void {
    this.beatData.isEditing = true;
    this.currentPrompt = this.beatData.prompt;
    setTimeout(() => this.focusPromptInput(), 200);
  }
  
  cancelEditing(): void {
    this.beatData.isEditing = false;
    this.currentPrompt = this.beatData.prompt;
  }
  
  generateContent(): void {
    if (!this.currentPrompt.trim() || !this.selectedModel) return;
    
    this.beatData.prompt = this.currentPrompt.trim();
    this.beatData.isEditing = false;
    this.beatData.isGenerating = true;
    this.beatData.updatedAt = new Date();
    
    this.promptSubmit.emit({
      beatId: this.beatData.id,
      prompt: this.beatData.prompt,
      action: this.beatData.generatedContent ? 'regenerate' : 'generate',
      wordCount: this.selectedWordCount,
      model: this.selectedModel,
      storyId: this.storyId,
      chapterId: this.chapterId,
      sceneId: this.sceneId
    } as any);
    
    this.contentUpdate.emit(this.beatData);
  }
  
  regenerateContent(): void {
    if (!this.beatData.prompt) return;
    
    this.beatData.isGenerating = true;
    
    this.promptSubmit.emit({
      beatId: this.beatData.id,
      prompt: this.beatData.prompt,
      action: 'regenerate',
      wordCount: this.selectedWordCount,
      model: this.selectedModel,
      storyId: this.storyId,
      chapterId: this.chapterId,
      sceneId: this.sceneId
    } as any);
  }
  
  deleteContentAfterBeat(): void {
    if (confirm('Möchten Sie wirklich den gesamten Text nach diesem Beat löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      this.promptSubmit.emit({
        beatId: this.beatData.id,
        action: 'deleteAfter',
        storyId: this.storyId,
        chapterId: this.chapterId,
        sceneId: this.sceneId
      } as any);
    }
  }
  
  onPromptKeydown(event: any): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.generateContent();
    }
  }
  
  onTextareaClick(event: Event): void {
    event.stopPropagation();
  }

  onTextareaFocus(event: Event): void {
    event.stopPropagation();
    this.focus.emit();
  }

  onTextareaMousedown(event: Event): void {
    event.stopPropagation();
  }

  private loadAvailableModels(): void {
    // Subscribe to settings changes to reload models when API switches
    this.subscription.add(
      this.settingsService.settings$.subscribe(() => {
        this.reloadModels();
      })
    );
    
    // Initial load
    this.reloadModels();
  }
  
  private reloadModels(): void {
    // Load models based on currently active API
    this.subscription.add(
      this.modelService.getAvailableModels().subscribe(models => {
        this.availableModels = models;
        if (models.length > 0 && !this.selectedModel) {
          this.setDefaultModel();
        }
      })
    );
  }
  
  private setDefaultModel(): void {
    const settings = this.settingsService.getSettings();
    
    if (settings.googleGemini.enabled && settings.googleGemini.model) {
      this.selectedModel = settings.googleGemini.model;
    } else if (settings.openRouter.enabled && settings.openRouter.model) {
      this.selectedModel = settings.openRouter.model;
    } else if (settings.replicate.enabled && settings.replicate.model) {
      this.selectedModel = settings.replicate.model;
    } else if (this.availableModels.length > 0) {
      // Fallback to first available model
      this.selectedModel = this.availableModels[0].id;
    }
  }

  private focusPromptInput(): void {
    if (this.promptInput) {
      this.promptInput.nativeElement.focus();
      // Ensure cursor is positioned at the end
      const textarea = this.promptInput.nativeElement;
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }

  showPromptPreview(): void {
    if (!this.currentPrompt.trim()) {
      return;
    }


    // Use the context provided via Input properties
    // These will be set by the BeatAINodeView from the story editor context
    this.beatAIService.previewPrompt(this.currentPrompt, this.beatData.id, {
      storyId: this.storyId,
      chapterId: this.chapterId,
      sceneId: this.sceneId,
      wordCount: this.selectedWordCount
    }).subscribe(content => {
      this.previewContent = content;
      this.showPreviewModal = true;
    });
  }

  hidePromptPreview(): void {
    this.showPreviewModal = false;
    this.previewContent = '';
  }

  stopGeneration(): void {
    this.beatAIService.stopGeneration(this.beatData.id);
    this.beatData.isGenerating = false;
    this.contentUpdate.emit(this.beatData);
  }
}