import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, 
  IonContent, IonInput, IonChip, IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack, bookOutline, book, settingsOutline, statsChartOutline,
  saveOutline, checkmarkCircleOutline, menuOutline, chevronBack, chevronForward
} from 'ionicons/icons';
import { StoryService } from '../services/story.service';
import { Story, Scene } from '../models/story.interface';
import { StoryStructureComponent } from './story-structure.component';
import { SlashCommandDropdownComponent } from './slash-command-dropdown.component';
import { SlashCommandResult, SlashCommandAction } from '../models/slash-command.interface';
import { Subscription, debounceTime, Subject } from 'rxjs';
import { ProseMirrorEditorService } from '../../shared/services/prosemirror-editor.service';
import { EditorView } from 'prosemirror-view';
import { Selection, TextSelection } from 'prosemirror-state';
import { BeatAI, BeatAIPromptEvent } from '../models/beat-ai.interface';
import { BeatAIService } from '../../shared/services/beat-ai.service';
import { PromptManagerService } from '../../shared/services/prompt-manager.service';
import { ImageUploadDialogComponent, ImageInsertResult } from '../../shared/components/image-upload-dialog.component';

@Component({
  selector: 'app-story-editor',
  standalone: true,
  imports: [
    CommonModule, FormsModule, 
    IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle,
    IonContent, IonInput, IonChip, IonLabel,
    StoryStructureComponent, SlashCommandDropdownComponent, ImageUploadDialogComponent
  ],
  template: `
    <div class="ion-page">
      <ion-header>
        <ion-toolbar color="dark">
          <ion-buttons slot="start">
            <ion-button (click)="goBack()">
              <ion-icon name="arrow-back" slot="icon-only"></ion-icon>
            </ion-button>
            <ion-button (click)="toggleSidebar()">
              <ion-icon [name]="showSidebar ? 'book' : 'book-outline'" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
          
          <ion-title *ngIf="activeScene">
            {{ getCurrentChapterTitle() }} - {{ activeScene.title }}
          </ion-title>
          
          <ion-buttons slot="end">
            <ion-button (click)="goToCodex()">
              <ion-icon name="book-outline" slot="icon-only"></ion-icon>
            </ion-button>
            <ion-button (click)="goToSettings()">
              <ion-icon name="settings-outline" slot="icon-only"></ion-icon>
            </ion-button>
            <ion-button (click)="goToAILogs()">
              <ion-icon name="stats-chart-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
        
        <ion-toolbar color="dark" class="status-toolbar">
          <ion-chip slot="start" [color]="hasUnsavedChanges ? 'warning' : 'success'">
            <ion-icon [name]="hasUnsavedChanges ? 'save-outline' : 'checkmark-circle-outline'"></ion-icon>
            <ion-label>{{ hasUnsavedChanges ? 'Nicht gespeichert' : 'Gespeichert' }}</ion-label>
          </ion-chip>
          <ion-chip slot="end" color="medium">
            <ion-label>{{ wordCount }} Wörter</ion-label>
          </ion-chip>
        </ion-toolbar>
      </ion-header>
      
      <ion-content color="dark">
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
            <div class="editor-content">
              <div class="editor-inner">
                <ion-input 
                  type="text" 
                  class="title-input" 
                  placeholder="Titel deiner Geschichte..." 
                  [(ngModel)]="story.title"
                  (ngModelChange)="onStoryTitleChange()"
                  fill="outline"
                  color="light"
                ></ion-input>
                
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
                    
                    <div class="scene-info">
                      <span class="scene-counter">Szene {{ getCurrentSceneIndex() }} von {{ getTotalScenes() }}</span>
                    </div>
                    
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
                  
                  <ion-input 
                    type="text" 
                    class="scene-title-input" 
                    placeholder="Szenen-Titel..." 
                    [(ngModel)]="activeScene.title"
                    (ngModelChange)="onSceneTitleChange()"
                    fill="outline"
                    color="medium"
                  ></ion-input>
                  
                  <div 
                    #editorContainer
                    class="content-editor"
                  ></div>
                  
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
    </div>
  `,
  styles: [`
    .ion-page {
      background-color: #1a1a1a;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    ion-header {
      --ion-toolbar-background: #2d2d2d;
      --ion-toolbar-color: #f8f9fa;
    }
    
    .status-toolbar {
      --min-height: 48px;
      --padding-top: 8px;
      --padding-bottom: 8px;
    }
    
    .status-toolbar ion-chip {
      --background: transparent;
      font-size: 0.9rem;
    }
    
    ion-content {
      --background: #1a1a1a;
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
    }
    
    .editor-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      margin-left: 280px; /* Make space for fixed sidebar */
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
      padding: 2rem 1rem;
      width: 100%;
      box-sizing: border-box;
    }

    /* Optimal reading width container */
    .editor-inner {
      max-width: 650px;
      margin: 0 auto;
      width: 100%;
      padding-bottom: 4rem; /* Extra space at bottom for better scrolling */
    }

    /* Different max-widths for different screens */
    @media (min-width: 1400px) {
      .editor-inner {
        max-width: 700px;
      }
    }

    @media (min-width: 1600px) {
      .editor-inner {
        max-width: 750px;
      }
    }
    
    .title-input {
      --background: #2d2d2d;
      --color: #f8f9fa;
      --placeholder-color: #6c757d;
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 16px;
      --padding-bottom: 16px;
      font-size: 1.8rem;
      font-weight: bold;
      margin-bottom: 1rem;
    }
    
    .scene-editor {
      display: flex;
      flex-direction: column;
      min-height: 0; /* Allow shrinking */
    }
    
    .scene-title-input {
      --background: #2d2d2d;
      --color: #e0e0e0;
      --placeholder-color: #6c757d;
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 12px;
      --padding-bottom: 12px;
      font-size: 1.3rem;
      font-weight: 500;
      margin-bottom: 1rem;
    }
    
    /* Scene Navigation Styles */
    .scene-navigation {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
      border-bottom: 1px solid #404040;
      margin-bottom: 1rem;
    }
    
    .scene-navigation.bottom {
      border-bottom: none;
      border-top: 1px solid #404040;
      margin-bottom: 0;
      margin-top: 2rem;
    }
    
    .scene-navigation .nav-button {
      --color: #e0e0e0;
      --color-hover: #f8f9fa;
      font-size: 0.9rem;
      font-weight: 500;
      min-width: 140px;
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
    
    .scene-info {
      text-align: center;
      flex: 1;
    }
    
    .scene-counter {
      color: #adb5bd;
      font-size: 0.85rem;
      font-weight: 500;
    }
    
    .no-scene {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6c757d;
      font-size: 1.1rem;
    }
    
    .content-editor {
      border: none;
      outline: none;
      font-size: 0.8rem;
      line-height: 1.8;
      font-family: Georgia, serif;
      padding: 1rem 0;
      background: transparent;
      color: #e0e0e0;
      min-height: 300px; /* Minimum height for editor */
    }
    
    .content-editor :global(.prosemirror-editor) {
      outline: none;
      border: none;
      background: transparent;
      color: #e0e0e0;
      font-size: 0.8rem;
      line-height: 1.8;
      font-family: Georgia, serif;
      min-height: 200px;
      white-space: pre-wrap;
      word-wrap: break-word;
      -webkit-font-variant-ligatures: none;
      font-variant-ligatures: none;
      padding-bottom: 50vh; /* Ensure we can scroll past the last line */
    }
    
    .content-editor :global(.prosemirror-editor p) {
      margin: 0 0 1.5rem 0;
      text-indent: 2rem;
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
      color: #f8f9fa;
      font-weight: bold;
      margin: 1.5rem 0 1rem 0;
    }
    
    .content-editor :global(.prosemirror-editor h1) {
      font-size: 1.2rem;
    }
    
    .content-editor :global(.prosemirror-editor h2) {
      font-size: 1.0rem;
    }
    
    .content-editor :global(.prosemirror-editor h3) {
      font-size: 0.9rem;
    }
    
    .content-editor :global(.prosemirror-editor strong) {
      color: #f8f9fa;
      font-weight: bold;
    }
    
    .content-editor :global(.prosemirror-editor em) {
      color: #adb5bd;
      font-style: italic;
    }
    
    .content-editor :global(.prosemirror-editor ul),
    .content-editor :global(.prosemirror-editor ol) {
      padding-left: 1.5rem;
      margin: 1rem 0;
    }
    
    .content-editor :global(.prosemirror-editor li) {
      margin: 0.5rem 0;
    }
    
    .content-editor :global(.beat-ai-wrapper) {
      margin: 1rem 0;
      position: relative;
    }
    
    .content-editor :global(.ProseMirror-selectednode .beat-ai-wrapper) {
      outline: 2px solid #0d6efd;
      outline-offset: 2px;
      border-radius: 8px;
    }
    
    /* Additional ProseMirror CSS fixes */
    .content-editor :global(.ProseMirror) {
      position: relative;
      white-space: pre-wrap;
      word-wrap: break-word;
      -webkit-font-variant-ligatures: none;
      font-variant-ligatures: none;
      font-feature-settings: "liga" 0;
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
        padding: 1rem 0.75rem;
      }

      .editor-inner {
        max-width: 100%;
        padding-bottom: 6rem; /* More space on mobile */
      }

      .title-input {
        font-size: 1.5rem;
      }

      .scene-title-input {
        font-size: 1.1rem;
      }
      
      /* Mobile navigation adjustments */
      .scene-navigation {
        padding: 0.75rem 0;
      }
      
      .scene-navigation .nav-button {
        min-width: 120px;
        font-size: 0.85rem;
      }
      
      .scene-counter {
        font-size: 0.8rem;
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
        padding: 0.75rem 0.5rem;
      }

      .title-input {
        font-size: 1.3rem;
      }

      .scene-title-input {
        font-size: 1rem;
      }
      
      /* Small mobile navigation */
      .scene-navigation {
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.5rem 0;
      }
      
      .scene-navigation .nav-button {
        min-width: 100px;
        font-size: 0.8rem;
        width: 100%;
        max-width: 200px;
      }
      
      .scene-info {
        order: -1;
        margin-bottom: 0.5rem;
      }
      
      .scene-navigation.bottom .scene-info {
        order: 1;
        margin-bottom: 0;
        margin-top: 0.5rem;
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
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: flex-start;
        padding-top: 2rem;
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
  `]
})
export class StoryEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('editorContainer') editorContainer!: ElementRef<HTMLDivElement>;
  private editorView: EditorView | null = null;
  wordCount: number = 0;
  
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
  
  // Slash command functionality
  showSlashDropdown = false;
  slashDropdownPosition = { top: 0, left: 0 };
  slashCursorPosition = 0;
  
  // Image dialog functionality
  showImageDialog = false;
  imageCursorPosition = 0;
  
  hasUnsavedChanges = false;
  private saveSubject = new Subject<void>();
  private subscription: Subscription = new Subscription();
  
  // Touch/swipe gesture properties
  private touchStartX = 0;
  private touchStartY = 0;
  private touchEndX = 0;
  private touchEndY = 0;
  private minSwipeDistance = 50;
  private maxVerticalDistance = 100;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storyService: StoryService,
    private proseMirrorService: ProseMirrorEditorService,
    private beatAIService: BeatAIService,
    private cdr: ChangeDetectorRef,
    private promptManager: PromptManagerService
  ) {
    addIcons({ 
      arrowBack, bookOutline, book, settingsOutline, statsChartOutline,
      saveOutline, checkmarkCircleOutline, menuOutline, chevronBack, chevronForward
    });
  }

  async ngOnInit(): Promise<void> {
    // Check if we're on mobile and start with sidebar hidden
    this.checkMobileAndHideSidebar();
    
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
        
        // Trigger change detection to ensure template is updated
        this.cdr.detectChanges();
        
        // Initialize editor after story is loaded and view is available
        setTimeout(() => {
          if (this.editorContainer) {
            this.initializeProseMirrorEditor();
          }
        }, 0);
      } else {
        // Wenn Story nicht gefunden wird, zur Übersicht zurück
        this.router.navigate(['/']);
      }
    }

    // Auto-save mit Debounce
    this.subscription.add(
      this.saveSubject.pipe(
        debounceTime(1000)
      ).subscribe(() => {
        this.saveStory();
      })
    );

    // Listen for window resize to handle sidebar visibility
    window.addEventListener('resize', () => {
      this.checkMobileAndHideSidebar();
    });
    
    // Add touch gesture listeners for mobile
    this.setupTouchGestures();
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
    this.subscription.unsubscribe();
    
    // Remove touch gesture listeners
    this.removeTouchGestures();
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
    if (this.activeScene && this.activeChapterId) {
      this.hasUnsavedChanges = true;
      this.saveSubject.next();
      
      // Refresh prompt manager when content changes
      this.promptManager.refresh();
    }
  }

  private async saveStory(): Promise<void> {
    // Only save story title and active scene content - don't overwrite entire story structure
    this.story.updatedAt = new Date();
    
    // Save story title only
    const currentStory = await this.storyService.getStory(this.story.id);
    if (currentStory) {
      await this.storyService.updateStory({
        ...currentStory,
        title: this.story.title,
        updatedAt: new Date()
      });
    }
    
    // Save active scene changes
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
    
    this.hasUnsavedChanges = false;
    
    // Refresh story data to get latest structure
    const updatedStory = await this.storyService.getStory(this.story.id);
    if (updatedStory) {
      this.story = updatedStory;
      // Refresh active scene reference
      if (this.activeChapterId && this.activeSceneId) {
        this.activeScene = await this.storyService.getScene(this.story.id, this.activeChapterId, this.activeSceneId);
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

  getCurrentChapterTitle(): string {
    if (!this.activeChapterId || !this.story.chapters) return '';
    const chapter = this.story.chapters.find(c => c.id === this.activeChapterId);
    return chapter ? chapter.title : '';
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  private checkMobileAndHideSidebar(): void {
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;
    
    if (isMobile && this.showSidebar) {
      this.showSidebar = false;
    } else if (!isMobile && !this.showSidebar) {
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
    // Only setup gestures on mobile devices
    if (window.innerWidth > 768) return;
    
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
  }
  
  private removeTouchGestures(): void {
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
  }
  
  private handleTouchStart(event: TouchEvent): void {
    // Only enable gestures on mobile devices, not tablets
    if (window.innerWidth > 768) return;
    
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }
  
  private handleTouchEnd(event: TouchEvent): void {
    // Only enable gestures on mobile devices, not tablets
    if (window.innerWidth > 768) return;
    
    const touch = event.changedTouches[0];
    this.touchEndX = touch.clientX;
    this.touchEndY = touch.clientY;
    
    this.handleSwipeGesture();
  }
  
  private handleSwipeGesture(): void {
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = Math.abs(this.touchEndY - this.touchStartY);
    
    // Check if it's a horizontal swipe (not vertical scroll)
    if (deltaY > this.maxVerticalDistance) return;
    
    // Check if swipe distance is sufficient
    if (Math.abs(deltaX) < this.minSwipeDistance) return;
    
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
    // Swipe right to left to close sidebar
    else if (deltaX < 0 && this.showSidebar) {
      this.showSidebar = false;
      this.cdr.detectChanges();
    }
  }


  private initializeProseMirrorEditor(): void {
    if (!this.editorContainer) return;
    
    this.editorView = this.proseMirrorService.createEditor(
      this.editorContainer.nativeElement,
      {
        placeholder: 'Hier beginnt deine Szene...',
        onUpdate: (content: string) => {
          if (this.activeScene) {
            this.activeScene.content = content;
            this.updateWordCount();
            this.onContentChange();
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
        }
      }
    );
    
    // Set initial content if we have an active scene
    this.updateEditorContent();
    
    // Add click listener to hide dropdown when clicking in editor
    this.editorContainer.nativeElement.addEventListener('click', () => {
      if (this.showSlashDropdown) {
        setTimeout(() => this.hideSlashDropdown(), 100);
      }
    });
  }

  private updateEditorContent(): void {
    if (this.editorView && this.activeScene) {
      this.proseMirrorService.setContent(this.activeScene.content || '');
      this.updateWordCount();
      // Scroll to end of content after setting content
      setTimeout(() => {
        this.scrollToEndOfContent();
      }, 100);
    }
  }

  private scrollToEndOfContent(): void {
    if (!this.editorView) return;
    
    try {
      const { state } = this.editorView;
      const doc = state.doc;
      const endPos = doc.content.size;
      
      // Set cursor to end of document
      const endSelection = TextSelection.create(doc, endPos);
      const tr = state.tr.setSelection(endSelection);
      this.editorView.dispatch(tr);
      
      // Scroll the editor view to show the cursor
      this.editorView.focus();
      
      // Scroll the DOM element to the bottom
      setTimeout(() => {
        if (this.editorView) {
          const editorElement = this.editorView.dom as HTMLElement;
          if (editorElement) {
            editorElement.scrollTop = editorElement.scrollHeight;
          }
          
          // Also scroll the parent container if needed
          const contentEditor = editorElement?.closest('.content-editor') as HTMLElement;
          if (contentEditor) {
            contentEditor.scrollTop = contentEditor.scrollHeight;
          }
        }
      }, 50);
    } catch (error) {
      console.warn('Failed to scroll to end of content:', error);
    }
  }

  private updateWordCount(): void {
    if (!this.editorView) {
      this.wordCount = 0;
      return;
    }
    const textContent = this.proseMirrorService.getTextContent();
    this.wordCount = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
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
        this.proseMirrorService.insertBeatAI(this.slashCursorPosition, true);
        break;
      case SlashCommandAction.INSERT_IMAGE:
        this.showImageDialog = true;
        this.imageCursorPosition = this.slashCursorPosition;
        break;
    }
    
    // Focus the editor after a brief delay to ensure the component is ready (except for image dialog)
    if (result.action !== SlashCommandAction.INSERT_IMAGE) {
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
    // Trigger auto-save when beat content changes
    this.hasUnsavedChanges = true;
    this.updateWordCount();
    this.saveSubject.next();
  }

  hideImageDialog(): void {
    this.showImageDialog = false;
    // Focus the editor after hiding dialog
    setTimeout(() => {
      this.proseMirrorService.focus();
    }, 100);
  }

  onImageInserted(imageData: ImageInsertResult): void {
    if (!this.activeScene || !this.editorView) return;
    
    // Hide dialog
    this.hideImageDialog();
    
    // Insert image through ProseMirror service
    this.proseMirrorService.insertImage(imageData, this.imageCursorPosition, true);
    
    // Focus the editor
    setTimeout(() => {
      this.proseMirrorService.focus();
    }, 100);
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
}