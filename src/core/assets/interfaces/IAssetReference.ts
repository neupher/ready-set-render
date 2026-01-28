/**
 * IAssetReference - Lightweight reference to an asset
 *
 * Asset references are used to link assets together without embedding
 * the full asset data. This enables:
 * - Smaller file sizes (reference is just UUID + type)
 * - Shared resources update everywhere when changed
 * - Lazy loading of referenced assets
 *
 * @example
 * ```typescript
 * // A material referencing a shader asset
 * const material: IMaterialAsset = {
 *   uuid: 'material-uuid',
 *   name: 'My Material',
 *   type: 'material',
 *   shaderRef: {
 *     uuid: 'shader-uuid',
 *     type: 'shader'
 *   },
 *   // ... other properties
 * };
 * ```
 */

import type { AssetType } from './IAssetMetadata';

/**
 * A lightweight reference to an asset by UUID and type.
 * Used to create relationships between assets without embedding.
 */
export interface IAssetReference {
  /**
   * The UUID of the referenced asset.
   */
  readonly uuid: string;

  /**
   * The type of the referenced asset.
   * Used for type checking and lookup optimization.
   */
  readonly type: AssetType;
}

/**
 * Create an asset reference from an asset's metadata.
 *
 * @param uuid - The UUID of the asset to reference
 * @param type - The type of the asset
 * @returns An asset reference object
 */
export function createAssetReference(uuid: string, type: AssetType): IAssetReference {
  return { uuid, type };
}

/**
 * Type guard to check if an object is a valid asset reference.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid asset reference
 */
export function isAssetReference(obj: unknown): obj is IAssetReference {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const ref = obj as Record<string, unknown>;

  return (
    typeof ref.uuid === 'string' &&
    typeof ref.type === 'string' &&
    ['shader', 'material', 'scene', 'texture'].includes(ref.type as string)
  );
}
