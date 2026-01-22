/**
 * EditorLayout
 *
 * Main layout manager that assembles all editor panels.
 * Handles dependency injection and panel arrangement.
 *
 * @example
 * ```ts
 * const layout = new EditorLayout({
 *   container: document.getElementById('app'),
 *   gl,
 *   eventBus,
 *   sceneGraph
 * });
 * layout.initialize();
 * ```
 */

import { EventBus } from '@core/EventBus';
import { SceneGraph } from '@core/SceneGraph';
import { TopMenuBar, DEFAULT_MENUS } from '../components/TopMenuBar';
import { ResizablePanel } from '../components/ResizablePanel';
import { HierarchyPanel } from './HierarchyPanel';
import { ViewportPanel } from './ViewportPanel';
import { PropertiesPanel, DEFAULT_SHADER_CODE } from './PropertiesPanel';

export interface EditorLayoutOptions {
  /** Container element for the editor */
  container: HTMLElement;
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
  /** Event bus for communication */
  eventBus: EventBus;
  /** Scene graph */
  sceneGraph: SceneGraph;
}

/**
 * Main editor layout that assembles all UI panels.
 * Handles dependency injection for non-plugin UI components.
 */
export class EditorLayout {
  private readonly container: HTMLElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly eventBus: EventBus;
  private readonly sceneGraph: SceneGraph;

  private root: HTMLDivElement | null = null;
  private menuBar: TopMenuBar | null = null;
  private leftPanel: ResizablePanel | null = null;
  private rightPanel: ResizablePanel | null = null;
  private hierarchyPanel: HierarchyPanel | null = null;
  private viewportPanel: ViewportPanel | null = null;
  private propertiesPanel: PropertiesPanel | null = null;

  constructor(options: EditorLayoutOptions) {
    this.container = options.container;
    this.gl = options.gl;
    this.eventBus = options.eventBus;
    this.sceneGraph = options.sceneGraph;
  }

  /**
   * Initialize and render the editor layout.
   */
  initialize(): void {
    // Clear container
    this.container.innerHTML = '';

    // Create root element
    this.root = document.createElement('div');
    this.root.className = 'editor-root';

    // Create menu bar
    this.menuBar = new TopMenuBar({
      menus: DEFAULT_MENUS,
      onItemClick: this.handleMenuClick.bind(this)
    });
    this.root.appendChild(this.menuBar.element);

    // Create main content area
    const main = document.createElement('div');
    main.className = 'editor-main';

    // Create left panel (Hierarchy)
    this.leftPanel = new ResizablePanel({
      side: 'left',
      defaultWidth: 280,
      minWidth: 200,
      maxWidth: 500,
      onResize: (width) => this.eventBus.emit('layout:leftPanelResize', { width })
    });

    this.hierarchyPanel = new HierarchyPanel({
      eventBus: this.eventBus,
      sceneGraph: this.sceneGraph
    });

    this.leftPanel.setContent(this.hierarchyPanel.element);
    main.appendChild(this.leftPanel.element);

    // Create viewport (center)
    this.viewportPanel = new ViewportPanel({
      eventBus: this.eventBus,
      gl: this.gl
    });
    main.appendChild(this.viewportPanel.element);

    // Create right panel (Properties)
    this.rightPanel = new ResizablePanel({
      side: 'right',
      defaultWidth: 350,
      minWidth: 250,
      maxWidth: 600,
      onResize: (width) => this.eventBus.emit('layout:rightPanelResize', { width })
    });

    this.propertiesPanel = new PropertiesPanel({
      eventBus: this.eventBus,
      sceneGraph: this.sceneGraph
    });
    this.propertiesPanel.setShaderCode(DEFAULT_SHADER_CODE);

    this.rightPanel.setContent(this.propertiesPanel.element);
    main.appendChild(this.rightPanel.element);

    // Assemble
    this.root.appendChild(main);
    this.container.appendChild(this.root);

    // Trigger initial viewport resize after layout is attached to DOM
    requestAnimationFrame(() => {
      this.viewportPanel?.resize();
    });
  }

  /**
   * Get the viewport panel.
   */
  getViewport(): ViewportPanel | null {
    return this.viewportPanel;
  }

  /**
   * Get the hierarchy panel.
   */
  getHierarchy(): HierarchyPanel | null {
    return this.hierarchyPanel;
  }

  /**
   * Get the properties panel.
   */
  getProperties(): PropertiesPanel | null {
    return this.propertiesPanel;
  }

  /**
   * Clean up all panels.
   */
  dispose(): void {
    this.menuBar?.dispose();
    this.leftPanel?.dispose();
    this.rightPanel?.dispose();
    this.hierarchyPanel?.dispose();
    this.viewportPanel?.dispose();
    this.propertiesPanel?.dispose();

    if (this.root) {
      this.root.remove();
      this.root = null;
    }
  }

  private handleMenuClick(menuName: string, itemLabel: string): void {
    this.eventBus.emit('menu:click', { menu: menuName, item: itemLabel });

    // Handle common menu actions
    switch (itemLabel) {
      case 'New':
        this.eventBus.emit('command:newScene');
        break;
      case 'Open':
        this.eventBus.emit('command:openScene');
        break;
      case 'Save':
        this.eventBus.emit('command:saveScene');
        break;
      case 'Export':
        this.eventBus.emit('command:export');
        break;
      case 'Import':
        this.eventBus.emit('command:import');
        break;
      case 'Render':
        this.eventBus.emit('command:render');
        break;
      case 'Settings':
        this.eventBus.emit('command:settings');
        break;
      case 'Documentation':
        window.open('https://github.com/your-repo/docs', '_blank');
        break;
      case 'About':
        this.eventBus.emit('command:about');
        break;
    }
  }
}
