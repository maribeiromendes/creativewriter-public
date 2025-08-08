import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CodeEditor } from '@acrodata/code-editor';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

@Component({
  selector: 'app-beat-ai-preview-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CodeEditor],
  template: `
    <div *ngIf="isVisible" class="modal-fixed" (click)="onClose()" (keydown.escape)="onClose()" tabindex="0">
      <div class="modal-content" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()" tabindex="0">
        <div class="modal-header">
          <h3>Prompt-Vorschau</h3>
          <button (click)="onClose()" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <code-editor 
            class="code-editor"
            [(ngModel)]="content"
            [readonly]="true"
            [extensions]="editorExtensions">
          </code-editor>
        </div>
        <div class="modal-footer">
          <button (click)="onClose()" class="btn-secondary">Schließen</button>
          <button (click)="onGenerate()" class="btn-primary">Jetzt generieren</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-fixed {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      overflow: hidden;
    }
    
    .modal-content {
      background: #2d2d2d;
      border-radius: 8px;
      width: 90vw;
      max-width: 800px;
      max-height: 80vh;
      min-height: 300px;
      display: flex;
      flex-direction: column;
      position: relative;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }
    
    .modal-header {
      padding: 1rem;
      border-bottom: 1px solid #555;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-header h3 {
      margin: 0;
      color: white;
    }
    
    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
    }
    
    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }
    
    .code-editor {
      height: 400px;
      border: 1px solid #404040;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .modal-footer {
      padding: 1rem;
      border-top: 1px solid #555;
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }
    
    .btn-secondary, .btn-primary {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-primary {
      background: #0d6efd;
      color: white;
    }

    /* Syntax highlighting styles */
    .xml-tag {
      color: #89ddff;
      font-weight: 600;
    }
    
    .xml-attr {
      color: #c792ea;
    }
    
    .xml-value {
      color: #c3e88d;
    }
    
    .template-var {
      color: #f78c6c;
      font-weight: 600;
    }
    
    .xml-comment {
      color: #546e7a;
      font-style: italic;
    }
    
    .xml-cdata {
      color: #ffcb6b;
    }
  `],
  encapsulation: ViewEncapsulation.None
})
export class BeatAIPreviewModalComponent {
  @Input() isVisible = false;
  @Input() content = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() generateContent = new EventEmitter<void>();
  @Output() copyContent = new EventEmitter<void>();

  editorExtensions: Extension[] = [
    EditorView.lineWrapping
  ];



  onClose(): void {
    this.closeModal.emit();
  }

  onGenerate(): void {
    this.closeModal.emit();
    this.generateContent.emit();
  }

  onCopy(): void {
    this.copyContent.emit();
  }


}