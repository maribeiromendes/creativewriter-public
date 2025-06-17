import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoryService } from '../services/story.service';
import { Story } from '../models/story.interface';
import { Subscription, debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-story-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="editor-container">
      <div class="editor-header">
        <button class="back-btn" (click)="goBack()">← Zurück zur Übersicht</button>
        <div class="story-info">
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
          (ngModelChange)="onContentChange()"
        />
        
        <textarea 
          class="content-editor"
          placeholder="Hier beginnt deine Geschichte..."
          [(ngModel)]="story.content"
          (ngModelChange)="onContentChange()"
        ></textarea>
      </div>
    </div>
  `,
  styles: [`
    .editor-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #1a1a1a;
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
      font-size: 2rem;
      font-weight: bold;
      border: none;
      outline: none;
      padding: 1rem 0;
      margin-bottom: 2rem;
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
    content: '',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
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

  onContentChange(): void {
    this.hasUnsavedChanges = true;
    this.saveSubject.next();
  }

  private saveStory(): void {
    this.story.updatedAt = new Date();
    this.storyService.updateStory(this.story);
    this.hasUnsavedChanges = false;
  }

  goBack(): void {
    if (this.hasUnsavedChanges) {
      this.saveStory();
    }
    this.router.navigate(['/']);
  }

  getWordCount(): number {
    return this.story.content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}