import { Injectable, Injector, ApplicationRef, EnvironmentInjector } from '@angular/core';
import { EditorState, Transaction, Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { Schema, DOMParser, DOMSerializer, Node as ProseMirrorNode, Fragment, Slice } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, splitBlock, chainCommands, newlineInCode, createParagraphNear, liftEmptyBlock } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { Subject } from 'rxjs';
import { BeatAINodeView } from './beat-ai-nodeview';
import { BeatAI, BeatAIPromptEvent, BeatContentInsertEvent } from '../../stories/models/beat-ai.interface';
import { BeatAIService } from './beat-ai.service';
import { ImageInsertResult } from '../components/image-upload-dialog.component';
import { PromptManagerService } from './prompt-manager.service';
import { createCodexHighlightingPlugin, updateCodexHighlightingPlugin } from './codex-highlighting-plugin';
import { CodexEntry } from '../../stories/models/codex.interface';
import { CodexService } from '../../stories/services/codex.service';

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
  debugMode?: boolean;
}

export interface SimpleEditorConfig {
  placeholder?: string;
  onUpdate?: (content: string) => void;
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
  private simpleEditorView: EditorView | null = null; // Separate view for beat input
  private editorSchema: Schema;
  private currentStoryContext: {
    storyId?: string;
    chapterId?: string;
    sceneId?: string;
  } = {};
  private beatNodeViews: Set<BeatAINodeView> = new Set();
  private beatStreamingPositions: Map<string, number> = new Map();
  private debugMode = false;
  
  public contentUpdate$ = new Subject<string>();
  public slashCommand$ = new Subject<number>();

  constructor(
    private injector: Injector,
    private appRef: ApplicationRef,
    private envInjector: EnvironmentInjector,
    private beatAIService: BeatAIService,
    private promptManager: PromptManagerService,
    private codexService: CodexService
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
          updatedAt: { default: '' },
          wordCount: { default: 400 },
          beatType: { default: 'story' },
          model: { default: '' }
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
            'data-updated': node.attrs.updatedAt || '',
            'data-word-count': node.attrs.wordCount || 400,
            'data-beat-type': node.attrs.beatType || 'story',
            'data-model': node.attrs.model || ''
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
              updatedAt: dom.getAttribute('data-updated') || '',
              wordCount: parseInt(dom.getAttribute('data-word-count') || '400', 10),
              beatType: dom.getAttribute('data-beat-type') || 'story',
              model: dom.getAttribute('data-model') || ''
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

    this.debugMode = config.debugMode || false;

    const plugins = [
      history(),
      keymap({
        'Mod-z': undo,
        'Mod-y': redo,
        'Mod-Shift-z': redo,
        // Explicitly use ProseMirror's native paragraph handling
        'Enter': chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock)
      }),
      keymap(baseKeymap),
      this.createBeatAIPlugin(config),
      this.createCodexHighlightingPlugin(config)
    ];


