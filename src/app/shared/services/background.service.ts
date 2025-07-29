import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { SettingsService } from '../../core/services/settings.service';

@Injectable({
  providedIn: 'root'
})
export class BackgroundService {
  private settingsService = inject(SettingsService);

  // Signal for the current background image
  private backgroundImage = signal<string>('none');
  
  // Signal for preview background (for settings page preview)
  private previewBackgroundImage = signal<string | null>(null);

  // Computed background style (uses preview if available, otherwise saved background)
  backgroundStyle = computed(() => {
    const previewImage = this.previewBackgroundImage();
    const savedImage = this.backgroundImage();
    const image = previewImage !== null ? previewImage : savedImage;
    
    if (image === 'none' || !image) {
      return {
        backgroundImage: 'none',
        backgroundColor: '#1a1a1a'
      };
    }
    
    return {
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('assets/backgrounds/${image}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      backgroundColor: '#1a1a1a'
    };
  });

  constructor() {
    // Load initial background from settings
    const settings = this.settingsService.getSettings();
    this.backgroundImage.set(settings.appearance.backgroundImage);

    // Subscribe to settings changes
    this.settingsService.settings$.subscribe(settings => {
      this.backgroundImage.set(settings.appearance.backgroundImage);
    });

    // Apply background to body element when it changes
    effect(() => {
      this.applyBackgroundToBody();
    });
  }

  private applyBackgroundToBody(): void {
    const style = this.backgroundStyle();
    const body = document.body;
    
    // Apply styles to body
    if (style.backgroundImage === 'none') {
      body.style.backgroundImage = 'none';
      body.style.backgroundColor = style.backgroundColor!;
      body.style.backgroundSize = '';
      body.style.backgroundPosition = '';
      body.style.backgroundRepeat = '';
      body.style.backgroundAttachment = '';
    } else {
      body.style.backgroundImage = style.backgroundImage!;
      body.style.backgroundSize = style.backgroundSize!;
      body.style.backgroundPosition = style.backgroundPosition!;
      body.style.backgroundRepeat = style.backgroundRepeat!;
      body.style.backgroundAttachment = style.backgroundAttachment!;
      body.style.backgroundColor = style.backgroundColor!;
    }
  }

  // Get current background image filename
  getCurrentBackground(): string {
    return this.backgroundImage();
  }

  // Set new background image (saves to settings)
  setBackground(filename: string): void {
    this.settingsService.updateAppearanceSettings({
      backgroundImage: filename
    });
  }

  // Set preview background (temporary, for settings preview)
  setPreviewBackground(filename: string | null): void {
    this.previewBackgroundImage.set(filename);
  }

  // Clear preview background (returns to saved background)
  clearPreviewBackground(): void {
    this.previewBackgroundImage.set(null);
  }
}