import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonInput, IonToggle,
  IonChip, IonItem, IonLabel, IonSelect, IonSelectOption, IonRange, IonTextarea
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, analytics, warning, checkmarkCircle, globeOutline, logoGoogle } from 'ionicons/icons';
import { SettingsService } from '../core/services/settings.service';
import { ModelService } from '../core/services/model.service';
import { Settings } from '../core/models/settings.interface';
import { ModelOption } from '../core/models/model.interface';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NgSelectModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonInput, IonToggle,
    IonChip, IonItem, IonLabel, IonSelect, IonSelectOption, IonRange, IonTextarea
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
        <ion-title>Einstellungen</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" color="medium" (click)="goToAILogs()" title="AI Request Logs">
            <ion-icon name="analytics" slot="start"></ion-icon>
            AI Logs
          </ion-button>
          <ion-chip [color]="hasUnsavedChanges ? 'warning' : 'success'">
            <ion-icon [name]="hasUnsavedChanges ? 'warning' : 'checkmark-circle'" slot="start"></ion-icon>
            <ion-label>{{ hasUnsavedChanges ? 'Nicht gespeichert' : 'Gespeichert' }}</ion-label>
          </ion-chip>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="settings-content">
        <!-- Global Model Selection -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>AI Model Auswahl</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="model-selection-wrapper">
              <div class="model-selection-container">
                <div class="model-header">
                  <ion-label>Globales Model</ion-label>
                  <ion-button 
                    size="small"
                    fill="outline"
                    (click)="loadCombinedModels()" 
                    [disabled]="(!settings.openRouter.enabled || !settings.openRouter.apiKey) && (!settings.googleGemini.enabled || !settings.googleGemini.apiKey) || loadingModels"
                    title="Modelle laden">
                    {{ loadingModels ? 'Laden...' : 'Modelle laden' }}
                  </ion-button>
                </div>
                <ng-select [(ngModel)]="settings.selectedModel"
                           [items]="combinedModels"
                           bindLabel="label"
                           bindValue="id"
                           [searchable]="true"
                           [clearable]="true"
                           [disabled]="(!settings.openRouter.enabled || !settings.openRouter.apiKey) && (!settings.googleGemini.enabled || !settings.googleGemini.apiKey)"
                           placeholder="Modell auswählen oder suchen..."
                           (ngModelChange)="onGlobalModelChange()"
                           [loading]="loadingModels"
                           [virtualScroll]="true"
                           class="ng-select-custom"
                           appendTo="body">
                  <ng-template ng-option-tmp let-item="item">
                    <div class="model-option">
                      <div class="model-option-header">
                        <ion-icon [name]="item.provider === 'gemini' ? 'logo-google' : 'globe-outline'" class="provider-icon" [class.gemini]="item.provider === 'gemini'" [class.openrouter]="item.provider === 'openrouter'"></ion-icon>
                        <span class="model-label">{{ item.label }}</span>
                      </div>
                      <div class="model-option-details">
                        <span class="model-cost">Input: {{ item.costInputEur }} | Output: {{ item.costOutputEur }}</span>
                        <span class="model-context">Context: {{ formatContextLength(item.contextLength) }}</span>
                      </div>
                      <div class="model-description" *ngIf="item.description">{{ item.description }}</div>
                    </div>
                  </ng-template>
                </ng-select>
                <div class="model-info">
                  <p *ngIf="modelLoadError" class="error-text">{{ modelLoadError }}</p>
                  <p *ngIf="!modelLoadError && combinedModels.length > 0" class="info-text">
                    {{ combinedModels.length }} Modelle verfügbar. Preise in EUR pro 1M Tokens.
                  </p>
                  <p *ngIf="!modelLoadError && combinedModels.length === 0 && (settings.openRouter.enabled || settings.googleGemini.enabled)" class="info-text">
                    Klicken Sie "Modelle laden" um verfügbare Modelle anzuzeigen.
                  </p>
                </div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- OpenRouter Settings -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>OpenRouter API</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-label>OpenRouter aktivieren</ion-label>
              <ion-toggle 
                [(ngModel)]="settings.openRouter.enabled"
                (ngModelChange)="onProviderToggle('openRouter')"
                slot="end">
              </ion-toggle>
            </ion-item>

            <ion-item [class.disabled]="!settings.openRouter.enabled">
              <ion-input
                type="password"
                [(ngModel)]="settings.openRouter.apiKey"
                (ngModelChange)="onApiKeyChange('openRouter')"
                placeholder="sk-or-v1-..."
                [disabled]="!settings.openRouter.enabled"
                label="API Key"
                labelPlacement="stacked"
                helperText="Ihren OpenRouter API Key finden Sie unter openrouter.ai/keys">
              </ion-input>
            </ion-item>

            <div class="model-info" [class.disabled]="!settings.openRouter.enabled">
              <p class="info-text">Nutzen Sie die globale Model-Auswahl oben.</p>
            </div>

            <div class="settings-row" [class.disabled]="!settings.openRouter.enabled">
              <ion-item>
                <ion-input
                  type="number"
                  [(ngModel)]="settings.openRouter.temperature"
                  (ngModelChange)="onSettingsChange()"
                  min="0"
                  max="2"
                  step="0.1"
                  [disabled]="!settings.openRouter.enabled"
                  label="Temperature"
                  labelPlacement="stacked">
                </ion-input>
              </ion-item>
              <ion-item>
                <ion-input
                  type="number"
                  [(ngModel)]="settings.openRouter.topP"
                  (ngModelChange)="onSettingsChange()"
                  min="0"
                  max="1"
                  step="0.1"
                  [disabled]="!settings.openRouter.enabled"
                  label="Top P"
                  labelPlacement="stacked">
                </ion-input>
              </ion-item>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Replicate Settings -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Replicate API</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-label>Replicate aktivieren</ion-label>
              <ion-toggle 
                [(ngModel)]="settings.replicate.enabled"
                (ngModelChange)="onProviderToggle('replicate')"
                slot="end">
              </ion-toggle>
            </ion-item>

            <ion-item [class.disabled]="!settings.replicate.enabled">
              <ion-input
                type="password"
                [(ngModel)]="settings.replicate.apiKey"
                (ngModelChange)="onApiKeyChange('replicate')"
                placeholder="r8_..."
                [disabled]="!settings.replicate.enabled"
                label="API Key"
                labelPlacement="stacked"
                helperText="Ihren Replicate API Key finden Sie unter replicate.com/account/api-tokens">
              </ion-input>
            </ion-item>

            <div class="model-selection-wrapper" [class.disabled]="!settings.replicate.enabled">
              <div class="model-selection-container">
                <div class="model-header">
                  <ion-label>Model</ion-label>
                  <ion-button 
                    size="small"
                    fill="outline"
                    (click)="loadModels()" 
                    [disabled]="!settings.replicate.enabled || !settings.replicate.apiKey || loadingModels"
                    title="Modelle von Replicate laden">
                    {{ loadingModels ? 'Laden...' : 'Modelle laden' }}
                  </ion-button>
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
                           (open)="onDropdownOpen('replicate')"
                           (close)="onDropdownClose('replicate')"
                           [loading]="loadingModels"
                           [virtualScroll]="true"
                           class="ng-select-custom">
                </ng-select>
                <div class="model-info">
                  <p *ngIf="modelLoadError" class="error-text">{{ modelLoadError }}</p>
                  <p *ngIf="!modelLoadError && replicateModels.length > 0" class="info-text">
                    {{ replicateModels.length }} Modelle verfügbar. Preise geschätzt in EUR pro 1M Tokens.
                  </p>
                  <p *ngIf="!modelLoadError && replicateModels.length === 0 && settings.replicate.enabled" class="info-text">
                    Klicken Sie "Modelle laden" um verfügbare Modelle anzuzeigen.
                  </p>
                  <p *ngIf="!settings.replicate.enabled" class="info-text">
                    Format: owner/model-name (z.B. meta/llama-2-70b-chat)
                  </p>
                </div>
              </div>
            </div>

            <ion-item [class.disabled]="!settings.replicate.enabled">
              <ion-input
                type="text"
                [(ngModel)]="settings.replicate.version"
                (ngModelChange)="onSettingsChange()"
                placeholder="Lassen Sie leer für die neueste Version"
                [disabled]="!settings.replicate.enabled"
                label="Version (optional)"
                labelPlacement="stacked">
              </ion-input>
            </ion-item>
          </ion-card-content>
        </ion-card>

        <!-- Google Gemini Settings -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Google Gemini API</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-label>Google Gemini aktivieren</ion-label>
              <ion-toggle 
                [(ngModel)]="settings.googleGemini.enabled"
                (ngModelChange)="onProviderToggle('googleGemini')"
                slot="end">
              </ion-toggle>
            </ion-item>

            <ion-item [class.disabled]="!settings.googleGemini.enabled">
              <ion-input
                type="password"
                [(ngModel)]="settings.googleGemini.apiKey"
                (ngModelChange)="onApiKeyChange('googleGemini')"
                placeholder="AIza..."
                [disabled]="!settings.googleGemini.enabled"
                label="API Key"
                labelPlacement="stacked"
                helperText="Ihren Google AI API Key finden Sie unter aistudio.google.com/app/apikey">
              </ion-input>
            </ion-item>

            <div class="model-info" [class.disabled]="!settings.googleGemini.enabled">
              <p class="info-text">Nutzen Sie die globale Model-Auswahl oben.</p>
            </div>

            <div class="settings-row" [class.disabled]="!settings.googleGemini.enabled">
              <ion-item>
                <ion-input
                  type="number"
                  [(ngModel)]="settings.googleGemini.temperature"
                  (ngModelChange)="onSettingsChange()"
                  min="0"
                  max="2"
                  step="0.1"
                  [disabled]="!settings.googleGemini.enabled"
                  label="Temperature"
                  labelPlacement="stacked">
                </ion-input>
              </ion-item>
              <ion-item>
                <ion-input
                  type="number"
                  [(ngModel)]="settings.googleGemini.topP"
                  (ngModelChange)="onSettingsChange()"
                  min="0"
                  max="1"
                  step="0.1"
                  [disabled]="!settings.googleGemini.enabled"
                  label="Top P"
                  labelPlacement="stacked">
                </ion-input>
              </ion-item>
            </div>

            <!-- Content Filter Settings -->
            <div *ngIf="settings.googleGemini.enabled" class="content-filter-section">
              <h4 class="section-title">Content Filter Einstellungen</h4>
              
              <ion-item>
                <ion-label>Belästigung</ion-label>
                <ion-select
                  [(ngModel)]="settings.googleGemini.contentFilter.harassment"
                  (ngModelChange)="onSettingsChange()"
                  interface="popover"
                  slot="end">
                  <ion-select-option value="BLOCK_NONE">Nicht blockieren</ion-select-option>
                  <ion-select-option value="BLOCK_ONLY_HIGH">Nur hohe Risiken</ion-select-option>
                  <ion-select-option value="BLOCK_MEDIUM_AND_ABOVE">Mittlere und hohe Risiken</ion-select-option>
                  <ion-select-option value="BLOCK_LOW_AND_ABOVE">Niedrige und höhere Risiken</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item>
                <ion-label>Hassrede</ion-label>
                <ion-select
                  [(ngModel)]="settings.googleGemini.contentFilter.hateSpeech"
                  (ngModelChange)="onSettingsChange()"
                  interface="popover"
                  slot="end">
                  <ion-select-option value="BLOCK_NONE">Nicht blockieren</ion-select-option>
                  <ion-select-option value="BLOCK_ONLY_HIGH">Nur hohe Risiken</ion-select-option>
                  <ion-select-option value="BLOCK_MEDIUM_AND_ABOVE">Mittlere und hohe Risiken</ion-select-option>
                  <ion-select-option value="BLOCK_LOW_AND_ABOVE">Niedrige und höhere Risiken</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item>
                <ion-label>Sexuell explizit</ion-label>
                <ion-select
                  [(ngModel)]="settings.googleGemini.contentFilter.sexuallyExplicit"
                  (ngModelChange)="onSettingsChange()"
                  interface="popover"
                  slot="end">
                  <ion-select-option value="BLOCK_NONE">Nicht blockieren</ion-select-option>
                  <ion-select-option value="BLOCK_ONLY_HIGH">Nur hohe Risiken</ion-select-option>
                  <ion-select-option value="BLOCK_MEDIUM_AND_ABOVE">Mittlere und hohe Risiken</ion-select-option>
                  <ion-select-option value="BLOCK_LOW_AND_ABOVE">Niedrige und höhere Risiken</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item>
                <ion-label>Gefährlicher Inhalt</ion-label>
                <ion-select
                  [(ngModel)]="settings.googleGemini.contentFilter.dangerousContent"
                  (ngModelChange)="onSettingsChange()"
                  interface="popover"
                  slot="end">
                  <ion-select-option value="BLOCK_NONE">Nicht blockieren</ion-select-option>
                  <ion-select-option value="BLOCK_ONLY_HIGH">Nur hohe Risiken</ion-select-option>
                  <ion-select-option value="BLOCK_MEDIUM_AND_ABOVE">Mittlere und hohe Risiken</ion-select-option>
                  <ion-select-option value="BLOCK_LOW_AND_ABOVE">Niedrige und höhere Risiken</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item>
                <ion-label>Bürgerliche Integrität</ion-label>
                <ion-select
                  [(ngModel)]="settings.googleGemini.contentFilter.civicIntegrity"
                  (ngModelChange)="onSettingsChange()"
                  interface="popover"
                  slot="end">
                  <ion-select-option value="BLOCK_NONE">Nicht blockieren</ion-select-option>
                  <ion-select-option value="BLOCK_ONLY_HIGH">Nur hohe Risiken</ion-select-option>
                  <ion-select-option value="BLOCK_MEDIUM_AND_ABOVE">Mittlere und hohe Risiken</ion-select-option>
                  <ion-select-option value="BLOCK_LOW_AND_ABOVE">Niedrige und höhere Risiken</ion-select-option>
                </ion-select>
              </ion-item>
            </div>

            <div class="model-info" *ngIf="settings.googleGemini.enabled">
              <p class="info-text">
                <strong>Content Filter:</strong> Konfigurierbare Sicherheitseinstellungen für verschiedene Inhaltskategorien.
              </p>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Scene Title Generation Settings -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Szenentitel-Generierung</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-label>Maximale Wortanzahl</ion-label>
              <ion-range
                [(ngModel)]="settings.sceneTitleGeneration.maxWords"
                (ngModelChange)="onSettingsChange()"
                min="1"
                max="20"
                step="1"
                snaps="true"
                ticks="true"
                slot="end">
                <ion-label slot="start">1</ion-label>
                <ion-label slot="end">20</ion-label>
              </ion-range>
            </ion-item>

            <ion-item>
              <ion-label>Stil</ion-label>
              <ion-select
                [(ngModel)]="settings.sceneTitleGeneration.style"
                (ngModelChange)="onSettingsChange()"
                interface="popover"
                slot="end">
                <ion-select-option value="concise">Knapp</ion-select-option>
                <ion-select-option value="descriptive">Beschreibend</ion-select-option>
                <ion-select-option value="action">Actionreich</ion-select-option>
                <ion-select-option value="emotional">Emotional</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label>Sprache</ion-label>
              <ion-select
                [(ngModel)]="settings.sceneTitleGeneration.language"
                (ngModelChange)="onSettingsChange()"
                interface="popover"
                slot="end">
                <ion-select-option value="german">Deutsch</ion-select-option>
                <ion-select-option value="english">Englisch</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label>Genre berücksichtigen</ion-label>
              <ion-toggle
                [(ngModel)]="settings.sceneTitleGeneration.includeGenre"
                (ngModelChange)="onSettingsChange()"
                slot="end">
              </ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>Kreativität (Temperature)</ion-label>
              <ion-range
                [(ngModel)]="settings.sceneTitleGeneration.temperature"
                (ngModelChange)="onSettingsChange()"
                min="0.1"
                max="1.0"
                step="0.1"
                snaps="true"
                slot="end">
                <ion-label slot="start">0.1</ion-label>
                <ion-label slot="end">1.0</ion-label>
              </ion-range>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Zusätzliche Anweisungen (optional)</ion-label>
              <ion-textarea
                [(ngModel)]="settings.sceneTitleGeneration.customInstruction"
                (ngModelChange)="onSettingsChange()"
                placeholder="z.B. 'Verwende keine Artikel' oder 'Fokussiere auf Emotionen'"
                rows="3"
                auto-grow="true">
              </ion-textarea>
            </ion-item>
            
            <ion-item>
              <ion-label>Benutzerdefinierten Prompt verwenden</ion-label>
              <ion-toggle
                [(ngModel)]="settings.sceneTitleGeneration.useCustomPrompt"
                (ngModelChange)="onSettingsChange()"
                slot="end">
              </ion-toggle>
            </ion-item>
            
            <ion-item *ngIf="settings.sceneTitleGeneration.useCustomPrompt">
              <ion-label position="stacked">
                Benutzerdefinierter Prompt
                <p class="prompt-help">
                  Verfügbare Platzhalter: {{ '{' }}maxWords{{ '}' }}, {{ '{' }}styleInstruction{{ '}' }}, {{ '{' }}genreInstruction{{ '}' }}, {{ '{' }}languageInstruction{{ '}' }}, {{ '{' }}customInstruction{{ '}' }}, {{ '{' }}sceneContent{{ '}' }}
                </p>
              </ion-label>
              <ion-textarea
                [(ngModel)]="settings.sceneTitleGeneration.customPrompt"
                (ngModelChange)="onSettingsChange()"
                placeholder="Erstelle einen kurzen Titel für die folgende Szene..."
                rows="8"
                auto-grow="true">
              </ion-textarea>
            </ion-item>
            
            <ion-item *ngIf="settings.sceneTitleGeneration.useCustomPrompt">
              <ion-button fill="outline" size="small" (click)="resetToDefaultPrompt()">
                Standard-Prompt wiederherstellen
              </ion-button>
            </ion-item>
          </ion-card-content>
        </ion-card>

        <!-- Actions -->
        <div class="settings-actions">
          <ion-button expand="block" color="primary" (click)="saveSettings()" [disabled]="!hasUnsavedChanges">
            Einstellungen speichern
          </ion-button>
          <ion-button expand="block" fill="outline" color="medium" (click)="resetSettings()">
            Auf Standard zurücksetzen
          </ion-button>
          <ion-button expand="block" fill="outline" color="warning" (click)="testDropdown()">
            Debug: Test Dropdown
          </ion-button>
        </div>
      </div>
    </ion-content>
    </div>
  `,
  styles: [`
    ion-content {
      --background: #1a1a1a;
      --color: #e0e0e0;
    }

    /* Ensure ng-dropdown-panel appears above everything */
    :global(.ng-dropdown-panel-open) {
      overflow: visible !important;
    }

    .settings-content {
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
      padding-bottom: 4rem; /* Extra space for bottom buttons */
    }

    ion-card {
      margin-bottom: 1rem;
      --background: #2d2d2d;
      --color: #e0e0e0;
      overflow: visible !important;
    }

    ion-card-title {
      color: #f8f9fa;
      font-size: 1.2rem;
    }

    ion-card-content {
      overflow: visible !important;
    }

    ion-item {
      --background: transparent;
      --color: #e0e0e0;
      --border-color: rgba(255, 255, 255, 0.1);
    }

    ion-item.disabled {
      opacity: 0.5;
    }

    ion-input {
      --color: #e0e0e0;
      --placeholder-color: #6c757d;
    }

    ion-toggle {
      --background: #404040;
      --background-checked: var(--ion-color-primary);
      --handle-background: #ffffff;
      --handle-background-checked: #ffffff;
    }

    .settings-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0;
    }

    .settings-row.disabled {
      opacity: 0.5;
    }

    .settings-actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1rem;
      padding: 0 1rem;
    }

    .model-selection-wrapper {
      padding: 1rem;
      margin: 0.5rem 0;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
    }
    
    .model-selection-wrapper.disabled {
      opacity: 0.5;
    }

    .model-selection-container {
      width: 100%;
    }
    
    .model-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      width: 100%;
    }

    .model-info {
      margin-top: 0.5rem;
    }

    .model-info p {
      margin: 0.25rem 0;
      font-size: 0.85rem;
    }
    
    .error-text {
      color: var(--ion-color-danger) !important;
      font-weight: 500;
    }

    .info-text {
      color: #6c757d;
    }

    .model-option {
      padding: 0.5rem 0;
    }

    .model-option-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .provider-icon {
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
    }

    .provider-icon.gemini {
      color: #4285f4;
    }

    .provider-icon.openrouter {
      color: #00a67e;
    }

    .model-label {
      font-weight: 500;
      color: #e0e0e0;
    }

    .model-option-details {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      color: #999;
      margin-bottom: 0.25rem;
    }

    .model-description {
      font-size: 0.8rem;
      color: #777;
      line-height: 1.3;
    }

    .content-filter-section {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .section-title {
      color: #f8f9fa;
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 1rem 0;
      padding: 0 1rem;
    }
    
    .model-option {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .model-name {
      font-weight: 500;
      color: #e0e0e0;
    }
    
    .model-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      color: #9ca3af;
    }
    
    .model-cost {
      color: #10b981;
    }
    
    .model-context {
      color: #6b7280;
    }
    
    /* ng-select custom styling for dark theme */
    :global(.ng-select) {
      font-size: 1rem;
      position: relative !important;
    }
    
    /* Ensure dropdown appears above modals and other overlays */
    :global(.ng-select.ng-select-opened > .ng-select-container) {
      z-index: 1050 !important;
    }
    
    :global(.ng-select-custom) {
      width: 100% !important;
      display: block !important;
    }
    
    :global(.ng-select.ng-select-single .ng-select-container) {
      height: auto !important;
      min-height: 45px !important;
      background: #1a1a1a !important;
      border: 1px solid #404040 !important;
      border-radius: 6px !important;
      position: relative !important;
      z-index: 1001 !important;
    }
    
    :global(.ng-select .ng-select-container .ng-value-container) {
      background: #1a1a1a !important;
      padding-left: 0.75rem !important;
    }
    
    :global(.ng-select .ng-select-container .ng-value-container .ng-input > input) {
      color: #e0e0e0 !important;
      background: transparent !important;
    }
    
    :global(.ng-select .ng-select-container .ng-value-container .ng-placeholder) {
      color: #6c757d !important;
    }
    
    :global(.ng-select .ng-select-container .ng-value-container .ng-value) {
      color: #e0e0e0 !important;
      background: transparent !important;
    }
    
    :global(.ng-select .ng-arrow-wrapper) {
      width: 25px;
    }
    
    :global(.ng-select .ng-arrow-wrapper .ng-arrow) {
      border-color: #adb5bd transparent transparent;
    }
    
    :global(.ng-select.ng-select-focused .ng-select-container) {
      border-color: var(--ion-color-primary);
      box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
    }
    
    :global(.ng-select.ng-select-disabled .ng-select-container) {
      background: #242424 !important;
      cursor: not-allowed;
    }
    
    :global(.ng-dropdown-panel) {
      background: #2d2d2d !important;
      border: 1px solid #404040 !important;
      border-radius: 6px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
      z-index: 100000 !important;
      position: fixed !important;
      max-height: 400px !important;
      overflow-y: auto !important;
    }
    
    :global(.ng-dropdown-panel .ng-dropdown-panel-items) {
      background: #2d2d2d !important;
    }
    
    :global(.ng-dropdown-panel .ng-dropdown-panel-items .ng-option) {
      color: #e0e0e0 !important;
      background: #2d2d2d !important;
      padding: 0.75rem !important;
      border-bottom: 1px solid #404040;
    }
    
    :global(.ng-dropdown-panel .ng-dropdown-panel-items .ng-option:last-child) {
      border-bottom: none;
    }
    
    :global(.ng-dropdown-panel .ng-dropdown-panel-items .ng-option.ng-option-highlighted) {
      background: #383838 !important;
      color: #f8f9fa !important;
    }
    
    :global(.ng-dropdown-panel .ng-dropdown-panel-items .ng-option.ng-option-selected) {
      background: var(--ion-color-primary) !important;
      color: white !important;
    }
    
    :global(.ng-dropdown-panel .ng-dropdown-panel-items .ng-option.ng-option-selected.ng-option-highlighted) {
      background: var(--ion-color-primary-shade) !important;
      color: white !important;
    }

    .prompt-help {
      margin-top: 0.5rem;
      font-size: 0.8rem;
      color: var(--ion-color-medium);
      font-style: italic;
    }

    /* Mobile responsive adjustments */
    @media (max-width: 768px) {
      .settings-content {
        padding: 0.5rem;
      }

      .settings-row {
        grid-template-columns: 1fr;
      }

      .model-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
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
  geminiModels: ModelOption[] = [];
  combinedModels: ModelOption[] = [];
  loadingModels = false;
  modelLoadError: string | null = null;

  constructor(
    private router: Router,
    private settingsService: SettingsService,
    private modelService: ModelService
  ) {
    this.settings = this.settingsService.getSettings();
    // Register Ionic icons
    addIcons({ arrowBack, analytics, warning, checkmarkCircle, globeOutline, logoGoogle });
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
    
    this.subscription.add(
      this.modelService.geminiModels$.subscribe(models => {
        this.geminiModels = models;
      })
    );
    
    // Initial auto-load check
    this.autoLoadModelsIfNeeded();
    
    // Load combined models if any API is enabled
    if ((this.settings.openRouter.enabled && this.settings.openRouter.apiKey) ||
        (this.settings.googleGemini.enabled && this.settings.googleGemini.apiKey)) {
      this.loadCombinedModels();
    }
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
  
  onApiKeyChange(provider: 'openRouter' | 'replicate' | 'googleGemini'): void {
    this.onSettingsChange();
    
    // Auto-load models when API key is entered and provider is enabled
    // This ensures models are available for selection
    if (provider === 'openRouter' && this.settings.openRouter.enabled && this.settings.openRouter.apiKey) {
      console.log('API key entered for OpenRouter, loading models...');
      this.modelService.loadOpenRouterModels().subscribe();
    } else if (provider === 'replicate' && this.settings.replicate.enabled && this.settings.replicate.apiKey) {
      console.log('API key entered for Replicate, loading models...');
      this.modelService.loadReplicateModels().subscribe();
    } else if (provider === 'googleGemini' && this.settings.googleGemini.enabled && this.settings.googleGemini.apiKey) {
      console.log('API key entered for Google Gemini, loading models...');
      this.modelService.loadGeminiModels().subscribe();
    }
  }
  
  onProviderToggle(provider: 'openRouter' | 'replicate' | 'googleGemini'): void {
    // No more mutual exclusion - both can be enabled at the same time
    this.onSettingsChange();
    
    // Load models when provider is enabled and has API key
    // This ensures models are available when user enables a provider
    if (provider === 'openRouter' && this.settings.openRouter.enabled && this.settings.openRouter.apiKey) {
      console.log('OpenRouter enabled, loading models...');
      this.modelService.loadOpenRouterModels().subscribe();
    } else if (provider === 'replicate' && this.settings.replicate.enabled && this.settings.replicate.apiKey) {
      console.log('Replicate enabled, loading models...');
      this.modelService.loadReplicateModels().subscribe();
    } else if (provider === 'googleGemini' && this.settings.googleGemini.enabled && this.settings.googleGemini.apiKey) {
      console.log('Google Gemini enabled, loading models...');
      this.modelService.loadGeminiModels().subscribe();
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
    
    // Auto-load Gemini models if:
    // 1. Gemini is enabled
    // 2. API key is present
    // 3. A model is already selected
    // 4. Models haven't been loaded yet
    if (this.settings.googleGemini.enabled && 
        this.settings.googleGemini.apiKey && 
        this.settings.googleGemini.model && 
        this.geminiModels.length === 0 &&
        !this.loadingModels) {
      console.log('Auto-loading Gemini models because model is selected:', this.settings.googleGemini.model);
      this.modelService.loadGeminiModels().subscribe();
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
        this.router.navigate(['/logs']);
      }
    } else {
      this.router.navigate(['/logs']);
    }
  }
  
  onDropdownOpen(provider: string): void {
    console.log(`${provider} dropdown opened`);
    console.log(`${provider} models available:`, provider === 'openRouter' ? this.openRouterModels.length : this.replicateModels.length);
  }
  
  onDropdownClose(provider: string): void {
    console.log(`${provider} dropdown closed`);
  }
  
  testDropdown(): void {
    console.log('Testing dropdown functionality...');
    console.log('OpenRouter enabled:', this.settings.openRouter.enabled);
    console.log('OpenRouter models:', this.openRouterModels);
    console.log('Replicate enabled:', this.settings.replicate.enabled);
    console.log('Replicate models:', this.replicateModels);
  }

  loadCombinedModels(): void {
    this.modelLoadError = null;
    this.modelService.getCombinedModels().subscribe({
      next: (models) => {
        this.combinedModels = models;
        console.log('Combined models loaded successfully:', models);
        
        // If there's a previously selected model, ensure it's still in the list
        if (this.settings.selectedModel && !models.find(m => m.id === this.settings.selectedModel)) {
          console.warn('Previously selected model not found in combined models:', this.settings.selectedModel);
        }
      },
      error: (error) => {
        console.error('Failed to load combined models:', error);
        this.modelLoadError = 'Fehler beim Laden der Modelle. Überprüfen Sie Ihre API-Keys und Internetverbindung.';
      }
    });
  }

  onGlobalModelChange(): void {
    console.log('Global model changed to:', this.settings.selectedModel);
    
    // Update the individual API model settings based on the selected model
    if (this.settings.selectedModel) {
      const [provider, ...modelIdParts] = this.settings.selectedModel.split(':');
      const modelId = modelIdParts.join(':'); // Rejoin in case model ID contains colons
      
      if (provider === 'openrouter') {
        this.settings.openRouter.model = modelId;
      } else if (provider === 'gemini') {
        this.settings.googleGemini.model = modelId;
      }
    }
    
    this.onSettingsChange();
  }

  resetToDefaultPrompt(): void {
    const defaultPrompt = 'Erstelle einen Titel für die folgende Szene. Der Titel soll bis zu {maxWords} Wörter lang sein und den Kern der Szene erfassen.\n\n{styleInstruction}\n{genreInstruction}\n{languageInstruction}{customInstruction}\n\nSzenencontent (nur diese eine Szene):\n{sceneContent}\n\nAntworte nur mit dem Titel, ohne weitere Erklärungen oder Anführungszeichen.';
    this.settings.sceneTitleGeneration.customPrompt = defaultPrompt;
    this.onSettingsChange();
  }
}