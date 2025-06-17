import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StoryEditorComponent } from './components/story-editor.component';

const routes: Routes = [
  {
    path: 'editor/:id',
    component: StoryEditorComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StoriesRoutingModule { }