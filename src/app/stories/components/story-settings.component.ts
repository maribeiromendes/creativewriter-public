import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoryService } from '../services/story.service';
import { Story, StorySettings, DEFAULT_STORY_SETTINGS } from '../models/story.interface';

@Component({
  selector: 'app-story-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container">
      <div class="settings-header">
        <button class="back-btn" (click)="goBack()">← Zurück zum Editor</button>
        <h1>Story-Einstellungen</h1>
        <div class="save-status" [class.saved]="!hasUnsavedChanges">
          {{ hasUnsavedChanges ? 'Nicht gespeichert' : 'Gespeichert' }}
        </div>
      </div>

      <div class="settings-content" *ngIf="story">
        <div class="story-info">
          <h2>{{ story.title || 'Unbenannte Geschichte' }}</h2>
          <p class="story-meta">Erstellt: {{ story.createdAt | date:'short' }} | Zuletzt bearbeitet: {{ story.updatedAt | date:'short' }}</p>
        </div>

        <div class="settings-section">
          <h3>AI System Message</h3>
          <p class="section-description">
            Diese Nachricht definiert den Kontext und die Persönlichkeit des AI-Assistenten für diese Geschichte.
          </p>
          <textarea
            class="settings-textarea"
            [(ngModel)]="settings.systemMessage"
            (ngModelChange)="onSettingsChange()"
            placeholder="Geben Sie die System-Nachricht ein..."
            rows="6"
          ></textarea>
          <div class="char-count">{{ settings.systemMessage.length }} Zeichen</div>
        </div>

        <div class="settings-section">
          <h3>Beat Generation Template</h3>
          <p class="section-description">
            Template-Struktur für Beat-Generierung mit Kontext. Verfügbare Platzhalter:
          </p>
          <div class="template-placeholders">
            <div class="placeholder-grid">
              <span class="placeholder-item">{{ '{SystemMessage}' }}</span>
              <span class="placeholder-item">{{ '{codexEntries}' }}</span>
              <span class="placeholder-item">{{ '{summariesOfScenesBefore}' }}</span>
              <span class="placeholder-item">{{ '{sceneFullText}' }}</span>
              <span class="placeholder-item">{{ '{wordCount}' }}</span>
              <span class="placeholder-item">{{ '{prompt}' }}</span>
              <span class="placeholder-item">{{ '{writingStyle}' }}</span>
            </div>
          </div>
          <textarea
            class="settings-textarea large"
            [(ngModel)]="settings.beatGenerationTemplate"
            (ngModelChange)="onSettingsChange()"
            placeholder="Geben Sie das Beat-Template ein..."
            rows="12"
          ></textarea>
          <div class="char-count">{{ settings.beatGenerationTemplate.length }} Zeichen</div>
          <div class="template-hint" *ngIf="!settings.beatGenerationTemplate.includes('{prompt}')">
            ⚠️ Das Template sollte {{ '{prompt}' }} enthalten, um den Benutzer-Prompt einzufügen.
          </div>
        </div>

        <div class="settings-section">
          <h3>Beat AI Konfiguration</h3>
          <p class="section-description">
            Konfiguration für die Beat AI Generierung.
          </p>
          
          <div class="setting-group">
            <label class="setting-label">
              <input
                type="checkbox"
                [(ngModel)]="settings.useFullStoryContext"
                (ngModelChange)="onSettingsChange()"
              />
              <span class="checkmark"></span>
              Vollständigen Story-Kontext verwenden
            </label>
            <p class="setting-description">
              Wenn aktiviert, wird der vollständige Text aller Szenen als Kontext verwendet. 
              Andernfalls werden nur Zusammenfassungen verwendet (falls verfügbar).
            </p>
          </div>

          <div class="setting-group">
            <label class="setting-label-text">Beat Anweisung</label>
            <p class="setting-description">
              Standardanweisung für die Beat AI Generierung.
            </p>
            <div class="radio-group">
              <label class="radio-label">
                <input
                  type="radio"
                  name="beatInstruction"
                  value="continue"
                  [(ngModel)]="settings.beatInstruction"
                  (ngModelChange)="onSettingsChange()"
                />
                <span class="radio-mark"></span>
                Setze die Geschichte fort
              </label>
              <label class="radio-label">
                <input
                  type="radio"
                  name="beatInstruction"
                  value="stay"
                  [(ngModel)]="settings.beatInstruction"
                  (ngModelChange)="onSettingsChange()"
                />
                <span class="radio-mark"></span>
                Bleibe im Moment
              </label>
            </div>
          </div>
        </div>

        <div class="settings-actions">
          <button class="btn btn-primary" (click)="saveSettings()" [disabled]="!hasUnsavedChanges">
            Einstellungen speichern
          </button>
          <button class="btn btn-secondary" (click)="resetToDefaults()">
            Auf Standard zurücksetzen
          </button>
        </div>
      </div>

      <div class="no-story" *ngIf="!story">
        <p>Geschichte nicht gefunden.</p>
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

    .story-info {
      background: #2d2d2d;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .story-info h2 {
      margin: 0 0 0.5rem 0;
      color: #f8f9fa;
    }

    .story-meta {
      margin: 0;
      color: #adb5bd;
      font-size: 0.9rem;
    }

    .settings-section {
      background: #2d2d2d;
      border-radius: 8px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .settings-section h3 {
      margin: 0 0 0.5rem 0;
      color: #f8f9fa;
      font-size: 1.3rem;
    }

    .section-description {
      color: #adb5bd;
      margin: 0 0 1rem 0;
      font-size: 0.95rem;
    }

    .settings-textarea {
      width: 100%;
      padding: 1rem;
      background: #1a1a1a;
      border: 1px solid #404040;
      border-radius: 6px;
      color: #e0e0e0;
      font-family: 'Courier New', monospace;
      font-size: 0.95rem;
      line-height: 1.5;
      resize: vertical;
      min-height: 120px;
    }

    .settings-textarea:focus {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
    }

    .char-count {
      text-align: right;
      color: #6c757d;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }

    .template-hint {
      color: #ffc107;
      font-size: 0.9rem;
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(255, 193, 7, 0.1);
      border-radius: 4px;
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

    .no-story {
      text-align: center;
      padding: 3rem;
      color: #adb5bd;
    }

    .setting-group {
      margin: 1.5rem 0;
    }

    .setting-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      font-weight: 500;
      color: #f8f9fa;
      margin-bottom: 0.5rem;
    }

    .setting-label-text {
      display: block;
      font-weight: 500;
      color: #f8f9fa;
      margin-bottom: 0.5rem;
    }

    .setting-description {
      color: #adb5bd;
      font-size: 0.9rem;
      margin: 0.5rem 0 1rem 0;
      line-height: 1.4;
    }

    .checkmark {
      width: 20px;
      height: 20px;
      border: 2px solid #6c757d;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }

    input[type="checkbox"]:checked + .checkmark {
      background: #0d6efd;
      border-color: #0d6efd;
    }

    input[type="checkbox"]:checked + .checkmark::after {
      content: '✓';
      color: white;
      font-size: 12px;
      font-weight: bold;
    }

    input[type="checkbox"] {
      display: none;
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .radio-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      color: #e0e0e0;
      transition: color 0.3s;
    }

    .radio-label:hover {
      color: #f8f9fa;
    }

    .radio-mark {
      width: 18px;
      height: 18px;
      border: 2px solid #6c757d;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }

    input[type="radio"]:checked + .radio-mark {
      border-color: #0d6efd;
    }

    input[type="radio"]:checked + .radio-mark::after {
      content: '';
      width: 8px;
      height: 8px;
      background: #0d6efd;
      border-radius: 50%;
    }

    input[type="radio"] {
      display: none;
    }

    .template-placeholders {
      margin: 1rem 0;
      padding: 1rem;
      background: #2a2a2a;
      border-radius: 6px;
      border: 1px solid #404040;
    }

    .placeholder-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.5rem;
    }

    .placeholder-item {
      background: #1a1a1a;
      border: 1px solid #495057;
      padding: 0.5rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      color: #ffc107;
      text-align: center;
    }

    .settings-textarea.large {
      min-height: 200px;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .placeholder-grid {
        grid-template-columns: 1fr;
      }
      
      .settings-textarea.large {
        min-height: 150px;
        font-size: 0.85rem;
      }
    }
  `]
})
export class StorySettingsComponent implements OnInit {
  story: Story | null = null;
  settings: StorySettings = { ...DEFAULT_STORY_SETTINGS };
  hasUnsavedChanges = false;
  private originalSettings!: StorySettings;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storyService: StoryService
  ) {}

  async ngOnInit(): Promise<void> {
    const storyId = this.route.snapshot.paramMap.get('id');
    if (storyId) {
      this.story = await this.storyService.getStory(storyId);
      if (this.story) {
        // Load existing settings or use defaults
        this.settings = this.story.settings 
          ? { ...this.story.settings } 
          : { ...DEFAULT_STORY_SETTINGS };
        this.originalSettings = { ...this.settings };
      } else {
        this.router.navigate(['/']);
      }
    }
  }

  onSettingsChange(): void {
    this.hasUnsavedChanges = 
      JSON.stringify(this.settings) !== JSON.stringify(this.originalSettings);
  }

  async saveSettings(): Promise<void> {
    if (!this.story) return;

    // Update story with new settings
    this.story.settings = { ...this.settings };
    await this.storyService.updateStory(this.story);
    
    this.originalSettings = { ...this.settings };
    this.hasUnsavedChanges = false;
  }

  resetToDefaults(): void {
    if (confirm('Möchten Sie die Einstellungen wirklich auf die Standardwerte zurücksetzen?')) {
      this.settings = { ...DEFAULT_STORY_SETTINGS };
      this.onSettingsChange();
    }
  }

  goBack(): void {
    if (this.hasUnsavedChanges) {
      if (confirm('Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?')) {
        this.navigateBack();
      }
    } else {
      this.navigateBack();
    }
  }

  private navigateBack(): void {
    if (this.story) {
      this.router.navigate(['/stories/editor', this.story.id]);
    } else {
      this.router.navigate(['/']);
    }
  }
}