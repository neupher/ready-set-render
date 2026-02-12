/**
 * Application - Core Editor Orchestrator
 *
 * Central coordinator for the WebGL Editor. Manages initialization,
 * module wiring, and the render loop. This class follows the
 * Facade pattern to simplify the complex subsystem interactions.
 *
 * @example
 * ```typescript
 * const app = new Application({
 *   container: document.getElementById('app')!,
 * });
 * await app.initialize();
 * app.startRenderLoop();
 * ```
 */

import '@ui/theme/theme.css';

import { EventBus } from '@core/EventBus';
import { SceneGraph } from '@core/SceneGraph';
import { CameraEntity } from '@core/CameraEntity';
import { SelectionManager } from '@core/SelectionManager';
import { PropertyChangeHandler } from '@core/PropertyChangeHandler';
import { CommandHistory } from '@core/commands/CommandHistory';
import { KeyboardShortcutManager } from '@core/KeyboardShortcutManager';
import { InputManager } from '@core/InputManager';
import { SettingsService } from '@core/SettingsService';
import { SceneController } from '@core/SceneController';
import { ShaderEditorService } from '@core/ShaderEditorService';

import { EditorLayout } from '@ui/panels/EditorLayout';
import { SettingsWindow } from '@ui/windows/SettingsWindow';

import { CubeFactory, SphereFactory, PrimitiveRegistry } from '@plugins/primitives';
import {
  AssetRegistry,
  ShaderAssetFactory,
  MaterialAssetFactory,
  FileSystemAssetStore,
  BUILT_IN_SHADERS,
  BUILT_IN_MATERIALS,
} from '@core/assets';
import { ProjectService } from '@core/ProjectService';
import { LineRenderer } from '@plugins/renderers/line/LineRenderer';
import { ForwardRenderer } from '@plugins/renderers/forward/ForwardRenderer';
import { LightGizmoRenderer } from '@plugins/renderers/gizmos/LightGizmoRenderer';
import { ViewportGizmoRenderer } from '@plugins/renderers/gizmos/ViewportGizmoRenderer';
import { GridRenderer } from '@plugins/viewport/GridRenderer';
import { TransformGizmoController } from '@plugins/gizmos';
import { OrbitController } from '@plugins/navigation';
import { DirectionalLight } from '@plugins/lights/DirectionalLight';
import { LightManager } from '@core/LightManager';

import type { RenderCameraAdapter } from '@core/RenderCameraAdapter';

/**
 * Configuration options for the Application.
 */
export interface ApplicationConfig {
  /** The container element to render into */
  container: HTMLElement;
}

/**
 * Core application context shared with subsystems.
 */
export interface ApplicationContext {
  readonly eventBus: EventBus;
  readonly sceneGraph: SceneGraph;
  readonly selectionManager: SelectionManager;
  readonly commandHistory: CommandHistory;
  readonly primitiveRegistry: PrimitiveRegistry;
  readonly cameraEntity: CameraEntity;
  readonly orbitController: OrbitController;
  readonly gl: WebGL2RenderingContext;
  readonly canvas: HTMLCanvasElement;
}

/**
 * Main application orchestrator for the WebGL Editor.
 */
export class Application {
  private readonly container: HTMLElement;

  // Core modules
  private eventBus!: EventBus;
  private sceneGraph!: SceneGraph;
  private selectionManager!: SelectionManager;
  private commandHistory!: CommandHistory;
  private shortcutManager!: KeyboardShortcutManager;
  private primitiveRegistry!: PrimitiveRegistry;
  private settingsService!: SettingsService;

  // Rendering
  private gl!: WebGL2RenderingContext;
  private lineRenderer!: LineRenderer;
  private forwardRenderer!: ForwardRenderer;
  private lightGizmoRenderer!: LightGizmoRenderer;
  private viewportGizmoRenderer!: ViewportGizmoRenderer;
  private gridRenderer!: GridRenderer;
  private lightManager!: LightManager;
  private renderCamera!: RenderCameraAdapter;
  private cameraEntity!: CameraEntity;

  // Scene entities
  private directionalLight!: DirectionalLight;

  // Navigation
  private orbitController!: OrbitController;

  // Transform gizmos
  private transformGizmoController!: TransformGizmoController;

  // UI
  private layout!: EditorLayout;
  private settingsWindow!: SettingsWindow;

  // Scene Management
  private sceneController!: SceneController;

  // State
  private isInitialized = false;
  private animationFrameId: number | null = null;

  /** Listener cleanup function for postMessage */
  private postMessageListener: ((event: MessageEvent) => void) | null = null;

  constructor(config: ApplicationConfig) {
    this.container = config.container;
  }

