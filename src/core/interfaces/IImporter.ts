/**
 * Importer Interface
 *
 * Defines the contract for file importers.
 * Importers are plugins that handle loading specific file formats.
 */

import type { IPlugin } from './IPlugin';
import type { IEntity } from './IEntity';
import type { IAsset } from '../assets/interfaces/IAsset';

/**
 * Options accepted by an importer's `import()` method.
 *
 * Importers may interpret these fields in their own way:
 * - `sourcePath` is the project-relative path of the file (when known) and is
 *   used by importers that persist companion metadata next to the source.
 * - `settings` carries importer-specific overrides (e.g. GLTF import settings).
 * - `skipMeta` lets callers request a transient import that does not write
 *   any companion files (useful for previews).
 */
export interface ImportOptions {
  /** Project-relative path of the source file (e.g. `Assets/Models/car.glb`). */
  sourcePath?: string;
  /** Importer-specific override settings. */
  settings?: Record<string, unknown>;
  /** Skip writing any persistent metadata (e.g. `.assetmeta`) for this import. */
  skipMeta?: boolean;
}

/**
 * Standard import result shape returned by every importer.
 *
 * - `entities` are scene-ready objects the caller should add to the scene graph.
 * - `assets` are the asset registry entries created during the import (meshes,
 *   materials, etc.). The caller is responsible for nothing else — assets are
 *   already registered in the AssetRegistry by the importer.
 * - `primaryAssetId` is an opaque UUID that identifies the "primary" asset
 *   produced by the import (e.g. the model `.assetmeta` UUID for GLTF imports).
 *   Downstream consumers may surface this in events/UI; importers that have no
 *   such concept may omit it.
 * - `warnings` are non-fatal issues encountered during the import.
 */
export interface ImportResult {
  /** Entities created from the import (ready to add to the scene graph). */
  entities: IEntity[];
  /** Assets registered with the AssetRegistry during the import. */
  assets: IAsset[];
  /** Optional UUID identifying the primary asset created by this import. */
  primaryAssetId?: string;
  /** Non-fatal issues encountered during the import. */
  warnings: string[];
}

/**
 * Importer plugin interface.
 * Extends IPlugin to be managed by the PluginManager.
 *
 * @example
 * ```typescript
 * class OBJImporter implements IImporter {
 *   readonly id = 'obj-importer';
 *   readonly name = 'OBJ Importer';
 *   readonly version = '1.0.0';
 *   readonly supportedExtensions = ['.obj', '.mtl'];
 *
 *   canImport(file: File): boolean {
 *     return this.supportedExtensions.some(ext =>
 *       file.name.toLowerCase().endsWith(ext)
 *     );
 *   }
 *
 *   async import(file: File, options?: ImportOptions): Promise<ImportResult> {
 *     // Parse OBJ file, register assets, return entities + assets
 *   }
 * }
 * ```
 */
export interface IImporter extends IPlugin {
  /** File extensions this importer supports (including dot, e.g., '.obj') */
  readonly supportedExtensions: string[];

  /**
   * Check if this importer can handle the given file.
   *
   * @param file - The file to check
   * @returns True if this importer can handle the file
   */
  canImport(file: File): boolean;

  /**
   * Import a file and return the resulting entities and assets.
   *
   * Implementations must register any produced assets with the AssetRegistry
   * before returning. The caller is responsible for adding `entities` to the
   * scene graph.
   *
   * @param file - The file to import
   * @param options - Optional import options (sourcePath, settings, skipMeta)
   * @returns Promise resolving to the import result
   * @throws Error if import fails
   */
  import(file: File, options?: ImportOptions): Promise<ImportResult>;
}
