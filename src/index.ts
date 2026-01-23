/**
 * WebGL Editor - Main Entry Point
 *
 * A modular, extensible WebGL2-based 3D editor for learning
 * real-time and ray-tracing rendering techniques.
 *
 * @version 0.5.0
 */

// Import theme CSS
import '@ui/theme/theme.css';

// Core modules
import { EventBus } from '@core/EventBus';
import { SceneGraph } from '@core/SceneGraph';
import { CameraEntity } from '@core/CameraEntity';
import { isInitializable } from '@core/interfaces';

// UI system
import { EditorLayout } from '@ui/panels/EditorLayout';

// Plugins
import { CubeFactory, PrimitiveRegistry } from '@plugins/primitives';
import { LineRenderer } from '@plugins/renderers/line/LineRenderer';
import { OrbitController } from '@plugins/navigation';

// Core systems
import { InputManager } from '@core/InputManager';

console.log('WebGL Editor initializing...');

async function main(): Promise<void> {
  try {
    const appContainer = document.getElementById('app');
    const loadingScreen = document.getElementById('loading');

    if (!appContainer) {
      throw new Error('App container not found');
    }

    // Create canvas for WebGL
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');

    if (!gl) {
      throw new Error('WebGL2 is not supported by your browser');
    }

    console.log('WebGL2 context available');

    // Initialize core modules
    const eventBus = new EventBus();
    const sceneGraph = new SceneGraph(eventBus);

    console.log('Core modules initialized');

    // Initialize primitive registry and register built-in primitives
    const primitiveRegistry = new PrimitiveRegistry({ eventBus });
    primitiveRegistry.register(new CubeFactory());

    console.log('Primitive registry initialized with Cube factory');

    // Scene starts empty - user can add objects via Create menu
    console.log('Scene initialized (empty)');

    // Initialize camera as scene entity
    const cameraEntity = new CameraEntity({
      position: [3, 3, 3],
      target: [0, 0, 0],
      fieldOfView: 60,
      nearClipPlane: 0.1,
      farClipPlane: 100,
    });

    // Add camera to scene graph so it appears in hierarchy
    sceneGraph.add(cameraEntity);
    console.log('Camera entity added to scene');

    // Initialize UI layout (with primitive registry for Create menu)
    const layout = new EditorLayout({
      container: appContainer,
      gl,
      eventBus,
      sceneGraph,
      primitiveRegistry
    });
    layout.initialize();

    console.log('UI layout initialized');

    // Initialize line renderer
    const lineRenderer = new LineRenderer();
    await lineRenderer.initialize({
      gl,
      eventBus,
      canvas: layout.getViewport()!.getCanvas()
    });

    console.log('Line renderer initialized');

    // Initialize input manager for viewport interactions
    const viewportCanvas = layout.getViewport()!.getCanvas();
    // InputManager is instantiated for its side effects (event listener setup)
    new InputManager(viewportCanvas, eventBus);

    console.log('Input manager initialized');

    // Initialize orbit controller for camera navigation
    // OrbitController is instantiated for its side effects (event listener setup)
    new OrbitController(cameraEntity, eventBus);

    console.log('Orbit controller initialized (Alt+LMB=orbit, Alt+MMB=pan, Alt+RMB=dolly, Scroll=zoom)');

    // Listen for new objects added to scene and initialize their GPU resources
    eventBus.on('scene:objectAdded', (data: { object: unknown; parent: unknown }) => {
      const obj = data.object;
      if (isInitializable(obj) && !obj.isInitialized()) {
        const program = lineRenderer.getProgram();
        if (program) {
          obj.initializeGPUResources(gl, program);
          console.log(`Initialized GPU resources for: ${(obj as { name?: string }).name || 'unknown'}`);
        }
      }
    });

    console.log('Scene object initialization listener registered');

    // Create render camera adapter for rendering (aspect will be updated on resize)
    let renderCamera = cameraEntity.asRenderCamera(1);

    // Setup render loop
    eventBus.on('viewport:resized', (data: { width: number; height: number; aspectRatio: number }) => {
      renderCamera.setAspect(data.aspectRatio);
      lineRenderer.resize(data.width, data.height);
    });

    // Render function
    function render(): void {
      // Begin frame with camera (using adapter)
      lineRenderer.beginFrame(renderCamera);

      // Render scene
      lineRenderer.render(sceneGraph);

      // End frame
      lineRenderer.endFrame();

      // Continue render loop
      requestAnimationFrame(render);
    }

    // Start render loop
    requestAnimationFrame(render);

    // Hide loading screen
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }

    // Trigger initial resize
    layout.getViewport()?.resize();

    console.log('WebGL Editor initialized successfully');
    console.log('Phase 5: Scene Instantiation System - Complete');
    console.log('Use Create → Primitives → Cube to add objects to the scene');

  } catch (error) {
    console.error('Failed to initialize WebGL Editor:', error);

    const appContainer = document.getElementById('app');
    if (appContainer) {
      appContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #1a1a1a;">
          <div style="text-align: center; padding: 32px; background: #2a2a2a; border-radius: 8px; border: 1px solid #ff4444;">
            <h2 style="color: #ff4444; margin-bottom: 16px;">⚠️ Initialization Error</h2>
            <p style="color: #e0e0e0; font-size: 14px;">${error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </div>
      `;
    }
  }
}

// Start the application
main().catch(console.error);
