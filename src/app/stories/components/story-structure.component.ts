import { Component, Input, Output, EventEmitter, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonList, IonItem, IonLabel, IonButton, IonIcon, IonInput,
  IonChip, IonTextarea, IonSelect, IonSelectOption,
  IonButtons, IonHeader, IonToolbar, IonTitle, IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  chevronForward, chevronDown, add, trash, createOutline,
  flashOutline, documentTextOutline, timeOutline, sparklesOutline, close
} from 'ionicons/icons';
import { Story, Chapter, Scene } from '../models/story.interface';
import { StoryService } from '../services/story.service';
import { OpenRouterApiService } from '../../core/services/openrouter-api.service';
import { ModelService } from '../../core/services/model.service';
import { SettingsService } from '../../core/services/settings.service';
import { PromptManagerService } from '../../shared/services/prompt-manager.service';
import { ModelOption } from '../../core/models/model.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-story-structure',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonList, IonItem, IonLabel, IonButton, IonIcon, IonInput,
    IonChip, IonTextarea, IonSelect, IonSelectOption,
    IonButtons, IonHeader, IonToolbar, IonTitle, IonBadge
  ],
  template: `
    <div class="story-structure" role="navigation" aria-label="Story structure">
      <ion-header class="structure-header">
        <ion-toolbar>
          <ion-title size="small">{{ story.title || 'Unbenannte Geschichte' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button 
              size="small" 
              (click)="addChapter()"
              aria-label="Neues Kapitel hinzufügen"
              [attr.aria-describedby]="'add-chapter-help'"
              class="desktop-only">
              <ion-icon name="add" slot="icon-only"></ion-icon>
            </ion-button>
            <ion-button 
              size="small" 
              (click)="onCloseSidebar()"
              aria-label="Struktur-Sidebar schließen"
              class="mobile-close-btn">
              <ion-icon name="close" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      
      <ion-content class="structure-content" [scrollEvents]="true">
        <div id="add-chapter-help" class="sr-only">
          Fügt ein neues Kapitel zur Geschichte hinzu
        </div>
        <ion-list class="chapters-list" role="tree" aria-label="Kapitel und Szenen">
          <div *ngFor="let chapter of story.chapters; trackBy: trackChapter" 
               class="chapter-item">
            
            <ion-item 
              button 
              detail="false" 
              (click)="toggleChapter(chapter.id)" 
              (keydown)="onChapterKeyDown($event, chapter.id)"
              class="chapter-header"
              role="treeitem"
              tabindex="0"
              [attr.aria-expanded]="expandedChapters.has(chapter.id)"
              [attr.aria-label]="'Kapitel: ' + (chapter.title || 'Ohne Titel') + '. ' + (expandedChapters.has(chapter.id) ? 'Eingeklappt' : 'Ausgeklappt')">
              <ion-icon 
                [name]="expandedChapters.has(chapter.id) ? 'chevron-down' : 'chevron-forward'" 
                slot="start" 
                class="expand-icon"
                [attr.aria-hidden]="true">
              </ion-icon>
              <ion-input 
                [(ngModel)]="chapter.title" 
                (ionBlur)="updateChapter(chapter)"
                (click)="$event.stopPropagation()"
                class="chapter-title-input"
                placeholder="Kapitel Titel"
                [attr.aria-label]="'Kapitel Titel bearbeiten'"
              ></ion-input>
              <ion-button 
                fill="clear" 
                color="danger" 
                slot="end" 
                (click)="deleteChapter(chapter.id, $event)"
                [attr.aria-label]="'Kapitel löschen: ' + (chapter.title || 'Ohne Titel')">
                <ion-icon name="trash" slot="icon-only" [attr.aria-hidden]="true"></ion-icon>
              </ion-button>
            </ion-item>
            
            <div class="scenes-list" *ngIf="expandedChapters.has(chapter.id)" role="group" [attr.aria-label]="'Szenen in Kapitel: ' + (chapter.title || 'Ohne Titel')">
              <ion-list role="none">
                <ng-container *ngFor="let scene of chapter.scenes; trackBy: trackScene">
                  <ion-item 
                    button
                    detail="false"
                    [class.active-scene]="isActiveScene(chapter.id, scene.id)"
                    (click)="selectScene(chapter.id, scene.id)"
                    (keydown)="onSceneKeyDown($event, chapter.id, scene.id)"
                    class="scene-item multi-line"
                    role="treeitem"
                    tabindex="0"
                    [attr.aria-selected]="isActiveScene(chapter.id, scene.id)"
                    [attr.aria-label]="'Szene: ' + (scene.title || 'Ohne Titel') + '. ' + (getWordCount(scene.content)) + ' Wörter' + (isActiveScene(chapter.id, scene.id) ? '. Aktuell ausgewählt' : '')">
                    
                    <div class="scene-content">
                      <!-- First line: Scene title with AI button -->
                      <div class="scene-title-row">
                        <ion-input 
                          [(ngModel)]="scene.title" 
                          (ionBlur)="updateScene(chapter.id, scene)"
                          (click)="$event.stopPropagation()"
                          class="scene-title-input"
                          placeholder="Szenen Titel"
                          fill="clear"
                          [attr.aria-label]="'Szenen Titel bearbeiten'"
                        ></ion-input>
                        
                        <ion-button 
                          fill="clear" 
                          size="small"
                          [color]="isGeneratingTitle.has(scene.id) ? 'medium' : 'primary'"
                          (click)="generateSceneTitle(chapter.id, scene.id, $event)"
                          [disabled]="isGeneratingTitle.has(scene.id) || !selectedModel || !scene.content.trim()"
                          class="ai-title-btn"
                          [attr.aria-label]="isGeneratingTitle.has(scene.id) ? 'Titel wird generiert...' : 'AI-Titel für Szene generieren'"
                          (touchstart)="$event.stopPropagation()"
                          (touchend)="$event.stopPropagation()">
                          <ion-icon 
                            [name]="isGeneratingTitle.has(scene.id) ? 'time-outline' : 'sparkles-outline'" 
                            slot="icon-only"
                            [attr.aria-hidden]="true">
                          </ion-icon>
                        </ion-button>
                      </div>
                      
                      <!-- Second line: Word count and action buttons -->
                      <div class="scene-actions-row">
                        <ion-badge color="medium" class="word-count-badge">
                          {{ getWordCount(scene.content) }} Wörter
                        </ion-badge>
                        
                        <div class="action-buttons">
                          <ion-button 
                            fill="clear" 
                            size="small"
                            [color]="scene.summary ? 'success' : 'medium'"
                            (click)="toggleSceneDetails(scene.id, $event)"
                            class="expand-scene-btn"
                            [attr.aria-label]="'Szenen-Details ' + (expandedScenes.has(scene.id) ? 'einklappen' : 'ausklappen')"
                            [attr.aria-expanded]="expandedScenes.has(scene.id)"
                            (touchstart)="$event.stopPropagation()"
                            (touchend)="$event.stopPropagation()">
                            <ion-icon 
                              [name]="expandedScenes.has(scene.id) ? 'chevron-down' : 'chevron-forward'" 
                              slot="icon-only"
                              [attr.aria-hidden]="true">
                            </ion-icon>
                          </ion-button>
                          
                          <ion-button 
                            fill="clear" 
                            size="small"
                            color="danger" 
                            (click)="deleteScene(chapter.id, scene.id, $event)"
                            [attr.aria-label]="'Szene löschen: ' + (scene.title || 'Ohne Titel')"
                            (touchstart)="$event.stopPropagation()"
                            (touchend)="$event.stopPropagation()">
                            <ion-icon name="trash" slot="icon-only" [attr.aria-hidden]="true"></ion-icon>
                          </ion-button>
                        </div>
                      </div>
                    </div>
                  </ion-item>
                  
                  <div class="scene-details" *ngIf="expandedScenes.has(scene.id)">
                    <ion-item class="scene-summary-section">
                      <ion-label position="stacked">
                        <div class="summary-header">
                          <span>Zusammenfassung</span>
                          <ion-button 
                            size="small"
                            fill="solid"
                            [color]="isGeneratingSummary.has(scene.id) ? 'medium' : 'success'"
                            (click)="generateSceneSummary(chapter.id, scene.id)"
                            [disabled]="isGeneratingSummary.has(scene.id) || !selectedModel || !scene.content.trim()"
                            [attr.aria-label]="isGeneratingSummary.has(scene.id) ? 'Zusammenfassung wird generiert...' : 'AI-Zusammenfassung für Szene generieren'"
                            (touchstart)="$event.stopPropagation()"
                            (touchend)="$event.stopPropagation()">
                            <ion-icon 
                              [name]="isGeneratingSummary.has(scene.id) ? 'time-outline' : 'flash-outline'" 
                              slot="icon-only"
                              [attr.aria-hidden]="true">
                            </ion-icon>
                          </ion-button>
                        </div>
                      </ion-label>
                      
                      <ion-select 
                        [(ngModel)]="selectedModel"
                        placeholder="AI-Modell wählen..."
                        interface="popover"
                        class="model-select"
                        aria-label="AI-Modell für Zusammenfassung auswählen">
                        <ion-select-option *ngFor="let model of availableModels" [value]="model.id">
                          {{ model.label }}
                        </ion-select-option>
                      </ion-select>
                      
                      <ion-textarea 
                        [(ngModel)]="scene.summary"
                        (ionBlur)="updateSceneSummary(chapter.id, scene.id, scene.summary || '')"
                        (ionInput)="autoResizeTextarea($event)"
                        [attr.data-scene-id]="scene.id"
                        placeholder="Hier wird die AI-generierte Zusammenfassung der Szene angezeigt..."
                        class="summary-textarea"
                        [rows]="2"
                        [autoGrow]="true"
                        [attr.aria-label]="'Zusammenfassung für Szene: ' + (scene.title || 'Ohne Titel')">
                      </ion-textarea>
                      
                      <ion-chip *ngIf="scene.summaryGeneratedAt" color="medium" class="summary-info">
                        <ion-icon name="time-outline"></ion-icon>
                        <ion-label>{{ scene.summaryGeneratedAt | date:'short' }}</ion-label>
                      </ion-chip>
                    </ion-item>
                  </div>
                </ng-container>
              </ion-list>
              
              <ion-button 
                expand="block" 
                fill="outline" 
                color="primary" 
                class="add-scene-btn" 
                (click)="addScene(chapter.id)"
                [attr.aria-label]="'Neue Szene zu Kapitel hinzufügen: ' + (chapter.title || 'Ohne Titel')">
                <ion-icon name="add" slot="start" [attr.aria-hidden]="true"></ion-icon>
                Neue Szene
              </ion-button>
            </div>
          </div>
        </ion-list>
      </ion-content>
    </div>
  `,
  styles: [`
    .story-structure {
      width: 280px;
      background: var(--ion-background-color);
      border-right: 1px solid var(--ion-color-step-200);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 128px; /* Below the header */
      left: 0;
      height: calc(100vh - 128px);
      z-index: 100;
      overflow: hidden; /* Prevent container overflow */
    }

    /* Tablet and small desktop */
    @media (max-width: 1024px) and (min-width: 769px) {
      .story-structure {
        width: 240px; /* Slightly narrower on tablets */
      }
    }
    
    /* Mobile and tablet portrait */
    @media (max-width: 768px) {
      .story-structure {
        position: fixed;
        top: 112px; /* Below the global header (56px + 56px for two toolbars) */
        left: 0;
        height: calc(100vh - 112px);
        width: 100vw;
        z-index: 1000;
      }
      
      .mobile-close-btn {
        display: block;
        --color: #f8f9fa;
      }
      
      .desktop-only {
        display: none;
      }
    }
    
    /* Small mobile devices */
    @media (max-width: 480px) {
      .story-structure {
        max-width: 100vw;
      }
    }
    
    .structure-header {
      --background: var(--ion-color-step-100);
      --border-width: 0 0 1px 0;
      --border-color: var(--ion-color-step-200);
    }
    
    .structure-header ion-title {
      font-size: 1.1rem;
    }
    
    .structure-content {
      --background: var(--ion-background-color);
      flex: 1;
      overflow-y: auto;
      height: 100%;
    }
    
    /* Fix for IonContent scrolling */
    .structure-content::part(scroll) {
      padding-bottom: 10rem;
    }
    
    .chapters-list {
      background: transparent;
      padding-top: 0.5rem; /* Add top padding to prevent header overlap */
      padding-bottom: 10rem; /* Increased bottom padding to ensure last items are reachable */
    }
    
    .chapter-item {
      margin-bottom: 0.5rem;
      border: 1px solid var(--ion-color-step-100);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .chapter-header {
      --background: var(--ion-color-step-100);
      --background-hover: var(--ion-color-step-150);
      --color: var(--ion-text-color);
    }
    
    .expand-icon {
      color: var(--ion-color-medium);
      font-size: 1rem;
    }
    
    .chapter-title-input {
      --color: var(--ion-text-color);
      --placeholder-color: var(--ion-color-medium);
      font-weight: 500;
      font-size: 0.9rem;
    }
    
    .scenes-list {
      background: var(--ion-background-color);
      padding: 0.5rem;
    }
    
    .scenes-list ion-list {
      background: transparent;
    }
    
    .scene-item {
      --background: var(--ion-color-step-150);
      --background-hover: var(--ion-color-medium-tint);
      --border-radius: 4px;
      margin-bottom: 0.25rem;
      --padding-start: 8px;
      --padding-end: 8px;
    }
    
    .scene-item.multi-line {
      --padding-top: 8px;
      --padding-bottom: 8px;
      min-height: 60px;
    }
    
    .scene-item.active-scene {
      --background: var(--ion-color-step-50, #f9f9f9);
      --color: inherit;
      border-left: 4px solid var(--ion-color-primary);
      font-weight: 500;
      --background-hover: var(--ion-color-step-100, #f1f1f1);
      --background-focused: var(--ion-color-step-100, #f1f1f1);
    }
    
    .scene-content {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 4px;
    }
    
    .scene-title-row {
      display: flex;
      align-items: center;
      width: 100%;
    }
    
    .scene-title-input {
      --color: var(--ion-text-color);
      --placeholder-color: var(--ion-color-medium);
      font-size: 0.9rem;
      flex: 1;
      --padding-start: 0;
      --padding-end: 8px;
    }
    
    .scene-item.active-scene .scene-title-input {
      --color: var(--ion-color-primary-contrast);
    }
    
    .ai-title-btn {
      --padding-start: 4px;
      --padding-end: 4px;
      margin-left: 4px;
    }
    
    .scene-actions-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    
    .word-count-badge {
      font-size: 0.7rem;
      height: 20px;
      --padding-horizontal: 6px;
    }
    
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    
    .action-buttons ion-button {
      --padding-start: 4px;
      --padding-end: 4px;
    }
    
    
    .scene-item.active-scene ion-badge {
      --background: var(--ion-color-primary-contrast);
      --color: var(--ion-color-primary);
    }
    
    .scene-details {
      background: var(--ion-background-color);
      padding: 0.5rem;
    }
    
    .scene-summary-section {
      --background: var(--ion-color-step-100);
      --padding-start: 8px;
      --padding-end: 8px;
      margin: 0;
    }
    
    .summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      color: var(--ion-color-medium);
      font-weight: 500;
    }
    
    .model-select {
      width: 100%;
      margin-bottom: 0.5rem;
      --placeholder-color: var(--ion-color-medium);
    }
    
    .summary-textarea {
      --background: var(--ion-background-color);
      --color: var(--ion-text-color);
      --placeholder-color: var(--ion-color-medium);
      --padding-start: 8px;
      --padding-end: 8px;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
    
    .summary-info {
      margin-top: 0.5rem;
      float: right;
    }
    
    .add-scene-btn {
      margin: 0.5rem;
      --border-style: dashed;
      --border-width: 1px;
    }
    
    /* Screen reader only content */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    
    /* Keyboard focus improvements */
    .chapter-header:focus-visible,
    .scene-item:focus-visible {
      outline: 2px solid var(--ion-color-primary);
      outline-offset: 2px;
      border-radius: 4px;
    }
    
    ion-button:focus-visible {
      outline: 2px solid var(--ion-color-primary);
      outline-offset: 2px;
    }
    
    ion-input:focus-visible,
    ion-textarea:focus-visible,
    ion-select:focus-visible {
      outline: 2px solid var(--ion-color-primary);
      outline-offset: 1px;
    }

    /* Tablet adjustments */
    @media (max-width: 1024px) and (min-width: 769px) {
      .chapter-header {
        --min-height: 44px;
      }
      
      .scene-item {
        --min-height: 48px;
      }
      
      .ai-title-btn,
      .action-buttons ion-button {
        min-width: 40px;
        min-height: 40px;
      }
    }
    
    /* Mobile adjustments */
    @media (max-width: 768px) {
      .story-structure {
        width: 100%;
        max-width: 320px;
        height: 100vh;
        overflow-y: auto;
      }
      
      .structure-content {
        overflow-y: auto;
        height: calc(100vh - 168px); /* Subtract both global header (112px) and sidebar header (56px) */
        -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
      }
      
      .chapters-list {
        padding-top: 0.75rem; /* Extra top padding on mobile */
        padding-bottom: 12rem; /* Further increased padding for mobile */
      }
      
      .scenes-list {
        max-height: none; /* Remove any height restrictions */
      }
      
      .scene-details {
        max-height: none; /* Remove any height restrictions */
      }
      
      /* Larger touch targets for mobile */
      .chapter-header {
        --min-height: 48px; /* Minimum touch target size */
        --padding-top: 12px;
        --padding-bottom: 12px;
      }
      
      .scene-item {
        --min-height: 56px; /* Larger touch target for scenes */
        --padding-top: 12px;
        --padding-bottom: 12px;
      }
      
      .scene-item.multi-line {
        min-height: 72px; /* Even larger for multi-line content */
      }
      
      /* Larger buttons on mobile */
      .chapter-header ion-button {
        --padding-start: 8px;
        --padding-end: 8px;
        min-width: 44px;
        min-height: 44px;
      }
      
      .ai-title-btn {
        --padding-start: 8px;
        --padding-end: 8px;
        min-width: 48px;
        min-height: 48px;
        margin-left: 8px;
        position: relative;
        z-index: 10;
      }
      
      .action-buttons ion-button {
        --padding-start: 8px;
        --padding-end: 8px;
        min-width: 48px;
        min-height: 48px;
        margin: 0 2px;
        position: relative;
        z-index: 10;
      }
      
      .add-scene-btn {
        --min-height: 48px;
        margin: 0.75rem;
        font-size: 1rem;
      }
      
      /* Larger input fields */
      .chapter-title-input {
        --min-height: 44px;
        font-size: 1rem;
      }
      
      .scene-title-input {
        --min-height: 44px;
        font-size: 0.95rem;
      }
      
      /* Better spacing for scene content */
      .scene-content {
        gap: 8px;
        position: relative;
      }
      
      .scene-title-row {
        min-height: 48px;
        align-items: center;
      }
      
      .scene-actions-row {
        min-height: 48px;
        padding-top: 4px;
        align-items: center;
      }
    }
    
    /* Extra small mobile devices */
    @media (max-width: 480px) {
      .story-structure {
        max-width: 100vw;
        border-radius: 0; /* Remove border radius on very small screens */
      }
      
      .structure-header ion-title {
        font-size: 1rem;
      }
      
      .chapters-list {
        padding: 0.5rem;
        padding-bottom: 8rem; /* Ensure bottom padding on small screens too */
      }
      
      .chapter-item {
        margin-bottom: 0.75rem;
      }
      
      .scenes-list {
        padding: 0.25rem;
      }
      
      .scene-content {
        gap: 6px;
      }
      
      .word-count-badge {
        font-size: 0.65rem;
        height: 18px;
      }
      
      .summary-textarea {
        font-size: 0.8rem;
      }
      
      .add-scene-btn {
        margin: 0.5rem;
        font-size: 0.9rem;
      }
    }
    
    /* Large mobile devices and small tablets */
    @media (min-width: 481px) and (max-width: 768px) {
      .story-structure {
        max-width: 100vw; /* Full width on all mobile sizes */
      }
      
      .scene-item.multi-line {
        min-height: 80px; /* More space for content */
      }
      
      .scene-content {
        gap: 10px;
      }
    }

    /* Enhanced scrollbar and touch interactions for all mobile */
    @media (max-width: 768px) {
      .structure-content::-webkit-scrollbar {
        width: 8px; /* Slightly wider for easier thumb interaction */
        display: block;
      }
      
      .structure-content::-webkit-scrollbar-track {
        background: var(--ion-color-step-100);
        border-radius: 4px;
        margin: 4px 0; /* Add margin to track */
      }
      
      .structure-content::-webkit-scrollbar-thumb {
        background: var(--ion-color-medium);
        border-radius: 4px;
        min-height: 40px; /* Minimum thumb size for touch */
      }
      
      .structure-content::-webkit-scrollbar-thumb:active {
        background: var(--ion-color-medium-tint);
      }
      
      /* Improved touch feedback */
      .chapter-header:active,
      .scene-item:active {
        background: var(--ion-color-medium-shade) !important;
        transition: background-color 0.1s ease;
      }
      
      /* Enhanced touch feedback with ripple effect */
      .chapter-header,
      .scene-item {
        position: relative;
        overflow: hidden;
        transition: all 0.2s ease;
      }
      
      .chapter-header::before,
      .scene-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
        opacity: 0;
        transform: scale(0);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: none;
      }
      
      .chapter-header:active,
      .scene-item:active {
        transform: scale(0.98);
        background: var(--ion-color-medium-shade) !important;
      }
      
      .chapter-header:active::before,
      .scene-item:active::before {
        opacity: 1;
        transform: scale(1);
      }
      
      /* Loading state animations */
      .ai-title-btn[disabled],
      .summary-section ion-button[disabled] {
        opacity: 0.6;
        position: relative;
      }
      
      .ai-title-btn[disabled] ion-icon,
      .summary-section ion-button[disabled] ion-icon {
        animation: pulse 1.5s ease-in-out infinite;
      }
      
      @keyframes pulse {
        0%, 100% {
          opacity: 0.6;
          transform: scale(1);
        }
        50% {
          opacity: 1;
          transform: scale(1.1);
        }
      }
      
      /* Improved button hover/focus states */
      ion-button:not([disabled]):hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      
      ion-button:not([disabled]):active {
        transform: translateY(0);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
      }
    }
    
    /* Extra touch feedback for very small screens */
    @media (max-width: 480px) {
      .structure-content::-webkit-scrollbar {
        width: 10px; /* Even wider scrollbar for tiny screens */
      }
      
      .structure-content::-webkit-scrollbar-thumb {
        min-height: 50px; /* Larger minimum thumb size */
      }
      
      /* Enhanced vibration feedback simulation */
      .chapter-header:active,
      .scene-item:active {
        animation: vibrate 0.1s ease-in-out;
      }
      
      @keyframes vibrate {
        0%, 100% { transform: translateX(0) scale(0.98); }
        25% { transform: translateX(-1px) scale(0.98); }
        75% { transform: translateX(1px) scale(0.98); }
      }
      
      /* Loading spinner for very small screens */
      .ai-title-btn[disabled]::after,
      .summary-section ion-button[disabled]::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 12px;
        height: 12px;
        margin: -6px 0 0 -6px;
        border: 2px solid transparent;
        border-top: 2px solid var(--ion-color-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        z-index: 1;
      }
      
      /* Ensure buttons are above other elements */
      .ai-title-btn,
      .action-buttons ion-button {
        position: relative;
        z-index: 20;
        pointer-events: auto;
      }
      
      /* Prevent scene item clicks from interfering with button clicks */
      .scene-item {
        pointer-events: auto;
      }
      
      .scene-content {
        pointer-events: none;
      }
      
      .scene-content > * {
        pointer-events: auto;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    }
  `]
})
export class StoryStructureComponent implements AfterViewInit {
  @Input() story!: Story;
  @Input() activeChapterId: string | null = null;
  @Input() activeSceneId: string | null = null;
  @Output() sceneSelected = new EventEmitter<{chapterId: string, sceneId: string}>();
  @Output() closeSidebar = new EventEmitter<void>();
  
