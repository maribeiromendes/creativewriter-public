import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CodexEntry } from './codex-relevance.service';

@Injectable({
  providedIn: 'root'
})
export class CodexService {
  private readonly STORAGE_KEY = 'creative-writer-codex';
  private codexSubject = new BehaviorSubject<CodexEntry[]>([]);
  
  codex$ = this.codexSubject.asObservable();

  constructor() {
    this.loadCodex();
  }

  private loadCodex(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const entries = JSON.parse(stored);
        this.codexSubject.next(entries);
      }
    } catch (error) {
      console.error('Error loading codex:', error);
      this.codexSubject.next([]);
    }
  }

  private saveCodex(): void {
    try {
      const entries = this.codexSubject.value;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving codex:', error);
    }
  }

  getCodexEntries(): Observable<CodexEntry[]> {
    return this.codex$;
  }

  getAllEntries(): CodexEntry[] {
    return this.codexSubject.value;
  }

  getEntry(id: string): CodexEntry | undefined {
    return this.codexSubject.value.find(entry => entry.id === id);
  }

  createEntry(entry: Omit<CodexEntry, 'id'>): CodexEntry {
    const newEntry: CodexEntry = {
      ...entry,
      id: this.generateId(),
      aliases: entry.aliases || [],
      keywords: entry.keywords || [],
      globalInclude: entry.globalInclude || false
    };

    const entries = [...this.codexSubject.value, newEntry];
    this.codexSubject.next(entries);
    this.saveCodex();

    return newEntry;
  }

  updateEntry(id: string, updates: Partial<CodexEntry>): boolean {
    const entries = this.codexSubject.value;
    const index = entries.findIndex(e => e.id === id);
    
    if (index === -1) return false;

    entries[index] = { ...entries[index], ...updates };
    this.codexSubject.next([...entries]);
    this.saveCodex();

    return true;
  }

  deleteEntry(id: string): boolean {
    const entries = this.codexSubject.value;
    const filtered = entries.filter(e => e.id !== id);
    
    if (filtered.length === entries.length) return false;

    this.codexSubject.next(filtered);
    this.saveCodex();
    
    return true;
  }

  // Bulk operations for importing/exporting
  importEntries(entries: CodexEntry[]): void {
    // Merge with existing, avoiding duplicates
    const existing = this.codexSubject.value;
    const existingIds = new Set(existing.map(e => e.id));
    
    const newEntries = entries.filter(e => !existingIds.has(e.id));
    const merged = [...existing, ...newEntries];
    
    this.codexSubject.next(merged);
    this.saveCodex();
  }

  exportEntries(): string {
    return JSON.stringify(this.codexSubject.value, null, 2);
  }

  // Search functionality
  searchEntries(query: string): CodexEntry[] {
    const queryLower = query.toLowerCase();
    return this.codexSubject.value.filter(entry => 
      entry.title.toLowerCase().includes(queryLower) ||
      entry.content.toLowerCase().includes(queryLower) ||
      entry.aliases.some(alias => alias.toLowerCase().includes(queryLower)) ||
      entry.keywords.some(keyword => keyword.toLowerCase().includes(queryLower))
    );
  }

  // Get entries by category
  getEntriesByCategory(category: CodexEntry['category']): CodexEntry[] {
    return this.codexSubject.value.filter(e => e.category === category);
  }

  // Get global entries
  getGlobalEntries(): CodexEntry[] {
    return this.codexSubject.value.filter(e => e.globalInclude);
  }

  private generateId(): string {
    return 'codex-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Story-specific associations
  private storyCodexAssociations: Record<string, string[]> = {};

  associateWithStory(storyId: string, codexEntryIds: string[]): void {
    this.storyCodexAssociations[storyId] = codexEntryIds;
    localStorage.setItem('creative-writer-story-codex', JSON.stringify(this.storyCodexAssociations));
  }

  getStoryAssociations(storyId: string): string[] {
    const stored = localStorage.getItem('creative-writer-story-codex');
    if (stored) {
      this.storyCodexAssociations = JSON.parse(stored);
    }
    return this.storyCodexAssociations[storyId] || [];
  }
}