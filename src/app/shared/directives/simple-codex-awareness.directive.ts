import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2, OnChanges, SimpleChanges } from '@angular/core';
import { CodexService } from '../../stories/services/codex.service';
import { CodexEntry } from '../../stories/models/codex.interface';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Directive({
  selector: '[appSimpleCodexAwareness]',
  standalone: true
})
export class SimpleCodexAwarenessDirective implements OnInit, OnDestroy, OnChanges {
  @Input() storyId?: string;
  @Input() debounceMs: number = 300;
  @Input() caseSensitive: boolean = false;
  
  private destroy$ = new Subject<void>();
  private contentChange$ = new Subject<string>();
  private codexEntries: CodexEntry[] = [];
  private searchTerms: string[] = [];
  private overlayElement?: HTMLElement;
  private isTextarea: boolean = false;
  
  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private codexService: CodexService
  ) {}

  ngOnInit(): void {
    this.isTextarea = this.elementRef.nativeElement.tagName.toLowerCase() === 'textarea';
    this.setupCodexSubscription();
    this.setupContentChangeHandler();
    this.setupInputListener();
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
    this.removeOverlay();
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
      this.updateHighlightOverlay(content);
    });
  }

  private setupInputListener(): void {
    const element = this.elementRef.nativeElement;
    
    const handleInput = () => {
      const value = (element as HTMLInputElement).value;
      this.contentChange$.next(value);
    };

    this.renderer.listen(element, 'input', handleInput);
    this.renderer.listen(element, 'scroll', () => this.updateOverlayPosition());
    this.renderer.listen(element, 'focus', () => this.updateOverlayPosition());
    this.renderer.listen(element, 'blur', () => this.updateOverlayPosition());
    
    // Initial processing
    handleInput();
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
    const element = this.elementRef.nativeElement as HTMLInputElement;
    const content = element.value || '';
    if (content && this.searchTerms.length > 0) {
      this.contentChange$.next(content);
    }
  }

  private updateHighlightOverlay(content: string): void {
    if (!this.searchTerms.length || !content) {
      this.removeOverlay();
      return;
    }

    this.createOrUpdateOverlay(content);
  }

  private createOrUpdateOverlay(content: string): void {
    if (!this.overlayElement) {
      this.createOverlay();
    }

    if (!this.overlayElement) return;

    const highlightedContent = this.highlightText(content);
    this.renderer.setProperty(this.overlayElement, 'innerHTML', highlightedContent);
    this.updateOverlayPosition();
  }

  private createOverlay(): void {
    const element = this.elementRef.nativeElement;
    const parent = element.parentElement;
    if (!parent) return;

    // Create overlay container
    this.overlayElement = this.renderer.createElement('div');
    this.renderer.addClass(this.overlayElement, 'codex-overlay');
    this.renderer.setStyle(this.overlayElement, 'position', 'absolute');
    this.renderer.setStyle(this.overlayElement, 'pointer-events', 'none');
    this.renderer.setStyle(this.overlayElement, 'z-index', '1');
    this.renderer.setStyle(this.overlayElement, 'color', 'transparent');
    this.renderer.setStyle(this.overlayElement, 'white-space', 'pre-wrap');
    this.renderer.setStyle(this.overlayElement, 'word-wrap', 'break-word');
    this.renderer.setStyle(this.overlayElement, 'overflow', 'hidden');
    
    // Copy styles from the original element
    if (this.overlayElement) {
      this.copyStyles(element, this.overlayElement);
    }
    
    // Position relative to parent
    this.renderer.setStyle(parent, 'position', 'relative');
    this.renderer.insertBefore(parent, this.overlayElement, element);
  }

  private copyStyles(source: HTMLElement, target: HTMLElement): void {
    const computedStyles = window.getComputedStyle(source);
    
    // Copy essential styles
    const stylesToCopy = [
      'font-family', 'font-size', 'font-weight', 'line-height',
      'letter-spacing', 'word-spacing', 'text-transform',
      'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
      'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
      'box-sizing', 'width', 'height'
    ];

    stylesToCopy.forEach(style => {
      this.renderer.setStyle(target, style, computedStyles.getPropertyValue(style));
    });
  }

  private updateOverlayPosition(): void {
    if (!this.overlayElement) return;

    const element = this.elementRef.nativeElement;
    const rect = element.getBoundingClientRect();
    const parentRect = element.parentElement?.getBoundingClientRect();
    
    if (!parentRect) return;

    this.renderer.setStyle(this.overlayElement, 'top', `${rect.top - parentRect.top}px`);
    this.renderer.setStyle(this.overlayElement, 'left', `${rect.left - parentRect.left}px`);
    this.renderer.setStyle(this.overlayElement, 'width', `${rect.width}px`);
    this.renderer.setStyle(this.overlayElement, 'height', `${rect.height}px`);
    
    // Sync scroll position
    if (this.isTextarea) {
      this.renderer.setStyle(this.overlayElement, 'scrollTop', `${element.scrollTop}px`);
    }
  }

  private highlightText(text: string): string {
    if (!this.searchTerms.length) return text;

    const flags = this.caseSensitive ? 'g' : 'gi';
    const pattern = this.searchTerms
      .map(term => this.escapeRegExp(term))
      .join('|');

    if (!pattern) return text;

    const regex = new RegExp(`\\b(${pattern})\\b`, flags);
    
    return text.replace(regex, (match) => {
      return `<span class="simple-codex-highlight" data-codex-term="${match}">${match}</span>`;
    });
  }

  private removeOverlay(): void {
    if (this.overlayElement) {
      this.renderer.removeChild(this.overlayElement.parentElement, this.overlayElement);
      this.overlayElement = undefined;
    }
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private addHighlightStyles(): void {
    const styleId = 'simple-codex-awareness-styles';
    if (!document.getElementById(styleId)) {
      const style = this.renderer.createElement('style');
      this.renderer.setAttribute(style, 'id', styleId);
      this.renderer.setProperty(style, 'textContent', `
        .simple-codex-highlight {
          background-color: rgba(255, 235, 59, 0.3);
          text-decoration: underline;
          text-decoration-color: #ffc107;
          text-decoration-thickness: 2px;
          text-underline-offset: 2px;
          border-radius: 2px;
          padding: 0 2px;
          color: inherit !important;
        }
        
        /* Dark theme support */
        .ion-page .simple-codex-highlight {
          background-color: rgba(255, 193, 7, 0.2);
          text-decoration-color: #ffc107;
        }
        
        .codex-overlay {
          background: transparent !important;
          border: none !important;
        }
      `);
      this.renderer.appendChild(document.head, style);
    }
  }
}