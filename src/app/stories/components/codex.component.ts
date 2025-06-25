import { Component, OnInit, OnDestroy, inject, signal, computed, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel,
  IonSearchbar, IonList, IonChip, IonTextarea, IonInput,
  IonModal, IonGrid, IonRow, IonCol, IonText, IonNote, IonItemGroup, IonItemDivider,
  IonSelect, IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBack, add, ellipsisVertical, create, trash, save, close,
  search, person, bookmark, pricetag
} from 'ionicons/icons';
import { CodexService } from '../services/codex.service';
import { Codex, CodexCategory, CodexEntry, StoryRole, STORY_ROLES, CustomField } from '../models/codex.interface';

@Component({
  selector: 'app-codex',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NgSelectModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel,
    IonSearchbar, IonList, IonChip, IonTextarea, IonInput,
    IonModal, IonGrid, IonRow, IonCol, IonText, IonNote, IonItemGroup, IonItemDivider,
    IonSelect, IonSelectOption
  ],
  template: `
    <div class="ion-page">
      <!-- Header -->
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button (click)="goBack()">
              <ion-icon name="arrow-back" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-title>Codex</ion-title>
          <ion-buttons slot="end">
            <ion-button (click)="showAddCategoryModal.set(true)">
              <ion-icon name="add" slot="start"></ion-icon>
              Kategorie
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
        
        <!-- Search -->
        <ion-toolbar>
          <ion-searchbar
            placeholder="Codex durchsuchen..."
            [(ngModel)]="searchQuery"
            (ionInput)="onSearch()"
            debounce="300">
          </ion-searchbar>
        </ion-toolbar>
      </ion-header>

      <!-- Content -->
      <ion-content>
        <ion-grid class="codex-grid">
          <ion-row>
            <!-- Sidebar with categories -->
            <ion-col size="12" size-md="3" class="categories-sidebar">
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Kategorien</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ion-list>
                    <ion-item 
                      *ngFor="let category of sortedCategories()" 
                      button
                      [class.active-category]="selectedCategoryId() === category.id"
                      (click)="selectCategory(category.id)">
                      <ion-icon [name]="getDefaultIcon()" slot="start"></ion-icon>
                      <ion-label>
                        <h3>{{ category.icon }} {{ category.title }}</h3>
                        <p>{{ category.entries.length }} Einträge</p>
                      </ion-label>
                      <ion-button 
                        fill="clear" 
                        size="small"
                        (click)="$event.stopPropagation(); toggleCategoryMenu(category.id)"
                        slot="end">
                        <ion-icon name="ellipsis-vertical" slot="icon-only"></ion-icon>
                      </ion-button>
                      
                      <!-- Category menu -->
                      <ion-list *ngIf="categoryMenuId() === category.id" class="category-menu">
                        <ion-item button (click)="editCategory(category)">
                          <ion-icon name="create" slot="start"></ion-icon>
                          <ion-label>Bearbeiten</ion-label>
                        </ion-item>
                        <ion-item button (click)="deleteCategory(category.id)" color="danger">
                          <ion-icon name="trash" slot="start"></ion-icon>
                          <ion-label>Löschen</ion-label>
                        </ion-item>
                      </ion-list>
                    </ion-item>
                  </ion-list>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <!-- Main content area -->
            <ion-col size="12" size-md="9" class="entries-main">
              <div *ngIf="searchQuery(); else normalView">
                <ion-card>
                  <ion-card-header>
                    <ion-card-title>Suchergebnisse für "{{ searchQuery() }}"</ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <ion-grid>
                      <ion-row>
                        <ion-col *ngFor="let entry of searchResults()" size="12" size-md="6" size-lg="4">
                          <ion-card button (click)="selectEntry(entry)" class="entry-card">
                            <ion-card-header>
                              <ion-card-title>{{ entry.title }}</ion-card-title>
                            </ion-card-header>
                            <ion-card-content>
                              <ion-text color="medium">
                                <p>{{ getContentPreview(entry.content) }}</p>
                              </ion-text>
                              <div class="entry-meta">
                                <ion-chip color="primary">
                                  <ion-label>{{ getCategoryName(entry.categoryId) }}</ion-label>
                                </ion-chip>
                                <ion-chip *ngIf="entry.metadata?.['storyRole']" color="success">
                                  <ion-icon name="person"></ion-icon>
                                  <ion-label>{{ entry.metadata?.['storyRole'] }}</ion-label>
                                </ion-chip>
                                <ion-chip *ngFor="let field of entry.metadata?.['customFields']" color="secondary">
                                  <ion-label>{{ field.name }}: {{ getFieldValuePreview(field.value) }}</ion-label>
                                </ion-chip>
                                <ion-chip *ngFor="let tag of entry.tags" color="medium">
                                  <ion-icon name="tag"></ion-icon>
                                  <ion-label>{{ tag }}</ion-label>
                                </ion-chip>
                              </div>
                            </ion-card-content>
                          </ion-card>
                        </ion-col>
                      </ion-row>
                    </ion-grid>
                  </ion-card-content>
                </ion-card>
              </div>

              <ng-template #normalView>
                <div *ngIf="selectedCategory(); else selectCategoryPrompt">
                  <ion-card>
                    <ion-card-header>
                      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <ion-card-title>
                          {{ selectedCategory()!.icon }} {{ selectedCategory()!.title }}
                        </ion-card-title>
                        <ion-button 
                          fill="outline" 
                          size="small" 
                          (click)="showAddEntryModal.set(true)">
                          <ion-icon name="add" slot="start"></ion-icon>
                          Eintrag hinzufügen
                        </ion-button>
                      </div>
                    </ion-card-header>
                    <ion-card-content>
                      <ion-grid>
                        <ion-row>
                          <ion-col 
                            *ngFor="let entry of sortedEntries()" 
                            size="12" 
                            size-md="6" 
                            size-lg="4">
                            <ion-card button (click)="selectEntry(entry)" class="entry-card">
                              <ion-card-header>
                                <ion-card-title>{{ entry.title }}</ion-card-title>
                              </ion-card-header>
                              <ion-card-content>
                                <ion-text color="medium">
                                  <p>{{ getContentPreview(entry.content) }}</p>
                                </ion-text>
                                <div class="entry-meta">
                                  <ion-chip *ngIf="entry.metadata?.['storyRole']" color="success">
                                    <ion-icon name="person"></ion-icon>
                                    <ion-label>{{ entry.metadata?.['storyRole'] }}</ion-label>
                                  </ion-chip>
                                  <ion-chip *ngFor="let field of entry.metadata?.['customFields']" color="secondary">
                                    <ion-label>{{ field.name }}: {{ getFieldValuePreview(field.value) }}</ion-label>
                                  </ion-chip>
                                  <ion-chip *ngFor="let tag of entry.tags" color="medium">
                                    <ion-icon name="tag"></ion-icon>
                                    <ion-label>{{ tag }}</ion-label>
                                  </ion-chip>
                                  <ion-note>{{ formatDate(entry.updatedAt) }}</ion-note>
                                </div>
                              </ion-card-content>
                            </ion-card>
                          </ion-col>
                        </ion-row>
                      </ion-grid>
                    </ion-card-content>
                  </ion-card>
                </div>
              </ng-template>

              <ng-template #selectCategoryPrompt>
                <ion-card>
                  <ion-card-content class="ion-text-center">
                    <ion-text color="medium">
                      <h2>Wähle eine Kategorie</h2>
                      <p>Wähle eine Kategorie aus der Sidebar, um die Einträge zu sehen.</p>
                    </ion-text>
                  </ion-card-content>
                </ion-card>
              </ng-template>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-content>

      <!-- Entry Modal -->
      <ion-modal [isOpen]="!!selectedEntry()" (didDismiss)="closeEntryModal()">
        <ng-template>
          <ion-header>
            <ion-toolbar>
              <ion-title>Eintrag bearbeiten</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="closeEntryModal()">
                  <ion-icon name="close" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          
          <ion-content>
            <ion-card>
              <ion-card-content>
                <ion-item>
                  <ion-label position="stacked">Titel</ion-label>
                  <ion-input 
                    [(ngModel)]="editingEntry.title" 
                    placeholder="Titel..."
                    type="text">
                  </ion-input>
                </ion-item>

                <!-- Tags -->
                <ion-item>
                  <ion-label position="stacked">Tags</ion-label>
                  <ion-input 
                    [(ngModel)]="tagInput" 
                    (keyup.enter)="addTag()"
                    placeholder="Tag hinzufügen...">
                  </ion-input>
                </ion-item>
                <div class="tags-list" style="padding: 8px 16px;">
                  <ion-chip 
                    *ngFor="let tag of editingEntry.tags" 
                    (click)="removeTag(tag)"
                    color="medium">
                    <ion-label>{{ tag }}</ion-label>
                    <ion-icon name="close" size="small"></ion-icon>
                  </ion-chip>
                </div>
                
                <!-- Image URL -->
                <ion-item>
                  <ion-label position="stacked">Bild URL</ion-label>
                  <ion-input 
                    [(ngModel)]="editingEntry.imageUrl" 
                    placeholder="https://..."
                    type="url">
                  </ion-input>
                </ion-item>
                <div *ngIf="editingEntry.imageUrl" style="padding: 8px 16px;">
                  <img 
                    [src]="editingEntry.imageUrl" 
                    style="max-width: 100%; height: auto; border-radius: 8px;"
                    (error)="editingEntry.imageUrl = ''">
                </div>
                
                <!-- Story role selection for character entries -->
                <ion-item *ngIf="isCharacterEntry()">
                  <ion-label position="stacked">Story-Rolle</ion-label>
                  <ion-select 
                    [(ngModel)]="editingEntry.storyRole"
                    placeholder="Rolle auswählen..."
                    interface="popover">
                    <ion-select-option value="">Keine Rolle</ion-select-option>
                    <ion-select-option 
                      *ngFor="let role of storyRoles" 
                      [value]="role.value">
                      {{ role.label }}
                    </ion-select-option>
                  </ion-select>
                </ion-item>
                
                <!-- Custom fields -->
                <ion-item-group>
                  <ion-item-divider>
                    <ion-label>Benutzerdefinierte Felder</ion-label>
                  </ion-item-divider>
                  
                  <!-- Existing custom fields -->
                  <div *ngFor="let field of editingEntry.customFields">
                    <ion-item>
                      <ion-label position="stacked">Feldname</ion-label>
                      <ion-input 
                        [(ngModel)]="field.name" 
                        placeholder="Feldname...">
                      </ion-input>
                    </ion-item>
                    <ion-item>
                      <ion-label position="stacked">Feldwert</ion-label>
                      <ion-textarea 
                        [(ngModel)]="field.value" 
                        placeholder="Feldwert..."
                        rows="3">
                      </ion-textarea>
                      <ion-button 
                        slot="end" 
                        fill="clear" 
                        color="danger"
                        (click)="removeCustomField(field.id)">
                        <ion-icon name="trash" slot="icon-only"></ion-icon>
                      </ion-button>
                    </ion-item>
                  </div>
                  
                  <!-- Add new custom field -->
                  <ion-item>
                    <ion-label position="stacked">Neuer Feldname</ion-label>
                    <ion-input 
                      [(ngModel)]="newCustomFieldName" 
                      placeholder="Feldname...">
                    </ion-input>
                  </ion-item>
                  <ion-item>
                    <ion-label position="stacked">Feldwert</ion-label>
                    <ion-textarea 
                      [(ngModel)]="newCustomFieldValue" 
                      placeholder="Feldwert..."
                      rows="3">
                    </ion-textarea>
                    <ion-button 
                      slot="end" 
                      fill="clear" 
                      [disabled]="!newCustomFieldName.trim()"
                      (click)="addCustomField()">
                      <ion-icon name="add" slot="icon-only"></ion-icon>
                    </ion-button>
                  </ion-item>
                </ion-item-group>
                
                <!-- Content -->
                <ion-item>
                  <ion-label position="stacked">Inhalt</ion-label>
                  <ion-textarea 
                    [(ngModel)]="editingEntry.content" 
                    placeholder="Beschreibung, Details, Notizen..."
                    rows="6">
                  </ion-textarea>
                </ion-item>
                
                <!-- Action Buttons -->
                <div style="padding: 16px; display: flex; gap: 8px; justify-content: flex-end;">
                  <ion-button (click)="deleteEntry()" fill="outline" color="danger">
                    <ion-icon name="trash" slot="start"></ion-icon>
                    Löschen
                  </ion-button>
                  <ion-button (click)="saveEntry()" color="primary">
                    <ion-icon name="save" slot="start"></ion-icon>
                    Speichern
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- Add Category Modal -->
      <ion-modal [isOpen]="showAddCategoryModal()" (didDismiss)="showAddCategoryModal.set(false)">
        <ng-template>
          <ion-header>
            <ion-toolbar>
              <ion-title>Neue Kategorie</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="addCategory()" color="primary">
                  <ion-icon name="save" slot="start"></ion-icon>
                  Erstellen
                </ion-button>
                <ion-button (click)="showAddCategoryModal.set(false)">
                  <ion-icon name="close" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          
          <ion-content>
            <ion-card>
              <ion-card-content>
                <ion-item>
                  <ion-label position="stacked">Kategorie Name</ion-label>
                  <ion-input 
                    [(ngModel)]="newCategory.title" 
                    placeholder="Kategorie Name"
                    type="text">
                  </ion-input>
                </ion-item>
                
                <ion-item>
                  <ion-label position="stacked">Icon (Emoji)</ion-label>
                  <ion-input 
                    [(ngModel)]="newCategory.icon" 
                    placeholder="🏷️"
                    maxlength="2"
                    type="text">
                  </ion-input>
                </ion-item>
                
                <ion-item>
                  <ion-label position="stacked">Beschreibung (optional)</ion-label>
                  <ion-textarea 
                    [(ngModel)]="newCategory.description" 
                    placeholder="Beschreibung..."
                    rows="3">
                  </ion-textarea>
                </ion-item>
              </ion-card-content>
            </ion-card>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- Add Entry Modal -->
      <ion-modal [isOpen]="showAddEntryModal()" (didDismiss)="showAddEntryModal.set(false)">
        <ng-template>
          <ion-header>
            <ion-toolbar>
              <ion-title>Neuer Eintrag</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="addEntry()" color="primary">
                  <ion-icon name="save" slot="start"></ion-icon>
                  Erstellen
                </ion-button>
                <ion-button (click)="showAddEntryModal.set(false)">
                  <ion-icon name="close" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          
          <ion-content>
            <ion-card>
              <ion-card-content>
                <ion-item>
                  <ion-label position="stacked">Titel</ion-label>
                  <ion-input 
                    [(ngModel)]="newEntry.title" 
                    placeholder="Titel"
                    type="text">
                  </ion-input>
                </ion-item>
                
                <ion-item>
                  <ion-label position="stacked">Inhalt</ion-label>
                  <ion-textarea 
                    [(ngModel)]="newEntry.content" 
                    placeholder="Inhalt"
                    rows="6">
                  </ion-textarea>
                </ion-item>
              </ion-card-content>
            </ion-card>
          </ion-content>
        </ng-template>
      </ion-modal>
    </div>
  `,
  styles: [`
    .ion-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--ion-background-color);
    }

    .codex-grid {
      height: 100%;
      padding: 1rem;
    }

    .categories-sidebar {
      position: sticky;
      top: 0;
      height: fit-content;
    }

    .active-category {
      --background: var(--ion-color-primary);
      --color: var(--ion-color-primary-contrast);
    }

    .category-menu {
      position: absolute;
      right: 1rem;
      top: 100%;
      background: var(--ion-background-color);
      border: 1px solid var(--ion-border-color);
      border-radius: var(--ion-border-radius);
      box-shadow: var(--ion-box-shadow);
      z-index: 100;
      min-width: 150px;
    }

    .entries-main {
      padding: 0;
    }

    .entry-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      margin-bottom: 1rem;
    }

    .entry-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--ion-box-shadow-hover);
    }

    .entry-meta {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 0.5rem;
    }

    .tags-list {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      align-items: center;
    }

    @media (max-width: 768px) {
      .codex-grid {
        padding: 0.5rem;
      }
      
      .categories-sidebar {
        position: static;
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
  showAddCategoryModal = signal<boolean>(false);
  showAddEntryModal = signal<boolean>(false);

  // Form data
  newCategory = { title: '', icon: '', description: '' };
  newEntry = { title: '', content: '' };
  editingEntry: any = {};
  tagInput = '';
  
  // Story roles
  storyRoles = STORY_ROLES;
  
  // Custom fields
  newCustomFieldName = '';
  newCustomFieldValue = '';

  constructor() {
    addIcons({
      arrowBack, add, ellipsisVertical, create, trash, save, close,
      search, person, bookmark, pricetag
    });
  }

  getDefaultIcon(): string {
    return 'bookmark';
  }

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

  private async loadCodex(storyId: string) {
    try {
      const codex = await this.codexService.getOrCreateCodex(storyId);
      this.codex.set(codex);
      
      // Auto-select first category if none selected
      if (codex.categories.length > 0 && !this.selectedCategoryId()) {
        this.selectedCategoryId.set(codex.categories[0].id);
      }
    } catch (error) {
      console.error('Error loading codex:', error);
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
      tags: [...(entry.tags || [])],
      storyRole: entry.metadata?.['storyRole'] || null,
      customFields: entry.metadata?.['customFields'] ? [...entry.metadata['customFields']] : []
    };
    this.tagInput = '';
    this.resetCustomFieldInputs();
  }

  closeEntryModal() {
    this.selectedEntry.set(null);
    this.editingEntry = {};
    this.resetCustomFieldInputs();
  }

  async addCategory() {
    const storyId = this.storyId();
    if (!storyId || !this.newCategory.title.trim()) return;

    try {
      await this.codexService.addCategory(storyId, this.newCategory);
      this.newCategory = { title: '', icon: '', description: '' };
      this.showAddCategoryModal.set(false);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  }

  editCategory(category: CodexCategory) {
    // TODO: Implement category editing
    this.categoryMenuId.set(null);
  }

  async deleteCategory(categoryId: string) {
    const storyId = this.storyId();
    if (!storyId) return;

    if (confirm('Kategorie und alle Einträge löschen?')) {
      try {
        await this.codexService.deleteCategory(storyId, categoryId);
        if (this.selectedCategoryId() === categoryId) {
          const codex = this.codex();
          this.selectedCategoryId.set(codex?.categories[0]?.id || null);
        }
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
    this.categoryMenuId.set(null);
  }

  async addEntry() {
    const storyId = this.storyId();
    const categoryId = this.selectedCategoryId();
    if (!storyId || !categoryId || !this.newEntry.title.trim()) return;

    try {
      await this.codexService.addEntry(storyId, categoryId, this.newEntry);
      this.newEntry = { title: '', content: '' };
      this.showAddEntryModal.set(false);
    } catch (error) {
      console.error('Error adding entry:', error);
    }
  }

  async saveEntry() {
    const storyId = this.storyId();
    const entry = this.selectedEntry();
    if (!storyId || !entry) return;

    try {
      // Prepare the updated entry with story role and custom fields in metadata
      const updatedEntry = {
        ...this.editingEntry,
        metadata: {
          ...this.editingEntry.metadata,
          storyRole: this.editingEntry.storyRole,
          customFields: this.editingEntry.customFields || []
        }
      };
      
      // Remove temporary fields from top level as they should be in metadata
      delete updatedEntry.storyRole;
      delete updatedEntry.customFields;

      await this.codexService.updateEntry(storyId, entry.categoryId, entry.id, updatedEntry);
      this.closeEntryModal();
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  }

  async deleteEntry() {
    const storyId = this.storyId();
    const entry = this.selectedEntry();
    if (!storyId || !entry) return;

    if (confirm('Eintrag löschen?')) {
      try {
        await this.codexService.deleteEntry(storyId, entry.categoryId, entry.id);
        this.closeEntryModal();
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
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

  isCharacterEntry(): boolean {
    const category = this.selectedCategory();
    return category?.title === 'Charaktere' || false;
  }

  addCustomField() {
    const name = this.newCustomFieldName.trim();
    const value = this.newCustomFieldValue.trim();
    
    if (!name) return;

    if (!this.editingEntry.customFields) {
      this.editingEntry.customFields = [];
    }

    const newField: CustomField = {
      id: Date.now().toString(),
      name: name,
      value: value
    };

    this.editingEntry.customFields.push(newField);
    this.resetCustomFieldInputs();
  }

  removeCustomField(fieldId: string) {
    if (this.editingEntry.customFields) {
      this.editingEntry.customFields = this.editingEntry.customFields.filter((field: CustomField) => field.id !== fieldId);
    }
  }

  resetCustomFieldInputs() {
    this.newCustomFieldName = '';
    this.newCustomFieldValue = '';
  }

  getFieldValuePreview(value: string): string {
    if (!value) return '';
    // Replace line breaks with spaces and limit length
    const singleLine = value.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    return singleLine.length > 30 ? singleLine.substring(0, 30) + '...' : singleLine;
  }

  goBack() {
    this.router.navigate(['/stories/editor', this.storyId()]);
  }
}