    const state = EditorState.create({
      schema: this.editorSchema,
      plugins
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
        
        // Emit content updates with lazy evaluation
        if (transaction.docChanged) {
          // Don't serialize content here - let the consumer do it when needed
          config.onUpdate?.('__content_changed__');
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

    // Apply debug mode if enabled
    if (this.debugMode) {
      setTimeout(() => this.toggleDebugMode(true), 100);
    }

    return this.editorView;
  }

  createSimpleTextEditor(element: HTMLElement, config: SimpleEditorConfig = {}): EditorView {
    // Create a simple schema without beat nodes for basic text editing
    const simpleSchema = new Schema({
      nodes: {
        doc: schema.spec.nodes.get('doc')!,
        paragraph: schema.spec.nodes.get('paragraph')!,
        text: schema.spec.nodes.get('text')!,
        hard_break: schema.spec.nodes.get('hard_break')!
      },
      marks: schema.spec.marks
    });

    // Store initial story context for codex awareness
    if (config.storyContext) {
      this.currentStoryContext = config.storyContext;
    }

    // Create initial document with empty paragraph
    const initialDoc = simpleSchema.nodes['doc'].create({}, [
      simpleSchema.nodes['paragraph'].create({}, [])
    ]);
    
    const state = EditorState.create({
      doc: initialDoc,
      schema: simpleSchema,
      plugins: [
        history(),
        keymap({
          'Mod-z': undo,
          'Mod-y': redo,
          'Mod-Shift-z': redo,
          'Enter': splitBlock,
          'Shift-Enter': (state, dispatch) => {
            // Create line break with Shift+Enter
            if (dispatch) {
              const hardBreak = simpleSchema.nodes['hard_break'].create();
              const tr = state.tr.replaceSelectionWith(hardBreak);
              dispatch(tr.scrollIntoView());
            }
            return true;
          }
        }),
        keymap(baseKeymap),
        new Plugin({
          props: {
            attributes: {
              'data-placeholder': config.placeholder || 'Enter text...'
            }
          }
        }),
        // Add codex awareness plugin
        this.createCodexHighlightingPluginForCurrentStory()
      ]
    });

    // Create the editor view with proper event isolation
    this.simpleEditorView = new EditorView(element, {
      state,
      dispatchTransaction: (transaction) => {
        const newState = this.simpleEditorView!.state.apply(transaction);
        this.simpleEditorView!.updateState(newState);
        
        // Call update callback if provided
        if (config.onUpdate) {
          const content = this.getSimpleTextContent();
          config.onUpdate(content);
        }
      },
      attributes: {
        class: 'prosemirror-editor simple-text-editor',
        spellcheck: 'false'
      },
      handleDOMEvents: {
        mousedown: (view, event) => {
          // Stop event propagation to prevent main editor from handling it
          event.stopPropagation();
          return false;
        },
        touchstart: (view, event) => {
          // Stop event propagation to prevent main editor from handling it
          event.stopPropagation();
          return false;
        },
        focus: (view, event) => {
          // Stop event propagation to prevent main editor from handling it
          event.stopPropagation();
          return false;
        }
      }
    });

    // Set placeholder if provided
    if (config.placeholder) {
      this.setPlaceholder(config.placeholder);
    }

    return this.simpleEditorView;
  }

  getSimpleTextContent(): string {
    if (!this.simpleEditorView) return '';
    
    const doc = this.simpleEditorView.state.doc;
    let text = '';
    
    doc.descendants((node) => {
      if (node.isText) {
        text += node.text;
      } else if (node.type.name === 'hard_break') {
        text += '\n';
      } else if (node.type.name === 'paragraph' && text && !text.endsWith('\n')) {
        text += '\n';
      }
    });
    
    return text.trim();
  }

  private createCodexHighlightingPluginForCurrentStory(): Plugin {
    if (!this.currentStoryContext?.storyId) {
      // Return empty plugin if no story context
      return createCodexHighlightingPlugin({ codexEntries: [] });
    }

    // Get initial codex entries synchronously
    const codex = this.codexService.getCodex(this.currentStoryContext.storyId);
    let codexEntries: CodexEntry[] = [];
    
    if (codex) {
      codexEntries = this.extractAllCodexEntries(codex);
    }
    
    // Subscribe to codex changes to update highlighting dynamically
    this.codexService.codex$.subscribe(codexMap => {
      const updatedCodex = codexMap.get(this.currentStoryContext.storyId!);
      if (updatedCodex) {
        const updatedEntries = this.extractAllCodexEntries(updatedCodex);
        // Update the plugin when codex entries change (for simple text editor)
        if (this.simpleEditorView) {
          updateCodexHighlightingPlugin(this.simpleEditorView, updatedEntries);
        }
      }
    });

    return createCodexHighlightingPlugin({ 
      codexEntries,
      storyId: this.currentStoryContext.storyId
    });
  }

  setSimpleContent(content: string): void {
    if (this.simpleEditorView) {
      const tr = this.simpleEditorView.state.tr.replaceWith(
        0,
        this.simpleEditorView.state.doc.content.size,
        this.simpleEditorView.state.schema.text(content)
      );
      
      this.simpleEditorView.dispatch(tr);
    }
  }

  setContent(content: string): void {
    if (!this.editorView) return;
    
    try {
      const div = document.createElement('div');
      
      // Check if content looks like plain text (no HTML tags)
      if (content && !content.includes('<') && !content.includes('>')) {
        // Convert plain text to HTML paragraphs
        const paragraphs = content
          .split(/\n+/) // Split on any newline (single or multiple)
          .map(para => {
            // Don't filter out empty paragraphs - they represent intentional empty lines
            if (para.trim() === '') {
              return '<p></p>'; // Empty paragraph for empty lines
            }
            return `<p>${para}</p>`; // Each line becomes a separate paragraph
          })
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

  insertBeatAI(position?: number, replaceSlash: boolean = false, beatType: 'story' | 'scene' = 'story'): void {
    if (!this.editorView) return;
    
    try {
      const { state } = this.editorView;
      const pos = position ?? state.selection.from;
      
      
      const beatData = this.beatAIService.createNewBeat(beatType);
      const beatNode = this.editorSchema.nodes['beatAI'].create({
        id: beatData.id,
        prompt: beatData.prompt,
        generatedContent: beatData.generatedContent,
        isGenerating: beatData.isGenerating,
        isEditing: beatData.isEditing,
        createdAt: beatData.createdAt.toISOString(),
        updatedAt: beatData.updatedAt.toISOString(),
        wordCount: beatData.wordCount,
        beatType: beatData.beatType,
        model: beatData.model || ''
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
      plugins: [
        history(),
        keymap({
          'Mod-z': undo,
          'Mod-y': redo,
          'Mod-Shift-z': redo,
          // Explicitly use ProseMirror's native paragraph handling
          'Enter': chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock)
        }),
        keymap(baseKeymap),
        this.createBeatAIPlugin({})
      ]
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
    
    // Clear any existing content after the beat node for regeneration
    if (event.action === 'regenerate') {
      this.clearContentAfterBeatNode(event.beatId);
    }
    
    // Track accumulating content for real-time insertion
    let accumulatedContent = '';
    let isFirstChunk = true;
    
    // Subscribe to streaming generation events
    const generationSubscription = this.beatAIService.generation$.subscribe(generationEvent => {
      if (generationEvent.beatId !== event.beatId) return;
      
      if (!generationEvent.isComplete && generationEvent.chunk) {
        // Stream chunk received - append to accumulated content
        accumulatedContent += generationEvent.chunk;
        
        // For streaming, we append each chunk directly
        if (generationEvent.chunk) {
          this.appendContentAfterBeatNode(event.beatId, generationEvent.chunk, isFirstChunk);
          isFirstChunk = false;
        }
      } else if (generationEvent.isComplete) {
        // Generation completed
        this.updateBeatNode(event.beatId, { 
          isGenerating: false,
          generatedContent: accumulatedContent,
          prompt: event.prompt || ''
        });
        // Clean up stored position
        this.beatStreamingPositions.delete(event.beatId);
        generationSubscription.unsubscribe();
      }
    });
    
    // Generate AI content with streaming
    this.beatAIService.generateBeatContent(event.prompt || '', event.beatId, {
      wordCount: event.wordCount,
      model: event.model,
      storyId: event.storyId,
      chapterId: event.chapterId,
      sceneId: event.sceneId,
      beatPosition: beatNodePosition,
      beatType: event.beatType
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
        this.appendContentAfterBeatNode(event.beatId, 'Fehler bei der Generierung. Bitte versuchen Sie es erneut.', true);
        
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
    
    // Split content by any newlines (single or multiple) to get paragraphs
    const paragraphTexts = content
      .split(/\n+/) // Split on one or more newlines
      .map(para => para.trim()) // Remove leading/trailing whitespace
      .filter((para, index, array) => {
        // Keep non-empty paragraphs and empty paragraphs that are between content
        return para.length > 0 || (index > 0 && index < array.length - 1);
      });
    
    // Create paragraph nodes for each text block
    const paragraphNodes = paragraphTexts.map(paragraphText => {
      // Handle empty paragraphs (represents intentional empty lines)
      if (paragraphText.length === 0) {
        return state.schema.nodes['paragraph'].create();
      }
      
      // Create paragraph with text content
      const textNode = state.schema.text(paragraphText);
      return state.schema.nodes['paragraph'].create(null, [textNode]);
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
    
    // Clear stored position when clearing content
    this.beatStreamingPositions.delete(beatId);
    
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

  private insertContentAfterBeatNode(beatId: string, newContent: string): void {
    if (!this.editorView) return;
    
    const beatPos = this.findBeatNodePosition(beatId);
    if (beatPos === null) return;
    
    const { state } = this.editorView;
    const beatNode = state.doc.nodeAt(beatPos);
    if (!beatNode) return;
    
    // Position after the beat node where we'll insert new content
    const insertPos = beatPos + beatNode.nodeSize;
    
    // Check if there's already generated content from this beat
    const currentContent = beatNode.attrs['generatedContent'] || '';
    
    if (currentContent) {
      // Replace only the previously generated content from this beat
      // Find the range that contains the previously generated content
      let endPos = insertPos;
      let pos = insertPos;
      let contentLength = 0;
      
      // Calculate approximately how much content to replace based on current generated content
      const currentParagraphs = currentContent.split('\n\n').filter((p: string) => p.trim());
      let paragraphsToReplace = currentParagraphs.length;
      
      while (pos < state.doc.content.size && paragraphsToReplace > 0) {
        const node = state.doc.nodeAt(pos);
        if (!node) break;
        
        // Stop if we hit another beat node
        if (node.type.name === 'beatAI') {
          break;
        }
        
        // Replace paragraphs that are likely from the previous generation
        if (node.type.name === 'paragraph') {
          endPos = pos + node.nodeSize;
          pos = endPos;
          paragraphsToReplace--;
        } else {
          // Stop at other node types
          break;
        }
      }
      
      // Replace the range with new content
      const paragraphNodes = this.createParagraphsFromContent(newContent, state);
      const fragment = Fragment.from(paragraphNodes);
      const slice = new Slice(fragment, 0, 0);
      const tr = state.tr.replaceRange(insertPos, endPos, slice);
      this.editorView.dispatch(tr);
    } else {
      // First generation - just insert the content
      const paragraphNodes = this.createParagraphsFromContent(newContent, state);
      const fragment = Fragment.from(paragraphNodes);
      const tr = state.tr.insert(insertPos, fragment);
      this.editorView.dispatch(tr);
    }
  }

  private appendContentAfterBeatNode(beatId: string, newContent: string, isFirstChunk: boolean = false): void {
    if (!this.editorView) return;
    
    const beatPos = this.findBeatNodePosition(beatId);
    if (beatPos === null) return;
    
    const { state } = this.editorView;
    const beatNode = state.doc.nodeAt(beatPos);
    if (!beatNode) return;
    
    // Position immediately after the beat node
    const afterBeatPos = beatPos + beatNode.nodeSize;
    
    if (isFirstChunk) {
      // First chunk - clear any stored position and insert fresh
      this.beatStreamingPositions.delete(beatId);
      
      // Create paragraph nodes from content
      const paragraphNodes = this.createParagraphsFromContent(newContent, state);
      const fragment = Fragment.from(paragraphNodes);
      
      // Insert at position directly after beat node
      const tr = state.tr.insert(afterBeatPos, fragment);
      this.editorView.dispatch(tr);
      
      // Store the end position for this beat's content
      // We need to account for the fact that the document has changed
      const newBeatPos = this.findBeatNodePosition(beatId);
      if (newBeatPos !== null) {
        const newAfterBeatPos = newBeatPos + beatNode.nodeSize;
        this.beatStreamingPositions.set(beatId, newAfterBeatPos + fragment.size);
      }
    } else {
      // Subsequent chunks - use stored position or recalculate
      let insertPos = this.beatStreamingPositions.get(beatId);
      
      if (!insertPos) {
        // Fallback: recalculate position by finding end of generated content
        insertPos = afterBeatPos;
        let pos = afterBeatPos;
        
        // Find the last paragraph after this beat before hitting another beat or non-paragraph
        while (pos < state.doc.content.size) {
          const node = state.doc.nodeAt(pos);
          if (!node) break;
          
          if (node.type.name === 'beatAI') {
            // Hit another beat, stop here
            break;
          }
          
          if (node.type.name === 'paragraph') {
            // Update insert position to after this paragraph
            insertPos = pos + node.nodeSize;
            pos = insertPos;
          } else {
            // Non-paragraph content, stop
            break;
          }
        }
      }
      
      // Try to append to existing paragraph if possible
      if (insertPos > afterBeatPos) {
        const beforeInsertPos = insertPos - 1;
        const resolvedPos = state.doc.resolve(beforeInsertPos);
        
        if (resolvedPos.parent && resolvedPos.parent.type.name === 'paragraph' && !newContent.startsWith('\n\n')) {
          // Append to existing paragraph
          const tr = state.tr.insertText(newContent, beforeInsertPos);
          this.editorView.dispatch(tr);
          
          // Update stored position
          this.beatStreamingPositions.set(beatId, insertPos + newContent.length);
        } else {
          // Create new paragraph(s)
          const paragraphNodes = this.createParagraphsFromContent(newContent, state);
          const fragment = Fragment.from(paragraphNodes);
          const tr = state.tr.insert(insertPos, fragment);
          this.editorView.dispatch(tr);
          
          // Update stored position
          this.beatStreamingPositions.set(beatId, insertPos + fragment.size);
        }
      } else {
        // No existing content, insert right after beat
        const paragraphNodes = this.createParagraphsFromContent(newContent, state);
        const fragment = Fragment.from(paragraphNodes);
        const tr = state.tr.insert(afterBeatPos, fragment);
        this.editorView.dispatch(tr);
        
        // Store position for next chunks
        this.beatStreamingPositions.set(beatId, afterBeatPos + fragment.size);
      }
    }
  }

  private createCodexHighlightingPlugin(config: EditorConfig): Plugin {
    // Get initial codex entries
    let codexEntries: CodexEntry[] = [];
    
    if (config.storyContext?.storyId) {
      this.codexService.codex$.subscribe(codexMap => {
        const codex = codexMap.get(config.storyContext!.storyId!);
        if (codex) {
          codexEntries = this.extractAllCodexEntries(codex);
          // Update the plugin when codex entries change
          if (this.editorView) {
            updateCodexHighlightingPlugin(this.editorView, codexEntries);
          }
        }
      });
    }

    return createCodexHighlightingPlugin({
      codexEntries,
      storyId: config.storyContext?.storyId
    });
  }

  private extractAllCodexEntries(codex: any): CodexEntry[] {
    const entries: CodexEntry[] = [];
    
    if (codex.categories) {
      for (const category of codex.categories) {
        if (category.entries) {
          entries.push(...category.entries);
        }
      }
    }
    
    return entries;
  }


  toggleDebugMode(enabled: boolean): void {
    if (!this.editorView) return;
    
    this.debugMode = enabled;
    
    if (enabled) {
      // Add debug class to the parent element that contains .ProseMirror
      const editorContainer = this.editorView.dom.parentElement;
      if (editorContainer) {
        editorContainer.classList.add('pm-debug-mode');
      }
      
      // Add styles if not already present
      if (!document.getElementById('pm-debug-styles')) {
        const style = document.createElement('style');
        style.id = 'pm-debug-styles';
        style.textContent = `
          .pm-debug-mode .ProseMirror {
            position: relative;
            background: rgba(255, 255, 255, 0.02);
          }
          .pm-debug-mode .ProseMirror > * {
            position: relative;
            border: 1px dashed rgba(255, 255, 255, 0.3) !important;
            margin: 2px !important;
          }
          .pm-debug-mode .ProseMirror > p::before {
            content: "paragraph";
            position: absolute;
            top: -18px;
            left: 0;
            font-size: 10px;
            color: #ffa500;
            background: rgba(0, 0, 0, 0.9);
            padding: 2px 4px;
            border-radius: 2px;
            z-index: 1000;
            pointer-events: none;
          }
          .pm-debug-mode .ProseMirror > h1::before,
          .pm-debug-mode .ProseMirror > h2::before,
          .pm-debug-mode .ProseMirror > h3::before,
          .pm-debug-mode .ProseMirror > h4::before,
          .pm-debug-mode .ProseMirror > h5::before,
          .pm-debug-mode .ProseMirror > h6::before {
            content: "heading";
            position: absolute;
            top: -18px;
            left: 0;
            font-size: 10px;
            color: #ffa500;
            background: rgba(0, 0, 0, 0.9);
            padding: 2px 4px;
            border-radius: 2px;
            z-index: 1000;
            pointer-events: none;
          }
          .pm-debug-mode .ProseMirror > div.beat-ai-node::before {
            content: "beatAI";
            position: absolute;
            top: -18px;
            left: 0;
            font-size: 10px;
            color: #ffa500;
            background: rgba(0, 0, 0, 0.9);
            padding: 2px 4px;
            border-radius: 2px;
            z-index: 1000;
            pointer-events: none;
          }
          .pm-debug-mode .ProseMirror > ul::before,
          .pm-debug-mode .ProseMirror > ol::before {
            content: "list";
            position: absolute;
            top: -18px;
            left: 0;
            font-size: 10px;
            color: #ffa500;
            background: rgba(0, 0, 0, 0.9);
            padding: 2px 4px;
            border-radius: 2px;
            z-index: 1000;
            pointer-events: none;
          }
          .pm-debug-mode .ProseMirror > blockquote::before {
            content: "blockquote";
            position: absolute;
            top: -18px;
            left: 0;
            font-size: 10px;
            color: #ffa500;
            background: rgba(0, 0, 0, 0.9);
            padding: 2px 4px;
            border-radius: 2px;
            z-index: 1000;
            pointer-events: none;
          }
          .pm-debug-mode .ProseMirror > img::before {
            content: "image";
            position: absolute;
            top: -18px;
            left: 0;
            font-size: 10px;
            color: #ffa500;
            background: rgba(0, 0, 0, 0.9);
            padding: 2px 4px;
            border-radius: 2px;
            z-index: 1000;
            pointer-events: none;
          }
          /* Inline elements */
          .pm-debug-mode .ProseMirror strong {
            border: 1px dotted rgba(255, 165, 0, 0.5) !important;
            padding: 0 2px;
          }
          .pm-debug-mode .ProseMirror em {
            border: 1px dotted rgba(255, 165, 0, 0.5) !important;
            padding: 0 2px;
          }
          .pm-debug-mode .ProseMirror code {
            border: 1px dotted rgba(255, 165, 0, 0.5) !important;
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      // Remove debug mode
      const editorContainer = this.editorView.dom.parentElement;
      if (editorContainer) {
        editorContainer.classList.remove('pm-debug-mode');
      }
    }
  }
}