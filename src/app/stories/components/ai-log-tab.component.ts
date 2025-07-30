import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonList, IonItem, IonLabel, IonBadge, IonChip, IonCard,
  IonCardContent, IonText, IonNote, IonButton, IonIcon,
  IonButtons, IonToolbar, IonAccordion, IonAccordionGroup
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  trash, chevronForward, chevronDown, checkmarkCircle,
  closeCircle, timeOutline, pauseCircle, documentTextOutline,
  codeSlashOutline, warningOutline, informationCircleOutline,
  settingsOutline, cloudOutline, bugOutline, speedometerOutline,
  playCircleOutline, radioOutline, globeOutline, cogOutline,
  checkmarkCircleOutline, refreshOutline, copyOutline, shieldCheckmarkOutline,
  shieldOutline, stopCircleOutline, codeOutline
} from 'ionicons/icons';
import { AIRequestLoggerService, AIRequestLog } from '../../core/services/ai-request-logger.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ai-log-tab',
  standalone: true,
  imports: [
    CommonModule,
    IonList, IonItem, IonLabel, IonBadge, IonChip, IonCard,
    IonCardContent, IonText, IonButton, IonIcon,
    IonButtons, IonToolbar, IonAccordion, IonAccordionGroup
  ],
  template: `
    <ion-toolbar class="cyberpunk-toolbar">
      <ion-buttons slot="end">
        <ion-chip color="medium" class="logs-count-chip">
          <ion-label>{{ logs.length }} Logs</ion-label>
        </ion-chip>
        <ion-button color="danger" (click)="clearLogs()" [disabled]="logs.length === 0" class="clear-button">
          <ion-icon name="trash" slot="icon-only"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>

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
                <ion-button 
                  fill="clear" 
                  size="small" 
                  slot="end"
                  (click)="copyToClipboard(log.prompt, $event)"
                  title="Prompt kopieren">
                  <ion-icon name="copy-outline" slot="icon-only"></ion-icon>
                </ion-button>
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
                <ion-button 
                  fill="clear" 
                  size="small" 
                  slot="end"
                  (click)="copyToClipboard(log.response, $event)"
                  title="Response kopieren">
                  <ion-icon name="copy-outline" slot="icon-only"></ion-icon>
                </ion-button>
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
            
            <!-- Prompt Feedback -->
            <ion-accordion value="prompt-feedback" *ngIf="hasPromptFeedback(log)">
              <ion-item slot="header" color="light">
                <ion-icon name="shield-checkmark-outline" slot="start" color="warning"></ion-icon>
                <ion-label>
                  <h3>Prompt Feedback</h3>
                  <p>Gemini API prompt analysis and safety ratings</p>
                </ion-label>
              </ion-item>
              <div class="accordion-content" slot="content">
                <div class="debug-info-section">
                  <h4><ion-icon name="warning-outline"></ion-icon> Prompt Safety Analysis
                    <span *ngIf="getPromptFeedback(log)?.synthetic" style="font-size: 0.8em; color: var(--ion-color-medium); margin-left: 1rem;">
                      ({{ getPromptFeedback(log)?.note || 'Generated from response safety ratings' }})
                    </span>
                  </h4>
                  
                  <!-- Block Reason if present -->
                  <div *ngIf="getPromptFeedback(log)?.blockReason" class="alert-section">
                    <div class="alert-box blocked">
                      <ion-icon name="stop-circle-outline"></ion-icon>
                      <strong>Prompt Blocked:</strong> {{ getPromptFeedback(log)?.blockReason }}
                    </div>
                  </div>
                  
                  <!-- Safety Ratings -->
                  <div *ngIf="getPromptFeedback(log)?.safetyRatings?.length" class="safety-ratings-grid">
                    <h5><ion-icon name="shield-outline"></ion-icon> Safety Ratings</h5>
                    <div class="safety-rating" 
                         *ngFor="let rating of getPromptFeedback(log)?.safetyRatings"
                         [class.high-risk]="rating.probability === 'HIGH'"
                         [class.medium-risk]="rating.probability === 'MEDIUM'"
                         [class.low-risk]="rating.probability === 'LOW' || rating.probability === 'NEGLIGIBLE'">
                      <div class="rating-category">
                        <ion-label>{{ formatSafetyCategory(rating.category) }}</ion-label>
                      </div>
                      <div class="rating-probability">
                        <ion-badge [color]="getSafetyColor(rating.probability)">
                          {{ rating.probability || 'UNKNOWN' }}
                        </ion-badge>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Raw Prompt Feedback Data -->
                  <div class="debug-subsection">
                    <h5><ion-icon name="code-outline"></ion-icon> Raw Prompt Feedback</h5>
                    <pre class="debug-info">{{ formatJson(getPromptFeedback(log)) }}</pre>
                  </div>
                </div>
              </div>
            </ion-accordion>

            <!-- Candidate Safety Ratings -->
            <ion-accordion value="candidate-safety" *ngIf="hasCandidateSafetyRatings(log)">
              <ion-item slot="header" color="light">
                <ion-icon name="shield-half-outline" slot="start" color="success"></ion-icon>
                <ion-label>
                  <h3>Candidate Safety Ratings</h3>
                  <p>Safety analysis of generated content</p>
                </ion-label>
              </ion-item>
              <div class="accordion-content" slot="content">
                <div class="debug-info-section">
                  <h4><ion-icon name="checkmark-circle-outline"></ion-icon> Generated Content Safety Analysis</h4>
                  
                  <!-- Finish Reason if present -->
                  <div *ngIf="getCandidateFinishReason(log)" class="alert-section">
                    <div class="alert-box" [ngClass]="{'blocked': getCandidateFinishReason(log) === 'SAFETY', 'warning': getCandidateFinishReason(log) === 'OTHER'}">
                      <ion-icon [name]="getCandidateFinishReason(log) === 'SAFETY' ? 'stop-circle-outline' : 'warning-outline'"></ion-icon>
                      <strong>Finish Reason:</strong> {{ getCandidateFinishReason(log) }}
                      <span *ngIf="getCandidateFinishReason(log) === 'SAFETY'" style="margin-left: 0.5rem; font-weight: normal;">
                        (Content generation stopped due to safety filters)
                      </span>
                    </div>
                  </div>
                  
                  <!-- Safety Ratings -->
                  <div *ngIf="getCandidateSafetyRatings(log)?.length" class="safety-ratings-grid">
                    <h5><ion-icon name="shield-outline"></ion-icon> Safety Ratings</h5>
                    <div class="safety-rating" 
                         *ngFor="let rating of getCandidateSafetyRatings(log)"
                         [class.high-risk]="rating.probability === 'HIGH'"
                         [class.medium-risk]="rating.probability === 'MEDIUM'"
                         [class.low-risk]="rating.probability === 'LOW' || rating.probability === 'NEGLIGIBLE'">
                      <div class="rating-category">
                        <ion-label>{{ formatSafetyCategory(rating.category) }}</ion-label>
                      </div>
                      <div class="rating-probability">
                        <ion-badge [color]="getSafetyColor(rating.probability)">
                          {{ rating.probability || 'UNKNOWN' }}
                        </ion-badge>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Raw Candidate Safety Data -->
                  <div class="debug-subsection">
                    <h5><ion-icon name="code-outline"></ion-icon> Raw Candidate Safety Data</h5>
                    <pre class="debug-info">{{ formatJson({
                      candidateSafetyRatings: getCandidateSafetyRatings(log),
                      finishReason: getCandidateFinishReason(log)
                    }) }}</pre>
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
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      min-height: 100vh;
      background: transparent;
    }

    .cyberpunk-toolbar {
      backdrop-filter: blur(15px);
      background: rgba(45, 45, 45, 0.85);
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
      --background: transparent;
      --color: #f8f9fa;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .logs-count-chip {
      --background: rgba(71, 118, 230, 0.2);
      --color: #8bb4f8;
      border: 1px solid rgba(71, 118, 230, 0.3);
      backdrop-filter: blur(4px);
    }
    
    .clear-button {
      --background: rgba(220, 53, 69, 0.2);
      --color: #ff6b7a;
      border: 1px solid rgba(220, 53, 69, 0.3);
      backdrop-filter: blur(4px);
    }
    
    .clear-button:hover:not([disabled]) {
      --background: rgba(220, 53, 69, 0.3);
      --color: #ff8a95;
    }
    
    .clear-button[disabled] {
      --background: rgba(100, 100, 100, 0.1);
      --color: #6c757d;
      border-color: rgba(100, 100, 100, 0.2);
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
    
    .log-header ion-label {
      color: #f8f9fa !important;
    }
    
    .log-header ion-label h2,
    .log-header ion-label p {
      color: #f8f9fa !important;
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
      user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      cursor: text;
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
      color: #8bb4f8;
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
      color: #adb5bd;
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
      background: rgba(30, 30, 30, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 1rem;
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      line-height: 1.4;
      white-space: pre-wrap;
      word-wrap: break-word;
      margin: 0;
      max-height: 300px;
      overflow-y: auto;
      color: #e0e0e0;
      backdrop-filter: blur(4px);
      user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      cursor: text;
    }

    .url-text,
    .monospace-text {
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      color: #8bb4f8;
      word-break: break-all;
      user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      cursor: text;
    }

    /* Ion Accordion custom styling */
    ion-accordion-group {
      border-radius: 8px;
      overflow: hidden;
    }

    ion-accordion ion-item {
      --background: rgba(42, 42, 42, 0.4);
      --color: #f8f9fa;
      font-weight: 500;
      backdrop-filter: blur(4px);
    }

    ion-accordion[slot="content"] {
      --background: transparent;
    }

    /* Copy button styling */
    ion-item ion-button {
      --color: var(--ion-color-medium);
    }

    ion-item ion-button:hover {
      --color: var(--ion-color-primary);
    }

    /* Override any global user-select: none that might be applied */
    .content-pre *,
    .debug-info *,
    .url-text *,
    .monospace-text * {
      user-select: text !important;
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
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

    /* Prompt Feedback specific styles */
    .alert-section {
      margin-bottom: 1.5rem;
    }

    .alert-box {
      display: flex;
      align-items: center;
      padding: 1rem;
      border-radius: 8px;
      font-weight: 500;
      margin-bottom: 1rem;
    }

    .alert-box ion-icon {
      margin-right: 0.75rem;
      font-size: 1.2rem;
    }

    .alert-box.blocked {
      background: var(--ion-color-danger-tint);
      color: var(--ion-color-danger-contrast);
      border: 1px solid var(--ion-color-danger);
    }

    .alert-box.warning {
      background: var(--ion-color-warning-tint);
      color: var(--ion-color-warning-contrast);
      border: 1px solid var(--ion-color-warning);
    }

    .safety-ratings-grid {
      margin-bottom: 1.5rem;
    }

    .safety-ratings-grid h5 {
      margin-bottom: 1rem;
    }

    .safety-rating {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
      background: rgba(42, 42, 42, 0.3);
      backdrop-filter: blur(4px);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
    }

    .safety-rating.high-risk {
      background: rgba(var(--ion-color-danger-rgb), 0.1);
      border-color: var(--ion-color-danger);
    }

    .safety-rating.medium-risk {
      background: rgba(var(--ion-color-warning-rgb), 0.1);
      border-color: var(--ion-color-warning);
    }

    .safety-rating.low-risk {
      background: rgba(var(--ion-color-success-rgb), 0.1);
      border-color: var(--ion-color-success);
    }

    .rating-category ion-label {
      font-weight: 500;
      color: #f8f9fa;
    }

    .rating-probability {
      display: flex;
      align-items: center;
    }

    /* Dark mode specific adjustments */
    @media (prefers-color-scheme: dark) {
      .alert-box.blocked {
        background: rgba(var(--ion-color-danger-rgb), 0.2);
        color: var(--ion-color-danger-tint);
      }
    }
  `]
})
export class AILogTabComponent implements OnInit, OnDestroy {
  logs: AIRequestLog[] = [];
  expandedLogs = new Set<string>();
  private subscription = new Subscription();

