import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StoryEditorComponent } from './components/story-editor.component';
import { StorySettingsComponent } from './components/story-settings.component';

const routes: Routes = [
  {
    path: 'editor/:id',
    component: StoryEditorComponent
  },
  {
    path: 'settings/:id',
    component: StorySettingsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StoriesRoutingModule { }