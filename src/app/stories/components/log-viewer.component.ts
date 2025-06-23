import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonSegment, IonSegmentButton, IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack } from 'ionicons/icons';
import { AILogTabComponent } from './ai-log-tab.component';
import { SyncLogTabComponent } from './sync-log-tab.component';

@Component({
  selector: 'app-log-viewer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonSegment, IonSegmentButton, IonLabel,
    AILogTabComponent,
    SyncLogTabComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-button (click)="goBack()">
            <ion-icon name="arrow-back" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>System Logs</ion-title>
      </ion-toolbar>
      
      <ion-toolbar color="dark">
        <ion-segment [(ngModel)]="selectedTab" color="primary">
          <ion-segment-button value="ai">
            <ion-label>AI Requests</ion-label>
          </ion-segment-button>
          <ion-segment-button value="sync">
            <ion-label>Synchronisation</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content color="dark">
      <app-ai-log-tab *ngIf="selectedTab === 'ai'"></app-ai-log-tab>
      <app-sync-log-tab *ngIf="selectedTab === 'sync'"></app-sync-log-tab>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: var(--ion-color-dark);
    }
    
    ion-segment {
      margin: 0.5rem 1rem;
    }
  `]
})
export class LogViewerComponent implements OnInit {
  selectedTab = 'ai';

  constructor(private router: Router) {
    addIcons({ arrowBack });
  }

  ngOnInit(): void {}

  goBack(): void {
    this.router.navigate(['/']);
  }
}