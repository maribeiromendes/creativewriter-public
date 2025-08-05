import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonItem, IonLabel, IonTextarea, IonIcon, IonChip,
  IonSpinner, ModalController, IonModal, IonList, IonCheckbox,
  IonItemDivider, IonSearchbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, sendOutline, refreshOutline, copyOutline, addOutline, readerOutline } from 'ionicons/icons';
import { BeatAIService } from '../services/beat-ai.service';
import { StoryService } from '../../stories/services/story.service';
import { Story, Scene, Chapter } from '../../stories/models/story.interface';

export interface AIRewriteResult {
  originalText: string;
  rewrittenText: string;
  prompt?: string;
}

interface SceneContext {
  chapterId: string;
  sceneId: string;
  chapterTitle: string;
  sceneTitle: string;
  content: string;
  selected: boolean;
}

@Component({
  selector: 'app-ai-rewrite-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonItem, IonLabel, IonTextarea, IonIcon, IonChip, IonSpinner,
    IonModal, IonList, IonCheckbox, IonItemDivider, IonSearchbar
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
      <!-- Context Selection -->
      <div class="context-section">
        <ion-label>
          <h3>Kontext für KI-Umformulierung</h3>
          <p>Wählen Sie den Kontext aus, den die KI bei der Umformulierung berücksichtigen soll.</p>
        </ion-label>
        
        <div class="context-controls">
          <ion-button 
            fill="outline" 
            size="small" 
            [color]="includeStoryOutline ? 'primary' : 'medium'"
            (click)="includeStoryOutline = !includeStoryOutline">
            <ion-icon name="reader-outline" slot="start"></ion-icon>
            Geschichts-Überblick
          </ion-button>
          
          <ion-button 
            fill="outline" 
            size="small" 
            color="medium"
            (click)="showSceneSelector = true">
            <ion-icon name="add-outline" slot="start"></ion-icon>
            Szenen hinzufügen
          </ion-button>
        </div>

        <!-- Context Chips -->
        <div class="context-chips" *ngIf="selectedScenes.length > 0 || includeStoryOutline">
          <ion-chip *ngIf="includeStoryOutline" color="success">
            <ion-label>Geschichts-Überblick</ion-label>
            <ion-icon 
              name="close-outline" 
              (click)="includeStoryOutline = false">
            </ion-icon>
          </ion-chip>
          <ion-chip *ngFor="let scene of selectedScenes" [color]="scene.sceneId === currentSceneId ? 'primary' : 'medium'">
            <ion-label>{{ scene.chapterTitle }} - {{ scene.sceneTitle }}</ion-label>
            <ion-icon 
              name="close-outline" 
              (click)="removeSceneContext(scene)">
            </ion-icon>
          </ion-chip>
        </div>
      </div>

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

    <!-- Scene Selector Modal -->
    <ion-modal [isOpen]="showSceneSelector" (didDismiss)="showSceneSelector = false">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>Szenen als Kontext hinzufügen</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="showSceneSelector = false">
                <ion-icon name="close-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-searchbar 
            [(ngModel)]="sceneSearchTerm" 
            placeholder="Szene suchen..."
            animated="true">
          </ion-searchbar>
          
          <ion-list>
            <div *ngFor="let chapter of story?.chapters">
              <ion-item-divider>
                <ion-label>C{{ chapter.chapterNumber || chapter.order }}:{{ chapter.title }}</ion-label>
              </ion-item-divider>
              <ion-item 
                *ngFor="let scene of getFilteredScenes(chapter)" 
                [button]="true"
                (click)="toggleSceneSelection(chapter.id, scene.id)">
                <ion-checkbox 
                  slot="start" 
                  [checked]="isSceneSelected(scene.id)">
                </ion-checkbox>
                <ion-label>
                  <h3>C{{ chapter.chapterNumber || chapter.order }}S{{ scene.sceneNumber || scene.order }}:{{ scene.title }}</h3>
                  <p>{{ getScenePreview(scene) }}</p>
                </ion-label>
              </ion-item>
            </div>
          </ion-list>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    .context-section {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: rgba(71, 118, 230, 0.05);
      border: 1px solid rgba(71, 118, 230, 0.2);
      border-radius: 12px;
    }

    .context-section ion-label h3 {
      margin: 0 0 0.5rem 0;
      color: var(--ion-color-primary);
      font-weight: 600;
    }

    .context-section ion-label p {
      margin: 0 0 1rem 0;
      color: var(--ion-color-medium);
      font-size: 0.9rem;
    }

    .context-controls {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .context-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .context-chips ion-chip {
      margin: 0;
      cursor: pointer;
    }

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
  @Input() storyId = '';
  @Input() currentChapterId = '';
  @Input() currentSceneId = '';
  @Output() textRewritten = new EventEmitter<AIRewriteResult>();
  @Output() dismissed = new EventEmitter<void>();

  private modalController = inject(ModalController);
  private beatAIService = inject(BeatAIService);
  private storyService = inject(StoryService);

  customPrompt = '';
  rewrittenText = '';
  isRewriting = false;
  
  // Context management
  story: Story | null = null;
  selectedScenes: SceneContext[] = [];
  includeStoryOutline = false;
  showSceneSelector = false;
  sceneSearchTerm = '';
  

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
    addIcons({ closeOutline, sendOutline, refreshOutline, copyOutline, addOutline, readerOutline });
  }

  async ngOnInit() {
    // Load story and setup default context
    if (this.storyId) {
      await this.loadStoryAndSetupContext();
    }
    
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
      // Prepare scene context
      const sceneContext = this.selectedScenes
        .map(scene => `<scene chapter="${scene.chapterTitle}" title="${scene.sceneTitle}">\n${scene.content}\n</scene>`)
        .join('\n\n');

      // Prepare story outline if enabled
      let storyOutline = '';
      if (this.includeStoryOutline) {
        storyOutline = this.buildStoryOutline();
      }

      // Build context text
      let contextText = '';
      if (storyOutline) {
        contextText += `Geschichte-Überblick:\n${storyOutline}\n\n`;
      }
      if (sceneContext) {
        contextText += `Szenen-Kontext:\n${sceneContext}\n\n`;
      }

      // Build the rewrite prompt with context
      const basePrompt = contextText 
        ? `${contextText}Basierend auf dem obigen Kontext, formuliere folgenden Text neu: "${this.selectedText}"`
        : `Formuliere folgenden Text neu: "${this.selectedText}"`;
      
      const fullPrompt = this.customPrompt 
        ? `${basePrompt}\n\nZusätzliche Anweisung: ${this.customPrompt}\n\nBitte achte darauf, dass der umformulierte Text zum Stil und Kontext der Geschichte passt.`
        : `${basePrompt}\n\nBitte achte darauf, dass der umformulierte Text zum Stil und Kontext der Geschichte passt.`;

      // Generate a unique beat ID for this rewrite request
      const beatId = `rewrite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Use the existing BeatAI service for text generation
      const response$ = this.beatAIService.generateBeatContent(fullPrompt, beatId, {
        wordCount: Math.max(50, Math.ceil(this.selectedText.length * 1.2)),
        beatType: 'story',
        storyId: this.storyId,
        chapterId: this.currentChapterId,
        sceneId: this.currentSceneId
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

  // Context management methods (copied from Scene Chat)
  private async loadStoryAndSetupContext(): Promise<void> {
    try {
      this.story = await this.storyService.getStory(this.storyId);
      if (this.story && this.currentChapterId && this.currentSceneId) {
        // Load current scene as default context
        const chapter = this.story.chapters.find(c => c.id === this.currentChapterId);
        const scene = chapter?.scenes.find(s => s.id === this.currentSceneId);
        
        if (chapter && scene) {
          this.selectedScenes.push({
            chapterId: chapter.id,
            sceneId: scene.id,
            chapterTitle: `C${chapter.chapterNumber || chapter.order}:${chapter.title}`,
            sceneTitle: `C${chapter.chapterNumber || chapter.order}S${scene.sceneNumber || scene.order}:${scene.title}`,
            content: this.extractFullTextFromScene(scene),
            selected: true
          });
        }
      }
    } catch (error) {
      console.error('Error loading story for context:', error);
    }
  }

  toggleSceneSelection(chapterId: string, sceneId: string): void {
    const index = this.selectedScenes.findIndex(s => s.sceneId === sceneId);
    
    if (index > -1) {
      this.selectedScenes.splice(index, 1);
    } else {
      const chapter = this.story?.chapters.find(c => c.id === chapterId);
      const scene = chapter?.scenes.find(s => s.id === sceneId);
      
      if (chapter && scene) {
        this.selectedScenes.push({
          chapterId: chapter.id,
          sceneId: scene.id,
          chapterTitle: `C${chapter.chapterNumber || chapter.order}:${chapter.title}`,
          sceneTitle: `C${chapter.chapterNumber || chapter.order}S${scene.sceneNumber || scene.order}:${scene.title}`,
          content: this.extractFullTextFromScene(scene),
          selected: true
        });
      }
    }
  }

  isSceneSelected(sceneId: string): boolean {
    return this.selectedScenes.some(s => s.sceneId === sceneId);
  }

  removeSceneContext(scene: SceneContext): void {
    const index = this.selectedScenes.findIndex(s => s.sceneId === scene.sceneId);
    if (index > -1) {
      this.selectedScenes.splice(index, 1);
    }
  }

  getFilteredScenes(chapter: Chapter): Scene[] {
    if (!this.sceneSearchTerm) return chapter.scenes;
    
    const searchLower = this.sceneSearchTerm.toLowerCase();
    return chapter.scenes.filter(scene => 
      scene.title.toLowerCase().includes(searchLower) ||
      scene.content.toLowerCase().includes(searchLower)
    );
  }

  getScenePreview(scene: Scene): string {
    const cleanText = this.extractFullTextFromScene(scene);
    return cleanText.substring(0, 100) + (cleanText.length > 100 ? '...' : '');
  }

  private extractFullTextFromScene(scene: Scene): string {
    if (!scene.content) return '';

    // Use DOM parser for more reliable HTML parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(scene.content, 'text/html');
    
    // Remove all beat AI wrapper elements and their contents
    const beatWrappers = doc.querySelectorAll('.beat-ai-wrapper, .beat-ai-node');
    beatWrappers.forEach(element => element.remove());
    
    // Remove beat markers and comments
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }
    
    textNodes.forEach(textNode => {
      // Remove beat markers like [Beat: description]
      textNode.textContent = textNode.textContent?.replace(/\[Beat:[^\]]*\]/g, '') || '';
    });
    
    // Convert to text while preserving paragraph structure
    let cleanText = '';
    const paragraphs = doc.querySelectorAll('p');
    
    for (const p of paragraphs) {
      const text = p.textContent?.trim() || '';
      if (text) {
        cleanText += text + '\n\n';
      } else {
        // Empty paragraph becomes single newline
        cleanText += '\n';
      }
    }
    
    // If no paragraphs found, fall back to body text
    if (!paragraphs.length) {
      cleanText = doc.body.textContent || '';
    }
    
    // Clean up extra whitespace
    cleanText = cleanText.replace(/\n\s*\n\s*\n/g, '\n\n');
    cleanText = cleanText.trim();

    return cleanText;
  }

  private buildStoryOutline(): string {
    if (!this.story) return '';
    
    let outline = '';
    
    this.story.chapters.forEach(chapter => {
      outline += `\n## ${chapter.title}\n`;
      
      chapter.scenes.forEach(scene => {
        outline += `\n### ${scene.title}\n`;
        
        if (scene.summary) {
          outline += `${scene.summary}\n`;
        } else {
          // Fallback to truncated content if no summary
          const cleanText = this.extractFullTextFromScene(scene);
          const truncated = cleanText.substring(0, 200);
          outline += `${truncated}${cleanText.length > 200 ? '...' : ''}\n`;
        }
      });
    });
    
    return outline;
  }
}