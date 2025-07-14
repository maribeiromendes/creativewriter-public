import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CodexAwarenessDirective } from './directives/codex-awareness.directive';
import { SimpleCodexAwarenessDirective } from './directives/simple-codex-awareness.directive';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    CodexAwarenessDirective,
    SimpleCodexAwarenessDirective
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    CodexAwarenessDirective,
    SimpleCodexAwarenessDirective
  ]
})
export class SharedModule { }