import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppHeaderComponent } from './components/app-header.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    AppHeaderComponent
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,  
    FormsModule,
    HttpClientModule,
    AppHeaderComponent
  ]
})
export class SharedModule { }