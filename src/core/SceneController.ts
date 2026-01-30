/**
 * SceneController - Manages scene file operations and state
 *
 * Orchestrates New/Open/Save/Save As operations for scene files.
 * Tracks current scene state including file handle, dirty flag, and scene name.
 * Integrates with SceneAssetFactory for serialization and FileSystemAssetStore for persistence.
 *
 * @example
 * ```typescript
 * const sceneController = new SceneController({
 *   eventBus,
 *   sceneGraph,
 *   primitiveRegistry,
 * });
 *
 * // New scene (prompts for unsaved changes if dirty)
 * await sceneController.newScene();
 *
 * // Open scene from file
 * await sceneController.openScene();
 *
 * // Save current scene (Save As if no file handle)
 * await sceneController.saveScene();
 *
 * // Save As (always prompts for file location)
 * await sceneController.saveSceneAs();
 * ```
 */

import type { EventBus } from './EventBus';
import type { SceneGraph } from './SceneGraph';
import type { PrimitiveRegistry } from '@plugins/primitives';
import { SceneAssetFactory } from './assets/SceneAssetFactory';
import type { ISceneAsset } from './assets/interfaces/ISceneAsset';
import { showConfirmDialog } from '@ui/components/ConfirmDialog';

/**
 * Scene file type options for the file picker.
 * Uses .scene extension with JSON content internally.
 */
const SCENE_FILE_OPTIONS: FilePickerAcceptType[] = [
  {
    description: 'Scene Files',
    accept: {
      'application/json': ['.scene'],
    },
  },
];

/**
 * Event data for scene state changes.
 */
export interface SceneStateChangedEvent {
  sceneName: string;
  isDirty: boolean;
  hasFileHandle: boolean;
}

export interface SceneLoadedEvent {
  sceneName: string;
  entityCount: number;
}

export interface SceneSavedEvent {
  sceneName: string;
  filePath: string;
}

export interface SceneNewEvent {
  sceneName: string;
}

/**
 * Configuration options for SceneController.
 */
export interface SceneControllerOptions {
  /** Event bus for communication */
  eventBus: EventBus;
  /** Scene graph to manage */
  sceneGraph: SceneGraph;
  /** Primitive registry for creating default content */
  primitiveRegistry: PrimitiveRegistry;
}

/**
 * Result of a scene operation.
 */
export interface SceneOperationResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
}

/**
 * Controller for scene file operations.
 */
export class SceneController {
  private readonly eventBus: EventBus;
  private readonly sceneGraph: SceneGraph;
  private readonly primitiveRegistry: PrimitiveRegistry;

  /** Current scene asset (in-memory representation) */
  private currentScene: ISceneAsset | null = null;

  /** File handle for the current scene (null if unsaved) */
  private fileHandle: FileSystemFileHandle | null = null;

  /** Whether the scene has unsaved changes */
  private _isDirty = false;

  /** Default name for new scenes */
  private static readonly DEFAULT_SCENE_NAME = 'untitled';

  constructor(options: SceneControllerOptions) {
    this.eventBus = options.eventBus;
    this.sceneGraph = options.sceneGraph;
    this.primitiveRegistry = options.primitiveRegistry;

    // Create initial scene asset
    this.currentScene = SceneAssetFactory.create({
      name: SceneController.DEFAULT_SCENE_NAME,
    });

    // Listen for scene changes to mark as dirty
    this.setupDirtyTracking();

    // Emit initial state so UI can sync
    this.emitStateChanged();
  }

  /**
   * Get the current scene name.
   */
  get sceneName(): string {
    return this.currentScene?.name ?? SceneController.DEFAULT_SCENE_NAME;
  }

  /**
   * Whether the scene has unsaved changes.
   */
  get isDirty(): boolean {
    return this._isDirty;
  }

  /**
   * Whether the scene has an associated file.
   */
  get hasFileHandle(): boolean {
    return this.fileHandle !== null;
  }

  /**
   * Check if the File System Access API is supported.
   */
  isFileSystemSupported(): boolean {
    return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
  }

  /**
   * Create a new scene.
   * Prompts for unsaved changes if the current scene is dirty.
   *
   * @returns Result indicating success, error, or cancellation
   */
  async newScene(): Promise<SceneOperationResult> {
    // Check for unsaved changes
    if (this._isDirty) {
      const shouldProceed = await this.confirmUnsavedChanges();
      if (!shouldProceed) {
        return { success: false, cancelled: true };
      }
    }

    // Clear the scene graph
    this.sceneGraph.clear();

    // Create a new scene asset
    this.currentScene = SceneAssetFactory.create({
      name: SceneController.DEFAULT_SCENE_NAME,
    });

    // Reset file handle and dirty state
    this.fileHandle = null;
    this._isDirty = false;

    // Add a default cube for testing (matches Application.ts behavior)
    const defaultCube = this.primitiveRegistry.create('Cube');
    if (defaultCube) {
      this.sceneGraph.add(defaultCube);
    }

    // Emit events
    this.emitStateChanged();
    this.eventBus.emit<SceneNewEvent>('scene:new', {
      sceneName: this.sceneName,
    });

    console.log(`New scene created: ${this.sceneName}`);
    return { success: true };
  }

