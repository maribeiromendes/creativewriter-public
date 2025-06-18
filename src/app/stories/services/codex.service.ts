import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Codex, CodexCategory, CodexEntry, DEFAULT_CODEX_CATEGORIES } from '../models/codex.interface';

@Injectable({
  providedIn: 'root'
})
export class CodexService {
  private readonly STORAGE_KEY = 'creative-writer-codex';
  private codexMap = new Map<string, Codex>();
  private codexSubject = new BehaviorSubject<Map<string, Codex>>(new Map());
  
  codex$ = this.codexSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const codexArray: Codex[] = JSON.parse(stored);
        this.codexMap = new Map(
          codexArray.map(codex => [
            codex.storyId,
            this.deserializeCodex(codex)
          ])
        );
        this.codexSubject.next(this.codexMap);
      }
    } catch (error) {
      console.error('Error loading codex from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const codexArray = Array.from(this.codexMap.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(codexArray));
      // Create new Map to trigger reactivity
      this.codexSubject.next(new Map(this.codexMap));
    } catch (error) {
      console.error('Error saving codex to storage:', error);
    }
  }

  private deserializeCodex(codex: any): Codex {
    return {
      ...codex,
      createdAt: new Date(codex.createdAt),
      updatedAt: new Date(codex.updatedAt),
      categories: codex.categories.map((cat: any) => ({
        ...cat,
        createdAt: new Date(cat.createdAt),
        updatedAt: new Date(cat.updatedAt),
        entries: cat.entries.map((entry: any) => ({
          ...entry,
          createdAt: new Date(entry.createdAt),
          updatedAt: new Date(entry.updatedAt)
        }))
      }))
    };
  }

  // Create or get codex for a story
  getOrCreateCodex(storyId: string): Codex {
    let codex = this.codexMap.get(storyId);
    
    if (!codex) {
      codex = this.createCodex(storyId);
    }
    
    return codex;
  }

  // Create new codex with default categories
  private createCodex(storyId: string): Codex {
    const now = new Date();
    const codex: Codex = {
      id: uuidv4(),
      storyId,
      title: `Codex for Story ${storyId}`,
      categories: DEFAULT_CODEX_CATEGORIES.map((cat: Partial<CodexCategory>, index: number) => ({
        id: uuidv4(),
        title: cat.title!,
        description: cat.description,
        icon: cat.icon,
        order: index,
        entries: [],
        createdAt: now,
        updatedAt: now
      })),
      createdAt: now,
      updatedAt: now
    };

    this.codexMap.set(storyId, codex);
    this.saveToStorage();
    return codex;
  }

  // Get codex by story ID
  getCodex(storyId: string): Codex | undefined {
    return this.codexMap.get(storyId);
  }

  // Add category
  addCategory(storyId: string, category: Partial<CodexCategory>): CodexCategory {
    const codex = this.getOrCreateCodex(storyId);
    const now = new Date();
    
    const newCategory: CodexCategory = {
      id: uuidv4(),
      title: category.title || 'New Category',
      description: category.description,
      icon: category.icon,
      order: codex.categories.length,
      entries: [],
      createdAt: now,
      updatedAt: now
    };

    // Create new codex instance with updated categories
    const updatedCodex: Codex = {
      ...codex,
      categories: [...codex.categories, newCategory],
      updatedAt: now
    };
    
    this.codexMap.set(storyId, updatedCodex);
    this.saveToStorage();
    return newCategory;
  }

  // Update category
  updateCategory(storyId: string, categoryId: string, updates: Partial<CodexCategory>): void {
    const codex = this.codexMap.get(storyId);
    if (!codex) return;

    const category = codex.categories.find((c: CodexCategory) => c.id === categoryId);
    if (!category) return;

    Object.assign(category, updates, { updatedAt: new Date() });
    codex.updatedAt = new Date();
    
    this.saveToStorage();
  }

  // Delete category
  deleteCategory(storyId: string, categoryId: string): void {
    const codex = this.codexMap.get(storyId);
    if (!codex) return;

    const now = new Date();
    
    // Create new codex with filtered categories
    const updatedCodex: Codex = {
      ...codex,
      categories: codex.categories.filter((c: CodexCategory) => c.id !== categoryId),
      updatedAt: now
    };
    
    this.codexMap.set(storyId, updatedCodex);
    this.saveToStorage();
  }

  // Add entry to category
  addEntry(storyId: string, categoryId: string, entry: Partial<CodexEntry>): CodexEntry {
    const codex = this.getOrCreateCodex(storyId);
    const category = codex.categories.find((c: CodexCategory) => c.id === categoryId);
    
    if (!category) {
      throw new Error('Category not found');
    }

    const now = new Date();
    const newEntry: CodexEntry = {
      id: uuidv4(),
      categoryId,
      title: entry.title || 'New Entry',
      content: entry.content || '',
      tags: entry.tags || [],
      imageUrl: entry.imageUrl,
      metadata: entry.metadata || {},
      order: category.entries.length,
      createdAt: now,
      updatedAt: now
    };

    // Create new category with updated entries
    const updatedCategory: CodexCategory = {
      ...category,
      entries: [...category.entries, newEntry],
      updatedAt: now
    };
    
    // Create new codex with updated category
    const updatedCodex: Codex = {
      ...codex,
      categories: codex.categories.map(c => c.id === categoryId ? updatedCategory : c),
      updatedAt: now
    };
    
    this.codexMap.set(storyId, updatedCodex);
    this.saveToStorage();
    return newEntry;
  }

  // Update entry
  updateEntry(storyId: string, categoryId: string, entryId: string, updates: Partial<CodexEntry>): void {
    const codex = this.codexMap.get(storyId);
    if (!codex) return;

    const category = codex.categories.find((c: CodexCategory) => c.id === categoryId);
    if (!category) return;

    const entry = category.entries.find((e: CodexEntry) => e.id === entryId);
    if (!entry) return;

    Object.assign(entry, updates, { updatedAt: new Date() });
    category.updatedAt = new Date();
    codex.updatedAt = new Date();
    
    this.saveToStorage();
  }

  // Delete entry
  deleteEntry(storyId: string, categoryId: string, entryId: string): void {
    const codex = this.codexMap.get(storyId);
    if (!codex) return;

    const category = codex.categories.find((c: CodexCategory) => c.id === categoryId);
    if (!category) return;

    const now = new Date();
    
    // Create new category with filtered entries
    const updatedCategory: CodexCategory = {
      ...category,
      entries: category.entries.filter((e: CodexEntry) => e.id !== entryId),
      updatedAt: now
    };
    
    // Create new codex with updated category
    const updatedCodex: Codex = {
      ...codex,
      categories: codex.categories.map(c => c.id === categoryId ? updatedCategory : c),
      updatedAt: now
    };
    
    this.codexMap.set(storyId, updatedCodex);
    this.saveToStorage();
  }

  // Reorder categories
  reorderCategories(storyId: string, categoryIds: string[]): void {
    const codex = this.codexMap.get(storyId);
    if (!codex) return;

    const reorderedCategories = categoryIds
      .map((id, index) => {
        const category = codex.categories.find((c: CodexCategory) => c.id === id);
        if (category) {
          category.order = index;
        }
        return category;
      })
      .filter(Boolean) as CodexCategory[];

    codex.categories = reorderedCategories;
    codex.updatedAt = new Date();
    
    this.saveToStorage();
  }

  // Reorder entries within a category
  reorderEntries(storyId: string, categoryId: string, entryIds: string[]): void {
    const codex = this.codexMap.get(storyId);
    if (!codex) return;

    const category = codex.categories.find((c: CodexCategory) => c.id === categoryId);
    if (!category) return;

    const reorderedEntries = entryIds
      .map((id, index) => {
        const entry = category.entries.find((e: CodexEntry) => e.id === id);
        if (entry) {
          entry.order = index;
        }
        return entry;
      })
      .filter(Boolean) as CodexEntry[];

    category.entries = reorderedEntries;
    category.updatedAt = new Date();
    codex.updatedAt = new Date();
    
    this.saveToStorage();
  }

  // Delete entire codex for a story
  deleteCodex(storyId: string): void {
    this.codexMap.delete(storyId);
    this.saveToStorage();
  }

  // Search entries across all categories
  searchEntries(storyId: string, query: string): CodexEntry[] {
    const codex = this.codexMap.get(storyId);
    if (!codex) return [];

    const lowerQuery = query.toLowerCase();
    const results: CodexEntry[] = [];

    for (const category of codex.categories) {
      const matchingEntries = category.entries.filter((entry: CodexEntry) =>
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.content.toLowerCase().includes(lowerQuery) ||
        entry.tags?.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
      );
      results.push(...matchingEntries);
    }

    return results;
  }
}