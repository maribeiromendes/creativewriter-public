import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AIRequestLog {
  id: string;
  timestamp: Date;
  endpoint: string;
  model: string;
  wordCount: number;
  maxTokens: number;
  prompt: string;
  response?: string;
  error?: string;
  duration?: number;
  status: 'pending' | 'success' | 'error' | 'aborted';
  // Additional debugging fields
  requestDetails?: any;
  responseHeaders?: any;
  httpStatus?: number;
  retryCount?: number;
  apiProvider?: 'openrouter' | 'gemini' | 'replicate';
  streamingMode?: boolean;
  errorDetails?: any;
  networkInfo?: {
    connectionType?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  // Safety ratings from AI providers (especially Gemini)
  safetyRatings?: {
    promptFeedback?: {
      blockReason?: string;
      safetyRatings?: {
        category: string;
        probability: string;
      }[];
    };
    candidateSafetyRatings?: {
      category: string;
      probability: string;
    }[];
    finishReason?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AIRequestLoggerService {
  private logsSubject = new BehaviorSubject<AIRequestLog[]>([]);
  public logs$ = this.logsSubject.asObservable();
  private maxLogs = 50; // Keep last 50 logs to avoid storage quota issues

  constructor() {
    // Load logs from localStorage on init
    const savedLogs = localStorage.getItem('ai-request-logs');
    if (savedLogs) {
      try {
        const logs = JSON.parse(savedLogs).map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
        this.logsSubject.next(logs);
      } catch (e) {
        console.error('Failed to load AI request logs:', e);
      }
    }
  }

  logRequest(data: {
    endpoint: string;
    model: string;
    wordCount: number;
    maxTokens: number;
    prompt: string;
    apiProvider?: 'openrouter' | 'gemini' | 'replicate';
    streamingMode?: boolean;
    requestDetails?: any;
  }): string {
    const id = this.generateId();
    
    // Capture network information if available
    const networkInfo = this.getNetworkInfo();
    
    const newLog: AIRequestLog = {
      id,
      timestamp: new Date(),
      endpoint: data.endpoint,
      model: data.model,
      wordCount: data.wordCount,
      maxTokens: data.maxTokens,
      prompt: data.prompt,
      status: 'pending',
      apiProvider: data.apiProvider,
      streamingMode: data.streamingMode,
      requestDetails: data.requestDetails,
      networkInfo: networkInfo
    };

    console.log('🔍 AI Request Logger - New request:', {
      id,
      endpoint: data.endpoint,
      model: data.model,
      apiProvider: data.apiProvider,
      streamingMode: data.streamingMode,
      promptLength: data.prompt.length,
      wordCount: data.wordCount,
      maxTokens: data.maxTokens,
      networkInfo
    });

    const currentLogs = this.logsSubject.value;
    const updatedLogs = [newLog, ...currentLogs].slice(0, this.maxLogs);
    this.logsSubject.next(updatedLogs);
    this.saveLogs();

    return id;
  }

  updateLog(id: string, updates: Partial<AIRequestLog>): void {
    const currentLogs = this.logsSubject.value;
    const updatedLogs = currentLogs.map(log => 
      log.id === id ? { ...log, ...updates } : log
    );
    this.logsSubject.next(updatedLogs);
    this.saveLogs();
  }

  logSuccess(id: string, response: string, duration: number, additionalData?: {
    responseHeaders?: any;
    httpStatus?: number;
    retryCount?: number;
    safetyRatings?: any;
  }): void {
    console.log('✅ AI Request Logger - Success:', {
      id,
      duration: duration + 'ms',
      responseLength: response.length,
      responseWordCount: response.split(/\s+/).length,
      httpStatus: additionalData?.httpStatus,
      retryCount: additionalData?.retryCount,
      responsePreview: response.substring(0, 200) + '...'
    });

    this.updateLog(id, {
      response,
      duration,
      status: 'success',
      responseHeaders: additionalData?.responseHeaders,
      httpStatus: additionalData?.httpStatus,
      retryCount: additionalData?.retryCount,
      safetyRatings: additionalData?.safetyRatings
    });
  }

  logError(id: string, error: string, duration: number, additionalData?: {
    errorDetails?: any;
    httpStatus?: number;
    retryCount?: number;
    responseHeaders?: any;
    safetyRatings?: any;
  }): void {
    console.error('❌ AI Request Logger - Error:', {
      id,
      duration: duration + 'ms',
      error,
      httpStatus: additionalData?.httpStatus,
      retryCount: additionalData?.retryCount,
      errorDetails: additionalData?.errorDetails
    });

    this.updateLog(id, {
      error,
      duration,
      status: 'error',
      errorDetails: additionalData?.errorDetails,
      httpStatus: additionalData?.httpStatus,
      retryCount: additionalData?.retryCount,
      responseHeaders: additionalData?.responseHeaders,
      safetyRatings: additionalData?.safetyRatings
    });
  }

  logAborted(id: string, duration: number): void {
    console.log('⏹️ AI Request Logger - Aborted:', {
      id,
      duration: duration + 'ms'
    });

    this.updateLog(id, {
      error: 'Request aborted by user',
      duration,
      status: 'aborted'
    });
  }

  clearLogs(): void {
    this.logsSubject.next([]);
    localStorage.removeItem('ai-request-logs');
  }

  getLogs(): AIRequestLog[] {
    return this.logsSubject.value;
  }

  private saveLogs(): void {
    try {
      const logs = this.logsSubject.value;
      
      // Reduce log data size by limiting prompt and response length
      const compactLogs = logs.map(log => ({
        ...log,
        prompt: log.prompt.length > 500 ? log.prompt.substring(0, 500) + '...' : log.prompt,
        response: log.response && log.response.length > 300 ? log.response.substring(0, 300) + '...' : log.response
      }));
      
      localStorage.setItem('ai-request-logs', JSON.stringify(compactLogs));
    } catch (error) {
      console.warn('Failed to save AI request logs to localStorage:', error);
      
      // If storage is full, clear old logs and try again with fewer logs
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.handleStorageQuotaExceeded();
      }
    }
  }

  private handleStorageQuotaExceeded(): void {
    console.warn('localStorage quota exceeded. Reducing log count and clearing old data.');
    
    // Reduce maxLogs even further
    this.maxLogs = Math.max(10, this.maxLogs / 2);
    
    // Keep only the most recent logs
    const currentLogs = this.logsSubject.value.slice(0, this.maxLogs);
    this.logsSubject.next(currentLogs);
    
    try {
      // Try to save with reduced data
      const compactLogs = currentLogs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        endpoint: log.endpoint,
        model: log.model,
        wordCount: log.wordCount,
        maxTokens: log.maxTokens,
        status: log.status,
        duration: log.duration,
        // Keep only essential data
        prompt: log.prompt.substring(0, 100) + '...',
        response: log.response ? log.response.substring(0, 100) + '...' : undefined,
        error: log.error ? log.error.substring(0, 200) : undefined
      }));
      
      localStorage.setItem('ai-request-logs', JSON.stringify(compactLogs));
    } catch (error) {
      console.error('Still cannot save logs after reduction. Clearing all logs.');
      // Last resort: clear all logs
      this.clearLogs();
    }
  }

  private generateId(): string {
    return 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  private getNetworkInfo(): any {
    // Get network information if available (experimental API)
    try {
      const nav = navigator as any;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      
      if (connection) {
        return {
          connectionType: connection.type || 'unknown',
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0
        };
      }
    } catch (e) {
      console.debug('Network API not available');
    }
    
    return {
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0
    };
  }

  // Method to log additional debugging info
  logDebugInfo(id: string, debugInfo: any): void {
    console.log('🔍 AI Request Logger - Debug Info:', {
      id,
      debugInfo,
      timestamp: new Date().toISOString()
    });

    const currentLogs = this.logsSubject.value;
    const logIndex = currentLogs.findIndex(log => log.id === id);
    
    if (logIndex !== -1) {
      const existingLog = currentLogs[logIndex];
      const updatedLog = {
        ...existingLog,
        requestDetails: {
          ...existingLog.requestDetails,
          debugInfo: {
            ...existingLog.requestDetails?.debugInfo,
            ...debugInfo
          }
        }
      };
      
      const updatedLogs = [...currentLogs];
      updatedLogs[logIndex] = updatedLog;
      this.logsSubject.next(updatedLogs);
      this.saveLogs();
    }
  }
}