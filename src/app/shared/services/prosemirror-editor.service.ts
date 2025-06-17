import { Injectable } from '@angular/core';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, DOMSerializer } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { Subject } from 'rxjs';

export interface EditorConfig {
  placeholder?: string;
  onUpdate?: (content: string) => void;
  onSlashCommand?: (position: number) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ProseMirrorEditorService {
  private editorView: EditorView | null = null;
  private editorSchema: Schema;
  
  public contentUpdate$ = new Subject<string>();
  public slashCommand$ = new Subject<number>();

  constructor() {
    // Create schema with basic nodes and list support
    this.editorSchema = new Schema({
      nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
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
        })
      ]
    });

    this.editorView = new EditorView(element, {
      state,
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
    
    const fragment = DOMSerializer.fromSchema(this.editorSchema)
      .serializeFragment(this.editorView.state.doc.content);
    
    const div = document.createElement('div');
    div.appendChild(fragment);
    return div.innerHTML;
  }

  getTextContent(): string {
    if (!this.editorView) return '';
    return this.editorView.state.doc.textContent;
  }

  insertContent(content: string, position?: number): void {
    if (!this.editorView) return;
    
    const { state } = this.editorView;
    const pos = position ?? state.selection.from;
    
    try {
      const div = document.createElement('div');
      div.innerHTML = content;
      const fragment = DOMParser.fromSchema(this.editorSchema).parseSlice(div);
      
      const tr = state.tr.replaceRange(pos, pos, fragment);
      this.editorView.dispatch(tr);
    } catch (error) {
      console.warn('Failed to insert content:', error);
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

  private checkSlashCommand(state: EditorState, onSlashCommand?: (position: number) => void): void {
    const { selection } = state;
    const { from } = selection;
    
    // Get text before cursor
    const textBefore = state.doc.textBetween(Math.max(0, from - 10), from);
    
    // Check if we just typed a slash at the beginning of a line or after whitespace
    if (textBefore.endsWith('/') && (textBefore.length === 1 || /\s\/$/.test(textBefore))) {
      this.slashCommand$.next(from);
      onSlashCommand?.(from);
    }
  }
}