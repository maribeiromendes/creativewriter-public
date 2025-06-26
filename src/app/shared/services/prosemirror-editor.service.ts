import { Injectable, Injector, ApplicationRef, EnvironmentInjector } from '@angular/core';
import { EditorState, Transaction, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, DOMSerializer, Node as ProseMirrorNode, Fragment, Slice } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { Subject } from 'rxjs';
import { BeatAINodeView } from './beat-ai-nodeview';
import { BeatAI, BeatAIPromptEvent, BeatContentInsertEvent } from '../../stories/models/beat-ai.interface';
import { BeatAIService } from './beat-ai.service';
import { ImageInsertResult } from '../components/image-upload-dialog.component';
import { PromptManagerService } from './prompt-manager.service';

export interface EditorConfig {
  placeholder?: string;
  onUpdate?: (content: string) => void;
  onSlashCommand?: (position: number) => void;
  onBeatPromptSubmit?: (event: BeatAIPromptEvent) => void;
  onBeatContentUpdate?: (beatData: BeatAI) => void;
  onBeatFocus?: () => void;
  onImageInsertRequest?: (position: number) => void;
  storyContext?: {
    storyId?: string;
    chapterId?: string;
    sceneId?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProseMirrorEditorService {
  private editorView: EditorView | null = null;
  private editorSchema: Schema;
  private currentStoryContext: {
    storyId?: string;
    chapterId?: string;
    sceneId?: string;
  } = {};
  private beatNodeViews: Set<BeatAINodeView> = new Set();
  
  public contentUpdate$ = new Subject<string>();
  public slashCommand$ = new Subject<number>();

  constructor(
    private injector: Injector,
    private appRef: ApplicationRef,
    private envInjector: EnvironmentInjector,
    private beatAIService: BeatAIService,
    private promptManager: PromptManagerService
  ) {
    // Create schema with basic nodes, list support, and beat AI node
    const baseNodes = addListNodes(schema.spec.nodes, 'paragraph block*', 'block');
    
    // Add image and beat AI nodes to schema
    const extendedNodes = baseNodes.append({
      image: {
        attrs: {
          src: { default: '' },
          alt: { default: '' },
          title: { default: null }
        },
        inline: false,
        group: 'block',
        draggable: true,
        parseDOM: [{
          tag: 'img[src]',
          getAttrs: (dom: any) => ({
            src: dom.getAttribute('src'),
            alt: dom.getAttribute('alt') || '',
            title: dom.getAttribute('title') || null
          })
        }],
        toDOM: (node: any) => [
          'img',
          {
            src: node.attrs.src,
            alt: node.attrs.alt,
            title: node.attrs.title,
            style: 'max-width: 100%; height: auto; display: block; margin: 1rem auto;'
          }
        ]
      },
      beatAI: {
        attrs: {
          id: { default: '' },
          prompt: { default: '' },
          generatedContent: { default: '' },
          isGenerating: { default: false },
          isEditing: { default: false },
          createdAt: { default: '' },
          updatedAt: { default: '' }
        },
        group: 'block',
        atom: true,
        toDOM: (node: any) => {
          const attrs = {
            class: 'beat-ai-node',
            'data-id': node.attrs.id || '',
            'data-prompt': node.attrs.prompt || '',
            'data-content': node.attrs.generatedContent || '',
            'data-generating': node.attrs.isGenerating ? 'true' : 'false',
            'data-editing': node.attrs.isEditing ? 'true' : 'false',
            'data-created': node.attrs.createdAt || '',
            'data-updated': node.attrs.updatedAt || ''
          };
          
          // Create content to make the beat visible in saved HTML
          const content = [];
          if (node.attrs.prompt) {
            content.push(['div', { style: 'border: 1px solid #404040; padding: 0.5rem; margin: 0.5rem 0; background: #3a3a3a; border-radius: 4px;' }, 
              ['strong', '🎭 Beat AI'],
              ['div', { style: 'color: #adb5bd; font-style: italic; margin-top: 0.25rem;' }, 'Prompt: ' + node.attrs.prompt]
            ]);
          }
          
          return ['div', attrs, ...content] as const;
        },
        parseDOM: [{
          tag: 'div.beat-ai-node',
          getAttrs: (dom: any) => {
            const attrs = {
              id: dom.getAttribute('data-id') || '',
              prompt: dom.getAttribute('data-prompt') || '',
              generatedContent: dom.getAttribute('data-content') || '',
              isGenerating: dom.getAttribute('data-generating') === 'true',
              isEditing: dom.getAttribute('data-editing') === 'true',
              createdAt: dom.getAttribute('data-created') || '',
              updatedAt: dom.getAttribute('data-updated') || ''
            };
            
            return attrs;
          }
        }]
      }
    });

    this.editorSchema = new Schema({
      nodes: extendedNodes,
      marks: schema.spec.marks
    });
  }

  createEditor(element: HTMLElement, config: EditorConfig = {}): EditorView {
    // Store initial story context
    if (config.storyContext) {
      this.currentStoryContext = config.storyContext;
    }

    const state = EditorState.create({
      schema: this.editorSchema,
      plugins: [
        keymap(baseKeymap),
        keymap({
          'Mod-Enter': () => {
            // Handle enter key for line breaks
            return false;
          }
        }),
        this.createBeatAIPlugin(config)
      ]
    });

    this.editorView = new EditorView(element, {
      state,
      nodeViews: {
        beatAI: (node, view, getPos) => new BeatAINodeView(
          node,
          view,
          getPos as () => number,
          this.injector,
          this.appRef,
          this.envInjector,
          (event: BeatAIPromptEvent) => {
            config.onBeatPromptSubmit?.(event);
          },
          (beatData: BeatAI) => {
            config.onBeatContentUpdate?.(beatData);
          },
          () => {
            config.onBeatFocus?.();
          },
          this.currentStoryContext
        )
      },
      dispatchTransaction: (transaction: Transaction) => {
        const newState = this.editorView!.state.apply(transaction);
        this.editorView!.updateState(newState);
        
        // Emit content updates
        if (transaction.docChanged) {
          const content = this.getHTMLContent();
          this.contentUpdate$.next(content);
          config.onUpdate?.(content);
        }
        
        // Check for slash command
        if (transaction.docChanged || transaction.selection) {
          this.checkSlashCommand(newState, config.onSlashCommand);
        }
      },
      attributes: {
        class: 'prosemirror-editor',
        spellcheck: 'false'
      }
    });

    // Set placeholder if provided
    if (config.placeholder) {
      this.setPlaceholder(config.placeholder);
    }

    return this.editorView;
  }

  setContent(content: string): void {
    if (!this.editorView) return;
    
    try {
      const div = document.createElement('div');
      
      // Check if content looks like plain text (no HTML tags)
      if (content && !content.includes('<') && !content.includes('>')) {
        // Convert plain text to HTML paragraphs
        const paragraphs = content
          .split(/\n\n+/) // Split on double newlines (or more)
          .filter(para => para.trim()) // Remove empty paragraphs
          .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`) // Convert single newlines to <br>
          .join('');
        
        div.innerHTML = paragraphs || '<p></p>';
      } else {
        div.innerHTML = content || '<p></p>';
      }
      
      const doc = DOMParser.fromSchema(this.editorSchema).parse(div);
      const state = EditorState.create({
        doc,
        schema: this.editorSchema,
        plugins: this.editorView.state.plugins
      });
      
      this.editorView.updateState(state);
    } catch (error) {
      console.warn('Failed to parse content, setting empty state:', error);
      this.setEmptyState();
    }
  }

  getHTMLContent(): string {
    if (!this.editorView) return '';
    
    try {
      const fragment = DOMSerializer.fromSchema(this.editorSchema)
        .serializeFragment(this.editorView.state.doc.content);
      
      const div = document.createElement('div');
      div.appendChild(fragment);
      
      // No need to process beat nodes - they already have their data in attributes
      
      return div.innerHTML;
    } catch (error) {
      console.warn('Failed to serialize content, returning text content:', error);
      return this.getTextContent();
    }
  }

  getTextContent(): string {
    if (!this.editorView) return '';
    return this.editorView.state.doc.textContent;
  }

  insertContent(content: string, position?: number, replaceSlash: boolean = false): void {
    if (!this.editorView) return;
    
    const { state } = this.editorView;
    const pos = position ?? state.selection.from;
    
    try {
      const div = document.createElement('div');
      div.innerHTML = content;
      const fragment = DOMParser.fromSchema(this.editorSchema).parseSlice(div);
      
      let tr;
      if (replaceSlash) {
        // Replace the slash with the content
        const slashPos = pos - 1;
        tr = state.tr.replaceRange(slashPos, pos, fragment);
      } else {
        // Insert at position
        tr = state.tr.replaceRange(pos, pos, fragment);
      }
      
      this.editorView.dispatch(tr);
    } catch (error) {
      console.warn('Failed to insert content:', error);
    }
  }

  removeSlashAtPosition(position: number): void {
    if (!this.editorView) return;
    
    try {
      const { state } = this.editorView;
      // Remove the slash character at the given position
      const slashPos = position - 1; // Position of the slash character
      
      if (slashPos >= 0 && slashPos < state.doc.content.size) {
        const tr = state.tr.delete(slashPos, position);
        this.editorView.dispatch(tr);
      }
    } catch (error) {
      console.error('Failed to remove slash:', error);
    }
  }

  insertBeatAI(position?: number, replaceSlash: boolean = false): void {
    if (!this.editorView) return;
    
    try {
      const { state } = this.editorView;
      const pos = position ?? state.selection.from;
      
      
      const beatData = this.beatAIService.createNewBeat();
      const beatNode = this.editorSchema.nodes['beatAI'].create({
        id: beatData.id,
        prompt: beatData.prompt,
        generatedContent: beatData.generatedContent,
        isGenerating: beatData.isGenerating,
        isEditing: beatData.isEditing,
        createdAt: beatData.createdAt.toISOString(),
        updatedAt: beatData.updatedAt.toISOString()
      });
      
      let tr;
      if (replaceSlash) {
        // Find the actual slash position by looking backwards from cursor position
        let slashPos = pos - 1;
        let foundSlash = false;
        
        // Look backwards up to 10 characters to find the slash
        for (let i = 1; i <= 10 && slashPos >= 0; i++) {
          const checkPos = pos - i;
          const textAtCheck = state.doc.textBetween(checkPos, checkPos + 1);
          
          if (textAtCheck === '/') {
            slashPos = checkPos;
            foundSlash = true;
            break;
          }
        }
        
        if (foundSlash) {
          // Replace the slash with the beat node
          tr = state.tr.replaceRangeWith(slashPos, slashPos + 1, beatNode);
        } else {
          console.warn('No slash found, inserting at current position');
          tr = state.tr.replaceRangeWith(pos, pos, beatNode);
        }
      } else {
        // Insert at position
        tr = state.tr.replaceRangeWith(pos, pos, beatNode);
      }
      
      this.editorView.dispatch(tr);
    } catch (error) {
      console.error('Failed to insert Beat AI node:', error);
    }
  }

  focus(): void {
    if (this.editorView) {
      this.editorView.focus();
    }
  }

  registerBeatNodeView(nodeView: BeatAINodeView): void {
    this.beatNodeViews.add(nodeView);
  }

  unregisterBeatNodeView(nodeView: BeatAINodeView): void {
    this.beatNodeViews.delete(nodeView);
  }

  destroy(): void {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
    this.beatNodeViews.clear();
  }

  private setPlaceholder(placeholder: string): void {
    if (!this.editorView) return;
    
    const editorElement = this.editorView.dom as HTMLElement;
    editorElement.setAttribute('data-placeholder', placeholder);
  }

  private setEmptyState(): void {
    if (!this.editorView) return;
    
    const state = EditorState.create({
      schema: this.editorSchema,
      plugins: this.editorView.state.plugins
    });
    
    this.editorView.updateState(state);
  }

  private createBeatAIPlugin(config: EditorConfig): Plugin {
    return new Plugin({
      key: new PluginKey('beatAI'),
      state: {
        init: () => ({}),
        apply: (tr, value) => value
      }
    });
  }

  handleBeatPromptSubmit(event: BeatAIPromptEvent): void {
    if (!this.editorView) return;
    
    // Handle delete after beat action
    if (event.action === 'deleteAfter') {
      this.deleteContentAfterBeat(event.beatId);
      return;
    }
    
    // Start generation process and update prompt
    this.updateBeatNode(event.beatId, { 
      isGenerating: true, 
      generatedContent: '',
      prompt: event.prompt || '' 
    });
    
    // Find the beat node position to insert content after it
    const beatNodePosition = this.findBeatNodePosition(event.beatId);
    if (beatNodePosition === null) return;
    
    // Clear any existing content after the beat node first
    this.clearContentAfterBeatNode(event.beatId);
    
    // Track accumulating content for real-time insertion
    let accumulatedContent = '';
    const startPosition = beatNodePosition + 1; // Position right after beat node
    
    // Subscribe to streaming generation events
    const generationSubscription = this.beatAIService.generation$.subscribe(generationEvent => {
      if (generationEvent.beatId !== event.beatId) return;
      
      if (!generationEvent.isComplete && generationEvent.chunk) {
        // Stream chunk received - append to accumulated content and insert
        accumulatedContent += generationEvent.chunk;
        this.replaceContentAfterBeatNode(event.beatId, accumulatedContent);
      } else if (generationEvent.isComplete) {
        // Generation completed
        this.updateBeatNode(event.beatId, { 
          isGenerating: false,
          generatedContent: accumulatedContent,
          prompt: event.prompt || ''
        });
        generationSubscription.unsubscribe();
      }
    });
    
    // Generate AI content with streaming
    this.beatAIService.generateBeatContent(event.prompt || '', event.beatId, {
      wordCount: event.wordCount,
      model: event.model,
      storyId: event.storyId,
      chapterId: event.chapterId,
      sceneId: event.sceneId
    }).subscribe({
      next: (finalContent) => {
        // Final content received - ensure beat node is updated
        this.updateBeatNode(event.beatId, { 
          isGenerating: false,
          generatedContent: finalContent,
          prompt: event.prompt || ''
        });
      },
      error: (error) => {
        console.error('Beat generation failed:', error);
        
        // Insert error message
        this.replaceContentAfterBeatNode(event.beatId, 'Fehler bei der Generierung. Bitte versuchen Sie es erneut.');
        
        this.updateBeatNode(event.beatId, { 
          isGenerating: false,
          generatedContent: 'Fehler bei der Generierung. Bitte versuchen Sie es erneut.',
          prompt: event.prompt || ''
        });
        
        generationSubscription.unsubscribe();
      }
    });
  }

  private updateBeatNode(beatId: string, updates: Partial<BeatAI>): void {
    if (!this.editorView) return;
    
    const { state } = this.editorView;
    let nodePos: number | null = null;
    let targetNode: ProseMirrorNode | null = null;
    
    // Find the beat node with the given ID
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'beatAI' && node.attrs['id'] === beatId) {
        nodePos = pos;
        targetNode = node;
        return false; // Stop iteration
      }
      return true;
    });
    
    if (nodePos !== null && targetNode) {
      const newAttrs = {
        ...(targetNode as any).attrs,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      const tr = state.tr.setNodeMarkup(nodePos, undefined, newAttrs);
      this.editorView.dispatch(tr);
    }
  }

  private findBeatNodePosition(beatId: string): number | null {
    if (!this.editorView) return null;
    
    const { state } = this.editorView;
    let nodePos: number | null = null;
    
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'beatAI' && node.attrs['id'] === beatId) {
        nodePos = pos;
        return false; // Stop iteration
      }
      return true;
    });
    
    return nodePos;
  }

  private insertContentAfterBeatNode(beatId: string, content: string): void {
    if (!this.editorView) return;
    
    const beatPos = this.findBeatNodePosition(beatId);
    if (beatPos === null) return;
    
    const { state } = this.editorView;
    const beatNode = state.doc.nodeAt(beatPos);
    if (!beatNode) return;
    
    // Position after the beat node
    const insertPos = beatPos + beatNode.nodeSize;
    
    // Parse content into multiple paragraphs if needed
    const paragraphNodes = this.createParagraphsFromContent(content, state);
    
    // Check if there's already generated content after this beat node
    const nextNode = state.doc.nodeAt(insertPos);
    let tr = state.tr;
    
    if (nextNode && nextNode.type.name === 'paragraph' && this.isGeneratedContent(nextNode, beatId)) {
      // Find and replace all existing generated content paragraphs
      let endPos = insertPos;
      let currentPos = insertPos;
      
      // Find the end of existing generated content
      while (currentPos < state.doc.content.size) {
        const node = state.doc.nodeAt(currentPos);
        if (node && node.type.name === 'paragraph' && this.isGeneratedContent(node, beatId)) {
          endPos = currentPos + node.nodeSize;
          currentPos = endPos;
        } else {
          break;
        }
      }
      
      // Delete existing content first
      tr = tr.delete(insertPos, endPos);
    }
    
    // Insert all new paragraphs sequentially
    let currentPos = insertPos;
    paragraphNodes.forEach((para, index) => {
      tr = tr.insert(currentPos, para);
      currentPos += para.nodeSize;
    });
    
    this.editorView.dispatch(tr);
  }

  private deleteContentAfterBeat(beatId: string): void {
    if (!this.editorView) return;
    
    const beatPos = this.findBeatNodePosition(beatId);
    if (beatPos === null) return;
    
    const { state } = this.editorView;
    const beatNode = state.doc.nodeAt(beatPos);
    if (!beatNode) return;
    
    // Position after the beat node
    const deleteStartPos = beatPos + beatNode.nodeSize;
    
    // Delete everything from after the beat to the end of the document
    const tr = state.tr.delete(deleteStartPos, state.doc.content.size);
    
    // Dispatch the transaction
    this.editorView.dispatch(tr);
    
    // Emit content update to trigger save
    const content = this.getHTMLContent();
    this.contentUpdate$.next(content);
    
    // Refresh prompt manager to update scene context
    // This ensures that the next beat prompt will use the correct context
    setTimeout(() => {
      this.promptManager.refresh().then(() => {
        console.log('Prompt manager refreshed after content deletion');
      }).catch(error => {
        console.error('Error refreshing prompt manager:', error);
      });
    }, 500); // Small delay to ensure content is saved first
  }

  private createParagraphsFromContent(content: string, state: any): any[] {
    if (!content || !content.trim()) {
      // Return empty paragraph if no content
      return [state.schema.nodes['paragraph'].create()];
    }
    
    // Split content by double newlines to get paragraphs
    const paragraphTexts = content
      .split(/\n\n+/) // Split on double newlines (or more)
      .map(para => para.trim()) // Remove leading/trailing whitespace
      .filter(para => para.length > 0); // Remove empty paragraphs
    
    // If no paragraphs found (single line text), create one paragraph
    if (paragraphTexts.length === 0) {
      const textNodes = [state.schema.text(content.trim())];
      return [state.schema.nodes['paragraph'].create(null, textNodes)];
    }
    
    // Create paragraph nodes for each text block
    const paragraphNodes = paragraphTexts.map(paragraphText => {
      // Handle single newlines within a paragraph as line breaks
      const lines = paragraphText.split('\n');
      const textNodes: any[] = [];
      
      lines.forEach((line, index) => {
        if (line.trim()) {
          textNodes.push(state.schema.text(line));
        }
        // Add line break between lines (but not after the last line)
        if (index < lines.length - 1) {
          textNodes.push(state.schema.nodes['hard_break']?.create() || state.schema.text('\n'));
        }
      });
      
      return state.schema.nodes['paragraph'].create(null, textNodes);
    });
    
    return paragraphNodes;
  }

  private isGeneratedContent(node: ProseMirrorNode, beatId: string): boolean {
    // For streaming, we consider all paragraphs after a beat node as generated content
    // until we hit another beat node or other special content
    return node.type.name === 'paragraph';
  }

  private checkSlashCommand(state: EditorState, onSlashCommand?: (position: number) => void): void {
    const { selection } = state;
    const { from } = selection;
    
    // Get text before cursor (just 1 character)
    const textBefore = state.doc.textBetween(Math.max(0, from - 1), from);
    
    // Check if we just typed a slash
    if (textBefore === '/') {
      // Don't trigger if we're inside a beat AI node
      const nodeAtPos = state.doc.resolve(from).parent;
      const isInBeatNode = nodeAtPos.type.name === 'beatAI';
      
      if (!isInBeatNode) {
        console.log('Triggering slash command at position:', from);
        this.slashCommand$.next(from);
        onSlashCommand?.(from);
      }
    }
  }

  updateStoryContext(storyContext: { storyId?: string; chapterId?: string; sceneId?: string }): void {
    
    // Update stored context for new nodes
    this.currentStoryContext = storyContext;
    
    if (!this.editorView) return;

    // Update all registered BeatAI node views with new context
    let nodeViewsUpdated = 0;
    
    
    for (const nodeView of this.beatNodeViews) {
      if (nodeView && nodeView.componentRef) {
        
        // Update the nodeView's context
        nodeView.storyContext = storyContext;
        
        // Update the component instance
        nodeView.componentRef.instance.storyId = storyContext.storyId;
        nodeView.componentRef.instance.chapterId = storyContext.chapterId;
        nodeView.componentRef.instance.sceneId = storyContext.sceneId;
        
        // Force Angular to detect the changes
        nodeView.componentRef.changeDetectorRef?.markForCheck();
        nodeView.componentRef.changeDetectorRef?.detectChanges();
        nodeViewsUpdated++;
      }
    }
    
  }

  insertImage(imageData: ImageInsertResult, position?: number, replaceSlash: boolean = false): void {
    if (!this.editorView) return;
    
    try {
      const { state } = this.editorView;
      const pos = position ?? state.selection.from;
      
      // Create image node
      const imageNode = this.editorSchema.nodes['image'].create({
        src: imageData.url,
        alt: imageData.alt,
        title: imageData.title || null
      });
      
      let tr;
      if (replaceSlash) {
        // Find the actual slash position by looking backwards from cursor position
        let slashPos = pos - 1;
        let foundSlash = false;
        
        // Look backwards up to 10 characters to find the slash
        for (let i = 1; i <= 10 && slashPos >= 0; i++) {
          const checkPos = pos - i;
          const textAtCheck = state.doc.textBetween(checkPos, checkPos + 1);
          
          if (textAtCheck === '/') {
            slashPos = checkPos;
            foundSlash = true;
            break;
          }
        }
        
        if (foundSlash) {
          // Replace the slash with the image node
          tr = state.tr.replaceRangeWith(slashPos, slashPos + 1, imageNode);
        } else {
          console.warn('No slash found, inserting at current position');
          tr = state.tr.replaceRangeWith(pos, pos, imageNode);
        }
      } else {
        // Insert at position
        tr = state.tr.replaceRangeWith(pos, pos, imageNode);
      }
      
      this.editorView.dispatch(tr);
    } catch (error) {
      console.error('Failed to insert image:', error);
    }
  }

  requestImageInsert(): void {
    // This will be called by slash commands to request image insertion
    // The actual dialog will be handled by the component
  }

  private insertTextAtPosition(position: number, text: string): void {
    if (!this.editorView) return;
    
    const { state } = this.editorView;
    
    // Validate position bounds
    if (position < 0 || position > state.doc.content.size) {
      console.warn('Invalid position for text insertion:', position);
      return;
    }
    
    try {
      const tr = state.tr.insertText(text, position);
      this.editorView.dispatch(tr);
    } catch (error) {
      console.error('Failed to insert text at position:', error);
    }
  }

  private clearContentAfterBeatNode(beatId: string): void {
    if (!this.editorView) return;
    
    const beatPos = this.findBeatNodePosition(beatId);
    if (beatPos === null) return;
    
    const { state } = this.editorView;
    const beatNode = state.doc.nodeAt(beatPos);
    if (!beatNode) return;
    
    // Position after the beat node
    const afterBeatPos = beatPos + beatNode.nodeSize;
    
    // Find the range of generated content to clear
    let endPos = afterBeatPos;
    let pos = afterBeatPos;
    
    // Look for consecutive paragraphs until we hit another beat node or end of document
    while (pos < state.doc.content.size) {
      const node = state.doc.nodeAt(pos);
      if (!node) break;
      
      // Stop if we hit another beat node
      if (node.type.name === 'beatAI') {
        break;
      }
      
      // Include paragraphs in the range to clear
      if (node.type.name === 'paragraph') {
        endPos = pos + node.nodeSize;
        pos = endPos;
      } else {
        // Stop at other node types (images, etc.)
        break;
      }
    }
    
    // Clear existing generated content
    if (endPos > afterBeatPos) {
      const tr = state.tr.delete(afterBeatPos, endPos);
      this.editorView.dispatch(tr);
    }
  }

  private replaceContentAfterBeatNode(beatId: string, newContent: string): void {
    if (!this.editorView) return;
    
    const beatPos = this.findBeatNodePosition(beatId);
    if (beatPos === null) return;
    
    const { state } = this.editorView;
    const beatNode = state.doc.nodeAt(beatPos);
    if (!beatNode) return;
    
    // Position after the beat node
    const afterBeatPos = beatPos + beatNode.nodeSize;
    
    // Find the range of generated content to replace
    let endPos = afterBeatPos;
    let pos = afterBeatPos;
    
    // Look for consecutive paragraphs until we hit another beat node or end of document
    while (pos < state.doc.content.size) {
      const node = state.doc.nodeAt(pos);
      if (!node) break;
      
      // Stop if we hit another beat node
      if (node.type.name === 'beatAI') {
        break;
      }
      
      // Include paragraphs in the range to replace
      if (node.type.name === 'paragraph') {
        endPos = pos + node.nodeSize;
        pos = endPos;
      } else {
        // Stop at other node types (images, etc.)
        break;
      }
    }
    
    // Replace the range with new content
    const paragraphNodes = this.createParagraphsFromContent(newContent, state);
    const fragment = Fragment.from(paragraphNodes);
    const slice = new Slice(fragment, 0, 0);
    const tr = state.tr.replaceRange(afterBeatPos, endPos, slice);
    this.editorView.dispatch(tr);
  }
}