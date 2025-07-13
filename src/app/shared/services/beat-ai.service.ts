import { Injectable } from '@angular/core';
import { Observable, Subject, map, scan, catchError, of, switchMap, from, tap } from 'rxjs';
import { BeatAI, BeatAIGenerationEvent } from '../../stories/models/beat-ai.interface';
import { OpenRouterApiService } from '../../core/services/openrouter-api.service';
import { GoogleGeminiApiService } from '../../core/services/google-gemini-api.service';
import { SettingsService } from '../../core/services/settings.service';
import { StoryService } from '../../stories/services/story.service';
import { CodexService } from '../../stories/services/codex.service';
import { PromptManagerService } from './prompt-manager.service';
import { CodexRelevanceService } from '../../core/services/codex-relevance.service';

@Injectable({
  providedIn: 'root'
})
export class BeatAIService {
  private generationSubject = new Subject<BeatAIGenerationEvent>();
  public generation$ = this.generationSubject.asObservable();
  private activeGenerations = new Map<string, string>(); // beatId -> requestId
  private isStreamingSubject = new Subject<boolean>();
  public isStreaming$ = this.isStreamingSubject.asObservable();

  constructor(
    private openRouterApi: OpenRouterApiService,
    private googleGeminiApi: GoogleGeminiApiService,
    private settingsService: SettingsService,
    private storyService: StoryService,
    private codexService: CodexService,
    private promptManager: PromptManagerService,
    private codexRelevanceService: CodexRelevanceService
  ) {}

