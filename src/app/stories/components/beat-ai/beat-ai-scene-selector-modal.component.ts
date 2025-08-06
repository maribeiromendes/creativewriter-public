import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonModal, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButtons, 
  IonButton, 
  IonIcon, 
  IonContent, 
  IonSearchbar, 
  IonList, 
  IonItem, 
  IonItemDivider, 
  IonLabel, 
  IonCheckbox 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { Story, Scene, Chapter } from '../../models/story.interface';
import { SceneContext } from './beat-ai.types';

@Component({
  selector: 'app-beat-ai-scene-selector-modal',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonModal, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonButtons, 
    IonButton, 
    IonIcon, 
    IonContent, 
    IonSearchbar, 
    IonList, 
    IonItem, 
    IonItemDivider, 
    IonLabel, 
    IonCheckbox
  ],
  templateUrl: './beat-ai-scene-selector-modal.component.html',
  styleUrls: ['./beat-ai-scene-selector-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BeatAISceneSelectorModalComponent {
  @Input() isOpen = false;
  @Input() story?: Story;
  @Input() selectedScenes: SceneContext[] = [];

  @Output() modalClose = new EventEmitter<void>();
  @Output() sceneToggle = new EventEmitter<{ chapterId: string; sceneId: string }>();

  sceneSearchTerm = '';

  constructor() {
    addIcons({ closeOutline });
  }

  onModalClose(): void {
    this.modalClose.emit();
  }

  onSceneToggle(chapterId: string, sceneId: string): void {
    this.sceneToggle.emit({ chapterId, sceneId });
  }

  isSceneSelected(sceneId: string): boolean {
    return this.selectedScenes.some(s => s.sceneId === sceneId);
  }

  getFilteredScenes(chapter: Chapter): Scene[] {
    if (!this.sceneSearchTerm) return chapter.scenes;
    
    const searchLower = this.sceneSearchTerm.toLowerCase();
    return chapter.scenes.filter(scene => 
      scene.title.toLowerCase().includes(searchLower) ||
      scene.content.toLowerCase().includes(searchLower)
    );
  }

  getScenePreview(scene: Scene): string {
    const cleanText = this.extractFullTextFromScene(scene);
    return cleanText.substring(0, 100) + (cleanText.length > 100 ? '...' : '');
  }

  private extractFullTextFromScene(scene: Scene): string {
    if (!scene.content) return '';
    
    try {
      const parsedContent = JSON.parse(scene.content);
      if (parsedContent.type === 'doc' && parsedContent.content) {
        return this.extractTextFromProseMirrorNodes(parsedContent.content);
      }
    } catch {
      // If it's not valid JSON, treat as plain text
      return scene.content;
    }
    
    return scene.content;
  }

  private extractTextFromProseMirrorNodes(nodes: unknown[]): string {
    let text = '';
    for (const node of nodes) {
      const nodeObj = node as { type?: string; content?: unknown[] };
      if (nodeObj.type === 'paragraph' || nodeObj.type === 'heading') {
        if (nodeObj.content) {
          for (const textNode of nodeObj.content) {
            const textNodeObj = textNode as { type?: string; text?: string };
            if (textNodeObj.type === 'text') {
              text += (textNodeObj.text || '') + ' ';
            }
          }
        }
        text += '\n';
      }
    }
    return text.trim();
  }
}