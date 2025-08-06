import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { copyOutline } from 'ionicons/icons';

@Component({
  selector: 'app-beat-ai-preview-modal',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './beat-ai-preview-modal.component.html',
  styleUrls: ['./beat-ai-preview-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BeatAIPreviewModalComponent {
  @Input() isOpen = false;
  @Input() previewContent = '';

  @Output() modalClose = new EventEmitter<void>();
  @Output() generateContent = new EventEmitter<void>();

  @ViewChild('previewContentEl', { static: false }) previewContentElement?: ElementRef<HTMLDivElement>;

  isResizing = false;
  copyButtonText = 'Kopieren';

  constructor() {
    addIcons({ copyOutline });
  }

  hidePromptPreview(): void {
    this.modalClose.emit();
  }

  onGenerateContent(): void {
    this.generateContent.emit();
  }

  getHighlightedPrompt(): string {
    if (!this.previewContent) {
      return '';
    }
    
    return this.highlightSyntax(this.previewContent);
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

  async copyPromptToClipboard(): Promise<void> {
    if (!this.previewContent) {
      return;
    }
    
    try {
      await navigator.clipboard.writeText(this.previewContent);
      
      // Brief visual feedback
      this.copyButtonText = 'Kopiert!';
      setTimeout(() => {
        this.copyButtonText = 'Kopieren';
      }, 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      this.fallbackCopyTextToClipboard(this.previewContent);
    }
  }

  private fallbackCopyTextToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.copyButtonText = 'Kopiert!';
        setTimeout(() => {
          this.copyButtonText = 'Kopieren';
        }, 1500);
      }
    } catch (err) {
      console.error('Fallback: Could not copy text: ', err);
    }
    
    document.body.removeChild(textArea);
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
      
      const newWidth = Math.max(300, startWidth + e.clientX - startX);
      const newHeight = Math.max(200, startHeight + e.clientY - startY);
      
      this.previewContentElement.nativeElement.style.width = newWidth + 'px';
      this.previewContentElement.nativeElement.style.height = newHeight + 'px';
      this.previewContentElement.nativeElement.style.maxWidth = '95vw';
      this.previewContentElement.nativeElement.style.maxHeight = '95vh';
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