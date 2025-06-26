import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CodexService } from '../services/codex.service';
import { CodexRelevanceService } from '../../core/services/codex-relevance.service';
import { BeatAIService } from '../../shared/services/beat-ai.service';

@Component({
  selector: 'app-codex-relevance-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relevance-test-container">
      <h3>Codex Relevance Test</h3>
      
      <div class="test-controls">
        <div class="form-group">
          <label>Scene Context:</label>
          <textarea 
            [(ngModel)]="sceneContext" 
            placeholder="Enter scene context..."
            rows="4"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label>Beat Prompt:</label>
          <textarea 
            [(ngModel)]="beatPrompt" 
            placeholder="Enter beat prompt..."
            rows="2"
          ></textarea>
        </div>
        
        <button (click)="testRelevance()" class="test-btn">
          Test Relevance
        </button>
      </div>
      
      <div class="results" *ngIf="results">
        <h4>Relevant Entries ({{ results.length }} selected):</h4>
        <div class="entry" *ngFor="let entry of results">
          <div class="entry-header">
            <strong>{{ entry.title }}</strong>
            <span class="category">{{ entry.category }}</span>
            <span class="importance">{{ entry.importance }}</span>
          </div>
          <div class="entry-content">{{ entry.content }}</div>
          <div class="entry-meta" *ngIf="entry.aliases?.length">
            Aliases: {{ entry.aliases.join(', ') }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .relevance-test-container {
      padding: 1rem;
      background: #2d2d2d;
      border-radius: 8px;
      margin: 1rem 0;
    }
    
    h3 {
      color: #f8f9fa;
      margin-bottom: 1rem;
    }
    
    .test-controls {
      margin-bottom: 1.5rem;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    label {
      display: block;
      color: #adb5bd;
      margin-bottom: 0.25rem;
      font-size: 0.9rem;
    }
    
    textarea {
      width: 100%;
      background: #1a1a1a;
      border: 1px solid #404040;
      border-radius: 4px;
      padding: 0.5rem;
      color: #e0e0e0;
      font-family: inherit;
      resize: vertical;
    }
    
    textarea:focus {
      outline: none;
      border-color: #0d6efd;
    }
    
    .test-btn {
      background: #0d6efd;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .test-btn:hover {
      background: #0b5ed7;
    }
    
    .results {
      border-top: 1px solid #404040;
      padding-top: 1rem;
    }
    
    h4 {
      color: #f8f9fa;
      margin-bottom: 0.75rem;
    }
    
    .entry {
      background: #1a1a1a;
      border: 1px solid #404040;
      border-radius: 4px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
    }
    
    .entry-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    
    .entry-header strong {
      color: #f8f9fa;
      flex: 1;
    }
    
    .category {
      background: #495057;
      color: #f8f9fa;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
    }
    
    .importance {
      background: #0d6efd;
      color: white;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
    }
    
    .importance.major {
      background: #dc3545;
    }
    
    .importance.background {
      background: #6c757d;
    }
    
    .entry-content {
      color: #e0e0e0;
      font-size: 0.9rem;
      line-height: 1.4;
      margin-bottom: 0.5rem;
    }
    
    .entry-meta {
      color: #6c757d;
      font-size: 0.8rem;
      font-style: italic;
    }
  `]
})
export class CodexRelevanceTestComponent implements OnInit {
  @Input() storyId!: string;
  
  sceneContext = '';
  beatPrompt = '';
  results: any[] | null = null;
  
  constructor(
    private codexService: CodexService,
    private codexRelevanceService: CodexRelevanceService,
    private beatAIService: BeatAIService
  ) {}
  
  ngOnInit() {
    // Set default test values
    this.sceneContext = 'Emma betritt das verlassene Schloss. Die alten Mauern erzählen von vergangenen Zeiten. Sie sucht nach dem magischen Amulett.';
    this.beatPrompt = 'Beschreibe Emmas Gefühle beim Betreten des Schlosses';
  }
  
  async testRelevance() {
    // Get all codex entries and convert them
    const allCodexEntries = this.codexService.getAllCodexEntries(this.storyId);
    const convertedEntries = (this.beatAIService as any).convertCodexEntriesToRelevanceFormat(allCodexEntries);
    
    // Get relevant entries
    this.results = await this.codexRelevanceService.getRelevantEntries(
      convertedEntries,
      this.sceneContext,
      this.beatPrompt,
      1000
    ).toPromise() || [];
  }
}