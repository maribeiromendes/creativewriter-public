import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, ViewEncapsulation, OnInit, OnDestroy, OnChanges, Renderer2, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { addIcons } from 'ionicons';
import { copyOutline } from 'ionicons/icons';

@Component({
  selector: 'app-beat-ai-preview-modal',
  standalone: true,
  imports: [CommonModule],
  template: `<!-- Modal rendered as portal to document.body -->`,
  styles: [`/* Portal modal styles applied directly via JS */`],
  encapsulation: ViewEncapsulation.None
})
export class BeatAIPreviewModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isVisible = false;
  @Input() content = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() generateContent = new EventEmitter<void>();
  @Output() copyContent = new EventEmitter<void>();

  @ViewChild('previewContentEl', { static: false }) previewContentElement?: ElementRef<HTMLDivElement>;

  private isResizing = false;
  private modalElement?: HTMLElement;
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);

  constructor() {
    // Register icons
    addIcons({ copyOutline });
  }

  ngOnInit() {
    // Create modal element and append to body
    this.createModalElement();
  }

  ngOnDestroy() {
    // Clean up modal element
    if (this.modalElement && this.modalElement.parentNode) {
      this.modalElement.parentNode.removeChild(this.modalElement);
    }
  }

  ngOnChanges() {
    this.updateModalVisibility();
  }

  private createModalElement() {
    if (this.modalElement) return;

    this.modalElement = this.renderer.createElement('div');
    this.renderer.addClass(this.modalElement, 'beat-ai-modal-portal');
    this.renderer.setStyle(this.modalElement, 'position', 'fixed');
    this.renderer.setStyle(this.modalElement, 'top', '0');
    this.renderer.setStyle(this.modalElement, 'left', '0');
    this.renderer.setStyle(this.modalElement, 'width', '100vw');
    this.renderer.setStyle(this.modalElement, 'height', '100vh');
    this.renderer.setStyle(this.modalElement, 'z-index', '10000');
    this.renderer.setStyle(this.modalElement, 'pointer-events', 'none');
    this.renderer.appendChild(this.document.body, this.modalElement);
  }

  private updateModalVisibility() {
    if (!this.modalElement) return;

    if (this.isVisible) {
      this.renderer.setStyle(this.modalElement, 'pointer-events', 'auto');
      this.renderer.setStyle(this.modalElement, 'display', 'flex');
      this.renderer.setStyle(this.modalElement, 'align-items', 'center');
      this.renderer.setStyle(this.modalElement, 'justify-content', 'center');
      this.renderer.setStyle(this.modalElement, 'background', 'rgba(0, 0, 0, 0.8)');
      this.modalElement.innerHTML = this.getModalContent();
      this.attachEventListeners();
    } else {
      this.renderer.setStyle(this.modalElement, 'pointer-events', 'none');
      this.renderer.setStyle(this.modalElement, 'display', 'none');
      this.modalElement.innerHTML = '';
    }
  }

  private getModalContent(): string {
    return `
      <div class="preview-content-portal" style="
        background: rgba(45, 45, 45, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 8px;
        width: 90%;
        max-width: 800px;
        max-height: calc(100vh - 2rem);
        min-height: 300px;
        min-width: 400px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        position: relative;
      ">
        <div class="preview-header" style="
          padding: 0.2rem 0.8rem;
          background: #343a40;
          border-bottom: 1px solid #495057;
          display: flex;
          justify-content: space-between;
          cursor: move;
          align-items: center;
        ">
          <h3 style="margin: 0; color: #f8f9fa; flex: 1;">Prompt-Vorschau</h3>
          <div class="header-actions" style="display: flex; gap: 0.5rem; align-items: center;">
            <button class="copy-btn" title="Prompt kopieren" style="
              background: none;
              border: none;
              color: #adb5bd;
              cursor: pointer;
              padding: 0.5rem;
              border-radius: 4px;
              transition: all 0.2s;
            ">📋</button>
            <button class="close-btn" style="
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
            ">×</button>
          </div>
        </div>
        <div class="preview-body" style="
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        ">
          <pre class="prompt-preview" style="
            background: #1a1a1a;
            border: 1px solid #404040;
            border-radius: 6px;
            padding: 1rem;
            color: #e0e0e0;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            line-height: 1.5;
            white-space: pre-wrap;
            margin: 0;
            overflow-x: auto;
          ">${this.highlightedContent}</pre>
        </div>
        <div class="preview-footer" style="
          padding: 1rem 1.5rem;
          background: #343a40;
          border-top: 1px solid #495057;
          display: flex;
          gap: 0.2rem;
          justify-content: flex-end;
        ">
          <button class="btn-secondary" style="
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            font-size: 0.9rem;
            cursor: pointer;
            background: #6c757d;
            color: white;
            transition: background 0.3s;
          ">Schließen</button>
          <button class="btn-primary" style="
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            font-size: 0.9rem;
            cursor: pointer;
            background: #0d6efd;
            color: white;
            transition: background 0.3s;
          ">Jetzt generieren</button>
        </div>
      </div>
    `;
  }

  private attachEventListeners() {
    if (!this.modalElement) return;

    // Backdrop click
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.onClose();
      }
    });

    // Button clicks
    const copyBtn = this.modalElement.querySelector('.copy-btn');
    const closeBtn = this.modalElement.querySelector('.close-btn');
    const btnSecondary = this.modalElement.querySelector('.btn-secondary');
    const btnPrimary = this.modalElement.querySelector('.btn-primary');

    if (copyBtn) copyBtn.addEventListener('click', () => this.onCopy());
    if (closeBtn) closeBtn.addEventListener('click', () => this.onClose());
    if (btnSecondary) btnSecondary.addEventListener('click', () => this.onClose());
    if (btnPrimary) btnPrimary.addEventListener('click', () => this.onGenerate());

    // ESC key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onClose();
        this.document.removeEventListener('keydown', escapeHandler);
      }
    };
    this.document.addEventListener('keydown', escapeHandler);
  }

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