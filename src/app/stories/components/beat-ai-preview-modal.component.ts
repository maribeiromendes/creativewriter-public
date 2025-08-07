import { Component, Input, Output, EventEmitter, ViewEncapsulation, OnChanges, SimpleChanges } from '@angular/core';
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
          <pre [innerHTML]="processedContent"></pre>
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
export class BeatAIPreviewModalComponent implements OnChanges {
  @Input() isVisible = false;
  @Input() content = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() generateContent = new EventEmitter<void>();
  @Output() copyContent = new EventEmitter<void>();

  processedContent = '';

  ngOnChanges(changes: SimpleChanges): void {
    // Only process content when it actually changes and modal is visible
    if (changes['content'] && this.isVisible) {
      this.processedContent = this.content ? this.highlightSyntax(this.content) : '';
    }
    // Process content when modal becomes visible
    if (changes['isVisible'] && this.isVisible && this.content) {
      this.processedContent = this.highlightSyntax(this.content);
    }
    // Clear processed content when modal is hidden to free memory
    if (changes['isVisible'] && !this.isVisible) {
      this.processedContent = '';
    }
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
    try {
      // Limit content length to prevent performance issues
      if (content.length > 100000) {
        content = content.substring(0, 100000) + '\n\n... (Content truncated for performance)';
      }
      
      // Simple XML/template syntax highlighting without external library
      let highlighted = content;
      
      // Escape HTML first
      highlighted = highlighted.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      // Highlight XML tags - optimized pattern
      highlighted = highlighted.replace(/&lt;\/?([\w:-]+)([^&gt;]{0,500}?)&gt;/g, (match, tagName, attributes) => {
        let result = `<span class="xml-tag">&lt;`;
        if (tagName.startsWith('/')) {
          result += '/';
          tagName = tagName.substring(1);
        }
        result += `${tagName}</span>`;
        
        if (attributes && attributes.length > 0) {
          // Highlight attributes - limit processing
          const attrHighlighted = attributes.replace(/([\w:-]+)\s*=\s*(["'])([^"']{0,200}?)\2/g, 
            '<span class="xml-attr">$1</span>=<span class="xml-value">$2$3$2</span>');
          result += attrHighlighted;
        }
        
        result += '<span class="xml-tag">&gt;</span>';
        return result;
      });
      
      // Highlight XML comments - limit match length
      highlighted = highlighted.replace(/&lt;!--(.{1,1000}?)--&gt;/g, '<span class="xml-comment">&lt;!--$1--&gt;</span>');
      
      // Highlight template variables - limit match length
      highlighted = highlighted.replace(/\{\{([^{}]{1,100}?)\}\}/g, '<span class="template-var">{{$1}}</span>');
      highlighted = highlighted.replace(/\{([^{}]{1,100}?)\}/g, '<span class="template-var">{$1}</span>');
      
      // Highlight CDATA sections - limit match length
      highlighted = highlighted.replace(/&lt;!\[CDATA\[(.{1,5000}?)\]\]&gt;/g, '<span class="xml-cdata">&lt;![CDATA[$1]]&gt;</span>');
      
      return highlighted;
    } catch (error) {
      console.error('Error in syntax highlighting:', error);
      // Return escaped content without highlighting if there's an error
      return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }

}