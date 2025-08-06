import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-beat-ai-generation-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './beat-ai-generation-status.component.html',
  styleUrls: ['./beat-ai-generation-status.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BeatAIGenerationStatusComponent {
  @Input() isGenerating = false;

  @Output() stopGeneration = new EventEmitter<void>();

  onStopGeneration(event: Event): void {
    event.stopPropagation();
    this.stopGeneration.emit();
  }
}