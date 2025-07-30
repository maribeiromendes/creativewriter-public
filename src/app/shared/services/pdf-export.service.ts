import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BackgroundService } from './background.service';
import { SyncedCustomBackgroundService } from './synced-custom-background.service';
import { Story } from '../../stories/models/story.interface';

interface PDFExportOptions {
  filename?: string;
  includeBackground?: boolean;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PDFExportService {
  private backgroundService = inject(BackgroundService);
  private customBackgroundService = inject(SyncedCustomBackgroundService);

  async exportStoryToPDF(story: Story, options: PDFExportOptions = {}): Promise<void> {
    const defaultOptions: Required<PDFExportOptions> = {
      filename: `${story.title || 'Story'}.pdf`,
      includeBackground: true,
      format: 'a4',
      orientation: 'portrait',
      margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    };

    const config = { ...defaultOptions, ...options };

    try {
      // Create a temporary container for PDF generation
      const container = await this.createPDFContainer(story, config);
      
      // Generate PDF from the container
      await this.generatePDFFromContainer(container, config);
      
      // Clean up
      document.body.removeChild(container);
      
    } catch (error) {
      console.error('Error exporting story to PDF:', error);
      throw new Error('Failed to export story to PDF');
    }
  }

  private async createPDFContainer(story: Story, options: Required<PDFExportOptions>): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm'; // A4 width
    container.style.minHeight = '297mm'; // A4 height
    container.style.boxSizing = 'border-box';
    container.style.fontFamily = 'Georgia, serif';
    container.style.fontSize = '12pt';
    container.style.lineHeight = '1.6';
    container.style.color = '#000000';
    
    // Apply background if enabled
    await this.applyBackgroundToContainer(container, options);

    // Create content wrapper for better visibility over background
    const contentWrapper = document.createElement('div');
    if (options.includeBackground) {
      contentWrapper.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
      contentWrapper.style.padding = '30px';
      contentWrapper.style.margin = '20mm';
      contentWrapper.style.borderRadius = '10px';
      contentWrapper.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
      contentWrapper.style.backdropFilter = 'blur(5px)';
    } else {
      contentWrapper.style.backgroundColor = '#ffffff';
      contentWrapper.style.padding = `${options.margins.top}mm ${options.margins.right}mm ${options.margins.bottom}mm ${options.margins.left}mm`;
    }

    // Add story content to wrapper
    this.addStoryContent(contentWrapper, story);
    container.appendChild(contentWrapper);

    // Append to body for rendering
    document.body.appendChild(container);
    
    // Wait for images to load
    await this.waitForImages(container);
    
    return container;
  }

  private async applyBackgroundToContainer(container: HTMLElement, options: Required<PDFExportOptions>): Promise<void> {
    // Set transparent background for container - contentWrapper will handle visibility
    container.style.backgroundColor = 'transparent';
    container.style.color = '#000000';
  }

  private addStoryContent(container: HTMLElement, story: Story): void {
    // Add title
    const titleElement = document.createElement('h1');
    titleElement.textContent = story.title;
    titleElement.style.textAlign = 'center';
    titleElement.style.marginBottom = '30px';
    titleElement.style.fontSize = '24pt';
    titleElement.style.fontWeight = 'bold';
    container.appendChild(titleElement);

    // Add chapters and scenes
    story.chapters.forEach((chapter, chapterIndex) => {
      // Add chapter title
      const chapterElement = document.createElement('h2');
      chapterElement.textContent = `${chapter.title}`;
      chapterElement.style.marginTop = chapterIndex === 0 ? '0' : '40px';
      chapterElement.style.marginBottom = '20px';
      chapterElement.style.fontSize = '18pt';
      chapterElement.style.fontWeight = 'bold';
      chapterElement.style.pageBreakBefore = chapterIndex === 0 ? 'auto' : 'always';
      container.appendChild(chapterElement);

      // Add scenes
      chapter.scenes.forEach((scene, sceneIndex) => {
        // Add scene title
        if (scene.title) {
          const sceneElement = document.createElement('h3');
          sceneElement.textContent = scene.title;
          sceneElement.style.marginTop = sceneIndex === 0 ? '0' : '30px';
          sceneElement.style.marginBottom = '15px';
          sceneElement.style.fontSize = '14pt';
          sceneElement.style.fontWeight = 'bold';
          container.appendChild(sceneElement);
        }

        // Add scene content
        if (scene.content) {
          const contentContainer = document.createElement('div');
          contentContainer.style.marginBottom = '20px';
          
          // Parse HTML content and clean it for PDF
          const cleanContent = this.cleanContentForPDF(scene.content);
          contentContainer.innerHTML = cleanContent;
          
          container.appendChild(contentContainer);
        }
      });
    });
  }

  private cleanContentForPDF(htmlContent: string): string {
    // Create a temporary element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    // Remove Beat AI components and other interactive elements
    const beatAIElements = tempDiv.querySelectorAll('.beat-ai-wrapper, .beat-ai-container');
    beatAIElements.forEach(element => element.remove());

    // Clean up paragraph styling
    const paragraphs = tempDiv.querySelectorAll('p');
    paragraphs.forEach(p => {
      p.style.textIndent = '2em';
      p.style.marginBottom = '1em';
      p.style.lineHeight = '1.6';
      p.style.color = 'inherit';
    });

    // Handle images - ensure they fit within page width
    const images = tempDiv.querySelectorAll('img');
    images.forEach(img => {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '1em auto';
    });

    return tempDiv.innerHTML;
  }

