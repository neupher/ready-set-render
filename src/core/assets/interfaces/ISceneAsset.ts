/**
 * ISceneAsset - Scene asset interface for scene serialization
 *
 * Represents a complete scene that can be saved to and loaded from disk.
 * Contains all entities, their hierarchy, and scene-level settings.
 *
 * Scenes store references to material assets rather than embedding them,
 * allowing materials to be shared across scenes and updated globally.
 *
 * @example
 * ```typescript
 * const myScene: ISceneAsset = {
 *   uuid: 'a1b2c3d4-...',
 *   name: 'My Scene',
 *   type: 'scene',
 *   version: 1,
 *   created: '2026-01-30T12:00:00Z',
 *   modified: '2026-01-30T12:00:00Z',
 *   isBuiltIn: false,
 *   entities: [...],
 *   settings: { ambientColor: [0.1, 0.1, 0.1] }
 * };
 * ```
 */

import type { IAsset } from './IAsset';
import type { IAssetReference } from './IAssetReference';

/**
 * Current schema version for scene assets.
 * Increment when making breaking changes to the scene format.
 */
export const SCENE_ASSET_VERSION = 1;

/**
 * Serialized transform data.
 * Matches the Transform interface in core/interfaces.
 */
export interface ISerializedTransform {
  /** Position in world space [x, y, z] */
  position: [number, number, number];
  /** Rotation in Euler angles (degrees) [x, y, z] */
  rotation: [number, number, number];
  /** Scale factors [x, y, z] */
  scale: [number, number, number];
}

/**
 * Serialized component data.
 * Base interface for all serialized components.
 */
export interface ISerializedComponent {
  /** Component type identifier */
  type: string;
  /** Component-specific data */
  [key: string]: unknown;
}

/**
 * Serialized mesh component data.
 */
export interface ISerializedMeshComponent extends ISerializedComponent {
  type: 'mesh';
  vertexCount: number;
  edgeCount: number;
  triangleCount: number;
  doubleSided: boolean;
}

/**
 * Serialized material component data.
 * Can reference a material asset or contain inline material data.
 */
export interface ISerializedMaterialComponent extends ISerializedComponent {
  type: 'material';
  /** Reference to material asset (preferred) */
  materialAssetRef?: IAssetReference;
  /** Inline material data (fallback for legacy scenes) */
  shaderName?: string;
  color?: [number, number, number];
  opacity?: number;
  transparent?: boolean;
}

/**
 * Serialized light component data.
 */
export interface ISerializedLightComponent extends ISerializedComponent {
  type: 'light';
  lightType: 'directional' | 'point' | 'spot';
  color: [number, number, number];
  intensity: number;
  enabled: boolean;
}

/**
 * Serialized camera component data.
 */
export interface ISerializedCameraComponent extends ISerializedComponent {
  type: 'camera';
  fieldOfView: number;
  nearClipPlane: number;
  farClipPlane: number;
  target: [number, number, number];
}

/**
 * Entity type identifiers for serialization.
 * Used to determine which factory to use when deserializing.
 */
export type SerializedEntityType =
  | 'Cube'
  | 'Sphere'
  | 'DirectionalLight'
  | 'Camera';

/**
 * Serialized entity data.
 * Contains all information needed to reconstruct an entity.
 */
export interface ISerializedEntity {
  /**
   * Unique identifier for this entity.
   * Used to maintain references and hierarchy.
   */
  uuid: string;

  /**
   * Display name of the entity.
   */
  name: string;

  /**
   * Entity type identifier.
   * Determines which factory/class to use when deserializing.
   */
  type: SerializedEntityType;

  /**
   * UUID of the parent entity (if any).
   * Used to reconstruct the scene hierarchy.
   */
  parentUuid?: string;

  /**
   * Entity transform data.
   */
  transform: ISerializedTransform;

  /**
   * Serialized component data.
   */
  components: ISerializedComponent[];

  /**
   * Entity-specific additional data.
   * Used for properties not captured in components (e.g., sphere segments/rings).
   */
  metadata?: Record<string, unknown>;
}

/**
 * Scene-level settings.
 */
export interface ISceneSettings {
  /**
   * Ambient light color [r, g, b] (0-1).
   */
  ambientColor?: [number, number, number];

  /**
   * Ambient light intensity.
   */
  ambientIntensity?: number;

  /**
   * Background color [r, g, b] (0-1).
   */
  backgroundColor?: [number, number, number];

  /**
   * Whether to show the viewport grid.
   */
  showGrid?: boolean;
}

/**
 * Scene asset interface.
 * Represents a complete serializable scene.
 */
export interface ISceneAsset extends IAsset {
  /**
   * Asset type discriminator.
   */
  readonly type: 'scene';

  /**
   * Whether this is a built-in (read-only) scene.
   * Built-in scenes cannot be modified or deleted.
   */
  readonly isBuiltIn: boolean;

  /**
   * Serialized entities in the scene.
   * Order matters for hierarchy reconstruction.
   */
  entities: ISerializedEntity[];

  /**
   * Scene-level settings.
   */
  settings: ISceneSettings;

  /**
   * Optional description of the scene.
   */
  description?: string;
}

/**
 * Type guard to check if an object is a valid scene asset.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid ISceneAsset
 */
export function isSceneAsset(obj: unknown): obj is ISceneAsset {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const asset = obj as Record<string, unknown>;

  // Check required fields
  if (
    asset.type !== 'scene' ||
    typeof asset.uuid !== 'string' ||
    typeof asset.name !== 'string' ||
    typeof asset.version !== 'number' ||
    typeof asset.isBuiltIn !== 'boolean'
  ) {
    return false;
  }

  // Check entities array
  if (!Array.isArray(asset.entities)) {
    return false;
  }

  // Check settings object
  if (typeof asset.settings !== 'object' || asset.settings === null) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if an object is a valid serialized entity.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid ISerializedEntity
 */
export function isSerializedEntity(obj: unknown): obj is ISerializedEntity {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const entity = obj as Record<string, unknown>;

  // Check required fields
  if (
    typeof entity.uuid !== 'string' ||
    typeof entity.name !== 'string' ||
    typeof entity.type !== 'string'
  ) {
    return false;
  }

  // Check transform
  const transform = entity.transform as Record<string, unknown> | null | undefined;
  if (
    typeof transform !== 'object' ||
    transform === null ||
    !Array.isArray(transform.position) ||
    !Array.isArray(transform.rotation) ||
    !Array.isArray(transform.scale)
  ) {
    return false;
  }

  // Check components array
  if (!Array.isArray(entity.components)) {
    return false;
  }

  return true;
}

/**
 * Create default scene settings.
 *
 * @returns Default ISceneSettings
 */
export function createDefaultSceneSettings(): ISceneSettings {
  return {
    ambientColor: [0.1, 0.1, 0.1],
    ambientIntensity: 1.0,
    backgroundColor: [0.15, 0.15, 0.15],
    showGrid: true,
  };
}
