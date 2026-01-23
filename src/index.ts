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
import { SelectionManager } from '@core/SelectionManager';
import { PropertyChangeHandler } from '@core/PropertyChangeHandler';
import { isInitializable } from '@core/interfaces';

// UI system
import { EditorLayout } from '@ui/panels/EditorLayout';

// Plugins
import { CubeFactory, PrimitiveRegistry } from '@plugins/primitives';
import { LineRenderer } from '@plugins/renderers/line/LineRenderer';
import { OrbitController } from '@plugins/navigation';

// Core systems
import { InputManager } from '@core/InputManager';

// Math utilities
import {
  unprojectScreenToRay,
  rayAABBIntersection,
  createAABBFromTransform,
  mat4Inverse,
} from '@utils/math';

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
    const orbitController = new OrbitController(cameraEntity, eventBus, viewportCanvas);

    console.log('Orbit controller initialized (Alt+LMB=orbit, Alt+MMB=pan, Alt+RMB=dolly, Scroll=zoom)');

    // Initialize selection manager
    const selectionManager = new SelectionManager(eventBus);

    console.log('Selection manager initialized');

    // Initialize property change handler (bridges UI → Entity data)
    // This enables Properties Panel edits to update entity transforms/components
    // The handler auto-subscribes to EventBus events in its constructor
    new PropertyChangeHandler({
      eventBus,
      sceneGraph
    });

    console.log('Property change handler initialized (UI → Entity data binding)');

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
    const renderCamera = cameraEntity.asRenderCamera(1);

    // Setup render loop
    eventBus.on('viewport:resized', (data: { width: number; height: number; aspectRatio: number }) => {
      renderCamera.setAspect(data.aspectRatio);
      lineRenderer.resize(data.width, data.height);
    });

    // =============================================
    // Selection System Integration
    // =============================================

    // Track viewport dimensions for ray casting
    let viewportWidth = viewportCanvas.width;
    let viewportHeight = viewportCanvas.height;

    eventBus.on('viewport:resized', (data: { width: number; height: number }) => {
      viewportWidth = data.width;
      viewportHeight = data.height;
    });

    // Auto-pivot on selection change
    eventBus.on('selection:changed', () => {
      const center = selectionManager.getSelectionCenter();
      if (center) {
        orbitController.setPivot(center[0], center[1], center[2]);
        console.log(`Camera pivot set to selection center: [${center[0].toFixed(2)}, ${center[1].toFixed(2)}, ${center[2].toFixed(2)}]`);
      }
    });

    // F key to focus on selection
    eventBus.on('input:keyDown', (data: { key: string; code: string }) => {
      if (data.key === 'f' || data.key === 'F') {
        const center = selectionManager.getSelectionCenter();
        if (center) {
          // Calculate appropriate distance based on selection bounds
          const bounds = selectionManager.getSelectionBounds();
          let distance = 5; // Default distance
          if (bounds) {
            const sizeX = bounds.max[0] - bounds.min[0];
            const sizeY = bounds.max[1] - bounds.min[1];
            const sizeZ = bounds.max[2] - bounds.min[2];
            const maxSize = Math.max(sizeX, sizeY, sizeZ);
            distance = maxSize * 2.5; // Zoom out to fit object
            distance = Math.max(2, Math.min(20, distance)); // Clamp
          }
          orbitController.framePoint(center, distance);
          console.log(`Camera framed to selection at distance ${distance.toFixed(2)}`);
        } else {
          // No selection - frame origin
          orbitController.framePoint([0, 0, 0], 5);
          console.log('No selection - camera framed to origin');
        }
      }
    });

    // Viewport click handling for selection (when NOT using Alt modifier)
    eventBus.on('input:mouseUp', (data: { button: number; x: number; y: number; modifiers: { alt: boolean; ctrl: boolean } }) => {
      // Only handle left click without Alt (Alt is for navigation)
      if (data.button !== 0 || data.modifiers.alt) return;

      // Get inverse view-projection matrix for ray casting
      const viewProjection = renderCamera.getViewProjectionMatrix();
      const invViewProjection = mat4Inverse(viewProjection);

      if (!invViewProjection) {
        console.warn('Could not invert view-projection matrix for picking');
        return;
      }

      // Cast ray from mouse position
      const ray = unprojectScreenToRay(
        data.x,
        data.y,
        viewportWidth,
        viewportHeight,
        invViewProjection
      );

      // Find closest intersection with scene objects
      interface HitResult {
        object: { id: string; name: string };
        distance: number;
      }
      let closestHit: HitResult | null = null;

      sceneGraph.traverse((obj) => {
        // Skip root and camera
        if (obj.id === 'root') return;
        if ((obj as { hasComponent?: (type: string) => boolean }).hasComponent?.('camera')) return;

        // Create AABB from object's transform
        const transform = (obj as { transform: { position: [number, number, number]; scale: [number, number, number] } }).transform;
        const aabb = createAABBFromTransform(transform.position, transform.scale);

        // Test intersection
        const hit = rayAABBIntersection(ray, aabb);

        if (hit.hit && (!closestHit || hit.distance < closestHit.distance)) {
          closestHit = { object: { id: obj.id, name: obj.name }, distance: hit.distance };
        }
      });

      // Update selection
      if (closestHit) {
        const hitObject = (closestHit as HitResult).object;
        if (data.modifiers.ctrl) {
          // Ctrl+click: toggle selection
          const sceneObj = sceneGraph.find(hitObject.id);
          if (sceneObj) {
            selectionManager.toggle(sceneObj);
          }
        } else {
          // Normal click: select single object
          const sceneObj = sceneGraph.find(hitObject.id);
          if (sceneObj) {
            selectionManager.select(sceneObj);
          }
        }
        console.log(`Selected: ${hitObject.name}`);
      } else {
        // Click on nothing: clear selection
        if (!data.modifiers.ctrl) {
          selectionManager.clear();
          // Reset pivot to origin when nothing selected
          orbitController.setPivot(0, 0, 0);
        }
      }
    });

    // Sync selection from hierarchy panel clicks
    eventBus.on('selection:changed', (data: { id: string }) => {
      if (data.id && !selectionManager.isSelectedById(data.id)) {
        const obj = sceneGraph.find(data.id);
        if (obj) {
          selectionManager.select(obj);
        }
      }
    });

    console.log('Selection system initialized (Click=select, Ctrl+Click=toggle, F=focus)');

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
