/**
 * ProjectService - Project folder management
 *
 * Manages the concept of a "project" - a local folder containing all assets
 * for a 3D editor session. This enables project-based workflows similar to
 * Unity, Unreal, or Blender.
 *
 * Project folder structure:
 * ```
 * MyProject/
 * ├── .ready-set-render/          # Project metadata
 * │   └── project.json            # Project settings, version
 * ├── Assets/
 * │   ├── Materials/
 * │   │   └── *.material.json
 * │   ├── Shaders/
 * │   │   └── *.shader.json
 * │   └── Textures/               # Future
 * │       └── *.png, *.jpg
 * └── Scenes/
 *     └── *.scene.json
 * ```
 *
 * @example
 * ```typescript
 * const projectService = new ProjectService({
 *   eventBus,
 *   assetRegistry,
 *   assetStore,
 * });
 *
 * // Open a project folder
 * const result = await projectService.openProject();
 * if (result.success) {
 *   console.log('Opened:', result.projectName);
 * }
 * ```
 */

import type { EventBus } from './EventBus';
import type { AssetRegistry } from './assets/AssetRegistry';
import type { FileSystemAssetStore } from './assets/FileSystemAssetStore';
import type {
  IProjectService,
  IProjectMetadata,
  IProjectOpenResult,
  IProjectCloseResult,
  ISourceFile,
  SourceFileType,
  ProjectOpenedEvent,
  ProjectClosedEvent,
  SourceFilesScannedEvent,
  ProjectRefreshedEvent,
} from './interfaces/IProjectService';
import type { IAsset, AssetType } from './assets/interfaces';
import type { IModelAsset } from './assets/interfaces/IModelAsset';
import type { IModelAssetMeta } from './assets/interfaces/IModelAssetMeta';
import { AssetMetaService } from './assets/AssetMetaService';
import { ModelAssetFactory } from './assets/ModelAssetFactory';

/**
 * Supported source file extensions and their types.
 */
const SOURCE_FILE_EXTENSIONS: Record<string, { type: SourceFileType; format: string }> = {
  '.glb': { type: 'model', format: 'glb' },
  '.gltf': { type: 'model', format: 'gltf' },
  // Future: texture support
  // '.png': { type: 'texture', format: 'png' },
  // '.jpg': { type: 'texture', format: 'jpg' },
  // '.jpeg': { type: 'texture', format: 'jpeg' },
};

/**
 * Folders to scan for source files.
 */
const SOURCE_FOLDERS: Record<SourceFileType, string> = {
  model: 'models',
  texture: 'textures',
  other: 'other',
};

/**
 * Current project file format version.
 */
const PROJECT_VERSION = '1.0.0';

/**
 * Name of the metadata folder in the project root.
 */
const METADATA_FOLDER = '.ready-set-render';

/**
 * Name of the project metadata file.
 */
const PROJECT_FILE = 'project.json';

/**
 * localStorage key for remembering the last project.
 */
const LAST_PROJECT_KEY = 'rsr:lastProject';

/**
 * Minimal interface ProjectService uses to ask an importer to load a
 * source-backed model from its `.assetmeta`. Decouples ProjectService from
 * `GLTFImporter`'s concrete implementation and avoids a circular dependency.
 */
export interface IModelMetaLoader {
  loadFromMeta(file: File, meta: IModelAssetMeta): Promise<unknown>;
}

/**
 * Options for creating a ProjectService.
 */
export interface ProjectServiceOptions {
  /** Event bus for publishing project events */
  eventBus: EventBus;
  /** Asset registry for managing assets */
  assetRegistry: AssetRegistry;
  /** Asset store for file system operations */
  assetStore: FileSystemAssetStore;
}

/**
 * Project management service implementation.
 */
export class ProjectService implements IProjectService {
  private readonly eventBus: EventBus;
  private readonly assetRegistry: AssetRegistry;
  private readonly assetStore: FileSystemAssetStore;
  private readonly assetMetaService: AssetMetaService;
  private readonly modelAssetFactory: ModelAssetFactory;