  private async convertBlobToBase64(blobUrl: string): Promise<string> {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting blob to base64:', error);
      return '';
    }
  }

  private async waitForImages(container: HTMLElement): Promise<void> {
    const images = container.querySelectorAll('img');
    if (images.length === 0) return;

    const imagePromises = Array.from(images).map(img => {
      return new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Continue even if image fails to load
        }
      });
    });

    await Promise.all(imagePromises);
    
    // Wait a bit more for any async background loading
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async generatePDFFromContainer(
    container: HTMLElement, 
    options: Required<PDFExportOptions>
  ): Promise<void> {
    try {
      // Configure html2canvas options for better quality and background handling
      const canvas = await html2canvas(container, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff', // Always use white background to ensure text visibility
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: true, // Better support for complex content
        imageTimeout: 15000, // Allow more time for images to load
        removeContainer: true
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: options.orientation,
        unit: 'mm',
        format: options.format
      });

      // Calculate dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // Calculate scale to fit content within page
      const ratio = Math.min(pdfWidth / canvasWidth * 72 / 96, pdfHeight / canvasHeight * 72 / 96);
      const scaledWidth = canvasWidth * ratio;
      const scaledHeight = canvasHeight * ratio;

      // Center content on page
      const xOffset = (pdfWidth - scaledWidth) / 2;
      const yOffset = (pdfHeight - scaledHeight) / 2;

      // Add background image first if enabled
      if (options.includeBackground) {
        await this.addBackgroundToPDF(pdf, pdfWidth, pdfHeight);
      }

      // Convert canvas to image data
      const imgData = canvas.toDataURL('image/png', 1.0);

      // Check if content fits on one page
      if (scaledHeight <= pdfHeight) {
        // Single page
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, scaledWidth, scaledHeight);
      } else {
        // Multiple pages needed
        let currentY = 0;
        let pageNumber = 0;

        while (currentY < canvasHeight) {
          if (pageNumber > 0) {
            pdf.addPage();
            // Add background to each new page
            if (options.includeBackground) {
              await this.addBackgroundToPDF(pdf, pdfWidth, pdfHeight);
            }
          }

          const remainingHeight = canvasHeight - currentY;
          const pageCanvasHeight = Math.min(canvasHeight / ratio, pdfHeight);
          const sourceHeight = Math.min(remainingHeight, pageCanvasHeight / ratio);

          // Create canvas for this page
          const pageCanvas = document.createElement('canvas');
          const pageCtx = pageCanvas.getContext('2d')!;
          pageCanvas.width = canvasWidth;
          pageCanvas.height = sourceHeight * (canvasWidth / container.scrollWidth);

          // Draw portion of original canvas
          pageCtx.drawImage(
            canvas,
            0, currentY * (canvasWidth / container.scrollWidth),
            canvasWidth, sourceHeight * (canvasWidth / container.scrollWidth),
            0, 0,
            canvasWidth, sourceHeight * (canvasWidth / container.scrollWidth)
          );

          const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
          const pageScaledHeight = sourceHeight * ratio;

          pdf.addImage(pageImgData, 'PNG', xOffset, yOffset, scaledWidth, pageScaledHeight);

          currentY += sourceHeight;
          pageNumber++;
        }
      }

      // Save the PDF
      pdf.save(options.filename);
      
    } catch (error) {
      console.error('Error generating PDF from container:', error);
      throw error;
    }
  }

  private async addBackgroundToPDF(pdf: any, pdfWidth: number, pdfHeight: number): Promise<void> {
    const currentBackground = this.backgroundService.getCurrentBackground();
    
    if (currentBackground === 'none' || !currentBackground) {
      // Add dark background color if no image
      pdf.setFillColor('#1a1a1a');
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      return;
    }

    try {
      let backgroundImageData: string | null = null;

      // Handle custom backgrounds
      if (currentBackground.startsWith('custom:')) {
        const customId = currentBackground.replace('custom:', '');
        const customBg = this.customBackgroundService.backgrounds().find(bg => bg.id === customId);
        
        if (customBg) {
          backgroundImageData = await this.convertBlobToBase64(customBg.blobUrl);
        }
      } else {
        // Handle standard backgrounds - load from assets
        backgroundImageData = await this.loadImageAsBase64(`assets/backgrounds/${currentBackground}`);
      }

      if (backgroundImageData) {
        // Create a canvas to composite the background image with overlay
        const backgroundCanvas = await this.createBackgroundCanvas(backgroundImageData, pdfWidth, pdfHeight);
        const backgroundDataUrl = backgroundCanvas.toDataURL('image/jpeg', 0.9);
        
        // Add the composited background to PDF
        pdf.addImage(backgroundDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      } else {
        // Fallback to dark background
        pdf.setFillColor('#1a1a1a');
        pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      }
    } catch (error) {
      console.warn('Failed to add background to PDF:', error);
      // Fallback to dark background
      pdf.setFillColor('#1a1a1a');
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
    }
  }

  private async loadImageAsBase64(imagePath: string): Promise<string | null> {
    try {
      const response = await fetch(imagePath);
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading image as base64:', error);
      return null;
    }
  }

  private async createBackgroundCanvas(backgroundImageData: string, pdfWidth: number, pdfHeight: number): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Set canvas size (convert mm to pixels at 150 DPI for good quality)
      const dpi = 150;
      const mmToInch = 1 / 25.4;
      canvas.width = pdfWidth * mmToInch * dpi;
      canvas.height = pdfHeight * mmToInch * dpi;
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Fill with dark background first
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw background image to cover entire canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Add semi-transparent dark overlay for text readability (lighter for better text visibility)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          resolve(canvas);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load background image'));
      };
      
      img.src = backgroundImageData;
    });
  }
}