/**
 * IAssetStore - Interface for asset persistence backends
 *
 * The asset store provides an abstraction for persisting assets to storage.
 * The primary implementation uses the File System Access API for real file storage.
 *
 * @example
 * ```typescript
 * const store = new FileSystemAssetStore(eventBus);
 *
 * // Open a project folder
 * await store.openFolder();
 *
 * // Save an asset
 * await store.saveAsset(myMaterial);
 *
 * // Load an asset
 * const material = await store.loadAsset<IMaterialAsset>('uuid', 'material');
 *
 * // List all materials
 * const materials = await store.listAssets('material');
 * ```
 */

import type { AssetType, IAssetMetadata } from './IAssetMetadata';
import type { IAsset } from './IAsset';

/**
 * Result of a folder open operation.
 */
export interface IFolderOpenResult {
  /**
   * True if a folder was successfully opened.
   */
  success: boolean;

  /**
   * The name of the opened folder (if successful).
   */
  folderName?: string;

  /**
   * Error message if the operation failed.
   */
  error?: string;
}

/**
 * Result of loading assets from storage.
 */
export interface IAssetLoadResult<T extends IAsset> {
  /**
   * True if the asset was loaded successfully.
   */
  success: boolean;

  /**
   * The loaded asset (if successful).
   */
  asset?: T;

  /**
   * Error message if the operation failed.
   */
  error?: string;
}

/**
 * Result of saving an asset to storage.
 */
export interface IAssetSaveResult {
  /**
   * True if the asset was saved successfully.
   */
  success: boolean;

  /**
   * The path where the asset was saved (if successful).
   */
  path?: string;

  /**
   * Error message if the operation failed.
   */
  error?: string;
}

/**
 * Interface for asset storage backends.
 * Implementations provide persistence for assets to various storage systems.
 */
export interface IAssetStore {
  /**
   * Whether a folder is currently open for storage.
   */
  readonly isOpen: boolean;

  /**
   * The name of the currently open folder (if any).
   */
  readonly folderName: string | undefined;

  /**
   * Open a folder for asset storage.
   * Shows a folder picker dialog in supported browsers.
   *
   * @returns Result of the open operation
   */
  openFolder(): Promise<IFolderOpenResult>;

  /**
   * Close the current folder.
   */
  closeFolder(): void;

  /**
   * Save an asset to storage.
   *
   * @param asset - The asset to save
   * @returns Result of the save operation
   */
  saveAsset(asset: IAsset): Promise<IAssetSaveResult>;

  /**
   * Load an asset from storage.
   *
   * @param uuid - The UUID of the asset to load
   * @param type - The type of the asset
   * @returns Result containing the loaded asset
   */
  loadAsset<T extends IAsset>(uuid: string, type: AssetType): Promise<IAssetLoadResult<T>>;

  /**
   * Delete an asset from storage.
   *
   * @param uuid - The UUID of the asset to delete
   * @param type - The type of the asset
   * @returns True if deleted, false if not found
   */
  deleteAsset(uuid: string, type: AssetType): Promise<boolean>;

  /**
   * List all assets in storage, optionally filtered by type.
   *
   * @param type - Optional type filter
   * @returns Array of asset metadata (not full assets)
   */
  listAssets(type?: AssetType): Promise<IAssetMetadata[]>;

  /**
   * Check if the File System Access API is supported.
   *
   * @returns True if the API is available
   */
  isSupported(): boolean;
}
