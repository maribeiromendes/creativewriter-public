import { Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorView, NodeView } from 'prosemirror-view';

export class ResizableImageNodeView implements NodeView {
  dom!: HTMLElement;
  contentDOM?: HTMLElement;
  
  private img!: HTMLImageElement;
  private wrapper!: HTMLDivElement;
  private resizeHandles: HTMLDivElement[] = [];
  private isResizing = false;
  private startX = 0;
  private startY = 0;
  private startWidth = 0;
  private startHeight = 0;
  private aspectRatio = 1;

  constructor(
    private node: ProseMirrorNode,
    private view: EditorView,
    private getPos: () => number
  ) {
    this.createDOM();
  }

  private createDOM(): void {
    // Create wrapper div
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'resizable-image-wrapper';
    this.wrapper.style.cssText = `
      position: relative;
      display: inline-block;
      margin: 1rem auto;
      max-width: 100%;
    `;

    // Create image element
    this.img = document.createElement('img');
    this.img.src = this.node.attrs['src'];
    this.img.alt = this.node.attrs['alt'] || '';
    
    if (this.node.attrs['title']) {
      this.img.title = this.node.attrs['title'];
    }

    // Set initial dimensions
    if (this.node.attrs['width'] && this.node.attrs['height']) {
      this.img.style.width = this.node.attrs['width'] + 'px';
      this.img.style.height = this.node.attrs['height'] + 'px';
    } else {
      this.img.style.maxWidth = '100%';
      this.img.style.height = 'auto';
    }

    this.img.style.cssText += `
      display: block;
      user-select: none;
      pointer-events: auto;
    `;

    // Calculate aspect ratio when image loads
    this.img.onload = () => {
      this.aspectRatio = this.img.naturalWidth / this.img.naturalHeight;
      if (!this.node.attrs['width'] || !this.node.attrs['height']) {
        this.updateNodeSize(this.img.offsetWidth, this.img.offsetHeight);
      }
    };

    // Create resize handles
    this.createResizeHandles();
    
    // Add image to wrapper
    this.wrapper.appendChild(this.img);
    
    // Add resize handles to wrapper
    this.resizeHandles.forEach(handle => {
      this.wrapper.appendChild(handle);
    });

    // Add event listeners
    this.addEventListeners();
    
    this.dom = this.wrapper;
  }

