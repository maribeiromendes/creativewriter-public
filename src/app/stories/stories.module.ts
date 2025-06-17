import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoriesRoutingModule } from './stories-routing.module';
import { SharedModule } from '../shared/shared.module';
import { StoryListComponent } from './components/story-list.component';
import { StoryEditorComponent } from './components/story-editor.component';
import { BeatAIComponent } from './components/beat-ai.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    StoriesRoutingModule,
    StoryListComponent,
    StoryEditorComponent,
    BeatAIComponent
  ]
})
export class StoriesModule { }