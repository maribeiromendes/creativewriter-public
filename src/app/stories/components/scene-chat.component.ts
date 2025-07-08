import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, 
  IonContent, IonFooter, IonItem, IonLabel, IonTextarea, IonList,
  IonChip, IonAvatar, IonSearchbar, IonModal, IonCheckbox
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack, sendOutline, peopleOutline, documentTextOutline, 
  addOutline, checkmarkOutline, closeOutline
} from 'ionicons/icons';
import { StoryService } from '../services/story.service';
import { SettingsService } from '../../shared/services/settings.service';
import { BeatAIService } from '../../shared/services/beat-ai.service';
import { PromptManagerService } from '../../shared/services/prompt-manager.service';
import { Story, Scene, Chapter } from '../models/story.interface';
import { Subscription } from 'rxjs';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
  selector: 'app-scene-chat',
  standalone: true,
  imports: [
    CommonModule, FormsModule, 
    IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle,
    IonContent, IonFooter, IonItem, IonLabel, IonTextarea, IonList,
    IonChip, IonAvatar, IonSearchbar, IonModal, IonCheckbox
  ],
  template: `
    <div class="ion-page">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button (click)="goBack()">
              <ion-icon name="arrow-back" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-title>Szenen-Chat</ion-title>
          <ion-buttons slot="end">
            <ion-button (click)="showSceneSelector = true">
              <ion-icon name="add-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      
      <ion-content class="chat-content">
        <div class="context-chips" *ngIf="selectedScenes.length > 0">
          <ion-chip *ngFor="let scene of selectedScenes" [color]="scene.sceneId === activeSceneId ? 'primary' : 'medium'">
            <ion-label>{{ scene.chapterTitle }} - {{ scene.sceneTitle }}</ion-label>
            <ion-icon 
              name="close-outline" 
              (click)="removeSceneContext(scene)"
              *ngIf="scene.sceneId !== activeSceneId">
            </ion-icon>
          </ion-chip>
        </div>

        <div class="chat-messages" #scrollContainer>
          <div *ngFor="let message of messages" 
               class="message" 
               [class.user-message]="message.role === 'user'"
               [class.assistant-message]="message.role === 'assistant'">
            <div class="message-avatar">
              <ion-avatar>
                <ion-icon [name]="message.role === 'user' ? 'people-outline' : 'document-text-outline'"></ion-icon>
              </ion-avatar>
            </div>
            <div class="message-content">
              <div class="message-text" [innerHTML]="formatMessage(message.content)"></div>
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
            </div>
          </div>
          
          <div *ngIf="isGenerating" class="message assistant-message">
            <div class="message-avatar">
              <ion-avatar>
                <ion-icon name="document-text-outline"></ion-icon>
              </ion-avatar>
            </div>
            <div class="message-content">
              <div class="message-text typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </ion-content>
      
      <ion-footer class="chat-footer">
        <div class="input-container">
          <ion-textarea
            #messageInput
            [(ngModel)]="currentMessage"
            placeholder="Stelle eine Frage zu deiner Szene..."
            [autoGrow]="true"
            [rows]="1"
            (keydown.enter)="onEnterKey($event)"
            class="message-input">
          </ion-textarea>
          <ion-button 
            (click)="sendMessage()" 
            [disabled]="!currentMessage.trim() || isGenerating"
            fill="clear"
            class="send-button">
            <ion-icon name="send-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </div>
      </ion-footer>
    </div>

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
                <ion-label>{{ chapter.title }}</ion-label>
              </ion-item-divider>
              <ion-item 
                *ngFor="let scene of getFilteredScenes(chapter)" 
                [button]="true"
                (click)="toggleSceneSelection(chapter.id, scene.id)">
                <ion-checkbox 
                  slot="start" 
                  [checked]="isSceneSelected(scene.id)"
                  [disabled]="scene.id === activeSceneId">
                </ion-checkbox>
                <ion-label>
                  <h3>{{ scene.title }}</h3>
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
    .chat-content {
      --background: var(--ion-background-color);
    }

    .context-chips {
      padding: 8px 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      background: var(--ion-toolbar-background);
      border-bottom: 1px solid var(--ion-border-color);
    }

    .context-chips ion-chip {
      margin: 0;
    }

    .chat-messages {
      padding: 16px;
      padding-bottom: 100px; /* Extra padding for mobile keyboards */
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .message {
      display: flex;
      gap: 12px;
      max-width: 80%;
    }

    .user-message {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .assistant-message {
      align-self: flex-start;
    }

    .message-avatar ion-avatar {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ion-color-primary);
      color: white;
    }

    .assistant-message .message-avatar ion-avatar {
      background: var(--ion-color-tertiary);
    }

    .message-content {
      background: var(--ion-color-light);
      border-radius: 12px;
      padding: 12px 16px;
      max-width: 100%;
    }

    .user-message .message-content {
      background: var(--ion-color-primary);
      color: white;
    }

    .message-text {
      word-wrap: break-word;
      white-space: pre-wrap;
    }

    .message-time {
      font-size: 0.75rem;
      opacity: 0.7;
      margin-top: 4px;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 8px 0;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ion-color-medium);
      animation: typing 1.4s infinite;
    }

    .typing-indicator span:nth-child(1) {
      animation-delay: 0s;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 60%, 100% {
        opacity: 0.3;
      }
      30% {
        opacity: 1;
      }
    }

    .chat-footer {
      background: var(--ion-toolbar-background);
      padding: 8px 16px;
      padding-bottom: env(safe-area-inset-bottom, 20px);
    }

    .input-container {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      background: var(--ion-color-light);
      border-radius: 24px;
      padding: 4px 4px 4px 16px;
    }

    .message-input {
      flex: 1;
      --padding-top: 8px;
      --padding-bottom: 8px;
      min-height: 40px;
      max-height: 120px;
    }

    .send-button {
      --padding-start: 8px;
      --padding-end: 8px;
      margin: 0;
    }

    ion-searchbar {
      --background: var(--ion-color-light);
    }

    ion-item-divider {
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .message {
        max-width: 90%;
      }
      
      .chat-messages {
        padding-bottom: 120px; /* More padding for mobile */
      }
    }
  `]
})
export class SceneChatComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  story: Story | null = null;
  activeChapterId: string = '';
  activeSceneId: string = '';
  messages: ChatMessage[] = [];
  currentMessage: string = '';
  isGenerating: boolean = false;
  
  selectedScenes: SceneContext[] = [];
  showSceneSelector: boolean = false;
  sceneSearchTerm: string = '';
  
  private subscriptions = new Subscription();
  private abortController: AbortController | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storyService: StoryService,
    private settingsService: SettingsService,
    private beatAIService: BeatAIService,
    private promptManager: PromptManagerService
  ) {
    addIcons({ 
      arrowBack, sendOutline, peopleOutline, documentTextOutline, 
      addOutline, checkmarkOutline, closeOutline
    });
  }

  ngOnInit() {
    const storyId = this.route.snapshot.paramMap.get('storyId');
    const chapterId = this.route.snapshot.paramMap.get('chapterId');
    const sceneId = this.route.snapshot.paramMap.get('sceneId');

    if (storyId && chapterId && sceneId) {
      this.loadStory(storyId, chapterId, sceneId);
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private loadStory(storyId: string, chapterId: string, sceneId: string) {
    this.story = this.storyService.getStory(storyId);
    if (this.story) {
      this.activeChapterId = chapterId;
      this.activeSceneId = sceneId;
      
      // Load current scene as default context
      const chapter = this.story.chapters.find(c => c.id === chapterId);
      const scene = chapter?.scenes.find(s => s.id === sceneId);
      
      if (chapter && scene) {
        this.selectedScenes.push({
          chapterId: chapter.id,
          sceneId: scene.id,
          chapterTitle: chapter.title,
          sceneTitle: scene.title,
          content: this.promptManager.getCleanSceneText(scene),
          selected: true
        });
      }
      
      // Add initial system message
      this.messages.push({
        role: 'assistant',
        content: 'Hallo! Ich bin dein KI-Assistent für diese Szene. Du kannst mir Fragen stellen, um Charaktere zu extrahieren, Details zu analysieren oder Ideen zu entwickeln.',
        timestamp: new Date()
      });
    }
  }

  goBack() {
    this.router.navigate(['/stories/editor', this.story?.id], {
      queryParams: { chapterId: this.activeChapterId, sceneId: this.activeSceneId }
    });
  }

  async sendMessage() {
    if (!this.currentMessage.trim() || this.isGenerating) return;

    const userMessage = this.currentMessage;
    this.currentMessage = '';
    
    // Add user message
    this.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    this.isGenerating = true;
    this.scrollToBottom();

    try {
      // Prepare context
      const sceneContext = this.selectedScenes
        .map(scene => `<scene chapter="${scene.chapterTitle}" title="${scene.sceneTitle}">\n${scene.content}\n</scene>`)
        .join('\n\n');

      const systemPrompt = `Du bist ein hilfreicher Assistent für kreative Schreibprojekte. 
Du analysierst Szenen und hilfst bei der Charakterentwicklung, Weltenbau und Ideenfindung.
Achte besonders auf:
- Charaktere und ihre Eigenschaften
- Beziehungen zwischen Charakteren
- Wichtige Orte und Objekte
- Handlungsstränge und Konflikte`;

      const prompt = `Kontext der aktuellen Szene(n):
${sceneContext}

Frage des Nutzers: ${userMessage}

Bitte antworte hilfreich und kreativ auf die Frage basierend auf dem Szenenkontext.`;

      const settings = this.settingsService.getSettings();
      const response = await this.beatAIService.generateContent(
        prompt,
        systemPrompt,
        settings,
        { useStreaming: false }
      );

      this.messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error generating response:', error);
      this.messages.push({
        role: 'assistant',
        content: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
        timestamp: new Date()
      });
    } finally {
      this.isGenerating = false;
      this.scrollToBottom();
    }
  }

  onEnterKey(event: KeyboardEvent) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  formatMessage(content: string): string {
    // Basic markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.scrollContainer) {
        const element = this.scrollContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }

  toggleSceneSelection(chapterId: string, sceneId: string) {
    if (sceneId === this.activeSceneId) return; // Can't deselect active scene

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
          chapterTitle: chapter.title,
          sceneTitle: scene.title,
          content: this.promptManager.getCleanSceneText(scene),
          selected: true
        });
      }
    }
  }

  isSceneSelected(sceneId: string): boolean {
    return this.selectedScenes.some(s => s.sceneId === sceneId);
  }

  removeSceneContext(scene: SceneContext) {
    if (scene.sceneId === this.activeSceneId) return;
    
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
    const cleanText = this.promptManager.getCleanSceneText(scene);
    return cleanText.substring(0, 100) + (cleanText.length > 100 ? '...' : '');
  }
}