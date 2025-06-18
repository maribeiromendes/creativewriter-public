import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { BeatAI, BeatAIPromptEvent } from '../models/beat-ai.interface';
import { Subscription } from 'rxjs';
import { ModelOption } from '../../core/models/model.interface';
import { ModelService } from '../../core/services/model.service';
import { SettingsService } from '../../core/services/settings.service';

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
                <label>Wortanzahl</label>
                <select [(ngModel)]="selectedWordCount" class="word-count-select">
                  <option value="50">~50 Wörter</option>
                  <option value="100">~100 Wörter</option>
                  <option value="200">~200 Wörter</option>
                  <option value="300">~300 Wörter</option>
                  <option value="500">~500 Wörter</option>
                </select>
              </div>
              <div class="option-group">
                <label>AI-Modell</label>
                <ng-select [(ngModel)]="selectedModel"
                           [items]="availableModels"
                           bindLabel="label"
                           bindValue="id"
                           [clearable]="false"
                           [searchable]="true"
                           placeholder="Modell auswählen..."
                           class="model-select">
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
          <span class="generating-text">Generiere Content...</span>
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
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
      padding: 1rem;
      transition: all 0.3s ease;
    }
    
    .beat-prompt-section.collapsed {
      padding: 0.5rem 1rem;
    }
    
    .beat-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
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
    
    .edit-btn, .regenerate-btn {
      background: none;
      border: none;
      padding: 0.25rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
      font-size: 0.9rem;
    }
    
    .edit-btn:hover, .regenerate-btn:hover {
      background: #404040;
    }
    
    .prompt-input-container {
      margin-top: 0.5rem;
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
      margin-top: 0.75rem;
      margin-bottom: 0.75rem;
    }
    
    .options-row {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 1rem;
    }
    
    .option-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .option-group label {
      font-size: 0.85rem;
      color: #adb5bd;
      font-weight: 500;
    }
    
    .word-count-select {
      padding: 0.75rem;
      background: #1a1a1a;
      border: 1px solid #404040;
      border-radius: 4px;
      color: #e0e0e0;
      font-size: 1rem;
      min-height: 44px; /* iOS minimum touch target */
    }
    
    .word-count-select:focus {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
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
      margin-top: 0.75rem;
      justify-content: flex-end;
    }
    
    .generate-btn, .cancel-btn {
      padding: 0.5rem 1rem;
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
      margin-top: 0.5rem;
    }
    
    .prompt-text {
      color: #adb5bd;
      font-style: italic;
      font-size: 0.9rem;
      line-height: 1.4;
    }
    
    .generation-status {
      padding: 0.75rem 1rem;
      background: #242424;
      border-top: 1px solid #404040;
    }
    
    .generation-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
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
      padding-left: 0.5rem !important;
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
  `]
})
export class BeatAIComponent implements OnInit, OnDestroy {
  @Input() beatData!: BeatAI;
  @Output() promptSubmit = new EventEmitter<BeatAIPromptEvent>();
  @Output() contentUpdate = new EventEmitter<BeatAI>();
  @Output() delete = new EventEmitter<string>();
  @Output() focus = new EventEmitter<void>();
  
  @ViewChild('promptInput') promptInput!: ElementRef<HTMLTextAreaElement>;
  
  currentPrompt: string = '';
  selectedWordCount: number = 200;
  selectedModel: string = '';
  availableModels: ModelOption[] = [];
  private subscription = new Subscription();
  
  constructor(
    private modelService: ModelService,
    private settingsService: SettingsService
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
    this.beatData.updatedAt = new Date();
    
    this.promptSubmit.emit({
      beatId: this.beatData.id,
      prompt: this.beatData.prompt,
      action: this.beatData.generatedContent ? 'regenerate' : 'generate',
      wordCount: this.selectedWordCount,
      model: this.selectedModel
    } as any);
    
    this.contentUpdate.emit(this.beatData);
  }
  
  regenerateContent(): void {
    if (!this.beatData.prompt) return;
    
    this.promptSubmit.emit({
      beatId: this.beatData.id,
      prompt: this.beatData.prompt,
      action: 'regenerate',
      wordCount: this.selectedWordCount,
      model: this.selectedModel
    } as any);
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

  private focusPromptInput(): void {
    if (this.promptInput) {
      this.promptInput.nativeElement.focus();
      // Ensure cursor is positioned at the end
      const textarea = this.promptInput.nativeElement;
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }
}