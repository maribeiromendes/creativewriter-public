import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SettingsService } from '../core/services/settings.service';
import { Settings } from '../core/models/settings.interface';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container">
      <div class="settings-header">
        <button class="back-btn" (click)="goBack()">← Zurück</button>
        <h1>Einstellungen</h1>
        <div class="save-status" [class.saved]="!hasUnsavedChanges">
          {{ hasUnsavedChanges ? 'Nicht gespeichert' : 'Gespeichert' }}
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
                (ngModelChange)="onSettingsChange()"
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
              (ngModelChange)="onSettingsChange()"
              placeholder="sk-or-v1-..."
              [disabled]="!settings.openRouter.enabled"
            />
            <small>Ihren OpenRouter API Key finden Sie unter openrouter.ai/keys</small>
          </div>

          <div class="settings-group" [class.disabled]="!settings.openRouter.enabled">
            <label>Model</label>
            <select 
              [(ngModel)]="settings.openRouter.model"
              (ngModelChange)="onSettingsChange()"
              [disabled]="!settings.openRouter.enabled"
            >
              <option value="anthropic/claude-3-opus">Claude 3 Opus</option>
              <option value="anthropic/claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
              <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
              <option value="openai/gpt-4">GPT-4</option>
              <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B</option>
              <option value="meta-llama/llama-3-8b-instruct">Llama 3 8B</option>
            </select>
          </div>

          <div class="settings-row" [class.disabled]="!settings.openRouter.enabled">
            <div class="settings-group">
              <label>Max Tokens</label>
              <input 
                type="number"
                [(ngModel)]="settings.openRouter.maxTokens"
                (ngModelChange)="onSettingsChange()"
                min="100"
                max="32000"
                [disabled]="!settings.openRouter.enabled"
              />
            </div>

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
                (ngModelChange)="onSettingsChange()"
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
              (ngModelChange)="onSettingsChange()"
              placeholder="r8_..."
              [disabled]="!settings.replicate.enabled"
            />
            <small>Ihren Replicate API Key finden Sie unter replicate.com/account/api-tokens</small>
          </div>

          <div class="settings-group" [class.disabled]="!settings.replicate.enabled">
            <label>Model</label>
            <input 
              type="text"
              [(ngModel)]="settings.replicate.model"
              (ngModelChange)="onSettingsChange()"
              placeholder="meta/llama-2-70b-chat"
              [disabled]="!settings.replicate.enabled"
            />
            <small>Format: owner/model-name</small>
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
      gap: 2rem;
      padding: 1.5rem 2rem;
      background: #2d2d2d;
      border-bottom: 1px solid #404040;
    }

    .settings-header h1 {
      flex: 1;
      margin: 0;
      font-size: 1.8rem;
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
      grid-template-columns: repeat(3, 1fr);
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
  `]
})
export class SettingsComponent implements OnInit, OnDestroy {
  settings: Settings;
  hasUnsavedChanges = false;
  private originalSettings!: Settings;
  private subscription: Subscription = new Subscription();

  constructor(
    private router: Router,
    private settingsService: SettingsService
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
      })
    );
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

  goBack(): void {
    if (this.hasUnsavedChanges) {
      if (confirm('Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?')) {
        this.router.navigate(['/']);
      }
    } else {
      this.router.navigate(['/']);
    }
  }
}