/**
 * ViewportPanel
 *
 * Displays the WebGL canvas and viewport controls.
 * Supports drag-and-drop of assets from the Asset Browser.
 * NOT a plugin - standard UI panel.
 *
 * @example
 * ```ts
 * const panel = new ViewportPanel({
 *   eventBus,
 *   gl
 * });
 * container.appendChild(panel.element);
 * ```
 */

import { EventBus } from '@core/EventBus';
import type { SettingsService } from '@core/SettingsService';

export interface ViewportPanelOptions {
  /** Event bus for communication */
  eventBus: EventBus;
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
  /** Settings service for grid toggle (optional for backward compatibility) */
  settingsService?: SettingsService;
}

/**
 * Event emitted when an asset is dropped on the viewport.
 */
export interface ViewportDropEvent {
  /** UUID of the dropped asset */
  assetUuid: string;
  /** Type of the dropped asset (e.g., 'model', 'mesh', 'material') */
  assetType: string;
  /** X position in canvas coordinates */
  canvasX: number;
  /** Y position in canvas coordinates */
  canvasY: number;
  /** Normalized device coordinates X (-1 to 1) */
  ndcX: number;
  /** Normalized device coordinates Y (-1 to 1) */
  ndcY: number;
}

/**
 * Grid icon SVG for the viewport toolbar.
 * Uses a 16x16 viewBox for consistent sizing.
 */
const GRID_ICON_SVG = `
<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
  <path d="M1 1h4v4H1V1zm5 0h4v4H6V1zm5 0h4v4h-4V1zM1 6h4v4H1V6zm5 0h4v4H6V6zm5 0h4v4h-4V6zM1 11h4v4H1v-4zm5 0h4v4H6v-4zm5 0h4v4h-4v-4z" opacity="0.8"/>
</svg>
`;

/**
 * Viewport panel displaying the WebGL canvas.
 * NOT a plugin - receives dependencies via constructor.
 */
export class ViewportPanel {
  private readonly container: HTMLDivElement;
  private readonly eventBus: EventBus;
  private readonly gl: WebGL2RenderingContext;
  private readonly settingsService: SettingsService | null;
  private readonly header: HTMLDivElement;
  private readonly canvasContainer: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly status: HTMLDivElement;
  private gridToggleButton: HTMLButtonElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(options: ViewportPanelOptions) {
    this.eventBus = options.eventBus;
    this.gl = options.gl;
    this.settingsService = options.settingsService ?? null;
    this.canvas = this.gl.canvas as HTMLCanvasElement;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'viewport-panel';

    // Create header
    this.header = document.createElement('div');
    this.header.className = 'panel-header viewport-header';

    // Build header content
    this.buildHeader();

    // Create canvas container
    this.canvasContainer = document.createElement('div');
    this.canvasContainer.className = 'viewport-container';

    // Style the canvas
    this.canvas.className = 'viewport-canvas';
    this.canvas.style.display = 'block';

    // Create status overlay (hidden by default - gizmo replaces this)
    this.status = document.createElement('div');
    this.status.className = 'viewport-status';
    this.status.style.display = 'none';

    // Assemble
    this.canvasContainer.appendChild(this.canvas);
    this.canvasContainer.appendChild(this.status);
    this.container.appendChild(this.header);
    this.container.appendChild(this.canvasContainer);

    // Setup resize handling
    this.setupResizeObserver();
    this.setupEvents();
    this.setupDragAndDrop();
  }

  /**
   * Get the root DOM element.
   */
  get element(): HTMLDivElement {
    return this.container;
  }

  /**
   * Get the canvas element.
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get the WebGL context.
   */
  getGL(): WebGL2RenderingContext {
    return this.gl;
  }

  /**
   * Set status message.
   */
  setStatus(message: string): void {
    this.status.textContent = message;
  }

  /**
   * Force resize handling (useful when panel becomes visible).
   */
  resize(): void {
    this.handleResize();
  }

