import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Story, Chapter, Scene } from '../models/story.interface';
import { StoryService } from '../services/story.service';

@Component({
  selector: 'app-story-structure',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="story-structure">
      <div class="structure-header">
        <h3>{{ story.title || 'Unbenannte Geschichte' }}</h3>
        <button class="add-chapter-btn" (click)="addChapter()">+ Kapitel</button>
      </div>
      
      <div class="chapters-list">
        <div *ngFor="let chapter of story.chapters; trackBy: trackChapter" 
             class="chapter-item" 
             [class.expanded]="expandedChapters.has(chapter.id)">
          
          <div class="chapter-header" (click)="toggleChapter(chapter.id)">
            <span class="expand-icon">{{ expandedChapters.has(chapter.id) ? '▼' : '▶' }}</span>
            <input 
              type="text" 
              [(ngModel)]="chapter.title" 
              (blur)="updateChapter(chapter)"
              (click)="$event.stopPropagation()"
              class="chapter-title-input"
            />
            <button class="delete-btn" (click)="deleteChapter(chapter.id, $event)">×</button>
          </div>
          
          <div class="scenes-list" *ngIf="expandedChapters.has(chapter.id)">
            <div *ngFor="let scene of chapter.scenes; trackBy: trackScene" 
                 class="scene-item"
                 [class.active]="isActiveScene(chapter.id, scene.id)"
                 (click)="selectScene(chapter.id, scene.id)">
              
              <input 
                type="text" 
                [(ngModel)]="scene.title" 
                (blur)="updateScene(chapter.id, scene)"
                (click)="$event.stopPropagation()"
                class="scene-title-input"
              />
              <span class="word-count">{{ getWordCount(scene.content) }}</span>
              <button class="delete-btn" (click)="deleteScene(chapter.id, scene.id, $event)">×</button>
            </div>
            
            <button class="add-scene-btn" (click)="addScene(chapter.id)">+ Szene</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .story-structure {
      width: 300px;
      height: 100vh;
      background: #2d2d2d;
      border-right: 1px solid #404040;
      overflow-y: auto;
      padding: 1rem;
    }
    
    .structure-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #404040;
    }
    
    .structure-header h3 {
      margin: 0;
      color: #f8f9fa;
      font-size: 1.1rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 200px;
    }
    
    .add-chapter-btn {
      background: #0d6efd;
      color: white;
      border: none;
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .add-chapter-btn:hover {
      background: #0b5ed7;
    }
    
    .chapters-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .chapter-item {
      border: 1px solid #404040;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .chapter-header {
      display: flex;
      align-items: center;
      padding: 0.75rem;
      background: #3a3a3a;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .chapter-header:hover {
      background: #444;
    }
    
    .expand-icon {
      color: #adb5bd;
      margin-right: 0.5rem;
      font-size: 0.8rem;
      width: 12px;
    }
    
    .chapter-title-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #f8f9fa;
      font-weight: 500;
      font-size: 0.9rem;
      padding: 0.25rem;
      margin-right: 0.5rem;
    }
    
    .chapter-title-input:focus {
      outline: 1px solid #0d6efd;
      border-radius: 3px;
    }
    
    .scenes-list {
      background: #2a2a2a;
      padding: 0.5rem;
    }
    
    .scene-item {
      display: flex;
      align-items: center;
      padding: 0.5rem;
      margin-bottom: 0.25rem;
      background: #404040;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .scene-item:hover {
      background: #4a4a4a;
    }
    
    .scene-item.active {
      background: #0d6efd;
    }
    
    .scene-title-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #e0e0e0;
      font-size: 0.85rem;
      padding: 0.25rem;
      margin-right: 0.5rem;
    }
    
    .scene-item.active .scene-title-input {
      color: white;
    }
    
    .scene-title-input:focus {
      outline: 1px solid #0d6efd;
      border-radius: 3px;
    }
    
    .word-count {
      font-size: 0.7rem;
      color: #6c757d;
      margin-right: 0.5rem;
      white-space: nowrap;
    }
    
    .scene-item.active .word-count {
      color: #b3d9ff;
    }
    
    .delete-btn {
      background: transparent;
      border: none;
      color: #dc3545;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0.25rem;
      border-radius: 3px;
      transition: background 0.2s;
      opacity: 0.7;
    }
    
    .delete-btn:hover {
      background: #dc3545;
      color: white;
      opacity: 1;
    }
    
    .add-scene-btn {
      width: 100%;
      background: transparent;
      border: 1px dashed #6c757d;
      color: #adb5bd;
      padding: 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
      margin-top: 0.5rem;
    }
    
    .add-scene-btn:hover {
      border-color: #0d6efd;
      color: #0d6efd;
    }
  `]
})
export class StoryStructureComponent {
  @Input() story!: Story;
  @Input() activeChapterId: string | null = null;
  @Input() activeSceneId: string | null = null;
  @Output() sceneSelected = new EventEmitter<{chapterId: string, sceneId: string}>();
  
  expandedChapters = new Set<string>();

  constructor(private storyService: StoryService) {}

  ngOnInit() {
    // Auto-expand first chapter
    if (this.story && this.story.chapters && this.story.chapters.length > 0) {
      this.expandedChapters.add(this.story.chapters[0].id);
    }
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

  addChapter(): void {
    this.storyService.addChapter(this.story.id);
    // Refresh story data
    const updatedStory = this.storyService.getStory(this.story.id);
    if (updatedStory) {
      this.story = updatedStory;
      // Auto-expand new chapter
      const newChapter = this.story.chapters[this.story.chapters.length - 1];
      this.expandedChapters.add(newChapter.id);
    }
  }

  updateChapter(chapter: Chapter): void {
    this.storyService.updateChapter(this.story.id, chapter.id, { title: chapter.title });
  }

  deleteChapter(chapterId: string, event: Event): void {
    event.stopPropagation();
    if (this.story.chapters.length <= 1) {
      alert('Eine Geschichte muss mindestens ein Kapitel haben.');
      return;
    }
    
    if (confirm('Kapitel wirklich löschen? Alle Szenen gehen verloren.')) {
      this.storyService.deleteChapter(this.story.id, chapterId);
      const updatedStory = this.storyService.getStory(this.story.id);
      if (updatedStory) {
        this.story = updatedStory;
        this.expandedChapters.delete(chapterId);
      }
    }
  }

  addScene(chapterId: string): void {
    this.storyService.addScene(this.story.id, chapterId);
    const updatedStory = this.storyService.getStory(this.story.id);
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

  updateScene(chapterId: string, scene: Scene): void {
    this.storyService.updateScene(this.story.id, chapterId, scene.id, { title: scene.title });
  }

  deleteScene(chapterId: string, sceneId: string, event: Event): void {
    event.stopPropagation();
    const chapter = this.story.chapters.find(c => c.id === chapterId);
    if (chapter && chapter.scenes.length <= 1) {
      alert('Ein Kapitel muss mindestens eine Szene haben.');
      return;
    }
    
    if (confirm('Szene wirklich löschen?')) {
      this.storyService.deleteScene(this.story.id, chapterId, sceneId);
      const updatedStory = this.storyService.getStory(this.story.id);
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
}