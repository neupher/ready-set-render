/**
 * WebGL Editor - Main Entry Point
 *
 * A modular, extensible WebGL2-based 3D editor for learning
 * real-time and ray-tracing rendering techniques.
 *
 * @version 0.4.0
 */

// Import theme CSS
import '@ui/theme/theme.css';

// Core modules
import { EventBus } from '@core/EventBus';
import { SceneGraph } from '@core/SceneGraph';
import { Camera } from '@core/Camera';

// UI system
import { EditorLayout } from '@ui/panels/EditorLayout';

// Plugins
import { Cube } from '@plugins/primitives/Cube';
import { LineRenderer } from '@plugins/renderers/line/LineRenderer';

// Math utilities
import { degToRad } from '@utils/math/transforms';

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

    // Add a default cube to the scene
    const cube = new Cube('cube-001');
    cube.name = 'Cube.001';
    sceneGraph.add(cube);

    console.log('Scene populated with default objects');

    // Initialize camera
    const camera = new Camera({
      position: [3, 3, 3],
      target: [0, 0, 0],
      up: [0, 1, 0],
      fov: degToRad(60),
      aspect: 1,
      near: 0.1,
      far: 100,
    });

    // Initialize UI layout
    const layout = new EditorLayout({
      container: appContainer,
      gl,
      eventBus,
      sceneGraph
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

    // Setup render loop
    eventBus.on('viewport:resized', (data: { width: number; height: number; aspectRatio: number }) => {
      camera.setAspect(data.aspectRatio);
      lineRenderer.resize(data.width, data.height);
    });

    // Render function
    function render(): void {
      // Begin frame with camera
      lineRenderer.beginFrame(camera);

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
    console.log('Phase 4: UI Layer - Complete');

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
