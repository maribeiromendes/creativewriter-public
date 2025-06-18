import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SettingsService } from '../core/services/settings.service';
import { ModelService } from '../core/services/model.service';
import { Settings } from '../core/models/settings.interface';
import { ModelOption } from '../core/models/model.interface';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  template: `
    <div class="settings-container">
      <div class="settings-header">
        <button class="back-btn" (click)="goBack()">← Zurück</button>
        <h1>Einstellungen</h1>
        <div class="header-actions">
          <button class="ai-logs-btn" (click)="goToAILogs()" title="AI Request Logs">📊 AI Logs</button>
          <div class="save-status" [class.saved]="!hasUnsavedChanges">
            {{ hasUnsavedChanges ? 'Nicht gespeichert' : 'Gespeichert' }}
          </div>
        </div>
      </div>

      <div class="settings-content">
        <!-- OpenRouter Settings -->
        <div class="settings-section">
          <h2>OpenRouter API</h2>
          <div class="settings-group">
            <label class="toggle-label">
              <input 
                type="checkbox" 
                [(ngModel)]="settings.openRouter.enabled"
                (ngModelChange)="onProviderToggle('openRouter')"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-text">OpenRouter aktivieren</span>
            </label>
          </div>

          <div class="settings-group" [class.disabled]="!settings.openRouter.enabled">
            <label>API Key</label>
            <input 
              type="password"
              [(ngModel)]="settings.openRouter.apiKey"
              (ngModelChange)="onApiKeyChange('openRouter')"
              placeholder="sk-or-v1-..."
              [disabled]="!settings.openRouter.enabled"
            />
            <small>Ihren OpenRouter API Key finden Sie unter openrouter.ai/keys</small>
          </div>

          <div class="settings-group" [class.disabled]="!settings.openRouter.enabled">
            <div class="model-header">
              <label>Model</label>
              <button 
                type="button" 
                class="load-models-btn"
                (click)="loadModels()" 
                [disabled]="!settings.openRouter.enabled || !settings.openRouter.apiKey || loadingModels"
                title="Modelle von OpenRouter laden"
              >
                {{ loadingModels ? 'Laden...' : 'Modelle laden' }}
              </button>
            </div>
            <ng-select [(ngModel)]="settings.openRouter.model"
                       [items]="openRouterModels"
                       bindLabel="label"
                       bindValue="id"
                       [searchable]="true"
                       [clearable]="true"
                       [disabled]="!settings.openRouter.enabled"
                       placeholder="Modell auswählen oder suchen..."
                       (ngModelChange)="onSettingsChange()"
                       [loading]="loadingModels"
                       [virtualScroll]="true">
            </ng-select>
            <small *ngIf="modelLoadError" class="error-text">{{ modelLoadError }}</small>
            <small *ngIf="!modelLoadError && openRouterModels.length > 0">{{ openRouterModels.length }} Modelle verfügbar. Preise in EUR pro 1M Tokens.</small>
            <small *ngIf="!modelLoadError && openRouterModels.length === 0 && settings.openRouter.enabled">Klicken Sie "Modelle laden" um verfügbare Modelle anzuzeigen.</small>
          </div>

          <div class="settings-row" [class.disabled]="!settings.openRouter.enabled">
            <div class="settings-group">
              <label>Temperature</label>
              <input 
                type="number"
                [(ngModel)]="settings.openRouter.temperature"
                (ngModelChange)="onSettingsChange()"
                min="0"
                max="2"
                step="0.1"
                [disabled]="!settings.openRouter.enabled"
              />
            </div>

            <div class="settings-group">
              <label>Top P</label>
              <input 
                type="number"
                [(ngModel)]="settings.openRouter.topP"
                (ngModelChange)="onSettingsChange()"
                min="0"
                max="1"
                step="0.1"
                [disabled]="!settings.openRouter.enabled"
              />
            </div>
          </div>
        </div>

        <!-- Replicate Settings -->
        <div class="settings-section">
          <h2>Replicate API</h2>
          <div class="settings-group">
            <label class="toggle-label">
              <input 
                type="checkbox" 
                [(ngModel)]="settings.replicate.enabled"
                (ngModelChange)="onProviderToggle('replicate')"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-text">Replicate aktivieren</span>
            </label>
          </div>

          <div class="settings-group" [class.disabled]="!settings.replicate.enabled">
            <label>API Key</label>
            <input 
              type="password"
              [(ngModel)]="settings.replicate.apiKey"
              (ngModelChange)="onApiKeyChange('replicate')"
              placeholder="r8_..."
              [disabled]="!settings.replicate.enabled"
            />
            <small>Ihren Replicate API Key finden Sie unter replicate.com/account/api-tokens</small>
          </div>

          <div class="settings-group" [class.disabled]="!settings.replicate.enabled">
            <div class="model-header">
              <label>Model</label>
              <button 
                type="button" 
                class="load-models-btn"
                (click)="loadModels()" 
                [disabled]="!settings.replicate.enabled || !settings.replicate.apiKey || loadingModels"
                title="Modelle von Replicate laden"
              >
                {{ loadingModels ? 'Laden...' : 'Modelle laden' }}
              </button>
            </div>
            <ng-select [(ngModel)]="settings.replicate.model"
                       [items]="replicateModels"
                       bindLabel="label"
                       bindValue="id"
                       [searchable]="true"
                       [clearable]="true"
                       [disabled]="!settings.replicate.enabled"
                       placeholder="Modell auswählen oder suchen..."
                       (ngModelChange)="onSettingsChange()"
                       [loading]="loadingModels"
                       [virtualScroll]="true">
            </ng-select>
            <small *ngIf="modelLoadError" class="error-text">{{ modelLoadError }}</small>
            <small *ngIf="!modelLoadError && replicateModels.length > 0">{{ replicateModels.length }} Modelle verfügbar. Preise geschätzt in EUR pro 1M Tokens.</small>
            <small *ngIf="!modelLoadError && replicateModels.length === 0 && settings.replicate.enabled">Klicken Sie "Modelle laden" um verfügbare Modelle anzuzeigen.</small>
            <small *ngIf="!settings.replicate.enabled">Format: owner/model-name (z.B. meta/llama-2-70b-chat)</small>
          </div>

          <div class="settings-group" [class.disabled]="!settings.replicate.enabled">
            <label>Version (optional)</label>
            <input 
              type="text"
              [(ngModel)]="settings.replicate.version"
              (ngModelChange)="onSettingsChange()"
              placeholder="Lassen Sie leer für die neueste Version"
              [disabled]="!settings.replicate.enabled"
            />
          </div>
        </div>

        <!-- Actions -->
        <div class="settings-actions">
          <button class="btn btn-primary" (click)="saveSettings()" [disabled]="!hasUnsavedChanges">
            Einstellungen speichern
          </button>
          <button class="btn btn-secondary" (click)="resetSettings()">
            Auf Standard zurücksetzen
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      min-height: 100vh;
      background: #1a1a1a;
      color: #e0e0e0;
    }

    .settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem 2rem;
      background: #2d2d2d;
      border-bottom: 1px solid #404040;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .settings-header h1 {
      margin: 0;
      font-size: 1.8rem;
      color: #f8f9fa;
    }

    .back-btn,
    .ai-logs-btn {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.3s;
      font-size: 0.9rem;
    }

    .back-btn:hover,
    .ai-logs-btn:hover {
      background: #5a6268;
    }

    .save-status {
      color: #dc3545;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .save-status.saved {
      color: #28a745;
    }

    .settings-content {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    .settings-section {
      background: #2d2d2d;
      border-radius: 8px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .settings-section h2 {
      margin: 0 0 1.5rem 0;
      color: #f8f9fa;
      font-size: 1.4rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #404040;
    }

    .settings-group {
      margin-bottom: 1.5rem;
    }

    .settings-group.disabled {
      opacity: 0.5;
    }

    .settings-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #adb5bd;
      font-weight: 500;
    }

    .settings-group input[type="text"],
    .settings-group input[type="password"],
    .settings-group input[type="number"],
    .settings-group select {
      width: 100%;
      padding: 0.75rem;
      background: #1a1a1a;
      border: 1px solid #404040;
      border-radius: 6px;
      color: #e0e0e0;
      font-size: 1rem;
    }

    .settings-group input:focus,
    .settings-group select:focus {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
    }

    .settings-group input:disabled,
    .settings-group select:disabled {
      cursor: not-allowed;
      background: #242424;
    }

    .settings-group small {
      display: block;
      margin-top: 0.25rem;
      color: #6c757d;
      font-size: 0.85rem;
    }

    .settings-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .settings-row.disabled {
      opacity: 0.5;
    }

    .toggle-label {
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
    }

    .toggle-label input[type="checkbox"] {
      display: none;
    }

    .toggle-slider {
      position: relative;
      width: 48px;
      height: 24px;
      background: #404040;
      border-radius: 24px;
      transition: background 0.3s;
    }

    .toggle-slider::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      transition: transform 0.3s;
    }

    .toggle-label input:checked + .toggle-slider {
      background: #0d6efd;
    }

    .toggle-label input:checked + .toggle-slider::after {
      transform: translateX(24px);
    }

    .toggle-text {
      font-weight: 500;
    }

    .settings-actions {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #0d6efd;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0b5ed7;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }
    
    .model-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    
    .load-models-btn {
      background: #0d6efd;
      color: white;
      border: none;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    .load-models-btn:hover:not(:disabled) {
      background: #0b5ed7;
    }
    
    .load-models-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }
    
    .error-text {
      color: #dc3545 !important;
      font-weight: 500;
    }
    
    .settings-group select option {
      background: #2d2d2d;
      color: #e0e0e0;
      padding: 0.5rem;
    }
    
    /* ng-select custom styling */
    .settings-group :global(.ng-select) {
      font-size: 1rem;
    }
    
    .settings-group :global(.ng-select.ng-select-single .ng-select-container) {
      height: auto !important;
      min-height: 45px !important;
      background: #1a1a1a !important;
      border: 1px solid #404040 !important;
      border-radius: 6px !important;
    }
    
    .settings-group :global(.ng-select .ng-select-container .ng-value-container) {
      background: #1a1a1a !important;
      padding-left: 0.75rem !important;
    }
    
    .settings-group :global(.ng-select .ng-select-container .ng-value-container .ng-input > input) {
      color: #e0e0e0 !important;
      background: transparent !important;
    }
    
    .settings-group :global(.ng-select .ng-select-container .ng-value-container .ng-placeholder) {
      color: #6c757d !important;
    }
    
    .settings-group :global(.ng-select .ng-select-container .ng-value-container .ng-value) {
      color: #e0e0e0 !important;
      background: transparent !important;
    }
    
    .settings-group :global(.ng-select .ng-arrow-wrapper) {
      width: 25px;
    }
    
    .settings-group :global(.ng-select .ng-arrow-wrapper .ng-arrow) {
      border-color: #adb5bd transparent transparent;
    }
    
    .settings-group :global(.ng-select.ng-select-focused .ng-select-container) {
      border-color: #0d6efd;
      box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
    }
    
    .settings-group :global(.ng-select.ng-select-disabled .ng-select-container) {
      background: #242424;
      cursor: not-allowed;
    }
    
    .settings-group :global(.ng-dropdown-panel) {
      background: #2d2d2d !important;
      border: 1px solid #404040 !important;
      border-radius: 6px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
      z-index: 1050 !important;
    }
    
    .settings-group :global(.ng-dropdown-panel .ng-dropdown-panel-items) {
      background: #2d2d2d !important;
    }
    
    .settings-group :global(.ng-dropdown-panel .ng-dropdown-panel-items .ng-option) {
      color: #e0e0e0 !important;
      background: #2d2d2d !important;
      padding: 0.75rem !important;
      border-bottom: 1px solid #404040;
    }
    
    .settings-group :global(.ng-dropdown-panel .ng-dropdown-panel-items .ng-option:last-child) {
      border-bottom: none;
    }
    
    .settings-group :global(.ng-dropdown-panel .ng-dropdown-panel-items .ng-option.ng-option-highlighted) {
      background: #383838 !important;
      color: #f8f9fa !important;
    }
    
    .settings-group :global(.ng-dropdown-panel .ng-dropdown-panel-items .ng-option.ng-option-selected) {
      background: #0d6efd !important;
      color: white !important;
    }
    
    .settings-group :global(.ng-dropdown-panel .ng-dropdown-panel-items .ng-option.ng-option-selected.ng-option-highlighted) {
      background: #0b5ed7 !important;
      color: white !important;
    }
    
    .model-option {
      padding: 0.25rem 0;
    }
    
    .model-name {
      font-weight: 500;
      margin-bottom: 0.25rem;
      color: #f8f9fa;
    }
    
    .model-details {
      font-size: 0.85rem;
      color: #adb5bd;
      margin-bottom: 0.25rem;
    }
    
    .model-details .cost {
      color: #28a745;
      font-weight: 500;
    }
    
    .model-details .context {
      color: #6c757d;
    }
    
    .model-description {
      font-size: 0.8rem;
      color: #6c757d;
      line-height: 1.3;
    }
  `]
})
export class SettingsComponent implements OnInit, OnDestroy {
  settings: Settings;
  hasUnsavedChanges = false;
  private originalSettings!: Settings;
  private subscription: Subscription = new Subscription();
  
