import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonBadge, IonChip, IonCard,
  IonCardContent, IonText, IonNote, IonAccordion, IonAccordionGroup
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack, trash, chevronForward, chevronDown, checkmarkCircle,
  closeCircle, timeOutline, pauseCircle, documentTextOutline,
  codeSlashOutline, warningOutline, informationCircleOutline,
  settingsOutline, cloudOutline, bugOutline, speedometerOutline,
  playCircleOutline, radioOutline, globeOutline, cogOutline,
  checkmarkCircleOutline, refreshOutline
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
    IonCardContent, IonText, IonAccordion, IonAccordionGroup
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
                <ion-text>{{ formatTime(log.timestamp) }}</ion-text>
                <ion-badge color="primary" class="model-badge">{{ log.model }}</ion-badge>
                <ion-badge *ngIf="log.apiProvider" [color]="getProviderColor(log.apiProvider)" class="provider-badge">
                  {{ log.apiProvider }}
                </ion-badge>
                <ion-badge *ngIf="log.streamingMode" color="secondary" class="streaming-badge">
                  <ion-icon name="radio-outline"></ion-icon>
                  Streaming
                </ion-badge>
              </h2>
              <p>
                <ion-text color="medium">{{ log.endpoint }}</ion-text>
                <ion-badge *ngIf="log.httpStatus" [color]="getHttpStatusColor(log.httpStatus)" class="status-badge">
                  {{ log.httpStatus }}
                </ion-badge>
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
                <ion-chip *ngIf="log.retryCount && log.retryCount > 0" color="warning" class="meta-chip">
                  <ion-icon name="refresh-outline"></ion-icon>
                  <ion-label>{{ log.retryCount }} Retry{{ log.retryCount > 1 ? 's' : '' }}</ion-label>
                </ion-chip>
                <ion-chip *ngIf="log.networkInfo?.effectiveType && log.networkInfo?.effectiveType !== 'unknown'" color="tertiary" class="meta-chip">
                  <ion-icon name="globe-outline"></ion-icon>
                  <ion-label>{{ log.networkInfo?.effectiveType }}</ion-label>
                </ion-chip>
              </p>
            </ion-label>
            
            <ion-icon 
              [name]="expandedLogs.has(log.id) ? 'chevron-down' : 'chevron-forward'"
              slot="end">
            </ion-icon>
          </ion-item>
          
          <ion-card-content *ngIf="expandedLogs.has(log.id)" class="log-details">
            <!-- Main Content Section -->
            <ion-accordion-group>
              <!-- Prompt -->
              <ion-accordion value="prompt">
                <ion-item slot="header" color="light">
                  <ion-icon name="document-text-outline" slot="start"></ion-icon>
                  <ion-label>
                    <h3>Prompt</h3>
                    <p>{{ log.prompt.length }} Zeichen</p>
                  </ion-label>
                </ion-item>
                <div class="accordion-content" slot="content">
                  <pre class="content-pre prompt-content">{{ log.prompt }}</pre>
                </div>
              </ion-accordion>
              
              <!-- Response -->
              <ion-accordion value="response" *ngIf="log.response">
                <ion-item slot="header" color="light">
                  <ion-icon name="checkmark-circle-outline" slot="start" color="success"></ion-icon>
                  <ion-label>
                    <h3>Response</h3>
                    <p>{{ log.response.length }} Zeichen, {{ getWordCount(log.response) }} Wörter</p>
                  </ion-label>
                </ion-item>
                <div class="accordion-content" slot="content">
                  <pre class="content-pre response-content">{{ log.response }}</pre>
                </div>
              </ion-accordion>
              
              <!-- Error -->
              <ion-accordion value="error" *ngIf="log.error">
                <ion-item slot="header" color="light">
                  <ion-icon name="warning-outline" slot="start" color="danger"></ion-icon>
                  <ion-label>
                    <h3>Error Details</h3>
                    <p>{{ log.error.length }} Zeichen</p>
                  </ion-label>
                </ion-item>
                <div class="accordion-content" slot="content">
                  <pre class="content-pre error-content">{{ log.error }}</pre>
                  
                  <!-- Additional Error Details -->
                  <div *ngIf="log.errorDetails" class="debug-info-section">
                    <h4><ion-icon name="bug-outline"></ion-icon> Error Analysis</h4>
                    <pre class="debug-info">{{ formatJson(log.errorDetails) }}</pre>
                  </div>
                </div>
              </ion-accordion>
              
              <!-- Request Details -->
              <ion-accordion value="request-details" *ngIf="log.requestDetails">
                <ion-item slot="header" color="light">
                  <ion-icon name="settings-outline" slot="start" color="primary"></ion-icon>
                  <ion-label>
                    <h3>Request Configuration</h3>
                    <p>API parameters and settings</p>
                  </ion-label>
                </ion-item>
                <div class="accordion-content" slot="content">
                  <div class="debug-info-section">
                    <h4><ion-icon name="cog-outline"></ion-icon> API Configuration</h4>
                    <div class="config-grid">
                      <div class="config-item" *ngIf="log.requestDetails.temperature !== undefined">
                        <ion-label>Temperature:</ion-label>
                        <ion-badge color="tertiary">{{ log.requestDetails.temperature }}</ion-badge>
                      </div>
                      <div class="config-item" *ngIf="log.requestDetails.topP !== undefined">
                        <ion-label>Top P:</ion-label>
                        <ion-badge color="tertiary">{{ log.requestDetails.topP }}</ion-badge>
                      </div>
                      <div class="config-item" *ngIf="log.requestDetails.contentsLength">
                        <ion-label>Contents Length:</ion-label>
                        <ion-badge color="medium">{{ log.requestDetails.contentsLength }}</ion-badge>
                      </div>
                      <div class="config-item" *ngIf="log.requestDetails.safetySettings">
                        <ion-label>Safety Settings:</ion-label>
                        <ion-badge color="medium">{{ log.requestDetails.safetySettings }}</ion-badge>
                      </div>
                      <div class="config-item" *ngIf="log.requestDetails.messagesFormat">
                        <ion-label>Message Format:</ion-label>
                        <ion-badge color="secondary">{{ log.requestDetails.messagesFormat }}</ion-badge>
                      </div>
                      <div class="config-item" *ngIf="log.requestDetails.streamingUrl">
                        <ion-label>Streaming URL:</ion-label>
                        <ion-text class="url-text">{{ log.requestDetails.streamingUrl }}</ion-text>
                      </div>
                    </div>
                    
                    <!-- Full Debug Info -->
                    <div *ngIf="log.requestDetails.debugInfo" class="debug-subsection">
                      <h5><ion-icon name="bug-outline"></ion-icon> Debug Information</h5>
                      <pre class="debug-info">{{ formatJson(log.requestDetails.debugInfo) }}</pre>
                    </div>
                  </div>
                </div>
              </ion-accordion>
              
              <!-- Network Information -->
              <ion-accordion value="network-info" *ngIf="hasNetworkInfo(log)">
                <ion-item slot="header" color="light">
                  <ion-icon name="globe-outline" slot="start" color="success"></ion-icon>
                  <ion-label>
                    <h3>Network Information</h3>
                    <p>Connection and performance data</p>
                  </ion-label>
                </ion-item>
                <div class="accordion-content" slot="content">
                  <div class="debug-info-section">
                    <h4><ion-icon name="speedometer-outline"></ion-icon> Connection Details</h4>
                    <div class="config-grid">
                      <div class="config-item" *ngIf="log.networkInfo?.connectionType">
                        <ion-label>Connection Type:</ion-label>
                        <ion-badge color="success">{{ log.networkInfo?.connectionType }}</ion-badge>
                      </div>
                      <div class="config-item" *ngIf="log.networkInfo?.effectiveType">
                        <ion-label>Effective Type:</ion-label>
                        <ion-badge color="success">{{ log.networkInfo?.effectiveType }}</ion-badge>
                      </div>
                      <div class="config-item" *ngIf="log.networkInfo?.downlink">
                        <ion-label>Downlink:</ion-label>
                        <ion-badge color="tertiary">{{ log.networkInfo?.downlink }} Mbps</ion-badge>
                      </div>
                      <div class="config-item" *ngIf="log.networkInfo?.rtt">
                        <ion-label>RTT:</ion-label>
                        <ion-badge color="tertiary">{{ log.networkInfo?.rtt }}ms</ion-badge>
                      </div>
                    </div>
                  </div>
                </div>
              </ion-accordion>
              
              <!-- Response Headers -->
              <ion-accordion value="response-headers" *ngIf="log.responseHeaders">
                <ion-item slot="header" color="light">
                  <ion-icon name="cloud-outline" slot="start" color="tertiary"></ion-icon>
                  <ion-label>
                    <h3>Response Headers</h3>
                    <p>HTTP response metadata</p>
                  </ion-label>
                </ion-item>
                <div class="accordion-content" slot="content">
                  <div class="debug-info-section">
                    <h4><ion-icon name="information-circle-outline"></ion-icon> HTTP Headers</h4>
                    <pre class="debug-info">{{ formatJson(log.responseHeaders) }}</pre>
                  </div>
                </div>
              </ion-accordion>
              
              <!-- Technical Details -->
              <ion-accordion value="technical" *ngIf="hasTechnicalDetails(log)">
                <ion-item slot="header" color="light">
                  <ion-icon name="bug-outline" slot="start" color="warning"></ion-icon>
                  <ion-label>
                    <h3>Technical Details</h3>
                    <p>Request ID, timestamps, and internal data</p>
                  </ion-label>
                </ion-item>
                <div class="accordion-content" slot="content">
                  <div class="debug-info-section">
                    <h4><ion-icon name="information-circle-outline"></ion-icon> Request Metadata</h4>
                    <div class="config-grid">
                      <div class="config-item">
                        <ion-label>Request ID:</ion-label>
                        <ion-text class="monospace-text">{{ log.id }}</ion-text>
                      </div>
                      <div class="config-item">
                        <ion-label>Timestamp:</ion-label>
                        <ion-text class="monospace-text">{{ log.timestamp.toISOString() }}</ion-text>
                      </div>
                      <div class="config-item" *ngIf="log.requestDetails?.requestId">
                        <ion-label>Internal Request ID:</ion-label>
                        <ion-text class="monospace-text">{{ log.requestDetails!.requestId }}</ion-text>
                      </div>
                      <div class="config-item" *ngIf="log.httpStatus">
                        <ion-label>HTTP Status:</ion-label>
                        <ion-badge [color]="getHttpStatusColor(log.httpStatus)">{{ log.httpStatus }}</ion-badge>
                      </div>
                    </div>
                  </div>
                </div>
              </ion-accordion>
            </ion-accordion-group>
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
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      min-height: 100vh;
      
      background: 
        /* Dark overlay for text readability */
        linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)),
        /* Main anime image */
        url('/assets/cyberpunk-anime-girl.png'),
        /* Fallback dark background */
        #1a1a1a;
      
      background-size: cover, cover, auto;
      background-position: center, center, center;
      background-repeat: no-repeat, no-repeat, repeat;
      background-attachment: fixed, fixed, scroll;
    }
    
    .ion-page {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: transparent;
    }
    
    ion-header {
      backdrop-filter: blur(15px);
      background: rgba(45, 45, 45, 0.85);
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
      position: relative;
      z-index: 100;
    }
    
    ion-toolbar {
      --background: transparent;
      --color: #f8f9fa;
    }
    
    ion-title {
      background: linear-gradient(135deg, #f8f9fa 0%, #8bb4f8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    
    ion-content {
      --background: transparent !important;
      background: transparent !important;
      --padding-start: 0;
      --padding-end: 0;
      --padding-top: 0;
      --padding-bottom: 0;
      flex: 1;
    }
    
    ion-content::part(background) {
      background: transparent !important;
    }
    
    ion-content::part(scroll) {
      background: transparent !important;
    }

    .logs-list {
      background: transparent;
      padding: 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    ion-card {
      background: linear-gradient(135deg, rgba(20, 20, 20, 0.3) 0%, rgba(15, 15, 15, 0.3) 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(8px) saturate(120%);
      -webkit-backdrop-filter: blur(8px) saturate(120%);
      margin-bottom: 1rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
    }
    
    ion-card:hover {
      background: linear-gradient(135deg, rgba(25, 25, 25, 0.4) 0%, rgba(20, 20, 20, 0.4) 100%);
      border-color: rgba(71, 118, 230, 0.3);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      transform: translateY(-2px);
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
      --background-hover: rgba(255, 255, 255, 0.1);
      --color: #f8f9fa;
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

    .provider-badge,
    .streaming-badge,
    .status-badge {
      margin-left: 0.5rem;
      font-size: 0.75rem;
      height: 20px;
    }

    .streaming-badge ion-icon {
      font-size: 0.8rem;
      margin-right: 0.25rem;
    }

    .meta-chip {
      margin-right: 0.5rem;
      --background: rgba(71, 118, 230, 0.15);
      --color: #8bb4f8;
      border: 1px solid rgba(71, 118, 230, 0.3);
      font-size: 0.8rem;
      height: 24px;
      border-radius: 12px;
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
      background: rgba(30, 30, 30, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 1rem;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
      margin: 0;
      max-height: 400px;
      overflow-y: auto;
      color: #e0e0e0;
      backdrop-filter: blur(4px);
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
      background: var(--ion-color-step-100);
      border-radius: 4px;
    }

    .content-pre::-webkit-scrollbar-thumb {
      background: var(--ion-color-medium);
      border-radius: 4px;
    }

    .content-pre::-webkit-scrollbar-thumb:hover {
      background: var(--ion-color-medium-tint);
    }

    /* New styles for enhanced debugging */
    .accordion-content {
      padding: 1rem;
    }

    .debug-info-section {
      margin-bottom: 1.5rem;
    }

    .debug-info-section:last-child {
      margin-bottom: 0;
    }

    .debug-info-section h4 {
      display: flex;
      align-items: center;
      margin: 0 0 1rem 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--ion-color-primary);
    }

    .debug-info-section h4 ion-icon {
      margin-right: 0.5rem;
      font-size: 1.1rem;
    }

    .debug-info-section h5 {
      display: flex;
      align-items: center;
      margin: 1rem 0 0.5rem 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--ion-color-medium);
    }

    .debug-info-section h5 ion-icon {
      margin-right: 0.5rem;
      font-size: 1rem;
    }

    .debug-subsection {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--ion-color-step-200);
    }

    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .config-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: rgba(42, 42, 42, 0.3);
      backdrop-filter: blur(4px);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .config-item ion-label {
      font-weight: 500;
      color: #f8f9fa;
    }

    .debug-info {
      background: var(--ion-background-color);
      border: 1px solid var(--ion-color-step-200);
      border-radius: 6px;
      padding: 1rem;
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      line-height: 1.4;
      white-space: pre-wrap;
      word-wrap: break-word;
      margin: 0;
      max-height: 300px;
      overflow-y: auto;
      color: var(--ion-text-color);
    }

    .url-text,
    .monospace-text {
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      color: var(--ion-color-medium-tint);
      word-break: break-all;
    }

    /* Ion Accordion custom styling */
    ion-accordion-group {
      border-radius: 8px;
      overflow: hidden;
    }

    ion-accordion ion-item {
      --background: var(--ion-color-light);
      --color: var(--ion-text-color);
      font-weight: 500;
    }

    ion-accordion[slot="content"] {
      --background: transparent;
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .logs-list {
        padding: 0.5rem;
      }
      
      .meta-chip {
        font-size: 0.7rem;
      }

      .config-grid {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .config-item {
        padding: 0.5rem;
      }

      .accordion-content {
        padding: 0.5rem;
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
      codeSlashOutline, warningOutline, informationCircleOutline,
      settingsOutline, cloudOutline, bugOutline, speedometerOutline,
      playCircleOutline, radioOutline, globeOutline, cogOutline,
      checkmarkCircleOutline, refreshOutline
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

  getProviderColor(provider: string): string {
    switch (provider) {
      case 'gemini': return 'tertiary';
      case 'openrouter': return 'secondary';
      case 'replicate': return 'primary';
      default: return 'medium';
    }
  }

  getHttpStatusColor(status: number): string {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'warning';
    if (status >= 500) return 'danger';
    return 'medium';
  }

  getWordCount(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  formatJson(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return String(obj);
    }
  }

  hasNetworkInfo(log: AIRequestLog): boolean {
    return !!(log.networkInfo && (
      log.networkInfo.connectionType !== 'unknown' ||
      log.networkInfo.effectiveType !== 'unknown' ||
      (log.networkInfo.downlink && log.networkInfo.downlink > 0) ||
      (log.networkInfo.rtt && log.networkInfo.rtt > 0)
    ));
  }

  hasTechnicalDetails(log: AIRequestLog): boolean {
    return !!(log.id || log.timestamp || log.requestDetails?.requestId || log.httpStatus);
  }
}