  /**
   * Initialize all application subsystems.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Application already initialized');
      return;
    }

    // Create WebGL context
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');

    if (!gl) {
      throw new Error('WebGL2 is not supported by your browser');
    }

    this.gl = gl;
    console.log('WebGL2 context available');

    // Initialize core modules
    this.eventBus = new EventBus();
    this.sceneGraph = new SceneGraph(this.eventBus);
    console.log('Core modules initialized');

    // Initialize primitive registry
    this.primitiveRegistry = new PrimitiveRegistry({ eventBus: this.eventBus });
    this.primitiveRegistry.register(new CubeFactory());
    this.primitiveRegistry.register(new SphereFactory());
    console.log('Primitive registry initialized with Cube and Sphere factories');

    // Initialize settings service
    this.settingsService = new SettingsService({ eventBus: this.eventBus });
    console.log('Settings service initialized');

    // Initialize asset system
    const assetRegistry = new AssetRegistry(this.eventBus);
    const shaderFactory = new ShaderAssetFactory();
    const materialFactory = new MaterialAssetFactory();
    const assetStore = new FileSystemAssetStore(this.eventBus);

    // Initialize project service
    const projectService = new ProjectService({
      eventBus: this.eventBus,
      assetRegistry,
      assetStore,
    });

    // Register built-in shaders and materials
    for (const shader of BUILT_IN_SHADERS) {
      assetRegistry.register(shader);
    }
    for (const material of BUILT_IN_MATERIALS) {
      assetRegistry.register(material);
    }
    console.log('Asset system initialized with built-in shaders and materials');

    // Initialize shader editor service (live shader editing lifecycle)
    const shaderEditorService = new ShaderEditorService({
      gl: this.gl,
      eventBus: this.eventBus,
      assetRegistry,
    });
    shaderEditorService.compileAllRegistered();
    console.log('Shader editor service initialized with pre-compiled shaders');

    // Setup project commands
    this.setupProjectCommands(projectService);

    // Create default Cube primitive for testing
    const defaultCube = this.primitiveRegistry.create('Cube');
    if (defaultCube) {
      this.sceneGraph.add(defaultCube);
      console.log('Default Cube added to scene');
    }

    // Initialize camera as scene entity
    this.cameraEntity = new CameraEntity({
      position: [3, 3, 3],
      target: [0, 0, 0],
      fieldOfView: 60,
      nearClipPlane: 0.1,
      farClipPlane: 100,
    });
    this.sceneGraph.add(this.cameraEntity);
    console.log('Camera entity added to scene');

    // Initialize UI layout
    this.layout = new EditorLayout({
      container: this.container,
      gl: this.gl,
      eventBus: this.eventBus,
      sceneGraph: this.sceneGraph,
      primitiveRegistry: this.primitiveRegistry,
      settingsService: this.settingsService,
      assetRegistry,
      materialFactory,
      shaderFactory,
      projectService,
      shaderEditorService,
    });
    this.layout.initialize();
    console.log('UI layout initialized');

    // Initialize settings window
    this.settingsWindow = new SettingsWindow({
      settingsService: this.settingsService,
      eventBus: this.eventBus,
    });

    // Handle settings menu command
    this.eventBus.on('command:settings', () => {
      this.settingsWindow.show();
    });
    console.log('Settings window initialized');

    // Initialize line renderer (for wireframe mode)
    this.lineRenderer = new LineRenderer();
    await this.lineRenderer.initialize({
      gl: this.gl,
      eventBus: this.eventBus,
      canvas: this.layout.getViewport()!.getCanvas(),
    });
    console.log('Line renderer initialized');

    // Initialize light manager
    this.lightManager = new LightManager({
      eventBus: this.eventBus,
      sceneGraph: this.sceneGraph,
    });
    console.log('Light manager initialized');

    // Initialize forward renderer (for solid shaded mode)
    this.forwardRenderer = new ForwardRenderer();
    this.forwardRenderer.setLightManager(this.lightManager);
    this.forwardRenderer.setShaderEditorService(shaderEditorService);
    this.forwardRenderer.setAssetRegistry(assetRegistry);
    await this.forwardRenderer.initialize({
      gl: this.gl,
      eventBus: this.eventBus,
      canvas: this.layout.getViewport()!.getCanvas(),
    });
    console.log('Forward renderer initialized');

    // Create default directional light
    // Direction is now computed from rotation - default [50, -30, 180] gives nice sun angle
    this.directionalLight = new DirectionalLight({
      name: 'Directional Light',
      rotation: [50, -30, 180], // Tilted down, rotated, and Z=180 to face scene
      color: [1, 0.98, 0.95],
      intensity: 1.0,
      enabled: true,
    });
    this.sceneGraph.add(this.directionalLight);
    console.log('Directional light added to scene');

    // Initialize light gizmo renderer (for showing light direction when selected)
    this.lightGizmoRenderer = new LightGizmoRenderer({
      gl: this.gl,
      eventBus: this.eventBus,
    });
    this.lightGizmoRenderer.initialize();
    console.log('Light gizmo renderer initialized');

    // Initialize viewport gizmo renderer (orientation indicator)
    this.viewportGizmoRenderer = new ViewportGizmoRenderer(this.gl);
    this.viewportGizmoRenderer.initialize();
    console.log('Viewport gizmo renderer initialized');

    // Initialize grid renderer
    this.gridRenderer = new GridRenderer({
      gl: this.gl,
      eventBus: this.eventBus,
      settingsService: this.settingsService,
    });
    this.gridRenderer.initialize();
    console.log('Grid renderer initialized');

    // Initialize input manager
    const viewportCanvas = this.layout.getViewport()!.getCanvas();
    new InputManager(viewportCanvas, this.eventBus);
    console.log('Input manager initialized');

    // Initialize orbit controller
    this.orbitController = new OrbitController(this.cameraEntity, this.eventBus, viewportCanvas);
    console.log('Orbit controller initialized');

    // Initialize selection manager
    this.selectionManager = new SelectionManager(this.eventBus);
    console.log('Selection manager initialized');

    // Initialize command history
    this.commandHistory = new CommandHistory({
      eventBus: this.eventBus,
      maxStackSize: 100,
    });
    console.log('Command history initialized');

    // Initialize scene controller
    this.sceneController = new SceneController({
      eventBus: this.eventBus,
      sceneGraph: this.sceneGraph,
      primitiveRegistry: this.primitiveRegistry,
    });
    this.setupSceneCommands();
    this.setupLauncherListener();
    console.log('Scene controller initialized');

    // Initialize keyboard shortcuts
    // NOTE: Undo/redo shortcuts are registered in index.ts to avoid duplication
    this.shortcutManager = new KeyboardShortcutManager({ eventBus: this.eventBus });
    console.log('Keyboard shortcuts initialized');

    // Initialize property change handler (bridges UI → Entity data)
    new PropertyChangeHandler({
      eventBus: this.eventBus,
      sceneGraph: this.sceneGraph,
      commandHistory: this.commandHistory,
    });
    console.log('Property change handler initialized');

    // Initialize transform gizmo controller
    this.transformGizmoController = new TransformGizmoController({
      gl: this.gl,
      eventBus: this.eventBus,
      sceneGraph: this.sceneGraph,
      selectionManager: this.selectionManager,
      commandHistory: this.commandHistory,
      canvas: viewportCanvas,
    });
    this.transformGizmoController.initialize();
    console.log('Transform gizmo controller initialized');

    // Create render camera adapter
    this.renderCamera = this.cameraEntity.asRenderCamera(1);

    // Setup viewport resize handling
    this.setupResizeHandling();

    this.isInitialized = true;
    console.log('Application initialized successfully');
  }

  /**
   * Get the application context for subsystems.
   */
  getContext(): ApplicationContext {
    if (!this.isInitialized) {
      throw new Error('Application not initialized');
    }

    return {
      eventBus: this.eventBus,
      sceneGraph: this.sceneGraph,
      selectionManager: this.selectionManager,
      commandHistory: this.commandHistory,
      primitiveRegistry: this.primitiveRegistry,
      cameraEntity: this.cameraEntity,
      orbitController: this.orbitController,
      gl: this.gl,
      canvas: this.layout.getViewport()!.getCanvas(),
    };
  }

