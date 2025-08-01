import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel,
  IonSearchbar, IonList, IonChip, IonTextarea, IonInput, IonButton, IonIcon,
  IonModal, IonGrid, IonRow, IonCol, IonText, IonNote, IonButtons, IonToolbar, IonTitle, IonHeader,
  IonSelect, IonSelectOption, IonToggle
} from '@ionic/angular/standalone';
import { AppHeaderComponent, HeaderAction } from '../../shared/components/app-header.component';
import { addIcons } from 'ionicons';
import {
  arrowBack, add, ellipsisVertical, create, trash, save, close,
  search, person, bookmark, pricetag, star
} from 'ionicons/icons';
import { CodexService } from '../services/codex.service';
import { Codex, CodexCategory, CodexEntry, STORY_ROLES, CustomField, StoryRole } from '../models/codex.interface';

@Component({
  selector: 'app-codex',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NgSelectModule, AppHeaderComponent,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel,
    IonSearchbar, IonList, IonChip, IonTextarea, IonInput, IonButton, IonIcon,
    IonModal, IonGrid, IonRow, IonCol, IonText, IonNote, IonButtons, IonToolbar, IonTitle, IonHeader,
    IonSelect, IonSelectOption, IonToggle
  ],
  template: `
    <div class="ion-page">
      <!-- Header -->
      <app-header 
        title="Codex" 
        [showBackButton]="true"
        [backAction]="goBack.bind(this)"
        [rightActions]="headerActions"
        [showSecondaryToolbar]="true"
        [secondaryContent]="searchToolbar">
      </app-header>
      
      <ng-template #searchToolbar>
        <ion-searchbar
          placeholder="Codex durchsuchen..."
          [(ngModel)]="searchQuery"
          (ionInput)="onSearch()"
          debounce="300">
        </ion-searchbar>
      </ng-template>

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
                        <ion-item button (click)="editCategory()">
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
                                <ion-chip *ngIf="entry.alwaysInclude" color="warning">
                                  <ion-icon name="star"></ion-icon>
                                  <ion-label>Immer inkludiert</ion-label>
                                </ion-chip>
                                <ion-chip *ngIf="entry.metadata?.['storyRole']" color="success">
                                  <ion-icon name="person"></ion-icon>
                                  <ion-label>{{ entry.metadata?.['storyRole'] }}</ion-label>
                                </ion-chip>
                                <ion-chip *ngFor="let field of getCustomFields(entry)" color="secondary">
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
                          (click)="createNewEntry()">
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
                                  <ion-chip *ngIf="entry.alwaysInclude" color="warning">
                                    <ion-icon name="star"></ion-icon>
                                    <ion-label>Immer inkludiert</ion-label>
                                  </ion-chip>
                                  <ion-chip *ngIf="entry.metadata?.['storyRole']" color="success">
                                    <ion-icon name="person"></ion-icon>
                                    <ion-label>{{ entry.metadata?.['storyRole'] }}</ion-label>
                                  </ion-chip>
                                  <ion-chip *ngFor="let field of getCustomFields(entry)" color="secondary">
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
      <ion-modal [isOpen]="!!selectedEntry()" (didDismiss)="closeEntryModal()" class="entry-modal">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>{{ editingEntry.title || 'Eintrag bearbeiten' }}</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="closeEntryModal()">
                  <ion-icon name="close" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          
          <ion-content class="entry-modal-content">
            <div class="modal-form-container">
              <!-- Basic Information Section -->
              <div class="form-section">
                <h3 class="section-title">Grundinformationen</h3>
                
                <div class="form-group">
                  <ion-item lines="none" class="form-item">
                    <ion-label position="stacked">Titel <span class="required">*</span></ion-label>
                    <ion-input 
                      [(ngModel)]="editingEntry.title" 
                      placeholder="Titel eingeben..."
                      type="text"
                      class="title-input">
                    </ion-input>
                  </ion-item>
                </div>

                <!-- Tags Section -->
                <div class="form-group">
                  <ion-item lines="none" class="form-item">
                    <ion-label position="stacked">Tags</ion-label>
                    <ion-input 
                      [(ngModel)]="tagInput" 
                      (keyup.enter)="addTag()"
                      placeholder="Tag eingeben und Enter drücken..."
                      class="tag-input">
                    </ion-input>
                  </ion-item>
                  <div class="tags-container" *ngIf="editingEntry.tags?.length">
                    <ion-chip 
                      *ngFor="let tag of editingEntry.tags" 
                      (click)="removeTag(tag)"
                      color="primary"
                      class="tag-chip">
                      <ion-label>{{ tag }}</ion-label>
                      <ion-icon name="close" size="small"></ion-icon>
                    </ion-chip>
                  </div>
                </div>
              </div>

              <!-- Media Section -->
              <div class="form-section" *ngIf="editingEntry.imageUrl || !editingEntry.imageUrl">
                <h3 class="section-title">Medien</h3>
                
                <div class="form-group">
                  <ion-item lines="none" class="form-item">
                    <ion-label position="stacked">Bild URL</ion-label>
                    <ion-input 
                      [(ngModel)]="editingEntry.imageUrl" 
                      placeholder="https://beispiel.com/bild.jpg"
                      type="url"
                      class="url-input">
                    </ion-input>
                  </ion-item>
                  <div class="image-preview" *ngIf="editingEntry.imageUrl">
                    <img 
                      [src]="editingEntry.imageUrl" 
                      alt="Vorschau"
                      (error)="editingEntry.imageUrl = ''">
                  </div>
                </div>
              </div>
                
              <!-- Story Role Section -->
              <div class="form-section" *ngIf="isCharacterEntry()">
                <h3 class="section-title">Story-Einstellungen</h3>
                
                <div class="form-group">
                  <ion-item lines="none" class="form-item">
                    <ion-label position="stacked">Story-Rolle</ion-label>
                    <ion-select 
                      [(ngModel)]="editingEntry.storyRole"
                      placeholder="Rolle auswählen..."
                      interface="popover"
                      class="role-select">
                      <ion-select-option value="">Keine Rolle</ion-select-option>
                      <ion-select-option 
                        *ngFor="let role of storyRoles" 
                        [value]="role.value">
                        {{ role.label }}
                      </ion-select-option>
                    </ion-select>
                  </ion-item>
                </div>
              </div>
              
              <!-- Always Include Section -->
              <div class="form-section">
                <h3 class="section-title">AI-Einstellungen</h3>
                
                <div class="form-group">
                  <ion-item lines="none" class="form-item">
                    <ion-label position="stacked">Immer in Beat-Prompt inkludieren</ion-label>
                    <ion-toggle 
                      [(ngModel)]="editingEntry.alwaysInclude"
                      slot="end"
                      color="primary">
                    </ion-toggle>
                  </ion-item>
                  <ion-note color="medium" style="padding: 0 16px; font-size: 0.9rem;">
                    Wenn aktiviert, wird dieser Eintrag immer in den Beat-Prompt eingeschlossen, unabhängig von der Relevanz-Bewertung.
                  </ion-note>
                </div>
              </div>
                
              <!-- Custom Fields Section -->
              <div class="form-section">
                <div class="section-header">
                  <h3 class="section-title">Benutzerdefinierte Felder</h3>
                  <ion-button 
                    size="small" 
                    fill="outline" 
                    color="primary"
                    [disabled]="!newCustomFieldName.trim()"
                    (click)="addCustomField()">
                    <ion-icon name="add" slot="start"></ion-icon>
                    Feld hinzufügen
                  </ion-button>
                </div>
                  
                <!-- Existing custom fields -->
                <div class="custom-fields-container">
                  <div *ngFor="let field of editingEntry.customFields" class="custom-field-item">
                    <div class="custom-field-header">
                      <ion-item lines="none" class="form-item field-name-item">
                        <ion-label position="stacked">Feldname</ion-label>
                        <ion-input 
                          [(ngModel)]="field.name" 
                          placeholder="Feldname eingeben...">
                        </ion-input>
                      </ion-item>
                      <ion-button 
                        fill="clear" 
                        color="danger"
                        size="small"
                        (click)="removeCustomField(field.id)"
                        class="remove-field-btn">
                        <ion-icon name="trash" slot="icon-only"></ion-icon>
                      </ion-button>
                    </div>
                    <ion-item lines="none" class="form-item">
                      <ion-label position="stacked">Feldwert</ion-label>
                      <ion-textarea 
                        [(ngModel)]="field.value" 
                        placeholder="Feldwert eingeben..."
                        rows="3"
                        autoGrow="true">
                      </ion-textarea>
                    </ion-item>
                  </div>
                  
                  <!-- Add new custom field form -->
                  <div class="new-custom-field">
                    <ion-item lines="none" class="form-item">
                      <ion-label position="stacked">Neuer Feldname</ion-label>
                      <ion-input 
                        [(ngModel)]="newCustomFieldName" 
                        placeholder="Feldname eingeben...">
                      </ion-input>
                    </ion-item>
                    <ion-item lines="none" class="form-item">
                      <ion-label position="stacked">Feldwert</ion-label>
                      <ion-textarea 
                        [(ngModel)]="newCustomFieldValue" 
                        placeholder="Feldwert eingeben..."
                        rows="3"
                        autoGrow="true">
                      </ion-textarea>
                    </ion-item>
                  </div>
                </div>
              </div>
                
              <!-- Content Section -->
              <div class="form-section">
                <h3 class="section-title">Inhalt</h3>
                
                <div class="form-group">
                  <ion-item lines="none" class="form-item content-item">
                    <ion-label position="stacked">Beschreibung</ion-label>
                    <ion-textarea 
                      [(ngModel)]="editingEntry.content" 
                      placeholder="Beschreibung, Details, Notizen..."
                      rows="8"
                      autoGrow="true"
                      class="content-textarea">
                    </ion-textarea>
                  </ion-item>
                </div>
              </div>
                
              <!-- Action Buttons -->
              <div class="modal-actions">
                <ion-button (click)="deleteEntry()" fill="outline" color="danger" size="default">
                  <ion-icon name="trash" slot="start"></ion-icon>
                  Löschen
                </ion-button>
                <ion-button (click)="saveEntry()" color="primary" size="default">
                  <ion-icon name="save" slot="start"></ion-icon>
                  Speichern
                </ion-button>
              </div>
            </div>
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

    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100vh;
      position: relative;
      background: transparent;
    }
    
    .ion-page {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: transparent;
    }
    
    ion-content {
      --background: transparent !important;
      background: transparent !important;
      flex: 1;
      position: relative;
    }
    
    /* Remove mobile-specific overrides - use same layout as story-list */
    
    ion-content::part(background) {
      background: transparent !important;
    }

    .codex-grid {
      height: 100%;
      padding: 0.125rem;
      max-width: none;
    }
    
    /* Card padding now inherited from global :root variables */
    
    /* Grid and column spacing now inherited from global :root variables */

    .categories-sidebar {
      position: sticky;
      top: 0;
      height: fit-content;
    }
    
    /* Make category items more compact */
    .categories-sidebar ion-item {
      --min-height: 40px;
      --padding-top: 4px;
      --padding-bottom: 4px;
      --padding-start: 8px;
      --padding-end: 8px;
    }
    
    /* Make category titles smaller */
    .categories-sidebar ion-label h3 {
      font-size: 0.9rem !important;
      margin: 0 !important;
      font-weight: 500 !important;
    }
    
    .categories-sidebar ion-label p {
      font-size: 0.75rem !important;
      margin: 2px 0 0 0 !important;
    }
    
    /* Apply cyberpunk styling to all ion-cards */
    ion-card {
      background: linear-gradient(135deg, rgba(20, 20, 20, 0.3) 0%, rgba(15, 15, 15, 0.3) 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(8px) saturate(120%);
      -webkit-backdrop-filter: blur(8px) saturate(120%);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
      --color: #f8f9fa;
    }
    
    ion-card-header {
      background: transparent !important;
      --background: transparent !important;
    }
    
    ion-card-title {
      color: #f8f9fa !important;
      --color: #f8f9fa !important;
      font-size: 1rem !important;
      font-weight: 600 !important;
    }
    
    ion-card-content {
      background: transparent !important;
      --background: transparent !important;
    }
    
    ion-card:hover {
      background: linear-gradient(135deg, rgba(25, 25, 25, 0.4) 0%, rgba(20, 20, 20, 0.4) 100%);
      border-color: rgba(71, 118, 230, 0.3);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      transform: translateY(-2px);
    }
    

    /* Make ion-list and ion-items transparent */
    ion-list {
      background: transparent !important;
      --background: transparent !important;
    }
    
    ion-item {
      --background: transparent !important;
      --background-hover: rgba(255, 255, 255, 0.1) !important;
      --background-focused: rgba(255, 255, 255, 0.1) !important;
      --color: #f8f9fa !important;
      --border-color: rgba(255, 255, 255, 0.1) !important;
    }
    
    ion-item::part(native) {
      background: transparent !important;
    }
    
    .active-category {
      --background: linear-gradient(135deg, rgba(71, 118, 230, 0.3) 0%, rgba(143, 84, 233, 0.3) 100%) !important;
      --color: #f8f9fa !important;
      backdrop-filter: blur(5px);
    }
    
    .active-category::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(135deg, #4776E6 0%, #8E54E9 100%);
    }

    .category-menu {
      position: absolute;
      right: 1rem;
      top: 100%;
      background: linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(15, 15, 15, 0.95) 100%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      z-index: 100;
      min-width: 150px;
    }
    
    .category-menu ion-item {
      --background: transparent !important;
    }
    
    .category-menu ion-list {
      background: transparent !important;
    }

    .entries-main {
      padding: 0;
    }

    .entry-card {
      background: linear-gradient(135deg, rgba(20, 20, 20, 0.3) 0%, rgba(15, 15, 15, 0.3) 100%) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 16px !important;
      backdrop-filter: blur(8px) saturate(120%) !important;
      -webkit-backdrop-filter: blur(8px) saturate(120%) !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
      transition: all 0.3s ease;
      margin-bottom: 0.125rem;
      --background: transparent !important;
    }
    
    .entry-card::part(native) {
      background: transparent !important;
    }
    
    .entry-card ion-card-header,
    .entry-card ion-card-content {
      background: transparent !important;
      --background: transparent !important;
      /* Padding inherited from global :root variables */
    }
    
    .entry-card ion-card-title {
      color: #f8f9fa !important;
      --color: #f8f9fa !important;
      font-size: 0.9rem !important;
      font-weight: 600 !important;
    }
    
    .entry-card ion-text {
      --color: #e0e0e0 !important;
      color: #e0e0e0 !important;
    }

    .entry-card:hover {
      background: linear-gradient(135deg, rgba(25, 25, 25, 0.4) 0%, rgba(20, 20, 20, 0.4) 100%);
      border-color: rgba(71, 118, 230, 0.3);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      transform: translateY(-4px);
    }

    .entry-meta {
      display: flex;
      gap: 2px;
      flex-wrap: wrap;
      align-items: center;
    }
    
    .entry-meta ion-chip {
      --background: rgba(71, 118, 230, 0.15) !important;
      --color: #8bb4f8 !important;
      border: 1px solid rgba(71, 118, 230, 0.3) !important;
      backdrop-filter: blur(5px);
      font-size: 0.7rem !important;
      height: 20px !important;
      margin: 1px !important;
      /* Padding now inherited from global :root variables */
    }
    
    .entry-meta ion-note {
      color: #adb5bd !important;
    }

    .tags-list {
      display: flex;
      gap: 0.125rem;
      flex-wrap: wrap;
      align-items: center;
    }

    @media (max-width: 768px) {
      .codex-grid {
        padding: 0.125rem;
      }
      
      .categories-sidebar {
        position: static;
      }
    }

    /* Entry Modal Styling */
    .entry-modal {
      --width: 90vw;
      --max-width: 800px;
      --height: 90vh;
      --border-radius: 16px;
      --background: linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(15, 15, 15, 0.95) 100%);
      backdrop-filter: blur(20px);
    }
    
    .entry-modal ion-content {
      --background: transparent;
    }

    @media (max-width: 768px) {
      .entry-modal {
        --width: 95vw;
        --height: 95vh;
      }
    }

    .entry-modal-content {
      --padding-start: 0;
      --padding-end: 0;
      --padding-top: 0;
      --padding-bottom: 0;
    }

    .modal-form-container {
      padding: 0;
      max-width: none;
    }

    /* Form Sections */
    .form-section {
      background: var(--ion-background-color);
      margin: 0;
      padding: 4px;
      border-bottom: 1px solid var(--ion-color-step-150);
    }

    .form-section:last-of-type {
      border-bottom: none;
    }

    .section-title {
      margin: 0 0 4px 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--ion-color-primary);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .section-title::before {
      content: '';
      width: 4px;
      height: 20px;
      background: var(--ion-color-primary);
      border-radius: 2px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      flex-wrap: wrap;
      gap: 12px;
    }

    /* Form Groups and Items */
    .form-group {
      margin-bottom: 4px;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-item {
      --background: var(--ion-item-background);
      --border-color: transparent;
      --border-width: 0;
      --border-style: none;
      --border-radius: 0;
      --padding-start: 0;
      --padding-end: 0;
      --inner-padding-start: 0;
      --inner-padding-end: 0;
      --min-height: auto;
      margin-bottom: 0;
    }

    .form-item ion-label {
      font-weight: 500;
      color: var(--ion-text-color);
      margin-bottom: 4px;
      opacity: 0.8;
    }

    .form-item ion-input,
    .form-item ion-textarea,
    .form-item ion-select {
      --background: var(--ion-background-color);
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 12px;
      --padding-bottom: 12px;
      font-size: 0.9rem;
      border: 1px solid var(--ion-color-step-200);
      border-radius: 8px;
      margin-top: 8px;
    }
    
    .form-item ion-input:focus,
    .form-item ion-textarea:focus,
    .form-item ion-select:focus {
      border-color: var(--ion-color-primary);
    }

    .required {
      color: var(--ion-color-danger);
      font-weight: 600;
    }

    /* Specific Input Styling */
    .title-input {
      font-weight: 600;
      font-size: 1rem;
    }

    .content-item {
      --min-height: 120px;
    }

    .content-textarea {
      min-height: 120px;
      font-family: 'Georgia', serif;
      line-height: 1.6;
    }

    /* Tags Styling */
    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
      padding: 12px 16px;
      background: var(--ion-item-background);
      border: 1px solid var(--ion-color-step-200);
      border-radius: 8px;
      min-height: 50px;
      align-items: flex-start;
      align-content: flex-start;
    }

    .tag-chip {
      --background: var(--ion-color-primary-tint);
      --color: var(--ion-color-primary-contrast);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tag-chip:hover {
      --background: var(--ion-color-primary);
      transform: scale(1.05);
    }

    /* Image Preview */
    .image-preview {
      margin-top: 12px;
      padding: 12px 16px;
      background: var(--ion-item-background);
      border: 1px solid var(--ion-color-step-200);
      border-radius: 8px;
      text-align: center;
    }

    .image-preview img {
      max-width: 100%;
      max-height: 200px;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    /* Custom Fields Styling */
    .custom-fields-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .custom-field-item {
      background: var(--ion-item-background);
      border: 1px solid var(--ion-color-step-200);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .custom-field-header {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 4px;
    }

    .field-name-item {
      flex: 1;
      margin-bottom: 0;
    }

    .remove-field-btn {
      --padding-start: 8px;
      --padding-end: 8px;
      height: 40px;
      margin-bottom: 0;
    }

    .new-custom-field {
      background: var(--ion-color-step-50);
      border: 2px dashed var(--ion-color-step-300);
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s ease;
    }

    .new-custom-field:hover {
      border-color: var(--ion-color-primary);
      background: var(--ion-color-primary-tint);
    }

    /* Modal Actions */
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      padding: 4px;
      background: var(--ion-toolbar-background);
      border-top: 1px solid var(--ion-color-step-200);
      position: sticky;
      bottom: 0;
      z-index: 10;
    }

    .modal-actions ion-button {
      --padding-start: 20px;
      --padding-end: 20px;
      --height: 44px;
      font-weight: 500;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .form-section {
        padding: 16px;
      }

      .section-header {
        flex-direction: column;
        align-items: stretch;
      }

      .custom-field-header {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }

      .remove-field-btn {
        align-self: flex-end;
        width: fit-content;
      }

      .modal-actions {
        flex-direction: column-reverse;
        gap: 8px;
        padding: 16px;
      }

      .modal-actions ion-button {
        width: 100%;
      }
    }

    /* Focus states */
    .form-item ion-input.has-focus,
    .form-item ion-textarea.has-focus,
    .form-item ion-select.has-focus {
      border-color: var(--ion-color-primary);
      box-shadow: 0 0 0 2px var(--ion-color-primary-tint);
    }

    /* Loading and disabled states */
    .form-item[disabled] {
      opacity: 0.6;
      pointer-events: none;
    }

    /* Dark mode specific adjustments */
    @media (prefers-color-scheme: dark) {
      .form-section {
        background: var(--ion-background-color);
      }
      
      .form-item ion-input,
      .form-item ion-textarea,
      .form-item ion-select {
        --background: var(--ion-item-background);
        border-color: var(--ion-color-step-300);
      }
      
      .tags-container {
        background: var(--ion-item-background);
        border-color: var(--ion-color-step-300);
      }
      
      .image-preview {
        background: var(--ion-item-background);
        border-color: var(--ion-color-step-300);
      }
      
      .custom-field-item {
        background: var(--ion-item-background);
        border-color: var(--ion-color-step-300);
      }
      
      .new-custom-field {
        background: var(--ion-color-step-100);
        border-color: var(--ion-color-step-400);
      }
      
      .new-custom-field:hover {
        background: var(--ion-color-primary-shade);
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

  // Form data
  newCategory = { title: '', icon: '', description: '' };
  editingEntry: Partial<CodexEntry> = {};
  tagInput = '';
  
  // Story roles
  storyRoles = STORY_ROLES;
  
  // Custom fields
  newCustomFieldName = '';
  newCustomFieldValue = '';
  
  headerActions: HeaderAction[] = [];

  constructor() {
    addIcons({
      arrowBack, add, ellipsisVertical, create, trash, save, close,
      search, person, bookmark, pricetag, star
    });
    this.initializeHeaderActions();
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
      tags: entry.tags ? [...entry.tags] : [],
      storyRole: (entry.metadata?.['storyRole'] as StoryRole) || '',
      customFields: entry.metadata?.['customFields'] && Array.isArray(entry.metadata['customFields']) ? [...entry.metadata['customFields']] : [],
      alwaysInclude: entry.alwaysInclude || false
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

  editCategory() {
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

  async createNewEntry() {
    const storyId = this.storyId();
    const categoryId = this.selectedCategoryId();
    if (!storyId || !categoryId) return;

    try {
      // Create a new entry with default values
      const newEntry = {
        title: 'Neuer Eintrag',
        content: '',
        tags: []
      };
      
      const createdEntry = await this.codexService.addEntry(storyId, categoryId, newEntry);
      
      // Directly open the edit dialog for the new entry
      this.selectEntry(createdEntry);
    } catch (error) {
      console.error('Error creating entry:', error);
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
        alwaysInclude: this.editingEntry.alwaysInclude || false,
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
    if (!tag) return;
    
    // Ensure tags array exists
    if (!this.editingEntry.tags) {
      this.editingEntry.tags = [];
    }
    
    if (!this.editingEntry.tags.includes(tag)) {
      this.editingEntry.tags.push(tag);
      this.tagInput = '';
    }
  }

  removeTag(tag: string) {
    if (!this.editingEntry.tags) return;
    
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

  getCustomFields(entry: CodexEntry): CustomField[] {
    const fields = entry.metadata?.['customFields'];
    return Array.isArray(fields) ? fields : [];
  }

  goBack() {
    this.router.navigate(['/stories/editor', this.storyId()]);
  }

  private initializeHeaderActions(): void {
    this.headerActions = [
      {
        icon: 'add',
        label: 'Kategorie',
        action: () => this.showAddCategoryModal.set(true),
        showOnMobile: true,
        showOnDesktop: true
      }
    ];
  }
}