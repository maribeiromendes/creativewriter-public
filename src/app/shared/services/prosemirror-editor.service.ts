import { Injectable, Injector, ApplicationRef, EnvironmentInjector } from '@angular/core';
import { EditorState, Transaction, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { Subject } from 'rxjs';
import { BeatAINodeView } from './beat-ai-nodeview';
import { BeatAI, BeatAIPromptEvent, BeatContentInsertEvent } from '../../stories/models/beat-ai.interface';
import { BeatAIService } from './beat-ai.service';

export interface EditorConfig {
  placeholder?: string;
  onUpdate?: (content: string) => void;
  onSlashCommand?: (position: number) => void;
  onBeatPromptSubmit?: (event: BeatAIPromptEvent) => void;
  onBeatContentUpdate?: (beatData: BeatAI) => void;
  onBeatFocus?: () => void;
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
  
  public contentUpdate$ = new Subject<string>();
  public slashCommand$ = new Subject<number>();

  constructor(
    private injector: Injector,
    private appRef: ApplicationRef,
    private envInjector: EnvironmentInjector,
    private beatAIService: BeatAIService
  ) {
    // Create schema with basic nodes, list support, and beat AI node
    const baseNodes = addListNodes(schema.spec.nodes, 'paragraph block*', 'block');
    
    // Add beat AI node to schema
    const extendedNodes = baseNodes.append({
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
          config.storyContext
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
        if (transaction.selection) {
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
      div.innerHTML = content || '<p></p>';
      
      
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

  destroy(): void {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
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
    
    // Start generation process and update prompt
    this.updateBeatNode(event.beatId, { 
      isGenerating: true, 
      generatedContent: '',
      prompt: event.prompt 
    });
    
    // Find the beat node position to insert content after it
    const beatNodePosition = this.findBeatNodePosition(event.beatId);
    if (beatNodePosition === null) return;
    
    // Generate AI content and insert the final result
    this.beatAIService.generateBeatContent(event.prompt, event.beatId, {
      wordCount: event.wordCount,
      model: event.model,
      storyId: event.storyId,
      chapterId: event.chapterId,
      sceneId: event.sceneId
    }).subscribe({
      next: (content) => {
        // Insert the complete content in editor after the beat node
        this.insertContentAfterBeatNode(event.beatId, content);
        this.updateBeatNode(event.beatId, { 
          isGenerating: false,
          generatedContent: content,
          prompt: event.prompt
        });
      },
      error: (error) => {
        console.error('Beat generation failed:', error);
        this.insertContentAfterBeatNode(event.beatId, 'Fehler bei der Generierung. Bitte versuchen Sie es erneut.');
        this.updateBeatNode(event.beatId, { 
          isGenerating: false,
          generatedContent: 'Fehler bei der Generierung. Bitte versuchen Sie es erneut.',
          prompt: event.prompt
        });
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
    
    // Create paragraph with the generated content
    const paragraph = state.schema.nodes['paragraph'].create(null, [
      state.schema.text(content)
    ]);
    
    // Check if there's already a paragraph right after this beat node
    const nextNode = state.doc.nodeAt(insertPos);
    let tr;
    
    if (nextNode && nextNode.type.name === 'paragraph' && this.isGeneratedContent(nextNode, beatId)) {
      // Replace the existing generated content paragraph
      const nextNodeEnd = insertPos + nextNode.nodeSize;
      tr = state.tr.replaceRangeWith(insertPos, nextNodeEnd, paragraph);
    } else {
      // Insert new content
      tr = state.tr.insert(insertPos, paragraph);
    }
    
    this.editorView.dispatch(tr);
  }

  private isGeneratedContent(node: ProseMirrorNode, beatId: string): boolean {
    // Check if this paragraph is likely generated content by looking at its position
    // and checking if it contains typical AI-generated patterns
    if (!node.textContent) return false;
    
    // Simple heuristic: if it's a paragraph right after a beat node and contains
    // typical story content patterns, consider it generated content
    const text = node.textContent.toLowerCase();
    const hasStoryPatterns = text.includes('protagonist') || 
                           text.includes('betritt') || 
                           text.includes('moment') || 
                           text.includes('atmosphäre') ||
                           text.length > 50; // Longer paragraphs are likely generated
    
    return hasStoryPatterns;
  }

  private checkSlashCommand(state: EditorState, onSlashCommand?: (position: number) => void): void {
    const { selection } = state;
    const { from } = selection;
    
    // Get text before cursor
    const textBefore = state.doc.textBetween(Math.max(0, from - 10), from);
    
    // Check if we just typed a slash
    // But don't trigger if we're inside a beat AI node
    const nodeAtPos = state.doc.resolve(from).parent;
    const isInBeatNode = nodeAtPos.type.name === 'beatAI';
    
    // Allow slash command at beginning of line, after whitespace, or after punctuation
    if (!isInBeatNode && textBefore.endsWith('/')) {
      const charBeforeSlash = textBefore.length > 1 ? textBefore[textBefore.length - 2] : '';
      const allowedPrevChars = charBeforeSlash === '' || 
                              /\s/.test(charBeforeSlash) || 
                              /[.!?]/.test(charBeforeSlash);
      
      if (allowedPrevChars) {
        this.slashCommand$.next(from);
        onSlashCommand?.(from);
      }
    }
  }

  updateStoryContext(storyContext: { storyId?: string; chapterId?: string; sceneId?: string }): void {
    if (!this.editorView) return;

    // Update all existing BeatAI node views with new context
    this.editorView.state.doc.descendants((node, pos) => {
      if (node.type.name === 'beatAI') {
        const nodeView = (this.editorView as any).nodeViews[pos] as BeatAINodeView;
        if (nodeView && nodeView.componentRef) {
          nodeView.componentRef.instance.storyId = storyContext.storyId;
          nodeView.componentRef.instance.chapterId = storyContext.chapterId;
          nodeView.componentRef.instance.sceneId = storyContext.sceneId;
          nodeView.componentRef.changeDetectorRef?.detectChanges();
        }
      }
    });
  }
}