import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NovelCrafterImportService, NovelCrafterImportResult } from '../../shared/services/novelcrafter-import.service';

@Component({
  selector: 'app-novelcrafter-import',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="import-page">
      <div class="import-container">
        <div class="import-header">
          <h2>NovelCrafter Story Import</h2>
          <p>Import your NovelCrafter story including chapters, scenes, and codex entries.</p>
        </div>

        <div class="import-content">
        <!-- File Selection -->
        <div *ngIf="!isImporting() && !importResult()" class="file-selection">
          <div class="import-options">
            <!-- ZIP File Option -->
            <div class="drop-zone zip-option" 
                 role="button"
                 tabindex="0"
                 [class.drag-over]="isDragOver()"
                 (dragover)="onDragOver($event)"
                 (dragleave)="onDragLeave($event)"
                 (drop)="onDrop($event)"
                 (click)="zipFileInput.click()"
                 (keyup.enter)="zipFileInput.click()"
                 (keyup.space)="zipFileInput.click()">
              <div class="drop-zone-content">
                <div class="upload-icon">📦</div>
                <h3>ZIP File Import</h3>
                <p>Drag and drop your NovelCrafter ZIP file here, or click to browse</p>
                <p class="file-hint">Recommended: Direct ZIP file import</p>
              </div>
            </div>

            <div class="option-separator">
              <span>oder</span>
            </div>
            
            <!-- Folder Option -->
            <div class="drop-zone folder-option" 
                 role="button"
                 tabindex="0"
                 [class.drag-over]="isFolderDragOver()"
                 (dragover)="onFolderDragOver($event)"
                 (dragleave)="onFolderDragLeave($event)"
                 (drop)="onFolderDrop($event)"
                 (click)="folderInput.click()"
                 (keyup.enter)="folderInput.click()"
                 (keyup.space)="folderInput.click()">
              <div class="drop-zone-content">
                <div class="upload-icon">📁</div>
                <h3>Folder Import</h3>
                <p>Select extracted NovelCrafter export folder</p>
                <p class="file-hint">Select all files from the extracted folder</p>
              </div>
            </div>
          </div>
          
          <input #zipFileInput
                 type="file"
                 accept=".zip"
                 style="display: none"
                 (change)="onZipFileSelected($event)">
                 
          <input #folderInput
                 type="file"
                 multiple
                 webkitdirectory
                 style="display: none"
                 (change)="onFilesSelected($event)">
        </div>

        <!-- Import Progress -->
        <div *ngIf="isImporting()" class="import-progress">
          <div class="progress-spinner"></div>
          <h3>Importing NovelCrafter Story...</h3>
          <p>{{ importStatus() }}</p>
        </div>

        <!-- Import Preview -->
        <div *ngIf="importResult() && !isImporting()" class="import-preview">
          <h3>Import Preview</h3>
          
          <div class="preview-section">
            <h4>📖 Story Structure</h4>
            <div class="story-info">
              <p><strong>Title:</strong> {{ importResult()!.story.title }}</p>
              <p><strong>Chapters:</strong> {{ importResult()!.story.chapters.length }}</p>
              <p><strong>Total Scenes:</strong> {{ getTotalScenes() }}</p>
            </div>
            
            <div class="chapters-preview">
              <div *ngFor="let chapter of importResult()!.story.chapters" class="chapter-item">
                <h5>{{ chapter.title }} ({{ chapter.scenes.length }} scenes)</h5>
                <div class="scenes-list">
                  <span *ngFor="let scene of chapter.scenes" class="scene-badge">
                    {{ scene.title }}
                    <span *ngIf="scene.summary" class="summary-indicator" title="Has summary">📝</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="preview-section">
            <h4>📚 Codex Entries</h4>
            <div class="codex-stats">
              <div class="stat-item">
                <span class="stat-icon">👤</span>
                <span class="stat-label">Characters:</span>
                <span class="stat-value">{{ importResult()!.codexEntries.characters.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">🏰</span>
                <span class="stat-label">Locations:</span>
                <span class="stat-value">{{ importResult()!.codexEntries.locations.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">⚔️</span>
                <span class="stat-label">Objects:</span>
                <span class="stat-value">{{ importResult()!.codexEntries.objects.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">📝</span>
                <span class="stat-label">Notes:</span>
                <span class="stat-value">{{ importResult()!.codexEntries.other.length }}</span>
              </div>
            </div>

            <!-- Character Preview -->
            <div *ngIf="importResult()!.codexEntries.characters.length > 0" class="entries-preview">
              <h5>Characters Preview:</h5>
              <div class="entry-cards">
                <div *ngFor="let char of importResult()!.codexEntries.characters.slice(0, 3)" class="entry-card">
                  <h6>{{ char.title }}</h6>
                  <p class="entry-preview">{{ getContentPreview(char.content) }}</p>
                  <div class="entry-meta">
                    <span *ngIf="char.metadata?.['storyRole']" class="story-role-badge">
                      {{ char.metadata?.['storyRole'] }}
                    </span>
                    <span *ngFor="let field of char.metadata?.['customFields']?.slice(0, 2)" class="custom-field-badge">
                      {{ field.name }}
                    </span>
                  </div>
                </div>
              </div>
              <p *ngIf="importResult()!.codexEntries.characters.length > 3" class="more-entries">
                +{{ importResult()!.codexEntries.characters.length - 3 }} more characters...
              </p>
            </div>
          </div>

          <!-- Warnings -->
          <div *ngIf="importResult()!.warnings.length > 0" class="warnings-section">
            <h4>⚠️ Import Warnings</h4>
            <div class="warnings-list">
              <div *ngFor="let warning of importResult()!.warnings" class="warning-item">
                {{ warning }}
              </div>
            </div>
          </div>

          <!-- Import Actions -->
          <div class="import-actions">
            <button class="import-btn" (click)="confirmImport()">
              Import Story
            </button>
            <button class="cancel-btn" (click)="resetImport()">
              Select Different Files
            </button>
          </div>
        </div>

        <!-- Import Success -->
        <div *ngIf="importSuccess()" class="import-success">
          <div class="success-icon">✅</div>
          <h3>Import Successful!</h3>
          <p>Your NovelCrafter story has been imported successfully.</p>
          <div class="success-actions">
            <button class="primary-btn" (click)="goToStory()">
              Open Imported Story
            </button>
            <button class="secondary-btn" (click)="goToStoryList()">
              Back to Story List
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  `,
  styles: [`
    .import-page {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow-y: auto;
      
      background: 
        /* Dark overlay for text readability */
        linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)),
        /* Main anime image */
        url('/assets/cyberpunk-anime-girl.png'),
        /* Fallback dark background */
        #1a1a1a;
      
      background-size: cover, cover, auto;
      background-position: center, center, center;
      background-repeat: no-repeat, no-repeat, repeat;
      background-attachment: fixed, fixed, scroll;
    }

    .import-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 2rem;
      padding-bottom: 4rem;
      background: linear-gradient(135deg, rgba(20, 20, 20, 0.3) 0%, rgba(15, 15, 15, 0.3) 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px) saturate(120%);
      -webkit-backdrop-filter: blur(10px) saturate(120%);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      color: #f8f9fa;
    }

    .import-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .import-header h2 {
      background: linear-gradient(135deg, #f8f9fa 0%, #8bb4f8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .import-options {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 2rem;
      align-items: center;
      margin-bottom: 2rem;
    }

    .option-separator {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      position: relative;
    }

    .option-separator::before,
    .option-separator::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 20px;
      height: 1px;
      background: #555;
    }

    .option-separator::before {
      left: -25px;
    }

    .option-separator::after {
      right: -25px;
    }

    .drop-zone {
      border: 2px dashed #555;
      border-radius: 8px;
      padding: 2rem 1rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #2a2a2a;
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .zip-option {
      border-color: rgba(143, 84, 233, 0.5);
    }

    .zip-option:hover,
    .zip-option.drag-over {
      border-color: rgba(143, 84, 233, 0.8);
      background: linear-gradient(135deg, rgba(143, 84, 233, 0.2) 0%, rgba(113, 66, 193, 0.2) 100%);
      transform: translateY(-2px);
    }

    .folder-option {
      border-color: rgba(71, 118, 230, 0.5);
    }

    .folder-option:hover,
    .folder-option.drag-over {
      border-color: rgba(71, 118, 230, 0.8);
      background: linear-gradient(135deg, rgba(71, 118, 230, 0.2) 0%, rgba(26, 140, 255, 0.2) 100%);
      transform: translateY(-2px);
    }

    .drop-zone-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .upload-icon {
      font-size: 3rem;
      opacity: 0.7;
    }

    .drop-zone h3 {
      margin: 0;
      background: linear-gradient(135deg, #8bb4f8 0%, #4776E6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 600;
    }

    .drop-zone p {
      margin: 0;
      color: #e0e0e0;
    }

    .file-hint {
      font-size: 0.9rem !important;
      color: #999 !important;
      font-style: italic;
    }

    .import-progress {
      text-align: center;
      padding: 3rem 2rem;
    }

    .progress-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #333;
      border-top: 4px solid #007acc;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .import-preview {
      background: #2a2a2a;
      border-radius: 8px;
      padding: 2rem;
      padding-bottom: 4rem; /* Extra space for scrolling */
    }

    .preview-section {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #444;
    }

    .preview-section:last-of-type {
      border-bottom: none;
      margin-bottom: 1rem;
    }

    .preview-section h4 {
      color: #007acc;
      margin-bottom: 1rem;
    }

    .story-info {
      background: #333;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .story-info p {
      margin: 0.5rem 0;
    }

    .chapters-preview {
      margin-top: 1rem;
    }

    .chapter-item {
      background: #333;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .chapter-item h5 {
      color: #007acc;
      margin: 0 0 0.5rem 0;
    }

    .scenes-list {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .scene-badge {
      background: #444;
      color: #e0e0e0;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .summary-indicator {
      font-size: 0.7rem;
    }

    .codex-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-item {
      background: #333;
      padding: 1rem;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stat-icon {
      font-size: 1.2rem;
    }

    .stat-label {
      flex: 1;
      font-weight: bold;
    }

    .stat-value {
      background: #007acc;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.9rem;
    }

    .entries-preview h5 {
      color: #ccc;
      margin-bottom: 1rem;
    }

    .entry-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .entry-card {
      background: #444;
      padding: 1rem;
      border-radius: 4px;
      border-left: 3px solid #007acc;
    }

    .entry-card h6 {
      color: #007acc;
      margin: 0 0 0.5rem 0;
    }

    .entry-preview {
      color: #ccc;
      font-size: 0.9rem;
      line-height: 1.4;
      margin: 0 0 0.5rem 0;
    }

    .entry-meta {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .story-role-badge {
      background: #28a745;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
    }

    .custom-field-badge {
      background: #6f42c1;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
    }

    .more-entries {
      color: #999;
      font-style: italic;
      margin: 0;
    }

    .warnings-section {
      background: rgba(255, 193, 7, 0.1);
      border: 1px solid #ffc107;
      border-radius: 4px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .warnings-section h4 {
      color: #ffc107 !important;
      margin-bottom: 1rem;
    }

    .warning-item {
      background: rgba(255, 193, 7, 0.1);
      padding: 0.5rem;
      border-radius: 4px;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .import-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }

    .import-btn {
      background: #28a745;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s;
    }

    .import-btn:hover {
      background: #218838;
    }

    .cancel-btn {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s;
    }

    .cancel-btn:hover {
      background: #5a6268;
    }

    .import-success {
      text-align: center;
      padding: 3rem 2rem;
    }

    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .import-success h3 {
      color: #28a745;
      margin-bottom: 1rem;
    }

    .success-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }

    .primary-btn {
      background: #007acc;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s;
    }

    .primary-btn:hover {
      background: #005a9f;
    }

    .secondary-btn {
      background: #333;
      color: #e0e0e0;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s;
    }

    .secondary-btn:hover {
      background: #444;
    }

    @media (max-width: 768px) {
      .import-container {
        margin: 1rem;
        padding: 1rem;
      }

      .import-options {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .option-separator {
        transform: rotate(90deg);
      }

      .option-separator::before,
      .option-separator::after {
        width: 15px;
      }

      .option-separator::before {
        left: -20px;
      }

      .option-separator::after {
        right: -20px;
      }

      .drop-zone {
        padding: 1.5rem 1rem;
        min-height: 150px;
      }

      .codex-stats {
        grid-template-columns: 1fr;
      }

      .entry-cards {
        grid-template-columns: 1fr;
      }

      .import-actions,
      .success-actions {
        flex-direction: column;
      }
    }
  `]
})
export class NovelCrafterImportComponent {
  private router = inject(Router);
  private importService = inject(NovelCrafterImportService);

  isDragOver = signal(false);
  isFolderDragOver = signal(false);
  isImporting = signal(false);
  importStatus = signal('');
  importResult = signal<NovelCrafterImportResult | null>(null);
  importSuccess = signal(false);
  importedStoryId = signal<string | null>(null);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      // Check if it's a ZIP file
      if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
        this.processZipFile(files[0]);
      } else {
        this.processFiles(files);
      }
    }
  }

  onFolderDragOver(event: DragEvent) {
    event.preventDefault();
    this.isFolderDragOver.set(true);
  }

  onFolderDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isFolderDragOver.set(false);
  }

  onFolderDrop(event: DragEvent) {
    event.preventDefault();
    this.isFolderDragOver.set(false);
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.processFiles(files);
    }
  }

  onZipFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processZipFile(input.files[0]);
    }
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(input.files);
    }
  }

  async processZipFile(zipFile: File) {
    this.isImporting.set(true);
    this.importStatus.set('Extracting ZIP file...');

    try {
      this.importStatus.set('Parsing novel structure...');
      const result = await this.importService.importFromZip(zipFile);
      
      this.importStatus.set('Processing codex entries...');
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.importResult.set(result);
      this.isImporting.set(false);
    } catch (error) {
      console.error('ZIP import failed:', error);
      this.importStatus.set('Import failed: ' + (error as Error).message);
      this.isImporting.set(false);
      
      // Reset after showing error
      setTimeout(() => {
        this.resetImport();
      }, 3000);
    }
  }

  async processFiles(files: FileList) {
    if (files.length === 0) {
      return;
    }

    this.isImporting.set(true);
    this.importStatus.set('Analyzing files...');

    try {
      this.importStatus.set('Parsing novel structure...');
      const result = await this.importService.importFromFiles(files);
      
      this.importStatus.set('Processing codex entries...');
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.importResult.set(result);
      this.isImporting.set(false);
    } catch (error) {
      console.error('Import failed:', error);
      this.importStatus.set('Import failed: ' + (error as Error).message);
      this.isImporting.set(false);
      
      // Reset after showing error
      setTimeout(() => {
        this.resetImport();
      }, 3000);
    }
  }

  async confirmImport() {
    const result = this.importResult();
    if (!result) return;

    this.isImporting.set(true);
    this.importStatus.set('Creating story and importing data...');

    try {
      const storyId = await this.importService.importToStory(result);
      this.importedStoryId.set(storyId);
      this.isImporting.set(false);
      this.importSuccess.set(true);
    } catch (error) {
      console.error('Import to story failed:', error);
      this.importStatus.set('Import failed: ' + (error as Error).message);
      this.isImporting.set(false);
    }
  }

  resetImport() {
    this.importResult.set(null);
    this.importSuccess.set(false);
    this.importedStoryId.set(null);
    this.isImporting.set(false);
    this.importStatus.set('');
  }

  getTotalScenes(): number {
    const result = this.importResult();
    if (!result) return 0;
    return result.story.chapters.reduce((total, chapter) => total + chapter.scenes.length, 0);
  }

  getContentPreview(content: string): string {
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  }

  goToStory() {
    const storyId = this.importedStoryId();
    if (storyId) {
      this.router.navigate(['/stories/editor', storyId]);
    }
  }

  goToStoryList() {
    this.router.navigate(['/']);
  }
}