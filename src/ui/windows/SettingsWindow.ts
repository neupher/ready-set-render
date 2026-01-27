/**
 * SettingsWindow
 *
 * Non-modal, draggable, resizable window for application settings.
 * Uses a two-panel layout: left panel shows categories, right panel shows settings content.
 * Allows live editing while viewing the viewport.
 *
 * @example
 * ```typescript
 * const settingsWindow = new SettingsWindow({
 *   settingsService,
 *   eventBus,
 * });
 * settingsWindow.show();
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { SettingsService } from '@core/SettingsService';
import { GridSettingsPanel } from './panels/GridSettingsPanel';

/**
 * Settings category definition.
 */
interface SettingsCategory {
  id: string;
  label: string;
  icon: string;
}

/**
 * Available settings categories.
 */
const CATEGORIES: SettingsCategory[] = [
  { id: 'grid', label: 'Grid', icon: '⊞' },
  // Future categories:
  // { id: 'themes', label: 'Themes', icon: '🎨' },
  // { id: 'hotkeys', label: 'Hotkeys', icon: '⌨' },
];

/**
 * Options for SettingsWindow constructor.
 */
export interface SettingsWindowOptions {
  /** Settings service for reading/writing values */
  settingsService: SettingsService;
  /** Event bus for communication */
  eventBus: EventBus;
}

/**
 * Drag state for window movement.
 */
interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
}

/**
 * Resize state for window resizing.
 */
interface ResizeState {
  isResizing: boolean;
  direction: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startLeft: number;
  startTop: number;
}

/**
 * Settings window component.
 * Provides a non-modal, draggable, resizable dialog with categorized settings panels.
 */
export class SettingsWindow {
  private readonly settingsService: SettingsService;
  private readonly eventBus: EventBus;

  private container: HTMLDivElement | null = null;
  private contentArea: HTMLDivElement | null = null;
  private activeCategory: string = 'grid';

  // Cached panels
  private gridSettingsPanel: GridSettingsPanel | null = null;