  // Model loading state
  openRouterModels: ModelOption[] = [];
  replicateModels: ModelOption[] = [];
  loadingModels = false;
  modelLoadError: string | null = null;

  constructor(
    private router: Router,
    private settingsService: SettingsService,
    private modelService: ModelService
  ) {
    this.settings = this.settingsService.getSettings();
  }

  ngOnInit(): void {
    // Subscribe to settings changes
    this.subscription.add(
      this.settingsService.settings$.subscribe(settings => {
        this.settings = { ...settings };
        this.originalSettings = JSON.parse(JSON.stringify(settings));
        this.hasUnsavedChanges = false;
        
        // Auto-load models if a model is already selected but models aren't loaded yet
        this.autoLoadModelsIfNeeded();
      })
    );
    
    // Subscribe to model loading state
    this.subscription.add(
      this.modelService.loading$.subscribe(loading => {
        this.loadingModels = loading;
      })
    );
    
    // Subscribe to model updates
    this.subscription.add(
      this.modelService.openRouterModels$.subscribe(models => {
        this.openRouterModels = models;
      })
    );
    
    this.subscription.add(
      this.modelService.replicateModels$.subscribe(models => {
        this.replicateModels = models;
      })
    );
    
    // Initial auto-load check
    this.autoLoadModelsIfNeeded();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onSettingsChange(): void {
    this.hasUnsavedChanges = JSON.stringify(this.settings) !== JSON.stringify(this.originalSettings);
  }

  saveSettings(): void {
    this.settingsService.updateSettings(this.settings);
    this.hasUnsavedChanges = false;
  }

  resetSettings(): void {
    if (confirm('Sind Sie sicher, dass Sie alle Einstellungen auf die Standardwerte zurücksetzen möchten?')) {
      this.settingsService.clearSettings();
    }
  }

  loadModels(): void {
    this.modelLoadError = null;
    this.modelService.loadAllModels().subscribe({
      next: (models) => {
        console.log('Models loaded successfully:', models);
      },
      error: (error) => {
        console.error('Failed to load models:', error);
        this.modelLoadError = 'Fehler beim Laden der Modelle. Überprüfen Sie Ihre API-Keys und Internetverbindung.';
      }
    });
  }
  
  onApiKeyChange(provider: 'openRouter' | 'replicate'): void {
    this.onSettingsChange();
    
    // Auto-load models when API key is entered and provider is enabled
    // This ensures models are available for selection
    if (provider === 'openRouter' && this.settings.openRouter.enabled && this.settings.openRouter.apiKey) {
      console.log('API key entered for OpenRouter, loading models...');
      this.modelService.loadOpenRouterModels().subscribe();
    } else if (provider === 'replicate' && this.settings.replicate.enabled && this.settings.replicate.apiKey) {
      console.log('API key entered for Replicate, loading models...');
      this.modelService.loadReplicateModels().subscribe();
    }
  }
  
  onProviderToggle(provider: 'openRouter' | 'replicate'): void {
    this.onSettingsChange();
    
    // Load models when provider is enabled and has API key
    // This ensures models are available when user enables a provider
    if (provider === 'openRouter' && this.settings.openRouter.enabled && this.settings.openRouter.apiKey) {
      console.log('OpenRouter enabled, loading models...');
      this.modelService.loadOpenRouterModels().subscribe();
    } else if (provider === 'replicate' && this.settings.replicate.enabled && this.settings.replicate.apiKey) {
      console.log('Replicate enabled, loading models...');
      this.modelService.loadReplicateModels().subscribe();
    }
  }
  
  shouldShowDeprecatedOpenRouterModel(): boolean {
    return !!(this.settings.openRouter.model && 
             this.openRouterModels.length > 0 && 
             !this.openRouterModels.find(m => m.id === this.settings.openRouter.model));
  }
  
  shouldShowDeprecatedReplicateModel(): boolean {
    return !!(this.settings.replicate.model && 
             this.replicateModels.length > 0 && 
             !this.replicateModels.find(m => m.id === this.settings.replicate.model));
  }
  
  formatContextLength(length: number): string {
    if (length >= 1000000) {
      return `${(length / 1000000).toFixed(1)}M`;
    } else if (length >= 1000) {
      return `${(length / 1000).toFixed(0)}K`;
    }
    return length.toString();
  }
  
  private autoLoadModelsIfNeeded(): void {
    // Auto-load OpenRouter models if:
    // 1. OpenRouter is enabled
    // 2. API key is present  
    // 3. A model is already selected
    // 4. Models haven't been loaded yet
    if (this.settings.openRouter.enabled && 
        this.settings.openRouter.apiKey && 
        this.settings.openRouter.model && 
        this.openRouterModels.length === 0 &&
        !this.loadingModels) {
      console.log('Auto-loading OpenRouter models because model is selected:', this.settings.openRouter.model);
      this.modelService.loadOpenRouterModels().subscribe();
    }
    
    // Auto-load Replicate models if:
    // 1. Replicate is enabled
    // 2. API key is present
    // 3. A model is already selected  
    // 4. Models haven't been loaded yet
    if (this.settings.replicate.enabled && 
        this.settings.replicate.apiKey && 
        this.settings.replicate.model && 
        this.replicateModels.length === 0 &&
        !this.loadingModels) {
      console.log('Auto-loading Replicate models because model is selected:', this.settings.replicate.model);
      this.modelService.loadReplicateModels().subscribe();
    }
  }

  goBack(): void {
    if (this.hasUnsavedChanges) {
      if (confirm('Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?')) {
        this.router.navigate(['/']);
      }
    } else {
      this.router.navigate(['/']);
    }
  }

  goToAILogs(): void {
    if (this.hasUnsavedChanges) {
      if (confirm('Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?')) {
        this.router.navigate(['/ai-logs']);
      }
    } else {
      this.router.navigate(['/ai-logs']);
    }
  }
}