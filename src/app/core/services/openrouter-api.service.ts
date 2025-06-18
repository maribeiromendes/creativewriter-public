import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { SettingsService } from './settings.service';
import { AIRequestLoggerService } from './ai-request-logger.service';

export interface OpenRouterRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class OpenRouterApiService {
  private readonly API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
  } = {}): Observable<OpenRouterResponse> {
    const settings = this.settingsService.getSettings();
    const startTime = Date.now();
    
    if (!settings.openRouter.enabled || !settings.openRouter.apiKey) {
      throw new Error('OpenRouter API ist nicht aktiviert oder API-Key fehlt');
    }

    const model = options.model || settings.openRouter.model;
    if (!model) {
      throw new Error('Kein AI-Modell ausgewählt');
    }

    const maxTokens = options.maxTokens || 500;
    const wordCount = options.wordCount || Math.floor(maxTokens / 1.3);

    // Log the request
    const logId = this.aiLogger.logRequest({
      endpoint: this.API_URL,
      model: model,
      wordCount: wordCount,
      maxTokens: maxTokens,
      prompt: prompt
    });

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${settings.openRouter.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Creative Writer'
    });

    const request: OpenRouterRequest = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: options.temperature !== undefined ? options.temperature : settings.openRouter.temperature,
      top_p: options.topP !== undefined ? options.topP : settings.openRouter.topP
    };

    return this.http.post<OpenRouterResponse>(this.API_URL, request, { headers }).pipe(
      tap({
        next: (response) => {
          const duration = Date.now() - startTime;
          const content = response.choices?.[0]?.message?.content || '';
          this.aiLogger.logSuccess(logId, content, duration);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const errorMessage = error.message || error.error?.message || 'Unknown error';
          this.aiLogger.logError(logId, errorMessage, duration);
        }
      })
    );
  }
}