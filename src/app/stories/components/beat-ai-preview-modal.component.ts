import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { copyOutline } from 'ionicons/icons';

@Component({
  selector: 'app-beat-ai-preview-modal',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="preview-modal-backdrop" *ngIf="isVisible" (click)="onBackdropClick()" (keydown.escape)="onClose()" tabindex="0">
      <div class="preview-content" #previewContentEl (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()" tabindex="0">
        <div class="preview-header" (mousedown)="startResize($event)">
          <h3>Prompt-Vorschau</h3>
          <div class="header-actions">
            <button class="icon-btn copy-btn" (click)="onCopy()" title="Prompt kopieren">
              <ion-icon name="copy-outline"></ion-icon>
            </button>
            <button class="close-btn" (click)="onClose()">×</button>
          </div>
        </div>
        <div class="preview-body">
          <pre class="prompt-preview" [innerHTML]="highlightedContent"></pre>
        </div>
        <div class="preview-footer">
          <button class="btn btn-secondary" (click)="onClose()">Schließen</button>
          <button class="btn btn-primary" (click)="onGenerate()">
            Jetzt generieren
          </button>
        </div>
        <div class="resize-handle" (mousedown)="startResize($event)"></div>
      </div>
    </div>
  `,
  styles: [`
    .preview-modal-backdrop {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.8) !important;
      z-index: 10000 !important;
      backdrop-filter: blur(2px);
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 1rem !important;
      box-sizing: border-box !important;
    }

    .preview-content {
      background: rgba(45, 45, 45, 0.95) !important;
      backdrop-filter: blur(10px);
      border-radius: 8px;
      width: 90% !important;
      max-width: 800px !important;
      max-height: calc(100vh - 2rem) !important;
      min-height: 300px !important;
      min-width: 400px !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
      position: relative !important;
      margin: 0 !important;
      flex-shrink: 0 !important;
    }

    .preview-header {
      padding: 0.2rem 0.8rem;
      background: #343a40;
      border-bottom: 1px solid #495057;
      display: flex;
      justify-content: space-between;
      cursor: move;
      align-items: center;
    }

    .preview-header h3 {
      margin: 0;
      color: #f8f9fa;
      flex: 1;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .icon-btn {
      background: none;
      border: none;
      color: #adb5bd;
      cursor: pointer;
      transition: all 0.2s;
      padding: 0.5rem;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-btn:hover {
      color: #f8f9fa;
      background: rgba(255, 255, 255, 0.1);
    }

    .copy-btn ion-icon {
      font-size: 1.2rem;
    }

    .close-btn {
      background: none;
      border: none;
      color: #adb5bd;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.3s, color 0.3s;
    }

    .close-btn:hover {
      background: #495057;
      color: #f8f9fa;
    }

    .preview-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem 1.5rem 3rem 1.5rem;
    }

    .prompt-preview {
      background: #1a1a1a;
      border: 1px solid #404040;
      border-radius: 6px;
      padding: 1rem 1rem 2rem 1rem;
      color: #e0e0e0;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      line-height: 1.5;
      white-space: pre-wrap;
      margin: 0;
      overflow-x: auto;
    }

    .preview-footer {
      padding: 1rem 1.5rem;
      background: #343a40;
      border-top: 1px solid #495057;
      display: flex;
      gap: 0.2rem;
      justify-content: flex-end;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.3s;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    .btn-primary {
      background: #0d6efd;
      color: white;
    }

    .btn-primary:hover {
      background: #0b5ed7;
    }

    .resize-handle {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: nwse-resize;
      background: linear-gradient(135deg, transparent 50%, #495057 50%);
      border-radius: 0 0 6px 0;
    }

    .resize-handle::after {
      content: '';
      position: absolute;
      bottom: 3px;
      right: 3px;
      width: 5px;
      height: 5px;
      border-right: 2px solid #adb5bd;
      border-bottom: 2px solid #adb5bd;
    }

    /* Syntax highlighting styles */
    .prompt-preview :global(.xml-tag) {
      color: #ff79c6;
    }

    .prompt-preview :global(.xml-attr) {
      color: #50fa7b;
    }

    .prompt-preview :global(.xml-value) {
      color: #f1fa8c;
    }

    .prompt-preview :global(.xml-comment) {
      color: #6272a4;
      font-style: italic;
    }

    .prompt-preview :global(.xml-cdata) {
      color: #bd93f9;
    }

    .prompt-preview :global(.template-var) {
      color: #8be9fd;
      font-weight: bold;
    }

    /* Mobile optimizations */
    @media (max-width: 768px) {
      .preview-content {
        width: 95%;
        max-height: calc(100vh - 2rem);
        min-width: 300px;
        min-height: 250px;
      }

      .preview-header {
        padding: 0.75rem 1rem;
      }

      .preview-header h3 {
        font-size: 1.1rem;
      }

      .preview-body {
        padding: 1rem;
      }

      .prompt-preview {
        font-size: 0.8rem;
        padding: 0.75rem;
      }

      .preview-footer {
        padding: 0.75rem 1rem;
        gap: 0.5rem;
      }

      .btn {
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
      }
    }

    @media (max-width: 480px) {
      .preview-content {
        width: 98%;
        min-width: 280px;
        min-height: 200px;
      }

      .prompt-preview {
        font-size: 0.75rem;
      }
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

  @ViewChild('previewContentEl', { static: false }) previewContentElement?: ElementRef<HTMLDivElement>;

  private isResizing = false;

  constructor() {
    // Register icons
    addIcons({ copyOutline });
  }

  get highlightedContent(): string {
    if (!this.content) {
      return '';
    }
    return this.highlightSyntax(this.content);
  }

  onBackdropClick(): void {
    this.closeModal.emit();
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

  startResize(event: MouseEvent): void {
    // Prevent text selection during resize
    event.preventDefault();
    
    if (!this.previewContentElement) {
      return;
    }
    
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = parseInt(document.defaultView!.getComputedStyle(this.previewContentElement.nativeElement).width, 10);
    const startHeight = parseInt(document.defaultView!.getComputedStyle(this.previewContentElement.nativeElement).height, 10);
    
    this.isResizing = true;
    
    const doResize = (e: MouseEvent) => {
      if (!this.previewContentElement) {
        return;
      }
      
      const newWidth = Math.max(280, Math.min(startWidth + e.clientX - startX, window.innerWidth * 0.95));
      const newHeight = Math.max(200, Math.min(startHeight + e.clientY - startY, window.innerHeight * 0.95));
      
      this.previewContentElement.nativeElement.style.width = newWidth + 'px';
      this.previewContentElement.nativeElement.style.height = newHeight + 'px';
    };
    
    const stopResize = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', doResize, false);
      document.removeEventListener('mouseup', stopResize, false);
    };
    
    document.addEventListener('mousemove', doResize, false);
    document.addEventListener('mouseup', stopResize, false);
  }
}