  /**
   * Get the keyboard shortcut manager for registering shortcuts.
   */
  getShortcutManager(): KeyboardShortcutManager {
    return this.shortcutManager;
  }

  /**
   * Get the render camera for external access.
   */
  getRenderCamera(): RenderCameraAdapter {
    return this.renderCamera;
  }

  /**
   * Get the viewport canvas.
   */
  getViewportCanvas(): HTMLCanvasElement {
    return this.layout.getViewport()!.getCanvas();
  }

  /**
   * Start the render loop.
   */
  startRenderLoop(): void {
    if (!this.isInitialized) {
      throw new Error('Application not initialized');
    }

    const render = (): void => {
      // Use Forward Renderer for solid shaded rendering
      this.forwardRenderer.beginFrame(this.renderCamera);
      this.forwardRenderer.render(this.sceneGraph);

      // Render grid (after scene, before gizmos)
      this.gridRenderer.render(this.renderCamera);

      // Render light gizmos for all light entities (always visible)
      this.renderAllLightGizmos();

      // Render transform gizmos for selected entities (after scene, depth disabled)
      this.transformGizmoController.render(this.renderCamera);

      // Render viewport orientation gizmo (always visible in corner)
      this.viewportGizmoRenderer.render(this.renderCamera);

      this.forwardRenderer.endFrame();
      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);

    // Trigger initial resize
    this.layout.getViewport()?.resize();

    console.log('Render loop started');
  }

