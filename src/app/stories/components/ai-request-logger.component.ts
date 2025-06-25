import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonBadge, IonChip, IonCard,
  IonCardContent, IonText, IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack, trash, chevronForward, chevronDown, checkmarkCircle,
  closeCircle, timeOutline, pauseCircle, documentTextOutline,
  codeSlashOutline, warningOutline
} from 'ionicons/icons';
import { AIRequestLoggerService, AIRequestLog } from '../../core/services/ai-request-logger.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ai-request-logger',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonBadge, IonChip, IonCard,
    IonCardContent, IonText, IonNote
  ],
  template: `
    <div class="ion-page">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button (click)="goBack()">
              <ion-icon name="arrow-back" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-title>AI Request Logger</ion-title>
          <ion-buttons slot="end">
            <ion-chip color="medium">
              <ion-label>{{ logs.length }} Logs</ion-label>
            </ion-chip>
            <ion-button color="danger" (click)="clearLogs()" [disabled]="logs.length === 0">
              <ion-icon name="trash" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content>
      <ion-list class="logs-list">
        <ion-card *ngFor="let log of logs" 
                  [class.success-card]="log.status === 'success'"
                  [class.error-card]="log.status === 'error'"
                  [class.pending-card]="log.status === 'pending'"
                  [class.aborted-card]="log.status === 'aborted'">
          
          <ion-item button detail="false" (click)="toggleExpand(log.id)" class="log-header">
            <ion-icon 
              [name]="getStatusIcon(log.status)" 
              [color]="getStatusColor(log.status)"
              slot="start"
              class="status-icon">
            </ion-icon>
            
            <ion-label>
              <h2>
                <ion-text color="light">{{ formatTime(log.timestamp) }}</ion-text>
                <ion-badge color="primary" class="model-badge">{{ log.model }}</ion-badge>
              </h2>
              <p>
                <ion-note>{{ log.endpoint }}</ion-note>
              </p>
              <p>
                <ion-chip color="medium" class="meta-chip">
                  <ion-icon name="document-text-outline"></ion-icon>
                  <ion-label>{{ log.wordCount }} Wörter</ion-label>
                </ion-chip>
                <ion-chip color="medium" class="meta-chip">
                  <ion-icon name="code-slash-outline"></ion-icon>
                  <ion-label>{{ log.maxTokens }} Tokens</ion-label>
                </ion-chip>
                <ion-chip color="medium" class="meta-chip" *ngIf="log.duration">
                  <ion-icon name="time-outline"></ion-icon>
                  <ion-label>{{ log.duration }}ms</ion-label>
                </ion-chip>
              </p>
            </ion-label>
            
            <ion-icon 
              [name]="expandedLogs.has(log.id) ? 'chevron-down' : 'chevron-forward'"
              slot="end">
            </ion-icon>
          </ion-item>
          
          <ion-card-content *ngIf="expandedLogs.has(log.id)" class="log-details">
            <div class="detail-section">
              <ion-text color="medium">
                <h3>Prompt:</h3>
              </ion-text>
              <pre class="content-pre prompt-content">{{ log.prompt }}</pre>
            </div>
            
            <div class="detail-section" *ngIf="log.response">
              <ion-text color="medium">
                <h3>Response:</h3>
              </ion-text>
              <pre class="content-pre response-content">{{ log.response }}</pre>
            </div>
            
            <div class="detail-section" *ngIf="log.error">
              <ion-text color="danger">
                <h3>Error:</h3>
              </ion-text>
              <pre class="content-pre error-content">{{ log.error }}</pre>
            </div>
          </ion-card-content>
        </ion-card>
        
        <ion-card *ngIf="logs.length === 0" class="no-logs-card">
          <ion-card-content class="ion-text-center">
            <ion-text color="medium">
              <p>Noch keine AI-Requests geloggt.</p>
            </ion-text>
          </ion-card-content>
        </ion-card>
      </ion-list>
      </ion-content>
    </div>
  `,
  styles: [`
    .ion-page {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background-color: #1a1a1a;
    }

    ion-content {
      --background: #1a1a1a;
      flex: 1;
    }

    .logs-list {
      background: transparent;
      padding: 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    ion-card {
      --background: var(--ion-color-dark-shade);
      border: 1px solid var(--ion-color-dark-tint);
      margin-bottom: 1rem;
    }

    ion-card.success-card {
      border-left: 4px solid var(--ion-color-success);
    }

    ion-card.error-card {
      border-left: 4px solid var(--ion-color-danger);
    }

    ion-card.pending-card {
      border-left: 4px solid var(--ion-color-warning);
    }

    ion-card.aborted-card {
      border-left: 4px solid var(--ion-color-warning-shade);
    }

    .log-header {
      --background: transparent;
      --background-hover: var(--ion-color-dark-tint);
      --padding-start: 16px;
      --padding-end: 16px;
      --inner-padding-end: 0;
    }

    .status-icon {
      font-size: 1.5rem;
      margin-right: 0.5rem;
    }

    .model-badge {
      margin-left: 0.5rem;
      font-size: 0.85rem;
    }

    .meta-chip {
      margin-right: 0.5rem;
      --background: transparent;
      --color: var(--ion-color-medium);
      font-size: 0.8rem;
      height: 24px;
    }

    .meta-chip ion-icon {
      font-size: 0.9rem;
      margin-right: 0.25rem;
    }

    .log-details {
      padding: 0 1rem 1rem 1rem;
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
      font-weight: 600;
    }

    .content-pre {
      background: var(--ion-color-dark);
      border: 1px solid var(--ion-color-dark-tint);
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
      color: var(--ion-color-light);
    }

    .error-content {
      border-color: var(--ion-color-danger);
      color: var(--ion-color-danger-tint);
    }

    .no-logs-card {
      margin-top: 2rem;
    }

    .no-logs-card ion-card-content {
      padding: 4rem 2rem;
    }

    /* Scrollbar styling */
    .content-pre::-webkit-scrollbar {
      width: 8px;
    }

    .content-pre::-webkit-scrollbar-track {
      background: var(--ion-color-dark-shade);
      border-radius: 4px;
    }

    .content-pre::-webkit-scrollbar-thumb {
      background: var(--ion-color-medium);
      border-radius: 4px;
    }

    .content-pre::-webkit-scrollbar-thumb:hover {
      background: var(--ion-color-medium-shade);
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .logs-list {
        padding: 0.5rem;
      }
      
      .meta-chip {
        font-size: 0.7rem;
      }
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
  ) {
    addIcons({ 
      arrowBack, trash, chevronForward, chevronDown, checkmarkCircle,
      closeCircle, timeOutline, pauseCircle, documentTextOutline,
      codeSlashOutline, warningOutline
    });
  }

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

  getStatusIcon(status: string): string {
    switch (status) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'pending': return 'time-outline';
      case 'aborted': return 'pause-circle';
      default: return 'help-circle';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'danger';
      case 'pending': return 'warning';
      case 'aborted': return 'warning';
      default: return 'medium';
    }
  }
}