import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2, OnChanges, SimpleChanges } from '@angular/core';
import { CodexService } from '../../stories/services/codex.service';
import { CodexEntry } from '../../stories/models/codex.interface';
import { Subject, combineLatest, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Directive({
  selector: '[appCodexAwareness]',
  standalone: true
})
export class CodexAwarenessDirective implements OnInit, OnDestroy, OnChanges {
  @Input() storyId?: string;
  @Input() debounceMs: number = 500;
  @Input() caseSensitive: boolean = false;
  @Input() highlightClass: string = 'codex-highlight';
  
  private destroy$ = new Subject<void>();
  private contentChange$ = new Subject<string>();
  private observer?: MutationObserver;
  private codexEntries: CodexEntry[] = [];
  private searchTerms: string[] = [];
  private lastProcessedContent: string = '';
  
  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private codexService: CodexService
  ) {}

  ngOnInit(): void {
    this.setupCodexSubscription();
    this.setupContentChangeHandler();
    this.setupMutationObserver();
    this.addHighlightStyles();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['storyId'] && changes['storyId'].currentValue) {
      this.setupCodexSubscription();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.observer?.disconnect();
  }

  private setupCodexSubscription(): void {
    if (!this.storyId) return;

    this.codexService.codex$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe(codexMap => {
      const codex = codexMap.get(this.storyId!);
      if (codex) {
        this.codexEntries = codex.categories.flatMap(category => category.entries);
        this.updateSearchTerms();
        this.processContent();
      }
    });
  }

  private setupContentChangeHandler(): void {
    this.contentChange$.pipe(
      debounceTime(this.debounceMs),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(content => {
      if (content !== this.lastProcessedContent) {
        this.lastProcessedContent = content;
        this.highlightCodexTerms(content);
      }
    });
  }

  private setupMutationObserver(): void {
    this.observer = new MutationObserver(() => {
      this.processContent();
    });

    this.observer.observe(this.elementRef.nativeElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  private updateSearchTerms(): void {
    this.searchTerms = [];
    
    this.codexEntries.forEach(entry => {
      // Add title as search term
      if (entry.title) {
        this.searchTerms.push(entry.title);
      }
      
      // Add tags as search terms
      if (entry.tags?.length) {
        this.searchTerms.push(...entry.tags);
      }
    });

    // Remove duplicates and sort by length (longer terms first for better matching)
    this.searchTerms = [...new Set(this.searchTerms)]
      .filter(term => term.length > 2) // Only terms longer than 2 characters
      .sort((a, b) => b.length - a.length);
  }

  private processContent(): void {
    const content = this.getTextContent();
    if (content && this.searchTerms.length > 0) {
      this.contentChange$.next(content);
    }
  }

  private getTextContent(): string {
    const element = this.elementRef.nativeElement;
    
    // Handle different types of elements
    if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
      return (element as HTMLInputElement).value;
    }
    
    // For ProseMirror or other rich text editors
    if (element.querySelector('.ProseMirror')) {
      return element.querySelector('.ProseMirror')?.textContent || '';
    }
    
    return element.textContent || '';
  }

  private highlightCodexTerms(content: string): void {
    if (!this.searchTerms.length || !content) return;

    const element = this.elementRef.nativeElement;
    
    // Don't highlight in input fields (only visual, not functional)
    if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
      return;
    }

    // Remove existing highlights
    this.removeExistingHighlights();

    // Find and highlight terms
    this.highlightInElement(element, content);
  }

  private highlightInElement(element: Element, content: string): void {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip nodes that are already highlighted or in script/style tags
          const parent = node.parentElement;
          if (parent?.classList.contains(this.highlightClass) || 
              parent?.tagName.toLowerCase() === 'script' || 
              parent?.tagName.toLowerCase() === 'style') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes: Text[] = [];
    let node: Node | null;

    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    // Process text nodes in reverse order to avoid position changes
    for (let i = textNodes.length - 1; i >= 0; i--) {
      this.highlightInTextNode(textNodes[i]);
    }
  }

  private highlightInTextNode(textNode: Text): void {
    const text = textNode.textContent || '';
    if (!text) return;

    let processed = false;
    let currentText = text;
    let currentNode = textNode;

    // Create a case-insensitive regex pattern for all search terms
    const flags = this.caseSensitive ? 'g' : 'gi';
    const pattern = this.searchTerms
      .map(term => this.escapeRegExp(term))
      .join('|');

    if (!pattern) return;

    const regex = new RegExp(`\\b(${pattern})\\b`, flags);
    let match;

    const replacements: { start: number; end: number; term: string }[] = [];

    while ((match = regex.exec(currentText)) !== null) {
      replacements.push({
        start: match.index,
        end: match.index + match[0].length,
        term: match[0]
      });
    }

    if (replacements.length === 0) return;

    // Sort replacements by position (reverse order for processing)
    replacements.sort((a, b) => b.start - a.start);

    const parent = currentNode.parentNode;
    if (!parent) return;

    // Split the text node and insert highlights
    replacements.forEach(({ start, end, term }) => {
      if (start >= currentText.length) return;

      // Split the text node
      const beforeText = currentText.substring(0, start);
      const afterText = currentText.substring(end);

      // Create the highlight span
      const highlightSpan = this.renderer.createElement('span');
      this.renderer.addClass(highlightSpan, this.highlightClass);
      this.renderer.setAttribute(highlightSpan, 'data-codex-term', term);
      this.renderer.setProperty(highlightSpan, 'textContent', term);

      // Update the current text node with the before text
      if (beforeText) {
        this.renderer.setProperty(currentNode, 'textContent', beforeText);
      } else {
        // If no before text, remove the current node
        this.renderer.removeChild(parent, currentNode);
      }

      // Insert the highlight span
      if (beforeText) {
        this.renderer.insertBefore(parent, highlightSpan, currentNode.nextSibling);
      } else {
        this.renderer.insertBefore(parent, highlightSpan, currentNode);
      }

      // Insert the after text if any
      if (afterText) {
        const afterTextNode = this.renderer.createText(afterText);
        this.renderer.insertBefore(parent, afterTextNode, highlightSpan.nextSibling);
        currentNode = afterTextNode;
        currentText = afterText;
      } else {
        currentText = '';
      }
    });
  }

  private removeExistingHighlights(): void {
    const element = this.elementRef.nativeElement;
    const highlights = element.querySelectorAll(`.${this.highlightClass}`);
    
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        // Replace the highlight span with its text content
        const textNode = this.renderer.createText(highlight.textContent || '');
        this.renderer.insertBefore(parent, textNode, highlight);
        this.renderer.removeChild(parent, highlight);
      }
    });

    // Normalize adjacent text nodes
    this.normalizeTextNodes(element);
  }

  private normalizeTextNodes(element: Element): void {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node: Node | null;

    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    for (let i = 0; i < textNodes.length - 1; i++) {
      const current = textNodes[i];
      const next = textNodes[i + 1];

      if (current.parentNode === next.parentNode && 
          current.nextSibling === next) {
        // Merge adjacent text nodes
        current.textContent = (current.textContent || '') + (next.textContent || '');
        next.parentNode?.removeChild(next);
      }
    }
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private addHighlightStyles(): void {
    // Add CSS styles for highlighting if they don't exist
    const styleId = 'codex-awareness-styles';
    if (!document.getElementById(styleId)) {
      const style = this.renderer.createElement('style');
      this.renderer.setAttribute(style, 'id', styleId);
      this.renderer.setProperty(style, 'textContent', `
        .${this.highlightClass} {
          background-color: rgba(255, 235, 59, 0.3);
          text-decoration: underline;
          text-decoration-color: #ffc107;
          text-decoration-thickness: 2px;
          text-underline-offset: 2px;
          border-radius: 2px;
          padding: 0 2px;
          transition: background-color 0.2s ease;
          cursor: default;
        }
        
        .${this.highlightClass}:hover {
          background-color: rgba(255, 235, 59, 0.5);
        }
        
        /* Dark theme support */
        .ion-page .${this.highlightClass} {
          background-color: rgba(255, 193, 7, 0.2);
          text-decoration-color: #ffc107;
        }
        
        .ion-page .${this.highlightClass}:hover {
          background-color: rgba(255, 193, 7, 0.3);
        }
      `);
      this.renderer.appendChild(document.head, style);
    }
  }
}