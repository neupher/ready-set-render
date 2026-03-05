/**
 * IModelAssetMeta - Metadata interface for 3D model source files
 *
 * Extends IAssetMeta with model-specific import settings and derived asset references.
 * Created alongside .glb/.gltf files as {filename}.assetmeta
 *
 * @example
 * ```typescript
 * // File: Assets/Models/car.glb.assetmeta
 * const carMeta: IModelAssetMeta = {
 *   version: 1,
 *   uuid: 'a1b2c3d4-...',
 *   type: 'model',
 *   importedAt: '2026-03-04T12:00:00Z',
 *   sourceHash: 'size:1234567:mtime:1709564400000',
 *   isDirty: false,
 *   sourcePath: 'Assets/Models/car.glb',
 *   importSettings: {
 *     scaleFactor: 1.0,
 *     convertCoordinates: { sourceUp: 'Y', convertToZUp: true },
 *     meshes: { generateNormals: true, ... },
 *     materials: { importMaterials: true, ... },
 *   },
 *   contents: {
 *     meshes: [{ uuid: '...', name: 'Body', vertexCount: 1000, triangleCount: 500, sourceIndex: 0 }],
 *     materials: [{ uuid: '...', name: 'CarPaint', sourceIndex: 0, isOverridden: false }],
 *   },
 *   hierarchy: [{ name: 'Root', meshIndex: 0, children: [] }]
 * };
 * ```
 */

import type { IAssetMeta, IDerivedMeshRef, IDerivedMaterialRef, IDerivedTextureRef } from './IAssetMeta';
import type { ISerializedTransform } from './ISceneAsset';

/**
 * Current schema version for model asset meta.
 */
export const MODEL_ASSET_META_VERSION = 1;

/**
 * Supported coordinate system up-axis values.
 */
export type CoordinateUpAxis = 'Y' | 'Z';

/**
 * Coordinate system conversion settings.
 */
export interface ICoordinateConversionSettings {
  /**
   * Source file coordinate system up-axis.
   * GLTF standard is Y-up.
   * @default 'Y'
   */
  sourceUp: CoordinateUpAxis;

  /**
   * Whether to convert to editor's Z-up coordinate system.
   * @default true
   */
  convertToZUp: boolean;
}

/**
 * Mesh-specific import settings.
 */
export interface IMeshImportSettings {
  /**
   * Generate normals if missing from source.
   * @default true
   */
  generateNormals: boolean;

  /**
   * Angle threshold (in degrees) for normal generation.
   * Faces with angles greater than this will have hard edges.
   * @default 60
   */
  normalAngleThreshold: number;

  /**
   * Generate tangents for normal mapping.
   * Required for proper normal map rendering.
   * @default true
   */
  generateTangents: boolean;

  /**
   * Weld vertices that are within threshold distance.
   * Can reduce vertex count but may affect UV seams.
   * @default false
   */
  weldVertices: boolean;

  /**
   * Distance threshold for vertex welding.
   * Only used when weldVertices is true.
   * @default 0.0001
   */
  weldThreshold: number;

  /**
   * Optimize mesh for GPU rendering.
   * Reorders triangles for better vertex cache utilization.
   * @default true
   */
  optimizeMesh: boolean;
}

/**
 * Material-specific import settings.
 */
export interface IMaterialImportSettings {
  /**
   * Whether to import materials from the source file.
   * If false, meshes will use the default material.
   * @default true
   */
  importMaterials: boolean;

  /**
   * Prefix to add to imported material names.
   * Useful for avoiding name collisions.
   * @default ''
   */
  namePrefix: string;

  /**
   * Extract embedded textures from the source file.
   * Only applicable to formats that embed textures (e.g., GLB).
   * @default true
   */
  extractTextures: boolean;
}

/**
 * Animation-specific import settings.
 * Reserved for future animation support.
 */
export interface IAnimationImportSettings {
  /**
   * Whether to import animations from the source file.
   * @default true
   */
  importAnimations: boolean;

  /**
   * Prefix to add to imported animation clip names.
   * @default ''
   */
  animationNamePrefix: string;

  /**
   * Sample rate for baking animations (samples per second).
   * @default 30
   */
  sampleRate: number;
}

/**
 * Complete model import settings.
 */
export interface IModelImportSettings {
  /**
   * Scale factor applied during import.
   * Use 0.01 to convert centimeters to meters.
   * @default 1.0
   */
  scaleFactor: number;

