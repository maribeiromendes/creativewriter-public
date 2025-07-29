import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, 
  IonContent, IonChip, IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack, bookOutline, book, settingsOutline, statsChartOutline,
  saveOutline, checkmarkCircleOutline, menuOutline, chevronBack, chevronForward,
  chatbubblesOutline, bugOutline, menu, close
} from 'ionicons/icons';
import { StoryService } from '../services/story.service';
import { Story, Scene } from '../models/story.interface';
import { StoryStructureComponent } from './story-structure.component';
import { SlashCommandDropdownComponent } from './slash-command-dropdown.component';
import { StoryStatsComponent } from './story-stats.component';
import { SlashCommandResult, SlashCommandAction } from '../models/slash-command.interface';
import { Subscription, debounceTime, Subject, throttleTime } from 'rxjs';
import { ProseMirrorEditorService } from '../../shared/services/prosemirror-editor.service';
import { EditorView } from 'prosemirror-view';
import { Selection, TextSelection } from 'prosemirror-state';
import { BeatAI, BeatAIPromptEvent } from '../models/beat-ai.interface';
import { BeatAIService } from '../../shared/services/beat-ai.service';
import { PromptManagerService } from '../../shared/services/prompt-manager.service';
import { ImageUploadDialogComponent, ImageInsertResult } from '../../shared/components/image-upload-dialog.component';
import { AppHeaderComponent, HeaderAction, BurgerMenuItem } from '../../shared/components/app-header.component';
import { VersionTooltipComponent } from '../../shared/components/version-tooltip.component';
import { HeaderNavigationService } from '../../shared/services/header-navigation.service';
import { SettingsService } from '../../core/services/settings.service';
import { StoryStatsService } from '../services/story-stats.service';
import { VersionService } from '../../core/services/version.service';

