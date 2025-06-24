import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, 
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonTextarea, IonSelect, IonSelectOption,
  IonRange, IonCheckbox, IonSpinner, IonGrid, IonRow, IonCol,
  IonImg, IonChip, IonProgressBar, IonToast
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack, imageOutline, downloadOutline, refreshOutline,
  settingsOutline, checkmarkCircle, closeCircle, timeOutline
} from 'ionicons/icons';
import { ImageGenerationService } from '../../shared/services/image-generation.service';
import { 
  ImageGenerationModel, 
  ModelInput, 
  ImageGenerationJob 
} from '../../shared/models/image-generation.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-image-generation',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonTextarea, IonSelect, IonSelectOption,
    IonRange, IonCheckbox, IonSpinner, IonGrid, IonRow, IonCol,
    IonImg, IonChip, IonProgressBar, IonToast
  ],
  template: `
    <div class="ion-page">
      <ion-header>
        <ion-toolbar color="dark">
          <ion-buttons slot="start">
            <ion-button (click)="goBack()">
              <ion-icon name="arrow-back" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-title>Bildgenerierung</ion-title>
          <ion-buttons slot="end">
            <ion-button (click)="clearHistory()">
              <ion-icon name="refresh-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      
      <ion-content color="dark">
        <div class="container">
          <!-- Model Selection -->
          <ion-card color="dark">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="settings-outline"></ion-icon>
                Modell Auswahl
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-item color="dark">
                <ion-label>Modell</ion-label>
                <ion-select [(ngModel)]="selectedModelId" (ionChange)="onModelChange()">
                  <ion-select-option *ngFor="let model of availableModels" [value]="model.id">
                    {{ model.name }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
              <p *ngIf="selectedModel" class="model-description">
                {{ selectedModel.description }}
              </p>
            </ion-card-content>
          </ion-card>

          <!-- Generation Parameters -->
          <ion-card color="dark" *ngIf="selectedModel">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="image-outline"></ion-icon>
                Parameter
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div *ngFor="let input of selectedModel.inputs" class="parameter-item">
                <!-- String inputs -->
                <ion-item color="dark" *ngIf="input.type === 'string' && input.name !== 'prompt'">
                  <ion-label position="stacked">{{ input.description }}</ion-label>
                  <ion-input 
                    [(ngModel)]="parameters[input.name]" 
                    [placeholder]="input.default || ''"
                    type="text">
                  </ion-input>
                </ion-item>

                <!-- Prompt (textarea) -->
                <ion-item color="dark" *ngIf="input.name === 'prompt'">
                  <ion-label position="stacked">{{ input.description }} *</ion-label>
                  <ion-textarea 
                    [(ngModel)]="parameters[input.name]" 
                    [placeholder]="'Beschreibe das Bild, das du generieren möchtest...'"
                    rows="3"
                    required>
                  </ion-textarea>
                </ion-item>

                <!-- Number/Integer inputs -->
                <ion-item color="dark" *ngIf="input.type === 'number' || input.type === 'integer'">
                  <ion-label position="stacked">
                    {{ input.description }}
                    <span *ngIf="input.minimum !== undefined && input.maximum !== undefined">
                      ({{ input.minimum }} - {{ input.maximum }})
                    </span>
                  </ion-label>
                  <ion-range 
                    [(ngModel)]="parameters[input.name]"
                    [min]="input.minimum || 0"
                    [max]="input.maximum || 100"
                    [step]="input.type === 'integer' ? 1 : 0.1"
                    color="primary"
                    [pin]="true">
                    <ion-label slot="start">{{ input.minimum || 0 }}</ion-label>
                    <ion-label slot="end">{{ input.maximum || 100 }}</ion-label>
                  </ion-range>
                  <div class="range-value">Wert: {{ parameters[input.name] }}</div>
                </ion-item>

                <!-- Boolean inputs -->
                <ion-item color="dark" *ngIf="input.type === 'boolean'">
                  <ion-checkbox [(ngModel)]="parameters[input.name]"></ion-checkbox>
                  <ion-label class="ion-margin-start">{{ input.description }}</ion-label>
                </ion-item>

                <!-- Array/Options inputs -->
                <ion-item color="dark" *ngIf="input.options && input.options.length > 0">
                  <ion-label>{{ input.description }}</ion-label>
                  <ion-select [(ngModel)]="parameters[input.name]">
                    <ion-select-option *ngFor="let option of input.options" [value]="option">
                      {{ option }}
                    </ion-select-option>
                  </ion-select>
                </ion-item>
              </div>

              <!-- Generate Button -->
              <ion-button 
                expand="block" 
                color="primary" 
                (click)="generateImage()"
                [disabled]="isGenerating || !parameters['prompt']">
                <ion-icon name="image-outline" slot="start"></ion-icon>
                <span *ngIf="!isGenerating">Bild Generieren</span>
                <span *ngIf="isGenerating">
                  <ion-spinner name="crescent"></ion-spinner>
                  Generiere...
                </span>
              </ion-button>
            </ion-card-content>
          </ion-card>

          <!-- Generation History -->
          <ion-card color="dark" *ngIf="jobs.length > 0">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="time-outline"></ion-icon>
                Verlauf
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-grid>
                <ion-row>
                  <ion-col size="12" size-md="6" size-lg="4" *ngFor="let job of jobs">
                    <div class="job-card">
                      <div class="job-header">
                        <ion-chip [color]="getStatusColor(job.status)">
                          <ion-icon [name]="getStatusIcon(job.status)"></ion-icon>
                          <ion-label>{{ getStatusText(job.status) }}</ion-label>
                        </ion-chip>
                        <small>{{ formatDate(job.createdAt) }}</small>
                      </div>
                      
                      <div class="job-prompt">
                        <strong>Prompt:</strong> {{ job.prompt }}
                      </div>

                      <div class="job-progress" *ngIf="job.status === 'processing'">
                        <ion-progress-bar type="indeterminate" color="primary"></ion-progress-bar>
                      </div>

                      <div class="job-image" *ngIf="job.imageUrl">
                        <ion-img 
                          [src]="job.imageUrl" 
                          [alt]="job.prompt"
                          (click)="viewImage(job.imageUrl)"
                          class="thumbnail-image">
                        </ion-img>
                        <ion-button fill="clear" size="small" (click)="downloadImage(job.imageUrl, job.prompt)">
                          <ion-icon name="download-outline" slot="icon-only"></ion-icon>
                        </ion-button>
                      </div>

                      <div class="job-error" *ngIf="job.error">
                        <p class="error-text">{{ job.error }}</p>
                      </div>
                    </div>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Toast for notifications -->
        <ion-toast
          [isOpen]="showToast"
          [message]="toastMessage"
          [duration]="3000"
          (didDismiss)="showToast = false">
        </ion-toast>
      </ion-content>
    </div>
  `,
  styles: [`
    .ion-page {
      background-color: #1a1a1a;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    ion-content {
      --background: #1a1a1a;
      --overflow: auto;
    }

    .container {
      padding: 1rem;
      max-width: 1200px;
      margin: 0 auto;
      padding-bottom: 4rem; /* Extra space for scrolling */
    }

    ion-card {
      margin-bottom: 1rem;
      --background: #2d2d2d;
      --color: #f8f9fa;
    }

    ion-card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #f8f9fa;
    }

    .model-description {
      color: #adb5bd;
      margin-top: 0.5rem;
      font-style: italic;
    }

    .parameter-item {
      margin-bottom: 1rem;
    }

    .range-value {
      text-align: center;
      color: #adb5bd;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }

    ion-item {
      --background: transparent;
      --color: #f8f9fa;
    }

    ion-input, ion-textarea, ion-select {
      --color: #f8f9fa;
      --placeholder-color: #6c757d;
    }

    .job-card {
      background: #343a40;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .job-header small {
      color: #6c757d;
    }

    .job-prompt {
      color: #e0e0e0;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .job-progress {
      margin: 0.5rem 0;
    }

    .job-image {
      position: relative;
      margin-top: 0.5rem;
    }

    .job-image ion-img {
      border-radius: 8px;
      width: 100%;
      height: 200px;
      object-fit: contain;
      background-color: #1a1a1a;
      border: 1px solid #404040;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .job-image ion-img:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      border-color: #0d6efd;
    }

    .job-image ion-button {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      --background: rgba(0, 0, 0, 0.7);
    }

    .job-error {
      background: #dc3545;
      color: white;
      padding: 0.5rem;
      border-radius: 4px;
      margin-top: 0.5rem;
    }

    .error-text {
      margin: 0;
      font-size: 0.9rem;
    }

    ion-button[disabled] {
      opacity: 0.6;
    }

    @media (max-width: 768px) {
      .container {
        padding: 0.5rem;
        padding-bottom: 6rem; /* More space on mobile */
      }
      
      ion-card {
        margin-bottom: 0.5rem;
      }

      .job-image ion-img {
        height: 180px;
      }
    }

    /* Ensure grid doesn't break scrolling */
    ion-grid {
      padding: 0;
    }

    ion-row, ion-col {
      padding: 0;
      margin: 0;
    }

    /* Fix potential scroll issues with absolute positioned elements */
    .job-card {
      position: relative;
      overflow: visible;
    }
  `]
})
export class ImageGenerationComponent implements OnInit, OnDestroy {
  availableModels: ImageGenerationModel[] = [];
  selectedModelId: string = '';
  selectedModel: ImageGenerationModel | null = null;
  parameters: Record<string, any> = {};
  jobs: ImageGenerationJob[] = [];
  isGenerating = false;
  showToast = false;
  toastMessage = '';
  
