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
    container.style.padding = `${options.margins.top}mm ${options.margins.right}mm ${options.margins.bottom}mm ${options.margins.left}mm`;
    container.style.boxSizing = 'border-box';
    container.style.fontFamily = 'Georgia, serif';
    container.style.fontSize = '12pt';
    container.style.lineHeight = '1.6';
    container.style.color = '#000000';
    
    // Apply background if enabled
    if (options.includeBackground) {
      await this.applyBackgroundToContainer(container);
    } else {
      container.style.backgroundColor = '#ffffff';
    }

    // Add story content
    this.addStoryContent(container, story);

    // Append to body for rendering
    document.body.appendChild(container);
    
    // Wait for images to load
    await this.waitForImages(container);
    
    return container;
  }

  private async applyBackgroundToContainer(container: HTMLElement): Promise<void> {
    const backgroundStyle = this.backgroundService.backgroundStyle();
    const currentBackground = this.backgroundService.getCurrentBackground();
    
    if (currentBackground === 'none' || !currentBackground) {
      container.style.backgroundColor = '#1a1a1a';
      return;
    }

    // Handle custom backgrounds
    if (currentBackground.startsWith('custom:')) {
      const customId = currentBackground.replace('custom:', '');
      const customBg = this.customBackgroundService.backgrounds().find(bg => bg.id === customId);
      
      if (customBg) {
        // Convert blob URL to base64 for PDF compatibility
        const base64Image = await this.convertBlobToBase64(customBg.blobUrl);
        container.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${base64Image}')`;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center center';
        container.style.backgroundRepeat = 'no-repeat';
        container.style.backgroundColor = '#1a1a1a';
      }
    } else {
      // Handle standard backgrounds
      container.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('assets/backgrounds/${currentBackground}')`;
      container.style.backgroundSize = 'cover';
      container.style.backgroundPosition = 'center center';
      container.style.backgroundRepeat = 'no-repeat';
      container.style.backgroundColor = '#1a1a1a';
    }
    
    // Set text color to white for dark backgrounds
    container.style.color = '#ffffff';
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
      // Configure html2canvas options for better quality
      const canvas = await html2canvas(container, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: null, // Preserve transparency if any
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight,
        scrollX: 0,
        scrollY: 0
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
}