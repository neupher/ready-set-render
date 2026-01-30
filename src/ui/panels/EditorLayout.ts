/**
 * EditorLayout
 *
 * Main layout manager that assembles all editor panels.
 * Handles dependency injection and panel arrangement.
 * Manages primitive registry and menu-to-scene connections.
 *
 * @example
 * ```ts
 * const layout = new EditorLayout({
 *   container: document.getElementById('app'),
 *   gl,
 *   eventBus,
 *   sceneGraph,
 *   primitiveRegistry,
 *   settingsService
 * });
 * layout.initialize();
 * ```
 */

import { EventBus } from '@core/EventBus';
import { SceneGraph } from '@core/SceneGraph';
import type { SettingsService } from '@core/SettingsService';
import { PrimitiveRegistry } from '@plugins/primitives';
import { TopMenuBar, DEFAULT_MENUS } from '../components/TopMenuBar';
import { ResizablePanel } from '../components/ResizablePanel';
import { AboutDialog } from '../components/AboutDialog';
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
  /** Primitive registry for creating objects */
  primitiveRegistry: PrimitiveRegistry;
  /** Settings service for application settings (optional for backward compatibility) */
  settingsService?: SettingsService;
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
  private readonly primitiveRegistry: PrimitiveRegistry;
  private readonly settingsService: SettingsService | null;

  private root: HTMLDivElement | null = null;
  private menuBar: TopMenuBar | null = null;
  private leftPanel: ResizablePanel | null = null;
  private rightPanel: ResizablePanel | null = null;
  private hierarchyPanel: HierarchyPanel | null = null;
  private viewportPanel: ViewportPanel | null = null;
  private propertiesPanel: PropertiesPanel | null = null;
  private aboutDialog: AboutDialog | null = null;

  private static readonly REPO_URL = 'https://github.com/neupher/ready-set-render';

  constructor(options: EditorLayoutOptions) {
    this.container = options.container;
    this.gl = options.gl;
    this.eventBus = options.eventBus;
    this.sceneGraph = options.sceneGraph;
    this.primitiveRegistry = options.primitiveRegistry;
    this.settingsService = options.settingsService ?? null;
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
      gl: this.gl,
      settingsService: this.settingsService ?? undefined
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

    // Setup property change handler for name changes
    this.eventBus.on('object:propertyChanged', this.handlePropertyChanged.bind(this));

    // Setup hierarchy context menu handler for Create primitives
    this.eventBus.on('hierarchy:createPrimitive', (data: { type: string }) => {
      this.createPrimitive(data.type);
    });

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

    // Handle Create menu - Primitives submenu
    if (menuName === 'Create' && itemLabel.startsWith('Primitives/')) {
      const primitiveType = itemLabel.replace('Primitives/', '');
      this.createPrimitive(primitiveType);
      return;
    }

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
      case 'Save As':
        this.eventBus.emit('command:saveSceneAs');
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
        window.open(`${EditorLayout.REPO_URL}#readme`, '_blank');
        break;
      case 'About':
        this.showAboutDialog();
        break;
    }
  }

  /**
   * Show the About dialog.
   */
  private showAboutDialog(): void {
    if (!this.aboutDialog) {
      this.aboutDialog = new AboutDialog({
        projectName: 'Ready Set Render',
        version: '0.5.0',
        author: 'Tapani Heikkinen',
        repoUrl: EditorLayout.REPO_URL
      });
    }
    this.aboutDialog.show();
  }

  /**
   * Create a new primitive from the registry and add it to the scene.
   */
  private createPrimitive(type: string): void {
    const primitive = this.primitiveRegistry.create(type);

    if (primitive) {
      // Add to scene at world origin (transform is already 0,0,0 by default)
      this.sceneGraph.add(primitive);

      // Auto-select the newly created object
      this.eventBus.emit('selection:changed', { id: primitive.id });

      console.log(`Created ${type}: ${primitive.name}`);
    } else {
      console.warn(`Failed to create primitive: ${type}`);
    }
  }

  /**
   * Handle property changes from the properties panel.
   * Routes name changes to SceneGraph.rename() for two-way binding with hierarchy.
   */
  private handlePropertyChanged(data: { id: string; property: string; value: unknown }): void {
    if (data.property === 'name' && typeof data.value === 'string') {
      const obj = this.sceneGraph.find(data.id);
      if (obj && obj.name !== data.value) {
        this.sceneGraph.rename(obj, data.value);
      }
    }
  }
}
