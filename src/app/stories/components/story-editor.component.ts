import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoryService } from '../services/story.service';
import { Story, Chapter, Scene } from '../models/story.interface';
import { StoryStructureComponent } from './story-structure.component';
import { SlashCommandDropdownComponent } from './slash-command-dropdown.component';
import { SlashCommandResult, SlashCommandAction } from '../models/slash-command.interface';
import { Subscription, debounceTime, Subject } from 'rxjs';
import { ProseMirrorEditorService } from '../../shared/services/prosemirror-editor.service';
import { EditorView } from 'prosemirror-view';
import { BeatAI, BeatAIPromptEvent } from '../models/beat-ai.interface';
import { BeatAIService } from '../../shared/services/beat-ai.service';

@Component({
  selector: 'app-story-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, StoryStructureComponent, SlashCommandDropdownComponent],
  template: `
    <div class="editor-container">
      <app-story-structure 
        [story]="story" 
        [activeChapterId]="activeChapterId"
        [activeSceneId]="activeSceneId"
        (sceneSelected)="onSceneSelected($event)">
      </app-story-structure>
      
      <div class="editor-main">
        <div class="editor-header">
          <button class="back-btn" (click)="goBack()">← Zurück zur Übersicht</button>
          <div class="story-info">
            <button class="settings-btn" (click)="goToSettings()" title="Story-Einstellungen">⚙️</button>
            <span class="scene-info" *ngIf="activeScene">
              {{ getCurrentChapterTitle() }} - {{ activeScene.title }}
            </span>
            <span class="word-count">{{ wordCount }} Wörter</span>
            <span class="save-status" [class.saved]="!hasUnsavedChanges">
              {{ hasUnsavedChanges ? 'Nicht gespeichert' : 'Gespeichert' }}
            </span>
          </div>
        </div>
        
        <div class="editor-content">
          <input 
            type="text" 
            class="title-input" 
            placeholder="Titel deiner Geschichte..." 
            [(ngModel)]="story.title"
            (ngModelChange)="onStoryTitleChange()"
          />
          
          <div class="scene-editor" *ngIf="activeScene">
            <input 
              type="text" 
              class="scene-title-input" 
              placeholder="Szenen-Titel..." 
              [(ngModel)]="activeScene.title"
              (ngModelChange)="onSceneTitleChange()"
            />
            
            <div 
              #editorContainer
              class="content-editor"
            ></div>
          </div>
          
          <div class="no-scene" *ngIf="!activeScene">
            <p>Wähle eine Szene aus der Struktur, um zu beginnen.</p>
          </div>
        </div>
      </div>
      
      <app-slash-command-dropdown
        *ngIf="showSlashDropdown"
        [position]="slashDropdownPosition"
        [cursorPosition]="slashCursorPosition"
        (commandSelected)="onSlashCommandSelected($event)"
        (dismissed)="hideSlashDropdown()">
      </app-slash-command-dropdown>
    </div>
  `,
  styles: [`
    .editor-container {
      height: 100vh;
      display: flex;
      background: #1a1a1a;
    }
    
    .editor-main {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      background: #2d2d2d;
      border-bottom: 1px solid #404040;
    }
    
    .back-btn {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    .back-btn:hover {
      background: #5a6268;
    }
    
    .story-info {
      display: flex;
      gap: 2rem;
      font-size: 0.9rem;
      align-items: center;
    }
    
    .settings-btn {
      background: #495057;
      border: none;
      padding: 0.4rem 0.6rem;
      border-radius: 6px;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    .settings-btn:hover {
      background: #343a40;
    }
    
    .word-count {
      color: #adb5bd;
    }
    
    .save-status {
      color: #dc3545;
      font-weight: 500;
    }
    
    .save-status.saved {
      color: #28a745;
    }
    
    .editor-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }
    
    .title-input {
      font-size: 1.8rem;
      font-weight: bold;
      border: none;
      outline: none;
      padding: 1rem 0;
      margin-bottom: 1rem;
      border-bottom: 2px solid transparent;
      transition: border-color 0.3s;
      background: transparent;
      color: #f8f9fa;
    }
    
    .title-input:focus {
      border-bottom-color: #0d6efd;
    }
    
    .title-input::placeholder {
      color: #6c757d;
    }
    
    .scene-editor {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .scene-title-input {
      font-size: 1.3rem;
      font-weight: 500;
      border: none;
      outline: none;
      padding: 0.75rem 0;
      margin-bottom: 1rem;
      border-bottom: 1px solid transparent;
      transition: border-color 0.3s;
      background: transparent;
      color: #e0e0e0;
    }
    
    .scene-title-input:focus {
      border-bottom-color: #6c757d;
    }
    
    .scene-title-input::placeholder {
      color: #6c757d;
    }
    
    .scene-info {
      color: #adb5bd;
      font-size: 0.9rem;
      margin-right: 1rem;
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
      flex: 1;
      border: none;
      outline: none;
      font-size: 1.1rem;
      line-height: 1.6;
      font-family: Georgia, serif;
      padding: 1rem 0;
      background: transparent;
      color: #e0e0e0;
      overflow-y: auto;
    }
    
    .content-editor :global(.prosemirror-editor) {
      outline: none;
      border: none;
      background: transparent;
      color: #e0e0e0;
      font-size: 1.1rem;
      line-height: 1.6;
      font-family: Georgia, serif;
      min-height: 200px;
      white-space: pre-wrap;
      word-wrap: break-word;
      -webkit-font-variant-ligatures: none;
      font-variant-ligatures: none;
    }
    
    .content-editor :global(.prosemirror-editor p) {
      margin: 0 0 1rem 0;
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
      font-size: 1.5rem;
    }
    
    .content-editor :global(.prosemirror-editor h2) {
      font-size: 1.3rem;
    }
    
    .content-editor :global(.prosemirror-editor h3) {
      font-size: 1.1rem;
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
  
  // Slash command functionality
  showSlashDropdown = false;
  slashDropdownPosition = { top: 0, left: 0 };
  slashCursorPosition = 0;
  
  hasUnsavedChanges = false;
  private saveSubject = new Subject<void>();
  private subscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storyService: StoryService,
    private proseMirrorService: ProseMirrorEditorService,
    private beatAIService: BeatAIService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const storyId = this.route.snapshot.paramMap.get('id');
    if (storyId) {
      const existingStory = this.storyService.getStory(storyId);
      if (existingStory) {
        this.story = { ...existingStory };
        // Auto-select first scene
        if (this.story.chapters && this.story.chapters.length > 0 && 
            this.story.chapters[0].scenes && this.story.chapters[0].scenes.length > 0) {
          this.activeChapterId = this.story.chapters[0].id;
          this.activeSceneId = this.story.chapters[0].scenes[0].id;
          this.activeScene = this.story.chapters[0].scenes[0];
        }
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
  }

  ngAfterViewInit(): void {
    this.initializeProseMirrorEditor();
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
  }

  onSceneSelected(event: {chapterId: string, sceneId: string}): void {
    this.activeChapterId = event.chapterId;
    this.activeSceneId = event.sceneId;
    this.activeScene = this.storyService.getScene(this.story.id, event.chapterId, event.sceneId);
    this.updateEditorContent();
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
    }
  }

  private saveStory(): void {
    // Only save story title and active scene content - don't overwrite entire story structure
    this.story.updatedAt = new Date();
    
    // Save story title only
    const currentStory = this.storyService.getStory(this.story.id);
    if (currentStory) {
      this.storyService.updateStory({
        ...currentStory,
        title: this.story.title,
        updatedAt: new Date()
      });
    }
    
    // Save active scene changes
    if (this.activeScene && this.activeChapterId) {
      this.storyService.updateScene(
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
    const updatedStory = this.storyService.getStory(this.story.id);
    if (updatedStory) {
      this.story = updatedStory;
      // Refresh active scene reference
      if (this.activeChapterId && this.activeSceneId) {
        this.activeScene = this.storyService.getScene(this.story.id, this.activeChapterId, this.activeSceneId);
      }
    }
  }

  goBack(): void {
    if (this.hasUnsavedChanges) {
      this.saveStory();
    }
    this.router.navigate(['/']);
  }

  goToSettings(): void {
    if (this.hasUnsavedChanges) {
      this.saveStory();
    }
    this.router.navigate(['/stories/settings', this.story.id]);
  }

  getCurrentChapterTitle(): string {
    if (!this.activeChapterId || !this.story.chapters) return '';
    const chapter = this.story.chapters.find(c => c.id === this.activeChapterId);
    return chapter ? chapter.title : '';
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
    
    // Calculate dropdown position relative to viewport
    this.slashDropdownPosition = {
      top: coords.bottom + 5, // Position below cursor with small gap
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
        const insertContent = '<p><em>[Bild: Beschreibung hier einfügen]</em></p>';
        this.proseMirrorService.insertContent(insertContent, this.slashCursorPosition, true);
        break;
    }
    
    // Focus the editor after a brief delay to ensure the component is ready
    setTimeout(() => {
      this.proseMirrorService.focus();
    }, 100);
  }

  private handleBeatPromptSubmit(event: BeatAIPromptEvent): void {
    console.log('Beat prompt submitted:', event);
    // Make sure dropdown is hidden when working with beat AI
    this.hideSlashDropdown();
    // The ProseMirror service handles the actual AI generation
    // We can add additional logic here if needed
  }

  private handleBeatContentUpdate(beatData: BeatAI): void {
    console.log('Beat content updated:', beatData);
    // Trigger auto-save when beat content changes
    this.hasUnsavedChanges = true;
    this.updateWordCount();
    this.saveSubject.next();
  }
}