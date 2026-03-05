/**
 * AssetMetaService - Read/write .assetmeta companion files
 *
 * Manages Unity-style .assetmeta files that store import settings and
 * cached references for source assets (like .glb, .png files).
 *
 * The service handles:
 * - Creating new .assetmeta files alongside source files
 * - Reading existing .assetmeta files
 * - Updating import settings
 * - Detecting when source files have changed (dirty state)
 *
 * @example
 * ```typescript
 * const metaService = new AssetMetaService();
 *
 * // Create meta for a new model import
 * const meta = await metaService.createModelMeta(
 *   directoryHandle,
 *   'car.glb',
 *   'Assets/Models/car.glb',
 *   sourceHash,
 *   importSettings,
 *   contents,
 *   hierarchy
 * );
 *
 * // Read existing meta
 * const existingMeta = await metaService.readMeta(directoryHandle, 'car.glb.assetmeta');
 *
 * // Save updated meta
 * await metaService.saveMeta(directoryHandle, meta);
 * ```
 */

import { generateUUID } from '@utils/uuid';
import {
  getAssetMetaFilename,
  type IAssetMeta,
  type AssetMetaType,
} from './interfaces/IAssetMeta';
import {
  MODEL_ASSET_META_VERSION,
  type IModelAssetMeta,
  type IModelImportSettings,
  type IModelMetaContents,
  type IModelMetaNode,
  isModelAssetMeta,
} from './interfaces/IModelAssetMeta';
import { createDefaultModelImportSettings } from './DefaultImportSettings';

/**
 * Result of a meta file operation.
 */
export interface AssetMetaResult<T extends IAssetMeta = IAssetMeta> {
  success: boolean;
  meta?: T;
  error?: string;
}

/**
 * Service for managing .assetmeta companion files.
 */
