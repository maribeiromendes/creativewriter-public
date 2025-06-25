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
  }): string {
    const id = this.generateId();
    const newLog: AIRequestLog = {
      id,
      timestamp: new Date(),
      ...data,
      status: 'pending'
    };

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

  logSuccess(id: string, response: string, duration: number): void {
    this.updateLog(id, {
      response,
      duration,
      status: 'success'
    });
  }

  logError(id: string, error: string, duration: number): void {
    this.updateLog(id, {
      error,
      duration,
      status: 'error'
    });
  }

  logAborted(id: string, duration: number): void {
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
}