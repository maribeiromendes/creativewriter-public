import { Routes } from '@angular/router';
import { StoryListComponent } from './stories/components/story-list.component';

export const routes: Routes = [
  {
    path: '',
    component: StoryListComponent
  },
  {
    path: 'stories',
    loadChildren: () => import('./stories/stories.module').then(m => m.StoriesModule)
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