  generateBeatContent(prompt: string, beatId: string, options: {
    wordCount?: number;
    model?: string;
    storyId?: string;
    chapterId?: string;
    sceneId?: string;
    beatPosition?: number;
    beatType?: 'story' | 'scene';
  } = {}): Observable<string> {
    const settings = this.settingsService.getSettings();
    
    // Extract provider and model ID from the combined format
    let provider: string | null = null;
    let actualModelId: string | null = null;
    
    if (options.model) {
      const [modelProvider, ...modelIdParts] = options.model.split(':');
      provider = modelProvider;
      actualModelId = modelIdParts.join(':'); // Rejoin in case model ID contains colons
    }
    
    // Check which API to use based on the model's provider
    const useGoogleGemini = provider === 'gemini' && settings.googleGemini.enabled && settings.googleGemini.apiKey;
    const useOpenRouter = provider === 'openrouter' && settings.openRouter.enabled && settings.openRouter.apiKey;
    
    if (!useGoogleGemini && !useOpenRouter) {
      console.warn('No AI API configured, using fallback content');
      return this.generateFallbackContent(prompt, beatId);
    }

    // Emit generation start
    this.isStreamingSubject.next(true);
    this.generationSubject.next({
      beatId,
      chunk: '',
      isComplete: false
    });

    // Create structured prompt using template
    const wordCount = options.wordCount || 400;
    
    // Log the generation request at the service level
    console.log('🔍 Beat AI Service - Starting generation:', {
      beatId: beatId,
      wordCount: wordCount,
      model: options.model,
      storyId: options.storyId,
      chapterId: options.chapterId,
      sceneId: options.sceneId,
      useGoogleGemini: useGoogleGemini,
      useOpenRouter: useOpenRouter,
      promptLength: prompt.length
    });
    
    return this.buildStructuredPromptFromTemplate(prompt, beatId, { ...options, wordCount }).pipe(
      switchMap(enhancedPrompt => {
        // Calculate max tokens based on word count (roughly 2.5 tokens per German word for Gemini)
        // Set a high minimum to avoid MAX_TOKENS cutoff
        const calculatedTokens = Math.ceil(wordCount * 2.5);
        const maxTokens = Math.max(calculatedTokens, 3000); // Minimum 3000 tokens for any response
        const requestId = this.generateRequestId();
        
        // Debug logging
        console.log('🔍 Beat AI Debug:', {
          originalPrompt: prompt,
          wordCount: wordCount,
          maxTokens: maxTokens,
          enhancedPromptLength: enhancedPrompt.length,
          enhancedPromptPreview: enhancedPrompt.substring(0, 500) + '...'
        });
        
        // Store the active generation
        this.activeGenerations.set(beatId, requestId);

        // Update options with the actual model ID
        const updatedOptions = { ...options, model: actualModelId };
        
        // Choose API based on configuration (prefer Google Gemini if available)
        const apiCall = useGoogleGemini 
          ? this.callGoogleGeminiStreamingAPI(enhancedPrompt, updatedOptions, maxTokens, wordCount, requestId, beatId)
          : this.callOpenRouterStreamingAPI(enhancedPrompt, updatedOptions, maxTokens, wordCount, requestId, beatId);

        return apiCall.pipe(
          catchError(error => {
            console.error('🔍 Beat AI Service - API error, using fallback:', {
              beatId: beatId,
              error: error.message,
              errorType: error.name,
              apiProvider: useGoogleGemini ? 'gemini' : 'openrouter',
              wordCount: wordCount,
              maxTokens: maxTokens,
              originalPromptLength: prompt.length,
              enhancedPromptLength: enhancedPrompt.length
            });
            
            // Clean up active generation
            this.activeGenerations.delete(beatId);
            
            // Signal streaming stopped if no more active generations
            if (this.activeGenerations.size === 0) {
              this.isStreamingSubject.next(false);
            }
            
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

  private callGoogleGeminiStreamingAPI(prompt: string, options: any, maxTokens: number, wordCount: number, requestId: string, beatId: string): Observable<string> {
    // Parse the structured prompt to extract messages
    const messages = this.parseStructuredPrompt(prompt);
    
    let accumulatedContent = '';
    
    return this.googleGeminiApi.generateTextStream(prompt, {
      model: options.model,
      maxTokens: maxTokens,
      wordCount: wordCount,
      requestId: requestId,
      messages: messages
    }).pipe(
      tap((chunk: string) => {
        // Emit each chunk as it arrives
        accumulatedContent += chunk;
        this.generationSubject.next({
          beatId,
          chunk: chunk,
          isComplete: false
        });
      }),
      scan((acc, chunk) => acc + chunk, ''), // Accumulate chunks
      tap({
        complete: () => {
          // Post-process to remove duplicate character analyses
          accumulatedContent = this.removeDuplicateCharacterAnalyses(accumulatedContent);
          
          // Emit completion
          this.generationSubject.next({
            beatId,
            chunk: '',
            isComplete: true
          });
          
          // Clean up active generation
          this.activeGenerations.delete(beatId);
          
          // Signal streaming stopped if no more active generations
          if (this.activeGenerations.size === 0) {
            this.isStreamingSubject.next(false);
          }
        },
        error: (error) => {
          console.error('🔍 Beat AI Service - Gemini streaming error:', {
            beatId: beatId,
            error: error.message,
            errorType: error.name,
            accumulatedContentLength: accumulatedContent.length,
            requestId: requestId
          });
          // Clean up on error
          this.activeGenerations.delete(beatId);
          
          // Signal streaming stopped if no more active generations
          if (this.activeGenerations.size === 0) {
            this.isStreamingSubject.next(false);
          }
        }
      }),
      map(() => accumulatedContent), // Return full content at the end
      catchError(error => {
        console.error('🔍 Beat AI Service - Gemini API streaming failed, trying non-streaming fallback:', {
          beatId: beatId,
          error: error.message,
          errorType: error.name,
          willFallbackToNonStreaming: true
        });
        
        // Try non-streaming API as fallback
        return this.googleGeminiApi.generateText(prompt, {
          model: options.model,
          maxTokens: maxTokens,
          temperature: options.temperature,
          topP: options.topP,
          wordCount: wordCount,
          requestId: requestId,
          messages: messages
        }).pipe(
          map(response => {
            const content = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
            accumulatedContent = content;
            
            // Simulate streaming by emitting in chunks
            const chunkSize = 50;
            for (let i = 0; i < content.length; i += chunkSize) {
              const chunk = content.substring(i, i + chunkSize);
              this.generationSubject.next({
                beatId,
                chunk: chunk,
                isComplete: false
              });
            }
            
            // Emit completion
            this.generationSubject.next({
              beatId,
              chunk: '',
              isComplete: true
            });
            
            // Clean up
            this.activeGenerations.delete(beatId);
            
            // Signal streaming stopped if no more active generations
            if (this.activeGenerations.size === 0) {
              this.isStreamingSubject.next(false);
            }
            
            return content;
          })
        );
      })
    );
  }

  private callOpenRouterStreamingAPI(prompt: string, options: any, maxTokens: number, wordCount: number, requestId: string, beatId: string): Observable<string> {
    let accumulatedContent = '';
    
    return this.openRouterApi.generateTextStream(prompt, {
      model: options.model,
      maxTokens: maxTokens,
      wordCount: wordCount,
      requestId: requestId
    }).pipe(
      tap((chunk: string) => {
        // Emit each chunk as it arrives
        accumulatedContent += chunk;
        this.generationSubject.next({
          beatId,
          chunk: chunk,
          isComplete: false
        });
      }),
      scan((acc, chunk) => acc + chunk, ''), // Accumulate chunks
      tap({
        complete: () => {
          // Post-process to remove duplicate character analyses
          accumulatedContent = this.removeDuplicateCharacterAnalyses(accumulatedContent);
          
          // Emit completion
          this.generationSubject.next({
            beatId,
            chunk: '',
            isComplete: true
          });
          
          // Clean up active generation
          this.activeGenerations.delete(beatId);
          
          // Signal streaming stopped if no more active generations
          if (this.activeGenerations.size === 0) {
            this.isStreamingSubject.next(false);
          }
        }
      }),
      map(() => accumulatedContent) // Return full content at the end
    );
  }

  private parseStructuredPrompt(prompt: string): Array<{role: 'system' | 'user' | 'assistant', content: string}> {
    // Parse XML-like message structure from the template
    const messagePattern = /<message role="(system|user|assistant)">([\s\S]*?)<\/message>/gi;
    const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [];
    
    let match;
    while ((match = messagePattern.exec(prompt)) !== null) {
      const role = match[1] as 'system' | 'user' | 'assistant';
      const content = match[2].trim();
      messages.push({ role, content });
    }
    
    // If no structured messages found, treat as single user message
    if (messages.length === 0) {
      messages.push({ role: 'user', content: prompt });
    }
    
    return messages;
  }

  // Legacy template - now replaced by story.settings.beatGenerationTemplate

  private buildStructuredPromptFromTemplate(userPrompt: string, beatId: string, options: {
    storyId?: string;
    chapterId?: string;
    sceneId?: string;
    wordCount?: number;
    beatType?: 'story' | 'scene';
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
      switchMap(async (story: any) => {
        if (!story || typeof story === 'string' || !story.settings) {
          return userPrompt;
        }

        // Get codex entries in XML format
        const allCodexEntries = this.codexService.getAllCodexEntries(options.storyId!);
        
        // Get current scene text first
        const sceneText = options.sceneId 
          ? await this.promptManager.getCurrentOrPreviousSceneText(options.sceneId, beatId)
          : '';
        
        // Convert to relevance service format and filter
        const convertedEntries = this.convertCodexEntriesToRelevanceFormat(allCodexEntries);
        const sceneContext = sceneText || '';
        const relevantEntries = await this.codexRelevanceService.getRelevantEntries(
          convertedEntries,
          sceneContext,
          userPrompt,
          1000 // Max tokens for codex
        ).toPromise() || [];
        
        // Convert back to original format for XML generation
        const filteredCodexEntries = this.filterCodexEntriesByRelevance(
          allCodexEntries,
          relevantEntries
        );
        
        // Always include all Notizen entries (check multiple possible names)
        const notizenKeywords = ['notizen', 'notes', 'note'];
        const notizenCategory = allCodexEntries.find(cat => 
          notizenKeywords.some(keyword => 
            cat.category.toLowerCase().includes(keyword)
          )
        );
        
        if (notizenCategory && notizenCategory.entries.length > 0) {
          // Check if this category already exists in filtered entries
          const existingNotizenIndex = filteredCodexEntries.findIndex(cat => 
            cat.category === notizenCategory.category
          );
          if (existingNotizenIndex >= 0) {
            // Replace with full Notizen category (ensure all entries are included)
            filteredCodexEntries[existingNotizenIndex] = notizenCategory;
          } else {
            // Add full Notizen category
            filteredCodexEntries.push(notizenCategory);
          }
        }
        
        // Find protagonist for point of view
        const protagonist = this.findProtagonist(filteredCodexEntries);
        const pointOfView = protagonist 
          ? `<pointOfView type="first person" character="${this.escapeXml(protagonist)}"/>`
          : '';
        
        
        const codexText = filteredCodexEntries.length > 0 
          ? '<codex>\n' + filteredCodexEntries.map(categoryData => {
              const categoryType = this.getCategoryXmlType(categoryData.category);
              
              return categoryData.entries.map((entry: any) => {
                let entryXml = `<${categoryType} name="${this.escapeXml(entry.title)}"`;
                
                // Add aliases if present
                if (entry.metadata?.['aliases']) {
                  entryXml += ` aliases="${this.escapeXml(entry.metadata['aliases'])}"`;
                }
                
                // Add story role for characters
                if (entry.metadata?.['storyRole'] && categoryData.category === 'Charaktere') {
                  entryXml += ` storyRole="${this.escapeXml(entry.metadata['storyRole'])}"`;
                }
                
                entryXml += '>\n';
                
                // Main description
                if (entry.content) {
                  entryXml += `  <description>${this.escapeXml(entry.content)}</description>\n`;
                }
                
                // Custom fields
                const customFields = entry.metadata?.['customFields'] || [];
                customFields.forEach((field: any) => {
                  const fieldName = this.sanitizeXmlTagName(field.name);
                  entryXml += `  <${fieldName}>${this.escapeXml(field.value)}</${fieldName}>\n`;
                });
                
                // Additional metadata fields
                if (entry.metadata) {
                  Object.entries(entry.metadata)
                    .filter(([key]) => key !== 'storyRole' && key !== 'customFields' && key !== 'aliases')
                    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                    .forEach(([key, value]) => {
                      const tagName = this.sanitizeXmlTagName(key);
                      entryXml += `  <${tagName}>${this.escapeXml(String(value))}</${tagName}>\n`;
                    });
                }
                
                entryXml += `</${categoryType}>`;
                return entryXml;
              }).join('\n');
            }).join('\n') + '\n</codex>'
          : '';


        // Get story so far in XML format
        // For SceneBeat, we get the story without scene summaries
        const storySoFar = options.sceneId 
          ? (options.beatType === 'scene' 
              ? await this.promptManager.getStoryXmlFormatWithoutSummaries(options.sceneId)
              : await this.promptManager.getStoryXmlFormat(options.sceneId))
          : '';

        // Build template placeholders
        const placeholders = {
          systemMessage: story.settings.systemMessage,
          codexEntries: codexText,
          storySoFar: storySoFar,
          storyTitle: story.title || 'Story',
          sceneFullText: sceneText,
          wordCount: (options.wordCount || 200).toString(),
          prompt: userPrompt,
          pointOfView: pointOfView,
          writingStyle: story.settings.beatInstruction === 'continue' 
            ? 'Setze die Geschichte fort' 
            : 'Bleibe im Moment'
        };

        // Log the final codex text to debug
        
        // Use template from story settings and replace placeholders
        let processedTemplate = story.settings.beatGenerationTemplate;
        
        Object.entries(placeholders).forEach(([key, value]) => {
          const placeholder = `{${key}}`;
          const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          processedTemplate = processedTemplate.replace(regex, value || '');
        });

        return processedTemplate;
      }),
      map(result => result)
    );
  }

  private generateFallbackContent(prompt: string, beatId: string): Observable<string> {
    const fallbackContent = this.generateSampleContent(prompt);
    
    console.log('🔍 Beat AI Service - Using fallback content:', {
      beatId: beatId,
      promptLength: prompt.length,
      fallbackContentLength: fallbackContent.length,
      reason: 'API unavailable or failed'
    });
    
    // Emit generation complete with fallback
    this.generationSubject.next({
      beatId,
      chunk: fallbackContent,
      isComplete: true
    });
    
    // Signal streaming stopped
    this.isStreamingSubject.next(false);
    
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


  createNewBeat(beatType: 'story' | 'scene' = 'story'): BeatAI {
    return {
      id: this.generateId(),
      prompt: '',
      generatedContent: '',
      isGenerating: false,
      isEditing: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      wordCount: 400,
      beatType: beatType
    };
  }

  private generateId(): string {
    return 'beat-' + Math.random().toString(36).substring(2, 11);
  }

  // Public method to preview the structured prompt
  previewPrompt(userPrompt: string, beatId: string, options: {
    storyId?: string;
    chapterId?: string;
    sceneId?: string;
    wordCount?: number;
  }): Observable<string> {
    return this.buildStructuredPromptFromTemplate(userPrompt, beatId, options);
  }

  stopGeneration(beatId: string): void {
    const requestId = this.activeGenerations.get(beatId);
    if (requestId) {
      // Try to abort on both APIs (one will succeed based on request ID format)
      if (requestId.startsWith('gemini_')) {
        this.googleGeminiApi.abortRequest(requestId);
      } else {
        this.openRouterApi.abortRequest(requestId);
      }
      
      this.activeGenerations.delete(beatId);
      
      // Emit generation stopped
      this.generationSubject.next({
        beatId,
        chunk: '',
        isComplete: true
      });
      
      // Signal streaming stopped if no more active generations
      if (this.activeGenerations.size === 0) {
        this.isStreamingSubject.next(false);
      }
    }
  }

  isGenerating(beatId: string): boolean {
    return this.activeGenerations.has(beatId);
  }

  private generateRequestId(): string {
    return 'beat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  private getCategoryXmlType(category: string): string {
    const mapping: { [key: string]: string } = {
      'Charaktere': 'character',
      'Orte': 'location',
      'Gegenstände': 'item',
      'Notizen': 'other'
    };
    return mapping[category] || 'other';
  }

  private escapeXml(text: string | any): string {
    // Ensure the input is a string
    const str = String(text || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private sanitizeXmlTagName(name: string | any): string {
    // Convert to camelCase and remove invalid characters
    const str = String(name || '');
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  private findProtagonist(codexEntries: any[]): string | null {
    // Look for character entries with storyRole "Protagonist"
    for (const categoryData of codexEntries) {
      if (categoryData.category === 'Charaktere') {
        for (const entry of categoryData.entries) {
          const storyRole = entry.metadata?.['storyRole'];
          if (storyRole === 'Protagonist') {
            return entry.title;
          }
        }
      }
    }
    return null;
  }

  private convertCodexEntriesToRelevanceFormat(codexEntries: any[]): any[] {
    const converted: any[] = [];
    
    for (const categoryData of codexEntries) {
      const categoryMap: Record<string, any> = {
        'Charaktere': 'character',
        'Orte': 'location',
        'Gegenstände': 'object',
        'Notizen': 'other',
        'Lore': 'lore'
      };
      
      const category = categoryMap[categoryData.category] || 'other';
      
      for (const entry of categoryData.entries) {
        // Extract aliases from metadata
        const aliases: string[] = [];
        if (entry.metadata?.['aliases']) {
          const aliasValue = entry.metadata['aliases'];
          if (typeof aliasValue === 'string' && aliasValue) {
            aliases.push(...aliasValue.split(',').map((a: string) => a.trim()).filter((a: string) => a));
          }
        }
        
        // Extract keywords from tags and content
        const keywords: string[] = entry.tags || [];
        
        // Determine importance based on story role or category
        let importance: 'major' | 'minor' | 'background' = 'minor';
        if (entry.metadata?.['storyRole']) {
          const role = entry.metadata['storyRole'];
          if (role === 'Protagonist' || role === 'Antagonist') {
            importance = 'major';
          } else if (role === 'Hintergrundcharakter') {
            importance = 'background';
          }
        }
        
        converted.push({
          id: entry.id,
          title: entry.title,
          category: category,
          content: entry.content || '',
          aliases: aliases,
          keywords: keywords,
          importance: importance,
          globalInclude: entry.metadata?.['globalInclude'] || entry.alwaysInclude || false,
          lastMentioned: entry.metadata?.['lastMentioned'],
          mentionCount: entry.metadata?.['mentionCount']
        });
      }
    }
    
    return converted;
  }

  private filterCodexEntriesByRelevance(
    allCodexEntries: any[], 
    relevantEntries: any[]
  ): any[] {
    const relevantIds = new Set(relevantEntries.map(e => e.id));
    
    return allCodexEntries.map(categoryData => {
      return {
        ...categoryData,
        entries: categoryData.entries.filter((entry: any) => relevantIds.has(entry.id))
      };
    }).filter(categoryData => categoryData.entries.length > 0);
  }

  private removeDuplicateCharacterAnalyses(content: string): string {
    // Pattern to detect character analysis sections
    // Look for patterns like "Character: Name" or "Charakter: Name" or similar variations
    const characterAnalysisPattern = /(?:^|\n)((?:Character|Charakter|Figur|Person)[:\s]+[^\n]+(?:\n(?!(?:Character|Charakter|Figur|Person)[:\s])[^\n]*)*)/gi;
    
    // Find all character analysis sections
    const analyses = new Map<string, string>();
    let match;
    
    while ((match = characterAnalysisPattern.exec(content)) !== null) {
      const fullAnalysis = match[1];
      // Extract character name (first line)
      const firstLine = fullAnalysis.split('\n')[0];
      const characterName = firstLine.replace(/^(?:Character|Charakter|Figur|Person)[:\s]+/i, '').trim();
      
      // Store only the first occurrence of each character analysis
      if (characterName && !analyses.has(characterName.toLowerCase())) {
        analyses.set(characterName.toLowerCase(), match[0]);
      }
    }
    
    // If we found duplicate analyses, rebuild the content without duplicates
    if (analyses.size > 0) {
      let processedContent = content;
      const seenCharacters = new Set<string>();
      
      // Replace all character analyses with markers first
      let markerIndex = 0;
      const markers = new Map<string, string>();
      
      processedContent = content.replace(characterAnalysisPattern, (match, analysis) => {
        const firstLine = analysis.split('\n')[0];
        const characterName = firstLine.replace(/^(?:Character|Charakter|Figur|Person)[:\s]+/i, '').trim().toLowerCase();
        
        if (characterName && !seenCharacters.has(characterName)) {
          seenCharacters.add(characterName);
          const marker = `###CHAR_ANALYSIS_${markerIndex}###`;
          markers.set(marker, match);
          markerIndex++;
          return marker;
        }
        return ''; // Remove duplicate
      });
      
      // Replace markers back with original content
      markers.forEach((original, marker) => {
        processedContent = processedContent.replace(marker, original);
      });
      
      // Clean up any resulting double newlines
      processedContent = processedContent.replace(/\n{3,}/g, '\n\n');
      
      return processedContent.trim();
    }
    
    return content;
  }
}