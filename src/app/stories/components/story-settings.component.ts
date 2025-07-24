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
    <div class="ion-page">
      <ion-header>
        <ion-toolbar>
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

      <ion-content *ngIf="story">
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
            <p>XML-Template für Beat-Generierung im Messages-Format. Verfügbare Platzhalter:</p>
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

      <ion-content *ngIf="!story">
        <div class="no-story">
          <ion-text color="medium">
            <p>Geschichte nicht gefunden.</p>
          </ion-text>
        </div>
      </ion-content>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      min-height: 100vh;
      
      background: 
        /* Dark overlay for text readability */
        linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)),
        /* Main anime image */
        url('/assets/cyberpunk-anime-girl.png'),
        /* Fallback dark background */
        #1a1a1a;
      
      background-size: cover, cover, auto;
      background-position: center, center, center;
      background-repeat: no-repeat, no-repeat, repeat;
      background-attachment: fixed, fixed, scroll;
    }
    
    .ion-page {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: transparent;
    }
    
    ion-header {
      backdrop-filter: blur(15px);
      background: rgba(45, 45, 45, 0.85);
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
      position: relative;
      z-index: 100;
    }
    
    ion-toolbar {
      --background: transparent;
      --color: #f8f9fa;
    }
    
    ion-title {
      background: linear-gradient(135deg, #f8f9fa 0%, #8bb4f8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    ion-content {
      --background: transparent !important;
      background: transparent !important;
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 16px;
      --padding-bottom: 16px;
      flex: 1;
    }
    
    ion-content::part(background) {
      background: transparent !important;
    }

    .story-info-card {
      background: linear-gradient(135deg, rgba(20, 20, 20, 0.3) 0%, rgba(15, 15, 15, 0.3) 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(8px) saturate(120%);
      -webkit-backdrop-filter: blur(8px) saturate(120%);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
      margin-bottom: 1rem;
      --color: #f8f9fa;
    }
    
    .story-info-card:hover {
      background: linear-gradient(135deg, rgba(25, 25, 25, 0.4) 0%, rgba(20, 20, 20, 0.4) 100%);
      border-color: rgba(71, 118, 230, 0.3);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      transform: translateY(-2px);
    }

    .settings-section {
      background: linear-gradient(135deg, rgba(20, 20, 20, 0.3) 0%, rgba(15, 15, 15, 0.3) 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(8px) saturate(120%);
      -webkit-backdrop-filter: blur(8px) saturate(120%);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
      margin-bottom: 1rem;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
      --color: #f8f9fa;
    }
    
    .settings-section:hover {
      background: linear-gradient(135deg, rgba(25, 25, 25, 0.4) 0%, rgba(20, 20, 20, 0.4) 100%);
      border-color: rgba(71, 118, 230, 0.3);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      transform: translateY(-2px);
    }
    
    /* Ensure card headers and titles are transparent */
    ion-card-header {
      background: transparent !important;
      --background: transparent !important;
    }
    
    ion-card-title {
      color: #f8f9fa !important;
      --color: #f8f9fa !important;
    }
    
    ion-card-content {
      background: transparent !important;
      --background: transparent !important;
    }
    
    .story-info-card ion-card-header,
    .story-info-card ion-card-content,
    .settings-section ion-card-header,
    .settings-section ion-card-content {
      background: transparent !important;
    }
    
    .story-info-card ion-card-title,
    .settings-section ion-card-title {
      color: #f8f9fa !important;
    }

    .setting-item {
      --background: transparent;
      --padding-start: 0;
      --padding-end: 0;
      margin: 1rem 0;
    }
    
    /* Make textareas transparent */
    ion-textarea {
      --background: rgba(30, 30, 30, 0.3);
      --color: #f8f9fa;
      --placeholder-color: #adb5bd;
      --placeholder-opacity: 0.8;
      backdrop-filter: blur(5px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 0.75rem;
      transition: all 0.3s ease;
    }
    
    ion-textarea:hover,
    ion-textarea:focus {
      --background: rgba(30, 30, 30, 0.4);
      border-color: rgba(71, 118, 230, 0.5);
      box-shadow: 0 0 0 2px rgba(71, 118, 230, 0.2);
    }
    
    .settings-textarea {
      margin-top: 1rem;
      font-family: monospace;
      font-size: 0.9rem;
    }
    
    .settings-textarea.large {
      min-height: 300px;
    }
    
    /* Also make ion-input transparent */
    ion-input {
      --background: rgba(30, 30, 30, 0.3);
      --color: #f8f9fa;
      --placeholder-color: #adb5bd;
      --placeholder-opacity: 0.8;
      backdrop-filter: blur(5px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 0.5rem;
      transition: all 0.3s ease;
    }
    
    ion-input:hover,
    ion-input:focus {
      --background: rgba(30, 30, 30, 0.4);
      border-color: rgba(71, 118, 230, 0.5);
      box-shadow: 0 0 0 2px rgba(71, 118, 230, 0.2);
    }

    .radio-section {
      --background: transparent;
      --padding-start: 0;
      --padding-end: 0;
      margin-bottom: 0.5rem;
    }

    .settings-textarea {
      --background: rgba(30, 30, 30, 0.3) !important;
      --color: #f8f9fa !important;
      --placeholder-color: #adb5bd !important;
      --placeholder-opacity: 0.8 !important;
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 16px;
      --padding-bottom: 16px;
      backdrop-filter: blur(5px) !important;
      -webkit-backdrop-filter: blur(5px) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 0.95rem;
      margin-top: 1rem;
      background: rgba(30, 30, 30, 0.3) !important;
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
      --background: #0d6efd;
    }

    .reset-button {
      --color: #6c757d;
      --border-color: #6c757d;
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
      background: rgba(30, 30, 30, 0.3);
      backdrop-filter: blur(5px);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .placeholder-chip {
      width: 100%;
      justify-content: center;
      margin-bottom: 0.5rem;
      --background: transparent;
      --color: #ffc107;
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
    '{systemMessage}',
    '{codexEntries}',
    '{storySoFar}',
    '{storyTitle}',
    '{sceneFullText}',
    '{wordCount}',
    '{prompt}',
    '{pointOfView}',
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