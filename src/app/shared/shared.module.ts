import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppHeaderComponent } from './components/app-header.component';
import { ImageUploadComponent } from './components/image-upload.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    AppHeaderComponent,
    ImageUploadComponent
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,  
    FormsModule,
    HttpClientModule,
    AppHeaderComponent,
    ImageUploadComponent
  ]
})
export class SharedModule { }