  /**
   * Coordinate system conversion settings.
   */
  convertCoordinates: ICoordinateConversionSettings;

  /**
   * Mesh import options.
   */
  meshes: IMeshImportSettings;

  /**
   * Material import options.
   */
  materials: IMaterialImportSettings;

  /**
   * Animation import options (future).
   */
  animations: IAnimationImportSettings;
}

/**
 * Contents of a model - references to derived assets.
 * Unlike IModelContents in IModelAsset, these are references only.
 * Actual mesh data is loaded from the source file on demand.
 */
export interface IModelMetaContents {
  /**
   * Mesh references extracted from the model.
   */
  meshes: IDerivedMeshRef[];

  /**
   * Material references extracted from the model.
   * Imported materials are read-only by default.
   */
  materials: IDerivedMaterialRef[];

  /**
   * Texture references extracted from the model (future).
   */
  textures?: IDerivedTextureRef[];
}

/**
 * A node in the model's scene hierarchy.
 * Preserves the structure from the source file.
 */
export interface IModelMetaNode {
  /**
   * Display name of this node.
   */
  name: string;

  /**
   * Index into contents.meshes (if this node has geometry).
   */
  meshIndex?: number;

  /**
   * Indices into contents.materials (for multi-material meshes).
   */
  materialIndices?: number[];

  /**
   * Local transform relative to parent node.
   */
  transform: ISerializedTransform;

  /**
   * Child nodes in the hierarchy.
   */
  children: IModelMetaNode[];
}

/**
 * Model asset metadata interface.
 * Stored as {filename}.assetmeta alongside .glb/.gltf files.
 */
export interface IModelAssetMeta extends IAssetMeta {
  /**
   * Asset meta type discriminator.
   */
  readonly type: 'model';

  /**
   * Model-specific import settings.
   */
  importSettings: IModelImportSettings;

  /**
   * References to derived assets (meshes, materials, textures).
   */
  contents: IModelMetaContents;

  /**
   * Scene hierarchy from the source file.
   */
  hierarchy: IModelMetaNode[];

  /**
   * Optional description/notes about the model.
   */
  description?: string;
}

/**
 * Type guard to check if an object is a valid model asset meta.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid IModelAssetMeta
 */
export function isModelAssetMeta(obj: unknown): obj is IModelAssetMeta {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const meta = obj as Record<string, unknown>;

  // Check base fields
  if (
    meta.type !== 'model' ||
    typeof meta.version !== 'number' ||
    typeof meta.uuid !== 'string' ||
    typeof meta.importedAt !== 'string' ||
    typeof meta.sourceHash !== 'string' ||
    typeof meta.isDirty !== 'boolean' ||
    typeof meta.sourcePath !== 'string'
  ) {
    return false;
  }

  // Check importSettings
  const settings = meta.importSettings as Record<string, unknown> | null | undefined;
  if (
    typeof settings !== 'object' ||
    settings === null ||
    typeof settings.scaleFactor !== 'number'
  ) {
    return false;
  }

  // Check contents
  const contents = meta.contents as Record<string, unknown> | null | undefined;
  if (
    typeof contents !== 'object' ||
    contents === null ||
    !Array.isArray(contents.meshes) ||
    !Array.isArray(contents.materials)
  ) {
    return false;
  }

  // Check hierarchy
  if (!Array.isArray(meta.hierarchy)) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if an object is a valid model meta node.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid IModelMetaNode
 */
export function isModelMetaNode(obj: unknown): obj is IModelMetaNode {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const node = obj as Record<string, unknown>;

  // Check required fields
  if (typeof node.name !== 'string') {
    return false;
  }

  // Check transform
  const transform = node.transform as Record<string, unknown> | null | undefined;
  if (
    typeof transform !== 'object' ||
    transform === null ||
    !Array.isArray(transform.position) ||
    !Array.isArray(transform.rotation) ||
    !Array.isArray(transform.scale)
  ) {
    return false;
  }

  // Check children
  if (!Array.isArray(node.children)) {
    return false;
  }

  return true;
}

/**
 * Create a default model meta node.
 *
 * @param name - Node name
 * @returns A new IModelMetaNode with default transform
 */
export function createDefaultModelMetaNode(name: string): IModelMetaNode {
  return {
    name,
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    children: [],
  };
}
