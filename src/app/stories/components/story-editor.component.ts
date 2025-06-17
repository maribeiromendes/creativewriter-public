import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoryService } from '../services/story.service';
import { Story, Chapter, Scene } from '../models/story.interface';
import { StoryStructureComponent } from './story-structure.component';
import { Subscription, debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-story-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, StoryStructureComponent],
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
            <span class="scene-info" *ngIf="activeScene">
              {{ getCurrentChapterTitle() }} - {{ activeScene.title }}
            </span>
            <span class="word-count">{{ getWordCount() }} Wörter</span>
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
            
            <textarea 
              class="content-editor"
              placeholder="Hier beginnt deine Szene..."
              [(ngModel)]="activeScene.content"
              (ngModelChange)="onContentChange()"
            ></textarea>
          </div>
          
          <div class="no-scene" *ngIf="!activeScene">
            <p>Wähle eine Szene aus der Struktur, um zu beginnen.</p>
          </div>
        </div>
      </div>
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
      resize: none;
      padding: 1rem 0;
      background: transparent;
      color: #e0e0e0;
    }
    
    .content-editor::placeholder {
      color: #6c757d;
    }
  `]
})
export class StoryEditorComponent implements OnInit, OnDestroy {
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
  
  hasUnsavedChanges = false;
  private saveSubject = new Subject<void>();
  private subscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storyService: StoryService
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

  ngOnDestroy(): void {
    // Beim Verlassen der Komponente noch einmal speichern
    if (this.hasUnsavedChanges) {
      this.saveStory();
    }
    this.subscription.unsubscribe();
  }

  onSceneSelected(event: {chapterId: string, sceneId: string}): void {
    this.activeChapterId = event.chapterId;
    this.activeSceneId = event.sceneId;
    this.activeScene = this.storyService.getScene(this.story.id, event.chapterId, event.sceneId);
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

  getCurrentChapterTitle(): string {
    if (!this.activeChapterId || !this.story.chapters) return '';
    const chapter = this.story.chapters.find(c => c.id === this.activeChapterId);
    return chapter ? chapter.title : '';
  }

  getWordCount(): number {
    if (!this.activeScene || !this.activeScene.content) return 0;
    return this.activeScene.content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}