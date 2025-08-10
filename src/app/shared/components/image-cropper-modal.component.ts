import { Component, Input, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonContent, IonIcon, ModalController, IonFooter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, checkmarkOutline, cropOutline } from 'ionicons/icons';
import { ImageCropperComponent, ImageCroppedEvent, ImageTransform, LoadedImage } from 'ngx-image-cropper';

@Component({
  selector: 'app-image-cropper-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonIcon, IonFooter,
    ImageCropperComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Bild zuschneiden</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="cropper-content">
      <div class="cropper-wrapper">
        <image-cropper
          *ngIf="showCropper"
          [imageBase64]="imageBase64"
          [maintainAspectRatio]="true"
          [aspectRatio]="aspectRatio"
          [cropperMinWidth]="100"
          [cropperMinHeight]="100"
          [roundCropper]="false"
          [canvasRotation]="canvasRotation"
          [transform]="transform"
          [alignImage]="'left'"
          [backgroundColor]="'#000'"
          [format]="'png'"
          (imageCropped)="imageCropped($event)"
          (imageLoaded)="imageLoaded($event)"
          (cropperReady)="cropperReady()"
          (loadImageFailed)="loadImageFailed()">
        </image-cropper>
      </div>

      <div class="aspect-ratio-buttons">
        <ion-button 
          fill="outline" 
          size="small" 
          [color]="aspectRatio === 1 ? 'primary' : 'medium'"
          (click)="setAspectRatio(1)">
          1:1
        </ion-button>
        <ion-button 
          fill="outline" 
          size="small" 
          [color]="aspectRatio === 3/4 ? 'primary' : 'medium'"
          (click)="setAspectRatio(3/4)">
          3:4
        </ion-button>
        <ion-button 
          fill="outline" 
          size="small" 
          [color]="aspectRatio === 2/3 ? 'primary' : 'medium'"
          (click)="setAspectRatio(2/3)">
          2:3
        </ion-button>
        <ion-button 
          fill="outline" 
          size="small" 
          [color]="aspectRatio === 9/16 ? 'primary' : 'medium'"
          (click)="setAspectRatio(9/16)">
          9:16
        </ion-button>
        <ion-button 
          fill="outline" 
          size="small" 
          [color]="aspectRatio === 16/9 ? 'primary' : 'medium'"
          (click)="setAspectRatio(16/9)">
          16:9
        </ion-button>
        <ion-button 
          fill="outline" 
          size="small" 
          [color]="aspectRatio === 0 ? 'primary' : 'medium'"
          (click)="setAspectRatio(0)">
          Frei
        </ion-button>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            Cancel
          </ion-button>
          <ion-button (click)="confirmCrop()" [strong]="true">
            <ion-icon name="checkmark-outline" slot="start"></ion-icon>
            Crop
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    .cropper-content {
      --background: #1a1a1a;
    }

    .cropper-wrapper {
      height: calc(100% - 60px);
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      position: relative;
    }

    :host ::ng-deep image-cropper {
      max-height: 100%;
      max-width: 100%;
    }

    .aspect-ratio-buttons {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      background: rgba(0, 0, 0, 0.8);
      padding: 8px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }

    ion-footer {
      background: rgba(30, 30, 30, 0.95);
      backdrop-filter: blur(10px);
    }

    ion-footer ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }
  `]
})
export class ImageCropperModalComponent implements OnInit {
  @Input() imageBase64!: string;
  @Input() initialAspectRatio: number = 3/4; // Default portrait aspect ratio
  @ViewChild(ImageCropperComponent) imageCropper!: ImageCropperComponent;

  croppedImage = '';
  canvasRotation = 0;
  transform: ImageTransform = {};
  aspectRatio = 3/4;
  isReady = false;
  showCropper = false;

  private modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ closeOutline, checkmarkOutline, cropOutline });
  }

  ngOnInit() {
    this.aspectRatio = this.initialAspectRatio;
    // Show cropper after a short delay to ensure proper initialization
    setTimeout(() => {
      this.showCropper = true;
    }, 100);
  }

  imageCropped(event: ImageCroppedEvent) {
    console.log('Image cropped event:', event);
    // Use base64 if available, or convert blob to base64
    if (event.base64) {
      this.croppedImage = event.base64;
    } else if (event.blob) {
      // Convert blob to base64 for compatibility with image-upload component
      const reader = new FileReader();
      reader.onload = () => {
        this.croppedImage = reader.result as string;
      };
      reader.readAsDataURL(event.blob);
    } else if (event.objectUrl) {
      // Fallback to objectUrl if neither base64 nor blob is available
      this.croppedImage = event.objectUrl;
    }
  }

  imageLoaded(image: LoadedImage) {
    console.log('Image loaded:', image);
    this.isReady = true;
    // Trigger initial crop
    setTimeout(() => {
      const event = new Event('crop');
      document.querySelector('image-cropper')?.dispatchEvent(event);
    }, 200);
  }

  cropperReady() {
    console.log('Cropper ready');
    this.isReady = true;
  }

  loadImageFailed() {
    console.error('Image loading failed');
    this.dismiss();
  }

  setAspectRatio(ratio: number) {
    this.aspectRatio = ratio;
  }

  confirmCrop() {
    console.log('Confirm crop clicked, croppedImage:', this.croppedImage);
    
    // If no cropped image yet, try to get it from the cropper
    if (!this.croppedImage && this.imageCropper) {
      console.log('Trying to crop manually');
      const event = this.imageCropper.crop();
      console.log('Manual crop event:', event);
      if (event?.base64) {
        this.croppedImage = event.base64;
      } else if (event?.blob) {
        // Convert blob to base64 for compatibility
        const reader = new FileReader();
        reader.onload = () => {
          this.croppedImage = reader.result as string;
          this.modalCtrl.dismiss({
            croppedImage: this.croppedImage
          });
        };
        reader.readAsDataURL(event.blob);
        return; // Exit early to wait for FileReader
      } else if (event?.objectUrl) {
        this.croppedImage = event.objectUrl;
      }
    }
    
    if (this.croppedImage) {
      this.modalCtrl.dismiss({
        croppedImage: this.croppedImage
      });
    } else {
      console.error('No cropped image available');
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}