  expandedChapters = new Set<string>();
  expandedScenes = new Set<string>();
  isGeneratingSummary = new Set<string>();
  isGeneratingTitle = new Set<string>();
  selectedModel: string = '';
  availableModels: ModelOption[] = [];
  private subscription = new Subscription();

  constructor(
    private storyService: StoryService,
    private openRouterApiService: OpenRouterApiService,
    private modelService: ModelService,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
    private promptManager: PromptManagerService
  ) {
    addIcons({ 
      chevronForward, chevronDown, add, trash, createOutline,
      flashOutline, documentTextOutline, timeOutline, sparklesOutline, close
    });
  }

  ngOnInit() {
    // Auto-expand first chapter
    if (this.story && this.story.chapters && this.story.chapters.length > 0) {
      this.expandedChapters.add(this.story.chapters[0].id);
    }
    
    // Load available models and set default
    this.loadAvailableModels();
    this.setDefaultModel();
  }
  
  ngAfterViewInit() {
    // Resize all existing textareas after view initialization
    setTimeout(() => this.resizeAllTextareas(), 100);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  trackChapter(index: number, chapter: Chapter): string {
    return chapter.id;
  }

  trackScene(index: number, scene: Scene): string {
    return scene.id;
  }

  toggleChapter(chapterId: string): void {
    if (this.expandedChapters.has(chapterId)) {
      this.expandedChapters.delete(chapterId);
    } else {
      this.expandedChapters.add(chapterId);
    }
  }

  async addChapter(): Promise<void> {
    await this.storyService.addChapter(this.story.id);
    // Refresh story data
    const updatedStory = await this.storyService.getStory(this.story.id);
    if (updatedStory) {
      this.story = updatedStory;
      // Auto-expand new chapter
      const newChapter = this.story.chapters[this.story.chapters.length - 1];
      this.expandedChapters.add(newChapter.id);
    }
  }

  async updateChapter(chapter: Chapter): Promise<void> {
    await this.storyService.updateChapter(this.story.id, chapter.id, { title: chapter.title });
    // Refresh prompt manager when chapter title changes
    this.promptManager.refresh();
  }

  async deleteChapter(chapterId: string, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.story.chapters.length <= 1) {
      alert('Eine Geschichte muss mindestens ein Kapitel haben.');
      return;
    }
    
    if (confirm('Kapitel wirklich löschen? Alle Szenen gehen verloren.')) {
      await this.storyService.deleteChapter(this.story.id, chapterId);
      const updatedStory = await this.storyService.getStory(this.story.id);
      if (updatedStory) {
        this.story = updatedStory;
        this.expandedChapters.delete(chapterId);
      }
    }
  }