export class AssetMetaService {
  /**
   * Create a new model asset meta for a .glb/.gltf file.
   *
   * @param directoryHandle - Directory containing the source file
   * @param sourceFilename - Name of the source file (e.g., "car.glb")
   * @param sourcePath - Relative path from project root (e.g., "Assets/Models/car.glb")
   * @param sourceHash - Hash of the source file for change detection
   * @param contents - Extracted mesh and material references
   * @param hierarchy - Scene hierarchy from the model
   * @param importSettings - Optional custom import settings (defaults used if not provided)
   * @returns The created model asset meta
   */
  async createModelMeta(
    directoryHandle: FileSystemDirectoryHandle,
    sourceFilename: string,
    sourcePath: string,
    sourceHash: string,
    contents: IModelMetaContents,
    hierarchy: IModelMetaNode[],
    importSettings?: Partial<IModelImportSettings>
  ): Promise<AssetMetaResult<IModelAssetMeta>> {
    const now = new Date().toISOString();

    const meta: IModelAssetMeta = {
      version: MODEL_ASSET_META_VERSION,
      uuid: generateUUID(),
      type: 'model',
      importedAt: now,
      sourceHash,
      isDirty: false,
      sourcePath,
      importSettings: {
        ...createDefaultModelImportSettings(),
        ...importSettings,
      },
      contents,
      hierarchy,
    };

    // Save the meta file
    const saveResult = await this.saveMeta(directoryHandle, sourceFilename, meta);
    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error,
      };
    }

    return {
      success: true,
      meta,
    };
  }

  /**
   * Read an asset meta file.
   *
   * @param directoryHandle - Directory containing the meta file
   * @param sourceFilename - Name of the source file (e.g., "car.glb")
   * @returns The parsed asset meta or error
   */
  async readMeta(
    directoryHandle: FileSystemDirectoryHandle,
    sourceFilename: string
  ): Promise<AssetMetaResult> {
    const metaFilename = getAssetMetaFilename(sourceFilename);

    try {
      const fileHandle = await directoryHandle.getFileHandle(metaFilename);
      const file = await fileHandle.getFile();
      const content = await file.text();
      const meta = JSON.parse(content) as IAssetMeta;

      return {
        success: true,
        meta,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        return {
          success: false,
          error: `Meta file not found: ${metaFilename}`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read meta file',
      };
    }
  }

  /**
   * Read a model asset meta file.
   *
   * @param directoryHandle - Directory containing the meta file
   * @param sourceFilename - Name of the source file (e.g., "car.glb")
   * @returns The parsed model asset meta or error
   */
  async readModelMeta(
    directoryHandle: FileSystemDirectoryHandle,
    sourceFilename: string
  ): Promise<AssetMetaResult<IModelAssetMeta>> {
    const result = await this.readMeta(directoryHandle, sourceFilename);

    if (!result.success) {
      return result as AssetMetaResult<IModelAssetMeta>;
    }

    if (!isModelAssetMeta(result.meta)) {
      return {
        success: false,
        error: 'Meta file is not a valid model asset meta',
      };
    }

    return {
      success: true,
      meta: result.meta,
    };
  }

  /**
   * Save an asset meta file.
   *
   * @param directoryHandle - Directory to save the meta file in
   * @param sourceFilename - Name of the source file (e.g., "car.glb")
   * @param meta - The meta data to save
   * @returns Success or error
   */
  async saveMeta(
    directoryHandle: FileSystemDirectoryHandle,
    sourceFilename: string,
    meta: IAssetMeta
  ): Promise<AssetMetaResult> {
    const metaFilename = getAssetMetaFilename(sourceFilename);

    try {
      const fileHandle = await directoryHandle.getFileHandle(metaFilename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(meta, null, 2));
      await writable.close();

      return { success: true, meta };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save meta file',
      };
    }
  }

  /**
   * Update an existing asset meta file.
   * Preserves UUID and other core fields while updating specified fields.
   *
   * @param directoryHandle - Directory containing the meta file
   * @param sourceFilename - Name of the source file
   * @param updates - Partial updates to apply
   * @returns The updated meta or error
   */
  async updateMeta<T extends IAssetMeta>(
    directoryHandle: FileSystemDirectoryHandle,
    sourceFilename: string,
    updates: Partial<T>
  ): Promise<AssetMetaResult<T>> {
    // Read existing meta
    const readResult = await this.readMeta(directoryHandle, sourceFilename);
    if (!readResult.success || !readResult.meta) {
      return readResult as AssetMetaResult<T>;
    }

    // Apply updates (preserving uuid, version, type)
    const updatedMeta = {
      ...readResult.meta,
      ...updates,
      uuid: readResult.meta.uuid,
      version: readResult.meta.version,
      type: readResult.meta.type,
    } as T;

    // Save updated meta
    const saveResult = await this.saveMeta(directoryHandle, sourceFilename, updatedMeta);
    if (!saveResult.success) {
      return saveResult as AssetMetaResult<T>;
    }

    return {
      success: true,
      meta: updatedMeta,
    };
  }

  /**
   * Check if an asset meta file exists for a source file.
   *
   * @param directoryHandle - Directory to check
   * @param sourceFilename - Name of the source file
   * @returns True if meta file exists
   */
  async hasMeta(
    directoryHandle: FileSystemDirectoryHandle,
    sourceFilename: string
  ): Promise<boolean> {
    const metaFilename = getAssetMetaFilename(sourceFilename);

    try {
      await directoryHandle.getFileHandle(metaFilename);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete an asset meta file.
   *
   * @param directoryHandle - Directory containing the meta file
   * @param sourceFilename - Name of the source file
   * @returns Success or error
   */
  async deleteMeta(
    directoryHandle: FileSystemDirectoryHandle,
    sourceFilename: string
  ): Promise<AssetMetaResult> {
    const metaFilename = getAssetMetaFilename(sourceFilename);

    try {
      await directoryHandle.removeEntry(metaFilename);
      return { success: true };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        // File doesn't exist, consider it a success
        return { success: true };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete meta file',
      };
    }
  }

  /**
   * Mark an asset meta as dirty (source file has changed).
   *
   * @param directoryHandle - Directory containing the meta file
   * @param sourceFilename - Name of the source file
   * @returns Success or error
   */
  async markDirty(
    directoryHandle: FileSystemDirectoryHandle,
    sourceFilename: string
  ): Promise<AssetMetaResult> {
    return this.updateMeta(directoryHandle, sourceFilename, { isDirty: true });
  }

  /**
   * Mark an asset meta as clean (after successful reimport).
   *
   * @param directoryHandle - Directory containing the meta file
   * @param sourceFilename - Name of the source file
   * @param newHash - The new source file hash
   * @returns Success or error
   */
  async markClean(
    directoryHandle: FileSystemDirectoryHandle,
    sourceFilename: string,
    newHash: string
  ): Promise<AssetMetaResult> {
    return this.updateMeta(directoryHandle, sourceFilename, {
      isDirty: false,
      sourceHash: newHash,
      importedAt: new Date().toISOString(),
    });
  }

  /**
   * Get the meta file type for a source file extension.
   *
   * @param extension - File extension (e.g., ".glb", ".png")
   * @returns The asset meta type or undefined if not supported
   */
  getMetaTypeForExtension(extension: string): AssetMetaType | undefined {
    const ext = extension.toLowerCase();

    // Model files
    if (['.glb', '.gltf', '.obj', '.fbx'].includes(ext)) {
      return 'model';
    }

    // Texture files
    if (['.png', '.jpg', '.jpeg', '.tga', '.exr', '.hdr'].includes(ext)) {
      return 'texture';
    }

    // Audio files
    if (['.wav', '.mp3', '.ogg'].includes(ext)) {
      return 'audio';
    }

    return undefined;
  }
}
