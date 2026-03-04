/**
 * IProjectService - Interface for project folder management
 *
 * The ProjectService manages the concept of a "project" - a local folder
 * that contains all assets (materials, shaders, textures, scenes) for a
 * 3D editor session. This enables project-based workflows similar to
 * Unity, Unreal, or Blender.
 *
 * @example
 * ```typescript
 * const projectService = new ProjectService({ eventBus, assetRegistry, assetStore });
 *
 * // Open an existing project
 * const result = await projectService.openProject();
 * if (result.success) {
 *   console.log('Opened project:', result.projectName);
 *   console.log('Found assets:', result.assetsDiscovered);
 * }
 *
 * // Check project state
 * if (projectService.isProjectOpen) {
 *   console.log('Working in:', projectService.projectName);
 * }
 * ```
 */

import type { IAsset } from '../assets/interfaces';

/**
 * Supported source file types that can be imported.
 */
export type SourceFileType = 'model' | 'texture' | 'other';

/**
 * Supported model file formats.
 */
export type ModelFileFormat = 'glb' | 'gltf';

/**
 * Represents a source file in the project folder that can be imported.
 * Source files are the original assets (like .glb models) before they
 * are processed into the editor's internal asset format.
 */
export interface ISourceFile {
  /**
   * File name with extension (e.g., "car.glb").
   */
  name: string;

  /**
   * Relative path within the project folder (e.g., "sources/models/car.glb").
   */
  path: string;

  /**
   * Type of source file.
   */
  type: SourceFileType;

  /**
   * File format/extension without dot (e.g., "glb", "gltf", "png").
   */
  format: string;

  /**
   * File size in bytes.
   */
  size: number;

  /**
   * Last modified timestamp.
   */
  lastModified: Date;

  /**
   * Whether this source file has been imported (has a corresponding asset).
   * For models, this means there's a .model.json that references this source.
   */
  isImported: boolean;

  /**
   * UUID of the imported asset (if isImported is true).
   */
  importedAssetId?: string;
}

/**
 * Event data emitted when source files are scanned.
 */
export interface SourceFilesScannedEvent {
  sourceFiles: ISourceFile[];
  newFiles: number;
  importedFiles: number;
}

/**
 * Event data emitted when the project is refreshed.
 */
export interface ProjectRefreshedEvent {
  assetsDiscovered: number;
  sourceFilesDiscovered: number;
}

/**
 * Project metadata stored in .ready-set-render/project.json
 */
export interface IProjectMetadata {
  /**
   * Project file format version.
   */
  version: string;

  /**
   * Human-readable project name.
   */
  name: string;

  /**
   * When the project was created (ISO 8601).
   */
  createdAt: string;

  /**
   * When the project was last modified (ISO 8601).
   */
  modifiedAt: string;
}

/**
 * Result of opening or creating a project.
 */
export interface IProjectOpenResult {
  /**
   * True if the project was successfully opened/created.
   */
  success: boolean;

  /**
   * The name of the project (folder name).
   */
  projectName?: string;

  /**
   * Number of assets discovered in the project folder.
   */
  assetsDiscovered?: number;

  /**
   * Error message if the operation failed.
   */
  error?: string;

  /**
   * True if this is a newly created project (vs opening existing).
   */
  isNew?: boolean;
}

/**
 * Result of closing a project.
 */
export interface IProjectCloseResult {
  /**
   * True if the project was successfully closed.
   */
  success: boolean;

  /**
   * Error message if the operation failed.
   */
  error?: string;
}

/**
 * Event data emitted when a project is opened.
 */
export interface ProjectOpenedEvent {
  projectName: string;
  projectPath: string;
  assetsDiscovered: number;
  isNew: boolean;
}

/**
 * Event data emitted when a project is closed.
 */
export interface ProjectClosedEvent {
  projectName: string;
}

/**
 * Interface for project management service.
 */
export interface IProjectService {
  /**
   * Whether a project is currently open.
   */
  readonly isProjectOpen: boolean;

  /**
   * The name of the currently open project (folder name).
   */
  readonly projectName: string | undefined;

  /**
   * The project metadata (if a project is open).
   */
  readonly projectMetadata: IProjectMetadata | undefined;

  /**
   * Check if the File System Access API is supported.
   */
  isSupported(): boolean;

  /**
   * Open a project folder.
   * Shows a folder picker dialog and scans for existing assets.
   *
   * @returns Result of the open operation
   */
  openProject(): Promise<IProjectOpenResult>;

  /**
   * Close the current project.
   * Clears the asset registry of user assets (keeps built-in).
   *
   * @returns Result of the close operation
   */
  closeProject(): Promise<IProjectCloseResult>;

  /**
   * Scan the project folder for assets and register them.
   * Called automatically when opening a project.
   *
   * @returns Array of discovered assets
   */
  scanForAssets(): Promise<IAsset[]>;

  /**
   * Scan the project folder for source files (e.g., .glb, .gltf).
   * Source files are original assets that can be imported.
   *
   * @returns Array of discovered source files
   */
  scanSourceFiles(): Promise<ISourceFile[]>;

  /**
   * Get the currently cached source files.
   * Call scanSourceFiles() first to populate the cache.
   *
   * @returns Array of source files from last scan
   */
  getSourceFiles(): ISourceFile[];

  /**
   * Read a source file from the project folder.
   *
   * @param relativePath - Relative path within the project (e.g., "sources/models/car.glb")
   * @returns The File object, or null if not found
   */
  readSourceFile(relativePath: string): Promise<File | null>;

  /**
   * Rescan the entire project (assets and source files).
   * Clears and repopulates the asset registry.
   */
  rescanProject(): Promise<void>;

  /**
   * Save an asset to the project folder.
   *
   * @param asset - The asset to save
   * @returns True if saved successfully
   */
  saveAsset(asset: IAsset): Promise<boolean>;

  /**
   * Delete an asset from the project folder.
   *
   * @param uuid - The UUID of the asset to delete
   * @returns True if deleted successfully
   */
  deleteAsset(uuid: string): Promise<boolean>;

  /**
   * Copy a source file to the project folder.
   *
   * @param file - The file to copy
   * @param subfolder - Optional subfolder within sources
   * @returns The relative path to the copied file, or null if failed
   */
  copySourceFile(file: File, subfolder?: string): Promise<string | null>;
}
