import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, takeUntil, Subject } from 'rxjs';
import { SettingsService } from './settings.service';
import { AIRequestLoggerService } from './ai-request-logger.service';

export interface GoogleGeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
    role?: 'user' | 'model';
  }>;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface GoogleGeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GoogleGeminiApiService {
  private readonly API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  private abortSubjects = new Map<string, Subject<void>>();
  private requestMetadata = new Map<string, { logId: string; startTime: number }>();

  constructor(
    private http: HttpClient,
    private settingsService: SettingsService,
    private aiLogger: AIRequestLoggerService
  ) {}

  generateText(prompt: string, options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    wordCount?: number;
    requestId?: string;
    messages?: Array<{role: 'system' | 'user' | 'assistant', content: string}>;
  } = {}): Observable<GoogleGeminiResponse> {
    const settings = this.settingsService.getSettings();
    const startTime = Date.now();
    
    if (!settings.googleGemini.enabled || !settings.googleGemini.apiKey) {
      throw new Error('Google Gemini API ist nicht aktiviert oder API-Key fehlt');
    }

    const model = options.model || settings.googleGemini.model;
    if (!model) {
      throw new Error('Kein AI-Modell ausgewählt');
    }

    const maxTokens = options.maxTokens || 500;
    const wordCount = options.wordCount || Math.floor(maxTokens / 1.3);

    // Log the request
    const logId = this.aiLogger.logRequest({
      endpoint: `${this.API_BASE_URL}/${model}:generateContent`,
      model: model,
      wordCount: wordCount,
      maxTokens: maxTokens,
      prompt: prompt
    });

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-goog-api-key': settings.googleGemini.apiKey
    });

    // Convert messages format to Gemini format
    const contents = this.convertMessagesToContents(options.messages, prompt);

    const request: GoogleGeminiRequest = {
      contents: contents,
      generationConfig: {
        temperature: options.temperature !== undefined ? options.temperature : settings.googleGemini.temperature,
        topP: options.topP !== undefined ? options.topP : settings.googleGemini.topP,
        maxOutputTokens: maxTokens
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }
      ]
    };

    // Create abort subject for this request
    const requestId = options.requestId || this.generateRequestId();
    const abortSubject = new Subject<void>();
    this.abortSubjects.set(requestId, abortSubject);
    
    // Store request metadata for abort handling
    this.requestMetadata.set(requestId, { logId, startTime });

    const url = `${this.API_BASE_URL}/${model}:generateContent`;

    return this.http.post<GoogleGeminiResponse>(url, request, { headers }).pipe(
      takeUntil(abortSubject),
      tap({
        next: (response) => {
          const duration = Date.now() - startTime;
          const content = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
          this.aiLogger.logSuccess(logId, content, duration);
          this.cleanupRequest(requestId);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          let errorMessage = 'Unknown error';
          
          if (error.error?.error?.message) {
            errorMessage = error.error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.aiLogger.logError(logId, errorMessage, duration);
          this.cleanupRequest(requestId);
        }
      })
    );
  }

  private convertMessagesToContents(
    messages?: Array<{role: 'system' | 'user' | 'assistant', content: string}>,
    fallbackPrompt?: string
  ): Array<{parts: Array<{text: string}>, role?: 'user' | 'model'}> {
    if (!messages || messages.length === 0) {
      return [{
        parts: [{ text: fallbackPrompt || '' }],
        role: 'user'
      }];
    }

    const contents: Array<{parts: Array<{text: string}>, role?: 'user' | 'model'}> = [];
    
    for (const message of messages) {
      // Convert system messages to user messages with context
      if (message.role === 'system') {
        contents.push({
          parts: [{ text: `System: ${message.content}` }],
          role: 'user'
        });
      } else if (message.role === 'user') {
        contents.push({
          parts: [{ text: message.content }],
          role: 'user'
        });
      } else if (message.role === 'assistant') {
        contents.push({
          parts: [{ text: message.content }],
          role: 'model'
        });
      }
    }

    return contents;
  }

  abortRequest(requestId: string): void {
    const abortSubject = this.abortSubjects.get(requestId);
    const metadata = this.requestMetadata.get(requestId);
    
    if (abortSubject && metadata) {
      // Log the abort
      const duration = Date.now() - metadata.startTime;
      this.aiLogger.logAborted(metadata.logId, duration);
      
      // Abort the request
      abortSubject.next();
      this.cleanupRequest(requestId);
    }
  }

  private cleanupRequest(requestId: string): void {
    const abortSubject = this.abortSubjects.get(requestId);
    if (abortSubject) {
      abortSubject.complete();
      this.abortSubjects.delete(requestId);
    }
    this.requestMetadata.delete(requestId);
  }

  private generateRequestId(): string {
    return 'gemini_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }
}