  // Drag state
  private dragState: DragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
  };

  // Resize state
  private resizeState: ResizeState = {
    isResizing: false,
    direction: '',
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startLeft: 0,
    startTop: 0,
  };

  // Window dimensions
  private readonly minWidth = 400;
  private readonly minHeight = 300;
  private readonly defaultWidth = 500;
  private readonly defaultHeight = 400;

  // Bound handlers for cleanup
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: () => void;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;

  constructor(options: SettingsWindowOptions) {
    this.settingsService = options.settingsService;
    this.eventBus = options.eventBus;

    // Bind handlers
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Show the settings window.
   */
  show(): void {
    if (this.container) {
      // Already visible - bring to front
      this.bringToFront();
      return;
    }

    this.createWindow();
    this.selectCategory(this.activeCategory);

    // Emit event
    this.eventBus.emit('settings:window:opened');
  }

  /**
   * Hide the settings window.
   */
  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.contentArea = null;

      // Remove global event listeners
      document.removeEventListener('mousemove', this.boundHandleMouseMove);
      document.removeEventListener('mouseup', this.boundHandleMouseUp);
      document.removeEventListener('keydown', this.boundHandleKeyDown);

      // Emit event
      this.eventBus.emit('settings:window:closed');
    }
  }

  /**
   * Toggle the settings window visibility.
   */
  toggle(): void {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if the window is currently visible.
   */
  isVisible(): boolean {
    return this.container !== null;
  }

  /**
   * Bring the window to front using z-index instead of DOM manipulation.
   * This preserves scroll position and other state.
   */
  private bringToFront(): void {
    if (this.container) {
      // Use a high z-index to bring to front without DOM manipulation
      // This preserves scroll position and avoids re-rendering
      this.container.style.zIndex = '1001';

      // Reset other settings windows to normal z-index (if multiple exist in future)
      // For now, just ensure this one is on top
    }
  }

  /**
   * Create the window DOM structure.
   */
  private createWindow(): void {
    // Create container (floating window, no overlay)
    this.container = document.createElement('div');
    this.container.className = 'settings-window floating';

    // Set initial position and size
    this.container.style.width = `${this.defaultWidth}px`;
    this.container.style.height = `${this.defaultHeight}px`;

    // Center on screen
    const left = Math.max(50, (window.innerWidth - this.defaultWidth) / 2);
    const top = Math.max(50, (window.innerHeight - this.defaultHeight) / 2);
    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;

    // Create header (draggable)
    const header = document.createElement('div');
    header.className = 'settings-window-header';
    header.innerHTML = `
      <span class="settings-window-title">Settings</span>
      <button class="settings-window-close" title="Close (Esc)">×</button>
    `;

    // Make header draggable
    header.addEventListener('mousedown', (e) => {
      // Don't drag if clicking on close button
      if ((e.target as HTMLElement).classList.contains('settings-window-close')) {
        return;
      }
      this.startDrag(e);
    });

    const closeButton = header.querySelector('.settings-window-close');
    closeButton?.addEventListener('click', () => this.hide());

    // Create body with two-panel layout
    const body = document.createElement('div');
    body.className = 'settings-window-body';

    // Left panel - categories
    const leftPanel = document.createElement('div');
    leftPanel.className = 'settings-categories';

    for (const category of CATEGORIES) {
      const item = document.createElement('button');
      item.className = 'settings-category-item';
      item.dataset.category = category.id;
      item.innerHTML = `
        <span class="settings-category-icon">${category.icon}</span>
        <span class="settings-category-label">${category.label}</span>
      `;
      item.addEventListener('click', () => this.selectCategory(category.id));
      leftPanel.appendChild(item);
    }

    // Right panel - content area
    this.contentArea = document.createElement('div');
    this.contentArea.className = 'settings-content';

    // Create resize handles
    const resizeHandles = this.createResizeHandles();

    // Assemble
    body.appendChild(leftPanel);
    body.appendChild(this.contentArea);
    this.container.appendChild(header);
    this.container.appendChild(body);
    resizeHandles.forEach((handle) => this.container!.appendChild(handle));

    // Add to document
    document.body.appendChild(this.container);

    // Add global event listeners
    document.addEventListener('mousemove', this.boundHandleMouseMove);
    document.addEventListener('mouseup', this.boundHandleMouseUp);
    document.addEventListener('keydown', this.boundHandleKeyDown);

    // Focus window for keyboard events
    this.container.addEventListener('mousedown', () => this.bringToFront());
  }

  /**
   * Create resize handles for all edges and corners.
   */
  private createResizeHandles(): HTMLDivElement[] {
    const handles: HTMLDivElement[] = [];
    const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

    for (const dir of directions) {
      const handle = document.createElement('div');
      handle.className = `settings-resize-handle settings-resize-${dir}`;
      handle.addEventListener('mousedown', (e) => this.startResize(e, dir));
      handles.push(handle);
    }

    return handles;
  }

  /**
   * Start dragging the window.
   */
  private startDrag(e: MouseEvent): void {
    if (!this.container) return;

    e.preventDefault();

    this.dragState = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: this.container.offsetLeft,
      startTop: this.container.offsetTop,
    };

    this.container.classList.add('dragging');
  }

  /**
   * Start resizing the window.
   */
  private startResize(e: MouseEvent, direction: string): void {
    if (!this.container) return;

    e.preventDefault();
    e.stopPropagation();

    this.resizeState = {
      isResizing: true,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: this.container.offsetWidth,
      startHeight: this.container.offsetHeight,
      startLeft: this.container.offsetLeft,
      startTop: this.container.offsetTop,
    };

    this.container.classList.add('resizing');
  }

  /**
   * Handle mouse move for dragging and resizing.
   */
  private handleMouseMove(e: MouseEvent): void {
    if (this.dragState.isDragging) {
      this.handleDrag(e);
    } else if (this.resizeState.isResizing) {
      this.handleResize(e);
    }
  }

  /**
   * Handle window drag.
   */
  private handleDrag(e: MouseEvent): void {
    if (!this.container) return;

    const dx = e.clientX - this.dragState.startX;
    const dy = e.clientY - this.dragState.startY;

    let newLeft = this.dragState.startLeft + dx;
    let newTop = this.dragState.startTop + dy;

    // Keep window within viewport bounds
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 100));
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - 50));

    this.container.style.left = `${newLeft}px`;
    this.container.style.top = `${newTop}px`;
  }

  /**
   * Handle window resize.
   */
  private handleResize(e: MouseEvent): void {
    if (!this.container) return;

    const dx = e.clientX - this.resizeState.startX;
    const dy = e.clientY - this.resizeState.startY;
    const dir = this.resizeState.direction;

    let newWidth = this.resizeState.startWidth;
    let newHeight = this.resizeState.startHeight;
    let newLeft = this.resizeState.startLeft;
    let newTop = this.resizeState.startTop;

    // Handle horizontal resize
    if (dir.includes('e')) {
      newWidth = Math.max(this.minWidth, this.resizeState.startWidth + dx);
    }
    if (dir.includes('w')) {
      const proposedWidth = this.resizeState.startWidth - dx;
      if (proposedWidth >= this.minWidth) {
        newWidth = proposedWidth;
        newLeft = this.resizeState.startLeft + dx;
      }
    }

    // Handle vertical resize
    if (dir.includes('s')) {
      newHeight = Math.max(this.minHeight, this.resizeState.startHeight + dy);
    }
    if (dir.includes('n')) {
      const proposedHeight = this.resizeState.startHeight - dy;
      if (proposedHeight >= this.minHeight) {
        newHeight = proposedHeight;
        newTop = this.resizeState.startTop + dy;
      }
    }

    // Apply changes
    this.container.style.width = `${newWidth}px`;
    this.container.style.height = `${newHeight}px`;
    this.container.style.left = `${newLeft}px`;
    this.container.style.top = `${newTop}px`;
  }

  /**
   * Handle mouse up - end dragging or resizing.
   */
  private handleMouseUp(): void {
    if (this.dragState.isDragging) {
      this.dragState.isDragging = false;
      this.container?.classList.remove('dragging');
    }

    if (this.resizeState.isResizing) {
      this.resizeState.isResizing = false;
      this.container?.classList.remove('resizing');
    }
  }

  /**
   * Handle keyboard events.
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isVisible()) {
      this.hide();
    }
  }

  /**
   * Select a settings category.
   */
  private selectCategory(categoryId: string): void {
    this.activeCategory = categoryId;

    if (!this.contentArea || !this.container) {
      return;
    }

    // Update active state on category buttons
    const items = this.container.querySelectorAll('.settings-category-item');
    items.forEach((item) => {
      const btn = item as HTMLButtonElement;
      btn.classList.toggle('active', btn.dataset.category === categoryId);
    });

    // Clear and render content
    this.contentArea.innerHTML = '';

    switch (categoryId) {
      case 'grid':
        if (!this.gridSettingsPanel) {
          this.gridSettingsPanel = new GridSettingsPanel({
            settingsService: this.settingsService,
          });
        } else {
          this.gridSettingsPanel.refresh();
        }
        this.contentArea.appendChild(this.gridSettingsPanel.element);
        break;

      default:
        this.contentArea.innerHTML = `
          <div class="settings-placeholder">
            <p>Settings for "${categoryId}" coming soon.</p>
          </div>
        `;
    }
  }
}