  /**
   * Render gizmos for all light entities in the scene.
   * Light gizmos are always visible, not just when selected.
   */
  private renderAllLightGizmos(): void {
    // Get all entities from scene graph
    const allEntities = this.sceneGraph.getAllObjects();

    for (const entity of allEntities) {
      // Check if entity has a light component
      if (typeof entity === 'object' && entity !== null) {
        const e = entity as { hasComponent?: (type: string) => boolean };
        if (typeof e.hasComponent === 'function' && e.hasComponent('light')) {
          this.lightGizmoRenderer.render(this.renderCamera, entity);
        }
      }
    }
  }

  /**
   * Stop the render loop.
   */
  stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      console.log('Render loop stopped');
    }
  }

  /**
   * Clean up all resources.
   */
  dispose(): void {
    this.stopRenderLoop();
    this.lineRenderer?.dispose?.();
    this.orbitController?.dispose?.();
    this.isInitialized = false;
    console.log('Application disposed');
  }

  /**
   * Set up scene command handlers for File menu operations.
   */
  private setupSceneCommands(): void {
    // New Scene (Ctrl+N)
    this.eventBus.on('command:newScene', async () => {
      const result = await this.sceneController.newScene();
      if (!result.success && result.error) {
        console.error('Failed to create new scene:', result.error);
      }
    });

    // Open Scene (Ctrl+O)
    this.eventBus.on('command:openScene', async () => {
      const result = await this.sceneController.openScene();
      if (!result.success && result.error) {
        console.error('Failed to open scene:', result.error);
      }
    });

    // Save Scene (Ctrl+S)
    this.eventBus.on('command:saveScene', async () => {
      const result = await this.sceneController.saveScene();
      if (!result.success && result.error) {
        console.error('Failed to save scene:', result.error);
      }
    });

    // Save Scene As (Ctrl+Shift+S)
    this.eventBus.on('command:saveSceneAs', async () => {
      const result = await this.sceneController.saveSceneAs();
      if (!result.success && result.error) {
        console.error('Failed to save scene:', result.error);
      }
    });

    // Export as HTML
    this.eventBus.on('command:exportAsHTML', async () => {
      const result = await this.sceneController.exportSceneAsHTML();
      if (!result.success && result.error) {
        console.error('Failed to export scene as HTML:', result.error);
      }
    });
  }

  /**
   * Set up listener for postMessage from launcher HTML files.
   * When a launcher sends scene data, this loads it into the editor.
   */
  private setupLauncherListener(): void {
    const protocol = SceneController.LAUNCHER_PROTOCOL;

    this.postMessageListener = async (event: MessageEvent) => {
      // Validate message format
      if (!event.data || event.data.protocol !== protocol) {
        return;
      }

      // Handle scene load request from launcher
      if (event.data.type === 'loadScene' && event.data.scene) {
        console.log('Received scene from launcher:', event.data.scene.name);

        const result = await this.sceneController.loadFromSceneData(event.data.scene);

        // Notify launcher of result
        if (event.source && typeof (event.source as Window).postMessage === 'function') {
          (event.source as Window).postMessage({
            protocol,
            type: result.success ? 'sceneLoaded' : 'sceneLoadError',
            error: result.error,
          }, '*');
        }
      }
    };

    window.addEventListener('message', this.postMessageListener);

    // If we were opened by a launcher, signal that we're ready
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('launcher') === '1' && window.opener) {
      // Small delay to ensure everything is initialized
      setTimeout(() => {
        window.opener.postMessage({
          protocol,
          type: 'editorReady',
        }, '*');
        console.log('Signaled launcher that editor is ready');
      }, 100);
    }
  }

  private setupResizeHandling(): void {
    this.eventBus.on('viewport:resized', (data: { width: number; height: number; aspectRatio: number }) => {
      this.renderCamera.setAspect(data.aspectRatio);
      this.lineRenderer.resize(data.width, data.height);
      this.forwardRenderer.resize(data.width, data.height);
    });
  }

  /**
   * Set up project command handlers for project management.
   */
  private setupProjectCommands(projectService: ProjectService): void {
    // Open Project (File menu or Asset Browser button)
    this.eventBus.on('command:openProject', async () => {
      const result = await projectService.openProject();
      if (result.success) {
        console.log(`Opened project: ${result.projectName} (${result.assetsDiscovered} assets discovered)`);
      } else if (result.error) {
        console.error('Failed to open project:', result.error);
      }
    });

    // Close Project
    this.eventBus.on('command:closeProject', async () => {
      const result = await projectService.closeProject();
      if (result.success) {
        console.log('Project closed');
      } else if (result.error) {
        console.error('Failed to close project:', result.error);
      }
    });
  }
}
