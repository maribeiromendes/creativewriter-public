import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModelOption } from '../../core/models/model.interface';

@Component({
  selector: 'app-searchable-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="searchable-dropdown" [class.disabled]="disabled">
      <div class="dropdown-container" [class.open]="isOpen">
        <input
          #searchInput
          type="text"
          class="dropdown-input"
          [value]="displayValue"
          (input)="onSearchInput($event)"
          (focus)="openDropdown()"
          (blur)="onBlur()"
          [placeholder]="placeholder"
          [disabled]="disabled"
          autocomplete="off"
        />
        <button
          type="button"
          class="dropdown-toggle"
          (click)="toggleDropdown()"
          [disabled]="disabled"
        >
          <span class="arrow" [class.up]="isOpen">▼</span>
        </button>
        
        <div class="dropdown-menu" *ngIf="isOpen && !disabled">
          <div class="dropdown-info" *ngIf="filteredOptions.length === 0 && searchTerm">
            Keine Modelle gefunden für "{{ searchTerm }}"
          </div>
          <div class="dropdown-info" *ngIf="options.length === 0">
            {{ loadingMessage || 'Keine Modelle verfügbar' }}
          </div>
          
          <div 
            class="dropdown-option"
            *ngFor="let option of filteredOptions; trackBy: trackByOptionId"
            (mousedown)="selectOption(option)"
            [class.selected]="option.id === selectedValue"
          >
            <div class="option-label">{{ option.label }}</div>
            <div class="option-details" *ngIf="option.costInputEur || option.costOutputEur">
              <span class="cost-info" *ngIf="option.provider === 'openrouter'">
                Input: {{ option.costInputEur }}/1M • Output: {{ option.costOutputEur }}/1M
              </span>
              <span class="cost-info" *ngIf="option.provider === 'replicate'">
                ≈{{ option.costInputEur }}/1M tokens
              </span>
              <span class="context-info" *ngIf="option.contextLength">
                {{ formatContextLength(option.contextLength) }} context
              </span>
            </div>
            <div class="option-description" *ngIf="option.description">
              {{ truncateDescription(option.description) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .searchable-dropdown {
      position: relative;
      width: 100%;
    }
    
    .searchable-dropdown.disabled {
      opacity: 0.5;
    }
    
    .dropdown-container {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .dropdown-input {
      flex: 1;
      padding: 0.75rem 2.5rem 0.75rem 0.75rem;
      background: #1a1a1a;
      border: 1px solid #404040;
      border-radius: 6px;
      color: #e0e0e0;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.3s;
    }
    
    .dropdown-input:focus {
      border-color: #0d6efd;
      box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
    }
    
    .dropdown-input:disabled {
      cursor: not-allowed;
      background: #242424;
    }
    
    .dropdown-toggle {
      position: absolute;
      right: 0.5rem;
      background: none;
      border: none;
      color: #adb5bd;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .dropdown-toggle:disabled {
      cursor: not-allowed;
    }
    
    .arrow {
      transition: transform 0.2s;
      font-size: 0.8rem;
    }
    
    .arrow.up {
      transform: rotate(180deg);
    }
    
    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #2d2d2d;
      border: 1px solid #404040;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
      margin-top: 0.25rem;
    }
    
    .dropdown-info {
      padding: 1rem;
      color: #6c757d;
      text-align: center;
      font-style: italic;
    }
    
    .dropdown-option {
      padding: 0.75rem;
      cursor: pointer;
      border-bottom: 1px solid #404040;
      transition: background-color 0.2s;
    }
    
    .dropdown-option:last-child {
      border-bottom: none;
    }
    
    .dropdown-option:hover {
      background: #383838;
    }
    
    .dropdown-option.selected {
      background: #0d6efd;
      color: white;
    }
    
    .dropdown-option.selected .option-details,
    .dropdown-option.selected .option-description {
      color: rgba(255, 255, 255, 0.8);
    }
    
    .option-label {
      font-weight: 500;
      margin-bottom: 0.25rem;
      color: #f8f9fa;
    }
    
    .option-details {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      color: #adb5bd;
      margin-bottom: 0.25rem;
    }
    
    .cost-info {
      color: #28a745;
      font-weight: 500;
    }
    
    .context-info {
      color: #6c757d;
    }
    
    .option-description {
      font-size: 0.8rem;
      color: #6c757d;
      line-height: 1.3;
    }
    
    /* Custom scrollbar for dropdown */
    .dropdown-menu::-webkit-scrollbar {
      width: 6px;
    }
    
    .dropdown-menu::-webkit-scrollbar-track {
      background: #1a1a1a;
    }
    
    .dropdown-menu::-webkit-scrollbar-thumb {
      background: #6c757d;
      border-radius: 3px;
    }
    
    .dropdown-menu::-webkit-scrollbar-thumb:hover {
      background: #adb5bd;
    }
  `]
})
export class SearchableDropdownComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  
  @Input() options: ModelOption[] = [];
  @Input() selectedValue: string = '';
  @Input() placeholder: string = 'Modell auswählen...';
  @Input() disabled: boolean = false;
  @Input() loadingMessage: string = '';
  
  @Output() selectionChange = new EventEmitter<string>();
  
  isOpen = false;
  searchTerm = '';
  filteredOptions: ModelOption[] = [];
  displayValue = '';
  
  private clickListener?: (event: MouseEvent) => void;
  
  ngOnInit(): void {
    this.updateFilteredOptions();
    this.updateDisplayValue();
    
    // Add global click listener to close dropdown when clicking outside
    this.clickListener = this.handleGlobalClick.bind(this);
    document.addEventListener('click', this.clickListener);
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // React to changes in selectedValue or options
    if (changes['selectedValue'] || changes['options']) {
      this.updateDisplayValue();
      this.updateFilteredOptions();
    }
  }
  
  ngOnDestroy(): void {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
    }
  }
  
  private handleGlobalClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.searchable-dropdown')) {
      this.isOpen = false;
    }
  }
  
  openDropdown(): void {
    if (!this.disabled) {
      this.isOpen = true;
      this.updateFilteredOptions();
    }
  }
  
  toggleDropdown(): void {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.updateFilteredOptions();
        // Focus input when opening
        setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
      }
    }
  }
  
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.displayValue = target.value;
    this.updateFilteredOptions();
    this.isOpen = true;
  }
  
  onBlur(): void {
    // Delay closing to allow for option selection
    setTimeout(() => {
      if (!this.isOpen) return;
      
      // If no exact match found, revert to selected value
      const exactMatch = this.options.find(opt => 
        opt.label.toLowerCase() === this.searchTerm.toLowerCase() ||
        opt.id === this.searchTerm
      );
      
      if (!exactMatch) {
        this.updateDisplayValue();
        this.searchTerm = '';
      }
      
      this.isOpen = false;
    }, 200);
  }
  
  selectOption(option: ModelOption): void {
    this.selectedValue = option.id;
    this.searchTerm = '';
    this.updateDisplayValue();
    this.updateFilteredOptions();
    this.isOpen = false;
    this.selectionChange.emit(option.id);
  }
  
  private updateFilteredOptions(): void {
    if (!this.searchTerm.trim()) {
      this.filteredOptions = [...this.options];
      return;
    }
    
    const term = this.searchTerm.toLowerCase();
    this.filteredOptions = this.options.filter(option =>
      option.label.toLowerCase().includes(term) ||
      option.id.toLowerCase().includes(term) ||
      option.description?.toLowerCase().includes(term)
    );
  }
  
  private updateDisplayValue(): void {
    if (!this.selectedValue) {
      this.displayValue = '';
      return;
    }
    
    const selectedOption = this.options.find(opt => opt.id === this.selectedValue);
    if (selectedOption) {
      this.displayValue = selectedOption.label;
    } else if (this.selectedValue && this.options.length === 0) {
      // Show the raw value if options aren't loaded yet but we have a selection
      this.displayValue = this.selectedValue;
    } else {
      // Model not found in current options (might be deprecated)
      this.displayValue = `${this.selectedValue} (nicht verfügbar)`;
    }
  }
  
  trackByOptionId(index: number, option: ModelOption): string {
    return option.id;
  }
  
  formatContextLength(length: number): string {
    if (length >= 1000000) {
      return `${(length / 1000000).toFixed(1)}M`;
    } else if (length >= 1000) {
      return `${(length / 1000).toFixed(0)}K`;
    }
    return length.toString();
  }
  
  truncateDescription(description: string): string {
    if (description.length <= 100) return description;
    return description.substring(0, 97) + '...';
  }
}