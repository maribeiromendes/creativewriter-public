import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, takeUntil, Subject, map } from 'rxjs';
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
  private readonly API_BASE_URL = '/api/gemini/models';
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
    stream?: boolean;
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
      'Content-Type': 'application/json'
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

    // Debug logging for Gemini API
    console.log('🔍 Gemini API Debug:', {
      model: model,
      maxOutputTokens: maxTokens,
      wordCount: options.wordCount,
      contentsLength: contents.length,
      temperature: request.generationConfig?.temperature,
      requestUrl: url,
      contentsPreview: contents.map(c => ({ role: c.role, textLength: c.parts[0].text.length }))
    });

    return this.http.post<GoogleGeminiResponse>(url, request, { headers }).pipe(
      takeUntil(abortSubject),
      tap({
        next: (response) => {
          const duration = Date.now() - startTime;
          const content = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          // Debug logging for response
          console.log('🔍 Gemini Response Debug:', {
            duration: duration + 'ms',
            contentLength: content.length,
            wordCount: content.split(/\s+/).length,
            contentPreview: content.substring(0, 200) + '...',
            usageMetadata: response.usageMetadata,
            finishReason: response.candidates?.[0]?.finishReason
          });
          
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

  generateTextStream(prompt: string, options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    wordCount?: number;
    requestId?: string;
    messages?: Array<{role: 'system' | 'user' | 'assistant', content: string}>;
  } = {}): Observable<string> {
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
      endpoint: `${this.API_BASE_URL}/${model}:streamGenerateContent`,
      model: model,
      wordCount: wordCount,
      maxTokens: maxTokens,
      prompt: prompt
    });

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
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

    // Try without alt=sse first, as the proxy might handle streaming differently
    const url = `${this.API_BASE_URL}/${model}:streamGenerateContent`;

    // Debug logging for Gemini API
    console.log('🔍 Gemini Streaming API Debug:', {
      model: model,
      maxOutputTokens: maxTokens,
      wordCount: options.wordCount,
      contentsLength: contents.length,
      temperature: request.generationConfig?.temperature,
      requestUrl: url,
      contentsPreview: contents.map(c => ({ role: c.role, textLength: c.parts[0].text.length }))
    });

    return new Observable<string>(observer => {
      let accumulatedContent = '';
      let buffer = ''; // Buffer for incomplete JSON chunks
      
      // Use fetch for streaming since Angular HttpClient doesn't support streaming responses well
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(request)
      }).then(response => {
        console.log('🔍 Gemini Streaming Response:', {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          url: url
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Check if response is JSON (proxy doesn't support streaming)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          console.log('🔍 Gemini: Proxy returns JSON, falling back to non-streaming response');
          
          // Read complete response as JSON
          return response.json().then(data => {
            console.log('🔍 Gemini Complete Response:', data);
            
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
              const fullText = data.candidates[0].content.parts[0].text;
              accumulatedContent = fullText;
              
              // Simulate streaming by sending text in chunks
              const chunkSize = 50; // Characters per chunk
              let position = 0;
              
              const sendChunk = () => {
                if (position < fullText.length) {
                  const chunk = fullText.substring(position, position + chunkSize);
                  observer.next(chunk);
                  position += chunkSize;
                  setTimeout(sendChunk, 20); // 20ms delay between chunks
                } else {
                  observer.complete();
                  const duration = Date.now() - startTime;
                  console.log('🔍 Gemini Simulated Streaming Complete:', {
                    duration: duration + 'ms',
                    totalContentLength: accumulatedContent.length,
                    wordCount: accumulatedContent.split(/\s+/).length
                  });
                  this.aiLogger.logSuccess(logId, accumulatedContent, duration);
                  this.cleanupRequest(requestId);
                }
              };
              
              sendChunk();
            } else {
              throw new Error('No text content in response');
            }
          });
        }
        
        // Original streaming code for real SSE responses
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get response reader');
        }
        
        const decoder = new TextDecoder();
        
        const readStream = (): Promise<void> => {
          return reader.read().then(({ done, value }) => {
            if (done) {
              const duration = Date.now() - startTime;
              console.log('🔍 Gemini Streaming Complete:', {
                duration: duration + 'ms',
                totalContentLength: accumulatedContent.length,
                wordCount: accumulatedContent.split(/\s+/).length
              });
              
              observer.complete();
              this.aiLogger.logSuccess(logId, accumulatedContent, duration);
              this.cleanupRequest(requestId);
              return;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            console.log('🔍 Gemini Raw Chunk:', chunk);
            const lines = chunk.split('\n');
            
            // Try to parse the entire chunk as JSON first (Gemini might send complete JSON objects)
            if (chunk.trim()) {
              try {
                const parsed = JSON.parse(chunk.trim());
                console.log('🔍 Gemini Complete JSON Chunk:', parsed);
                
                if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                  const newText = parsed.candidates[0].content.parts[0].text;
                  accumulatedContent += newText;
                  console.log('🔍 Gemini New Text (Complete):', newText);
                  observer.next(newText);
                }
              } catch (e) {
                // Not complete JSON, try line by line
                for (const line of lines) {
                  console.log('🔍 Gemini Processing Line:', line);
                  
                  if (line.trim().startsWith('data: ')) {
                    const data = line.substring(6).trim();
                    if (data === '[DONE]') {
                      continue;
                    }
                    
                    try {
                      const parsed = JSON.parse(data);
                      console.log('🔍 Gemini Streaming Chunk:', parsed);
                      
                      if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const newText = parsed.candidates[0].content.parts[0].text;
                        accumulatedContent += newText;
                        console.log('🔍 Gemini New Text:', newText);
                        observer.next(newText);
                      }
                    } catch (e) {
                      console.warn('🔍 Gemini Parse Error:', e, 'Line:', line);
                      // Ignore parsing errors for incomplete JSON
                    }
                  } else if (line.trim() && !line.trim().startsWith('data:') && !line.trim().startsWith('event:')) {
                    // Some APIs send raw JSON without "data:" prefix
                    try {
                      const parsed = JSON.parse(line.trim());
                      console.log('🔍 Gemini Raw JSON Chunk:', parsed);
                      
                      if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const newText = parsed.candidates[0].content.parts[0].text;
                        accumulatedContent += newText;
                        console.log('🔍 Gemini New Text (Raw):', newText);
                        observer.next(newText);
                      }
                    } catch (e) {
                      // Not JSON, ignore
                    }
                  }
                }
              }
            }
            
            return readStream();
          });
        }
        
        return readStream();
      }).catch(error => {
        const duration = Date.now() - startTime;
        let errorMessage = 'Unknown error';
        
        if (error.message) {
          errorMessage = error.message;
        }
        
        observer.error(error);
        this.aiLogger.logError(logId, errorMessage, duration);
        this.cleanupRequest(requestId);
      });
      
      // Handle abort
      const abortSubscription = abortSubject.subscribe(() => {
        observer.complete();
      });
      
      return () => {
        abortSubscription.unsubscribe();
      };
    }).pipe(
      takeUntil(abortSubject)
    );
  }

  private generateRequestId(): string {
    return 'gemini_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }
}