  /**
   * Clean up.
   */
  dispose(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.canvasContainer);
  }

  private setupEvents(): void {
    // Listen for render requests
    this.eventBus.on('render:request', () => {
      this.eventBus.emit('viewport:render');
    });
  }

  /**
   * Setup drag and drop event handlers for the canvas.
   */
  private setupDragAndDrop(): void {
    // Prevent default drag behavior on canvas
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      // Add visual feedback
      this.canvas.style.outline = '2px solid var(--accent-primary)';
    });

    this.canvas.addEventListener('dragleave', () => {
      // Remove visual feedback
      this.canvas.style.outline = '';
    });

    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      // Remove visual feedback
      this.canvas.style.outline = '';

      if (!e.dataTransfer) return;

      const assetUuid = e.dataTransfer.getData('application/x-asset-uuid');
      const assetType = e.dataTransfer.getData('application/x-asset-type');

      if (!assetUuid || !assetType) return;

      // Calculate canvas-relative coordinates
      const rect = this.canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      // Calculate normalized device coordinates (-1 to 1)
      const ndcX = (canvasX / this.canvas.width) * 2 - 1;
      const ndcY = -((canvasY / this.canvas.height) * 2 - 1);

      // Emit viewport drop event
      this.eventBus.emit<ViewportDropEvent>('viewport:drop', {
        assetUuid,
        assetType,
        canvasX,
        canvasY,
        ndcX,
        ndcY,
      });
    });
  }

  private handleResize(): void {
    // Get the actual display size
    const displayWidth = this.canvasContainer.clientWidth;
    const displayHeight = this.canvasContainer.clientHeight;

    // Check if the canvas size matches
    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      // Make the canvas the same size
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;

      // Update viewport
      this.gl.viewport(0, 0, displayWidth, displayHeight);

      // Emit resize event
      this.eventBus.emit('viewport:resized', {
        width: displayWidth,
        height: displayHeight,
        aspectRatio: displayWidth / displayHeight
      });
    }
  }

  /**
   * Build the viewport header with title, controls, and grid toggle.
   */
  private buildHeader(): void {
    // Title
    const title = document.createElement('span');
    title.className = 'panel-header-title';
    title.textContent = 'Viewport';

    // Controls container (right side)
    const controls = document.createElement('div');
    controls.className = 'viewport-controls';

    // Perspective indicator
    const perspective = document.createElement('span');
    perspective.textContent = 'Perspective';
    controls.appendChild(perspective);

    // Separator
    const separator1 = document.createElement('span');
    separator1.textContent = '|';
    controls.appendChild(separator1);

    // Shaded indicator
    const shaded = document.createElement('span');
    shaded.textContent = 'Shaded';
    controls.appendChild(shaded);

    // Separator
    const separator2 = document.createElement('span');
    separator2.textContent = '|';
    controls.appendChild(separator2);

    // Grid toggle button
    this.gridToggleButton = document.createElement('button');
    this.gridToggleButton.className = 'viewport-toolbar-button';
    this.gridToggleButton.title = 'Toggle Grid (G)';
    this.gridToggleButton.innerHTML = GRID_ICON_SVG;

    // Set initial active state based on settings
    if (this.settingsService) {
      const gridVisible = this.settingsService.get('grid', 'visible');
      this.gridToggleButton.classList.toggle('active', gridVisible);

      // Listen for settings changes to update button state
      this.eventBus.on('settings:changed', (data: { section: string; property: string; value: unknown }) => {
        if (data.section === 'grid' && data.property === 'visible' && this.gridToggleButton) {
          this.gridToggleButton.classList.toggle('active', data.value as boolean);
        }
      });
    }

    // Click handler
    this.gridToggleButton.addEventListener('click', () => {
      if (this.settingsService) {
        const current = this.settingsService.get('grid', 'visible');
        this.settingsService.set('grid', 'visible', !current);
      } else {
        this.eventBus.emit('viewport:grid:toggle');
      }
    });

    controls.appendChild(this.gridToggleButton);

    // Assemble header
    this.header.appendChild(title);
    this.header.appendChild(controls);
  }
}
