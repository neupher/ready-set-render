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
  ProjectOpenedEvent,
  ProjectClosedEvent,
} from './interfaces/IProjectService';
import type { IAsset, AssetType } from './assets/interfaces';

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

  private _projectMetadata: IProjectMetadata | undefined;
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private metadataHandle: FileSystemDirectoryHandle | null = null;

  constructor(options: ProjectServiceOptions) {
    this.eventBus = options.eventBus;
    this.assetRegistry = options.assetRegistry;
    this.assetStore = options.assetStore;
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

      // Remember this project for next session
      this.saveLastProject(this.rootHandle.name);

      // Emit project opened event
      this.eventBus.emit<ProjectOpenedEvent>('project:opened', {
        projectName: this._projectMetadata.name,
        projectPath: this.rootHandle.name,
        assetsDiscovered: assets.length,
        isNew,
      });

      return {
        success: true,
        projectName: this._projectMetadata.name,
        assetsDiscovered: assets.length,
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

    // List all assets from the store
    const assetTypes: AssetType[] = ['shader', 'material', 'scene', 'texture'];

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
