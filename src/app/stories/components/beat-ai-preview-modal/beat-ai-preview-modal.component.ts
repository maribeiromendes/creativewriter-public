import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CodeEditor } from '@acrodata/code-editor';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { xml } from '@codemirror/lang-xml';

@Component({
  selector: 'app-beat-ai-preview-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CodeEditor],
  templateUrl: './beat-ai-preview-modal.component.html',
  styleUrls: ['./beat-ai-preview-modal.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class BeatAIPreviewModalComponent {
  @Input() isVisible = false;
  @Input() content = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() generateContent = new EventEmitter<void>();
  @Output() copyContent = new EventEmitter<void>();

  editorExtensions: Extension[] = [
    EditorView.lineWrapping,
    xml()
  ];

  onClose(): void {
    this.closeModal.emit();
  }

  onGenerate(): void {
    this.closeModal.emit();
    this.generateContent.emit();
  }

  onCopy(): void {
    this.copyContent.emit();
  }
}