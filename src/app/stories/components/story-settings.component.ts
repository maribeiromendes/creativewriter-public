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
          <h3>Beat Template</h3>
          <p class="section-description">
            Dieses Template wird verwendet, wenn die AI neue Beats generiert. Verwenden Sie {{ '{prompt}' }} als Platzhalter für den Benutzer-Prompt.
          </p>
          <textarea
            class="settings-textarea"
            [(ngModel)]="settings.beatTemplate"
            (ngModelChange)="onSettingsChange()"
            placeholder="Geben Sie das Beat-Template ein..."
            rows="6"
          ></textarea>
          <div class="char-count">{{ settings.beatTemplate.length }} Zeichen</div>
          <div class="template-hint" *ngIf="!settings.beatTemplate.includes('{prompt}')">
            ⚠️ Das Template sollte {{ '{prompt}' }} enthalten, um den Benutzer-Prompt einzufügen.
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

  ngOnInit(): void {
    const storyId = this.route.snapshot.paramMap.get('id');
    if (storyId) {
      this.story = this.storyService.getStory(storyId);
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

  saveSettings(): void {
    if (!this.story) return;

    // Update story with new settings
    this.story.settings = { ...this.settings };
    this.storyService.updateStory(this.story);
    
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