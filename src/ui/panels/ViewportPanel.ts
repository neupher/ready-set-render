/**
 * ViewportPanel
 *
 * Displays the WebGL canvas and viewport controls.
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

export interface ViewportPanelOptions {
  /** Event bus for communication */
  eventBus: EventBus;
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
}

/**
 * Viewport panel displaying the WebGL canvas.
 * NOT a plugin - receives dependencies via constructor.
 */
export class ViewportPanel {
  private readonly container: HTMLDivElement;
  private readonly eventBus: EventBus;
  private readonly gl: WebGL2RenderingContext;
  private readonly header: HTMLDivElement;
  private readonly canvasContainer: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly status: HTMLDivElement;
  private resizeObserver: ResizeObserver | null = null;

  constructor(options: ViewportPanelOptions) {
    this.eventBus = options.eventBus;
    this.gl = options.gl;
    this.canvas = this.gl.canvas as HTMLCanvasElement;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'viewport-panel';

    // Create header
    this.header = document.createElement('div');
    this.header.className = 'panel-header viewport-header';
    this.header.innerHTML = `
      <span class="panel-header-title">Viewport</span>
      <div class="viewport-controls">
        <span>Perspective</span>
        <span>|</span>
        <span>Shaded</span>
      </div>
    `;

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
}
