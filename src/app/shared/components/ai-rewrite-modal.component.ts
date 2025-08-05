import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonItem, IonLabel, IonTextarea, IonIcon, IonChip,
  IonSpinner, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, sendOutline, refreshOutline, copyOutline } from 'ionicons/icons';
import { BeatAIService } from '../services/beat-ai.service';

export interface AIRewriteResult {
  originalText: string;
  rewrittenText: string;
  prompt?: string;
}

@Component({
  selector: 'app-ai-rewrite-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonItem, IonLabel, IonTextarea, IonIcon, IonChip, IonSpinner
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Text mit KI neu formulieren</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="dismiss()">
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Original Text -->
      <ion-item class="original-text-item">
        <ion-label position="stacked">Originaltext</ion-label>
        <div class="original-text">{{ selectedText }}</div>
      </ion-item>

      <!-- Custom Prompt -->
      <ion-item>
        <ion-label position="stacked">Zusätzlicher Prompt (optional)</ion-label>
        <ion-textarea
          [(ngModel)]="customPrompt"
          placeholder="z.B. 'Mache es formeller', 'Schreibe es emotionaler', 'Kürze es'"
          [autoGrow]="true"
          [maxlength]="500"
          [counter]="true">
        </ion-textarea>
      </ion-item>

      <!-- Quick Prompts -->
      <div class="quick-prompts" *ngIf="!isRewriting">
        <ion-label>Schnelle Optionen:</ion-label>
        <div class="prompt-chips">
          <ion-chip 
            *ngFor="let prompt of quickPrompts" 
            (click)="selectQuickPrompt(prompt)"
            [outline]="customPrompt !== prompt">
            {{ prompt }}
          </ion-chip>
        </div>
      </div>

      <!-- Rewritten Text -->
      <div *ngIf="rewrittenText" class="rewritten-section">
        <ion-item class="rewritten-text-item">
          <ion-label position="stacked">Neu formulierter Text</ion-label>
          <div class="rewritten-text">{{ rewrittenText }}</div>
        </ion-item>
      </div>

      <!-- Loading -->
      <div *ngIf="isRewriting" class="loading-section">
        <ion-spinner name="dots"></ion-spinner>
        <p>KI formuliert den Text neu...</p>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <ion-button 
          expand="block" 
          fill="solid" 
          color="primary"
          (click)="rewriteText()"
          [disabled]="isRewriting || !selectedText.trim()">
          <ion-icon name="send-outline" slot="start"></ion-icon>
          Neu formulieren
        </ion-button>

        <div class="button-row" *ngIf="rewrittenText">
          <ion-button 
            expand="block" 
            fill="outline" 
            color="primary"
            (click)="rewriteText()">
            <ion-icon name="refresh-outline" slot="start"></ion-icon>
            Erneut versuchen
          </ion-button>

          <ion-button 
            expand="block" 
            fill="outline" 
            color="medium"
            (click)="copyToClipboard()">
            <ion-icon name="copy-outline" slot="start"></ion-icon>
            Kopieren
          </ion-button>
        </div>

        <ion-button 
          *ngIf="rewrittenText"
          expand="block" 
          fill="solid" 
          color="success"
          (click)="useRewrittenText()">
          Text verwenden
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .original-text-item,
    .rewritten-text-item {
      --background: rgba(0, 0, 0, 0.05);
      --border-radius: 8px;
      margin: 1rem 0;
    }

    .original-text,
    .rewritten-text {
      background: rgba(255, 255, 255, 0.1);
      padding: 12px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      white-space: pre-wrap;
      line-height: 1.5;
      max-height: 200px;
      overflow-y: auto;
      font-family: inherit;
    }

    .rewritten-text {
      background: rgba(71, 118, 230, 0.1);
      border-color: rgba(71, 118, 230, 0.3);
    }

    .quick-prompts {
      margin: 1rem 0;
    }

    .quick-prompts ion-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: var(--ion-color-medium);
    }

    .prompt-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .prompt-chips ion-chip {
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .prompt-chips ion-chip:hover {
      transform: translateY(-1px);
    }

    .loading-section {
      text-align: center;
      padding: 2rem;
    }

    .loading-section ion-spinner {
      margin-bottom: 1rem;
    }

    .action-buttons {
      margin-top: 2rem;
      gap: 1rem;
    }

    .button-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin: 1rem 0;
    }

    .rewritten-section {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Dark theme adjustments */
    @media (prefers-color-scheme: dark) {
      .original-text,
      .rewritten-text {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
      }

      .rewritten-text {
        background: rgba(71, 118, 230, 0.15);
        border-color: rgba(71, 118, 230, 0.4);
      }
    }
  `]
})
export class AIRewriteModalComponent implements OnInit {
  @Input() selectedText = '';
  @Output() textRewritten = new EventEmitter<AIRewriteResult>();
  @Output() dismissed = new EventEmitter<void>();

  private modalController = inject(ModalController);
  private beatAIService = inject(BeatAIService);

  customPrompt = '';
  rewrittenText = '';
  isRewriting = false;

  quickPrompts = [
    'Mache es formeller',
    'Mache es lockerer',
    'Kürze es',
    'Erweitere es',
    'Emotionaler schreiben',
    'Sachlicher schreiben',
    'Verbessere die Grammatik',
    'Einfacher ausdrücken'
  ];

  constructor() {
    addIcons({ closeOutline, sendOutline, refreshOutline, copyOutline });
  }

  ngOnInit() {
    // Focus the custom prompt textarea after a short delay
    setTimeout(() => {
      const textarea = document.querySelector('ion-textarea') as HTMLIonTextareaElement;
      if (textarea) {
        textarea.setFocus();
      }
    }, 300);
  }

  selectQuickPrompt(prompt: string) {
    this.customPrompt = this.customPrompt === prompt ? '' : prompt;
  }

  async rewriteText() {
    if (!this.selectedText.trim() || this.isRewriting) return;

    this.isRewriting = true;
    this.rewrittenText = '';

    try {
      const basePrompt = `Formuliere folgenden Text neu: "${this.selectedText}"`;
      const fullPrompt = this.customPrompt 
        ? `${basePrompt}\n\nZusätzliche Anweisung: ${this.customPrompt}`
        : basePrompt;

      // Generate a unique beat ID for this rewrite request
      const beatId = `rewrite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Use the existing BeatAI service for text generation
      const response$ = this.beatAIService.generateBeatContent(fullPrompt, beatId, {
        wordCount: Math.max(50, Math.ceil(this.selectedText.length * 1.2)),
        beatType: 'story'
      });

      // Subscribe to the observable to get the generated content
      response$.subscribe({
        next: (content) => {
          this.rewrittenText = content || 'Fehler beim Generieren des Textes.';
          this.isRewriting = false;
        },
        error: (error) => {
          console.error('Error rewriting text:', error);
          this.rewrittenText = 'Fehler beim Neu-Formulieren des Textes. Bitte versuchen Sie es erneut.';
          this.isRewriting = false;
        }
      });
    } catch (error) {
      console.error('Error rewriting text:', error);
      this.rewrittenText = 'Fehler beim Neu-Formulieren des Textes. Bitte versuchen Sie es erneut.';
      this.isRewriting = false;
    }
  }

  async copyToClipboard() {
    if (this.rewrittenText) {
      try {
        await navigator.clipboard.writeText(this.rewrittenText);
        // Could add a toast notification here
      } catch (error) {
        console.error('Failed to copy text:', error);
      }
    }
  }

  useRewrittenText() {
    if (this.rewrittenText) {
      const result = {
        originalText: this.selectedText,
        rewrittenText: this.rewrittenText,
        prompt: this.customPrompt || undefined
      };
      this.textRewritten.emit(result);
      this.modalController.dismiss(result);
    }
  }

  dismiss() {
    this.dismissed.emit();
    this.modalController.dismiss();
  }
}