  private subscription: Subscription = new Subscription();

  constructor(
    private router: Router,
    private imageGenService: ImageGenerationService
  ) {
    addIcons({ 
      arrowBack, imageOutline, downloadOutline, refreshOutline,
      settingsOutline, checkmarkCircle, closeCircle, timeOutline
    });
  }

  ngOnInit(): void {
    this.availableModels = this.imageGenService.getAvailableModels();
    if (this.availableModels.length > 0) {
      this.selectedModelId = this.availableModels[0].id;
      this.onModelChange();
    }

    // Subscribe to jobs updates
    this.subscription.add(
      this.imageGenService.jobs$.subscribe(jobs => {
        this.jobs = jobs.slice().reverse(); // Show newest first
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onModelChange(): void {
    this.selectedModel = this.imageGenService.getModel(this.selectedModelId) || null;
    if (this.selectedModel) {
      this.initializeParameters();
    }
  }

  private initializeParameters(): void {
    if (!this.selectedModel) return;
    
    this.parameters = {};
    this.selectedModel.inputs.forEach(input => {
      if (input.default !== undefined) {
        this.parameters[input.name] = input.default;
      }
    });
  }

  generateImage(): void {
    if (!this.selectedModel || !this.parameters['prompt'] || this.isGenerating) {
      return;
    }

    this.isGenerating = true;
    
    this.subscription.add(
      this.imageGenService.generateImage(this.selectedModelId, this.parameters)
        .subscribe({
          next: (job) => {
            this.isGenerating = false;
            if (job.status === 'completed') {
              this.showToastMessage('Bild erfolgreich generiert!');
            }
          },
          error: (error) => {
            this.isGenerating = false;
            this.showToastMessage(`Fehler: ${error.message}`);
            console.error('Generation error:', error);
          }
        })
    );
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'danger';
      case 'processing': return 'warning';
      default: return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'failed': return 'close-circle';
      case 'processing': return 'time-outline';
      default: return 'time-outline';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'completed': return 'Fertig';
      case 'failed': return 'Fehler';
      case 'processing': return 'Generiere';
      case 'pending': return 'Wartend';
      default: return status;
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    }).format(date);
  }

  viewImage(url: string): void {
    // Open image in new tab for full-size viewing
    window.open(url, '_blank');
  }

  downloadImage(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename.slice(0, 50)}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  clearHistory(): void {
    this.imageGenService.clearJobs();
    this.showToastMessage('Verlauf gelöscht');
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  private showToastMessage(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
  }
}