@Component({
  selector: 'app-story-editor',
  standalone: true,
  imports: [
    CommonModule, FormsModule, 
    IonContent, IonChip, IonLabel, IonButton, IonIcon,
    StoryStructureComponent, SlashCommandDropdownComponent, ImageUploadDialogComponent,
    AppHeaderComponent, StoryStatsComponent, VersionTooltipComponent
  ],
  template: `
    <div class="ion-page">
      <app-header
        [titleTemplate]="headerTitle"
        [leftActions]="leftActions"
        [rightActions]="rightActions"
        [showBurgerMenu]="true"
        [burgerMenuItems]="burgerMenuItems"
        [burgerMenuFooterContent]="burgerMenuFooter"
        (burgerMenuToggle)="onBurgerMenuToggle($event)">
      </app-header>
      
      <ng-template #headerTitle>
        <div *ngIf="activeScene" class="app-title">
          <div class="title-line">{{ getCurrentChapterTitle() }}</div>
          <div class="title-line">{{ getCurrentSceneTitle() }}</div>
        </div>
      </ng-template>
      
      <ng-template #burgerMenuFooter>
        <div class="burger-menu-status">
          <div class="status-detail">
            <ion-chip [color]="hasUnsavedChanges ? 'warning' : 'success'" class="full-status">
              <ion-icon [name]="hasUnsavedChanges ? 'save-outline' : 'checkmark-circle-outline'"></ion-icon>
              <ion-label>{{ hasUnsavedChanges ? 'Nicht gespeichert' : 'Gespeichert' }}</ion-label>
            </ion-chip>
            <ion-chip color="medium" class="full-status">
              <ion-icon name="stats-chart-outline"></ion-icon>
              <ion-label>{{ wordCount }} Wörter</ion-label>
            </ion-chip>
            <app-version-tooltip *ngIf="versionService.getVersionSync()">
              <ion-chip color="medium" class="full-status">
                <ion-label>{{ versionService.getShortVersion() }}</ion-label>
              </ion-chip>
            </app-version-tooltip>
          </div>
        </div>
      </ng-template>
      
      <ion-content>
        <div class="editor-container" [class.sidebar-visible]="showSidebar">
          <div class="sidebar-overlay" *ngIf="showSidebar">
            <app-story-structure 
              [story]="story" 
              [activeChapterId]="activeChapterId"
              [activeSceneId]="activeSceneId"
              (sceneSelected)="onSceneSelected($event)"
              (closeSidebar)="onCloseSidebar()">
            </app-story-structure>
          </div>
          
          <div class="editor-main">
            <div class="editor-content" [style.--editor-text-color]="currentTextColor">
              <div class="editor-inner">
                <input 
                  type="text" 
                  class="title-input-native" 
                  placeholder="Titel deiner Geschichte..." 
                  [(ngModel)]="story.title"
                  (ngModelChange)="onStoryTitleChange()"
                />
                
                <div class="scene-editor" *ngIf="activeScene">
                  <!-- Scene Navigation - Top -->
                  <div class="scene-navigation top">
                    <ion-button 
                      fill="clear" 
                      size="small"
                      (click)="navigateToPreviousScene()"
                      [disabled]="!hasPreviousScene()"
                      class="nav-button prev-button"
                      [attr.aria-label]="'Zur vorherigen Szene'">
                      <ion-icon name="chevron-back" slot="start"></ion-icon>
                      Vorherige Szene
                    </ion-button>
                    
                    
                    <ion-button 
                      fill="clear" 
                      size="small"
                      (click)="navigateToNextScene()"
                      [disabled]="!hasNextScene()"
                      class="nav-button next-button"
                      [attr.aria-label]="'Zur nächsten Szene'">
                      Nächste Szene
                      <ion-icon name="chevron-forward" slot="end"></ion-icon>
                    </ion-button>
                  </div>
                  
                  <div class="scene-title-editor-container">
                    <div class="scene-id-badge" *ngIf="activeScene && activeChapterId">
                      {{ getSceneIdDisplay() }}
                    </div>
                    <input 
                      type="text" 
                      class="scene-title-input-native" 
                      placeholder="Szenen-Titel..." 
                      [(ngModel)]="activeScene.title"
                      (ngModelChange)="onSceneTitleChange()"
                    />
                  </div>
                  
                  <div class="editor-wrapper">
                    <div 
                      #editorContainer
                      class="content-editor"
                      [style.--editor-text-color]="currentTextColor"
                    ></div>
                  </div>
                  
                  <!-- Scene Navigation - Bottom -->
                  <div class="scene-navigation bottom">
                    <ion-button 
                      fill="clear" 
                      size="small"
                      (click)="navigateToPreviousScene()"
                      [disabled]="!hasPreviousScene()"
                      class="nav-button prev-button"
                      [attr.aria-label]="'Zur vorherigen Szene'">
                      <ion-icon name="chevron-back" slot="start"></ion-icon>
                      Vorherige Szene
                    </ion-button>
                    
                    <ion-button 
                      fill="clear" 
                      size="small"
                      (click)="navigateToNextScene()"
                      [disabled]="!hasNextScene()"
                      class="nav-button next-button"
                      [attr.aria-label]="'Zur nächsten Szene'">
                      Nächste Szene
                      <ion-icon name="chevron-forward" slot="end"></ion-icon>
                    </ion-button>
                  </div>
                </div>
                
                <div class="no-scene" *ngIf="!activeScene">
                  <p>Wähle eine Szene aus der Struktur, um zu beginnen.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ion-content>
      
      <app-slash-command-dropdown
        *ngIf="showSlashDropdown"
        [position]="slashDropdownPosition"
        [cursorPosition]="slashCursorPosition"
        (commandSelected)="onSlashCommandSelected($event)"
        (dismissed)="hideSlashDropdown()">
      </app-slash-command-dropdown>
      
      <app-image-upload-dialog
        *ngIf="showImageDialog"
        (imageInserted)="onImageInserted($event)"
        (cancelled)="hideImageDialog()">
      </app-image-upload-dialog>
      
      <app-story-stats
        [isOpen]="showStoryStats"
        [story]="story"
        (closed)="hideStoryStats()">
      </app-story-stats>
    </div>
  `,
  styles: [`
    :host {
      background: transparent;
      min-height: 100vh;
      display: block;
    }
    
    .ion-page {
      background-color: transparent;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    ion-header {
      --ion-toolbar-background: rgba(45, 45, 45, 0.3);
      --ion-toolbar-color: #f8f9fa;
      backdrop-filter: blur(15px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
      position: relative;
      z-index: 100;
    }
    
    ion-toolbar {
      --background: transparent;
      --padding-start: 16px;
      --padding-end: 16px;
    }
    
    ion-title {
      font-size: 1.1rem;
      font-weight: 600;
      line-height: 1.2;
      padding: 0;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
    
    ion-button {
      --color: #f8f9fa;
      --background: rgba(255, 255, 255, 0.1);
      --background-hover: rgba(255, 255, 255, 0.2);
      --border-radius: 8px;
      margin: 0 4px;
      transition: all 0.2s ease;
    }
    
    ion-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    ion-icon {
      font-size: 1.2rem;
    }
    
    /* Desktop optimizations for compact header */
    @media (min-width: 768px) {
      ion-header {
        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
      }
      
      ion-toolbar {
        --min-height: 44px;
        --padding-top: 4px;
        --padding-bottom: 4px;
      }
      
      ion-title {
        font-size: 0.85rem;
        line-height: 1.1;
      }
    }
    
    /* Editor Status Info Styles */
    .editor-status-info {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-right: 0.5rem;
    }
    
    .compact-status, .compact-wordcount {
      height: 24px;
      font-size: 0.75rem;
      --border-radius: 12px;
    }
    
    .compact-status ion-icon {
      font-size: 12px;
      margin-right: 0;
    }
    
    .compact-wordcount ion-label {
      font-size: 0.7rem;
      margin: 0 4px;
    }
    
    @media (max-width: 767px) {
      .editor-status-info {
        display: none;
      }
      
      ion-title {
        font-size: 0.9rem;
        line-height: 1.15;
      }
      
      ion-toolbar {
        --min-height: 48px;
      }
    }
    
    /* Burger Menu Styles */
    .burger-menu-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      backdrop-filter: blur(2px);
    }
    
    .burger-menu {
      position: fixed;
      top: 0;
      right: -320px;
      width: 320px;
      height: 100%;
      background: 
        /* Enhanced dark overlay with gradient for depth */
        linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(10, 10, 20, 0.95) 50%, rgba(20, 20, 35, 0.95) 100%),
        /* Main anime image */
        url('/assets/cyberpunk-anime-girl.png'),
        /* Fallback dark background */
        #1a1a2e;
      background-size: cover, cover, auto;
      background-position: center, center, center;
      background-repeat: no-repeat, no-repeat, repeat;
      border-left: 2px solid rgba(139, 180, 248, 0.3);
      z-index: 9999;
      transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: -8px 0 40px rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    
    .burger-menu.open {
      right: 0;
    }
    
    .burger-menu-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 0;
    }
    
    .burger-menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 1.25rem;
      border-bottom: 2px solid rgba(139, 180, 248, 0.2);
      background: linear-gradient(135deg, rgba(15, 15, 25, 0.8) 0%, rgba(10, 10, 20, 0.8) 100%);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      box-shadow: 0 2px 15px rgba(0, 0, 0, 0.4);
      position: relative;
    }
    
    .burger-menu-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(139, 180, 248, 0.05) 0%, rgba(71, 118, 230, 0.05) 100%);
      z-index: -1;
    }
    
    .burger-menu-header h3 {
      margin: 0;
      background: linear-gradient(135deg, #ffffff 0%, #8bb4f8 50%, #4776e6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: 1px;
      text-shadow: 0 2px 10px rgba(139, 180, 248, 0.3);
    }
    
    .burger-menu-header ion-button {
      --color: rgba(255, 255, 255, 0.8);
      --background: rgba(255, 255, 255, 0.1);
      --background-hover: rgba(255, 255, 255, 0.2);
      --border-radius: 12px;
      --padding-start: 8px;
      --padding-end: 8px;
      transition: all 0.3s ease;
    }
    
    .burger-menu-header ion-button:hover {
      transform: scale(1.1) rotate(90deg);
      --background: rgba(255, 107, 107, 0.2);
      --color: #ff6b6b;
    }
    
    .burger-menu-items {
      flex: 1;
      padding: 1.5rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      overflow-y: auto;
    }
    
    .burger-menu-items ion-button {
      --color: #ffffff;
      --background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(139, 180, 248, 0.08) 100%);
      --background-hover: linear-gradient(135deg, rgba(71, 118, 230, 0.25) 0%, rgba(139, 180, 248, 0.25) 100%);
      --background-focused: linear-gradient(135deg, rgba(71, 118, 230, 0.3) 0%, rgba(139, 180, 248, 0.3) 100%);
      --ripple-color: rgba(139, 180, 248, 0.4);
      margin: 0 1.25rem 0.5rem 1.25rem;
      height: 54px;
      font-size: 1.05rem;
      font-weight: 500;
      justify-content: flex-start;
      text-align: left;
      border: 1px solid rgba(139, 180, 248, 0.2);
      border-radius: 16px;
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
      position: relative;
      overflow: hidden;
    }
    
    .burger-menu-items ion-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      transition: left 0.6s ease;
    }
    
    .burger-menu-items ion-button:hover::before {
      left: 100%;
    }
    
    .burger-menu-items ion-button:hover {
      --background: linear-gradient(135deg, rgba(71, 118, 230, 0.35) 0%, rgba(139, 180, 248, 0.35) 100%);
      border-color: rgba(139, 180, 248, 0.6);
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 8px 25px rgba(71, 118, 230, 0.4);
    }
    
    .burger-menu-items ion-button ion-icon {
      margin-right: 16px;
      font-size: 1.3rem;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }
    
    .burger-menu-status {
      border-top: 2px solid rgba(139, 180, 248, 0.2);
      padding: 1.5rem 1.25rem;
      margin-top: auto;
      background: linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(10, 10, 20, 0.9) 100%);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
      position: relative;
    }
    
    .burger-menu-status::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(139, 180, 248, 0.05) 0%, rgba(71, 118, 230, 0.05) 100%);
      z-index: -1;
    }
    
    .status-detail {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .full-status, .full-wordcount {
      width: 100%;
      height: 36px;
      justify-content: center;
    }
    
    .full-status ion-icon {
      font-size: 16px;
      margin-right: 8px;
    }
    
    .full-status ion-label, .full-wordcount ion-label {
      font-size: 0.9rem;
    }
    
    
    ion-content {
      --background: transparent;
      --overflow: auto;
    }
    
    ion-content::part(scroll) {
      display: flex;
      flex-direction: column;
    }
    
    .editor-container {
      display: flex;
      position: relative;
      min-height: 100vh;
      background: transparent;
    }
    
    .editor-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      margin-left: 280px; /* Make space for fixed sidebar */
      background: transparent;
    }
    
    /* Hide sidebar space when sidebar is hidden */
    .editor-container:not(.sidebar-visible) .editor-main {
      margin-left: 0;
    }
    
    /* Mobile: Remove margin and use overlay */
    @media (max-width: 768px) {
      .editor-main {
        margin-left: 0 !important;
      }
    }
    
    .editor-content {
      padding: 0.5rem 0.75rem;
      width: 100%;
      box-sizing: border-box;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0; /* Important for flexbox */
      background: transparent;
    }

    /* Optimal reading width container */
    .editor-inner {
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      background: transparent;
    }

    /* Different max-widths for different screens */
    @media (min-width: 1400px) {
      .editor-inner {
        max-width: 900px;
      }
    }

    @media (min-width: 1600px) {
      .editor-inner {
        max-width: 1000px;
      }
    }
    
    .title-input-native {
      background: rgba(30, 30, 30, 0.4);
      backdrop-filter: blur(5px);
      color: #f8f9fa;
      border: 1px dotted rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      padding: 3px 8px;
      height: 24px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      line-height: 1.2;
      width: 100%;
      outline: none;
      box-sizing: border-box;
      text-align: center;
    }
    
    .title-input-native::placeholder {
      color: #6c757d;
      opacity: 1;
    }
    
    .title-input-native:focus {
      border-color: var(--ion-color-light, rgba(255, 255, 255, 0.4));
      box-shadow: 0 0 0 1px var(--ion-color-light, rgba(255, 255, 255, 0.1));
    }
    
    .scene-editor {
      display: flex;
      flex-direction: column;
      min-height: 0; /* Allow shrinking */
      flex: 1;
    }
    
    .scene-title-editor-container {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 0.125rem;
      height: 18px;
      max-height: 18px;
    }

    .scene-id-badge {
      background: var(--ion-color-secondary);
      color: var(--ion-color-secondary-contrast);
      padding: 0px 3px;
      border-radius: 2px;
      font-size: 9px;
      font-weight: 600;
      min-width: 30px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      white-space: nowrap;
      flex-shrink: 0;
      line-height: 1;
    }

    .scene-title-input-native {
      background: rgba(30, 30, 30, 0.4);
      backdrop-filter: blur(5px);
      color: #e0e0e0;
      border: 1px dotted rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      padding: 2px 6px;
      height: 18px;
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1.1;
      flex: 1;
      margin: 0;
      outline: none;
      box-sizing: border-box;
    }
    
    .scene-title-input-native::placeholder {
      color: #6c757d;
      opacity: 1;
    }
    
    .scene-title-input-native:focus {
      border-color: var(--ion-color-medium, rgba(255, 255, 255, 0.4));
      box-shadow: 0 0 0 1px var(--ion-color-medium, rgba(255, 255, 255, 0.1));
    }
    
    /* Scene Navigation Styles */
    .scene-navigation {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.25rem;
      padding: 0;
      margin: 0;
      min-height: auto;
    }
    
    .scene-navigation.bottom {
      margin: 0;
    }
    
    .scene-navigation .nav-button {
      --color: #e0e0e0;
      --color-hover: #f8f9fa;
      font-size: 0.85rem;
      font-weight: 500;
      min-width: 120px;
      --padding-top: 4px;
      --padding-bottom: 4px;
      height: auto;
      transition: all 0.2s ease;
    }
    
    .scene-navigation .nav-button:not([disabled]):hover {
      --background: rgba(255, 255, 255, 0.1);
      transform: translateY(-1px);
    }
    
    .scene-navigation .nav-button[disabled] {
      --color: #6c757d;
      opacity: 0.5;
    }
    
    .scene-navigation .prev-button {
      justify-content: flex-start;
    }
    
    .scene-navigation .next-button {
      justify-content: flex-end;
    }
    
    
    .no-scene {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6c757d;
      font-size: 1.1rem;
    }
    
    .editor-wrapper {
      background: rgba(42, 42, 42, 0.4);
      backdrop-filter: blur(8px);
      border-radius: var(--ion-border-radius, 8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      margin: 0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    
    .editor-wrapper:hover {
      border-color: rgba(255, 255, 255, 0.2);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
      background: rgba(42, 42, 42, 0.5);
    }
    
    .content-editor {
      border: none;
      outline: none;
      font-size: 1rem;
      line-height: 1.8;
      font-family: var(--ion-font-family, Georgia, serif);
      background: transparent;
      color: var(--ion-text-color, var(--ion-color-step-850, #e0e0e0));
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0;
    }
    
    .content-editor :global(.prosemirror-editor) {
      outline: none !important;
      border: none !important;
      background: rgba(30, 30, 30, 0.3);
      backdrop-filter: blur(5px);
      color: var(--editor-text-color, var(--ion-text-color, var(--ion-color-step-850, #e0e0e0)));
      font-size: 1rem;
      line-height: 1.8;
      font-family: var(--ion-font-family, Georgia, serif);
      flex: 1;
      white-space: pre-wrap;
      word-wrap: break-word;
      -webkit-font-variant-ligatures: none;
      font-variant-ligatures: none;
      padding: 0.8rem;
      min-height: 0;
      border-radius: 4px;
    }
    
    .content-editor :global(.prosemirror-editor p) {
      margin: 0 0 1.5rem 0;
      text-indent: 2rem;
      color: var(--editor-text-color, #e0e0e0) !important;
    }
    
    .content-editor :global(.prosemirror-editor p:last-child) {
      margin-bottom: 0;
    }
    
    .content-editor :global(.prosemirror-editor[data-placeholder]:empty::before) {
      content: attr(data-placeholder);
      color: #6c757d;
      pointer-events: none;
      position: absolute;
    }
    
    .content-editor :global(.prosemirror-editor h1),
    .content-editor :global(.prosemirror-editor h2),
    .content-editor :global(.prosemirror-editor h3) {
      color: var(--editor-text-color, var(--ion-text-color, var(--ion-color-step-900, #f8f9fa)));
      font-weight: var(--ion-font-weight-bold, bold);
      margin: var(--ion-margin, 1.5rem) 0 var(--ion-margin-sm, 1rem) 0;
    }
    
    .content-editor :global(.prosemirror-editor h1) {
      font-size: var(--ion-font-size-large, 1.2rem);
    }
    
    .content-editor :global(.prosemirror-editor h2) {
      font-size: var(--ion-font-size-medium, 1.0rem);
    }
    
    .content-editor :global(.prosemirror-editor h3) {
      font-size: var(--ion-font-size-small, 0.9rem);
    }
    
    .content-editor :global(.prosemirror-editor strong) {
      color: var(--editor-text-color, var(--ion-text-color, var(--ion-color-step-900, #f8f9fa)));
      font-weight: var(--ion-font-weight-bold, bold);
    }
    
    .content-editor :global(.prosemirror-editor em) {
      color: var(--editor-text-color, var(--ion-color-medium, #adb5bd));
      font-style: italic;
    }
    
    .content-editor :global(.prosemirror-editor ul),
    .content-editor :global(.prosemirror-editor ol) {
      padding-left: var(--ion-padding, 1.5rem);
      margin: var(--ion-margin, 1rem) 0;
    }
    
    .content-editor :global(.prosemirror-editor li) {
      margin: var(--ion-margin-sm, 0.5rem) 0;
    }
    
    .content-editor :global(.beat-ai-wrapper) {
      margin: var(--ion-margin, 1rem) 0;
      position: relative;
    }
    
    .content-editor :global(.ProseMirror-selectednode .beat-ai-wrapper) {
      outline: 2px solid var(--ion-color-primary, #0d6efd);
      outline-offset: 2px;
      border-radius: var(--ion-border-radius, 8px);
    }
    
    /* Additional ProseMirror CSS fixes */
    .content-editor :global(.ProseMirror) {
      position: relative;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: var(--editor-text-color, #e0e0e0) !important;
      caret-color: var(--editor-text-color, var(--ion-text-color, var(--ion-color-step-850, #e0e0e0)));
    }
    
    .content-editor :global(.ProseMirror *) {
      color: inherit !important;
    }
    
    .content-editor :global(.ProseMirror-focused) {
      outline: none !important;
      border: none !important;
      box-shadow: none !important;
      caret-color: var(--editor-text-color, var(--ion-text-color, var(--ion-color-step-850, #e0e0e0)));
      -webkit-font-variant-ligatures: none;
      font-variant-ligatures: none;
      font-feature-settings: "liga" 0;
    }
    
    /* Remove any focus styles from the content editor container */
    .content-editor:focus,
    .content-editor:focus-within {
      outline: none !important;
      box-shadow: none !important;
    }
    
    .content-editor :global(.ProseMirror-hideselection *::selection) {
      background: transparent;
    }
    
    .content-editor :global(.ProseMirror-hideselection *::-moz-selection) {
      background: transparent;
    }
    
    .content-editor :global(.ProseMirror-hideselection) {
      caret-color: transparent;
    }
    
    .content-editor :global(.ProseMirror-selectednode) {
      outline: 2px solid #8cf;
    }

    /* Mobile Responsiveness */
    @media (max-width: 768px) {
      ion-title {
        font-size: 0.9rem;
      }
      
      .status-toolbar ion-chip {
        font-size: 0.8rem;
      }
      
      .editor-content {
        padding: 0.5rem 0.5rem;
      }

      .editor-inner {
        max-width: 100%;
        padding-bottom: 3rem; /* Reduced space on mobile */
      }

      .title-input-native {
        font-size: 0.8rem;
        height: 22px;
        padding: 2px 6px;
      }

      
      /* Mobile navigation adjustments */
      .scene-navigation {
        padding: 0.1rem 0;
        gap: 0.25rem;
      }
      
      .scene-navigation .nav-button {
        min-width: 120px;
        font-size: 0.85rem;
      }
      
    }

    @media (max-width: 480px) {
      ion-title {
        font-size: 0.8rem;
      }
      
      .status-toolbar {
        --min-height: 40px;
      }
      
      .editor-content {
        padding: 0.25rem 0.25rem;
      }

      .title-input-native {
        font-size: 0.75rem;
        height: 20px;
        padding: 2px 6px;
      }

      
      /* Small mobile navigation - simple flex layout */
      .scene-navigation {
        display: flex;
        justify-content: space-between;
        gap: 0.1rem;
        padding: 0.1rem 0;
      }
      
      .scene-navigation .nav-button {
        min-width: 80px;
        font-size: 0.7rem;
        padding: 0.2rem 0.4rem;
      }
    }

    /* Sidebar Overlay */
    .sidebar-overlay {
      display: contents; /* Allows sticky positioning to work */
    }

    /* Tablet Sidebar - reduced width */
    @media (max-width: 1024px) and (min-width: 769px) {
      .editor-main {
        margin-left: 240px; /* Match reduced sidebar width */
      }
      
      .editor-container:not(.sidebar-visible) .editor-main {
        margin-left: 0;
      }
    }
    
    /* Mobile Sidebar Overlay */
    @media (max-width: 768px) {
      .sidebar-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: flex-start;
        backdrop-filter: blur(2px);
      }

      .sidebar-overlay :global(app-story-structure .story-structure) {
        width: 100vw;
        height: 100vh;
        margin: 0;
        box-shadow: none;
        border-radius: 0;
        border: none;
        top: 0;
        left: 0;
        position: fixed;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
    }
    
    /* All mobile devices - full screen sidebar */
    @media (max-width: 768px) {
      .sidebar-overlay {
        padding: 0;
        background: none;
      }
      
      .sidebar-overlay :global(app-story-structure .story-structure) {
        width: 100vw;
        height: 100vh;
        margin: 0;
        box-shadow: none;
        border-radius: 0;
        border: none;
        position: fixed;
        top: 0;
        left: 0;
      }
    }
    
    /* Mobile keyboard handling */
    @media (max-width: 768px) {
      /* When keyboard is visible, adjust viewport */
      :host-context(.keyboard-visible) .ion-page {
        height: calc(100vh - var(--keyboard-height, 0px));
        max-height: calc(100vh - var(--keyboard-height, 0px));
      }
      
      :host-context(.keyboard-visible) .editor-container {
        min-height: calc(100vh - var(--keyboard-height, 0px));
        max-height: calc(100vh - var(--keyboard-height, 0px));
      }
      
      :host-context(.keyboard-visible) .content-editor {
        max-height: calc(100vh - var(--keyboard-height, 0px) - 250px);
      }
      
      /* Ensure content can scroll above keyboard */
      :host-context(.keyboard-visible) .editor-inner {
        padding-bottom: calc(var(--keyboard-height, 0px) + 2rem);
      }
      
      /* Adjust ProseMirror editor for keyboard */
      :host-context(.keyboard-visible) .content-editor :global(.prosemirror-editor) {
        padding-bottom: var(--keyboard-height, 0px);
      }
    }

    /* Title styling to match AppHeaderComponent */
    .app-title {
      background: linear-gradient(135deg, #f8f9fa 0%, #8bb4f8 50%, #4776e6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-shadow: 0 2px 10px rgba(139, 180, 248, 0.3);
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
      overflow: hidden;
    }
    
    .title-line {
      font-size: 0.8rem;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 768px) {
      .title-line {
        font-size: 0.7rem;
        line-height: 1.0;
      }
    }
  `]
})
export class StoryEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('headerTitle', { static: true }) headerTitle!: TemplateRef<any>;
  @ViewChild('burgerMenuFooter', { static: true }) burgerMenuFooter!: TemplateRef<any>;
  @ViewChild('editorContainer') editorContainer!: ElementRef<HTMLDivElement>;
  private editorView: EditorView | null = null;
  private mutationObserver: MutationObserver | null = null;
  wordCount: number = 0;
  currentTextColor: string = '#e0e0e0';
  
  story: Story = {
    id: '',
    title: '',
    chapters: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  activeChapterId: string | null = null;
  activeSceneId: string | null = null;
  activeScene: Scene | null = null;
  showSidebar: boolean = true;
  leftActions: HeaderAction[] = [];
  rightActions: HeaderAction[] = [];
  burgerMenuItems: BurgerMenuItem[] = [];
  
  // Slash command functionality
  showSlashDropdown = false;
  slashDropdownPosition = { top: 0, left: 0 };
  slashCursorPosition = 0;
  
  // Image dialog functionality
  showImageDialog = false;
  imageCursorPosition = 0;
  
  // Story stats functionality
  showStoryStats = false;
  
  hasUnsavedChanges = false;
  debugModeEnabled = false;
  private saveSubject = new Subject<void>();
  private contentChangeSubject = new Subject<string>();
  private subscription: Subscription = new Subscription();
  private isStreamingActive = false;
  private isSaving = false;
  private pendingSave = false;
  
  // Touch/swipe gesture properties
  private touchStartX = 0;
  private touchStartY = 0;
  private touchEndX = 0;
  private touchEndY = 0;
  private minSwipeDistance = 50;
  private maxVerticalDistance = 100;
  
  // Mobile keyboard handling
  private keyboardHeight = 0;
  private originalViewportHeight = 0;
  private keyboardVisible = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storyService: StoryService,
    private proseMirrorService: ProseMirrorEditorService,
    private beatAIService: BeatAIService,
    private cdr: ChangeDetectorRef,
    private promptManager: PromptManagerService,
    private headerNavService: HeaderNavigationService,
    private settingsService: SettingsService,
    private storyStatsService: StoryStatsService,
    public versionService: VersionService
  ) {
    addIcons({ 
      arrowBack, bookOutline, book, settingsOutline, statsChartOutline,
      saveOutline, checkmarkCircleOutline, menuOutline, chevronBack, chevronForward,
      chatbubblesOutline, bugOutline, menu, close
    });
  }

  async ngOnInit(): Promise<void> {
    // Setup header actions first
    this.setupHeaderActions();
    
    // Check if we're on mobile and start with sidebar hidden
    this.checkMobileAndHideSidebar();
    
    // Subscribe to settings changes for text color
    this.subscription.add(
      this.settingsService.settings$.subscribe(settings => {
        this.currentTextColor = settings.appearance?.textColor || '#e0e0e0';
        console.log('Story Editor: Text color updated to:', this.currentTextColor);
        this.applyTextColorToProseMirror();
      })
    );
    
    const storyId = this.route.snapshot.paramMap.get('id');
    if (storyId) {
      const existingStory = await this.storyService.getStory(storyId);
      if (existingStory) {
        this.story = { ...existingStory };
        
        // Initialize prompt manager with current story
        await this.promptManager.setCurrentStory(this.story.id);
        
        // Auto-select last scene in last chapter
        if (this.story.chapters && this.story.chapters.length > 0) {
          const lastChapter = this.story.chapters[this.story.chapters.length - 1];
          if (lastChapter.scenes && lastChapter.scenes.length > 0) {
            const lastScene = lastChapter.scenes[lastChapter.scenes.length - 1];
            this.activeChapterId = lastChapter.id;
            this.activeSceneId = lastScene.id;
            this.activeScene = lastScene;
          }
        }
        
        // Calculate initial word count for the entire story
        this.updateWordCount();
        
        // Trigger change detection to ensure template is updated
        this.cdr.detectChanges();
        
        // Initialize editor after story is loaded and view is available
        setTimeout(() => {
          if (this.editorContainer) {
            this.initializeProseMirrorEditor();
            // Apply text color after editor is initialized
            this.applyTextColorToProseMirror();
            // Ensure scrolling happens after editor is fully initialized and content is rendered
            // Use requestAnimationFrame to ensure DOM is updated
            requestAnimationFrame(() => {
              setTimeout(() => {
                this.scrollToEndOfContent();
              }, 500);
            });
          }
        }, 0);
      } else {
        // Wenn Story nicht gefunden wird, zur Übersicht zurück
        this.router.navigate(['/']);
      }
    }

    // Auto-save mit optimiertem Debounce
    this.subscription.add(
      this.saveSubject.pipe(
        debounceTime(3000) // Erhöht auf 3 Sekunden für weniger häufiges Speichern
      ).subscribe(() => {
        this.saveStory();
      })
    );
    
    // Handle content changes with throttling to prevent excessive updates
    this.subscription.add(
      this.contentChangeSubject.pipe(
        throttleTime(500, undefined, { leading: true, trailing: true }) // Throttle content updates to max once per 500ms
      ).subscribe(content => {
        if (this.activeScene) {
          // Check content size to prevent memory issues
          if (content.length > 5000000) { // 5MB limit
            console.warn('Content too large, truncating...');
            content = content.substring(0, 5000000);
          }
          this.activeScene.content = content;
          this.updateWordCount();
          this.onContentChange();
        }
      })
    );
    
    // Subscribe to streaming state to pause auto-save during generation
    this.subscription.add(
      this.beatAIService.isStreaming$.subscribe(isStreaming => {
        this.isStreamingActive = isStreaming;
        console.log('Streaming state changed:', isStreaming ? 'ACTIVE' : 'STOPPED');
      })
    );

    // Listen for window resize to handle sidebar visibility
    window.addEventListener('resize', () => {
      this.checkMobileAndHideSidebar();
    });
    
    // Add touch gesture listeners for mobile
    this.setupTouchGestures();
    
    // Setup mobile keyboard handling
    this.setupMobileKeyboardHandling();
  }

  ngAfterViewInit(): void {
    // Editor will be initialized after story data is loaded in ngOnInit
    // This ensures proper timing
  }

  ngOnDestroy(): void {
    // Beim Verlassen der Komponente noch einmal speichern
    if (this.hasUnsavedChanges) {
      this.saveStory();
    }
    if (this.editorView) {
      this.proseMirrorService.destroy();
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    this.subscription.unsubscribe();
    
    // Remove touch gesture listeners
    this.removeTouchGestures();
    
    // Remove keyboard adjustments
    this.removeKeyboardAdjustments();
  }

  async onSceneSelected(event: {chapterId: string, sceneId: string}): Promise<void> {
    this.activeChapterId = event.chapterId;
    this.activeSceneId = event.sceneId;
    this.activeScene = await this.storyService.getScene(this.story.id, event.chapterId, event.sceneId);
    this.updateEditorContent();
    
    // Update story context for all Beat AI components
    this.proseMirrorService.updateStoryContext({
      storyId: this.story.id,
      chapterId: this.activeChapterId,
      sceneId: this.activeSceneId
    });

    // Hide sidebar on mobile after scene selection
    if (window.innerWidth <= 768) {
      this.showSidebar = false;
    }
  }

  onStoryTitleChange(): void {
    this.hasUnsavedChanges = true;
    this.saveSubject.next();
  }

  onSceneTitleChange(): void {
    if (this.activeScene && this.activeChapterId) {
      this.hasUnsavedChanges = true;
      this.saveSubject.next();
    }
  }

  onContentChange(): void {
    if (this.activeScene && this.activeChapterId && !this.isStreamingActive) {
      this.hasUnsavedChanges = true;
      this.updateHeaderActions(); // Update header to show unsaved status
      this.saveSubject.next();
      
      // Don't refresh prompt manager on every keystroke - it's too expensive
      // It will be refreshed when actually needed (when opening Beat AI)
    } else if (this.isStreamingActive) {
      // During streaming, only mark as unsaved but don't trigger auto-save
      this.hasUnsavedChanges = true;
      this.updateHeaderActions(); // Update header to show unsaved status
    }
  }

  private async saveStory(): Promise<void> {
    // Prevent concurrent saves
    if (this.isSaving) {
      this.pendingSave = true;
      return;
    }
    
    this.isSaving = true;
    
    try {
      // Only save if we have actual changes
      if (!this.hasUnsavedChanges) {
        this.isSaving = false;
        return;
      }
      
      // Save active scene changes only (not the entire story)
      if (this.activeScene && this.activeChapterId) {
        await this.storyService.updateScene(
          this.story.id, 
          this.activeChapterId, 
          this.activeScene.id, 
          {
            title: this.activeScene.title,
            content: this.activeScene.content
          }
        );
      }
      
      // Save story title if changed
      if (this.story.title !== undefined) {
        const currentStory = await this.storyService.getStory(this.story.id);
        if (currentStory && currentStory.title !== this.story.title) {
          await this.storyService.updateStory({
            ...currentStory,
            title: this.story.title,
            updatedAt: new Date()
          });
        }
      }
      
      this.hasUnsavedChanges = false;
      this.updateHeaderActions(); // Update header to show saved status
      
    } catch (error) {
      console.error('Error saving story:', error);
      // Re-mark as unsaved so it can be retried
      this.hasUnsavedChanges = true;
    } finally {
      this.isSaving = false;
      
      // If there was a pending save request during save, execute it
      if (this.pendingSave) {
        this.pendingSave = false;
        setTimeout(() => this.saveStory(), 100);
      }
    }
  }

  async goBack(): Promise<void> {
    if (this.hasUnsavedChanges) {
      await this.saveStory();
    }
    this.router.navigate(['/']);
  }

  async goToCodex(): Promise<void> {
    if (this.hasUnsavedChanges) {
      await this.saveStory();
    }
    this.router.navigate(['/stories/codex', this.story.id]);
  }

  async goToSettings(): Promise<void> {
    if (this.hasUnsavedChanges) {
      await this.saveStory();
    }
    this.router.navigate(['/stories/settings', this.story.id]);
  }

  async goToAILogs(): Promise<void> {
    if (this.hasUnsavedChanges) {
      await this.saveStory();
    }
    this.router.navigate(['/ai-logs']);
  }

  onBurgerMenuToggle(isOpen: boolean): void {
    // Handle burger menu state changes if needed
  }
  
  private setupHeaderActions(): void {
    // Left actions
    this.leftActions = [
      {
        icon: 'arrow-back',
        action: () => this.goBack(),
        showOnMobile: true,
        showOnDesktop: true
      },
      {
        icon: this.showSidebar ? 'book' : 'book-outline',
        action: () => this.toggleSidebar(),
        showOnMobile: true,
        showOnDesktop: true
      }
    ];
    
    // Right actions (status chips for desktop)
    this.rightActions = [
      {
        icon: this.hasUnsavedChanges ? 'save-outline' : 'checkmark-circle-outline',
        chipContent: this.hasUnsavedChanges ? 'Nicht gespeichert' : 'Gespeichert',
        chipColor: this.hasUnsavedChanges ? 'warning' : 'success',
        action: () => {},
        showOnMobile: false,
        showOnDesktop: true
      },
      {
        icon: 'stats-chart-outline',
        chipContent: `${this.wordCount}w`,
        chipColor: 'medium',
        action: () => this.showStoryStatsModal(),
        showOnMobile: false,
        showOnDesktop: true
      }
    ];
    
    // Burger menu items with custom actions for this component
    this.burgerMenuItems = [
      {
        icon: 'bug-outline',
        label: 'Debug Modus',
        action: () => this.toggleDebugMode(),
        color: 'warning'
      },
      {
        icon: 'book-outline',
        label: 'Codex',
        action: () => this.goToCodex()
      },
      {
        icon: 'settings-outline',
        label: 'Story Einstellungen',
        action: () => this.goToSettings()
      },
      {
        icon: 'chatbubbles-outline',
        label: 'Szenen Chat',
        action: () => this.goToSceneChat()
      },
      {
        icon: 'analytics',
        label: 'AI Logs',
        action: () => this.headerNavService.goToAILogger()
      },
      {
        icon: 'image',
        label: 'Bildgenerierung',
        action: () => this.headerNavService.goToImageGeneration()
      }
    ];
  }

  private updateHeaderActions(): void {
    // Update the save status and word count in the right actions
    if (this.rightActions.length >= 2) {
      // Update save status chip
      this.rightActions[0].icon = this.hasUnsavedChanges ? 'save-outline' : 'checkmark-circle-outline';
      this.rightActions[0].chipContent = this.hasUnsavedChanges ? 'Nicht gespeichert' : 'Gespeichert';
      this.rightActions[0].chipColor = this.hasUnsavedChanges ? 'warning' : 'success';
      
      // Update word count chip
      this.rightActions[1].chipContent = `${this.wordCount}w`;
      this.rightActions[1].action = () => this.showStoryStatsModal();
    }
  }

  async goToSceneChat(): Promise<void> {
    if (this.hasUnsavedChanges) {
      await this.saveStory();
    }
    // Navigate to scene chat with current story, chapter, and scene IDs
    if (this.activeChapterId && this.activeSceneId) {
      this.router.navigate(['/stories/chat', this.story.id, this.activeChapterId, this.activeSceneId]);
    } else {
      // If no scene is selected, navigate with just the story ID (scene chat can handle this)
      this.router.navigate(['/stories/chat', this.story.id, '', '']);
    }
  }

  getCurrentChapterTitle(): string {
    if (!this.activeChapterId || !this.story.chapters) return '';
    const chapter = this.story.chapters.find(c => c.id === this.activeChapterId);
    return chapter ? `C${chapter.chapterNumber || chapter.order}:${chapter.title}` : '';
  }

  getCurrentSceneTitle(): string {
    if (!this.activeScene || !this.activeChapterId || !this.story.chapters) return '';
    const chapter = this.story.chapters.find(c => c.id === this.activeChapterId);
    if (!chapter) return '';
    const chapterNum = chapter.chapterNumber || chapter.order;
    const sceneNum = this.activeScene.sceneNumber || this.activeScene.order;
    return `C${chapterNum}S${sceneNum}:${this.activeScene.title}`;
  }

  getSceneIdDisplay(): string {
    if (!this.activeScene || !this.activeChapterId || !this.story.chapters) return '';
    const chapter = this.story.chapters.find(c => c.id === this.activeChapterId);
    if (!chapter) return '';
    const chapterNum = chapter.chapterNumber || chapter.order;
    const sceneNum = this.activeScene.sceneNumber || this.activeScene.order;
    return `C${chapterNum}S${sceneNum}`;
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
    // Update the sidebar icon in left actions
    if (this.leftActions.length > 1) {
      this.leftActions[1].icon = this.showSidebar ? 'book' : 'book-outline';
    }
  }

  private checkMobileAndHideSidebar(): void {
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;
    
    // Hide sidebar by default on mobile devices
    if (isMobile) {
      this.showSidebar = false;
    }
    // Only auto-show sidebar on desktop
    else if (!isMobile && !this.showSidebar) {
      this.showSidebar = true;
    }
    
    // On tablets, allow toggling but start with sidebar visible
    if (isTablet && !this.showSidebar) {
      this.showSidebar = true;
    }
  }

  onCloseSidebar(): void {
    this.showSidebar = false;
  }
  
  private setupTouchGestures(): void {
    // Touch gestures disabled to prevent accidental sidebar closing
    return;
  }
  
  private removeTouchGestures(): void {
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
  }
  
  private handleTouchStart(event: TouchEvent): void {
    // Only enable gestures on mobile devices, not tablets
    if (window.innerWidth > 768) return;
    
    // Ignore touches that start on interactive elements
    const target = event.target as HTMLElement;
    if (this.isInteractiveElement(target)) {
      return;
    }
    
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }
  
  private handleTouchEnd(event: TouchEvent): void {
    // Only enable gestures on mobile devices, not tablets
    if (window.innerWidth > 768) return;
    
    // Ignore touches that end on interactive elements
    const target = event.target as HTMLElement;
    if (this.isInteractiveElement(target)) {
      return;
    }
    
    const touch = event.changedTouches[0];
    this.touchEndX = touch.clientX;
    this.touchEndY = touch.clientY;
    
    this.handleSwipeGesture();
  }
  
  private isInteractiveElement(element: HTMLElement): boolean {
    if (!element) return false;
    
    // Check if element or any parent is an interactive element
    let current = element;
    while (current && current !== document.body) {
      const tagName = current.tagName.toLowerCase();
      
      // Check for form elements
      if (['input', 'textarea', 'select', 'button'].includes(tagName)) {
        return true;
      }
      
      // Check for Ion elements that are interactive
      if (tagName.startsWith('ion-') && (
        tagName.includes('input') || 
        tagName.includes('textarea') || 
        tagName.includes('button') || 
        tagName.includes('select') || 
        tagName.includes('toggle') || 
        tagName.includes('checkbox') || 
        tagName.includes('radio')
      )) {
        return true;
      }
      
      // Check for elements with contenteditable
      if (current.contentEditable === 'true') {
        return true;
      }
      
      // Check for elements with role="button" or similar
      const role = current.getAttribute('role');
      if (role && ['button', 'textbox', 'combobox', 'listbox'].includes(role)) {
        return true;
      }
      
      current = current.parentElement as HTMLElement;
    }
    
    return false;
  }
  
  private handleSwipeGesture(): void {
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = Math.abs(this.touchEndY - this.touchStartY);
    
    // Check if it's a horizontal swipe (not vertical scroll)
    if (deltaY > this.maxVerticalDistance) return;
    
    // Check if swipe distance is sufficient
    if (Math.abs(deltaX) < this.minSwipeDistance) return;
    
    // Additional safety check: don't process gestures if touchStart coordinates are invalid
    if (this.touchStartX === undefined || this.touchStartY === undefined) return;
    
    // Adjust swipe sensitivity based on screen size
    const edgeThreshold = window.innerWidth <= 480 ? 30 : 50;
    const minSwipeDistance = window.innerWidth <= 480 ? 40 : this.minSwipeDistance;
    
    // Check if swipe distance is sufficient for this screen size
    if (Math.abs(deltaX) < minSwipeDistance) return;
    
    // Swipe from left edge to open sidebar
    if (deltaX > 0 && this.touchStartX < edgeThreshold && !this.showSidebar) {
      this.showSidebar = true;
      this.cdr.detectChanges();
    }
    // Swipe right to left to close sidebar - only if swipe started from within sidebar area
    else if (deltaX < 0 && this.showSidebar) {
      // On mobile, sidebar takes full width, so only close if swipe starts from left portion
      const sidebarWidth = window.innerWidth <= 480 ? 320 : 280;
      if (this.touchStartX < sidebarWidth) {
        this.showSidebar = false;
        this.cdr.detectChanges();
      }
    }
  }
  
  private setupMobileKeyboardHandling(): void {
    // Only setup keyboard handling on mobile devices
    if (!this.isMobileDevice()) return;
    
    // Store original viewport height
    this.originalViewportHeight = window.innerHeight;
    
    // Listen for viewport resize events (indicates keyboard show/hide)
    window.addEventListener('resize', () => {
      this.handleViewportResize();
    });
    
    // iOS specific keyboard handling
    if (this.isIOS()) {
      window.addEventListener('focusin', () => {
        this.handleKeyboardShow();
      });
      
      window.addEventListener('focusout', () => {
        this.handleKeyboardHide();
      });
    }
    
    // Modern browsers: Visual Viewport API
    if ('visualViewport' in window) {
      window.visualViewport?.addEventListener('resize', () => {
        this.handleVisualViewportResize();
      });
    }
  }
  
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
  }
  
  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
  
  private handleViewportResize(): void {
    if (!this.isMobileDevice()) return;
    
    const currentHeight = window.innerHeight;
    const heightDifference = this.originalViewportHeight - currentHeight;
    
    // Keyboard is likely visible if height decreased significantly
    if (heightDifference > 150) {
      this.keyboardHeight = heightDifference;
      this.keyboardVisible = true;
      this.adjustForKeyboard();
    } else {
      this.keyboardVisible = false;
      this.keyboardHeight = 0;
      this.removeKeyboardAdjustments();
    }
  }
  
  private handleVisualViewportResize(): void {
    if (!this.isMobileDevice() || !window.visualViewport) return;
    
    const viewport = window.visualViewport;
    const heightDifference = this.originalViewportHeight - viewport.height;
    
    if (heightDifference > 100) {
      this.keyboardHeight = heightDifference;
      this.keyboardVisible = true;
      this.adjustForKeyboard();
    } else {
      this.keyboardVisible = false;
      this.keyboardHeight = 0;
      this.removeKeyboardAdjustments();
    }
  }
  
  private handleKeyboardShow(): void {
    if (!this.isMobileDevice()) return;
    
    setTimeout(() => {
      this.keyboardVisible = true;
      this.adjustForKeyboard();
      this.scrollToActiveFocus();
    }, 300);
  }
  
  private handleKeyboardHide(): void {
    if (!this.isMobileDevice()) return;
    
    setTimeout(() => {
      this.keyboardVisible = false;
      this.removeKeyboardAdjustments();
    }, 300);
  }
  
  private adjustForKeyboard(): void {
    if (!this.keyboardVisible) return;
    
    const editorElement = this.editorContainer?.nativeElement;
    if (!editorElement) return;
    
    // Add keyboard-visible class to body for CSS adjustments
    document.body.classList.add('keyboard-visible');
    
    // Set CSS custom property for keyboard height
    document.documentElement.style.setProperty('--keyboard-height', `${this.keyboardHeight}px`);
    
    // Scroll to keep cursor visible
    setTimeout(() => {
      this.scrollToActiveFocus();
    }, 100);
  }
  
  private removeKeyboardAdjustments(): void {
    document.body.classList.remove('keyboard-visible');
    document.documentElement.style.removeProperty('--keyboard-height');
  }
  
  private scrollToActiveFocus(): void {
    if (!this.editorView || !this.keyboardVisible) return;
    
    try {
      const { state } = this.editorView;
      const { from } = state.selection;
      
      // Get cursor position
      const coords = this.editorView.coordsAtPos(from);
      
      // Calculate available space above keyboard
      const availableHeight = window.innerHeight - this.keyboardHeight;
      const targetPosition = availableHeight * 0.4; // Position cursor at 40% of available space
      
      // Scroll to keep cursor visible
      if (coords.top > targetPosition) {
        const scrollAmount = coords.top - targetPosition;
        window.scrollBy(0, scrollAmount);
      }
      
      // Also scroll the editor container if needed
      const editorElement = this.editorView.dom as HTMLElement;
      if (editorElement) {
        const contentEditor = editorElement.closest('.content-editor') as HTMLElement;
        if (contentEditor) {
          const rect = contentEditor.getBoundingClientRect();
          if (rect.bottom > availableHeight) {
            contentEditor.scrollTop += rect.bottom - availableHeight + 50;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to scroll to active focus:', error);
    }
  }


  private initializeProseMirrorEditor(): void {
    if (!this.editorContainer) return;
    
    this.editorView = this.proseMirrorService.createEditor(
      this.editorContainer.nativeElement,
      {
        placeholder: 'Hier beginnt deine Szene...',
        onUpdate: (signal: string) => {
          // Content changed - get it only when needed
          if (signal === '__content_changed__' && this.editorView) {
            const content = this.proseMirrorService.getHTMLContent();
            this.contentChangeSubject.next(content);
          }
        },
        onSlashCommand: (position: number) => {
          this.slashCursorPosition = position;
          this.showSlashDropdownAtCursor();
        },
        onBeatPromptSubmit: (event: BeatAIPromptEvent) => {
          this.handleBeatPromptSubmit(event);
        },
        onBeatContentUpdate: (beatData: BeatAI) => {
          this.handleBeatContentUpdate(beatData);
        },
        onBeatFocus: () => {
          this.hideSlashDropdown();
        },
        storyContext: {
          storyId: this.story.id,
          chapterId: this.activeChapterId || undefined,
          sceneId: this.activeSceneId || undefined
        },
        debugMode: this.debugModeEnabled
      }
    );
    
    // Set initial content if we have an active scene (skip scroll, will be done in ngOnInit)
    this.updateEditorContent(true);
    
    // Add click listener to hide dropdown when clicking in editor
    this.editorContainer.nativeElement.addEventListener('click', () => {
      if (this.showSlashDropdown) {
        setTimeout(() => this.hideSlashDropdown(), 100);
      }
    });
    
    // Add mobile keyboard handling to editor
    if (this.isMobileDevice()) {
      this.editorContainer.nativeElement.addEventListener('focus', () => {
        setTimeout(() => this.scrollToActiveFocus(), 300);
      }, true);
      
      this.editorContainer.nativeElement.addEventListener('input', () => {
        if (this.keyboardVisible) {
          setTimeout(() => this.scrollToActiveFocus(), 100);
        }
      });
    }
  }

  private updateEditorContent(skipScroll: boolean = false): void {
    if (this.editorView && this.activeScene) {
      this.proseMirrorService.setContent(this.activeScene.content || '');
      this.updateWordCount();
      // Scroll to end of content after setting content (unless skipped)
      if (!skipScroll) {
        setTimeout(() => {
          this.scrollToEndOfContent();
        }, 200);
      }
    } else if (!this.activeScene) {
      // No active scene, reset word count
      this.wordCount = 0;
      this.updateHeaderActions();
    }
  }

  private scrollToEndOfContent(): void {
    if (!this.editorView) {
      console.log('scrollToEndOfContent: No editor view');
      return;
    }
    
    console.log('scrollToEndOfContent: Starting scroll');
    
    try {
      const { state } = this.editorView;
      const { doc } = state;
      
      // Find a valid text position at the end of the document
      let endPos = doc.content.size;
      
      // If the document ends with a non-text node, find the last valid text position
      const lastChild = doc.lastChild;
      if (lastChild && !lastChild.isText && lastChild.isBlock) {
        // Position at the end of the last block's content
        endPos = doc.content.size - 1;
      }
      
      // Create selection at the end position
      const tr = state.tr.setSelection(TextSelection.near(doc.resolve(endPos)));
      this.editorView.dispatch(tr);
      
      // Scroll the editor view to show the cursor
      // Only focus on desktop to prevent mobile keyboard from opening
      if (!this.isMobileDevice()) {
        this.editorView.focus();
      }
      
      // Scroll the DOM element to the bottom
      setTimeout(() => {
        if (this.editorView) {
          const editorElement = this.editorView.dom as HTMLElement;
          if (editorElement) {
            console.log('Scrolling editor element:', {
              scrollTop: editorElement.scrollTop,
              scrollHeight: editorElement.scrollHeight,
              clientHeight: editorElement.clientHeight
            });
            
            // Ensure the element is visible and has height
            editorElement.scrollTop = editorElement.scrollHeight;
            
            // Force a reflow to ensure scrollHeight is calculated
            editorElement.offsetHeight;
            editorElement.scrollTop = editorElement.scrollHeight;
          }
          
          // Also scroll the parent container if needed
          const contentEditor = editorElement?.closest('.content-editor') as HTMLElement;
          if (contentEditor) {
            console.log('Scrolling content editor:', {
              scrollTop: contentEditor.scrollTop,
              scrollHeight: contentEditor.scrollHeight,
              clientHeight: contentEditor.clientHeight
            });
            
            contentEditor.scrollTop = contentEditor.scrollHeight;
            
            // Force a reflow here too
            contentEditor.offsetHeight;
            contentEditor.scrollTop = contentEditor.scrollHeight;
          }
        }
      }, 100);
    } catch (error) {
      console.warn('Failed to scroll to end of content:', error);
    }
  }

  private updateWordCount(): void {
    // Calculate total word count for the entire story using only saved content from localStorage
    this.wordCount = this.storyStatsService.calculateTotalStoryWordCount(this.story);
    
    // Update header actions to reflect the new word count
    this.updateHeaderActions();
    
    this.cdr.detectChanges();
  }

  private showSlashDropdownAtCursor(): void {
    if (!this.editorContainer || !this.editorView) return;
    
    // Get the cursor position in the editor
    const { state } = this.editorView;
    const { from } = state.selection;
    
    // Get the DOM position of the cursor
    const coords = this.editorView.coordsAtPos(from);
    
    // Calculate dropdown dimensions (approximate)
    const dropdownHeight = 200; // Estimated height based on content
    const gap = 5;
    
    // Get viewport height
    const viewportHeight = window.innerHeight;
    
    // Check if there's enough space below the cursor
    const spaceBelow = viewportHeight - coords.bottom;
    const spaceAbove = coords.top;
    
    let top: number;
    
    if (spaceBelow >= dropdownHeight + gap) {
      // Enough space below - position below cursor
      top = coords.bottom + gap;
    } else if (spaceAbove >= dropdownHeight + gap) {
      // Not enough space below but enough above - position above cursor
      top = coords.top - dropdownHeight - gap;
    } else {
      // Not enough space in either direction - position where it fits better
      if (spaceBelow > spaceAbove) {
        // More space below - position below but at bottom edge
        top = Math.max(0, viewportHeight - dropdownHeight - 10);
      } else {
        // More space above - position above but at top edge
        top = 10;
      }
    }
    
    // Calculate dropdown position relative to viewport
    this.slashDropdownPosition = {
      top: top,
      left: coords.left
    };
    
    this.showSlashDropdown = true;
  }

  hideSlashDropdown(): void {
    this.showSlashDropdown = false;
  }

  onSlashCommandSelected(result: SlashCommandResult): void {
    if (!this.activeScene || !this.editorView) return;
    
    // Hide dropdown immediately
    this.hideSlashDropdown();
    
    switch (result.action) {
      case SlashCommandAction.INSERT_BEAT:
        this.proseMirrorService.insertBeatAI(this.slashCursorPosition, true, 'story');
        break;
      case SlashCommandAction.INSERT_SCENE_BEAT:
        this.proseMirrorService.insertBeatAI(this.slashCursorPosition, true, 'scene');
        break;
      case SlashCommandAction.INSERT_IMAGE:
        this.showImageDialog = true;
        this.imageCursorPosition = this.slashCursorPosition;
        break;
    }
    
    // Focus the editor after a brief delay to ensure the component is ready (except for image dialog)
    // Only focus on desktop to prevent mobile keyboard from opening
    if (result.action !== SlashCommandAction.INSERT_IMAGE && !this.isMobileDevice()) {
      setTimeout(() => {
        this.proseMirrorService.focus();
      }, 100);
    }
  }

  private handleBeatPromptSubmit(event: BeatAIPromptEvent): void {
    console.log('Beat prompt submitted:', event);
    // Make sure dropdown is hidden when working with beat AI
    this.hideSlashDropdown();
    
    // Add story context to the beat AI prompt
    const enhancedEvent: BeatAIPromptEvent = {
      ...event,
      storyId: this.story.id,
      chapterId: this.activeChapterId || undefined,
      sceneId: this.activeSceneId || undefined
    };
    
    // Pass the enhanced event to the ProseMirror service
    if (this.proseMirrorService) {
      this.proseMirrorService.handleBeatPromptSubmit(enhancedEvent);
    }
  }

  private handleBeatContentUpdate(beatData: BeatAI): void {
    console.log('Beat content updated:', beatData);
    // Mark as changed but don't trigger immediate save for beat updates
    // These are already saved within the content
    this.hasUnsavedChanges = true;
    this.updateWordCount();
    // Don't trigger save subject - let the regular debounce handle it
  }

  hideImageDialog(): void {
    this.showImageDialog = false;
    // Focus the editor after hiding dialog
    // Only focus on desktop to prevent mobile keyboard from opening
    if (!this.isMobileDevice()) {
      setTimeout(() => {
        this.proseMirrorService.focus();
      }, 100);
    }
  }

  onImageInserted(imageData: ImageInsertResult): void {
    if (!this.activeScene || !this.editorView) return;
    
    // Hide dialog
    this.hideImageDialog();
    
    // Insert image through ProseMirror service
    this.proseMirrorService.insertImage(imageData, this.imageCursorPosition, true);
    
    // Focus the editor
    // Only focus on desktop to prevent mobile keyboard from opening
    if (!this.isMobileDevice()) {
      setTimeout(() => {
        this.proseMirrorService.focus();
      }, 100);
    }
  }
  
  // Scene Navigation Methods
  
  navigateToPreviousScene(): void {
    const prevScene = this.getPreviousScene();
    if (prevScene) {
      this.selectScene(prevScene.chapterId, prevScene.sceneId);
    }
  }
  
  navigateToNextScene(): void {
    const nextScene = this.getNextScene();
    if (nextScene) {
      this.selectScene(nextScene.chapterId, nextScene.sceneId);
    }
  }
  
  hasPreviousScene(): boolean {
    return this.getPreviousScene() !== null;
  }
  
  hasNextScene(): boolean {
    return this.getNextScene() !== null;
  }
  
  getCurrentSceneIndex(): number {
    if (!this.activeChapterId || !this.activeSceneId) return 0;
    
    let index = 0;
    for (const chapter of this.story.chapters) {
      for (const scene of chapter.scenes) {
        index++;
        if (chapter.id === this.activeChapterId && scene.id === this.activeSceneId) {
          return index;
        }
      }
    }
    return 0;
  }
  
  getTotalScenes(): number {
    return this.story.chapters.reduce((total, chapter) => total + chapter.scenes.length, 0);
  }
  
  private getPreviousScene(): {chapterId: string, sceneId: string} | null {
    if (!this.activeChapterId || !this.activeSceneId) return null;
    
    let previousScene: {chapterId: string, sceneId: string} | null = null;
    
    for (const chapter of this.story.chapters) {
      for (const scene of chapter.scenes) {
        if (chapter.id === this.activeChapterId && scene.id === this.activeSceneId) {
          return previousScene;
        }
        previousScene = { chapterId: chapter.id, sceneId: scene.id };
      }
    }
    
    return null;
  }
  
  private getNextScene(): {chapterId: string, sceneId: string} | null {
    if (!this.activeChapterId || !this.activeSceneId) return null;
    
    let foundCurrent = false;
    
    for (const chapter of this.story.chapters) {
      for (const scene of chapter.scenes) {
        if (foundCurrent) {
          return { chapterId: chapter.id, sceneId: scene.id };
        }
        if (chapter.id === this.activeChapterId && scene.id === this.activeSceneId) {
          foundCurrent = true;
        }
      }
    }
    
    return null;
  }
  
  private async selectScene(chapterId: string, sceneId: string): Promise<void> {
    // Save current scene before switching
    if (this.hasUnsavedChanges) {
      await this.saveStory();
    }
    
    this.activeChapterId = chapterId;
    this.activeSceneId = sceneId;
    this.activeScene = await this.storyService.getScene(this.story.id, chapterId, sceneId);
    this.updateEditorContent();
    
    // Update story context for all Beat AI components
    this.proseMirrorService.updateStoryContext({
      storyId: this.story.id,
      chapterId: this.activeChapterId,
      sceneId: this.activeSceneId
    });
    
    // Force change detection
    this.cdr.detectChanges();
  }

  toggleDebugMode(): void {
    this.debugModeEnabled = !this.debugModeEnabled;
    
    if (this.editorView) {
      this.proseMirrorService.toggleDebugMode(this.debugModeEnabled);
    }
    
    console.log('Debug mode:', this.debugModeEnabled ? 'enabled' : 'disabled');
  }

  showStoryStatsModal(): void {
    this.showStoryStats = true;
  }

  hideStoryStats(): void {
    this.showStoryStats = false;
  }


  private applyTextColorToProseMirror(): void {
    setTimeout(() => {
      // Apply text color to all existing elements
      this.applyTextColorToAllElements();
      
      // Setup MutationObserver to watch for dynamically added Beat AI components
      this.setupMutationObserver();
    }, 100);
  }

  private applyTextColorToAllElements(): void {
    // Set CSS variable on content-editor element
    const contentEditor = document.querySelector('.content-editor');
    if (contentEditor) {
      (contentEditor as HTMLElement).style.setProperty('--editor-text-color', this.currentTextColor);
      console.log('Applied --editor-text-color to content-editor:', this.currentTextColor);
    }
    
    // Target the actual ProseMirror element created by the service
    const prosemirrorElement = document.querySelector('.ProseMirror.prosemirror-editor');
    if (prosemirrorElement) {
      (prosemirrorElement as HTMLElement).style.setProperty('--editor-text-color', this.currentTextColor);
      (prosemirrorElement as HTMLElement).style.color = this.currentTextColor;
      console.log('Applied text color to ProseMirror element:', this.currentTextColor);
    }
    
    // Apply to all Beat AI components
    this.applyTextColorToBeatAIElements();
    
    console.log('Applied text color to all existing elements:', this.currentTextColor);
  }

  private applyTextColorToBeatAIElements(): void {
    // Apply to all Beat AI containers - only set CSS custom property, let CSS handle the rest
    const beatAIContainers = document.querySelectorAll('.beat-ai-container');
    console.log('Found', beatAIContainers.length, 'Beat AI containers to update with color:', this.currentTextColor);
    beatAIContainers.forEach((container, index) => {
      // Set CSS custom property
      (container as HTMLElement).style.setProperty('--beat-ai-text-color', this.currentTextColor);
      console.log(`Applied --beat-ai-text-color to container ${index}:`, this.currentTextColor);
      
      // Debug: Check if the variable is actually set
      const computedStyle = window.getComputedStyle(container as HTMLElement);
      const appliedColor = computedStyle.getPropertyValue('--beat-ai-text-color');
      console.log(`Container ${index} computed --beat-ai-text-color:`, appliedColor);
    });
  }

  private setupMutationObserver(): void {
    // Disconnect existing observer if any
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    // Create new observer to watch for Beat AI components being added
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldApplyStyles = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check if the added node is a Beat AI container or contains one
              if (element.classList?.contains('beat-ai-container') || 
                  element.querySelector?.('.beat-ai-container')) {
                shouldApplyStyles = true;
              }
              
              // Also check for ProseMirror elements that might be Beat AI related
              if (element.classList?.contains('ProseMirror') ||
                  element.querySelector?.('.ProseMirror')) {
                shouldApplyStyles = true;
              }
            }
          });
        }
      });
      
      if (shouldApplyStyles) {
        // Apply styles to newly added Beat AI elements
        // Use longer delay to ensure Angular components are fully initialized
        setTimeout(() => {
          this.applyTextColorToBeatAIElements();
          console.log('Applied text color to newly added Beat AI elements:', this.currentTextColor);
        }, 200);
      }
    });

    // Start observing the editor container and its subtree
    const targetNode = document.querySelector('.content-editor') || document.body;
    this.mutationObserver.observe(targetNode, {
      childList: true,
      subtree: true
    });
    
    console.log('MutationObserver setup complete for Beat AI text color application');
  }

}