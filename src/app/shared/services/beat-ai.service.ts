import { Injectable } from '@angular/core';
import { Observable, Subject, delay, map, scan, timer, catchError, of, switchMap } from 'rxjs';
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

        return this.openRouterApi.generateText(enhancedPrompt, {
      model: options.model,
      maxTokens: maxTokens,
      wordCount: wordCount
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
          
          return content;
        }
        throw new Error('No content generated');
      }),
      catchError(error => {
        console.error('OpenRouter API error, using fallback:', error);
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

  private readonly BEAT_GENERATION_TEMPLATE = `{SystemMessage}

Beziehe den folgenden Glossar von Charakteren/Orten/Gegenständen/Überlieferungen mit ein:
{codexEntries}

Was bisher passiert ist:
{summariesOfScenesBefore}

Was gerade passiert ist:
{sceneFullText}

Schrebeibe {wordCount} Wörter welche die Geschichte fortsetzen mit folgenden Aufgaben:
{prompt}

{writingStyle}`;

  private buildStructuredPromptFromTemplate(userPrompt: string, options: {
    storyId?: string;
    chapterId?: string;
    sceneId?: string;
    wordCount?: number;
  }): Observable<string> {
    if (!options.storyId) {
      return of(userPrompt);
    }

    const story = this.storyService.getStory(options.storyId);
    if (!story || !story.settings) {
      return of(userPrompt);
    }

    // Set current story in prompt manager
    this.promptManager.setCurrentStory(story.id);

    // Get codex entries
    const codexEntries = this.codexService.getAllCodexEntries(options.storyId);
    const codexText = codexEntries.length > 0 
      ? codexEntries.map(categoryData => {
          const entries = categoryData.entries.map(entry => {
            let entryText = `**${entry.title}**\n${entry.content || ''}`;
            if (entry.tags && entry.tags.length > 0) {
              entryText += `\nTags: ${entry.tags.join(', ')}`;
            }
            return entryText;
          }).join('\n\n');
          return `### ${categoryData.category}\n${entries}`;
        }).join('\n\n')
      : '';

    // Get previous scenes summaries
    const summariesBefore = options.sceneId 
      ? this.promptManager.getSummariesBeforeScene(options.sceneId)
      : '';

    // Get current scene text
    const sceneText = options.sceneId 
      ? this.promptManager.getPreviousSceneText(options.sceneId)
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

    // Process template directly without HTTP request
    let processedTemplate = this.BEAT_GENERATION_TEMPLATE;
    
    Object.entries(placeholders).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      processedTemplate = processedTemplate.replace(regex, value || '');
    });

    return of(processedTemplate);
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

}