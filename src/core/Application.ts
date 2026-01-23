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
import { KeyboardShortcutManager, registerUndoRedoShortcuts } from '@core/KeyboardShortcutManager';
import { InputManager } from '@core/InputManager';

import { EditorLayout } from '@ui/panels/EditorLayout';

import { CubeFactory, SphereFactory, PrimitiveRegistry } from '@plugins/primitives';
import { LineRenderer } from '@plugins/renderers/line/LineRenderer';
import { ForwardRenderer } from '@plugins/renderers/forward/ForwardRenderer';
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

  // Rendering
  private gl!: WebGL2RenderingContext;
  private lineRenderer!: LineRenderer;
  private forwardRenderer!: ForwardRenderer;
  private lightManager!: LightManager;
  private renderCamera!: RenderCameraAdapter;
  private cameraEntity!: CameraEntity;

  // Scene entities
  private directionalLight!: DirectionalLight;

  // Navigation
  private orbitController!: OrbitController;

  // UI
  private layout!: EditorLayout;

  // State
  private isInitialized = false;
  private animationFrameId: number | null = null;

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
    });
    this.layout.initialize();
    console.log('UI layout initialized');

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
    await this.forwardRenderer.initialize({
      gl: this.gl,
      eventBus: this.eventBus,
      canvas: this.layout.getViewport()!.getCanvas(),
    });
    console.log('Forward renderer initialized');

    // Create default directional light
    this.directionalLight = new DirectionalLight({
      name: 'Directional Light',
      direction: [-0.5, -1.0, -0.3],
      color: [1, 0.98, 0.95],
      intensity: 1.0,
      enabled: true,
    });
    this.sceneGraph.add(this.directionalLight);
    console.log('Directional light added to scene');

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

    // Initialize keyboard shortcuts
    this.shortcutManager = new KeyboardShortcutManager({ eventBus: this.eventBus });
    registerUndoRedoShortcuts(this.shortcutManager, this.commandHistory);
    console.log('Keyboard shortcuts initialized');

    // Initialize property change handler (bridges UI → Entity data)
    new PropertyChangeHandler({
      eventBus: this.eventBus,
      sceneGraph: this.sceneGraph,
      commandHistory: this.commandHistory,
    });
    console.log('Property change handler initialized');

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
      this.forwardRenderer.endFrame();
      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);

    // Trigger initial resize
    this.layout.getViewport()?.resize();

    console.log('Render loop started');
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

  private setupResizeHandling(): void {
    this.eventBus.on('viewport:resized', (data: { width: number; height: number; aspectRatio: number }) => {
      this.renderCamera.setAspect(data.aspectRatio);
      this.lineRenderer.resize(data.width, data.height);
      this.forwardRenderer.resize(data.width, data.height);
    });
  }
}