  async addScene(chapterId: string): Promise<void> {
    await this.storyService.addScene(this.story.id, chapterId);
    const updatedStory = await this.storyService.getStory(this.story.id);
    if (updatedStory) {
      this.story = updatedStory;
      // Auto-select new scene
      const chapter = this.story.chapters.find(c => c.id === chapterId);
      if (chapter) {
        const newScene = chapter.scenes[chapter.scenes.length - 1];
        this.selectScene(chapterId, newScene.id);
      }
    }
  }

  async updateScene(chapterId: string, scene: Scene): Promise<void> {
    await this.storyService.updateScene(this.story.id, chapterId, scene.id, { title: scene.title });
    // Refresh prompt manager when scene title changes
    this.promptManager.refresh();
  }

  async deleteScene(chapterId: string, sceneId: string, event: Event): Promise<void> {
    event.stopPropagation();
    const chapter = this.story.chapters.find(c => c.id === chapterId);
    if (chapter && chapter.scenes.length <= 1) {
      alert('Ein Kapitel muss mindestens eine Szene haben.');
      return;
    }
    
    if (confirm('Szene wirklich löschen?')) {
      await this.storyService.deleteScene(this.story.id, chapterId, sceneId);
      const updatedStory = await this.storyService.getStory(this.story.id);
      if (updatedStory) {
        this.story = updatedStory;
      }
    }
  }

