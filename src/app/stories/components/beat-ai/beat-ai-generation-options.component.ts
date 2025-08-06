import { Component, Input, Output, EventEmitter, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoGoogle, globeOutline } from 'ionicons/icons';
import { ModelOption } from '../../../core/models/model.interface';
import { ModelService } from '../../../core/services/model.service';
import { SettingsService } from '../../../core/services/settings.service';
import { BeatTypeOption, WordCountOption } from './beat-ai.types';

@Component({
  selector: 'app-beat-ai-generation-options',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, IonIcon],
  templateUrl: './beat-ai-generation-options.component.html',
  styleUrls: ['./beat-ai-generation-options.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BeatAIGenerationOptionsComponent implements OnInit {
  private modelService = inject(ModelService);
  private settingsService = inject(SettingsService);

  @Input() selectedBeatType: 'story' | 'scene' = 'story';
  @Input() selectedWordCount: number | string = 400;
  @Input() selectedModel = '';
  @Input() isVisible = false;

  @Output() beatTypeChange = new EventEmitter<'story' | 'scene'>();
  @Output() wordCountChange = new EventEmitter<number>();
  @Output() modelChange = new EventEmitter<string>();
  @Output() favoriteToggle = new EventEmitter<{ event: Event; model: ModelOption }>();

  availableModels: ModelOption[] = [];
  favoriteModels: ModelOption[] = [];
  showCustomWordCount = false;
  customWordCount = 400;

  beatTypeOptions: BeatTypeOption[] = [
    {
      value: 'story',
      label: 'Story Beat',
      description: 'Fortsetzung der gesamten Geschichte'
    },
    {
      value: 'scene',
      label: 'Scene Beat', 
      description: 'Fokus auf die aktuelle Szene'
    }
  ];

  wordCountOptions: WordCountOption[] = [
    { value: 200, label: '200 Wörter' },
    { value: 400, label: '400 Wörter' },
    { value: 600, label: '600 Wörter' },
    { value: 800, label: '800 Wörter' },
    { value: 1000, label: '1000 Wörter' },
    { value: 1500, label: '1500 Wörter' },
    { value: 2000, label: '2000 Wörter' },
    { value: 'custom', label: 'Benutzerdefiniert' }
  ];

  constructor() {
    addIcons({ logoGoogle, globeOutline });
  }

  ngOnInit(): void {
    this.loadModels();
    this.loadFavoriteModels();
    this.checkCustomWordCount();
  }

  private loadModels(): void {
    this.modelService.getAvailableModels().subscribe(models => {
      this.availableModels = models;
    });
  }

  private loadFavoriteModels(): void {
    const settings = this.settingsService.getSettings();
    if (settings.favoriteModels) {
      this.favoriteModels = this.availableModels.filter(model =>
        settings.favoriteModels!.includes(model.id)
      );
    }
  }

  private checkCustomWordCount(): void {
    const isPresetValue = this.wordCountOptions.some(option => 
      typeof option.value === 'number' && option.value === this.selectedWordCount
    );
    
    if (!isPresetValue && typeof this.selectedWordCount === 'number') {
      this.showCustomWordCount = true;
      this.customWordCount = this.selectedWordCount;
      this.selectedWordCount = 'custom';
    }
  }

  onBeatTypeChange(): void {
    this.beatTypeChange.emit(this.selectedBeatType);
  }

  onWordCountChange(): void {
    this.showCustomWordCount = this.selectedWordCount === 'custom';
    
    if (typeof this.selectedWordCount === 'number') {
      this.wordCountChange.emit(this.selectedWordCount);
    } else if (this.selectedWordCount === 'custom') {
      this.wordCountChange.emit(this.customWordCount);
    }
  }

  onModelChange(): void {
    this.modelChange.emit(this.selectedModel);
  }

  onFavoriteToggle(event: Event, model: ModelOption): void {
    this.favoriteToggle.emit({ event, model });
  }

  selectFavoriteModel(model: ModelOption): void {
    this.selectedModel = model.id;
    this.onModelChange();
  }

  validateCustomWordCount(): void {
    if (this.customWordCount < 10) {
      this.customWordCount = 10;
    } else if (this.customWordCount > 50000) {
      this.customWordCount = 50000;
    }
    
    if (this.selectedWordCount === 'custom') {
      this.wordCountChange.emit(this.customWordCount);
    }
  }

  getProviderIcon(provider: string): string {
    switch (provider) {
      case 'gemini':
        return 'logo-google';
      case 'openrouter':
        return 'globe-outline';
      default:
        return 'globe-outline';
    }
  }

  getShortModelName(fullName: string): string {
    const parts = fullName.split(' ');
    if (parts.length > 2) {
      return parts.slice(0, 2).join(' ');
    }
    return fullName;
  }

  isFavorite(modelId: string): boolean {
    return this.favoriteModels.some(model => model.id === modelId);
  }

  getActualWordCount(): number {
    if (typeof this.selectedWordCount === 'number') {
      return this.selectedWordCount;
    }
    return this.customWordCount;
  }
}