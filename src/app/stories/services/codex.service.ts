import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Codex, CodexCategory, CodexEntry, DEFAULT_CODEX_CATEGORIES } from '../models/codex.interface';
import { DatabaseService } from '../../core/services/database.service';

// Legacy interface for backward compatibility
export interface LegacyCodex {
  id: string;
  storyId: string;
  title: string;
  categories: LegacyCodexCategory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LegacyCodexCategory {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  entries: CodexEntry[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CodexService {
  private databaseService = inject(DatabaseService);

  private codexSubject = new BehaviorSubject<Map<string, LegacyCodex>>(new Map());
  
  codex$ = this.codexSubject.asObservable();

  constructor() {
    // Initialize with empty state - data will be loaded on demand
  }

  // Create or get codex for a story
  async getOrCreateCodex(storyId: string): Promise<LegacyCodex> {
    // First try to get existing codex
    let codex = await this.getCodex(storyId);
    
    if (!codex) {
      codex = await this.createCodex(storyId);
    }
    
    return codex;
  }

  // Create new codex with default categories
  private async createCodex(storyId: string): Promise<LegacyCodex> {
    
    // Create the codex document
    const codexData = {
      storyId,
      title: `Codex for Story ${storyId}`
    };
    
    const codex = await this.databaseService.create<Codex>('codex', codexData, `codex_${storyId}`);
    
    // Create default categories
    const categories: CodexCategory[] = [];
    for (let index = 0; index < DEFAULT_CODEX_CATEGORIES.length; index++) {
      const cat = DEFAULT_CODEX_CATEGORIES[index];
      const categoryData = {
        storyId,
        title: cat.title!,
        description: cat.description,
        icon: cat.icon,
        order: index
      };
      
      const category = await this.databaseService.create<CodexCategory>(
        'codexCategories', 
        categoryData, 
        `category_${storyId}_${uuidv4()}`
      );
      categories.push(category);
    }

    // Build legacy format
    const legacyCodex: LegacyCodex = {
      id: codex.id,
      storyId: codex.storyId,
      title: codex.title,
      categories: categories.map(cat => ({
        id: cat.id,
        title: cat.title,
        description: cat.description,
        icon: cat.icon,
        entries: [],
        order: cat.order,
        createdAt: cat.createdAt || new Date(),
        updatedAt: cat.updatedAt || new Date()
      })),
      createdAt: codex.createdAt || new Date(),
      updatedAt: codex.updatedAt || new Date()
    };

    this.updateCodexCache(storyId, legacyCodex);
    return legacyCodex;
  }

  // Get codex by story ID with full data
  async getCodex(storyId: string): Promise<LegacyCodex | null> {
    try {
      // Get codex document
      const codex = await this.databaseService.get<Codex>('codex', `codex_${storyId}`);
      if (!codex) return null;

      // Get categories for this story
      const categories = await this.databaseService.getAll<CodexCategory>('codexCategories', {
        where: [{ field: 'storyId', operator: '==', value: storyId }],
        orderBy: [{ field: 'order', direction: 'asc' }]
      });

      // Get entries for this story
      const entries = await this.databaseService.getAll<CodexEntry>('codexEntries', {
        where: [{ field: 'storyId', operator: '==', value: storyId }],
        orderBy: [{ field: 'order', direction: 'asc' }]
      });

      // Build legacy format with nested structure
      const legacyCodex: LegacyCodex = {
        id: codex.id,
        storyId: codex.storyId,
        title: codex.title,
        categories: categories.map(cat => ({
          id: cat.id,
          title: cat.title,
          description: cat.description,
          icon: cat.icon,
          entries: entries.filter(entry => entry.categoryId === cat.id),
          order: cat.order,
          createdAt: cat.createdAt || new Date(),
          updatedAt: cat.updatedAt || new Date()
        })),
        createdAt: codex.createdAt || new Date(),
        updatedAt: codex.updatedAt || new Date()
      };

      this.updateCodexCache(storyId, legacyCodex);
      return legacyCodex;
    } catch (error) {
      console.error('Error getting codex:', error);
      return null;
    }
  }

  // Synchronous getter for cached data
  getCachedCodex(storyId: string): LegacyCodex | undefined {
    return this.codexSubject.value.get(storyId);
  }

  // Add category
  async addCategory(storyId: string, category: Partial<CodexCategory>): Promise<LegacyCodexCategory> {
    // Get current categories to determine order
    const categories = await this.databaseService.getAll<CodexCategory>('codexCategories', {
      where: [{ field: 'storyId', operator: '==', value: storyId }]
    });

    const categoryData = {
      storyId,
      title: category.title || 'New Category',
      description: category.description,
      icon: category.icon,
      order: categories.length
    };

    const newCategory = await this.databaseService.create<CodexCategory>(
      'codexCategories',
      categoryData,
      `category_${storyId}_${uuidv4()}`
    );

    // Refresh cache
    await this.refreshCodexCache(storyId);

    return {
      id: newCategory.id,
      title: newCategory.title,
      description: newCategory.description,
      icon: newCategory.icon,
      entries: [],
      order: newCategory.order,
      createdAt: newCategory.createdAt || new Date(),
      updatedAt: newCategory.updatedAt || new Date()
    };
  }

  // Update category
  async updateCategory(storyId: string, categoryId: string, updates: Partial<CodexCategory>): Promise<void> {
    await this.databaseService.update<CodexCategory>('codexCategories', categoryId, updates);
    await this.refreshCodexCache(storyId);
  }

  // Delete category
  async deleteCategory(storyId: string, categoryId: string): Promise<void> {
    // Delete all entries in the category first
    const entries = await this.databaseService.getAll<CodexEntry>('codexEntries', {
      where: [
        { field: 'storyId', operator: '==', value: storyId },
        { field: 'categoryId', operator: '==', value: categoryId }
      ]
    });

    if (entries.length > 0) {
      const entryIds = entries.map(entry => entry.id);
      await this.databaseService.deleteMany('codexEntries', entryIds);
    }

    // Delete the category
    await this.databaseService.delete('codexCategories', categoryId);
    await this.refreshCodexCache(storyId);
  }

  // Add entry to category
  async addEntry(storyId: string, categoryId: string, entry: Partial<CodexEntry>): Promise<CodexEntry> {
    // Get current entries in category to determine order
    const entries = await this.databaseService.getAll<CodexEntry>('codexEntries', {
      where: [
        { field: 'storyId', operator: '==', value: storyId },
        { field: 'categoryId', operator: '==', value: categoryId }
      ]
    });

    const entryData = {
      categoryId,
      storyId,
      title: entry.title || 'New Entry',
      content: entry.content || '',
      tags: entry.tags || [],
      imageUrl: entry.imageUrl,
      metadata: entry.metadata || {},
      customFields: entry.customFields || [],
      storyRole: entry.storyRole,
      alwaysInclude: entry.alwaysInclude,
      order: entries.length
    };

    const newEntry = await this.databaseService.create<CodexEntry>(
      'codexEntries',
      entryData,
      `entry_${storyId}_${uuidv4()}`
    );

    await this.refreshCodexCache(storyId);
    return newEntry;
  }

  // Update entry
  async updateEntry(storyId: string, categoryId: string, entryId: string, updates: Partial<CodexEntry>): Promise<void> {
    await this.databaseService.update<CodexEntry>('codexEntries', entryId, updates);
    await this.refreshCodexCache(storyId);
  }

  // Delete entry
  async deleteEntry(storyId: string, categoryId: string, entryId: string): Promise<void> {
    await this.databaseService.delete('codexEntries', entryId);
    await this.refreshCodexCache(storyId);
  }

  // Reorder categories
  async reorderCategories(storyId: string, categoryIds: string[]): Promise<void> {
    const updates = categoryIds.map((id, index) => ({
      id,
      data: { order: index }
    }));

    await this.databaseService.updateMany<CodexCategory>('codexCategories', updates);
    await this.refreshCodexCache(storyId);
  }

  // Reorder entries within a category
  async reorderEntries(storyId: string, categoryId: string, entryIds: string[]): Promise<void> {
    const updates = entryIds.map((id, index) => ({
      id,
      data: { order: index }
    }));

    await this.databaseService.updateMany<CodexEntry>('codexEntries', updates);
    await this.refreshCodexCache(storyId);
  }

  // Delete entire codex for a story
  async deleteCodex(storyId: string): Promise<void> {
    try {
      // Delete all entries
      const entries = await this.databaseService.getAll<CodexEntry>('codexEntries', {
        where: [{ field: 'storyId', operator: '==', value: storyId }]
      });

      if (entries.length > 0) {
        const entryIds = entries.map(entry => entry.id);
        await this.databaseService.deleteMany('codexEntries', entryIds);
      }

      // Delete all categories
      const categories = await this.databaseService.getAll<CodexCategory>('codexCategories', {
        where: [{ field: 'storyId', operator: '==', value: storyId }]
      });

      if (categories.length > 0) {
        const categoryIds = categories.map(cat => cat.id);
        await this.databaseService.deleteMany('codexCategories', categoryIds);
      }

      // Delete the codex itself
      await this.databaseService.delete('codex', `codex_${storyId}`);

      // Remove from cache
      const currentCodexMap = this.codexSubject.value;
      currentCodexMap.delete(storyId);
      this.codexSubject.next(new Map(currentCodexMap));

    } catch (error) {
      console.error('Error deleting codex:', error);
      throw error;
    }
  }

  // Search entries across all categories
  searchEntries(storyId: string, query: string): CodexEntry[] {
    const codex = this.getCachedCodex(storyId);
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

  // Get all codex entries for a story (for Beat AI prompts)
  getAllCodexEntries(storyId: string): { category: string; entries: CodexEntry[]; icon?: string }[] {
    const codex = this.getCachedCodex(storyId);
    if (!codex) return [];

    return codex.categories
      .filter(category => category.entries.length > 0)
      .map(category => ({
        category: category.title,
        entries: [...category.entries].sort((a, b) => a.order - b.order),
        icon: category.icon
      }))
      .sort((a, b) => {
        const categoryA = codex.categories.find(c => c.title === a.category);
        const categoryB = codex.categories.find(c => c.title === b.category);
        return (categoryA?.order || 0) - (categoryB?.order || 0);
      });
  }

  // Utility methods
  private updateCodexCache(storyId: string, codex: LegacyCodex): void {
    const currentCodexMap = this.codexSubject.value;
    currentCodexMap.set(storyId, codex);
    this.codexSubject.next(new Map(currentCodexMap));
  }

  private async refreshCodexCache(storyId: string): Promise<void> {
    const codex = await this.getCodex(storyId);
    if (codex) {
      this.updateCodexCache(storyId, codex);
    }
  }
}