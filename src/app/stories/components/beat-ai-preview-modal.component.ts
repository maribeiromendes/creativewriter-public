import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-beat-ai-preview-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isVisible" class="modal-fixed" (click)="onClose()" (keydown.escape)="onClose()" tabindex="0">
      <div class="modal-content" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()" tabindex="0">
        <div class="modal-header">
          <h3>Prompt-Vorschau</h3>
          <button (click)="onClose()" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <pre [innerHTML]="highlightedContent"></pre>
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
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.8) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 9999 !important;
      overflow: hidden !important;
    }
    
    .modal-content {
      background: #2d2d2d !important;
      border-radius: 8px !important;
      width: 90vw !important;
      max-width: 800px !important;
      max-height: 80vh !important;
      min-height: 300px !important;
      display: flex !important;
      flex-direction: column !important;
      position: relative !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
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
    
    .modal-body pre {
      background: #1a1a1a;
      border: 1px solid #404040;
      border-radius: 6px;
      padding: 1rem;
      color: #e0e0e0;
      font-family: monospace;
      font-size: 0.9rem;
      line-height: 1.5;
      white-space: pre-wrap;
      margin: 0;
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
  `],
  encapsulation: ViewEncapsulation.None
})
export class BeatAIPreviewModalComponent {
  @Input() isVisible = false;
  @Input() content = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() generateContent = new EventEmitter<void>();
  @Output() copyContent = new EventEmitter<void>();

  get highlightedContent(): string {
    if (!this.content) {
      return '';
    }
    return this.highlightSyntax(this.content);
  }

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

  private highlightSyntax(content: string): string {
    // Simple XML/template syntax highlighting without external library
    let highlighted = content;
    
    // Escape HTML first
    highlighted = highlighted.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Highlight XML tags
    highlighted = highlighted.replace(/&lt;\/?([\\w:-]+)([^&gt;]*)&gt;/g, (match, tagName, attributes) => {
      let result = `<span class="xml-tag">&lt;${tagName.startsWith('/') ? '/' : ''}`;
      const cleanTag = tagName.replace(/^\//, '');
      result += `${cleanTag}</span>`;
      
      if (attributes) {
        // Highlight attributes
        const attrHighlighted = attributes.replace(/([\w:-]+)\s*=\s*(["'])([^"']*?)\2/g, 
          '<span class="xml-attr">$1</span>=<span class="xml-value">$2$3$2</span>');
        result += attrHighlighted;
      }
      
      result += '<span class="xml-tag">&gt;</span>';
      return result;
    });
    
    // Highlight XML comments
    highlighted = highlighted.replace(/&lt;!--([\s\S]*?)--&gt;/g, '<span class="xml-comment">&lt;!--$1--&gt;</span>');
    
    // Highlight template variables/placeholders (e.g., {{variable}}, {variable})
    highlighted = highlighted.replace(/\{\{?([^}]+)\}?\}/g, '<span class="template-var">{$1}</span>');
    
    // Highlight CDATA sections
    highlighted = highlighted.replace(/&lt;!\[CDATA\[([\s\S]*?)\]\]&gt;/g, '<span class="xml-cdata">&lt;![CDATA[$1]]&gt;</span>');
    
    return highlighted;
  }

}