import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoGoogle, globeOutline, createOutline, refreshOutline, trashOutline } from 'ionicons/icons';
import { BeatAI, BeatAIPromptEvent } from '../models/beat-ai.interface';
import { Subscription } from 'rxjs';
import { ModelOption } from '../../core/models/model.interface';
import { ModelService } from '../../core/services/model.service';
import { SettingsService } from '../../core/services/settings.service';
import { BeatAIService } from '../../shared/services/beat-ai.service';
import { ProseMirrorEditorService, SimpleEditorConfig } from '../../shared/services/prosemirror-editor.service';
import { EditorView } from 'prosemirror-view';

@Component({
  selector: 'app-beat-ai',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, IonIcon],
  template: `
    <div class="beat-ai-container" [class.editing]="beatData.isEditing" [class.generating]="beatData.isGenerating" [style.--beat-ai-text-color]="currentTextColor">
      <!-- Prompt Input Section -->
      <div class="beat-prompt-section" [class.collapsed]="!beatData.isEditing && beatData.generatedContent">
        <div class="beat-header">
          <div class="beat-icon">🎭</div>
          <div class="beat-title">Beat AI</div>
          <div class="beat-actions">
            <button 
              *ngIf="!beatData.isEditing && beatData.prompt" 
              class="action-btn edit-btn"
              (click)="startEditing(); $event.stopPropagation()"
              title="Prompt bearbeiten">
              <ion-icon name="create-outline"></ion-icon>
            </button>
            <button 
              *ngIf="beatData.generatedContent && !beatData.isGenerating" 
              class="action-btn regenerate-btn"
              (click)="regenerateContent(); $event.stopPropagation()"
              title="Neu generieren">
              <ion-icon name="refresh-outline"></ion-icon>
            </button>
            <button 
              *ngIf="beatData.generatedContent && !beatData.isGenerating" 
              class="action-btn delete-btn"
              (click)="deleteContentAfterBeat(); $event.stopPropagation()"
              title="Text nach diesem Beat löschen">
              <ion-icon name="trash-outline"></ion-icon>
            </button>
          </div>
        </div>
        
        <div class="prompt-input-container" *ngIf="beatData.isEditing || !beatData.prompt">
          <div
            #promptInput
            class="prompt-input prosemirror-container"
          ></div>
          
          <!-- Generation Options -->
          <div class="generation-options" *ngIf="beatData.isEditing || !beatData.prompt">
            <div class="options-row">
              <div class="option-group">
                <ng-select [(ngModel)]="selectedBeatType"
                           [items]="beatTypeOptions"
                           bindLabel="label"
                           bindValue="value"
                           [clearable]="false"
                           [searchable]="false"
                           placeholder="Beat-Typ wählen..."
                           class="model-select"
                           appendTo="body"
                           (change)="onBeatTypeChange()">
                  <ng-template ng-option-tmp let-item="item">
                    <div class="beat-type-option">
                      <span class="beat-type-label">{{ item.label }}</span>
                      <span class="beat-type-description">{{ item.description }}</span>
                    </div>
                  </ng-template>
                </ng-select>
              </div>
              <div class="option-group">
                <ng-select [(ngModel)]="selectedWordCount"
                           [items]="wordCountOptions"
                           bindLabel="label"
                           bindValue="value"
                           [clearable]="false"
                           [searchable]="false"
                           placeholder="Wortanzahl wählen..."
                           class="model-select"
                           appendTo="body"
                           (change)="onWordCountChange()">
                </ng-select>
                <input 
                  *ngIf="showCustomWordCount"
                  type="number"
                  [(ngModel)]="customWordCount"
                  class="custom-word-count"
                  placeholder="Anzahl eingeben..."
                  min="10"
                  max="50000"
                  (blur)="validateCustomWordCount()">
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
                           appendTo="body"
                           (change)="onModelChange()">
                  <ng-template ng-option-tmp let-item="item">
                    <div class="model-option-inline">
                      <ion-icon [name]="getProviderIcon(item.provider)" class="provider-icon-inline" [class.gemini]="item.provider === 'gemini'" [class.openrouter]="item.provider === 'openrouter'"></ion-icon>
                      <span class="model-label">{{ item.label }}</span>
                    </div>
                  </ng-template>
                </ng-select>
              </div>
            </div>
          </div>

          <div class="prompt-actions">
            <button 
              class="generate-btn primary"
              (click)="generateContent(); $event.stopPropagation()"
              [disabled]="!currentPrompt.trim() || beatData.isGenerating || !selectedModel">
              {{ beatData.generatedContent ? 'Regenerieren' : 'Generieren' }}
            </button>
            <button 
              class="generate-btn primary"
              (click)="showPromptPreview(); $event.stopPropagation()"
              [disabled]="!currentPrompt.trim()"
              title="Prompt-Vorschau anzeigen">
              👁️ Vorschau
            </button>
            <button 
              *ngIf="beatData.prompt && beatData.isEditing"
              class="cancel-btn"
              (click)="cancelEditing(); $event.stopPropagation()">
              Abbrechen
            </button>
          </div>
        </div>
        
        <div class="prompt-display" *ngIf="!beatData.isEditing && beatData.prompt">
          <div class="prompt-text">{{ beatData.prompt }}</div>
          <div class="beat-info">
            <span class="beat-type-badge" [class.story-beat]="(beatData.beatType || 'story') === 'story'" [class.scene-beat]="(beatData.beatType || 'story') === 'scene'">
              {{ (beatData.beatType || 'story') === 'story' ? 'StoryBeat' : 'SceneBeat' }}
            </span>
            <span class="model-badge" *ngIf="beatData.model" title="Verwendetes AI-Modell">
              {{ getModelDisplayName(beatData.model) }}
            </span>
          </div>
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
          (click)="stopGeneration(); $event.stopPropagation()"
          title="Generierung stoppen">
          ⏹️ Stoppen
        </button>
      </div>
    </div>

    <!-- Prompt Preview Modal -->
    <div class="preview-modal" *ngIf="showPreviewModal" (click)="hidePromptPreview()" (keydown.escape)="hidePromptPreview()" tabindex="0">
      <div class="preview-content" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()" tabindex="0">
        <div class="preview-header">
          <h3>Prompt-Vorschau</h3>
          <button class="close-btn" (click)="hidePromptPreview(); $event.stopPropagation()">×</button>
        </div>
        <div class="preview-body">
          <pre class="prompt-preview">{{ previewContent }}</pre>
        </div>
        <div class="preview-footer">
          <button class="btn btn-secondary" (click)="hidePromptPreview(); $event.stopPropagation()">Schließen</button>
          <button class="btn btn-primary" (click)="hidePromptPreview(); generateContent(); $event.stopPropagation()">
            Jetzt generieren
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .beat-ai-container {
      border: 2px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      background: rgba(42, 42, 42, 0.2);
      backdrop-filter: blur(8px);
      margin: 1rem 0;
      overflow: hidden;
      transition: all 0.3s ease;
      max-width: 100%;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
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
      gap: 0.5rem;
    }
    
    .action-btn {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(139, 180, 248, 0.05) 100%);
      border: 1px solid rgba(139, 180, 248, 0.2);
      padding: 0.4rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      color: #8bb4f8;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      position: relative;
      overflow: hidden;
      width: 44px;
      height: 44px;
      /* Ensure minimum touch target size */
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      /* Better touch feedback */
      -webkit-touch-callout: none;
      /* Prevent text selection on double-tap */
      -webkit-text-size-adjust: none;
    }
    
    .action-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(139, 180, 248, 0.2), transparent);
      transition: left 0.6s ease;
    }
    
    .action-btn:hover::before {
      left: 100%;
    }
    
    .action-btn ion-icon {
      font-size: 1.1rem;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
    }
    
    .edit-btn:hover {
      background: linear-gradient(135deg, rgba(71, 118, 230, 0.2) 0%, rgba(139, 180, 248, 0.2) 100%);
      border-color: rgba(139, 180, 248, 0.4);
      transform: translateY(-1px) scale(1.05);
      box-shadow: 0 4px 12px rgba(71, 118, 230, 0.3);
      color: #a8c7ff;
    }
    
    .regenerate-btn:hover {
      background: linear-gradient(135deg, rgba(64, 192, 87, 0.2) 0%, rgba(81, 207, 102, 0.2) 100%);
      border-color: rgba(81, 207, 102, 0.4);
      transform: translateY(-1px) scale(1.05) rotate(180deg);
      box-shadow: 0 4px 12px rgba(64, 192, 87, 0.3);
      color: #51cf66;
    }
    
    .delete-btn:hover {
      background: linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(220, 53, 69, 0.2) 100%);
      border-color: rgba(255, 107, 107, 0.4);
      transform: translateY(-1px) scale(1.05);
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
      color: #ff6b6b;
    }
    
    @media (max-width: 768px) {
      .beat-actions {
        gap: 0.6rem;
        /* Add padding to prevent edge tapping issues */
        padding: 0.25rem;
      }
      
      .action-btn {
        width: 48px;
        height: 48px;
        padding: 0.5rem;
        /* Increase spacing between buttons on mobile */
        margin: 0 2px;
        /* Ensure adequate touch area even with visual styling */
        min-width: 48px;
        min-height: 48px;
      }
      
      .action-btn ion-icon {
        font-size: 1.2rem;
      }
    }
    
    .prompt-input-container {
      margin-top: 0.1rem;
    }
    
    .prompt-input.prosemirror-container {
      width: 100%;
      background: rgba(20, 20, 20, 0.1);
      backdrop-filter: blur(3px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 0;
      color: var(--beat-ai-text-color, #e0e0e0);
      font-family: inherit;
      font-size: 0.9rem;
      line-height: 1.2;
      min-height: auto;
      max-height: 300px;
      overflow-y: auto;
      transition: all 0.15s ease;
      box-sizing: border-box;
      cursor: text;
      /* Isolate from parent editor */
      position: relative;
      z-index: 10;
      /* Allow text selection in the prompt input */
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
    }
    
    .prompt-input.prosemirror-container:focus-within {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
    }
    
    .prompt-input.prosemirror-container :global(.ProseMirror) {
      outline: none;
      padding: 0.6rem !important;
      min-height: auto;
      background: rgba(15, 15, 15, 0.1);
      backdrop-filter: blur(2px);
      color: var(--beat-ai-text-color, #e0e0e0) !important;
      font-size: 0.9rem;
      line-height: 1.2;
      font-family: inherit;
      width: 100%;
      box-sizing: border-box;
      border-radius: 4px;
    }
    
    .prompt-input.prosemirror-container :global(.ProseMirror *) {
      color: inherit !important;
      cursor: text;
      /* Prevent text selection on mobile */
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
      /* Prevent touch callout */
      -webkit-touch-callout: none;
      /* Prevent tap highlight */
      -webkit-tap-highlight-color: transparent;
    }
    
    /* Ensure buttons don't inherit text color - use initial instead of revert */
    .beat-ai-container button {
      color: initial !important;
      cursor: pointer !important;
    }
    
    /* Specific colors for action buttons */
    .action-btn {
      color: #8bb4f8 !important;
    }
    
    .action-btn ion-icon {
      color: inherit !important;
    }
    
    .edit-btn:hover {
      color: #a8c7ff !important;
    }
    
    .regenerate-btn:hover {
      color: #51cf66 !important;
    }
    
    .delete-btn:hover {
      color: #ff6b6b !important;
    }
    
    /* Generate and cancel buttons should use their default colors */
    .generate-btn.primary {
      background: #0d6efd !important;
      color: white !important;
    }
    
    .cancel-btn {
      background: #6c757d !important;
      color: white !important;
    }
    
    .stop-btn {
      background: #dc3545 !important;
      color: white !important;
    }
    
    /* Ensure badges don't inherit text color */
    .beat-type-badge,
    .model-badge {
      color: initial !important;
    }
    
    .beat-type-badge.story-beat {
      color: #4dabf7 !important;
    }
    
    .beat-type-badge.scene-beat {
      color: #51cf66 !important;
    }
    
    .model-badge {
      color: #ffc107 !important;
    }
    
    .prompt-input.prosemirror-container :global(.ProseMirror[data-placeholder]:empty::before) {
      content: attr(data-placeholder);
      color: #6c757d;
      pointer-events: none;
      position: absolute;
    }
    
    .prompt-input.prosemirror-container :global(.ProseMirror p) {
      margin: 0;
      color: var(--beat-ai-text-color, #e0e0e0) !important;
      font-size: 0.9rem;
      line-height: 1.2;
    }
    
    .prompt-input.prosemirror-container :global(.ProseMirror p:empty) {
      min-height: 1em;
    }
    
    .prompt-input.prosemirror-container :global(.codex-highlight) {
      text-decoration: underline;
      text-decoration-style: dotted;
      cursor: help;
    }
    
    .prompt-input.prosemirror-container :global(.codex-highlight-title) {
      text-decoration-color: #4dabf7;
    }
    
    .prompt-input.prosemirror-container :global(.codex-highlight-tag) {
      text-decoration-color: #51cf66;
    }
    
    .prompt-input.prosemirror-container :global(.simple-text-editor) {
      position: relative;
      z-index: 1;
      /* Ensure this editor is isolated from parent editor events */
      pointer-events: auto;
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
      gap: 0.5rem;
    }
    
    .model-select {
      font-size: 0.9rem;
    }
    
    .custom-word-count {
      width: 100%;
      padding: 0.5rem;
      background: #1a1a1a;
      border: 1px solid #404040;
      border-radius: 6px;
      color: #f8f9fa;
      font-size: 0.9rem;
      transition: border-color 0.2s;
    }
    
    .custom-word-count:focus {
      outline: none;
      border-color: #0d6efd;
    }
    
    .custom-word-count::placeholder {
      color: #6c757d;
    }
    
    .model-name {
      display: block;
      font-weight: 500;
    }
    
    .model-cost {
      color: #28a745;
      font-weight: 500;
    }
    
    .model-option-inline {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .provider-icon-inline {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    
    .provider-icon-inline {
      display: inline-flex;
      align-items: center;
      margin-right: 0.25rem;
    }
    
    .provider-icon-inline.gemini {
      color: #4285f4;
    }
    
    .provider-icon-inline.openrouter {
      color: #00a67e;
    }

    .beat-type-option {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    
    .beat-type-label {
      font-weight: 500;
      color: #f8f9fa;
    }
    
    .beat-type-description {
      font-size: 0.8rem;
      color: #adb5bd;
      font-style: italic;
    }

    .beat-info {
      margin-top: 0.5rem;
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    
    .beat-type-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .beat-type-badge.story-beat {
      background: rgba(13, 110, 253, 0.2);
      color: #4dabf7;
      border: 1px solid rgba(13, 110, 253, 0.3);
    }
    
    .beat-type-badge.scene-beat {
      background: rgba(40, 167, 69, 0.2);
      color: #51cf66;
      border: 1px solid rgba(40, 167, 69, 0.3);
    }

    .model-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-weight: 500;
      background: rgba(255, 193, 7, 0.2);
      color: #ffc107;
      border: 1px solid rgba(255, 193, 7, 0.3);
      cursor: help;
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
      background: rgba(20, 20, 20, 0.2);
      backdrop-filter: blur(3px);
      padding: 0.5rem;
      border-radius: 4px;
    }
    
    .prompt-text {
      color: var(--beat-ai-text-color, #adb5bd);
      font-style: italic;
      font-size: 0.9rem;
      line-height: 1.4;
    }
    
    .generation-status {
      padding: 0.5rem 1rem;
      background: rgba(36, 36, 36, 0.2);
      backdrop-filter: blur(5px);
      border-top: 1px solid rgba(255, 255, 255, 0.15);
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
      background: rgba(45, 45, 45, 0.85);
      backdrop-filter: blur(10px);
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
      padding: 1.5rem 1.5rem 3rem 1.5rem;
    }

    .prompt-preview {
      background: #1a1a1a;
      border: 1px solid #404040;
      border-radius: 6px;
      padding: 1rem 1rem 2rem 1rem;
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
      
      .prompt-input.prosemirror-container :global(.ProseMirror) {
        font-size: 0.9rem;
        padding: 0.3rem !important;
        min-height: auto;
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
      
      .beat-actions {
        gap: 0.75rem;
        /* More padding on very small screens */
        padding: 0.4rem;
        /* Prevent buttons from being too close to screen edges */
        margin: 0 0.2rem;
      }
      
      .action-btn {
        /* Slightly larger on very small screens for better accessibility */
        width: 52px;
        height: 52px;
        min-width: 52px;
        min-height: 52px;
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
export class BeatAIComponent implements OnInit, OnDestroy, AfterViewInit {
  private modelService = inject(ModelService);
  private settingsService = inject(SettingsService);
  private beatAIService = inject(BeatAIService);
  private proseMirrorService = inject(ProseMirrorEditorService);
  private elementRef = inject(ElementRef);

  @Input() beatData!: BeatAI;
  @Input() storyId?: string;
  @Input() chapterId?: string;
  @Input() sceneId?: string;
  @Output() promptSubmit = new EventEmitter<BeatAIPromptEvent>();
  currentTextColor = '#e0e0e0';
  @Output() contentUpdate = new EventEmitter<BeatAI>();
  @Output() delete = new EventEmitter<string>();
  @Output() beatFocus = new EventEmitter<void>();
  
  @ViewChild('promptInput') promptInput!: ElementRef<HTMLDivElement>;
  
  currentPrompt = '';
  selectedWordCount: number | string = 400;
  customWordCount = 400;
  showCustomWordCount = false;
  selectedModel = '';
  availableModels: ModelOption[] = [];
  selectedBeatType: 'story' | 'scene' = 'story';
  beatTypeOptions = [
    { value: 'story', label: 'StoryBeat', description: 'Mit vollständigem Story-Kontext' },
    { value: 'scene', label: 'SceneBeat', description: 'Ohne Szenen-Zusammenfassungen' }
  ];
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
    { value: 8000, label: '~8.000 Wörter' },
    { value: 10000, label: '~10.000 Wörter' },
    { value: 12000, label: '~12.000 Wörter' },
    { value: 'custom', label: 'Eigene Anzahl...' }
  ];
  showPreviewModal = false;
  previewContent = '';
  private subscription = new Subscription();
  private editorView: EditorView | null = null;
  
  constructor() {
    // Register icons
    addIcons({ logoGoogle, globeOutline, createOutline, refreshOutline, trashOutline });
  }
  
  ngOnInit(): void {
    // Set initial text color from settings immediately
    const settings = this.settingsService.getSettings();
    this.currentTextColor = settings.appearance?.textColor || '#e0e0e0';
    
    this.currentPrompt = this.beatData.prompt;
    
    // Load saved beat type or use default
    this.selectedBeatType = this.beatData.beatType || 'story';
    
    // Load saved word count or use default
    if (this.beatData.wordCount) {
      // Check if it's a custom value
      const isPresetValue = this.wordCountOptions.some(option => 
        typeof option.value === 'number' && option.value === this.beatData.wordCount
      );
      
      if (isPresetValue) {
        this.selectedWordCount = this.beatData.wordCount;
      } else {
        // It's a custom value
        this.selectedWordCount = 'custom';
        this.customWordCount = this.beatData.wordCount;
        this.showCustomWordCount = true;
      }
    }
    
    // Load available models and set default
    this.loadAvailableModels();
    this.setDefaultModel();
    
    // Auto-focus prompt input if it's a new beat
    if (!this.beatData.prompt) {
      this.beatData.isEditing = true;
      // Wait for DOM to update with editing state, then initialize editor
      setTimeout(() => {
        if (this.promptInput && !this.editorView) {
          this.initializeProseMirrorEditor();
        }
      }, 100);
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
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
  }

  ngAfterViewInit(): void {
    // Initialize ProseMirror editor if in editing mode
    if (this.beatData.isEditing && this.promptInput && !this.editorView) {
      this.initializeProseMirrorEditor();
    }
    
    // Apply text color to this specific component
    this.applyTextColorDirectly();
  }

  private initializeProseMirrorEditor(): void {
    if (!this.promptInput || this.editorView) return;

    const config: SimpleEditorConfig = {
      placeholder: 'Beschreibe den Beat, den die AI generieren soll...',
      onUpdate: (content: string) => {
        this.currentPrompt = content;
        this.onPromptChange();
      },
      storyContext: {
        storyId: this.storyId,
        chapterId: this.chapterId,
        sceneId: this.sceneId
      }
    };

    this.editorView = this.proseMirrorService.createSimpleTextEditor(
      this.promptInput.nativeElement,
      config
    );

    // Set initial content if available
    if (this.currentPrompt) {
      // Use setSimpleContent to ensure codex highlighting is processed
      this.proseMirrorService.setSimpleContent(this.currentPrompt);
      // Ensure currentPrompt stays synchronized after setting content
      // (setSimpleContent doesn't trigger the onUpdate callback)
    }
  }

  private insertTextDirectly(text: string): void {
    if (!this.editorView || !text) return;

    // Insert text at position 1 (after the paragraph start)
    const { state } = this.editorView;
    const tr = state.tr.insertText(text, 1);
    this.editorView.dispatch(tr);
  }
  
  startEditing(): void {
    this.beatData.isEditing = true;
    this.currentPrompt = this.beatData.prompt;
    
    // Restore all persisted settings when switching back to edit mode
    this.restorePersistedSettings();
    
    // Destroy existing editor if it exists (DOM element will be recreated by *ngIf)
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
    
    // Initialize editor after DOM updates
    setTimeout(() => {
      if (this.promptInput) {
        this.initializeProseMirrorEditor();
      }
      
      // Focus editor after initialization
      setTimeout(() => {
        if (this.editorView) {
          this.editorView.focus();
        }
      }, 50);
    }, 100);
  }
  
  cancelEditing(): void {
    this.beatData.isEditing = false;
    this.currentPrompt = this.beatData.prompt;
    
    // Restore all persisted settings when canceling
    this.restorePersistedSettings();
    
    // Destroy editor when canceling
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
  }
  
  generateContent(): void {
    if (!this.currentPrompt.trim() || !this.selectedModel) return;
    
    this.beatData.prompt = this.currentPrompt.trim();
    this.beatData.isEditing = false;
    this.beatData.isGenerating = true;
    this.beatData.updatedAt = new Date();
    this.beatData.wordCount = this.getActualWordCount();
    this.beatData.model = this.selectedModel;
    
    this.promptSubmit.emit({
      beatId: this.beatData.id,
      prompt: this.beatData.prompt,
      action: this.beatData.generatedContent ? 'regenerate' : 'generate',
      wordCount: this.getActualWordCount(),
      model: this.selectedModel,
      storyId: this.storyId,
      chapterId: this.chapterId,
      sceneId: this.sceneId,
      beatType: this.beatData.beatType
    });
    
    this.contentUpdate.emit(this.beatData);
  }
  
  regenerateContent(): void {
    if (!this.beatData.prompt) return;
    
    this.beatData.isGenerating = true;
    this.beatData.wordCount = this.getActualWordCount();
    this.beatData.model = this.selectedModel;
    
    this.promptSubmit.emit({
      beatId: this.beatData.id,
      prompt: this.beatData.prompt,
      action: 'regenerate',
      wordCount: this.getActualWordCount(),
      model: this.selectedModel,
      storyId: this.storyId,
      chapterId: this.chapterId,
      sceneId: this.sceneId,
      beatType: this.beatData.beatType
    } as any);
    
    this.contentUpdate.emit(this.beatData);
  }
  
  deleteContentAfterBeat(): void {
    if (confirm('Möchten Sie wirklich den gesamten Text nach diesem Beat löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      this.promptSubmit.emit({
        beatId: this.beatData.id,
        action: 'deleteAfter',
        storyId: this.storyId,
        chapterId: this.chapterId,
        sceneId: this.sceneId,
        beatType: this.beatData.beatType
      } as any);
    }
  }
  
  onPromptKeydown(event: any): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.generateContent();
    }
  }
  
  onPromptChange(): void {
    // ProseMirror handles content changes automatically
  }

  onWordCountChange(): void {
    if (this.selectedWordCount === 'custom') {
      this.showCustomWordCount = true;
      // Focus the custom input after Angular updates the view
      setTimeout(() => {
        const customInput = document.querySelector('.custom-word-count') as HTMLInputElement;
        if (customInput) {
          customInput.focus();
          customInput.select();
        }
      }, 0);
    } else {
      this.showCustomWordCount = false;
      this.customWordCount = this.selectedWordCount as number;
    }
  }

  validateCustomWordCount(): void {
    if (this.customWordCount < 10) {
      this.customWordCount = 10;
    } else if (this.customWordCount > 50000) {
      this.customWordCount = 50000;
    }
  }

  onBeatTypeChange(): void {
    // Update the beat data with the new type
    this.beatData.beatType = this.selectedBeatType;
    this.beatData.updatedAt = new Date();
    
    // Emit the content update to save the change
    this.contentUpdate.emit(this.beatData);
  }

  private getActualWordCount(): number {
    if (this.selectedWordCount === 'custom') {
      return this.customWordCount;
    }
    return this.selectedWordCount as number;
  }

  private loadAvailableModels(): void {
    // Subscribe to settings changes to reload models when API switches
    this.subscription.add(
      this.settingsService.settings$.subscribe(settings => {
        this.reloadModels();
        // Update text color
        this.currentTextColor = settings.appearance?.textColor || '#e0e0e0';
        console.log('Beat AI: Text color updated to:', this.currentTextColor);
        
        // Apply the new color to this component
        this.applyTextColorDirectly();
      })
    );
    
    // Initial load
    this.reloadModels();
  }
  
  private reloadModels(): void {
    // Load combined models from all active APIs
    this.subscription.add(
      this.modelService.getCombinedModels().subscribe(models => {
        this.availableModels = models;
        if (models.length > 0 && !this.selectedModel) {
          this.setDefaultModel();
        }
      })
    );
  }
  
  private setDefaultModel(): void {
    const settings = this.settingsService.getSettings();
    
    // First priority: use the model stored with this beat
    if (this.beatData.model && this.availableModels.some(m => m.id === this.beatData.model)) {
      this.selectedModel = this.beatData.model;
    }
    // Second priority: use the global selected model if available
    else if (settings.selectedModel) {
      this.selectedModel = settings.selectedModel;
    } 
    // Fallback: use first available model
    else if (this.availableModels.length > 0) {
      this.selectedModel = this.availableModels[0].id;
    }
  }

  private restorePersistedSettings(): void {
    // Restore the persisted model
    this.setDefaultModel();
    
    // Restore the persisted word count
    if (this.beatData.wordCount) {
      // Check if it's a custom value
      const isPresetValue = this.wordCountOptions.some(option => 
        typeof option.value === 'number' && option.value === this.beatData.wordCount
      );
      
      if (isPresetValue) {
        this.selectedWordCount = this.beatData.wordCount;
        this.showCustomWordCount = false;
      } else {
        // It's a custom value
        this.selectedWordCount = 'custom';
        this.customWordCount = this.beatData.wordCount;
        this.showCustomWordCount = true;
      }
    }
    
    // Restore the persisted beat type
    if (this.beatData.beatType) {
      this.selectedBeatType = this.beatData.beatType;
    }
  }

  private focusPromptInput(): void {
    if (this.editorView) {
      this.editorView.focus();
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
      wordCount: this.getActualWordCount(),
      beatType: this.beatData.beatType
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

  onModelChange(): void {
    // Save the selected model to the beat data
    if (this.selectedModel) {
      this.beatData.model = this.selectedModel;
      this.beatData.updatedAt = new Date();
      this.contentUpdate.emit(this.beatData);
    }
  }

  getProviderIcon(provider: string): string {
    switch (provider) {
      case 'gemini':
        return 'logo-google';
      case 'openrouter':
        return 'globe-outline';
      case 'anthropic':
        return 'globe-outline'; // Oder ein spezifisches Icon wenn verfügbar
      default:
        return 'globe-outline';
    }
  }

  getModelDisplayName(modelId: string): string {
    if (!modelId) return '';
    
    // Find the model in available models to get its display name
    const model = this.availableModels.find(m => m.id === modelId);
    if (model) {
      return model.label;
    }
    
    // If not found in available models, try to extract a readable name from the ID
    // Handle format like "gemini:gemini-1.5-pro" or "openrouter:anthropic/claude-3-haiku"
    if (modelId.includes(':')) {
      const parts = modelId.split(':');
      const modelName = parts[1] || modelId;
      return modelName.split('/').pop() || modelName; // Handle provider/model format
    }
    
    return modelId;
  }

  private applyTextColorDirectly(): void {
    // The story editor's MutationObserver will handle this automatically,
    // but we still apply it directly for immediate feedback
    setTimeout(() => {
      const hostElement = this.elementRef.nativeElement;
      
      if (hostElement) {
        const container = hostElement.querySelector?.('.beat-ai-container') || hostElement;
        if (container) {
          (container as HTMLElement).style.setProperty('--beat-ai-text-color', this.currentTextColor);
          console.log('Beat AI component: Set CSS custom property to:', this.currentTextColor, 'on element:', container);
        }
      }
    }, 50);
  }
  
}