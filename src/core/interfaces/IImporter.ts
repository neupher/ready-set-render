/**
 * Importer Interface
 *
 * Defines the contract for file importers.
 * Importers are plugins that handle loading specific file formats.
 */

import type { IPlugin } from './IPlugin';
import type { ISceneObject } from './ISceneObject';

/**
 * Import result containing the imported object(s) and any warnings.
 */
export interface ImportResult {
  /** The imported scene object(s) */
  objects: ISceneObject[];
  /** Any warnings encountered during import */
  warnings: string[];
}

/**
 * Importer plugin interface.
 * Extends IPlugin to be managed by the PluginManager.
 *
 * @example
 * ```typescript
 * class OBJImporter implements IImporter {
 *   readonly supportedExtensions = ['.obj', '.mtl'];
 *
 *   canImport(file: File): boolean {
 *     return this.supportedExtensions.some(ext =>
 *       file.name.toLowerCase().endsWith(ext)
 *     );
 *   }
 *
 *   async import(file: File): Promise<ImportResult> {
 *     // Parse OBJ file and return scene objects
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
   * Import a file and return scene objects.
   *
   * @param file - The file to import
   * @returns Promise resolving to the import result
   * @throws Error if import fails
   */
  import(file: File): Promise<ImportResult>;
}
