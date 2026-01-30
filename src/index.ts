/**
 * WebGL Editor - Main Entry Point
 *
 * A modular, extensible WebGL2-based 3D editor for learning
 * real-time and ray-tracing rendering techniques.
 *
 * @version 0.7.0
 */

import { Application } from '@core/Application';
import { registerUndoRedoShortcuts } from '@core/KeyboardShortcutManager';
import { registerEditorShortcuts, registerContextMenuHandlers } from '@core/ShortcutRegistry';
import { SelectionController } from '@plugins/tools';

console.log('WebGL Editor initializing...');

/**
 * Display an error message to the user.
 */
function showError(container: HTMLElement, error: unknown): void {
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #1a1a1a;">
      <div style="text-align: center; padding: 32px; background: #2a2a2a; border-radius: 8px; border: 1px solid #ff4444;">
        <h2 style="color: #ff4444; margin-bottom: 16px;">⚠️ Initialization Error</h2>
        <p style="color: #e0e0e0; font-size: 14px;">${error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    </div>
  `;
}

/**
 * Main application entry point.
 */
async function main(): Promise<void> {
  const appContainer = document.getElementById('app');
  const loadingScreen = document.getElementById('loading');

  if (!appContainer) {
    throw new Error('App container not found');
  }

  try {
    // Create and initialize application
    const app = new Application({ container: appContainer });
    await app.initialize();

    // Get application context for subsystems
    const ctx = app.getContext();

    // Register undo/redo shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
    registerUndoRedoShortcuts(app.getShortcutManager(), ctx.commandHistory);

    // Register file operation shortcuts
    app.getShortcutManager().register({
      key: 'n',
      ctrl: true,
      action: () => ctx.eventBus.emit('command:newScene'),
      description: 'New Scene',
    });

    app.getShortcutManager().register({
      key: 'o',
      ctrl: true,
      action: () => ctx.eventBus.emit('command:openScene'),
      description: 'Open Scene',
    });

    app.getShortcutManager().register({
      key: 's',
      ctrl: true,
      action: () => ctx.eventBus.emit('command:saveScene'),
      description: 'Save Scene',
    });

    app.getShortcutManager().register({
      key: 's',
      ctrl: true,
      shift: true,
      action: () => ctx.eventBus.emit('command:saveSceneAs'),
      description: 'Save Scene As',
    });

    // Register editor shortcuts (Delete, Shift+D)
    registerEditorShortcuts({
      shortcutManager: app.getShortcutManager(),
      commandHistory: ctx.commandHistory,
      selectionManager: ctx.selectionManager,
      sceneGraph: ctx.sceneGraph,
      eventBus: ctx.eventBus,
    });

    // Register context menu handlers (hierarchy panel delete/duplicate)
    registerContextMenuHandlers({
      shortcutManager: app.getShortcutManager(),
      commandHistory: ctx.commandHistory,
      selectionManager: ctx.selectionManager,
      sceneGraph: ctx.sceneGraph,
      eventBus: ctx.eventBus,
    });

    // Initialize selection controller (viewport ray picking)
    new SelectionController({
      eventBus: ctx.eventBus,
      selectionManager: ctx.selectionManager,
      sceneGraph: ctx.sceneGraph,
      getCamera: () => app.getRenderCamera(),
      orbitController: ctx.orbitController,
    });

    // Start render loop
    app.startRenderLoop();

    // Hide loading screen
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }

    console.log('WebGL Editor initialized successfully');
    console.log('Controls: Alt+LMB=orbit, Alt+MMB=pan, Alt+RMB=dolly, Scroll=zoom');
    console.log('Selection: Click=select, Ctrl+Click=toggle, F=focus, Delete=delete, Shift+D=duplicate');
    console.log('Undo/Redo: Ctrl+Z=undo, Ctrl+Y=redo');
    console.log('Use Create → Primitives → Cube to add objects to the scene');

  } catch (error) {
    console.error('Failed to initialize WebGL Editor:', error);
    showError(appContainer, error);
  }
}

// Start the application
main().catch(console.error);
