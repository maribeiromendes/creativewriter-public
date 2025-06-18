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
  status: 'pending' | 'success' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class AIRequestLoggerService {
  private logsSubject = new BehaviorSubject<AIRequestLog[]>([]);
  public logs$ = this.logsSubject.asObservable();
  private maxLogs = 100; // Keep last 100 logs

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

  clearLogs(): void {
    this.logsSubject.next([]);
    localStorage.removeItem('ai-request-logs');
  }

  getLogs(): AIRequestLog[] {
    return this.logsSubject.value;
  }

  private saveLogs(): void {
    const logs = this.logsSubject.value;
    localStorage.setItem('ai-request-logs', JSON.stringify(logs));
  }

  private generateId(): string {
    return 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}