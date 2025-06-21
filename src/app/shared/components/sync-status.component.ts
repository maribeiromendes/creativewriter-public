import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { DatabaseService, SyncStatus } from '../../core/services/database.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sync-status" [ngClass]="syncStatusClass">
      <span class="sync-icon">{{ syncIcon }}</span>
      <span class="sync-text">{{ syncText }}</span>
      <div class="sync-actions" *ngIf="showActions">
        <button (click)="forcePush()" [disabled]="!canSync" title="Push lokale Änderungen">
          ↗️ Push
        </button>
        <button (click)="forcePull()" [disabled]="!canSync" title="Pull Remote-Änderungen">
          ↙️ Pull
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sync-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }
    
    .sync-status.online {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .sync-status.offline {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    .sync-status.syncing {
      background-color: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }
    
    .sync-status.error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    .sync-icon {
      font-size: 1rem;
    }
    
    .sync-actions {
      display: flex;
      gap: 0.25rem;
      margin-left: auto;
    }
    
    .sync-actions button {
      padding: 0.25rem 0.5rem;
      border: 1px solid currentColor;
      background: transparent;
      color: inherit;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.75rem;
    }
    
    .sync-actions button:hover:not(:disabled) {
      background: currentColor;
      color: white;
    }
    
    .sync-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class SyncStatusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  @Input() showActions = false;
  
  syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    isSync: false
  };

  constructor(private databaseService: DatabaseService) {}

  ngOnInit() {
    this.databaseService.syncStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.syncStatus = status;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get syncStatusClass(): string {
    if (this.syncStatus.error) return 'error';
    if (this.syncStatus.isSync) return 'syncing';
    if (!this.syncStatus.isOnline) return 'offline';
    return 'online';
  }

  get syncIcon(): string {
    if (this.syncStatus.error) return '⚠️';
    if (this.syncStatus.isSync) return '🔄';
    if (!this.syncStatus.isOnline) return '🔌';
    return '☁️';
  }

  get syncText(): string {
    if (this.syncStatus.error) return `Fehler: ${this.syncStatus.error}`;
    if (this.syncStatus.isSync) return 'Synchronisiert...';
    if (!this.syncStatus.isOnline) return 'Offline';
    
    const lastSync = this.syncStatus.lastSync;
    if (lastSync) {
      const timeAgo = this.getTimeAgo(lastSync);
      return `Synchron (${timeAgo})`;
    }
    
    return 'Online';
  }

  get canSync(): boolean {
    return this.syncStatus.isOnline && !this.syncStatus.isSync;
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return 'gerade eben';
    if (diffMin < 60) return `vor ${diffMin}m`;
    
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `vor ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `vor ${diffDays}d`;
  }

  async forcePush() {
    try {
      await this.databaseService.forcePush();
    } catch (error) {
      console.error('Force push failed:', error);
    }
  }

  async forcePull() {
    try {
      await this.databaseService.forcePull();
    } catch (error) {
      console.error('Force pull failed:', error);
    }
  }
}