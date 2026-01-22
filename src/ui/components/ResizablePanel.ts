/**
 * ResizablePanel Component
 *
 * A panel that can be resized by dragging its edge.
 * Used for side panels (Hierarchy, Properties).
 *
 * @example
 * ```ts
 * const panel = new ResizablePanel({
 *   side: 'left',
 *   defaultWidth: 280,
 *   minWidth: 200,
 *   maxWidth: 500
 * });
 * panel.setContent(hierarchyPanel);
 * container.appendChild(panel.element);
 * ```
 */

export interface ResizablePanelOptions {
  /** Which side the panel is on */
  side: 'left' | 'right';
  /** Default panel width in pixels */
  defaultWidth?: number;
  /** Minimum width in pixels */
  minWidth?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Callback when resizing occurs */
  onResize?: (width: number) => void;
}

/**
 * Resizable panel with drag handle.
 * NOT a plugin - standard UI component.
 */
export class ResizablePanel {
  private readonly container: HTMLDivElement;
  private readonly content: HTMLDivElement;
  private readonly handle: HTMLDivElement;

  private readonly side: 'left' | 'right';
  private readonly minWidth: number;
  private readonly maxWidth: number;
  private readonly onResize?: (width: number) => void;

  private currentWidth: number;
  private isResizing = false;
  private startX = 0;
  private startWidth = 0;

  // Bound handlers for proper cleanup
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  constructor(options: ResizablePanelOptions) {
    this.side = options.side;
    this.currentWidth = options.defaultWidth ?? 280;
    this.minWidth = options.minWidth ?? 200;
    this.maxWidth = options.maxWidth ?? 500;
    this.onResize = options.onResize;

    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);

    // Create container
    this.container = document.createElement('div');
    this.container.className = `resizable-panel panel`;
    this.container.style.width = `${this.currentWidth}px`;
    this.container.style.borderRight = this.side === 'left' ? '1px solid var(--border-primary)' : 'none';
    this.container.style.borderLeft = this.side === 'right' ? '1px solid var(--border-primary)' : 'none';

    // Create content area
    this.content = document.createElement('div');
    this.content.className = 'panel-wrapper';
    this.content.style.width = '100%';
    this.content.style.height = '100%';
    this.content.style.overflow = 'hidden';

    // Create resize handle
    this.handle = document.createElement('div');
    this.handle.className = `resize-handle resize-handle-${this.side === 'left' ? 'right' : 'left'}`;

    // Assemble
    this.container.appendChild(this.content);
    this.container.appendChild(this.handle);

    this.setupEvents();
  }

  /**
   * Get the root DOM element.
   */
  get element(): HTMLDivElement {
    return this.container;
  }

  /**
   * Get the current width.
   */
  getWidth(): number {
    return this.currentWidth;
  }

  /**
   * Set the panel width.
   */
  setWidth(width: number): void {
    this.currentWidth = Math.max(this.minWidth, Math.min(this.maxWidth, width));
    this.container.style.width = `${this.currentWidth}px`;
    if (this.onResize) {
      this.onResize(this.currentWidth);
    }
  }

  /**
   * Set the content of the panel.
   */
  setContent(element: HTMLElement): void {
    this.content.innerHTML = '';
    this.content.appendChild(element);
  }

  /**
   * Clean up event listeners.
   */
  dispose(): void {
    this.handle.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private setupEvents(): void {
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handle.addEventListener('mousedown', this.handleMouseDown);
  }

  private handleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.isResizing = true;
    this.startX = e.clientX;
    this.startWidth = this.currentWidth;

    this.handle.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isResizing) return;

    const deltaX = e.clientX - this.startX;
    let newWidth: number;

    if (this.side === 'left') {
      newWidth = this.startWidth + deltaX;
    } else {
      newWidth = this.startWidth - deltaX;
    }

    this.setWidth(newWidth);
  }

  private handleMouseUp(): void {
    if (!this.isResizing) return;

    this.isResizing = false;
    this.handle.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }
}
