import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AIRequestLoggerService, AIRequestLog } from '../../core/services/ai-request-logger.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ai-request-logger',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logger-container">
      <div class="logger-header">
        <button class="back-btn" (click)="goBack()">← Zurück</button>
        <h1>AI Request Logger</h1>
        <div class="header-actions">
          <span class="log-count">{{ logs.length }} Logs</span>
          <button class="clear-btn" (click)="clearLogs()" [disabled]="logs.length === 0">
            🗑️ Logs löschen
          </button>
        </div>
      </div>

      <div class="logs-container">
        <div class="log-item" *ngFor="let log of logs" 
             [class.success]="log.status === 'success'"
             [class.error]="log.status === 'error'"
             [class.pending]="log.status === 'pending'"
             [class.aborted]="log.status === 'aborted'"
             [class.expanded]="expandedLogs.has(log.id)">
          
          <div class="log-header" (click)="toggleExpand(log.id)">
            <div class="log-status">
              <span class="status-icon">
                <ng-container [ngSwitch]="log.status">
                  <span *ngSwitchCase="'success'">✓</span>
                  <span *ngSwitchCase="'error'">✗</span>
                  <span *ngSwitchCase="'pending'">⏳</span>
                  <span *ngSwitchCase="'aborted'">⏹</span>
                </ng-container>
              </span>
            </div>
            
            <div class="log-info">
              <div class="log-main">
                <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                <span class="log-model">{{ log.model }}</span>
                <span class="log-endpoint">{{ log.endpoint }}</span>
              </div>
              <div class="log-meta">
                <span class="meta-item">📝 {{ log.wordCount }} Wörter</span>
                <span class="meta-item">🎯 {{ log.maxTokens }} Tokens</span>
                <span class="meta-item" *ngIf="log.duration">⏱️ {{ log.duration }}ms</span>
              </div>
            </div>
            
            <button class="expand-btn">
              {{ expandedLogs.has(log.id) ? '▼' : '▶' }}
            </button>
          </div>
          
          <div class="log-details" *ngIf="expandedLogs.has(log.id)">
            <div class="detail-section">
              <h3>Prompt:</h3>
              <pre class="prompt-content">{{ log.prompt }}</pre>
            </div>
            
            <div class="detail-section" *ngIf="log.response">
              <h3>Response:</h3>
              <pre class="response-content">{{ log.response }}</pre>
            </div>
            
            <div class="detail-section error-section" *ngIf="log.error">
              <h3>Error:</h3>
              <pre class="error-content">{{ log.error }}</pre>
            </div>
          </div>
        </div>
        
        <div class="no-logs" *ngIf="logs.length === 0">
          <p>Noch keine AI-Requests geloggt.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .logger-container {
      min-height: 100vh;
      background: #1a1a1a;
      color: #e0e0e0;
    }

    .logger-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 2rem;
      background: #2d2d2d;
      border-bottom: 1px solid #404040;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .logger-header h1 {
      margin: 0;
      font-size: 1.5rem;
      color: #f8f9fa;
    }

    .back-btn {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.3s;
    }

    .back-btn:hover {
      background: #5a6268;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .log-count {
      color: #adb5bd;
      font-size: 0.9rem;
    }

    .clear-btn {
      background: #dc3545;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.3s;
      font-size: 0.9rem;
    }

    .clear-btn:hover:not(:disabled) {
      background: #c82333;
    }

    .clear-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .logs-container {
      padding: 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .log-item {
      background: #2d2d2d;
      border: 1px solid #404040;
      border-radius: 8px;
      margin-bottom: 0.75rem;
      overflow: hidden;
      transition: all 0.3s;
    }

    .log-item.success {
      border-left: 4px solid #28a745;
    }

    .log-item.error {
      border-left: 4px solid #dc3545;
    }

    .log-item.pending {
      border-left: 4px solid #ffc107;
    }

    .log-item.aborted {
      border-left: 4px solid #fd7e14;
    }

    .log-header {
      display: flex;
      align-items: center;
      padding: 1rem;
      cursor: pointer;
      user-select: none;
    }

    .log-header:hover {
      background: #343a40;
    }

    .log-status {
      margin-right: 1rem;
    }

    .status-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      font-weight: bold;
    }

    .success .status-icon {
      background: rgba(40, 167, 69, 0.2);
      color: #28a745;
    }

    .error .status-icon {
      background: rgba(220, 53, 69, 0.2);
      color: #dc3545;
    }

    .pending .status-icon {
      background: rgba(255, 193, 7, 0.2);
      color: #ffc107;
    }

    .aborted .status-icon {
      background: rgba(253, 126, 20, 0.2);
      color: #fd7e14;
    }

    .log-info {
      flex: 1;
    }

    .log-main {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.25rem;
    }

    .log-time {
      font-weight: 500;
      color: #f8f9fa;
    }

    .log-model {
      background: #0d6efd;
      color: white;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
    }

    .log-endpoint {
      color: #6c757d;
      font-size: 0.85rem;
      font-family: 'Courier New', monospace;
    }

    .log-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      color: #adb5bd;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .expand-btn {
      background: none;
      border: none;
      color: #6c757d;
      font-size: 1rem;
      cursor: pointer;
      padding: 0.5rem;
      transition: color 0.3s;
    }

    .expand-btn:hover {
      color: #adb5bd;
    }

    .log-details {
      padding: 0 1rem 1rem 4rem;
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .detail-section {
      margin-bottom: 1rem;
    }

    .detail-section:last-child {
      margin-bottom: 0;
    }

    .detail-section h3 {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      color: #adb5bd;
      font-weight: 600;
    }

    .prompt-content,
    .response-content,
    .error-content {
      background: #1a1a1a;
      border: 1px solid #404040;
      border-radius: 6px;
      padding: 1rem;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
      margin: 0;
      max-height: 400px;
      overflow-y: auto;
    }

    .error-section h3 {
      color: #dc3545;
    }

    .error-content {
      border-color: #dc3545;
      color: #f8d7da;
    }

    .no-logs {
      text-align: center;
      padding: 4rem 2rem;
      color: #6c757d;
      font-size: 1.1rem;
    }

    /* Scrollbar styling */
    .prompt-content::-webkit-scrollbar,
    .response-content::-webkit-scrollbar,
    .error-content::-webkit-scrollbar {
      width: 8px;
    }

    .prompt-content::-webkit-scrollbar-track,
    .response-content::-webkit-scrollbar-track,
    .error-content::-webkit-scrollbar-track {
      background: #2d2d2d;
      border-radius: 4px;
    }

    .prompt-content::-webkit-scrollbar-thumb,
    .response-content::-webkit-scrollbar-thumb,
    .error-content::-webkit-scrollbar-thumb {
      background: #495057;
      border-radius: 4px;
    }

    .prompt-content::-webkit-scrollbar-thumb:hover,
    .response-content::-webkit-scrollbar-thumb:hover,
    .error-content::-webkit-scrollbar-thumb:hover {
      background: #6c757d;
    }
  `]
})
export class AIRequestLoggerComponent implements OnInit, OnDestroy {
  logs: AIRequestLog[] = [];
  expandedLogs = new Set<string>();
  private subscription = new Subscription();

  constructor(
    private loggerService: AIRequestLoggerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.loggerService.logs$.subscribe(logs => {
        this.logs = logs;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleExpand(logId: string): void {
    if (this.expandedLogs.has(logId)) {
      this.expandedLogs.delete(logId);
    } else {
      this.expandedLogs.add(logId);
    }
  }

  clearLogs(): void {
    if (confirm('Möchten Sie wirklich alle Logs löschen?')) {
      this.loggerService.clearLogs();
      this.expandedLogs.clear();
    }
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'Gerade eben';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `Vor ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `Vor ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
    } else {
      return date.toLocaleString('de-DE');
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}