  /**
   * Open a scene from a file.
   * Prompts for unsaved changes if the current scene is dirty.
   *
   * @returns Result indicating success, error, or cancellation
   */
  async openScene(): Promise<SceneOperationResult> {
    if (!this.isFileSystemSupported()) {
      return {
        success: false,
        error: 'File System Access API is not supported in this browser.',
      };
    }

    // Check for unsaved changes
    if (this._isDirty) {
      const shouldProceed = await this.confirmUnsavedChanges();
      if (!shouldProceed) {
        return { success: false, cancelled: true };
      }
    }

    try {
      // Show file picker
      const [handle] = await window.showOpenFilePicker({
        types: SCENE_FILE_OPTIONS,
        multiple: false,
      });

      // Read file content
      const file = await handle.getFile();
      const content = await file.text();

      // Parse scene asset
      const sceneAsset = SceneAssetFactory.fromJSON(content);

      // Update current scene BEFORE loading entities
      // This ensures emitStateChanged() uses the correct scene name
      // when dirty tracking fires during entity addition
      this.currentScene = sceneAsset;
      this.fileHandle = handle;

      // Clear and load into scene graph
      const entities = SceneAssetFactory.loadIntoSceneGraph(sceneAsset, this.sceneGraph, true);

      // Reset dirty state (loading a scene shouldn't be dirty)
      this._isDirty = false;

      // Emit events
      this.emitStateChanged();
      this.eventBus.emit<SceneLoadedEvent>('scene:loaded', {
        sceneName: this.sceneName,
        entityCount: entities.length,
      });

      // Clear selection
      this.eventBus.emit('selection:changed', { id: null });

      console.log(`Scene opened: ${this.sceneName} (${entities.length} entities)`);
      return { success: true };
    } catch (error) {
      // User cancelled
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { success: false, cancelled: true };
      }

      const message = error instanceof Error ? error.message : 'Unknown error opening scene.';
      console.error('Failed to open scene:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Save the current scene.
   * If no file handle exists, prompts for Save As.
   *
   * @returns Result indicating success, error, or cancellation
   */
  async saveScene(): Promise<SceneOperationResult> {
    // If no file handle, use Save As
    if (!this.fileHandle) {
      return this.saveSceneAs();
    }

    return this.saveToHandle(this.fileHandle);
  }

  /**
   * Save the current scene to a new file.
   * Always prompts for a file location.
   *
   * @returns Result indicating success, error, or cancellation
   */
  async saveSceneAs(): Promise<SceneOperationResult> {
    if (!this.isFileSystemSupported()) {
      return {
        success: false,
        error: 'File System Access API is not supported in this browser.',
      };
    }

    try {
      // Suggest a filename based on scene name
      const suggestedName = this.sanitizeFilename(this.sceneName) + '.scene';

      // Show save file picker
      const handle = await window.showSaveFilePicker({
        types: SCENE_FILE_OPTIONS,
        suggestedName,
      });

      // Update file handle
      this.fileHandle = handle;

      // Update scene name from file name (remove .scene extension)
      const fileName = handle.name.replace(/\.scene$/, '');
      if (this.currentScene) {
        this.currentScene.name = fileName;
      }

      return this.saveToHandle(handle);
    } catch (error) {
      // User cancelled
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { success: false, cancelled: true };
      }

      const message = error instanceof Error ? error.message : 'Unknown error saving scene.';
      console.error('Failed to save scene:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Mark the scene as dirty (has unsaved changes).
   */
  markDirty(): void {
    if (!this._isDirty) {
      this._isDirty = true;
      this.emitStateChanged();
    }
  }

  /**
   * Mark the scene as clean (no unsaved changes).
   */
  markClean(): void {
    if (this._isDirty) {
      this._isDirty = false;
      this.emitStateChanged();
    }
  }

  /**
   * Set up listeners to track scene changes.
   */
  private setupDirtyTracking(): void {
    // Track entity additions
    this.eventBus.on('scene:objectAdded', () => this.markDirty());

    // Track entity removals
    this.eventBus.on('scene:objectRemoved', () => this.markDirty());

    // Track property changes
    this.eventBus.on('entity:propertyUpdated', () => this.markDirty());

    // Track transform changes (from gizmos)
    this.eventBus.on('command:executed', () => this.markDirty());
  }

  /**
   * Save the scene to a file handle.
   */
  private async saveToHandle(handle: FileSystemFileHandle): Promise<SceneOperationResult> {
    try {
      // Update scene entities from current scene graph state
      if (!this.currentScene) {
        this.currentScene = SceneAssetFactory.createFromSceneGraph(
          this.sceneGraph,
          this.sceneName
        );
      } else {
        SceneAssetFactory.updateEntities(this.currentScene, this.sceneGraph);
      }

      // Serialize to JSON
      const json = SceneAssetFactory.toJSON(this.currentScene, true);

      // Write to file
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();

      // Mark as clean
      this._isDirty = false;

      // Emit events
      this.emitStateChanged();
      this.eventBus.emit<SceneSavedEvent>('scene:saved', {
        sceneName: this.sceneName,
        filePath: handle.name,
      });

      console.log(`Scene saved: ${this.sceneName}`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error saving scene.';
      console.error('Failed to save scene:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Show a confirmation dialog for unsaved changes.
   *
   * @returns true if the user wants to proceed (discard changes), false to cancel
   */
  private async confirmUnsavedChanges(): Promise<boolean> {
    return showConfirmDialog({
      title: 'Unsaved Changes',
      message: `You have unsaved changes to "${this.sceneName}". Do you want to discard these changes?`,
      confirmText: 'Discard',
      cancelText: 'Cancel',
      destructive: true,
    });
  }

  /**
   * Emit scene state changed event.
   */
  private emitStateChanged(): void {
    this.eventBus.emit<SceneStateChangedEvent>('scene:stateChanged', {
      sceneName: this.sceneName,
      isDirty: this._isDirty,
      hasFileHandle: this.hasFileHandle,
    });
  }

  /**
   * Sanitize a string for use as a filename.
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 200); // Limit length
  }
}
