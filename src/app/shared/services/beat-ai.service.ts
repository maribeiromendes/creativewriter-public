import { Injectable } from '@angular/core';
import { Observable, Subject, delay, map, scan, timer, catchError, of } from 'rxjs';
import { BeatAI, BeatAIGenerationEvent, BeatAIPromptEvent } from '../../stories/models/beat-ai.interface';
import { OpenRouterApiService } from '../../core/services/openrouter-api.service';
import { SettingsService } from '../../core/services/settings.service';
import { StoryService } from '../../stories/services/story.service';
import { CodexService } from '../../stories/services/codex.service';
import { Story, Scene, Chapter } from '../../stories/models/story.interface';

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
    private codexService: CodexService
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

    // Create structured prompt
    const wordCount = options.wordCount || 200;
    const structuredPrompt = this.buildStructuredPrompt(prompt, { ...options, wordCount });
    const enhancedPrompt = structuredPrompt;
    
    // Calculate max tokens based on word count (roughly 1.3 tokens per word)
    const maxTokens = Math.ceil(wordCount * 1.3);

    return this.openRouterApi.generateText(enhancedPrompt, {
      model: options.model,
      maxTokens: maxTokens
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

  private splitIntoChunks(text: string): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      if (i === 0) {
        chunks.push(words[i]);
      } else {
        chunks.push(' ' + words[i]);
      }
    }
    
    return chunks;
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
    return 'beat-' + Math.random().toString(36).substr(2, 9);
  }

  // Public method to preview the structured prompt
  previewPrompt(userPrompt: string, options: {
    storyId?: string;
    chapterId?: string;
    sceneId?: string;
    wordCount?: number;
  }): string {
    return this.buildStructuredPrompt(userPrompt, options);
  }

  private buildStructuredPrompt(userPrompt: string, options: {
    storyId?: string;
    chapterId?: string;
    sceneId?: string;
    wordCount?: number;
  }): string {
    if (!options.storyId) {
      return userPrompt;
    }

    const story = this.storyService.getStory(options.storyId);
    if (!story || !story.settings) {
      return userPrompt;
    }

    const parts: string[] = [];

    // 1. System Message
    parts.push('## System Message');
    parts.push(story.settings.systemMessage);
    parts.push('');

    // 2. Codex Entries
    const codexEntries = this.codexService.getAllCodexEntries(options.storyId);
    if (codexEntries.length > 0) {
      parts.push('## Codex');
      codexEntries.forEach(categoryData => {
        parts.push(`### ${categoryData.icon || ''} ${categoryData.category}`.trim());
        categoryData.entries.forEach(entry => {
          parts.push(`**${entry.title}**`);
          if (entry.content) {
            parts.push(entry.content);
          }
          if (entry.tags && entry.tags.length > 0) {
            parts.push(`Tags: ${entry.tags.join(', ')}`);
          }
          parts.push('');
        });
      });
    }

    // 3. Story Context (summaries or full content)
    const storyContext = this.getStoryContext(story, options.chapterId, options.sceneId);
    if (storyContext) {
      parts.push('## Bisherige Geschichte');
      parts.push(storyContext);
      parts.push('');
    }

    // 4. Beat Template with user prompt and word count
    let beatTemplate = story.settings.beatTemplate.replace('{prompt}', userPrompt);
    
    // Replace {wordcount} placeholder if present
    const wordCount = options.wordCount || 200;
    beatTemplate = beatTemplate.replace('{wordcount}', wordCount.toString());
    
    parts.push('## Aufgabe');
    parts.push(beatTemplate);
    parts.push('');

    // 5. Beat Instruction
    const instruction = story.settings.beatInstruction === 'continue' 
      ? 'Setze die Geschichte fort' 
      : 'Bleibe im Moment';
    parts.push('## Anweisung');
    parts.push(instruction);

    return parts.join('\n');
  }

  private getStoryContext(story: Story, currentChapterId?: string, currentSceneId?: string): string {
    if (!story.settings) return '';

    const useFullContext = story.settings.useFullStoryContext;
    const parts: string[] = [];

    for (const chapter of story.chapters) {
      // Stop at current chapter/scene
      if (currentChapterId && chapter.id === currentChapterId) {
        const currentSceneIndex = currentSceneId 
          ? chapter.scenes.findIndex(s => s.id === currentSceneId)
          : chapter.scenes.length;
        
        if (currentSceneIndex > 0) {
          const scenesToInclude = chapter.scenes.slice(0, currentSceneIndex);
          for (const scene of scenesToInclude) {
            parts.push(`### ${chapter.title} - ${scene.title}`);
            if (useFullContext) {
              parts.push(scene.content || '(Leer)');
            } else {
              parts.push(scene.summary || scene.content.substring(0, 200) + '...' || '(Keine Zusammenfassung verfügbar)');
            }
            parts.push('');
          }
        }
        break;
      } else {
        // Include full chapter
        parts.push(`### ${chapter.title}`);
        for (const scene of chapter.scenes) {
          parts.push(`#### ${scene.title}`);
          if (useFullContext) {
            parts.push(scene.content || '(Leer)');
          } else {
            parts.push(scene.summary || scene.content.substring(0, 200) + '...' || '(Keine Zusammenfassung verfügbar)');
          }
          parts.push('');
        }
      }
    }

    return parts.join('\n');
  }
}