  selectScene(chapterId: string, sceneId: string): void {
    this.sceneSelected.emit({ chapterId, sceneId });
  }

  isActiveScene(chapterId: string, sceneId: string): boolean {
    return this.activeChapterId === chapterId && this.activeSceneId === sceneId;
  }

  getWordCount(content: string): number {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
  
  toggleSceneDetails(sceneId: string, event: Event): void {
    event.stopPropagation();
    if (this.expandedScenes.has(sceneId)) {
      this.expandedScenes.delete(sceneId);
    } else {
      this.expandedScenes.add(sceneId);
      // Resize textarea after expanding
      setTimeout(() => this.resizeTextareaForScene(sceneId), 50);
    }
  }
  
  generateSceneSummary(chapterId: string, sceneId: string): void {
    const chapter = this.story.chapters.find(c => c.id === chapterId);
    const scene = chapter?.scenes.find(s => s.id === sceneId);
    
    if (!scene || !scene.content.trim() || !this.selectedModel) {
      return;
    }
    
    this.isGeneratingSummary.add(sceneId);
    this.cdr.detectChanges(); // Force change detection for mobile
    
    // Set a timeout to clear busy state if request takes too long
    const timeoutId = setTimeout(() => {
      if (this.isGeneratingSummary.has(sceneId)) {
        this.isGeneratingSummary.delete(sceneId);
        this.cdr.detectChanges();
        alert('Die Zusammenfassungs-Generierung dauert zu lange. Bitte versuchen Sie es erneut.');
      }
    }, 30000); // 30 second timeout
    
    // Remove embedded images from content to reduce token count
    let sceneContent = this.removeEmbeddedImages(scene.content);
    
    // Limit content length to avoid token limit issues
    // Approximate: 1 token ≈ 4 characters, so for safety we limit to ~50k tokens ≈ 200k characters
    const maxContentLength = 200000;
    let contentTruncated = false;
    
    if (sceneContent.length > maxContentLength) {
      sceneContent = sceneContent.substring(0, maxContentLength);
      contentTruncated = true;
    }
    
    const prompt = `Erstelle eine Zusammenfassung der folgenden Szene:

Titel: ${scene.title || 'Ohne Titel'}

Inhalt:
${sceneContent}${contentTruncated ? '\n\n[Hinweis: Der Inhalt wurde gekürzt, da er zu lang war]' : ''}

Die Zusammenfassung soll die wichtigsten Handlungspunkte und Charakterentwicklungen erfassen.`;

    this.openRouterApiService.generateText(prompt, {
      model: this.selectedModel,
      maxTokens: 150,
      temperature: 0.3
    }).subscribe({
      next: async (response) => {
        if (response.choices && response.choices.length > 0) {
          const summary = response.choices[0].message.content.trim();
          await this.updateSceneSummary(chapterId, sceneId, summary);
          
          // Update the scene summary generated timestamp
          if (scene) {
            scene.summary = summary;
            scene.summaryGeneratedAt = new Date();
            await this.storyService.updateScene(this.story.id, chapterId, sceneId, {
              summary: summary,
              summaryGeneratedAt: scene.summaryGeneratedAt
            });
          }
        }
        clearTimeout(timeoutId); // Clear timeout on success
        this.isGeneratingSummary.delete(sceneId);
        this.cdr.detectChanges(); // Force change detection
        
        // Ensure textarea is properly resized after content update
        setTimeout(() => {
          this.resizeTextareaForScene(sceneId);
          this.cdr.detectChanges();
        }, 100);
      },
      error: (error) => {
        console.error('Error generating scene summary:', error);
        clearTimeout(timeoutId); // Clear timeout on error
        
        let errorMessage = 'Fehler beim Generieren der Zusammenfassung.';
        
        // Check for specific error types
        if (error.status === 400) {
          errorMessage = 'Ungültige Anfrage. Bitte überprüfen Sie Ihre API-Einstellungen.';
        } else if (error.status === 401) {
          errorMessage = 'API-Schlüssel ungültig. Bitte überprüfen Sie Ihren OpenRouter API-Key in den Einstellungen.';
        } else if (error.status === 403) {
          errorMessage = 'Zugriff verweigert. Ihr API-Schlüssel hat möglicherweise nicht die erforderlichen Berechtigungen.';
        } else if (error.status === 429) {
          errorMessage = 'Rate-Limit erreicht. Bitte warten Sie einen Moment und versuchen Sie es erneut.';
        } else if (error.status === 500) {
          errorMessage = 'Server-Fehler bei OpenRouter. Bitte versuchen Sie es später erneut.';
        } else if (error.message?.includes('nicht aktiviert')) {
          errorMessage = error.message;
        }
        
        alert(errorMessage);
        this.isGeneratingSummary.delete(sceneId);
        this.cdr.detectChanges(); // Force change detection
      }
    });
  }
  
  generateSceneTitle(chapterId: string, sceneId: string, event: Event): void {
    event.stopPropagation();
    
    const chapter = this.story.chapters.find(c => c.id === chapterId);
    const scene = chapter?.scenes.find(s => s.id === sceneId);
    
    if (!scene || !scene.content.trim() || !this.selectedModel) {
      return;
    }
    
    // Get scene title generation settings
    const settings = this.settingsService.getSettings();
    const titleSettings = settings.sceneTitleGeneration;
    
    this.isGeneratingTitle.add(sceneId);
    this.cdr.detectChanges(); // Force change detection for mobile
    
    // Set a timeout to clear busy state if request takes too long
    const timeoutId = setTimeout(() => {
      if (this.isGeneratingTitle.has(sceneId)) {
        this.isGeneratingTitle.delete(sceneId);
        this.cdr.detectChanges();
        alert('Die Titel-Generierung dauert zu lange. Bitte versuchen Sie es erneut.');
      }
    }, 30000); // 30 second timeout
    
    // Remove embedded images from content to reduce token count
    let sceneContent = this.removeEmbeddedImages(scene.content);
    
    // Limit content length for title generation - we need even less content for a title
    // For title generation, 50k characters should be more than enough
    const maxContentLength = 50000;
    
    if (sceneContent.length > maxContentLength) {
      sceneContent = sceneContent.substring(0, maxContentLength);
    }
    
    // Build style instructions based on settings
    let styleInstruction = '';
    switch (titleSettings.style) {
      case 'descriptive':
        styleInstruction = 'Der Titel soll beschreibend und atmosphärisch sein.';
        break;
      case 'action':
        styleInstruction = 'Der Titel soll actionreich und dynamisch sein.';
        break;
      case 'emotional':
        styleInstruction = 'Der Titel soll die emotionale Stimmung der Szene widerspiegeln.';
        break;
      case 'concise':
      default:
        styleInstruction = 'Der Titel soll knapp und prägnant sein.';
        break;
    }
    
    const languageInstruction = titleSettings.language === 'english' 
      ? 'Antworte auf Englisch.' 
      : 'Antworte auf Deutsch.';
    
    const genreInstruction = titleSettings.includeGenre 
      ? 'Berücksichtige das Genre der Geschichte bei der Titelwahl.' 
      : '';
    
    const customInstruction = titleSettings.customInstruction 
      ? `\n${titleSettings.customInstruction}` 
      : '';
    
    // Build prompt with settings
    const prompt = `Erstelle einen kurzen Titel für die folgende Szene. Der Titel soll maximal ${titleSettings.maxWords} Wörter lang sein und den Kern der Szene erfassen.

${styleInstruction}
${genreInstruction}
${languageInstruction}${customInstruction}

Szenencontent (nur diese eine Szene):
${sceneContent}

Antworte nur mit dem Titel, ohne weitere Erklärungen oder Anführungszeichen.`;

    this.openRouterApiService.generateText(prompt, {
      model: this.selectedModel,
      maxTokens: Math.max(20, titleSettings.maxWords * 4), // Allow more tokens for longer titles
      temperature: titleSettings.temperature
    }).subscribe({
      next: async (response) => {
        if (response.choices && response.choices.length > 0) {
          let title = response.choices[0].message.content.trim();
          
          // Remove quotes if present
          title = title.replace(/^["']|["']$/g, '');
          
          // Limit to configured max words
          const words = title.split(/\s+/);
          if (words.length > titleSettings.maxWords) {
            title = words.slice(0, titleSettings.maxWords).join(' ');
          }
          
          // Update scene title
          if (scene) {
            scene.title = title;
            await this.updateScene(chapterId, scene);
          }
        }
        clearTimeout(timeoutId); // Clear timeout on success
        this.isGeneratingTitle.delete(sceneId);
        this.cdr.detectChanges(); // Force change detection
      },
      error: (error) => {
        console.error('Error generating scene title:', error);
        clearTimeout(timeoutId); // Clear timeout on error
        
        let errorMessage = 'Fehler beim Generieren des Titels.';
        
        // Check for specific error types
        if (error.status === 400) {
          errorMessage = 'Ungültige Anfrage. Bitte überprüfen Sie Ihre API-Einstellungen.';
        } else if (error.status === 401) {
          errorMessage = 'API-Schlüssel ungültig. Bitte überprüfen Sie Ihren OpenRouter API-Key in den Einstellungen.';
        } else if (error.status === 403) {
          errorMessage = 'Zugriff verweigert. Ihr API-Schlüssel hat möglicherweise nicht die erforderlichen Berechtigungen.';
        } else if (error.status === 429) {
          errorMessage = 'Rate-Limit erreicht. Bitte warten Sie einen Moment und versuchen Sie es erneut.';
        } else if (error.status === 500) {
          errorMessage = 'Server-Fehler bei OpenRouter. Bitte versuchen Sie es später erneut.';
        } else if (error.message?.includes('nicht aktiviert')) {
          errorMessage = error.message;
        }
        
        alert(errorMessage);
        this.isGeneratingTitle.delete(sceneId);
        this.cdr.detectChanges(); // Force change detection
      }
    });
  }
  
  async updateSceneSummary(chapterId: string, sceneId: string, summary: string): Promise<void> {
    const chapter = this.story.chapters.find(c => c.id === chapterId);
    const scene = chapter?.scenes.find(s => s.id === sceneId);
    
    if (scene) {
      scene.summary = summary;
      await this.storyService.updateScene(this.story.id, chapterId, sceneId, { summary });
      // Refresh prompt manager when scene summary changes
      this.promptManager.refresh();
    }
  }
  
  autoResizeTextarea(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea) {
      this.resizeTextarea(textarea);
    }
  }
  
  private resizeTextarea(textarea: HTMLTextAreaElement): void {
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight to fit content
    const newHeight = Math.max(32, textarea.scrollHeight);
    textarea.style.height = newHeight + 'px';
  }
  
  private resizeAllTextareas(): void {
    const textareas = document.querySelectorAll('.summary-textarea');
    textareas.forEach((textarea) => {
      this.resizeTextarea(textarea as HTMLTextAreaElement);
    });
  }
  
  private resizeTextareaForScene(sceneId: string): void {
    const textarea = document.querySelector(`textarea[data-scene-id="${sceneId}"]`) as HTMLTextAreaElement;
    if (textarea) {
      this.resizeTextarea(textarea);
    } else {
      // Retry after a short delay if textarea is not yet available
      setTimeout(() => {
        const retryTextarea = document.querySelector(`textarea[data-scene-id="${sceneId}"]`) as HTMLTextAreaElement;
        if (retryTextarea) {
          this.resizeTextarea(retryTextarea);
        }
      }, 50);
    }
  }
  
  private loadAvailableModels(): void {
    // Subscribe to model changes
    this.subscription.add(
      this.modelService.openRouterModels$.subscribe(models => {
        this.availableModels = models;
        if (models.length > 0 && !this.selectedModel) {
          this.setDefaultModel();
        }
      })
    );
    
    // Load models if not already loaded
    const currentModels = this.modelService.getCurrentOpenRouterModels();
    if (currentModels.length === 0) {
      this.modelService.loadOpenRouterModels().subscribe();
    } else {
      this.availableModels = currentModels;
    }
  }
  
  private setDefaultModel(): void {
    const settings = this.settingsService.getSettings();
    if (settings.openRouter.enabled && settings.openRouter.model) {
      this.selectedModel = settings.openRouter.model;
    } else if (this.availableModels.length > 0) {
      // Fallback to first available model
      this.selectedModel = this.availableModels[0].id;
    }
  }
  
  onChapterKeyDown(event: KeyboardEvent, chapterId: string): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        event.stopPropagation();
        this.toggleChapter(chapterId);
        break;
      case 'ArrowRight':
        if (!this.expandedChapters.has(chapterId)) {
          event.preventDefault();
          this.expandedChapters.add(chapterId);
        }
        break;
      case 'ArrowLeft':
        if (this.expandedChapters.has(chapterId)) {
          event.preventDefault();
          this.expandedChapters.delete(chapterId);
        }
        break;
    }
  }
  
  onSceneKeyDown(event: KeyboardEvent, chapterId: string, sceneId: string): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        event.stopPropagation();
        this.selectScene(chapterId, sceneId);
        break;
    }
  }
  
  onCloseSidebar(): void {
    this.closeSidebar.emit();
  }
  
  private removeEmbeddedImages(content: string): string {
    // Remove base64 encoded images
    // Matches: <img src="data:image/[type];base64,[data]" ...>
    let cleanedContent = content.replace(/<img[^>]*src="data:image\/[^"]*"[^>]*>/gi, '[Bild entfernt]');
    
    // Also remove markdown-style base64 images
    // Matches: ![alt](data:image/[type];base64,[data])
    cleanedContent = cleanedContent.replace(/!\[[^\]]*\]\(data:image\/[^)]*\)/gi, '[Bild entfernt]');
    
    // Remove any remaining large base64 strings that might be in the content
    // This catches base64 strings that are at least 1000 characters long
    cleanedContent = cleanedContent.replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/]{1000,}={0,2}/g, '[Bild-Daten entfernt]');
    
    return cleanedContent;
  }
}