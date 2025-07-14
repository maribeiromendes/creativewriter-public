import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { Subscription, debounceTime, distinctUntilChanged, fromEvent } from 'rxjs';
import { CodexService } from '../../stories/services/codex.service';
import { CodexEntry } from '../../stories/models/codex.interface';

@Directive({
  selector: '[appSimpleCodexAwareness]',
  standalone: true
})
export class SimpleCodexAwarenessDirective implements OnInit, OnDestroy {
  @Input() storyId?: string;
  @Input() enableHighlighting: boolean = true;
  
  private subscription = new Subscription();
  private allCodexEntries: CodexEntry[] = [];
  private processedContent: string = '';
  
  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private codexService: CodexService
  ) {}

  ngOnInit(): void {
    if (!this.storyId) {
      console.warn('SimpleCodexAwareness directive: storyId is required');
      return;
    }

    this.loadCodexEntries();
    this.setupInputListener();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadCodexEntries(): void {
    this.subscription.add(
      this.codexService.codex$.subscribe(codexMap => {
        const codex = codexMap.get(this.storyId!);
        if (codex) {
          this.allCodexEntries = this.extractAllEntries(codex);
          this.processContent();
        }
      })
    );
  }

  private setupInputListener(): void {
    const inputEvents = fromEvent(this.el.nativeElement, 'input');
    
    this.subscription.add(
      inputEvents.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(() => {
        this.processContent();
      })
    );
  }

  private extractAllEntries(codex: any): CodexEntry[] {
    const entries: CodexEntry[] = [];
    
    if (codex.categories) {
      for (const category of codex.categories) {
        if (category.entries) {
          entries.push(...category.entries);
        }
      }
    }
    
    return entries;
  }

  private processContent(): void {
    if (!this.enableHighlighting) return;
    
    const element = this.el.nativeElement;
    const content = element.textContent || element.innerText || '';
    
    if (content === this.processedContent) return;
    this.processedContent = content;

    // Clear existing highlights
    this.clearHighlights();
    
    // Apply new highlights
    this.applyHighlights(content);
  }

  private applyHighlights(content: string): void {
    if (!content || this.allCodexEntries.length === 0) return;
    
    const element = this.el.nativeElement;
    const contentLower = content.toLowerCase();
    const matches: TextMatch[] = [];
    
    // Find all matches
    for (const entry of this.allCodexEntries) {
      // Check entry title
      const titleMatches = this.findWordMatches(contentLower, entry.title.toLowerCase());
      for (const match of titleMatches) {
        matches.push({
          ...match,
          entry,
          type: 'title'
        });
      }
      
      // Check tags if available
      if (entry.tags && entry.tags.length > 0) {
        for (const tag of entry.tags) {
          if (typeof tag === 'string') {
            const tagMatches = this.findWordMatches(contentLower, tag.toLowerCase());
            for (const match of tagMatches) {
              matches.push({
                ...match,
                entry,
                type: 'tag'
              });
            }
          }
        }
      }
    }
    
    // Apply highlights to text content
    this.highlightMatches(element, content, matches);
  }

  private findWordMatches(content: string, searchTerm: string): { start: number, end: number, originalText: string }[] {
    const matches: { start: number, end: number, originalText: string }[] = [];
    const regex = new RegExp(`\\b${this.escapeRegex(searchTerm)}\\b`, 'gi');
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        originalText: match[0]
      });
    }
    
    return matches;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private highlightMatches(element: HTMLElement, content: string, matches: TextMatch[]): void {
    if (matches.length === 0) return;
    
    // Handle textarea elements differently (they can't contain HTML)
    if (element.tagName.toLowerCase() === 'textarea') {
      this.highlightTextarea(element as HTMLTextAreaElement, content, matches);
      return;
    }
    
    // Sort matches by position (descending to avoid index shifting)
    matches.sort((a, b) => b.start - a.start);
    
    let html = content;
    
    // Apply highlights from end to beginning to avoid index shifting
    for (const match of matches) {
      const before = html.slice(0, match.start);
      const matchText = html.slice(match.start, match.end);
      const after = html.slice(match.end);
      
      const highlightClass = `codex-highlight codex-${match.type}`;
      const title = `${match.entry.title} (${match.type})`;
      const color = this.getHighlightColor(match.type);
      
      const highlightedText = `<span class="${highlightClass}" title="${title}" style="text-decoration: underline; text-decoration-style: dotted; text-decoration-color: ${color}; cursor: help;">${matchText}</span>`;
      
      html = before + highlightedText + after;
    }
    
    // Only update if there are highlights
    if (html !== content) {
      element.innerHTML = html;
    }
  }

  private highlightTextarea(textarea: HTMLTextAreaElement, content: string, matches: TextMatch[]): void {
    // For textareas, we can't modify the content directly
    // Instead, we'll use a different approach - add a visual indicator
    // This is a simplified implementation that just adds a CSS class
    
    if (matches.length > 0) {
      textarea.classList.add('codex-matches-found');
      textarea.title = `Gefundene Codex-Einträge: ${matches.map(m => m.entry.title).join(', ')}`;
    } else {
      textarea.classList.remove('codex-matches-found');
      textarea.title = '';
    }
  }

  private getHighlightColor(type: string): string {
    const colors = {
      title: '#4dabf7',  // Blue for titles
      tag: '#51cf66',    // Green for tags
      default: '#ffd43b' // Yellow for default
    };
    
    return colors[type as keyof typeof colors] || colors.default;
  }

  private clearHighlights(): void {
    const element = this.el.nativeElement;
    
    // Handle textarea elements differently
    if (element.tagName.toLowerCase() === 'textarea') {
      element.classList.remove('codex-matches-found');
      element.title = '';
      return;
    }
    
    const highlights = element.querySelectorAll('.codex-highlight');
    
    highlights.forEach((highlight: Element) => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.insertBefore(document.createTextNode(highlight.textContent || ''), highlight);
        parent.removeChild(highlight);
      }
    });
    
    // Normalize text nodes
    element.normalize();
  }
}

interface TextMatch {
  start: number;
  end: number;
  originalText: string;
  entry: CodexEntry;
  type: 'title' | 'tag';
}