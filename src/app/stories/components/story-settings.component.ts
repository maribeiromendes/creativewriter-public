import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel,
  IonTextarea, IonCheckbox, IonRadio, IonRadioGroup, IonChip, IonNote,
  IonText, IonGrid, IonRow, IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack, saveOutline, refreshOutline, checkmarkCircleOutline,
  warningOutline, informationCircleOutline, codeSlashOutline
} from 'ionicons/icons';
import { StoryService } from '../services/story.service';
import { Story, StorySettings, DEFAULT_STORY_SETTINGS } from '../models/story.interface';

@Component({
  selector: 'app-story-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel,
    IonTextarea, IonCheckbox, IonRadio, IonRadioGroup, IonChip, IonNote,
    IonText, IonGrid, IonRow, IonCol
  ],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-button (click)="goBack()">
            <ion-icon name="arrow-back" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Story-Einstellungen</ion-title>
        <ion-buttons slot="end">
          <ion-chip [color]="hasUnsavedChanges ? 'warning' : 'success'">
            <ion-icon [name]="hasUnsavedChanges ? 'warning-outline' : 'checkmark-circle-outline'"></ion-icon>
            <ion-label>{{ hasUnsavedChanges ? 'Nicht gespeichert' : 'Gespeichert' }}</ion-label>
          </ion-chip>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content color="dark" *ngIf="story">
      <ion-card class="story-info-card">
        <ion-card-header>
          <ion-card-title>{{ story.title || 'Unbenannte Geschichte' }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-note>
            Erstellt: {{ story.createdAt | date:'short' }} | Zuletzt bearbeitet: {{ story.updatedAt | date:'short' }}
          </ion-note>
        </ion-card-content>
      </ion-card>

      <ion-card class="settings-section">
        <ion-card-header>
          <ion-card-title>AI System Message</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-text color="medium">
            <p>Diese Nachricht definiert den Kontext und die Persönlichkeit des AI-Assistenten für diese Geschichte.</p>
          </ion-text>
          <ion-textarea
            [(ngModel)]="settings.systemMessage"
            (ionInput)="onSettingsChange()"
            placeholder="Geben Sie die System-Nachricht ein..."
            rows="6"
            class="settings-textarea"
            auto-grow="true">
          </ion-textarea>
          <ion-note class="char-count">{{ settings.systemMessage.length }} Zeichen</ion-note>
        </ion-card-content>
      </ion-card>

      <ion-card class="settings-section">
        <ion-card-header>
          <ion-card-title>Beat Generation Template</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-text color="medium">
            <p>Template-Struktur für Beat-Generierung mit Kontext. Verfügbare Platzhalter:</p>
          </ion-text>
          
          <div class="template-placeholders">
            <ion-grid>
              <ion-row>
                <ion-col size="12" size-md="6" size-lg="4" *ngFor="let placeholder of placeholders">
                  <ion-chip color="warning" class="placeholder-chip">
                    <ion-icon name="code-slash-outline"></ion-icon>
                    <ion-label>{{ placeholder }}</ion-label>
                  </ion-chip>
                </ion-col>
              </ion-row>
            </ion-grid>
          </div>
          
          <ion-textarea
            [(ngModel)]="settings.beatGenerationTemplate"
            (ionInput)="onSettingsChange()"
            placeholder="Geben Sie das Beat-Template ein..."
            rows="12"
            class="settings-textarea large"
            auto-grow="true">
          </ion-textarea>
          
          <ion-note class="char-count">{{ settings.beatGenerationTemplate.length }} Zeichen</ion-note>
          
          <ion-item *ngIf="!settings.beatGenerationTemplate.includes('{prompt}')" class="template-warning">
            <ion-icon name="warning-outline" color="warning" slot="start"></ion-icon>
            <ion-label color="warning">
              Das Template sollte {{ '{prompt}' }} enthalten, um den Benutzer-Prompt einzufügen.
            </ion-label>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <ion-card class="settings-section">
        <ion-card-header>
          <ion-card-title>Beat AI Konfiguration</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-text color="medium">
            <p>Konfiguration für die Beat AI Generierung.</p>
          </ion-text>
          
          <ion-item class="setting-item">
            <ion-checkbox
              [(ngModel)]="settings.useFullStoryContext"
              (ionChange)="onSettingsChange()"
              slot="start">
            </ion-checkbox>
            <ion-label>
              <h3>Vollständigen Story-Kontext verwenden</h3>
              <p>Wenn aktiviert, wird der vollständige Text aller Szenen als Kontext verwendet. Andernfalls werden nur Zusammenfassungen verwendet (falls verfügbar).</p>
            </ion-label>
          </ion-item>

          <ion-item class="radio-section">
            <ion-label>
              <h3>Beat Anweisung</h3>
              <p>Standardanweisung für die Beat AI Generierung.</p>
            </ion-label>
          </ion-item>
          
          <ion-radio-group
            [(ngModel)]="settings.beatInstruction"
            (ionChange)="onSettingsChange()">
            <ion-item>
              <ion-radio slot="start" value="continue"></ion-radio>
              <ion-label>Setze die Geschichte fort</ion-label>
            </ion-item>
            <ion-item>
              <ion-radio slot="start" value="stay"></ion-radio>
              <ion-label>Bleibe im Moment</ion-label>
            </ion-item>
          </ion-radio-group>
        </ion-card-content>
      </ion-card>

      <div class="settings-actions">
        <ion-button 
          expand="block" 
          color="primary" 
          (click)="saveSettings()" 
          [disabled]="!hasUnsavedChanges"
          class="save-button">
          <ion-icon name="save-outline" slot="start"></ion-icon>
          Einstellungen speichern
        </ion-button>
        
        <ion-button 
          expand="block" 
          fill="outline" 
          color="medium" 
          (click)="resetToDefaults()"
          class="reset-button">
          <ion-icon name="refresh-outline" slot="start"></ion-icon>
          Auf Standard zurücksetzen
        </ion-button>
      </div>
    </ion-content>

    <ion-content color="dark" *ngIf="!story">
      <div class="no-story">
        <ion-text color="medium">
          <p>Geschichte nicht gefunden.</p>
        </ion-text>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: var(--ion-color-dark);
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 16px;
      --padding-bottom: 16px;
    }

    .story-info-card {
      --background: var(--ion-color-dark-shade);
      margin-bottom: 1rem;
    }

    .settings-section {
      --background: var(--ion-color-dark-shade);
      margin-bottom: 1rem;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    }

    .setting-item {
      --background: transparent;
      --padding-start: 0;
      --padding-end: 0;
      margin: 1rem 0;
    }

    .radio-section {
      --background: transparent;
      --padding-start: 0;
      --padding-end: 0;
      margin-bottom: 0.5rem;
    }

    .settings-textarea {
      --background: var(--ion-color-dark);
      --color: var(--ion-color-light);
      --placeholder-color: var(--ion-color-medium);
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 16px;
      --padding-bottom: 16px;
      font-family: 'Courier New', monospace;
      font-size: 0.95rem;
      margin-top: 1rem;
    }

    .settings-textarea.large {
      min-height: 200px;
    }

    .char-count {
      display: block;
      text-align: right;
      margin-top: 0.5rem;
    }

    .template-warning {
      --background: rgba(255, 193, 7, 0.1);
      margin-top: 1rem;
    }

    .settings-actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 2rem auto;
      max-width: 800px;
      padding: 0 1rem;
    }

    .save-button {
      --background: var(--ion-color-primary);
    }

    .reset-button {
      --color: var(--ion-color-medium);
      --border-color: var(--ion-color-medium);
    }

    .no-story {
      text-align: center;
      padding: 3rem;
    }

    ion-radio-group ion-item {
      --background: transparent;
      --padding-start: 0;
      --padding-end: 0;
    }

    .template-placeholders {
      margin: 1rem 0;
      padding: 1rem;
      background: var(--ion-color-dark);
      border-radius: 8px;
      border: 1px solid var(--ion-color-dark-tint);
    }

    .placeholder-chip {
      width: 100%;
      justify-content: center;
      margin-bottom: 0.5rem;
      --background: transparent;
      --color: var(--ion-color-warning);
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
    }

    @media (max-width: 768px) {
      .settings-actions {
        padding: 0 0.5rem;
      }
      
      .settings-textarea.large {
        min-height: 150px;
      }
    }
  `]
})
export class StorySettingsComponent implements OnInit {
  story: Story | null = null;
  settings: StorySettings = { ...DEFAULT_STORY_SETTINGS };
  hasUnsavedChanges = false;
  private originalSettings!: StorySettings;
  
  placeholders = [
    '{SystemMessage}',
    '{codexEntries}',
    '{summariesOfScenesBefore}',
    '{sceneFullText}',
    '{wordCount}',
    '{prompt}',
    '{writingStyle}'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storyService: StoryService
  ) {
    addIcons({ 
      arrowBack, saveOutline, refreshOutline, checkmarkCircleOutline,
      warningOutline, informationCircleOutline, codeSlashOutline
    });
  }

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