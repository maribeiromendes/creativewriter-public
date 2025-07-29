import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonGrid, IonRow, IonCol, IonText, IonCard, IonCardContent } from '@ionic/angular/standalone';
import { checkmarkCircle } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { SettingsService } from '../../core/services/settings.service';

interface BackgroundOption {
  filename: string;
  displayName: string;
  previewPath: string;
}

@Component({
  selector: 'app-background-selector',
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonText,
    IonCard,
    IonCardContent
  ],
  template: `
    <div class="background-selector">
      <h3>Hintergrund auswählen</h3>
      
      <ion-grid>
        <ion-row>
          <!-- Default option (no background) -->
          <ion-col size="6" size-md="4" size-lg="3">
            <ion-card 
              [class.selected]="selectedBackground() === 'none'"
              (click)="selectBackground('none')"
              button
            >
              <ion-card-content class="preview-card">
                <div class="preview-container no-background">
                  <div class="no-bg-placeholder">
                    <ion-text>Kein Hintergrund</ion-text>
                  </div>
                </div>
                <div class="background-name">Standard</div>
                <ion-icon 
                  *ngIf="selectedBackground() === 'none'"
                  name="checkmark-circle"
                  class="selected-icon"
                ></ion-icon>
              </ion-card-content>
            </ion-card>
          </ion-col>

          <!-- Background image options -->
          <ion-col 
            size="6" 
            size-md="4" 
            size-lg="3"
            *ngFor="let background of backgroundOptions"
          >
            <ion-card 
              [class.selected]="selectedBackground() === background.filename"
              (click)="selectBackground(background.filename)"
              button
            >
              <ion-card-content class="preview-card">
                <div class="preview-container">
                  <img 
                    [src]="background.previewPath" 
                    [alt]="background.displayName"
                    class="background-preview"
                    loading="lazy"
                  />
                </div>
                <div class="background-name">{{ background.displayName }}</div>
                <ion-icon 
                  *ngIf="selectedBackground() === background.filename"
                  name="checkmark-circle"
                  class="selected-icon"
                ></ion-icon>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </div>
  `,
  styles: [`
    .background-selector {
      padding: 1rem;
    }

    .background-selector h3 {
      color: var(--ion-color-primary);
      margin-bottom: 1rem;
      font-size: 1.2rem;
    }

    .preview-card {
      position: relative;
      padding: 0.75rem;
      text-align: center;
    }

    .preview-container {
      position: relative;
      width: 100%;
      height: 80px;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 0.5rem;
      border: 2px solid var(--ion-color-medium);
      transition: border-color 0.2s ease;
    }

    .background-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .no-background {
      background: linear-gradient(45deg, 
        var(--ion-color-light) 25%, 
        transparent 25%), 
      linear-gradient(-45deg, 
        var(--ion-color-light) 25%, 
        transparent 25%), 
      linear-gradient(45deg, 
        transparent 75%, 
        var(--ion-color-light) 75%), 
      linear-gradient(-45deg, 
        transparent 75%, 
        var(--ion-color-light) 75%);
      background-size: 10px 10px;
      background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .no-bg-placeholder {
      background: rgba(var(--ion-color-dark-rgb), 0.8);
      color: var(--ion-color-light);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
    }

    .background-name {
      font-size: 0.8rem;
      color: var(--ion-color-medium-shade);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .selected {
      --background: var(--ion-color-primary-tint);
    }

    .selected .preview-container {
      border-color: var(--ion-color-primary);
    }

    .selected .background-name {
      color: var(--ion-color-primary);
      font-weight: 600;
    }

    .selected-icon {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      color: var(--ion-color-primary);
      font-size: 1.2rem;
    }

    ion-card {
      margin: 0.25rem;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    ion-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    @media (max-width: 768px) {
      .preview-container {
        height: 60px;
      }
      
      .background-name {
        font-size: 0.7rem;
      }
    }
  `]
})
export class BackgroundSelectorComponent implements OnInit {
  private settingsService = inject(SettingsService);

  // Available background images
  backgroundOptions: BackgroundOption[] = [
    {
      filename: 'noir-theater-man.png',
      displayName: 'Noir Theater',
      previewPath: 'assets/backgrounds/noir-theater-man.png'
    },
    {
      filename: 'zombie-apocalypse-scene.png',
      displayName: 'Apokalypse',
      previewPath: 'assets/backgrounds/zombie-apocalypse-scene.png'
    },
    {
      filename: 'modern-dark-apartment.png',
      displayName: 'Moderne Wohnung',
      previewPath: 'assets/backgrounds/modern-dark-apartment.png'
    },
    {
      filename: 'medieval-castle-street.png',
      displayName: 'Mittelalter',
      previewPath: 'assets/backgrounds/medieval-castle-street.png'
    },
    {
      filename: 'sci-fi-laboratory.png',
      displayName: 'Sci-Fi Labor',
      previewPath: 'assets/backgrounds/sci-fi-laboratory.png'
    },
    {
      filename: 'dark-witch-forest.png',
      displayName: 'Hexenwald',
      previewPath: 'assets/backgrounds/dark-witch-forest.png'
    },
    {
      filename: 'cyberpunk-neon-corridor.png',
      displayName: 'Cyberpunk',
      previewPath: 'assets/backgrounds/cyberpunk-neon-corridor.png'
    },
    {
      filename: 'space-nebula-stars.png',
      displayName: 'Weltraum',
      previewPath: 'assets/backgrounds/space-nebula-stars.png'
    },
    {
      filename: 'abstract-energy-lines.png',
      displayName: 'Energie',
      previewPath: 'assets/backgrounds/abstract-energy-lines.png'
    },
    {
      filename: 'cosmic-galaxy-burst.png',
      displayName: 'Galaxie',
      previewPath: 'assets/backgrounds/cosmic-galaxy-burst.png'
    }
  ];

  // Signal for currently selected background
  selectedBackground = signal<string>('none');

  constructor() {
    addIcons({ checkmarkCircle });
  }

  ngOnInit() {
    // Load current background setting
    const settings = this.settingsService.getSettings();
    this.selectedBackground.set(settings.appearance.backgroundImage);

    // Subscribe to settings changes
    this.settingsService.settings$.subscribe(settings => {
      this.selectedBackground.set(settings.appearance.backgroundImage);
    });
  }

  selectBackground(filename: string) {
    this.selectedBackground.set(filename);
    
    // Update settings
    this.settingsService.updateAppearanceSettings({
      backgroundImage: filename
    });
  }
}