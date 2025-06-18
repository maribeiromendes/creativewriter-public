import { Component, OnInit, OnDestroy, inject, signal, computed, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CodexService } from '../services/codex.service';
import { Codex, CodexCategory, CodexEntry } from '../models/codex.interface';

@Component({
  selector: 'app-codex',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="codex-container">
      <!-- Header -->
      <header class="codex-header">
        <div class="header-actions">
          <button class="back-btn" (click)="goBack()">
            ← Zurück zur Geschichte
          </button>
          <h1>Codex</h1>
          <button class="add-category-btn" (click)="showAddCategoryModal = true">
            + Kategorie
          </button>
        </div>
        
        <!-- Search -->
        <div class="search-container">
          <input 
            type="text" 
            placeholder="Codex durchsuchen..." 
            [(ngModel)]="searchQuery"
            (input)="onSearch()"
            class="search-input">
        </div>
      </header>

      <!-- Content -->
      <div class="codex-content">
        <!-- Sidebar with categories -->
        <aside class="categories-sidebar">
          <div class="categories-list">
            <div 
              *ngFor="let category of sortedCategories()" 
              class="category-item"
              [class.active]="selectedCategoryId() === category.id"
              (click)="selectCategory(category.id)">
              <span class="category-icon">{{ category.icon }}</span>
              <span class="category-name">{{ category.title }}</span>
              <span class="entry-count">({{ category.entries.length }})</span>
              <button 
                class="category-menu-btn"
                (click)="$event.stopPropagation(); toggleCategoryMenu(category.id)">
                ⋮
              </button>
              
              <!-- Category menu -->
              <div 
                *ngIf="categoryMenuId() === category.id" 
                class="category-menu">
                <button (click)="editCategory(category)">Bearbeiten</button>
                <button (click)="deleteCategory(category.id)" class="danger">Löschen</button>
              </div>
            </div>
          </div>
        </aside>

        <!-- Main content area -->
        <main class="entries-main">
          <div *ngIf="searchQuery(); else normalView" class="search-results">
            <h2>Suchergebnisse für "{{ searchQuery() }}"</h2>
            <div class="entries-grid">
              <div *ngFor="let entry of searchResults()" class="entry-card" (click)="selectEntry(entry)">
                <h3>{{ entry.title }}</h3>
                <p class="entry-preview">{{ getContentPreview(entry.content) }}</p>
                <div class="entry-meta">
                  <span class="category-badge">{{ getCategoryName(entry.categoryId) }}</span>
                  <span *ngFor="let tag of entry.tags" class="tag">{{ tag }}</span>
                </div>
              </div>
            </div>
          </div>

          <ng-template #normalView>
            <div *ngIf="selectedCategory(); else selectCategoryPrompt" class="category-view">
              <div class="category-header">
                <h2>
                  <span class="category-icon">{{ selectedCategory()!.icon }}</span>
                  {{ selectedCategory()!.title }}
                </h2>
                <button class="add-entry-btn" (click)="showAddEntryModal = true">
                  + Eintrag hinzufügen
                </button>
              </div>

              <div class="entries-grid">
                <div 
                  *ngFor="let entry of sortedEntries()" 
                  class="entry-card"
                  (click)="selectEntry(entry)">
                  <h3>{{ entry.title }}</h3>
                  <p class="entry-preview">{{ getContentPreview(entry.content) }}</p>
                  <div class="entry-meta">
                    <span *ngFor="let tag of entry.tags" class="tag">{{ tag }}</span>
                    <span class="entry-date">{{ formatDate(entry.updatedAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </ng-template>

          <ng-template #selectCategoryPrompt>
            <div class="empty-state">
              <h2>Wähle eine Kategorie</h2>
              <p>Wähle eine Kategorie aus der Sidebar, um die Einträge zu sehen.</p>
            </div>
          </ng-template>
        </main>
      </div>

      <!-- Entry Modal -->
      <div *ngIf="selectedEntry()" class="modal-overlay" (click)="closeEntryModal()">
        <div class="modal-content entry-modal" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <input 
              type="text" 
              [(ngModel)]="editingEntry.title" 
              class="entry-title-input"
              placeholder="Titel...">
            <div class="modal-actions">
              <button (click)="saveEntry()" class="save-btn">Speichern</button>
              <button (click)="deleteEntry()" class="delete-btn">Löschen</button>
              <button (click)="closeEntryModal()" class="close-btn">×</button>
            </div>
          </header>
          
          <div class="modal-body">
            <div class="entry-metadata">
              <div class="tags-section">
                <label>Tags:</label>
                <input 
                  type="text" 
                  [(ngModel)]="tagInput" 
                  (keyup.enter)="addTag()"
                  placeholder="Tag hinzufügen...">
                <div class="tags-list">
                  <span 
                    *ngFor="let tag of editingEntry.tags" 
                    class="tag removable"
                    (click)="removeTag(tag)">
                    {{ tag }} ×
                  </span>
                </div>
              </div>
              
              <div class="image-section">
                <label>Bild URL:</label>
                <input 
                  type="url" 
                  [(ngModel)]="editingEntry.imageUrl" 
                  placeholder="https://...">
                <img 
                  *ngIf="editingEntry.imageUrl" 
                  [src]="editingEntry.imageUrl" 
                  class="entry-image-preview"
                  (error)="editingEntry.imageUrl = ''">
              </div>
            </div>
            
            <div class="content-section">
              <label>Inhalt:</label>
              <textarea 
                [(ngModel)]="editingEntry.content" 
                class="entry-content-textarea"
                placeholder="Beschreibung, Details, Notizen..."></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Category Modal -->
      <div *ngIf="showAddCategoryModal" class="modal-overlay" (click)="showAddCategoryModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Neue Kategorie</h3>
          <form (ngSubmit)="addCategory()">
            <input 
              type="text" 
              [(ngModel)]="newCategory.title" 
              name="title"
              placeholder="Kategorie Name"
              required>
            <input 
              type="text" 
              [(ngModel)]="newCategory.icon" 
              name="icon"
              placeholder="Icon (Emoji)"
              maxlength="2">
            <textarea 
              [(ngModel)]="newCategory.description" 
              name="description"
              placeholder="Beschreibung (optional)"></textarea>
            <div class="modal-actions">
              <button type="submit">Erstellen</button>
              <button type="button" (click)="showAddCategoryModal = false">Abbrechen</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add Entry Modal -->
      <div *ngIf="showAddEntryModal" class="modal-overlay" (click)="showAddEntryModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Neuer Eintrag</h3>
          <form (ngSubmit)="addEntry()">
            <input 
              type="text" 
              [(ngModel)]="newEntry.title" 
              name="title"
              placeholder="Titel"
              required>
            <textarea 
              [(ngModel)]="newEntry.content" 
              name="content"
              placeholder="Inhalt"
              rows="4"></textarea>
            <div class="modal-actions">
              <button type="submit">Erstellen</button>
              <button type="button" (click)="showAddEntryModal = false">Abbrechen</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .codex-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #1a1a1a;
      color: #e0e0e0;
    }

    .codex-header {
      padding: 1rem;
      border-bottom: 1px solid #333;
      background: #2a2a2a;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .back-btn {
      background: #333;
      color: #e0e0e0;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .back-btn:hover {
      background: #444;
    }

    .codex-header h1 {
      margin: 0;
      flex: 1;
    }

    .add-category-btn {
      background: #007acc;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .add-category-btn:hover {
      background: #005a9f;
    }

    .search-container {
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem;
      background: #333;
      border: 1px solid #555;
      border-radius: 4px;
      color: #e0e0e0;
      font-size: 1rem;
    }

    .search-input:focus {
      outline: none;
      border-color: #007acc;
    }

    .codex-content {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .categories-sidebar {
      width: 250px;
      background: #2a2a2a;
      border-right: 1px solid #333;
      overflow-y: auto;
    }

    .categories-list {
      padding: 1rem 0;
    }

    .category-item {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background 0.2s;
      position: relative;
    }

    .category-item:hover {
      background: #333;
    }

    .category-item.active {
      background: #007acc;
    }

    .category-icon {
      font-size: 1.2rem;
      margin-right: 0.5rem;
    }

    .category-name {
      flex: 1;
    }

    .entry-count {
      font-size: 0.9rem;
      color: #999;
    }

    .category-menu-btn {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 0.25rem;
      margin-left: 0.5rem;
    }

    .category-menu {
      position: absolute;
      right: 1rem;
      top: 100%;
      background: #333;
      border: 1px solid #555;
      border-radius: 4px;
      z-index: 100;
    }

    .category-menu button {
      display: block;
      width: 100%;
      padding: 0.5rem 1rem;
      background: none;
      border: none;
      color: #e0e0e0;
      cursor: pointer;
      text-align: left;
    }

    .category-menu button:hover {
      background: #444;
    }

    .category-menu button.danger {
      color: #ff6b6b;
    }

    .entries-main {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
    }

    .category-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
    }

    .category-header h2 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .add-entry-btn {
      background: #28a745;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .add-entry-btn:hover {
      background: #218838;
    }

    .entries-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .entry-card {
      background: #2a2a2a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: transform 0.2s, border-color 0.2s;
    }

    .entry-card:hover {
      transform: translateY(-2px);
      border-color: #007acc;
    }

    .entry-card h3 {
      margin: 0 0 0.5rem 0;
      color: #007acc;
    }

    .entry-preview {
      color: #ccc;
      font-size: 0.9rem;
      line-height: 1.4;
      margin: 0 0 1rem 0;
    }

    .entry-meta {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .tag {
      background: #444;
      color: #e0e0e0;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
    }

    .tag.removable {
      cursor: pointer;
      background: #666;
    }

    .tag.removable:hover {
      background: #888;
    }

    .category-badge {
      background: #007acc;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
    }

    .entry-date {
      color: #999;
      font-size: 0.8rem;
      margin-left: auto;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: #999;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: #2a2a2a;
      border-radius: 8px;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .entry-modal {
      max-width: 800px;
      width: 95%;
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #444;
    }

    .entry-title-input {
      flex: 1;
      background: #333;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 0.5rem;
      color: #e0e0e0;
      font-size: 1.2rem;
      font-weight: bold;
    }

    .modal-actions {
      display: flex;
      gap: 0.5rem;
    }

    .modal-actions button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .save-btn {
      background: #28a745;
      color: white;
    }

    .save-btn:hover {
      background: #218838;
    }

    .delete-btn {
      background: #dc3545;
      color: white;
    }

    .delete-btn:hover {
      background: #c82333;
    }

    .close-btn {
      background: #6c757d;
      color: white;
    }

    .close-btn:hover {
      background: #5a6268;
    }

    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .entry-metadata {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .tags-section, .image-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .tags-section label, .image-section label {
      font-weight: bold;
      color: #ccc;
    }

    .tags-section input, .image-section input {
      background: #333;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 0.5rem;
      color: #e0e0e0;
    }

    .tags-list {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .entry-image-preview {
      max-width: 100%;
      max-height: 200px;
      border-radius: 4px;
    }

    .content-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .content-section label {
      font-weight: bold;
      color: #ccc;
    }

    .entry-content-textarea {
      background: #333;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 1rem;
      color: #e0e0e0;
      min-height: 200px;
      resize: vertical;
      font-family: inherit;
    }

    .modal-content form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .modal-content input, .modal-content textarea {
      background: #333;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 0.75rem;
      color: #e0e0e0;
    }

    .modal-content input:focus, .modal-content textarea:focus {
      outline: none;
      border-color: #007acc;
    }

    @media (max-width: 768px) {
      .codex-content {
        flex-direction: column;
      }

      .categories-sidebar {
        width: 100%;
        height: 200px;
      }

      .categories-list {
        display: flex;
        overflow-x: auto;
        padding: 1rem;
      }

      .category-item {
        white-space: nowrap;
        min-width: 150px;
      }

      .entries-main {
        padding: 1rem;
      }

      .entries-grid {
        grid-template-columns: 1fr;
      }

      .entry-metadata {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CodexComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private codexService = inject(CodexService);
  private cdr = inject(ChangeDetectorRef);
  private subscriptions = new Subscription();

  storyId = signal<string>('');
  codex = signal<Codex | undefined>(undefined);
  selectedCategoryId = signal<string | null>(null);
  selectedEntry = signal<CodexEntry | null>(null);
  searchQuery = signal<string>('');
  searchResults = signal<CodexEntry[]>([]);
  categoryMenuId = signal<string | null>(null);

  // Modals
  showAddCategoryModal = false;
  showAddEntryModal = false;

  // Form data
  newCategory = { title: '', icon: '', description: '' };
  newEntry = { title: '', content: '' };
  editingEntry: any = {};
  tagInput = '';

  // Computed values
  sortedCategories = computed(() => {
    const codex = this.codex();
    if (!codex) return [];
    return [...codex.categories].sort((a, b) => a.order - b.order);
  });

  selectedCategory = computed(() => {
    const codex = this.codex();
    const categoryId = this.selectedCategoryId();
    if (!codex || !categoryId) return null;
    return codex.categories.find((c: CodexCategory) => c.id === categoryId) || null;
  });

  sortedEntries = computed(() => {
    const category = this.selectedCategory();
    if (!category) return [];
    return [...category.entries].sort((a: CodexEntry, b: CodexEntry) => a.order - b.order);
  });

  ngOnInit() {
    this.subscriptions.add(
      this.route.params.subscribe(params => {
        const storyId = params['id'];
        this.storyId.set(storyId);
        this.loadCodex(storyId);
      })
    );
    
    // Subscribe to codex changes from service
    this.subscriptions.add(
      this.codexService.codex$.subscribe(codexMap => {
        const storyId = this.storyId();
        if (storyId && codexMap.has(storyId)) {
          const codex = codexMap.get(storyId);
          this.codex.set(codex);
          
          // Auto-select first category if none selected and categories exist
          if (codex && codex.categories.length > 0 && !this.selectedCategoryId()) {
            this.selectedCategoryId.set(codex.categories[0].id);
          }
          
          // Force change detection
          this.cdr.detectChanges();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private loadCodex(storyId: string) {
    const codex = this.codexService.getOrCreateCodex(storyId);
    this.codex.set(codex);
    
    // Auto-select first category if none selected
    if (codex.categories.length > 0 && !this.selectedCategoryId()) {
      this.selectedCategoryId.set(codex.categories[0].id);
    }
  }

  selectCategory(categoryId: string) {
    this.selectedCategoryId.set(categoryId);
    this.categoryMenuId.set(null);
  }

  selectEntry(entry: CodexEntry) {
    this.selectedEntry.set(entry);
    this.editingEntry = {
      ...entry,
      tags: [...(entry.tags || [])]
    };
    this.tagInput = '';
  }

  closeEntryModal() {
    this.selectedEntry.set(null);
    this.editingEntry = {};
  }

  addCategory() {
    const storyId = this.storyId();
    if (!storyId || !this.newCategory.title.trim()) return;

    this.codexService.addCategory(storyId, this.newCategory);
    this.newCategory = { title: '', icon: '', description: '' };
    this.showAddCategoryModal = false;
  }

  editCategory(category: CodexCategory) {
    // TODO: Implement category editing
    this.categoryMenuId.set(null);
  }

  deleteCategory(categoryId: string) {
    const storyId = this.storyId();
    if (!storyId) return;

    if (confirm('Kategorie und alle Einträge löschen?')) {
      this.codexService.deleteCategory(storyId, categoryId);
      if (this.selectedCategoryId() === categoryId) {
        const codex = this.codex();
        this.selectedCategoryId.set(codex?.categories[0]?.id || null);
      }
    }
    this.categoryMenuId.set(null);
  }

  addEntry() {
    const storyId = this.storyId();
    const categoryId = this.selectedCategoryId();
    if (!storyId || !categoryId || !this.newEntry.title.trim()) return;

    this.codexService.addEntry(storyId, categoryId, this.newEntry);
    this.newEntry = { title: '', content: '' };
    this.showAddEntryModal = false;
  }

  saveEntry() {
    const storyId = this.storyId();
    const entry = this.selectedEntry();
    if (!storyId || !entry) return;

    this.codexService.updateEntry(storyId, entry.categoryId, entry.id, this.editingEntry);
    this.closeEntryModal();
  }

  deleteEntry() {
    const storyId = this.storyId();
    const entry = this.selectedEntry();
    if (!storyId || !entry) return;

    if (confirm('Eintrag löschen?')) {
      this.codexService.deleteEntry(storyId, entry.categoryId, entry.id);
      this.closeEntryModal();
    }
  }

  addTag() {
    const tag = this.tagInput.trim();
    if (tag && !this.editingEntry.tags.includes(tag)) {
      this.editingEntry.tags.push(tag);
      this.tagInput = '';
    }
  }

  removeTag(tag: string) {
    const index = this.editingEntry.tags.indexOf(tag);
    if (index > -1) {
      this.editingEntry.tags.splice(index, 1);
    }
  }

  onSearch() {
    const query = this.searchQuery();
    const storyId = this.storyId();
    
    if (!query.trim() || !storyId) {
      this.searchResults.set([]);
      return;
    }

    const results = this.codexService.searchEntries(storyId, query);
    this.searchResults.set(results);
  }

  toggleCategoryMenu(categoryId: string) {
    this.categoryMenuId.set(
      this.categoryMenuId() === categoryId ? null : categoryId
    );
  }

  getCategoryName(categoryId: string): string {
    const codex = this.codex();
    if (!codex) return '';
    const category = codex.categories.find((c: CodexCategory) => c.id === categoryId);
    return category?.title || '';
  }

  getContentPreview(content: string): string {
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  goBack() {
    this.router.navigate(['/stories/editor', this.storyId()]);
  }
}