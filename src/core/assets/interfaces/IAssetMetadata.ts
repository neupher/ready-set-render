/**
 * IAssetMetadata - Base metadata for all assets
 *
 * Every asset in the system (shaders, materials, scenes) must have this
 * metadata for identification, versioning, and tracking.
 *
 * @example
 * ```typescript
 * const materialAsset: IMaterialAsset = {
 *   uuid: 'a1b2c3d4-...',
 *   name: 'My Custom Material',
 *   type: 'material',
 *   version: 1,
 *   created: '2026-01-28T12:00:00Z',
 *   modified: '2026-01-28T12:00:00Z',
 *   // ... material-specific properties
 * };
 * ```
 */

/**
 * Asset type identifiers.
 * Used for type-safe asset handling and file extension mapping.
 */
export type AssetType = 'shader' | 'material' | 'scene' | 'texture';

/**
 * Base metadata interface that all assets must implement.
 */
export interface IAssetMetadata {
  /**
   * Universally unique identifier for this asset.
   * Format: UUID v4 (e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
   */
  readonly uuid: string;

  /**
   * Human-readable name for the asset.
   * Displayed in the Asset Browser and Inspector.
   */
  name: string;

  /**
   * Asset type discriminator.
   * Used for type guards and determining file extensions.
   */
  readonly type: AssetType;

  /**
   * Schema version number for migration support.
   * Incremented when the asset schema changes.
   */
  readonly version: number;

  /**
   * ISO 8601 timestamp of when the asset was created.
   * Format: "YYYY-MM-DDTHH:MM:SSZ"
   */
  readonly created: string;

  /**
   * ISO 8601 timestamp of when the asset was last modified.
   * Format: "YYYY-MM-DDTHH:MM:SSZ"
   */
  modified: string;
}

/**
 * Type guard to check if an object has valid asset metadata.
 *
 * @param obj - The object to check
 * @returns True if the object has all required metadata fields
 */
export function isAssetMetadata(obj: unknown): obj is IAssetMetadata {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const asset = obj as Record<string, unknown>;

  return (
    typeof asset.uuid === 'string' &&
    typeof asset.name === 'string' &&
    typeof asset.type === 'string' &&
    ['shader', 'material', 'scene', 'texture'].includes(asset.type as string) &&
    typeof asset.version === 'number' &&
    typeof asset.created === 'string' &&
    typeof asset.modified === 'string'
  );
}

/**
 * Get the file extension for an asset type.
 *
 * @param type - The asset type
 * @returns The file extension (including the dot)
 */
export function getAssetFileExtension(type: AssetType): string {
  const extensions: Record<AssetType, string> = {
    shader: '.shader.json',
    material: '.material.json',
    scene: '.scene.json',
    texture: '.texture.json',
  };
  return extensions[type];
}
