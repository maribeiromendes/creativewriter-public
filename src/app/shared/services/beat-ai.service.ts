import { Injectable } from '@angular/core';
import { Observable, Subject, delay, map, scan, timer, catchError, of, switchMap, from } from 'rxjs';
import { BeatAI, BeatAIGenerationEvent, BeatAIPromptEvent } from '../../stories/models/beat-ai.interface';
import { OpenRouterApiService } from '../../core/services/openrouter-api.service';
import { SettingsService } from '../../core/services/settings.service';
import { StoryService } from '../../stories/services/story.service';
import { CodexService } from '../../stories/services/codex.service';
import { PromptManagerService } from './prompt-manager.service';

@Injectable({
  providedIn: 'root'
})
export class BeatAIService {
  private generationSubject = new Subject<BeatAIGenerationEvent>();
  public generation$ = this.generationSubject.asObservable();
  private activeGenerations = new Map<string, string>(); // beatId -> requestId

  constructor(
    private openRouterApi: OpenRouterApiService,
    private settingsService: SettingsService,
    private storyService: StoryService,
    private codexService: CodexService,
    private promptManager: PromptManagerService
  ) {}

  generateBeatContent(prompt: string, beatId: string, options: {
    wordCount?: number;
    model?: string;
    storyId?: string;
    chapterId?: string;
    sceneId?: string;
  } = {}): Observable<string> {
    const settings = this.settingsService.getSettings();
    
    // Check if OpenRouter is enabled and configured
    if (!settings.openRouter.enabled || !settings.openRouter.apiKey) {
      console.warn('OpenRouter not configured, using fallback content');
      return this.generateFallbackContent(prompt, beatId);
    }

    // Emit generation start
    this.generationSubject.next({
      beatId,
      chunk: '',
      isComplete: false
    });

    // Create structured prompt using template
    const wordCount = options.wordCount || 200;
    
    return this.buildStructuredPromptFromTemplate(prompt, { ...options, wordCount }).pipe(
      switchMap(enhancedPrompt => {
        // Calculate max tokens based on word count (roughly 1.3 tokens per word)
        const maxTokens = Math.ceil(wordCount * 1.3);
        const requestId = this.generateRequestId();
        
        // Store the active generation
        this.activeGenerations.set(beatId, requestId);

        return this.openRouterApi.generateText(enhancedPrompt, {
      model: options.model,
      maxTokens: maxTokens,
      wordCount: wordCount,
      requestId: requestId
    }).pipe(
      map(response => {
        if (response.choices && response.choices.length > 0) {
          const content = response.choices[0].message.content;
          
          // Emit generation complete
          this.generationSubject.next({
            beatId,
            chunk: content,
            isComplete: true
          });
          
          // Clean up active generation
          this.activeGenerations.delete(beatId);
          
          return content;
        }
        throw new Error('No content generated');
      }),
      catchError(error => {
        console.error('OpenRouter API error, using fallback:', error);
        // Clean up active generation
        this.activeGenerations.delete(beatId);
        // Emit error and fall back to sample content
        this.generationSubject.next({
          beatId,
          chunk: '',
          isComplete: true
        });
        return this.generateFallbackContent(prompt, beatId);
      })
    );
      })
    );
  }

  // Legacy template - now replaced by story.settings.beatGenerationTemplate

  private buildStructuredPromptFromTemplate(userPrompt: string, options: {
    storyId?: string;
    chapterId?: string;
    sceneId?: string;
    wordCount?: number;
  }): Observable<string> {
    if (!options.storyId) {
      return of(userPrompt);
    }

    return from(this.storyService.getStory(options.storyId)).pipe(
      switchMap((story: any) => {
        if (!story || typeof story === 'string' || !story.settings) {
          return of(userPrompt);
        }

        // Set current story in prompt manager
        return from(this.promptManager.setCurrentStory(story.id)).pipe(
          map(() => story)
        );
      }),
      switchMap((story: any) => {
        if (!story || typeof story === 'string' || !story.settings) {
          return of(userPrompt);
        }

        // Get codex entries
        const codexEntries = this.codexService.getAllCodexEntries(options.storyId!);
        const codexText = codexEntries.length > 0 
          ? codexEntries.map(categoryData => {
              const entries = categoryData.entries.map(entry => {
                // Start with clear entry separator
                let entryText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                entryText += `**${entry.title}**\n`;
                
                // Main content
                if (entry.content) {
                  entryText += `\n📝 Beschreibung:\n${entry.content}\n`;
                }
                
                // Story role for characters
                if (entry.metadata?.['storyRole'] && categoryData.category === 'Charaktere') {
                  entryText += `\n🎭 Story-Rolle: ${entry.metadata['storyRole']}\n`;
                }
                
                // Custom fields - check both in metadata and directly in entry
                const customFields = entry.metadata?.['customFields'] || [];
                if (customFields.length > 0) {
                  entryText += `\n📋 Weitere Details:\n`;
                  customFields.forEach((field: any) => {
                    entryText += `   • ${field.name}: ${field.value}\n`;
                  });
                }
                
                // Tags
                if (entry.tags && entry.tags.length > 0) {
                  entryText += `\n🏷️ Tags: ${entry.tags.join(', ')}\n`;
                }
                
                // Additional metadata fields (catch any other fields)
                if (entry.metadata) {
                  const otherFields = Object.entries(entry.metadata)
                    .filter(([key]) => key !== 'storyRole' && key !== 'customFields')
                    .filter(([_, value]) => value !== null && value !== undefined && value !== '');
                  
                  if (otherFields.length > 0) {
                    entryText += `\n🔧 Zusätzliche Informationen:\n`;
                    otherFields.forEach(([key, value]) => {
                      entryText += `   • ${key}: ${value}\n`;
                    });
                  }
                }
                
                return entryText;
              }).join('\n');
              
              return `\n╔════════════════════════════════════════╗\n` +
                     `║ ${categoryData.category.toUpperCase()}${' '.repeat(Math.max(0, 38 - categoryData.category.length))}║\n` +
                     `╚════════════════════════════════════════╝\n` +
                     `${entries}`;
            }).join('\n\n')
          : '';

        // Get previous scenes summaries
        const summariesBefore = options.sceneId 
          ? this.promptManager.getSummariesBeforeScene(options.sceneId)
          : '';

        // Get current scene text if it has content, otherwise get previous scene text
        const sceneText = options.sceneId 
          ? this.promptManager.getCurrentOrPreviousSceneText(options.sceneId)
          : '';

        // Build template placeholders
        const placeholders = {
          SystemMessage: story.settings.systemMessage,
          codexEntries: codexText,
          summariesOfScenesBefore: summariesBefore,
          sceneFullText: sceneText,
          wordCount: (options.wordCount || 200).toString(),
          prompt: userPrompt,
          writingStyle: story.settings.beatInstruction === 'continue' 
            ? 'Setze die Geschichte fort' 
            : 'Bleibe im Moment'
        };

        // Use beatGenerationTemplate from story settings
        let processedTemplate = story.settings.beatGenerationTemplate;
        
        Object.entries(placeholders).forEach(([key, value]) => {
          const placeholder = `{${key}}`;
          const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          processedTemplate = processedTemplate.replace(regex, value || '');
        });

        return of(processedTemplate);
      })
    );
  }