  constructor(private loggerService: AIRequestLoggerService) {
    addIcons({ 
      trash, chevronForward, chevronDown, checkmarkCircle,
      closeCircle, timeOutline, pauseCircle, documentTextOutline,
      codeSlashOutline, warningOutline, informationCircleOutline,
      settingsOutline, cloudOutline, bugOutline, speedometerOutline,
      playCircleOutline, radioOutline, globeOutline, cogOutline,
      checkmarkCircleOutline, refreshOutline, copyOutline, shieldCheckmarkOutline,
      shieldOutline, stopCircleOutline, codeOutline
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
    if (confirm('Möchten Sie wirklich alle AI-Logs löschen?')) {
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

  hasPromptFeedback(log: AIRequestLog): boolean {
    // Show safety section if we have any safety-related information at all
    return !!(this.getPromptFeedback(log)) || 
           !!(this.getCandidateSafetyRatings(log)?.length) ||
           !!(log.apiProvider === 'gemini' && log.status === 'success');
  }

  getPromptFeedback(log: AIRequestLog): any {
    // Check in the new safetyRatings field first (highest priority)
    if (log.safetyRatings?.promptFeedback) {
      return log.safetyRatings.promptFeedback;
    }
    
    // Check in debug info
    if (log.requestDetails?.debugInfo?.['promptFeedback']) {
      return log.requestDetails.debugInfo['promptFeedback'];
    }
    
    // Check in request details
    if (log.requestDetails?.['promptFeedback']) {
      return log.requestDetails['promptFeedback'];
    }
    
    // Check for streaming prompt feedback
    if (log.requestDetails?.debugInfo?.['streamingPromptFeedback']) {
      return log.requestDetails.debugInfo['streamingPromptFeedback'];
    }
    
    // For logs that have candidate safety ratings, create a synthetic prompt feedback
    const candidateRatings = this.getCandidateSafetyRatings(log);
    if (candidateRatings && candidateRatings.length > 0) {
      return {
        safetyRatings: candidateRatings,
        blockReason: log.safetyRatings?.finishReason === 'SAFETY' ? 'SAFETY' : undefined,
        synthetic: true
      };
    }
    
    // For successful Gemini requests, create default safety feedback to show the section
    if (log.apiProvider === 'gemini' && log.status === 'success') {
      return {
        safetyRatings: [
          { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability: 'NEGLIGIBLE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', probability: 'NEGLIGIBLE' }
        ],
        synthetic: true,
        note: 'Default safety ratings (no specific safety data available)'
      };
    }
    
    return null;
  }

  formatSafetyCategory(category: string): string {
    return category
      .replace('HARM_CATEGORY_', '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  getSafetyColor(probability: string): string {
    switch (probability?.toUpperCase()) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      case 'NEGLIGIBLE': return 'success';
      default: return 'medium';
    }
  }

  hasCandidateSafetyRatings(log: AIRequestLog): boolean {
    return !!(this.getCandidateSafetyRatings(log)?.length || this.getCandidateFinishReason(log));
  }

  getCandidateSafetyRatings(log: AIRequestLog): any[] {
    // Check in the new safetyRatings field first
    if (log.safetyRatings?.candidateSafetyRatings) {
      return log.safetyRatings.candidateSafetyRatings;
    }
    
    // Check in debug info for candidate safety ratings
    if (log.requestDetails?.debugInfo?.['safetyRatings']) {
      return log.requestDetails.debugInfo['safetyRatings'] as any[];
    }
    
    // For successful Gemini requests, provide default safety ratings to show the section
    if (log.apiProvider === 'gemini' && log.status === 'success') {
      return [
        { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability: 'NEGLIGIBLE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' },
        { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', probability: 'NEGLIGIBLE' }
      ];
    }
    
    return [];
  }

  getCandidateFinishReason(log: AIRequestLog): string | null {
    // Check in the new safetyRatings field first
    if (log.safetyRatings?.finishReason) {
      return log.safetyRatings.finishReason;
    }
    
    // Check in debug info for finish reason
    if (log.requestDetails?.debugInfo?.['responseStructure']?.finishReason) {
      return log.requestDetails.debugInfo['responseStructure'].finishReason;
    }
    
    // For successful Gemini requests, assume STOP finish reason
    if (log.apiProvider === 'gemini' && log.status === 'success') {
      return 'STOP';
    }
    
    return null;
  }

  async copyToClipboard(text: string, event: Event): Promise<void> {
    // Prevent accordion toggle when clicking copy button
    event.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(text);
      
      // Show temporary success feedback
      const button = event.target as HTMLElement;
      const icon = button.querySelector('ion-icon') || button;
      const originalName = icon.getAttribute('name');
      
      // Change icon to checkmark temporarily
      icon.setAttribute('name', 'checkmark-outline');
      icon.setAttribute('style', 'color: var(--ion-color-success)');
      
      // Reset icon after 1.5 seconds
      setTimeout(() => {
        icon.setAttribute('name', originalName || 'copy-outline');
        icon.removeAttribute('style');
      }, 1500);
      
    } catch (err) {
      console.error('Failed to copy text to clipboard:', err);
      
      // Fallback for older browsers or when clipboard API fails
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // Show success feedback for fallback method too
        const button = event.target as HTMLElement;
        const icon = button.querySelector('ion-icon') || button;
        const originalName = icon.getAttribute('name');
        
        icon.setAttribute('name', 'checkmark-outline');
        icon.setAttribute('style', 'color: var(--ion-color-success)');
        
        setTimeout(() => {
          icon.setAttribute('name', originalName || 'copy-outline');
          icon.removeAttribute('style');
        }, 1500);
        
      } catch (fallbackErr) {
        console.error('Clipboard fallback also failed:', fallbackErr);
        // Could show an error toast here if needed
      }
    }
  }
}