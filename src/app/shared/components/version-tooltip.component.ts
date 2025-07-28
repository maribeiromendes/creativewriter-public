import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VersionService, VersionInfo } from '../../core/services/version.service';

@Component({
  selector: 'app-version-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="version-tooltip-wrapper" 
         (mouseenter)="showTooltip = true" 
         (mouseleave)="showTooltip = false">
      <ng-content></ng-content>
      
      <div class="version-tooltip" 
           [class.visible]="showTooltip && versionInfo"
           #tooltip>
        <div class="tooltip-content" *ngIf="versionInfo">
          <div class="tooltip-header">
            <strong>Version Info</strong>
          </div>
          <div class="tooltip-row">
            <span class="label">Version:</span>
            <span class="value">{{ versionInfo.version }}</span>
          </div>
          <div class="tooltip-row">
            <span class="label">Build:</span>
            <span class="value">{{ versionInfo.buildNumber }}</span>
          </div>
          <div class="tooltip-row">
            <span class="label">Branch:</span>
            <span class="value">{{ versionInfo.branch }}</span>
          </div>
          <div class="tooltip-row">
            <span class="label">Commit:</span>
            <span class="value commit-hash">{{ versionInfo.commitHash.substring(0, 8) }}...</span>
          </div>
          <div class="tooltip-row commit-message">
            <span class="label">Message:</span>
            <span class="value">{{ versionInfo.commitMessage }}</span>
          </div>
          <div class="tooltip-row">
            <span class="label">Built:</span>
            <span class="value">{{ formatBuildDate(versionInfo.buildDate) }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .version-tooltip-wrapper {
      position: relative;
      display: inline-block;
    }
    
    .version-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, rgba(15, 15, 25, 0.98) 0%, rgba(25, 25, 40, 0.98) 100%);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(139, 180, 248, 0.3);
      border-radius: 12px;
      padding: 0;
      min-width: 280px;
      max-width: 350px;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      transform: translateX(-50%) translateY(10px) scale(0.95);
      z-index: 9999;
      box-shadow: 
        0 20px 40px rgba(0, 0, 0, 0.4),
        0 8px 16px rgba(139, 180, 248, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      margin-bottom: 8px;
    }
    
    .version-tooltip.visible {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0) scale(1);
    }
    
    .version-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-top-color: rgba(25, 25, 40, 0.98);
    }
    
    .version-tooltip::before {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 9px solid transparent;
      border-top-color: rgba(139, 180, 248, 0.3);
      z-index: -1;
    }
    
    .tooltip-content {
      padding: 16px;
    }
    
    .tooltip-header {
      text-align: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(139, 180, 248, 0.2);
      background: linear-gradient(135deg, #ffffff 0%, #8bb4f8 50%, #4776e6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    
    .tooltip-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      font-size: 0.8rem;
      line-height: 1.3;
    }
    
    .tooltip-row:last-child {
      margin-bottom: 0;
    }
    
    .tooltip-row.commit-message {
      flex-direction: column;
      align-items: flex-start;
      margin-top: 4px;
    }
    
    .tooltip-row.commit-message .value {
      margin-top: 4px;
      font-style: italic;
      opacity: 0.9;
      line-height: 1.4;
      word-break: break-word;
      hyphens: auto;
    }
    
    .label {
      color: rgba(139, 180, 248, 0.8);
      font-weight: 600;
      flex-shrink: 0;
      margin-right: 12px;
      min-width: 60px;
    }
    
    .value {
      color: #e0e0e0;
      text-align: right;
      flex: 1;
      word-break: break-word;
    }
    
    .commit-hash {
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
      background: rgba(139, 180, 248, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(139, 180, 248, 0.2);
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .version-tooltip {
        min-width: 260px;
        max-width: 300px;
        font-size: 0.85rem;
      }
      
      .tooltip-content {
        padding: 12px;
      }
      
      .tooltip-row {
        font-size: 0.75rem;
        margin-bottom: 6px;
      }
      
      .label {
        min-width: 50px;
        margin-right: 8px;
      }
    }
    
    /* Prevent tooltip from going off-screen */
    @media (max-width: 400px) {
      .version-tooltip {
        left: 0;
        transform: none;
        min-width: 240px;
        margin-left: 10px;
        margin-right: 10px;
      }
      
      .version-tooltip::after,
      .version-tooltip::before {
        left: 80px;
      }
    }
  `]
})
export class VersionTooltipComponent implements OnInit {
  @ViewChild('tooltip') tooltipElement!: ElementRef;
  
  showTooltip = false;
  versionInfo: VersionInfo | null = null;

  constructor(private versionService: VersionService) {}

  ngOnInit() {
    this.versionService.version$.subscribe(version => {
      this.versionInfo = version;
    });
  }

  formatBuildDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Heute';
      } else if (diffDays === 1) {
        return 'Gestern';
      } else if (diffDays < 7) {
        return `vor ${diffDays} Tagen`;
      } else {
        return date.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      return dateString;
    }
  }
}