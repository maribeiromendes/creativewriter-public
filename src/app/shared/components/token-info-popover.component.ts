import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonList, IonItem, IonLabel, IonNote, IonProgressBar, IonBadge, IonGrid, IonRow, IonCol } from '@ionic/angular/standalone';
import { PopoverController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, informationCircleOutline } from 'ionicons/icons';
import { TokenCounterService, SupportedModel, TokenCountResult } from '../services/token-counter.service';

@Component({
  selector: 'app-token-info-popover',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonProgressBar,
    IonBadge,
    IonGrid,
    IonRow,
    IonCol
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Token-Analyse</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <!-- Loading Indicator -->
      <div *ngIf="loading" class="loading-container">
        <ion-item lines="none">
          <ion-label>
            <div class="loading-content">
              <div class="spinner"></div>
              <p>Ermittle genaue Token-Anzahl...</p>
            </div>
          </ion-label>
        </ion-item>
      </div>

      <ion-list *ngIf="!loading">
        <!-- Model Info -->
        <ion-item lines="none">
          <ion-label>
            <h2>{{ modelInfo.name }}</h2>
            <p>{{ modelInfo.provider }}</p>
          </ion-label>
          <ion-badge slot="end" color="primary">{{ model }}</ion-badge>
        </ion-item>

        <!-- Token Count -->
        <ion-item>
          <ion-label>
            <h3>Token-Anzahl</h3>
            <p>{{ tokenResult.tokens }} Tokens</p>
          </ion-label>
          <ion-note slot="end" color="medium">
            ~{{ Math.round(tokenResult.tokens * 1.33) }} Wörter
          </ion-note>
        </ion-item>

        <!-- Context Window Usage -->
        <ion-item>
          <ion-label>
            <h3>Context Window</h3>
            <p>{{ formatNumber(modelInfo.contextWindow) }} Tokens</p>
          </ion-label>
        </ion-item>

        <ion-item lines="none">
          <div class="usage-container">
            <ion-progress-bar 
              [value]="usagePercentage / 100" 
              [color]="getProgressColor(usagePercentage)">
            </ion-progress-bar>
            <div class="usage-text">
              <span>{{ usagePercentage.toFixed(2) }}% verwendet</span>
              <span>{{ formatNumber(modelInfo.contextWindow - tokenResult.tokens) }} Tokens verfügbar</span>
            </div>
          </div>
        </ion-item>

        <!-- Output Limit -->
        <ion-item>
          <ion-label>
            <h3>Output-Limit</h3>
            <p>{{ formatNumber(modelInfo.outputLimit) }} Tokens</p>
          </ion-label>
          <ion-note slot="end" color="medium">
            ~{{ formatNumber(Math.round(modelInfo.outputLimit * 0.75)) }} Wörter
          </ion-note>
        </ion-item>

        <!-- Additional Info -->
        <ion-item lines="none">
          <ion-icon name="information-circle-outline" slot="start" color="medium"></ion-icon>
          <ion-label class="ion-text-wrap">
            <p class="info-text">
              Diese Schätzung basiert auf durchschnittlichen Token-zu-Zeichen-Verhältnissen.
              Die tatsächliche Token-Anzahl kann leicht abweichen.
            </p>
          </ion-label>
        </ion-item>

        <!-- Model Comparison -->
        <ion-item lines="none" *ngIf="showComparison">
          <ion-label>
            <h3>Vergleich mit anderen Modellen</h3>
          </ion-label>
        </ion-item>
        
        <ion-grid *ngIf="showComparison" class="comparison-grid">
          <ion-row>
            <ion-col size="6" *ngFor="let compModel of comparisonModels">
              <div class="model-card" [class.current]="compModel.id === model">
                <h4>{{ compModel.name }}</h4>
                <p class="tokens">{{ getTokenCountForModel(compModel.id).tokens }} Tokens</p>
                <p class="percentage">{{ getUsagePercentageForModel(compModel.id).toFixed(1) }}%</p>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-list>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: var(--ion-color-light);
    }

    ion-list {
      background: transparent;
    }

    ion-item {
      --background: rgba(255, 255, 255, 0.9);
      --border-radius: 8px;
      margin-bottom: 8px;
    }

    .usage-container {
      width: 100%;
    }

    .usage-text {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      color: var(--ion-color-medium);
    }

    ion-progress-bar {
      height: 8px;
      border-radius: 4px;
    }

    .info-text {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin: 0;
    }

    .comparison-grid {
      padding: 0;
    }

    .model-card {
      background: rgba(255, 255, 255, 0.9);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      border: 1px solid var(--ion-color-light);
      transition: all 0.3s ease;
    }

    .model-card.current {
      border-color: var(--ion-color-primary);
      background: rgba(var(--ion-color-primary-rgb), 0.1);
    }

    .model-card h4 {
      font-size: 12px;
      margin: 0 0 4px 0;
      font-weight: 600;
    }

    .model-card p {
      margin: 2px 0;
      font-size: 11px;
    }

    .model-card .tokens {
      color: var(--ion-color-dark);
      font-weight: 500;
    }

    .model-card .percentage {
      color: var(--ion-color-medium);
    }

    ion-badge {
      font-size: 10px;
      padding: 4px 8px;
    }

    .loading-container {
      padding: 20px 0;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .loading-content p {
      margin: 0;
      color: var(--ion-color-medium);
      font-size: 14px;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--ion-color-light);
      border-top: 2px solid var(--ion-color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class TokenInfoPopoverComponent implements OnInit {
  @Input() prompt: string = '';
  @Input() model: SupportedModel = 'claude-3.7-sonnet';
  @Input() showComparison: boolean = false;

  tokenResult!: TokenCountResult;
  modelInfo!: ReturnType<TokenCounterService['getModelInfo']>;
  usagePercentage: number = 0;
  loading: boolean = true;
  Math = Math;

  comparisonModels: Array<{ id: SupportedModel; name: string }> = [
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5' },
    { id: 'claude-3.7-sonnet', name: 'Claude 3.7' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5' },
    { id: 'grok-3', name: 'Grok-3' }
  ];

  constructor(
    private popoverController: PopoverController,
    private tokenCounter: TokenCounterService
  ) {
    addIcons({ closeOutline, informationCircleOutline });
  }

  ngOnInit() {
    this.calculateTokens();
  }

  async calculateTokens() {
    this.loading = true;
    
    try {
      // Try async tokenization first for Claude models
      this.tokenResult = await this.tokenCounter.countTokens(this.prompt, this.model);
    } catch (error) {
      // Fallback to synchronous method
      console.warn('Failed to use async tokenization, falling back to sync:', error);
      this.tokenResult = this.tokenCounter.countTokensSync(this.prompt, this.model);
    }
    
    this.modelInfo = this.tokenCounter.getModelInfo(this.model);
    this.usagePercentage = (this.tokenResult.tokens / this.modelInfo.contextWindow) * 100;
    this.loading = false;
  }

  getTokenCountForModel(modelId: SupportedModel): TokenCountResult {
    return this.tokenCounter.countTokensSync(this.prompt, modelId);
  }

  getUsagePercentageForModel(modelId: SupportedModel): number {
    const result = this.tokenCounter.countTokensSync(this.prompt, modelId);
    const modelInfo = this.tokenCounter.getModelInfo(modelId);
    return (result.tokens / modelInfo.contextWindow) * 100;
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
  }

  getProgressColor(percentage: number): string {
    if (percentage < 50) return 'success';
    if (percentage < 80) return 'warning';
    return 'danger';
  }

  dismiss() {
    this.popoverController.dismiss();
  }
}