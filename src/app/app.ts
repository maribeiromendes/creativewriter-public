import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp } from '@ionic/angular/standalone';
import { BackgroundService } from './shared/services/background.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, IonApp],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'creativewriter2';
  private backgroundService = inject(BackgroundService);

  constructor() {
    // Initialize background service to apply global background
    // The service will automatically handle background changes
  }
}