  private generateFallbackContent(prompt: string, beatId: string): Observable<string> {
    const fallbackContent = this.generateSampleContent(prompt);
    
    // Emit generation complete with fallback
    this.generationSubject.next({
      beatId,
      chunk: fallbackContent,
      isComplete: true
    });
    
    return of(fallbackContent);
  }

  private generateSampleContent(prompt: string): string {
    // This would be replaced with actual AI API call
    const templates = [
      `Der Protagonist ${this.getRandomName()} betritt den Raum und bemerkt sofort die angespannte Atmosphäre. Die Luft scheint zu knistern vor unausgesprochenen Worten und unterdrückten Emotionen.`,
      
      `Mit einem tiefen Atemzug sammelt ${this.getRandomName()} Mut und tritt vor. Was als einfache Begegnung begann, entwickelt sich schnell zu einem Wendepunkt, der alles verändern wird.`,
      
      `Die Stille wird durchbrochen, als ${this.getRandomName()} endlich die Worte ausspricht, die schon so lange auf der Zunge lagen. Ein Moment der Wahrheit, der keine Rückkehr zulässt.`,
      
      `Plötzlich wird ${this.getRandomName()} klar, dass nichts mehr so sein wird wie zuvor. Die Realität bricht über sie herein wie eine kalte Welle, die alles mit sich reißt.`,
      
      `In diesem entscheidenden Augenblick muss ${this.getRandomName()} eine Wahl treffen. Links oder rechts, vorwärts oder zurück - jede Entscheidung wird Konsequenzen haben.`
    ];
    
    // Simple keyword matching for more relevant content
    const keywords = prompt.toLowerCase();
    if (keywords.includes('konfrontation') || keywords.includes('streit')) {
      return `Der Konflikt eskaliert, als ${this.getRandomName()} nicht länger schweigen kann. Die aufgestauten Emotionen brechen sich Bahn und verwandeln das Gespräch in eine hitzige Auseinandersetzung, bei der keine Seite bereit ist nachzugeben.`;
    } else if (keywords.includes('entdeckung') || keywords.includes('geheimnis')) {
      return `${this.getRandomName()} stößt auf etwas Unerwartetes. Was zunächst wie ein belangloser Fund aussieht, entpuppt sich als Schlüssel zu einem gut gehüteten Geheimnis, das alles in Frage stellt.`;
    } else if (keywords.includes('flucht') || keywords.includes('entkommen')) {
      return `Die Zeit drängt. ${this.getRandomName()} muss schnell handeln, denn die Gelegenheit zur Flucht wird nicht lange bestehen. Jeder Herzschlag zählt, jeder Schritt könnte der letzte sein.`;
    }
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private getRandomName(): string {
    const names = ['Sarah', 'Michael', 'Lisa', 'David', 'Anna', 'Thomas', 'Julia', 'Martin', 'Sophie', 'Alex'];
    return names[Math.floor(Math.random() * names.length)];
  }


  createNewBeat(): BeatAI {
    return {
      id: this.generateId(),
      prompt: '',
      generatedContent: '',
      isGenerating: false,
      isEditing: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private generateId(): string {
    return 'beat-' + Math.random().toString(36).substring(2, 11);
  }

  // Public method to preview the structured prompt
  previewPrompt(userPrompt: string, options: {
    storyId?: string;
    chapterId?: string;
    sceneId?: string;
    wordCount?: number;
  }): Observable<string> {
    return this.buildStructuredPromptFromTemplate(userPrompt, options);
  }

  stopGeneration(beatId: string): void {
    const requestId = this.activeGenerations.get(beatId);
    if (requestId) {
      this.openRouterApi.abortRequest(requestId);
      this.activeGenerations.delete(beatId);
      
      // Emit generation stopped
      this.generationSubject.next({
        beatId,
        chunk: '',
        isComplete: true
      });
    }
  }

  isGenerating(beatId: string): boolean {
    return this.activeGenerations.has(beatId);
  }

  private generateRequestId(): string {
    return 'beat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

}