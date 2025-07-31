import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonList, IonItem, IonLabel, IonChip, IonCard,
  IonCardContent, IonText, IonButton, IonIcon,
  IonButtons, IonToolbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  trash, chevronForward, chevronDown, cloudUploadOutline,
  cloudDownloadOutline, warningOutline, informationCircleOutline,
  alertCircleOutline, timeOutline, personOutline, syncOutline
} from 'ionicons/icons';
import { SyncLoggerService, SyncLog } from '../../core/services/sync-logger.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sync-log-tab',
  standalone: true,
  imports: [
    CommonModule,
    IonList, IonItem, IonLabel, IonChip, IonCard,
    IonCardContent, IonText, IonButton, IonIcon,
    IonButtons, IonToolbar
  ],
  template: `
    <ion-toolbar >
      <ion-buttons slot="end">
        <ion-chip color="medium">
          <ion-label>{{ logs.length }} Logs</ion-label>
        </ion-chip>
        <ion-button color="danger" (click)="clearLogs()" [disabled]="logs.length === 0">
          <ion-icon name="trash" slot="icon-only"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>

    <ion-list class="logs-list">
      <ion-card *ngFor="let log of logs" 
                [class.success-card]="log.status === 'success'"
                [class.error-card]="log.status === 'error'"
                [class.warning-card]="log.status === 'warning'"
                [class.info-card]="log.status === 'info'">
        
        <ion-item button detail="false" (click)="toggleExpand(log.id)" class="log-header">
          <ion-icon 
            [name]="getTypeIcon(log.type)" 
            [color]="getStatusColor(log.status)"
            slot="start"
            class="status-icon">
          </ion-icon>
          
          <ion-label>
            <h2>
              <ion-text>{{ log.action }}</ion-text>
            </h2>
            <p>
              <ion-text color="medium">{{ formatTime(log.timestamp) }}</ion-text>
            </p>
            <p>
              <ion-chip color="medium" class="meta-chip" *ngIf="log.userId">
                <ion-icon name="person-outline"></ion-icon>
                <ion-label>{{ log.userId }}</ion-label>
              </ion-chip>
              <ion-chip color="medium" class="meta-chip" *ngIf="log.itemCount !== undefined">
                <ion-icon name="sync-outline"></ion-icon>
                <ion-label>{{ log.itemCount }} Elemente</ion-label>
              </ion-chip>
              <ion-chip color="medium" class="meta-chip" *ngIf="log.duration">
                <ion-icon name="time-outline"></ion-icon>
                <ion-label>{{ log.duration }}ms</ion-label>
              </ion-chip>
            </p>
          </ion-label>
          
          <ion-icon 
            [name]="expandedLogs.has(log.id) ? 'chevron-down' : 'chevron-forward'"
            slot="end"
            *ngIf="log.details">
          </ion-icon>
        </ion-item>
        
        <ion-card-content *ngIf="expandedLogs.has(log.id) && log.details" class="log-details">
          <div class="detail-section">
            <ion-text [color]="log.status === 'error' ? 'danger' : 'medium'">
              <h3>Details:</h3>
            </ion-text>
            <pre class="content-pre" [class.error-content]="log.status === 'error'">{{ log.details }}</pre>
          </div>
        </ion-card-content>
      </ion-card>
      
      <ion-card *ngIf="logs.length === 0" class="no-logs-card">
        <ion-card-content class="ion-text-center">
          <ion-text color="medium">
            <p>Noch keine Synchronisations-Logs vorhanden.</p>
          </ion-text>
        </ion-card-content>
      </ion-card>
    </ion-list>
  `,
  styles: [`
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

    ion-card.warning-card {
      border-left: 4px solid var(--ion-color-warning);
    }

    ion-card.info-card {
      border-left: 4px solid var(--ion-color-primary);
    }

    .log-header {
      --background: transparent;
      --background-hover: var(--ion-color-step-150);
      --color: var(--ion-text-color);
      --padding-start: 16px;
      --padding-end: 16px;
      --inner-padding-end: 0;
    }

    .status-icon {
      font-size: 1.5rem;
      margin-right: 0.5rem;
    }

    .meta-chip {
      margin-right: 0.5rem;
      --background: var(--ion-color-step-50);
      --color: var(--ion-text-color);
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

    .detail-section h3 {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .content-pre {
      background: var(--ion-background-color);
      border: 1px solid var(--ion-color-step-200);
      border-radius: 6px;
      padding: 1rem;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
      margin: 0;
      max-height: 300px;
      overflow-y: auto;
      color: var(--ion-text-color);
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
export class SyncLogTabComponent implements OnInit, OnDestroy {
  private syncLoggerService = inject(SyncLoggerService);

  logs: SyncLog[] = [];
  expandedLogs = new Set<string>();
  private subscription = new Subscription();

  constructor() {
    addIcons({ 
      trash, chevronForward, chevronDown, cloudUploadOutline,
      cloudDownloadOutline, warningOutline, informationCircleOutline,
      alertCircleOutline, timeOutline, personOutline, syncOutline
    });
  }

  ngOnInit(): void {
    this.subscription.add(
      this.syncLoggerService.logs$.subscribe(logs => {
        this.logs = logs;
      })
    );

    // Demo-Logs zum Testen (später entfernen)
    if (this.logs.length === 0) {
      this.addDemoLogs();
    }
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
    if (confirm('Möchten Sie wirklich alle Synchronisations-Logs löschen?')) {
      this.syncLoggerService.clearLogs();
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

  getTypeIcon(type: SyncLog['type']): string {
    switch (type) {
      case 'upload': return 'cloud-upload-outline';
      case 'download': return 'cloud-download-outline';
      case 'conflict': return 'warning-outline';
      case 'error': return 'alert-circle-outline';
      case 'info': return 'information-circle-outline';
      default: return 'sync-outline';
    }
  }

  getStatusColor(status: SyncLog['status']): string {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'primary';
      default: return 'medium';
    }
  }

  private addDemoLogs(): void {
    // Beispiel-Logs für Demonstrationszwecke
    this.syncLoggerService.logUpload(5, 'user123', 1234);
    this.syncLoggerService.logDownload(3, 'user123', 567);
    this.syncLoggerService.logConflict('Konflikt bei Story "Meine Geschichte": Lokale und Remote-Version unterscheiden sich', 'user123');
    this.syncLoggerService.logError('Netzwerkfehler: Verbindung zum Server unterbrochen', 'user123');
    this.syncLoggerService.logInfo('Synchronisation gestartet', 'Automatische Synchronisation alle 5 Minuten', 'user123');
  }
}