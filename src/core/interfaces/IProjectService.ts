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
}
