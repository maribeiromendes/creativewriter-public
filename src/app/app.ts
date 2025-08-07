import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp } from '@ionic/angular/standalone';
import { BackgroundService } from './shared/services/background.service';
import { BeatAIModalService } from './shared/services/beat-ai-modal.service';
import { BeatAIPreviewModalComponent } from './stories/components/beat-ai-preview-modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, IonApp, BeatAIPreviewModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'creativewriter2';
  private backgroundService = inject(BackgroundService);
  protected modalService = inject(BeatAIModalService);

  constructor() {
    // Initialize background service to apply global background
    // The service will automatically handle background changes
  }
}