  private _projectMetadata: IProjectMetadata | undefined;
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private metadataHandle: FileSystemDirectoryHandle | null = null;

  /** Optional loader for source-backed model metas (set by Application). */
  private modelMetaLoader: IModelMetaLoader | null = null;

  /**
   * Cached source files from the last scan.
   */
  private _sourceFiles: ISourceFile[] = [];

  constructor(options: ProjectServiceOptions) {
    this.eventBus = options.eventBus;
    this.assetRegistry = options.assetRegistry;
    this.assetStore = options.assetStore;
    this.assetMetaService = new AssetMetaService();
    this.modelAssetFactory = new ModelAssetFactory();
  }

  /**
   * Wire the model meta loader (typically the GLTFImporter plugin).
   *
   * Called by `Application` after the importer plugin has been constructed
   * but before the first project is opened. When a loader is registered,
   * `scanForModelMetas()` will additionally register the derived mesh and
   * material assets in the registry; without it, only the top-level
   * `IModelAsset` is registered (sufficient for tree display but not for
   * instantiation).
   */
  setModelMetaLoader(loader: IModelMetaLoader): void {
    this.modelMetaLoader = loader;
  }

  /**
   * Whether a project is currently open.
   */
  get isProjectOpen(): boolean {
    return this.assetStore.isOpen && this._projectMetadata !== undefined;
  }

  /**
   * The name of the currently open project.
   */
  get projectName(): string | undefined {
    return this._projectMetadata?.name;
  }

  /**
   * The project metadata.
   */
  get projectMetadata(): IProjectMetadata | undefined {
    return this._projectMetadata;
  }

  /**
   * Check if the File System Access API is supported.
   */
  isSupported(): boolean {
    return this.assetStore.isSupported();
  }

