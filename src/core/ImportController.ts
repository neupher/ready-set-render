/**
 * ImportController - Handles 3D model import workflow
 *
 * Manages the import process for 3D models:
 * 1. Shows file picker dialog for .glb/.gltf files
 * 2. Validates project is open (or prompts user to open one)
 * 3. Runs the appropriate importer
 * 4. Adds imported objects to the scene
 *
 * Triggered by:
 * - File menu → Import
 * - Keyboard shortcut Ctrl+I
 *
 * @example
 * ```typescript
 * const importController = new ImportController({
 *   eventBus,
 *   sceneGraph,
 *   projectService,
 *   gltfImporter,
 * });
 *
 * // Handle import command
 * eventBus.on('command:import', () => importController.handleImport());
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { SceneGraph } from '@core/SceneGraph';
import type { ProjectService } from '@core/ProjectService';
import type { GLTFImporter } from '@plugins/importers/gltf/GLTFImporter';

/**
 * Result of an import operation.
 */
export interface ImportOperationResult {
  /** Whether the import was successful */
  success: boolean;
  /** Error message if import failed */
  error?: string;
  /** Number of objects imported */
  objectCount?: number;
  /** Number of mesh assets created */
  meshAssetCount?: number;
  /** Number of material assets created */
  materialAssetCount?: number;
  /** Any warnings from the import process */
  warnings?: string[];
}

/**
 * Configuration for ImportController.
 */
export interface ImportControllerOptions {
  /** Event bus for inter-module communication */
  eventBus: EventBus;
  /** Scene graph for adding imported objects */
  sceneGraph: SceneGraph;
  /** Project service for checking project state */
  projectService: ProjectService;
  /** GLTF importer plugin */
  gltfImporter: GLTFImporter;
}

/**
 * File picker options for the File System Access API.
 */
interface FilePickerOptions {
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
  multiple?: boolean;
}

/**
 * Controller for handling 3D model import operations.
 */
export class ImportController {
  private readonly eventBus: EventBus;
  private readonly sceneGraph: SceneGraph;
  private readonly projectService: ProjectService;
  private readonly gltfImporter: GLTFImporter;

  constructor(options: ImportControllerOptions) {
    this.eventBus = options.eventBus;
    this.sceneGraph = options.sceneGraph;
    this.projectService = options.projectService;
    this.gltfImporter = options.gltfImporter;
  }

  /**
   * Handle the import command.
   * Shows file picker and imports the selected file.
   *
   * @returns Result of the import operation
   */
  async handleImport(): Promise<ImportOperationResult> {
    try {
      // Show file picker
      const file = await this.showFilePicker();
      if (!file) {
        // User cancelled
        return { success: false, error: 'Import cancelled' };
      }

      // Check if project is open, prompt to open one if not
      if (!this.projectService.isProjectOpen) {
        const shouldOpenProject = await this.promptOpenProject();
        if (!shouldOpenProject) {
          // User declined to open project, proceed anyway
          console.log('Importing without open project - assets will not be saved');
        }
      }

      // Determine which importer to use
      if (this.gltfImporter.canImport(file)) {
        return await this.importWithGLTF(file);
      }

      return {
        success: false,
        error: `Unsupported file format: ${file.name}`,
      };
    } catch (error) {
      // Handle user cancellation (AbortError)
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Import cancelled' };
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Import failed:', errorMessage);
      return {
        success: false,
        error: `Import failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Import a file directly (without showing file picker).
   * Useful for drag-and-drop or programmatic import.
   *
   * @param file - The file to import
   * @returns Result of the import operation
   */
  async importFile(file: File): Promise<ImportOperationResult> {
    try {
      if (this.gltfImporter.canImport(file)) {
        return await this.importWithGLTF(file);
      }

      return {
        success: false,
        error: `Unsupported file format: ${file.name}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Import failed:', errorMessage);
      return {
        success: false,
        error: `Import failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Show the file picker dialog for 3D model files.
   *
   * @returns The selected file or null if cancelled
   */
  private async showFilePicker(): Promise<File | null> {
    // Check if File System Access API is available
    if (!('showOpenFilePicker' in window)) {
      // Fallback to input element for browsers without File System Access API
      return this.showFallbackFilePicker();
    }

    const options: FilePickerOptions = {
      types: [
        {
          description: 'glTF Models (.glb, .gltf)',
          accept: {
            'model/gltf-binary': ['.glb'],
            'model/gltf+json': ['.gltf'],
          },
        },
      ],
      multiple: false,
    };

    const [fileHandle] = await (window as Window & {
      showOpenFilePicker: (options: FilePickerOptions) => Promise<FileSystemFileHandle[]>;
    }).showOpenFilePicker(options);

    return await fileHandle.getFile();
  }

  /**
   * Fallback file picker using a hidden input element.
   * Used for browsers without File System Access API support.
   */
  private showFallbackFilePicker(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.glb,.gltf';

      input.onchange = () => {
        const file = input.files?.[0] ?? null;
        resolve(file);
      };

      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  }

  /**
   * Prompt user to open a project folder.
   *
   * @returns True if user opened a project, false otherwise
   */
  private async promptOpenProject(): Promise<boolean> {
    // Emit event to show project open dialog
    // The user can choose to open a project or continue without one
    return new Promise((resolve) => {
      const shouldOpen = confirm(
        'No project folder is open. Assets cannot be saved without a project.\n\n' +
        'Would you like to open a project folder now?'
      );

      if (shouldOpen) {
        // Listen for project open result
        const handleProjectOpened = () => {
          this.eventBus.off('project:opened', handleProjectOpened);
          resolve(true);
        };

        this.eventBus.on('project:opened', handleProjectOpened);
        this.eventBus.emit('command:openProject', undefined);

        // Set timeout in case user cancels project open
        setTimeout(() => {
          this.eventBus.off('project:opened', handleProjectOpened);
          resolve(this.projectService.isProjectOpen);
        }, 30000); // 30 second timeout
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Import a file using the GLTF importer.
   */
  private async importWithGLTF(file: File): Promise<ImportOperationResult> {
    console.log(`Importing GLTF file: ${file.name}`);

    const result = await this.gltfImporter.import(file);

    // Log warnings
    if (result.warnings.length > 0) {
      console.warn('Import warnings:', result.warnings);
    }

    // Add objects to scene
    for (const obj of result.objects) {
      this.sceneGraph.add(obj);
    }

    // Emit import complete event
    this.eventBus.emit('import:complete', {
      filename: file.name,
      objectCount: result.objects.length,
      meshAssetCount: result.meshAssets.length,
      materialAssetCount: result.materialAssets.length,
    });

    console.log(
      `Import complete: ${result.objects.length} objects, ` +
      `${result.meshAssets.length} mesh assets, ` +
      `${result.materialAssets.length} material assets`
    );

    return {
      success: true,
      objectCount: result.objects.length,
      meshAssetCount: result.meshAssets.length,
      materialAssetCount: result.materialAssets.length,
      warnings: result.warnings,
    };
  }
}
