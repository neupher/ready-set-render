/**
 * ImportController - Handles 3D model import workflow
 *
 * Manages the import process for 3D models:
 * 1. Shows file picker dialog (accepting all extensions registered importers support)
 * 2. Validates project is open (or prompts user to open one)
 * 3. Routes the file to the first registered importer that can handle it
 * 4. Adds imported entities to the scene and emits `import:complete`
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
 * });
 *
 * // Register one or more importers (typically after pluginManager.initializeAll())
 * importController.registerImporter(gltfImporter);
 * importController.registerImporter(objImporter);
 *
 * // Handle import command
 * eventBus.on('command:import', () => importController.handleImport());
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { SceneGraph } from '@core/SceneGraph';
import type { ProjectService } from '@core/ProjectService';
import type { IImporter, ImportOptions, ImportResult } from '@core/interfaces';

/**
 * Result of an import operation.
 */
export interface ImportOperationResult {
  /** Whether the import was successful */
  success: boolean;
  /** Error message if import failed */
  error?: string;
  /** Number of entities imported */
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
  /** Scene graph for adding imported entities */
  sceneGraph: SceneGraph;
  /** Project service for checking project state */
  projectService: ProjectService;
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
 *
 * Importer-agnostic: importers are registered via {@link registerImporter} and
 * routed to by file extension via their {@link IImporter.canImport} method.
 * Adding a new importer requires zero changes to this class.
 */
export class ImportController {
  private readonly eventBus: EventBus;
  private readonly sceneGraph: SceneGraph;
  private readonly projectService: ProjectService;
  private readonly importers: IImporter[] = [];

  constructor(options: ImportControllerOptions) {
    this.eventBus = options.eventBus;
    this.sceneGraph = options.sceneGraph;
    this.projectService = options.projectService;
  }

  /**
   * Register an importer with the controller.
   *
   * Importers are matched against incoming files in registration order;
   * the first importer whose `canImport()` returns true wins.
   *
   * @param importer - The importer plugin to register
   */
  registerImporter(importer: IImporter): void {
    this.importers.push(importer);
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

      // Find a matching importer and run it
      const importer = this.findImporter(file);
      if (!importer) {
        return {
          success: false,
          error: `Unsupported file format: ${file.name}`,
        };
      }

      return await this.runImporter(importer, file);
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
      const importer = this.findImporter(file);
      if (!importer) {
        return {
          success: false,
          error: `Unsupported file format: ${file.name}`,
        };
      }

      return await this.runImporter(importer, file);
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
   * Import a source file from the project folder.
   * Reads the file from the project's sources directory and imports it.
   *
   * @param sourcePath - Relative path within the project (e.g., "sources/models/car.glb")
   * @returns Result of the import operation
   */
  async importFromProject(sourcePath: string): Promise<ImportOperationResult> {
    try {
      // Ensure project is open
      if (!this.projectService.isProjectOpen) {
        return {
          success: false,
          error: 'No project is open. Cannot import from project source.',
        };
      }

      // Read the source file from project
      const file = await this.projectService.readSourceFile(sourcePath);
      if (!file) {
        return {
          success: false,
          error: `Source file not found: ${sourcePath}`,
        };
      }

      console.log(`Importing from project source: ${sourcePath}`);

      const importer = this.findImporter(file);
      if (!importer) {
        return {
          success: false,
          error: `Unsupported file format: ${file.name}`,
        };
      }

      // Pass the project-relative path so importers that persist companion
      // metadata write it next to the actual source file.
      return await this.runImporter(importer, file, { sourcePath });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Import from project failed:', errorMessage);
      return {
        success: false,
        error: `Import failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Find the first registered importer that can handle the given file.
   *
   * @param file - The file to match
   * @returns The matching importer, or null if none can handle the file
   */
  private findImporter(file: File): IImporter | null {
    return this.importers.find(importer => importer.canImport(file)) ?? null;
  }

  /**
   * Build the file picker `accept` map from all registered importers.
   * Each importer contributes one entry with its display name and extensions.
   */
  private buildFilePickerTypes(): FilePickerOptions['types'] {
    return this.importers.map(importer => ({
      description: `${importer.name} (${importer.supportedExtensions.join(', ')})`,
      accept: {
        'application/octet-stream': [...importer.supportedExtensions],
      },
    }));
  }

  /**
   * Build the comma-separated accept list for the fallback file picker.
   */
  private buildFallbackAcceptList(): string {
    const exts = new Set<string>();
    for (const importer of this.importers) {
      for (const ext of importer.supportedExtensions) {
        exts.add(ext);
      }
    }
    return Array.from(exts).join(',');
  }

  /**
   * Show the file picker dialog for files supported by registered importers.
   *
   * @returns The selected file or null if cancelled
   */
  private async showFilePicker(): Promise<File | null> {
    // Check if File System Access API is available
    if (!('showOpenFilePicker' in window)) {
      // Fallback to input element for browsers without File System Access API
      return this.showFallbackFilePicker();
    }

    const types = this.buildFilePickerTypes();
    if (types.length === 0) {
      console.warn('No importers registered; cannot show file picker.');
      return null;
    }

    const options: FilePickerOptions = {
      types,
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
      input.accept = this.buildFallbackAcceptList();

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
   * Run an importer against a file and integrate the result into the scene.
   *
   * Adds entities to the scene graph, emits `import:complete`, and computes
   * an `ImportOperationResult` with per-asset-type counts derived from the
   * importer's returned `assets` array.
   */
  private async runImporter(
    importer: IImporter,
    file: File,
    options?: ImportOptions
  ): Promise<ImportOperationResult> {
    console.log(`Importing ${file.name} with ${importer.name}`);

    const result: ImportResult = await importer.import(file, options);

    // Log warnings
    if (result.warnings.length > 0) {
      console.warn('Import warnings:', result.warnings);
    }

    // Add entities to scene
    for (const entity of result.entities) {
      this.sceneGraph.add(entity);
    }

    const meshAssetCount = result.assets.filter(a => a.type === 'mesh').length;
    const materialAssetCount = result.assets.filter(a => a.type === 'material').length;

    // Emit import complete event
    this.eventBus.emit('import:complete', {
      filename: file.name,
      objectCount: result.entities.length,
      meshAssetCount,
      materialAssetCount,
      assetMetaId: result.primaryAssetId,
    });

    console.log(
      `Import complete: ${result.entities.length} objects, ` +
      `${meshAssetCount} mesh assets, ` +
      `${materialAssetCount} material assets` +
      (this.projectService.isProjectOpen ? ' (saved to project)' : '')
    );

    return {
      success: true,
      objectCount: result.entities.length,
      meshAssetCount,
      materialAssetCount,
      warnings: result.warnings,
    };
  }
}