  /**
   * Open a project folder.
   */
  async openProject(): Promise<IProjectOpenResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'File System Access API is not supported in this browser. Please use Chrome or Edge.',
      };
    }

    // Close any existing project first
    if (this.isProjectOpen) {
      await this.closeProject();
    }

    try {
      // Show folder picker via asset store
      const openResult = await this.assetStore.openFolder();
      if (!openResult.success) {
        return {
          success: false,
          error: openResult.error,
        };
      }

      // Get the root handle from asset store
      this.rootHandle = this.assetStore.getRootHandle();
      if (!this.rootHandle) {
        return {
          success: false,
          error: 'Failed to access project folder.',
        };
      }

      // Check if this is an existing project or new
      const isExisting = await this.hasProjectMetadata(this.rootHandle);
      let isNew = false;

      if (isExisting) {
        // Load existing project metadata
        const metadata = await this.loadProjectMetadata(this.rootHandle);
        if (!metadata) {
          return {
            success: false,
            error: 'Failed to read project metadata.',
          };
        }
        this._projectMetadata = metadata;
      } else {
        // Create new project metadata
        isNew = true;
        this._projectMetadata = await this.createProjectMetadata(this.rootHandle);
      }

      // Scan for assets and register them
      const assets = await this.scanForAssets();

      // Scan source-backed model metas (.glb/.gltf + .assetmeta) and register
      // synthesized IModelAsset entries so they're visible to the registry on
      // first open, not only after a fresh import.
      const modelAssets = await this.scanForModelMetas();

      // Scan for source files
      const sourceFiles = await this.scanSourceFiles();

      // Remember this project for next session
      this.saveLastProject(this.rootHandle.name);

      // Emit project opened event
      this.eventBus.emit<ProjectOpenedEvent>('project:opened', {
        projectName: this._projectMetadata.name,
        projectPath: this.rootHandle.name,
        assetsDiscovered: assets.length + modelAssets.length,
        isNew,
      });

      console.log(
        `Project opened: ${assets.length} assets + ${modelAssets.length} models, ` +
        `${sourceFiles.length} source files`
      );

      return {
        success: true,
        projectName: this._projectMetadata.name,
        assetsDiscovered: assets.length + modelAssets.length,
        isNew,
      };
    } catch (error) {
      // User cancelled or permission denied
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: 'User cancelled folder selection.',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error opening project.',
      };
    }
  }

  /**
   * Close the current project.
   */
  async closeProject(): Promise<IProjectCloseResult> {
    if (!this.isProjectOpen) {
      return {
        success: true,
      };
    }

    const projectName = this._projectMetadata?.name;

    try {
      // Clear user assets from registry (keep built-in)
      this.clearUserAssets();

      // Close the asset store
      this.assetStore.closeFolder();

      // Clear local state
      this._projectMetadata = undefined;
      this.rootHandle = null;
      this.metadataHandle = null;
      this._sourceFiles = [];

      // Clear last project
      this.clearLastProject();

      // Emit project closed event
      if (projectName) {
        this.eventBus.emit<ProjectClosedEvent>('project:closed', {
          projectName,
        });
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error closing project.',
      };
    }
  }

  /**
   * Scan for assets and register them.
   */
  async scanForAssets(): Promise<IAsset[]> {
    if (!this.assetStore.isOpen) {
      return [];
    }

    const discoveredAssets: IAsset[] = [];

    // List all assets from the store (includes mesh and model assets)
    const assetTypes: AssetType[] = ['shader', 'material', 'scene', 'texture', 'mesh', 'model'];

    for (const type of assetTypes) {
      const metadata = await this.assetStore.listAssets(type);

      for (const meta of metadata) {
        // Load the full asset
        const loadResult = await this.assetStore.loadAsset(meta.uuid, type);
        if (loadResult.success && loadResult.asset) {
          // Check if asset is built-in (only for shader/material types)
          const asset = loadResult.asset as IAsset & { isBuiltIn?: boolean };
          if (asset.isBuiltIn) {
            continue;
          }

          // Register in the asset registry if not already present
          if (!this.assetRegistry.get(meta.uuid)) {
            this.assetRegistry.register(loadResult.asset);
          }
          discoveredAssets.push(loadResult.asset);
        }
      }
    }

    return discoveredAssets;
  }

  /**
   * Scan the project for `.assetmeta` companion files and register the
   * resulting `IModelAsset`s in the asset registry.
   *
   * Walks the **entire** project tree (skipping the metadata folder and any
   * dot-prefixed directories) so that `.assetmeta` files in `assets/`,
   * `sources/`, or any other custom folder are all discovered. This matches
   * `AssetBrowserTab.scanDirectoryForMetas` so the registry and the tree
   * never disagree about which models exist.
   *
   * If a `modelMetaLoader` has been registered, this also asks the loader to
   * register the derived mesh and material assets (eager load) so that
   * downstream consumers (instantiation, drag-drop, scene serialization) can
   * resolve every UUID without needing a fresh import.
   *
   * Idempotent — re-running for the same metas replaces existing registrations
   * (the underlying loader/factory handle UUID collisions).
   *
   * @returns The list of registered `IModelAsset`s
   */
  async scanForModelMetas(): Promise<IModelAsset[]> {
    if (!this.isProjectOpen || !this.rootHandle) {
      return [];
    }

    const discovered: IModelAsset[] = [];

    try {
      // Walk the whole project root, not just `sources/`, so model metas in
      // `assets/` (or any other folder) are also picked up.
      await this.walkForModelMetas(this.rootHandle, '', discovered);
    } catch (error) {
      console.error('Failed to scan for model metas:', error);
    }

    return discovered;
  }

  /**
   * Recursively walk a source directory looking for `.assetmeta` files
   * paired with `.glb` / `.gltf` source files. Found metas are registered
   * as `IModelAsset`s (and, if a loader is wired, their derived mesh /
   * material assets too).
   */
  private async walkForModelMetas(
    dirHandle: FileSystemDirectoryHandle,
    relativePath: string,
    results: IModelAsset[]
  ): Promise<void> {
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === 'directory') {
          // Skip hidden and metadata folders
          if (name.startsWith('.') || name === METADATA_FOLDER) {
            continue;
          }
          const subPath = relativePath ? `${relativePath}/${name}` : name;
          await this.walkForModelMetas(
            handle as FileSystemDirectoryHandle,
            subPath,
            results
          );
          continue;
        }

        if (handle.kind !== 'file' || !name.endsWith('.assetmeta')) {
          continue;
        }

        const sourceFilename = name.replace('.assetmeta', '');
        const ext = '.' + (sourceFilename.split('.').pop()?.toLowerCase() ?? '');
        if (ext !== '.glb' && ext !== '.gltf') {
          continue;
        }

        const result = await this.assetMetaService.readModelMeta(dirHandle, sourceFilename);
        if (!result.success || !result.meta) {
          console.warn(`Failed to read .assetmeta for ${sourceFilename}: ${result.error}`);
          continue;
        }

        const meta = result.meta;
        const sourcePath = relativePath ? `${relativePath}/${sourceFilename}` : sourceFilename;

        // Synthesize and register the IModelAsset (replace any existing one)
        const modelAsset = this.modelAssetFactory.fromMeta(meta, sourceFilename);
        if (this.assetRegistry.get(modelAsset.uuid)) {
          this.assetRegistry.unregister(modelAsset.uuid);
        }
        this.assetRegistry.register(modelAsset);
        results.push(modelAsset);

        // If a loader is wired, eagerly register the derived assets too
        if (this.modelMetaLoader) {
          try {
            const file = await this.readSourceFile(sourcePath);
            if (file) {
              await this.modelMetaLoader.loadFromMeta(file, meta);
            } else {
              console.warn(`Source file missing for meta: ${sourcePath}`);
            }
          } catch (error) {
            console.error(`Failed to load derived assets for ${sourcePath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to walk directory ${relativePath}:`, error);
    }
  }

  /**
   * Scan the project folder for source files (e.g., .glb, .gltf).
   * Source files are the original files that can be imported into the editor.
   */
  async scanSourceFiles(): Promise<ISourceFile[]> {
    if (!this.isProjectOpen || !this.rootHandle) {
      this._sourceFiles = [];
      return [];
    }

    const sourceFiles: ISourceFile[] = [];

    try {
      // Get or create the sources directory
      const sourcesHandle = await this.rootHandle.getDirectoryHandle('sources', { create: true });

      // Scan each source folder type
      for (const [type, folderName] of Object.entries(SOURCE_FOLDERS)) {
        try {
          const folderHandle = await sourcesHandle.getDirectoryHandle(folderName, { create: true });
          const filesInFolder = await this.scanSourceFolder(
            folderHandle,
            `sources/${folderName}`,
            type as SourceFileType
          );
          sourceFiles.push(...filesInFolder);
        } catch (error) {
          // Folder doesn't exist or can't be accessed - skip it
          console.debug(`Source folder not found or inaccessible: sources/${folderName}`);
        }
      }

      // Check which source files have been imported
      await this.markImportedSourceFiles(sourceFiles);

      // Cache the results
      this._sourceFiles = sourceFiles;

      // Emit event
      const importedCount = sourceFiles.filter(f => f.isImported).length;
      this.eventBus.emit<SourceFilesScannedEvent>('sourceFiles:scanned', {
        sourceFiles,
        newFiles: sourceFiles.length - importedCount,
        importedFiles: importedCount,
      });

      console.log(`Scanned ${sourceFiles.length} source files (${importedCount} imported)`);
      return sourceFiles;
    } catch (error) {
      console.error('Failed to scan source files:', error);
      this._sourceFiles = [];
      return [];
    }
  }

  /**
   * Get the cached source files from the last scan.
   */
  getSourceFiles(): ISourceFile[] {
    return this._sourceFiles;
  }

  /**
   * Delete a source file from the project folder.
   *
   * Also removes the companion `.assetmeta` file (if present) so the model
   * disappears entirely from the Asset Browser. Best-effort: a missing
   * `.assetmeta` is not treated as an error.
   *
   * @param relativePath - Project-relative path (e.g. `sources/models/car.glb`)
   * @returns True if the source file was deleted (the meta companion is best-effort)
   */
  async deleteSourceFile(relativePath: string): Promise<boolean> {
    if (!this.isProjectOpen || !this.rootHandle) {
      console.warn('Cannot delete source file: no project is open');
      return false;
    }

    const parts = relativePath.split('/');
    const fileName = parts.pop();
    if (!fileName) {
      console.error('Invalid source file path:', relativePath);
      return false;
    }

    let dirHandle: FileSystemDirectoryHandle = this.rootHandle;
    try {
      for (const part of parts) {
        dirHandle = await dirHandle.getDirectoryHandle(part);
      }
    } catch (error) {
      console.error('Failed to navigate to source folder:', relativePath, error);
      return false;
    }

    // Best-effort delete the companion .assetmeta first, then the source file
    try {
      await this.assetMetaService.deleteMeta(dirHandle, fileName);
    } catch (error) {
      // Not fatal — the meta may not exist
      console.debug(`No .assetmeta to delete for ${fileName}:`, error);
    }

    try {
      await dirHandle.removeEntry(fileName);
      console.log(`Deleted source file: ${relativePath}`);
      await this.updateProjectModifiedTime();
      return true;
    } catch (error) {
      console.error('Failed to delete source file:', relativePath, error);
      return false;
    }
  }

  /**
   * Duplicate a source file in place under a unique filename.
   *
   * The duplicate is placed in the same directory as the source. A `_copy`
   * (or `_copy_N`) suffix is appended before the extension. The companion
   * `.assetmeta` is **not** copied — callers that want a fully-imported
   * duplicate should re-run the importer on the new file (which generates
   * fresh UUIDs and writes a new `.assetmeta`).
   *
   * @param relativePath - Project-relative path of the source to duplicate
   * @returns The new file's project-relative path, or null on failure
   */
  async duplicateSourceFile(relativePath: string): Promise<string | null> {
    if (!this.isProjectOpen || !this.rootHandle) {
      console.warn('Cannot duplicate source file: no project is open');
      return null;
    }

    const file = await this.readSourceFile(relativePath);
    if (!file) {
      console.warn('Cannot duplicate: source file not found:', relativePath);
      return null;
    }

    const parts = relativePath.split('/');
    const originalFileName = parts.pop();
    if (!originalFileName) {
      return null;
    }
    const directory = parts.join('/');

    // Navigate to the destination directory
    let dirHandle: FileSystemDirectoryHandle = this.rootHandle;
    try {
      for (const part of parts) {
        dirHandle = await dirHandle.getDirectoryHandle(part);
      }
    } catch (error) {
      console.error('Failed to navigate to source folder:', relativePath, error);
      return null;
    }

    // Find a unique filename: car.glb → car_copy.glb → car_copy_1.glb → ...
    const dotIndex = originalFileName.lastIndexOf('.');
    const baseName = dotIndex > 0 ? originalFileName.slice(0, dotIndex) : originalFileName;
    const ext = dotIndex > 0 ? originalFileName.slice(dotIndex) : '';

    const candidates = (function* (): Generator<string> {
      yield `${baseName}_copy${ext}`;
      for (let i = 1; i < 100; i++) {
        yield `${baseName}_copy_${i}${ext}`;
      }
    })();

    let uniqueName: string | null = null;
    for (const candidate of candidates) {
      try {
        await dirHandle.getFileHandle(candidate);
        // File exists; try the next candidate
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotFoundError') {
          uniqueName = candidate;
          break;
        }
        // Other errors propagate
        console.error('Failed to probe destination filename:', candidate, error);
        return null;
      }
    }

    if (!uniqueName) {
      console.error('Failed to find a unique duplicate name within 100 attempts');
      return null;
    }

    try {
      const fileHandle = await dirHandle.getFileHandle(uniqueName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();

      const newRelativePath = directory ? `${directory}/${uniqueName}` : uniqueName;
      console.log(`Duplicated source file: ${relativePath} → ${newRelativePath}`);
      await this.updateProjectModifiedTime();
      return newRelativePath;
    } catch (error) {
      console.error('Failed to write duplicate source file:', error);
      return null;
    }
  }

  /**
   * Read a source file from the project folder.
   */
  async readSourceFile(relativePath: string): Promise<File | null> {
    if (!this.isProjectOpen || !this.rootHandle) {
      console.warn('Cannot read source file: no project is open');
      return null;
    }

    try {
      // Split the path into parts
      const parts = relativePath.split('/');
      const fileName = parts.pop();
      if (!fileName) {
        console.error('Invalid source file path:', relativePath);
        return null;
      }

      // Navigate to the directory
      let currentHandle: FileSystemDirectoryHandle = this.rootHandle;
      for (const part of parts) {
        currentHandle = await currentHandle.getDirectoryHandle(part);
      }

      // Get the file
      const fileHandle = await currentHandle.getFileHandle(fileName);
      return await fileHandle.getFile();
    } catch (error) {
      console.error('Failed to read source file:', relativePath, error);
      return null;
    }
  }

  /**
   * Rescan the entire project (assets and source files).
   * Clears and repopulates the asset registry with fresh data from disk.
   */
  async rescanProject(): Promise<void> {
    if (!this.isProjectOpen) {
      console.warn('Cannot rescan: no project is open');
      return;
    }

    console.log('Rescanning project...');

    // Clear user assets from registry (keep built-in)
    this.clearUserAssets();

    // Clear source file cache
    this._sourceFiles = [];

    // Rescan assets
    const assets = await this.scanForAssets();

    // Rescan source-backed model metas
    const modelAssets = await this.scanForModelMetas();

    // Rescan source files
    const sourceFiles = await this.scanSourceFiles();

    // Emit refresh event
    this.eventBus.emit<ProjectRefreshedEvent>('project:refreshed', {
      assetsDiscovered: assets.length + modelAssets.length,
      sourceFilesDiscovered: sourceFiles.length,
    });

    console.log(
      `Project rescanned: ${assets.length} assets + ${modelAssets.length} models, ` +
      `${sourceFiles.length} source files`
    );
  }

  /**
   * Scan a single source folder for files.
   */
  private async scanSourceFolder(
    folderHandle: FileSystemDirectoryHandle,
    basePath: string,
    expectedType: SourceFileType
  ): Promise<ISourceFile[]> {
    const files: ISourceFile[] = [];

    for await (const [name, handle] of folderHandle.entries()) {
      if (handle.kind !== 'file') {
        // Skip directories for now (could recurse in future)
        continue;
      }

      // Check if it's a supported file type
      const ext = this.getFileExtension(name);
      const fileInfo = SOURCE_FILE_EXTENSIONS[ext];

      if (!fileInfo) {
        // Unsupported file type
        continue;
      }

      // Only include files that match the expected type for this folder
      if (fileInfo.type !== expectedType) {
        continue;
      }

      try {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();

        files.push({
          name,
          path: `${basePath}/${name}`,
          type: fileInfo.type,
          format: fileInfo.format,
          size: file.size,
          lastModified: new Date(file.lastModified),
          isImported: false, // Will be set by markImportedSourceFiles
        });
      } catch (error) {
        console.warn(`Failed to read source file: ${name}`, error);
      }
    }

    return files;
  }

  /**
   * Mark source files that have been imported (have corresponding assets).
   */
  private async markImportedSourceFiles(sourceFiles: ISourceFile[]): Promise<void> {
    // Get all model assets
    const modelAssets = this.assetRegistry.getByType<IModelAsset>('model');

    // Create a map of source paths to model assets
    const importedPaths = new Map<string, string>();
    for (const model of modelAssets) {
      if (model.source.projectPath) {
        importedPaths.set(model.source.projectPath, model.uuid);
      }
    }

    // Mark source files that have been imported
    for (const sourceFile of sourceFiles) {
      const modelUuid = importedPaths.get(sourceFile.path);
      if (modelUuid) {
        sourceFile.isImported = true;
        sourceFile.importedAssetId = modelUuid;
      }
    }
  }

  /**
   * Get the file extension (including dot) from a filename.
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) {
      return '';
    }
    return filename.substring(lastDot).toLowerCase();
  }

  /**
   * Copy a source file (like .glb) to the project's sources folder.
   * Returns the relative path to the copied file within the project.
   *
   * @param file - The file to copy
   * @param subfolder - Optional subfolder within sources (e.g., 'models')
   * @returns The relative path to the copied file, or null if failed
   */
  async copySourceFile(file: File, subfolder?: string): Promise<string | null> {
    if (!this.isProjectOpen || !this.rootHandle) {
      console.warn('Cannot copy file: no project is open');
      return null;
    }

    try {
      // Get or create the sources directory
      const sourcesHandle = await this.rootHandle.getDirectoryHandle('sources', { create: true });

      // Get or create the subfolder if specified
      let targetHandle = sourcesHandle;
      if (subfolder) {
        targetHandle = await sourcesHandle.getDirectoryHandle(subfolder, { create: true });
      }

      // Create the file in the target directory
      const fileHandle = await targetHandle.getFileHandle(file.name, { create: true });
      const writable = await fileHandle.createWritable();

      // Write the file contents
      await writable.write(await file.arrayBuffer());
      await writable.close();

      // Return the relative path
      const relativePath = subfolder
        ? `sources/${subfolder}/${file.name}`
        : `sources/${file.name}`;

      console.log(`Copied source file to project: ${relativePath}`);
      return relativePath;
    } catch (error) {
      console.error('Failed to copy source file:', error);
      return null;
    }
  }

  /**
   * Save an asset to the project folder.
   */
  async saveAsset(asset: IAsset): Promise<boolean> {
    if (!this.isProjectOpen) {
      console.warn('Cannot save asset: no project is open');
      return false;
    }

    // Don't save built-in assets
    const assetWithBuiltIn = asset as IAsset & { isBuiltIn?: boolean };
    if (assetWithBuiltIn.isBuiltIn) {
      console.warn('Cannot save built-in asset:', asset.name);
      return false;
    }

    const result = await this.assetStore.saveAsset(asset);

    if (result.success) {
      // Update project modified time
      await this.updateProjectModifiedTime();
    }

    return result.success;
  }

  /**
   * Get the root directory handle for the project.
   * Returns null if no project is open.
   *
   * @returns The root FileSystemDirectoryHandle or null
   */
  getProjectHandle(): FileSystemDirectoryHandle | null {
    if (!this.isProjectOpen) {
      return null;
    }
    return this.rootHandle;
  }

  /**
   * Get a directory handle for a given relative path.
   * Creates intermediate directories if they don't exist.
   *
   * @param relativePath - Relative path from project root (e.g., "Assets/Models/car.glb")
   * @returns The directory handle containing the file, or null if project not open
   */
  async getDirectoryHandleForPath(relativePath: string): Promise<FileSystemDirectoryHandle | null> {
    if (!this.isProjectOpen || !this.rootHandle) {
      console.warn('Cannot get directory handle: no project is open');
      return null;
    }

    try {
      // Split the path into parts and remove the filename
      const parts = relativePath.split('/');
      parts.pop(); // Remove filename

      // Navigate/create directories
      let currentHandle = this.rootHandle;
      for (const part of parts) {
        if (part) {
          currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
        }
      }

      return currentHandle;
    } catch (error) {
      console.error('Failed to get directory handle for path:', relativePath, error);
      return null;
    }
  }

  /**
   * Delete an asset from the project folder.
   */
  async deleteAsset(uuid: string): Promise<boolean> {
    if (!this.isProjectOpen) {
      console.warn('Cannot delete asset: no project is open');
      return false;
    }

    // Find the asset to get its type
    const asset = this.assetRegistry.get(uuid);
    if (!asset) {
      console.warn('Asset not found:', uuid);
      return false;
    }

    // Don't delete built-in assets
    const assetWithBuiltIn = asset as IAsset & { isBuiltIn?: boolean };
    if (assetWithBuiltIn.isBuiltIn) {
      console.warn('Cannot delete built-in asset:', asset.name);
      return false;
    }

    const deleted = await this.assetStore.deleteAsset(uuid, asset.type);

    if (deleted) {
      // Update project modified time
      await this.updateProjectModifiedTime();
    }

    return deleted;
  }

  /**
   * Check if a folder has project metadata.
   */
  private async hasProjectMetadata(rootHandle: FileSystemDirectoryHandle): Promise<boolean> {
    try {
      const metadataFolder = await rootHandle.getDirectoryHandle(METADATA_FOLDER);
      await metadataFolder.getFileHandle(PROJECT_FILE);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load project metadata from a folder.
   */
  private async loadProjectMetadata(
    rootHandle: FileSystemDirectoryHandle
  ): Promise<IProjectMetadata | null> {
    try {
      this.metadataHandle = await rootHandle.getDirectoryHandle(METADATA_FOLDER);
      const fileHandle = await this.metadataHandle.getFileHandle(PROJECT_FILE);
      const file = await fileHandle.getFile();
      const content = await file.text();
      return JSON.parse(content) as IProjectMetadata;
    } catch (error) {
      console.error('Failed to load project metadata:', error);
      return null;
    }
  }

  /**
   * Create new project metadata.
   */
  private async createProjectMetadata(
    rootHandle: FileSystemDirectoryHandle
  ): Promise<IProjectMetadata> {
    const now = new Date().toISOString();

    const metadata: IProjectMetadata = {
      version: PROJECT_VERSION,
      name: rootHandle.name,
      createdAt: now,
      modifiedAt: now,
    };

    // Create metadata folder
    this.metadataHandle = await rootHandle.getDirectoryHandle(METADATA_FOLDER, { create: true });

    // Write project file
    const fileHandle = await this.metadataHandle.getFileHandle(PROJECT_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(metadata, null, 2));
    await writable.close();

    return metadata;
  }

  /**
   * Update the project modified timestamp.
   */
  private async updateProjectModifiedTime(): Promise<void> {
    if (!this._projectMetadata || !this.metadataHandle) {
      return;
    }

    this._projectMetadata.modifiedAt = new Date().toISOString();

    try {
      const fileHandle = await this.metadataHandle.getFileHandle(PROJECT_FILE, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(this._projectMetadata, null, 2));
      await writable.close();
    } catch (error) {
      console.error('Failed to update project metadata:', error);
    }
  }

  /**
   * Clear user assets from the registry.
   */
  private clearUserAssets(): void {
    const allAssets = this.assetRegistry.getAll();

    for (const asset of allAssets) {
      const assetWithBuiltIn = asset as IAsset & { isBuiltIn?: boolean };
      if (!assetWithBuiltIn.isBuiltIn) {
        this.assetRegistry.unregister(asset.uuid);
      }
    }
  }

  /**
   * Save the last project name to localStorage.
   */
  private saveLastProject(name: string): void {
    try {
      localStorage.setItem(LAST_PROJECT_KEY, name);
    } catch {
      // localStorage not available
    }
  }

  /**
   * Clear the last project from localStorage.
   */
  private clearLastProject(): void {
    try {
      localStorage.removeItem(LAST_PROJECT_KEY);
    } catch {
      // localStorage not available
    }
  }

  /**
   * Get the last project name from localStorage.
   */
  static getLastProjectName(): string | null {
    try {
      return localStorage.getItem(LAST_PROJECT_KEY);
    } catch {
      return null;
    }
  }
}
