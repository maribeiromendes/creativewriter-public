import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonChip, IonLabel, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { ProseMirrorEditorService, SimpleEditorConfig } from '../../../shared/services/prosemirror-editor.service';
import { EditorView } from 'prosemirror-view';
import { SettingsService } from '../../../core/services/settings.service';
import { BeatAI } from '../../models/beat-ai.interface';
import { SceneContext } from './beat-ai.types';

@Component({
  selector: 'app-beat-ai-prompt-input',
  standalone: true,
  imports: [CommonModule, FormsModule, IonChip, IonLabel, IonIcon],
  templateUrl: './beat-ai-prompt-input.component.html',
  styleUrls: ['./beat-ai-prompt-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BeatAIPromptInputComponent implements OnInit, OnDestroy, AfterViewInit {
  private proseMirrorService = inject(ProseMirrorEditorService);
  private settingsService = inject(SettingsService);

  @Input() beatData!: BeatAI;
  @Input() currentTextColor = '#e0e0e0';
  @Input() selectedScenes: SceneContext[] = [];
  @Input() includeStoryOutline = false;
  @Input() sceneId?: string;

  @Output() promptChange = new EventEmitter<string>();
  @Output() removeSceneContext = new EventEmitter<SceneContext>();
  @Output() toggleStoryOutline = new EventEmitter<boolean>();
  @Output() startEditing = new EventEmitter<void>();

  @ViewChild('promptInput', { static: false }) promptInput!: ElementRef<HTMLDivElement>;

  currentPrompt = '';
  editorView: EditorView | null = null;

  constructor() {
    addIcons({ closeOutline });
  }

  ngOnInit(): void {
    this.currentPrompt = this.beatData.prompt || '';
  }

  ngAfterViewInit(): void {
    if (this.beatData.isEditing || !this.beatData.prompt) {
      this.initializeEditor();
    }
  }

  ngOnDestroy(): void {
    if (this.editorView) {
      this.editorView.destroy();
    }
  }

  private async initializeEditor(): Promise<void> {
    if (!this.promptInput?.nativeElement) {
      return;
    }

    try {
      const config: SimpleEditorConfig = {
        placeholder: 'Beschreibe, was als nächstes in der Geschichte passieren soll...',
        onUpdate: (content: string) => {
          this.currentPrompt = content;
          this.promptChange.emit(content);
        }
      };

      this.editorView = await this.proseMirrorService.createSimpleTextEditor(
        this.promptInput.nativeElement,
        config
      );
    } catch (error) {
      console.error('Failed to initialize ProseMirror editor:', error);
    }
  }

  onRemoveSceneContext(scene: SceneContext, event: Event): void {
    event.stopPropagation();
    this.removeSceneContext.emit(scene);
  }

  onToggleStoryOutline(event: Event): void {
    event.stopPropagation();
    this.toggleStoryOutline.emit(!this.includeStoryOutline);
  }

  onStartEditing(): void {
    this.startEditing.emit();
  }

  getModelDisplayName(model?: string): string {
    if (!model) {
      return '';
    }
    
    // Extract display name from model ID
    const parts = model.split(':');
    if (parts.length > 1) {
      return parts.slice(1).join(':');
    }
    return model;
  }

  focusEditor(): void {
    if (this.editorView) {
      this.editorView.focus();
    }
  }
}