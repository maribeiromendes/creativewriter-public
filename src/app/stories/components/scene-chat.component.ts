import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, combineLatest, of } from 'rxjs';
import { SceneChatService } from '../services/scene-chat.service';
import { StoryService } from '../services/story.service';
import { ChatMessage, SceneChat, ChatRequest } from '../models/chat.interface';
import { Story, Scene } from '../models/story.interface';

@Component({
  selector: 'app-scene-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scene-chat.component.html',
  styleUrls: ['./scene-chat.component.scss']
})
export class SceneChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatContainer', { static: false }) chatContainer!: ElementRef;
  @ViewChild('messageInput', { static: false }) messageInput!: ElementRef;

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;

  story: Story | null = null;
  scene: Scene | null = null;
  chat: SceneChat | null = null;
  messages: ChatMessage[] = [];
  currentMessage = '';
  isGenerating = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sceneChatService: SceneChatService,
    private storyService: StoryService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadData();
    this.subscribeToChat();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private async loadData(): Promise<void> {
    const storyId = this.route.snapshot.paramMap.get('storyId');
    const sceneId = this.route.snapshot.paramMap.get('sceneId');

    if (!storyId || !sceneId) {
      this.router.navigate(['/']);
      return;
    }

    this.story = await this.storyService.getStory(storyId);
    if (!this.story) {
      this.router.navigate(['/']);
      return;
    }

    this.scene = this.findScene(this.story, sceneId);
    if (!this.scene) {
      this.router.navigate(['/stories/editor', storyId]);
      return;
    }

    this.chat = this.sceneChatService.createOrGetChat(storyId, sceneId);
  }


  private subscribeToChat(): void {
    this.sceneChatService.getCurrentChat()
      .pipe(takeUntil(this.destroy$))
      .subscribe(chat => {
        if (chat) {
          this.chat = chat;
          this.messages = chat.messages;
          this.isGenerating = chat.messages.some(msg => msg.isGenerating);
          this.shouldScrollToBottom = true;
        }
      });
  }

  private findScene(story: Story, sceneId: string): Scene | null {
    for (const chapter of story.chapters) {
      const scene = chapter.scenes.find(s => s.id === sceneId);
      if (scene) return scene;
    }
    return null;
  }


  async sendMessage(): Promise<void> {
    if (!this.currentMessage.trim() || !this.story || !this.scene || this.isGenerating) {
      return;
    }

    const message = this.currentMessage.trim();
    this.currentMessage = '';

    // Get previous messages for context (last 6 messages)
    const previousMessages = this.messages.slice(-6);

    // Build story context
    const storyContext = this.buildStoryContext();

    const chatRequest: ChatRequest = {
      message,
      sceneContent: this.scene.content,
      storyContext,
      previousMessages
    };

    try {
      await this.sceneChatService.sendMessage(chatRequest);
      this.shouldScrollToBottom = true;
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  stopGeneration(): void {
    this.sceneChatService.stopGeneration();
  }

  startNewChat(): void {
    if (this.story && this.scene) {
      this.sceneChatService.clearChat(this.story.id, this.scene.id);
    }
  }

  clearChat(): void {
    if (this.story && this.scene) {
      this.sceneChatService.clearChat(this.story.id, this.scene.id);
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  goBack(): void {
    if (this.story) {
      this.router.navigate(['/stories/editor', this.story.id]);
    } else {
      this.router.navigate(['/']);
    }
  }

  private buildStoryContext(): string {
    if (!this.story) return '';
    
    const context = [];
    
    // Add story title
    context.push(`**Story Title:** ${this.story.title}`);
    
    // Add chapter and scene structure
    context.push('**Story Structure:**');
    this.story.chapters.forEach((chapter, chapterIndex) => {
      context.push(`Chapter ${chapterIndex + 1}: ${chapter.title}`);
      chapter.scenes.forEach((scene, sceneIndex) => {
        const marker = scene.id === this.scene?.id ? ' (current scene)' : '';
        context.push(`  Scene ${sceneIndex + 1}: ${scene.title}${marker}`);
      });
    });
    
    return context.join('\n');
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch (error) {
      console.error('Error scrolling to bottom:', error);
    }
  }

  // Preset prompts for character extraction
  extractCharacters(): void {
    this.currentMessage = `Liste alle Charaktere aus dieser Szene auf und erstelle für jeden einen strukturierten Codex-Eintrag.

REGELN:
1. Jeder Charakter wird NUR EINMAL aufgeführt
2. Beginne direkt mit dem ersten Charakter
3. Keine Einleitung, keine Zusammenfassung am Ende
4. Nutze dieses exakte Format:

**Charakter: [Name]**
- **Rolle**: [Protagonist/Nebencharakter/Antagonist/Love-Interest/Hintergrundcharakter]
- **Beschreibung**: [Detaillierte Beschreibung]
- **Tags**: [Schlagwörter]
- **Alter**: [falls erwähnt]
- **Aussehen**: [Physische Beschreibung]
- **Persönlichkeit**: [Charaktereigenschaften]
- **Beziehungen**: [Zu anderen Charakteren]
- **Motivation**: [Ziele und Beweggründe]
- **Besonderheiten**: [Spezielle Merkmale]

STOPPE nach dem letzten Charakter. Keine weiteren Erklärungen.`;
    this.sendMessage();
  }

  analyzeDialogue(): void {
    this.currentMessage = 'Please analyze the dialogue in this scene. How does each character speak? What does their dialogue reveal about their personality, motivations, and relationships?';
    this.sendMessage();
  }

  suggestImprovements(): void {
    this.currentMessage = 'Please suggest improvements for this scene. Consider pacing, character development, dialogue, descriptions, and overall narrative flow.';
    this.sendMessage();
  }

  analyzePlot(): void {
    this.currentMessage = 'Please analyze how this scene advances the plot. What are the key plot points, conflicts, and story developments in this scene?';
    this.sendMessage();
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  formatMessage(content: string): string {
    // Basic markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }

  copyMessage(content: string): void {
    // Remove any HTML formatting for plain text copy
    const plainText = content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1');
    
    if (navigator.clipboard && window.isSecureContext) {
      // Use modern clipboard API
      navigator.clipboard.writeText(plainText).then(() => {
        // Optional: Show success feedback
        console.log('Message copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy message:', err);
        this.fallbackCopy(plainText);
      });
    } else {
      // Fallback for older browsers
      this.fallbackCopy(plainText);
    }
  }

  private fallbackCopy(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      console.log('Message copied to clipboard (fallback)');
    } catch (err) {
      console.error('Failed to copy message (fallback):', err);
    }
    
    document.body.removeChild(textArea);
  }
}