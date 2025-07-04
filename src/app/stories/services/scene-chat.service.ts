import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { SceneChat, ChatMessage, ChatRequest } from '../models/chat.interface';
import { BeatAIService } from '../../shared/services/beat-ai.service';
import { SettingsService } from '../../core/services/settings.service';

@Injectable({
  providedIn: 'root'
})
export class SceneChatService {
  private chats: SceneChat[] = [];
  private currentChat$ = new BehaviorSubject<SceneChat | null>(null);
  private abortController: AbortController | null = null;
  private readonly storageKey = 'scene-chats';

  constructor(
    private beatAIService: BeatAIService,
    private settingsService: SettingsService
  ) {
    this.loadChats();
  }

  getCurrentChat(): Observable<SceneChat | null> {
    return this.currentChat$.asObservable();
  }

  getChatForScene(storyId: string, sceneId: string): SceneChat | null {
    return this.chats.find(chat => chat.storyId === storyId && chat.sceneId === sceneId) || null;
  }

  createOrGetChat(storyId: string, sceneId: string): SceneChat {
    let chat = this.getChatForScene(storyId, sceneId);
    
    if (!chat) {
      chat = {
        id: this.generateId(),
        sceneId,
        storyId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.chats.push(chat);
      this.saveChats();
    }
    
    this.currentChat$.next(chat);
    return chat;
  }

  async sendMessage(chatRequest: ChatRequest): Promise<void> {
    const currentChat = this.currentChat$.value;
    if (!currentChat) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: chatRequest.message,
      timestamp: new Date()
    };

    currentChat.messages.push(userMessage);
    this.currentChat$.next(currentChat);
    this.saveChats();

    // Add assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isGenerating: true
    };

    currentChat.messages.push(assistantMessage);
    this.currentChat$.next(currentChat);

    try {
      // Create context for AI
      const context = this.buildChatContext(chatRequest);
      
      // Use existing AI service
      const chatId = assistantMessage.id;
      
      // Stream the response
      const response = this.beatAIService.generateBeatContent(
        context,
        chatId,
        {
          wordCount: 300, // max words
          model: 'default' // Let service choose best model
        }
      );

      // Handle streaming response
      response.subscribe({
        next: (chunk) => {
          assistantMessage.content += chunk;
          this.currentChat$.next(currentChat);
        },
        complete: () => {
          assistantMessage.isGenerating = false;
          currentChat.updatedAt = new Date();
          this.currentChat$.next(currentChat);
          this.saveChats();
        },
        error: (error) => {
          assistantMessage.isGenerating = false;
          assistantMessage.content = 'Error generating response: ' + error.message;
          this.currentChat$.next(currentChat);
          this.saveChats();
        }
      });

    } catch (error) {
      console.error('Error in scene chat', error);
      assistantMessage.isGenerating = false;
      assistantMessage.content = 'Error generating response. Please try again.';
      this.currentChat$.next(currentChat);
      this.saveChats();
    }
  }

  stopGeneration(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  clearChat(storyId: string, sceneId: string): void {
    const chat = this.getChatForScene(storyId, sceneId);
    if (chat) {
      chat.messages = [];
      chat.updatedAt = new Date();
      this.currentChat$.next(chat);
      this.saveChats();
    }
  }

  deleteChat(storyId: string, sceneId: string): void {
    const index = this.chats.findIndex(chat => chat.storyId === storyId && chat.sceneId === sceneId);
    if (index > -1) {
      this.chats.splice(index, 1);
      this.saveChats();
      if (this.currentChat$.value?.storyId === storyId && this.currentChat$.value?.sceneId === sceneId) {
        this.currentChat$.next(null);
      }
    }
  }

  private buildChatContext(chatRequest: ChatRequest): string {
    const context = [];
    
    // Add scene context
    context.push('**Scene Content:**');
    context.push(chatRequest.sceneContent);
    context.push('');
    
    // Add story context if available
    if (chatRequest.storyContext) {
      context.push('**Story Context:**');
      context.push(chatRequest.storyContext);
      context.push('');
    }
    
    // Add previous messages for context
    if (chatRequest.previousMessages && chatRequest.previousMessages.length > 0) {
      context.push('**Previous Conversation:**');
      chatRequest.previousMessages.forEach(msg => {
        context.push(`**${msg.role}:** ${msg.content}`);
      });
      context.push('');
    }
    
    // Add current user message
    context.push('**User Question:**');
    context.push(chatRequest.message);
    context.push('');
    
    // Add instruction
    context.push('**Instructions:**');
    context.push('You are an AI assistant helping with creative writing. Based on the scene content and context provided, please respond to the user\'s question. You can help with character analysis, plot development, dialogue suggestions, scene improvements, or any other creative writing tasks.');
    
    return context.join('\n');
  }

  private loadChats(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.chats = JSON.parse(stored).map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
      }
    } catch (error) {
      console.error('Failed to load scene chats', error);
    }
  }

  private saveChats(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.chats));
    } catch (error) {
      console.error('Failed to save scene chats', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}