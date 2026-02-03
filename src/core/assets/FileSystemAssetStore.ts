/**
 * FileSystemAssetStore - File System Access API based asset storage
 *
 * This store uses the modern File System Access API to persist assets
 * to real files on disk. The user selects a project folder, and assets
 * are stored in a standard directory structure:
 *
 * ```
 * project-folder/
 * ├── assets/
 * │   ├── shaders/
 * │   │   └── {uuid}.shader.json
 * │   ├── materials/
 * │   │   └── {uuid}.material.json
 * │   ├── scenes/
 * │   │   └── {uuid}.scene.json
 * │   └── textures/
 * │       └── {uuid}.texture.json
 * └── project.json (future: project metadata)
 * ```
 *
 * @example
 * ```typescript
 * const store = new FileSystemAssetStore(eventBus);
 *
 * // Check browser support
 * if (!store.isSupported()) {
 *   console.warn('File System Access API not supported');
 * }
 *
 * // Open project folder
 * const result = await store.openFolder();
 * if (result.success) {
 *   console.log('Opened:', result.folderName);
 * }
 * ```
 */

import type { EventBus } from '../EventBus';
import type {
  IAssetStore,
  IFolderOpenResult,
  IAssetLoadResult,
  IAssetSaveResult,
  IAsset,
  AssetType,
  IAssetMetadata,
} from './interfaces';
import { getAssetFileExtension, isAssetMetadata } from './interfaces';

/**
 * Event data for store state changes.
 */
export interface AssetStoreOpenedEvent {
  folderName: string;
}

export interface AssetStoreClosedEvent {
  folderName: string;
}

/**
 * Mapping of asset types to their folder names.
 */
const ASSET_FOLDERS: Record<AssetType, string> = {
  shader: 'shaders',
  material: 'materials',
  scene: 'scenes',
  texture: 'textures',
};

/**
 * File System Access API asset store implementation.
 */
export class FileSystemAssetStore implements IAssetStore {
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private assetsHandle: FileSystemDirectoryHandle | null = null;
  private _folderName: string | undefined;

  /**
   * Cache of asset folder handles for each type.
   */
  private folderHandles = new Map<AssetType, FileSystemDirectoryHandle>();

  /**
   * Create a new FileSystemAssetStore.
   *
   * @param eventBus - Event bus for publishing store events
   */
  constructor(private readonly eventBus: EventBus) {}

  /**
   * Get the root directory handle (for external access like ProjectService).
   */
  getRootHandle(): FileSystemDirectoryHandle | null {
    return this.rootHandle;
  }

  /**
   * Whether a folder is currently open.
   */
  get isOpen(): boolean {
    return this.rootHandle !== null;
  }

  /**
   * The name of the currently open folder.
   */
  get folderName(): string | undefined {
    return this._folderName;
  }

  /**
   * Check if the File System Access API is supported.
   */
  isSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  /**
   * Open a folder for asset storage.
   */
  async openFolder(): Promise<IFolderOpenResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'File System Access API is not supported in this browser.',
      };
    }

    try {
      // Show the directory picker
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      });

      this.rootHandle = handle;
      this._folderName = handle.name;

      // Create or get the assets directory
      this.assetsHandle = await handle.getDirectoryHandle('assets', { create: true });

      // Create subdirectories for each asset type
      for (const [type, folderName] of Object.entries(ASSET_FOLDERS)) {
        const folderHandle = await this.assetsHandle.getDirectoryHandle(folderName, {
          create: true,
        });
        this.folderHandles.set(type as AssetType, folderHandle);
      }

      this.eventBus.emit<AssetStoreOpenedEvent>('assetStore:opened', {
        folderName: handle.name,
      });

      return {
        success: true,
        folderName: handle.name,
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
        error: error instanceof Error ? error.message : 'Unknown error opening folder.',
      };
    }
  }

  /**
   * Close the current folder.
   */
  closeFolder(): void {
    const previousName = this._folderName;

    this.rootHandle = null;
    this.assetsHandle = null;
    this._folderName = undefined;
    this.folderHandles.clear();

    if (previousName) {
      this.eventBus.emit<AssetStoreClosedEvent>('assetStore:closed', {
        folderName: previousName,
      });
    }
  }

  /**
   * Save an asset to storage.
   */
  async saveAsset(asset: IAsset): Promise<IAssetSaveResult> {
    if (!this.isOpen) {
      return {
        success: false,
        error: 'No folder is open. Call openFolder() first.',
      };
    }

    const folderHandle = this.folderHandles.get(asset.type);
    if (!folderHandle) {
      return {
        success: false,
        error: `Unknown asset type: ${asset.type}`,
      };
    }

    try {
      // Create file name: {uuid}{extension}
      const fileName = `${asset.uuid}${getAssetFileExtension(asset.type)}`;

      // Get or create the file
      const fileHandle = await folderHandle.getFileHandle(fileName, { create: true });

      // Write the asset as JSON
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(asset, null, 2));
      await writable.close();

      const path = `assets/${ASSET_FOLDERS[asset.type]}/${fileName}`;

      return {
        success: true,
        path,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving asset.',
      };
    }
  }

  /**
   * Load an asset from storage.
   */
  async loadAsset<T extends IAsset>(
    uuid: string,
    type: AssetType
  ): Promise<IAssetLoadResult<T>> {
    if (!this.isOpen) {
      return {
        success: false,
        error: 'No folder is open. Call openFolder() first.',
      };
    }

    const folderHandle = this.folderHandles.get(type);
    if (!folderHandle) {
      return {
        success: false,
        error: `Unknown asset type: ${type}`,
      };
    }

    try {
      const fileName = `${uuid}${getAssetFileExtension(type)}`;
      const fileHandle = await folderHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const content = await file.text();
      const asset = JSON.parse(content) as T;

      return {
        success: true,
        asset,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        return {
          success: false,
          error: `Asset not found: ${uuid}`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error loading asset.',
      };
    }
  }

  /**
   * Delete an asset from storage.
   */
  async deleteAsset(uuid: string, type: AssetType): Promise<boolean> {
    if (!this.isOpen) {
      return false;
    }

    const folderHandle = this.folderHandles.get(type);
    if (!folderHandle) {
      return false;
    }

    try {
      const fileName = `${uuid}${getAssetFileExtension(type)}`;
      await folderHandle.removeEntry(fileName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all assets in storage.
   */
  async listAssets(type?: AssetType): Promise<IAssetMetadata[]> {
    if (!this.isOpen) {
      return [];
    }

    const results: IAssetMetadata[] = [];
    const typesToScan = type ? [type] : (Object.keys(ASSET_FOLDERS) as AssetType[]);

    for (const assetType of typesToScan) {
      const folderHandle = this.folderHandles.get(assetType);
      if (!folderHandle) {
        continue;
      }

      try {
        // Iterate over files in the folder
        for await (const [name, handle] of folderHandle.entries()) {
          if (handle.kind !== 'file') {
            continue;
          }

          // Check if it's an asset file
          const extension = getAssetFileExtension(assetType);
          if (!name.endsWith(extension)) {
            continue;
          }

          try {
            const fileHandle = handle as FileSystemFileHandle;
            const file = await fileHandle.getFile();
            const content = await file.text();
            const data = JSON.parse(content);

            // Validate it's valid asset metadata
            if (isAssetMetadata(data)) {
              results.push(data);
            }
          } catch {
            // Skip invalid files
            console.warn(`Failed to parse asset file: ${name}`);
          }
        }
      } catch (error) {
        console.error(`Error scanning ${assetType} folder:`, error);
      }
    }

    return results;
  }
}
