/**
 * IAssetMeta - Base interface for asset metadata files (.assetmeta)
 *
 * Asset metadata files are companion files that store editor-specific settings
 * alongside source assets (like .glb, .png). They follow Unity's .meta file paradigm.
 *
 * Key concepts:
 * - Source files (e.g., car.glb) stay in place and are not duplicated
 * - .assetmeta files (e.g., car.glb.assetmeta) store import settings and cached references
 * - UUIDs are stable across renames/moves
 * - Reimport workflow: modify settings → reimport → changes take effect
 *
 * @example
 * ```typescript
 * // File: Assets/Models/car.glb.assetmeta
 * const carMeta: IModelAssetMeta = {
 *   version: 1,
 *   uuid: 'a1b2c3d4-...',
 *   type: 'model',
 *   importedAt: '2026-03-04T12:00:00Z',
 *   sourceHash: 'sha256:abc123...',
 *   isDirty: false,
 *   importSettings: { ... },
 *   contents: { ... },
 *   hierarchy: [ ... ]
 * };
 * ```
 */

/**
 * Current schema version for asset meta files.
 * Increment when making breaking changes to the meta format.
 */
export const ASSET_META_VERSION = 1;

/**
 * Asset meta type identifiers.
 * Each source file type has a corresponding meta type.
 */
export type AssetMetaType = 'model' | 'texture' | 'audio' | 'other';

/**
 * Base interface for all asset metadata files.
 * Concrete types (IModelAssetMeta, ITextureAssetMeta) extend this.
 */
export interface IAssetMeta {
  /**
   * Schema version for migrations.
   * Allows future changes to the meta format.
   */
  readonly version: number;

  /**
   * Stable UUID for this asset.
   * Survives renames and moves of the source file.
   * Format: UUID v4 (e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
   */
  readonly uuid: string;

  /**
   * Asset meta type discriminator.
   * Determines which import settings and derived assets apply.
   */
  readonly type: AssetMetaType;

  /**
   * ISO 8601 timestamp of when the asset was last successfully imported.
   * Format: "YYYY-MM-DDTHH:MM:SSZ"
   */
  importedAt: string;

  /**
   * Hash of the source file for change detection.
   * Used to determine if reimport is needed.
   * Format: "sha256:{hex}" or simpler "size:{bytes}:mtime:{timestamp}"
   */
  sourceHash: string;

  /**
   * Whether the asset needs reimport.
   * True when source file has changed since last import.
   */
  isDirty: boolean;

  /**
   * Relative path to the source file from the project root.
   * Example: "Assets/Models/car.glb"
   */
  sourcePath: string;
}

/**
 * Reference to a derived asset (mesh, material, texture) within a source asset.
 * Used in .assetmeta to track extracted content.
 */
export interface IDerivedAssetRef {
  /**
   * UUID of the derived asset.
   * Used for references from scene entities.
   */
  uuid: string;

  /**
   * Display name of the asset.
   */
  name: string;

  /**
   * Index in the source file (for ordering/lookup).
   */
  sourceIndex: number;
}

/**
 * Extended derived asset reference for meshes.
 * Includes mesh-specific metadata for Asset Browser display.
 */
export interface IDerivedMeshRef extends IDerivedAssetRef {
  /**
   * Number of vertices in the mesh.
   */
  vertexCount: number;

  /**
   * Number of triangles in the mesh.
   */
  triangleCount: number;
}

/**
 * Extended derived asset reference for materials.
 * Includes material-specific metadata.
 */
export interface IDerivedMaterialRef extends IDerivedAssetRef {
  /**
   * Whether this material has been duplicated for editing.
   * If true, a separate .material.json file exists.
   */
  isOverridden: boolean;

  /**
   * UUID of the override material asset (if isOverridden is true).
   */
  overrideUuid?: string;
}

/**
 * Extended derived asset reference for textures.
 */
export interface IDerivedTextureRef extends IDerivedAssetRef {
  /**
   * Texture width in pixels.
   */
  width: number;

  /**
   * Texture height in pixels.
   */
  height: number;

  /**
   * Whether the texture has an alpha channel.
   */
  hasAlpha: boolean;
}

/**
 * Type guard to check if an object is a valid asset meta.
 *
 * @param obj - The object to check
 * @returns True if the object has all required IAssetMeta fields
 */
export function isAssetMeta(obj: unknown): obj is IAssetMeta {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const meta = obj as Record<string, unknown>;

  return (
    typeof meta.version === 'number' &&
    typeof meta.uuid === 'string' &&
    typeof meta.type === 'string' &&
    ['model', 'texture', 'audio', 'other'].includes(meta.type as string) &&
    typeof meta.importedAt === 'string' &&
    typeof meta.sourceHash === 'string' &&
    typeof meta.isDirty === 'boolean' &&
    typeof meta.sourcePath === 'string'
  );
}

/**
 * Type guard for derived asset reference.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid IDerivedAssetRef
 */
export function isDerivedAssetRef(obj: unknown): obj is IDerivedAssetRef {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const ref = obj as Record<string, unknown>;

  return (
    typeof ref.uuid === 'string' &&
    typeof ref.name === 'string' &&
    typeof ref.sourceIndex === 'number'
  );
}

/**
 * Type guard for derived mesh reference.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid IDerivedMeshRef
 */
export function isDerivedMeshRef(obj: unknown): obj is IDerivedMeshRef {
  if (!isDerivedAssetRef(obj)) {
    return false;
  }

  const ref = obj as unknown as Record<string, unknown>;

  return (
    typeof ref.vertexCount === 'number' &&
    typeof ref.triangleCount === 'number'
  );
}

/**
 * Type guard for derived material reference.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid IDerivedMaterialRef
 */
export function isDerivedMaterialRef(obj: unknown): obj is IDerivedMaterialRef {
  if (!isDerivedAssetRef(obj)) {
    return false;
  }

  const ref = obj as unknown as Record<string, unknown>;

  return typeof ref.isOverridden === 'boolean';
}

/**
 * Get the .assetmeta filename for a source file.
 *
 * @param sourceFilename - The source file name (e.g., "car.glb")
 * @returns The meta filename (e.g., "car.glb.assetmeta")
 */
export function getAssetMetaFilename(sourceFilename: string): string {
  return `${sourceFilename}.assetmeta`;
}

/**
 * Get the source filename from a .assetmeta filename.
 *
 * @param metaFilename - The meta filename (e.g., "car.glb.assetmeta")
 * @returns The source filename (e.g., "car.glb") or null if not a valid meta filename
 */
export function getSourceFilename(metaFilename: string): string | null {
  const suffix = '.assetmeta';
  if (!metaFilename.endsWith(suffix)) {
    return null;
  }
  return metaFilename.slice(0, -suffix.length);
}
