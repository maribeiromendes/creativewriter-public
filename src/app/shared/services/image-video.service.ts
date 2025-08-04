import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ImageClickEvent {
  imageElement: HTMLImageElement;
  imageId: string | null;
  position: { x: number; y: number };
}

@Injectable({
  providedIn: 'root'
})
export class ImageVideoService {
  // Subject for image click events
  public imageClicked$ = new Subject<ImageClickEvent>();

  /**
   * Initialize image click listeners for a container element
   */
  initializeImageClickHandlers(container: HTMLElement): void {
    // Remove any existing listeners first
    this.removeImageClickHandlers(container);

    // Add click event listener to the container (event delegation)
    container.addEventListener('click', this.handleImageClick);
  }

  /**
   * Remove image click listeners from a container element
   */
  removeImageClickHandlers(container: HTMLElement): void {
    container.removeEventListener('click', this.handleImageClick);
  }

  /**
   * Handle click events on images
   */
  private handleImageClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    
    // Check if the clicked element is an image
    if (target.tagName.toLowerCase() === 'img') {
      const imageElement = target as HTMLImageElement;
      
      // Extract image ID from various possible sources
      const imageId = this.extractImageId(imageElement);
      
      // Get click position for modal positioning
      const rect = imageElement.getBoundingClientRect();
      const position = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      // Emit the image click event
      this.imageClicked$.next({
        imageElement,
        imageId,
        position
      });

      // Prevent default behavior
      event.preventDefault();
      event.stopPropagation();
    }
  };

  /**
   * Extract image ID from various possible sources
   */
  private extractImageId(imageElement: HTMLImageElement): string | null {
    // Try to extract ID from data attributes
    const dataId = imageElement.getAttribute('data-image-id');
    if (dataId) {
      return dataId;
    }

    // Try to extract ID from CSS classes
    const classes = imageElement.className;
    const idMatch = classes.match(/image-id-([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      return idMatch[1];
    }

    // For images without ID, return null - the story editor will generate one on click
    return null;
  }

  /**
   * Add image ID to an image element for tracking
   */
  addImageIdToElement(imageElement: HTMLImageElement, imageId: string): void {
    // Add as data attribute
    imageElement.setAttribute('data-image-id', imageId);
    
    // Add as CSS class for additional identification
    const existingClasses = imageElement.className;
    const newClasses = `${existingClasses} image-id-${imageId}`.trim();
    imageElement.className = newClasses;
  }

  /**
   * Check if an image has a video indicator
   */
  addVideoIndicator(imageElement: HTMLImageElement): void {
    // Add visual indicator that this image has an associated video
    imageElement.classList.add('has-video');
    imageElement.style.cursor = 'pointer';
    
    // Add title attribute for user guidance
    const currentTitle = imageElement.title;
    const videoTitle = 'Klicken Sie um das zugehörige Video anzusehen';
    imageElement.title = currentTitle ? `${currentTitle} - ${videoTitle}` : videoTitle;
  }

  /**
   * Remove video indicator from an image
   */
  removeVideoIndicator(imageElement: HTMLImageElement): void {
    imageElement.classList.remove('has-video');
    imageElement.style.cursor = '';
    
    // Remove video-related title
    const currentTitle = imageElement.title;
    if (currentTitle && currentTitle.includes('Klicken Sie um das zugehörige Video anzusehen')) {
      imageElement.title = currentTitle.replace(/ - Klicken Sie um das zugehörige Video anzusehen/, '');
    }
  }

  /**
   * Cleanup method to remove all listeners
   */
  cleanup(): void {
    // This will be called when the service is destroyed
    // Individual containers should call removeImageClickHandlers before being destroyed
  }
}