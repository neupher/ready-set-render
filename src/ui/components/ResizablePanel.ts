/**
 * ResizablePanel Component
 *
 * A panel that can be resized by dragging its edge.
 * Used for side panels (Hierarchy, Properties, Assets).
 * Supports collapsible mode where the panel can be collapsed to a narrow bar.
 *
 * @example
 * ```ts
 * const panel = new ResizablePanel({
 *   side: 'left',
 *   defaultWidth: 280,
 *   minWidth: 200,
 *   maxWidth: 500,
 *   collapsible: true
 * });
 * panel.setContent(hierarchyPanel);
 * container.appendChild(panel.element);
 * ```
 */

/** Width of the collapsed panel bar in pixels */
const COLLAPSED_WIDTH = 28;

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
  /** Whether the panel can be collapsed */
  collapsible?: boolean;
  /** Initial collapsed state */
  collapsed?: boolean;
  /** Panel title (shown in collapsed state) */
  title?: string;
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
}

/**
 * Resizable panel with drag handle.
 * NOT a plugin - standard UI component.
 */
export class ResizablePanel {
  private readonly container: HTMLDivElement;
  private readonly content: HTMLDivElement;
  private readonly handle: HTMLDivElement;
  private readonly collapsedBar: HTMLDivElement | null = null;
  private readonly collapseButton: HTMLButtonElement | null = null;

  private readonly side: 'left' | 'right';
  private readonly minWidth: number;
  private readonly maxWidth: number;
  private readonly onResize?: (width: number) => void;
  private readonly collapsible: boolean;
  private readonly title: string;
  private readonly onCollapseChange?: (collapsed: boolean) => void;

  private currentWidth: number;
  private expandedWidth: number;
  private isResizing = false;
  private isCollapsed = false;
  private startX = 0;
  private startWidth = 0;

  // Bound handlers for proper cleanup
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  constructor(options: ResizablePanelOptions) {
    this.side = options.side;
    this.currentWidth = options.defaultWidth ?? 280;
    this.expandedWidth = this.currentWidth;
    this.minWidth = options.minWidth ?? 200;
    this.maxWidth = options.maxWidth ?? 500;
    this.onResize = options.onResize;
    this.collapsible = options.collapsible ?? false;
    this.title = options.title ?? '';
    this.onCollapseChange = options.onCollapseChange;

    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);

    // Create container
    this.container = document.createElement('div');
    this.container.className = `resizable-panel panel`;
    this.container.style.width = `${this.currentWidth}px`;
    this.container.style.borderRight = this.side === 'left' ? '1px solid var(--border-primary)' : 'none';
    this.container.style.borderLeft = this.side === 'right' ? '1px solid var(--border-primary)' : 'none';
    this.container.style.transition = 'width var(--transition-slow)';
    this.container.style.position = 'relative';

    // Create content area
    this.content = document.createElement('div');
    this.content.className = 'panel-wrapper';
    this.content.style.width = '100%';
    this.content.style.height = '100%';
    this.content.style.overflow = 'hidden';

    // Create resize handle
    this.handle = document.createElement('div');
    this.handle.className = `resize-handle resize-handle-${this.side === 'left' ? 'right' : 'left'}`;

    // Create collapsed bar if collapsible
    if (this.collapsible) {
      this.collapsedBar = this.createCollapsedBar();
      this.collapseButton = this.createCollapseButton();
    }

    // Assemble
    this.container.appendChild(this.content);
    this.container.appendChild(this.handle);
    if (this.collapseButton) {
      this.container.appendChild(this.collapseButton);
    }
    if (this.collapsedBar) {
      this.container.appendChild(this.collapsedBar);
    }

    // Set initial collapsed state
    if (options.collapsed) {
      this.collapse();
    }

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
   * Check if the panel is collapsed.
   */
  get collapsed(): boolean {
    return this.isCollapsed;
  }

  /**
   * Collapse the panel.
   */
  collapse(): void {
    if (this.isCollapsed || !this.collapsible) return;

    this.expandedWidth = this.currentWidth;
    this.isCollapsed = true;
    this.currentWidth = COLLAPSED_WIDTH;

    this.container.style.width = `${COLLAPSED_WIDTH}px`;
    this.container.classList.add('collapsed');
    this.content.style.display = 'none';
    this.handle.style.display = 'none';

    if (this.collapsedBar) {
      this.collapsedBar.style.display = 'flex';
    }
    if (this.collapseButton) {
      this.collapseButton.style.display = 'none';
    }

    this.onCollapseChange?.(true);
  }

  /**
   * Expand the panel.
   */
  expand(): void {
    if (!this.isCollapsed || !this.collapsible) return;

    this.isCollapsed = false;
    this.currentWidth = this.expandedWidth;

    this.container.style.width = `${this.expandedWidth}px`;
    this.container.classList.remove('collapsed');
    this.content.style.display = 'block';
    this.handle.style.display = 'block';

    if (this.collapsedBar) {
      this.collapsedBar.style.display = 'none';
    }
    if (this.collapseButton) {
      this.collapseButton.style.display = 'flex';
    }

    this.onCollapseChange?.(false);
  }

  /**
   * Toggle collapsed state.
   */
  toggle(): void {
    if (this.isCollapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  /**
   * Clean up event listeners.
   */
  dispose(): void {
    this.handle.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  /**
   * Create the collapsed bar (shown when panel is collapsed).
   */
  private createCollapsedBar(): HTMLDivElement {
    const bar = document.createElement('div');
    bar.className = 'resizable-panel-collapsed-bar';
    bar.style.cssText = `
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      height: 100%;
      padding: var(--spacing-sm) 0;
      cursor: pointer;
    `;

    // Vertical title
    if (this.title) {
      const titleEl = document.createElement('span');
      titleEl.className = 'resizable-panel-collapsed-title';
      titleEl.textContent = this.title;
      titleEl.style.cssText = `
        writing-mode: vertical-rl;
        text-orientation: mixed;
        transform: rotate(180deg);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: var(--spacing-sm);
      `;
      bar.appendChild(titleEl);
    }

    // Expand button icon
    const expandIcon = document.createElement('div');
    expandIcon.className = 'resizable-panel-expand-icon';
    expandIcon.innerHTML = this.side === 'right'
      ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M8 6L4 9V3L8 6Z"/></svg>'
      : '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4 6L8 3V9L4 6Z"/></svg>';
    expandIcon.style.cssText = `
      color: var(--text-muted);
      margin-top: auto;
      margin-bottom: var(--spacing-sm);
    `;
    bar.appendChild(expandIcon);

    bar.addEventListener('click', () => this.expand());

    return bar;
  }

  /**
   * Create the collapse button (shown when panel is expanded).
   */
  private createCollapseButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'resizable-panel-collapse-btn';
    button.title = 'Collapse panel';
    button.innerHTML = this.side === 'right'
      ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4 6L8 3V9L4 6Z"/></svg>'
      : '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M8 6L4 9V3L8 6Z"/></svg>';
    button.style.cssText = `
      position: absolute;
      top: 4px;
      ${this.side === 'right' ? 'left: 4px' : 'right: 4px'};
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: var(--radius-sm);
      z-index: 10;
      transition: all var(--transition-fast);
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = 'var(--bg-hover)';
      button.style.color = 'var(--text-primary)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'transparent';
      button.style.color = 'var(--text-muted)';
    });
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.collapse();
    });

    return button;
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
