import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonChip, IonLabel, IonIcon, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, addCircleOutline } from 'ionicons/icons';
import { SceneContext } from './beat-ai.types';

@Component({
  selector: 'app-beat-ai-context-selector',
  standalone: true,
  imports: [CommonModule, IonChip, IonLabel, IonIcon, IonButton],
  templateUrl: './beat-ai-context-selector.component.html',
  styleUrls: ['./beat-ai-context-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BeatAIContextSelectorComponent {
  @Input() selectedScenes: SceneContext[] = [];
  @Input() includeStoryOutline = false;
  @Input() sceneId?: string;

  @Output() removeSceneContext = new EventEmitter<SceneContext>();
  @Output() toggleStoryOutline = new EventEmitter<boolean>();
  @Output() showSceneSelector = new EventEmitter<void>();

  constructor() {
    addIcons({ closeOutline, addCircleOutline });
  }

  onRemoveSceneContext(scene: SceneContext, event: Event): void {
    event.stopPropagation();
    this.removeSceneContext.emit(scene);
  }

  onToggleStoryOutline(event: Event): void {
    event.stopPropagation();
    this.toggleStoryOutline.emit(!this.includeStoryOutline);
  }

  onShowSceneSelector(event: Event): void {
    event.stopPropagation();
    this.showSceneSelector.emit();
  }
}