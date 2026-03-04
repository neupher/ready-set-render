/**
 * IModelAsset - Model asset interface for imported 3D models
 *
 * Represents a compound asset containing imported 3D model data including:
 * - Multiple meshes with their geometry references
 * - Materials extracted from the source file
 * - Scene hierarchy from the source file
 *
 * Models are imported via File → Import and stored in the project folder.
 * They can be instantiated into scenes via drag-and-drop from the Asset Browser.
 *
 * @example
 * ```typescript
 * const carModel: IModelAsset = {
 *   uuid: 'a1b2c3d4-...',
 *   name: 'Car',
 *   type: 'model',
 *   version: 1,
 *   created: '2026-03-02T12:00:00Z',
 *   modified: '2026-03-02T12:00:00Z',
 *   isBuiltIn: false,
 *   source: {
 *     filename: 'car.glb',
 *     format: 'glb',
 *     importedAt: '2026-03-02T12:00:00Z'
 *   },
 *   contents: {
 *     meshes: [{ uuid: 'mesh-1', name: 'Body', vertexCount: 1000, triangleCount: 500 }],
 *     materials: [{ uuid: 'mat-1', name: 'CarPaint' }]
 *   },
 *   hierarchy: [{ name: 'Root', meshIndex: 0, children: [] }]
 * };
 * ```
 */

import type { IAsset } from './IAsset';
import type { IAssetReference } from './IAssetReference';
import type { ISerializedTransform } from './ISceneAsset';

/**
 * Current schema version for model assets.
 * Increment when making breaking changes to the model format.
 */
export const MODEL_ASSET_VERSION = 1;

/**
 * Supported 3D model formats.
 */
export type ModelFormat = 'gltf' | 'glb' | 'obj';

/**
 * Source file information for an imported model.
 */
export interface IModelSource {
  /**
   * Original filename of the imported model.
   */
  filename: string;

  /**
   * Format of the source file.
   */
  format: ModelFormat;

  /**
   * ISO 8601 timestamp of when the model was imported.
   */
  importedAt: string;

  /**
   * File size in bytes (optional, for display purposes).
   */
  fileSize?: number;

  /**
   * Relative path to the source file within the project folder.
   * Set when the file is copied to the project on import.
   * Example: "sources/models/car.glb"
   */
  projectPath?: string;
}

/**
 * Reference to a mesh asset within a model.
 * Stores summary info for Asset Browser display without loading full mesh data.
 */
export interface IMeshAssetReference {
  /**
   * UUID of the mesh asset.
   */
  uuid: string;

  /**
   * Display name of the mesh.
   */
  name: string;

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
 * Reference to a material asset within a model.
 * Stores summary info for Asset Browser display.
 */
export interface IMaterialAssetReference {
  /**
   * UUID of the material asset.
   */
  uuid: string;

  /**
   * Display name of the material.
   */
  name: string;
}

/**
 * Reference to a texture asset within a model (future use).
 */
export interface ITextureAssetReference {
  /**
   * UUID of the texture asset.
   */
  uuid: string;

  /**
   * Display name of the texture.
   */
  name: string;

  /**
   * Texture dimensions (optional).
   */
  width?: number;
  height?: number;
}

/**
 * Contents of a model asset - all sub-assets it contains.
 */
export interface IModelContents {
  /**
   * Mesh assets contained in this model.
   */
  meshes: IMeshAssetReference[];

  /**
   * Material assets created from this model's materials.
   */
  materials: IMaterialAssetReference[];

  /**
   * Texture assets (future use).
   */
  textures?: ITextureAssetReference[];
}

/**
 * A node in the model's scene hierarchy.
 * Preserves the original structure from the source file.
 */
export interface IModelNode {
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
  children: IModelNode[];
}

/**
 * Model asset interface.
 * Represents an imported 3D model with all its sub-assets and hierarchy.
 */
export interface IModelAsset extends IAsset {
  /**
   * Asset type discriminator.
   */
  readonly type: 'model';

  /**
   * Models are always user-created (imported), never built-in.
   */
  readonly isBuiltIn: false;

  /**
   * Original source file information.
   */
  source: IModelSource;

  /**
   * Sub-assets contained in this model.
   */
  contents: IModelContents;

  /**
   * Scene hierarchy from the source file.
   * Root-level nodes of the model.
   */
  hierarchy: IModelNode[];

  /**
   * Optional description of the model.
   */
  description?: string;

  /**
   * Reference to the project folder where this model is stored.
   */
  projectRef?: IAssetReference;
}

/**
 * Type guard to check if an object is a valid model asset.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid IModelAsset
 */
export function isModelAsset(obj: unknown): obj is IModelAsset {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const asset = obj as Record<string, unknown>;

  // Check required fields
  if (
    asset.type !== 'model' ||
    typeof asset.uuid !== 'string' ||
    typeof asset.name !== 'string' ||
    typeof asset.version !== 'number' ||
    asset.isBuiltIn !== false
  ) {
    return false;
  }

  // Check source
  const source = asset.source as Record<string, unknown> | null | undefined;
  if (
    typeof source !== 'object' ||
    source === null ||
    typeof source.filename !== 'string' ||
    typeof source.format !== 'string' ||
    typeof source.importedAt !== 'string'
  ) {
    return false;
  }

  // Check contents
  const contents = asset.contents as Record<string, unknown> | null | undefined;
  if (
    typeof contents !== 'object' ||
    contents === null ||
    !Array.isArray(contents.meshes) ||
    !Array.isArray(contents.materials)
  ) {
    return false;
  }

  // Check hierarchy
  if (!Array.isArray(asset.hierarchy)) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if an object is a valid model node.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid IModelNode
 */
export function isModelNode(obj: unknown): obj is IModelNode {
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
 * Create default model contents.
 *
 * @returns Empty IModelContents
 */
export function createDefaultModelContents(): IModelContents {
  return {
    meshes: [],
    materials: [],
    textures: [],
  };
}

/**
 * Create a default model node.
 *
 * @param name - Node name
 * @returns A new IModelNode with default transform
 */
export function createDefaultModelNode(name: string): IModelNode {
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