  private createResizeHandles(): void {
    const positions = [
      { class: 'nw', cursor: 'nw-resize', position: 'top: -4px; left: -4px;' },
      { class: 'ne', cursor: 'ne-resize', position: 'top: -4px; right: -4px;' },
      { class: 'sw', cursor: 'sw-resize', position: 'bottom: -4px; left: -4px;' },
      { class: 'se', cursor: 'se-resize', position: 'bottom: -4px; right: -4px;' }
    ];

    positions.forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `resize-handle resize-handle-${pos.class}`;
      handle.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: #007cff;
        border: 1px solid #fff;
        border-radius: 2px;
        cursor: ${pos.cursor};
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 10;
        ${pos.position}
      `;
      
      handle.addEventListener('mousedown', (e) => this.startResize(e, pos.class));
      handle.addEventListener('touchstart', (e) => this.startResize(e, pos.class), { passive: false });
      
      this.resizeHandles.push(handle);
    });
  }

  private addEventListeners(): void {
    // Show/hide resize handles on hover
    this.wrapper.addEventListener('mouseenter', () => {
      if (!this.isResizing) {
        this.resizeHandles.forEach(handle => {
          handle.style.opacity = '1';
        });
      }
    });

    this.wrapper.addEventListener('mouseleave', () => {
      if (!this.isResizing) {
        this.resizeHandles.forEach(handle => {
          handle.style.opacity = '0';
        });
      }
    });

    // Prevent default drag behavior on image
    this.img.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });
  }

  private startResize(e: MouseEvent | TouchEvent, handleClass: string): void {
    e.preventDefault();
    e.stopPropagation();
    
    this.isResizing = true;
    
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
    
    this.startX = clientX;
    this.startY = clientY;
    this.startWidth = this.img.offsetWidth;
    this.startHeight = this.img.offsetHeight;
    
    // Show all handles during resize
    this.resizeHandles.forEach(handle => {
      handle.style.opacity = '1';
    });
    
    // Add document event listeners
    const handleMove = (e: MouseEvent | TouchEvent) => this.handleResize(e, handleClass);
    const handleEnd = () => this.endResize(handleMove, handleEnd);
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  }

  private handleResize(e: MouseEvent | TouchEvent, handleClass: string): void {
    if (!this.isResizing) return;
    
    e.preventDefault();
    
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
    
    const deltaX = clientX - this.startX;
    const deltaY = clientY - this.startY;
    
    let newWidth = this.startWidth;
    let newHeight = this.startHeight;
    
    // Calculate new dimensions based on handle position
    switch (handleClass) {
      case 'se': // Southeast - most common case
        newWidth = this.startWidth + deltaX;
        newHeight = this.startHeight + deltaY;
        break;
      case 'sw': // Southwest
        newWidth = this.startWidth - deltaX;
        newHeight = this.startHeight + deltaY;
        break;
      case 'ne': // Northeast
        newWidth = this.startWidth + deltaX;
        newHeight = this.startHeight - deltaY;
        break;
      case 'nw': // Northwest
        newWidth = this.startWidth - deltaX;
        newHeight = this.startHeight - deltaY;
        break;
    }
    
    // Maintain aspect ratio (hold Shift to disable)
    const maintainAspectRatio = !(e instanceof MouseEvent && e.shiftKey);
    
    if (maintainAspectRatio && this.aspectRatio) {
      const avgScale = Math.max(newWidth / this.startWidth, newHeight / this.startHeight);
      newWidth = this.startWidth * avgScale;
      newHeight = this.startHeight * avgScale;
    }
    
    // Apply minimum constraints
    const minSize = 50;
    newWidth = Math.max(minSize, Math.min(newWidth, this.wrapper.parentElement?.offsetWidth || 800));
    newHeight = Math.max(minSize, newHeight);
    
    // Update image size
    this.img.style.width = newWidth + 'px';
    this.img.style.height = newHeight + 'px';
  }

  private endResize(handleMove: (e: MouseEvent | TouchEvent) => void, handleEnd: () => void): void {
    if (!this.isResizing) return;
    
    this.isResizing = false;
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleEnd);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleEnd);
    
    // Hide handles
    this.resizeHandles.forEach(handle => {
      handle.style.opacity = '0';
    });
    
    // Update the ProseMirror node with new dimensions
    const finalWidth = this.img.offsetWidth;
    const finalHeight = this.img.offsetHeight;
    
    this.updateNodeSize(finalWidth, finalHeight);
  }

  private updateNodeSize(width: number, height: number): void {
    const pos = this.getPos();
    if (pos === null || pos === undefined) return;
    
    const { tr } = this.view.state;
    const newAttrs = {
      ...this.node.attrs,
      width: Math.round(width),
      height: Math.round(height)
    };
    
    tr.setNodeMarkup(pos, null, newAttrs);
    this.view.dispatch(tr);
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) return false;
    
    this.node = node;
    
    // Update image attributes
    this.img.src = node.attrs['src'];
    this.img.alt = node.attrs['alt'] || '';
    
    if (node.attrs['title']) {
      this.img.title = node.attrs['title'];
    }
    
    // Update dimensions if they changed
    if (node.attrs['width'] && node.attrs['height']) {
      this.img.style.width = node.attrs['width'] + 'px';
      this.img.style.height = node.attrs['height'] + 'px';
    }
    
    return true;
  }

  destroy(): void {
    // Clean up event listeners
    this.resizeHandles.forEach(handle => {
      handle.remove();
    });
    this.resizeHandles = [];
  }
}