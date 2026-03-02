/**
 * IMeshAsset - Mesh asset interface for imported geometry data
 *
 * Represents a mesh asset containing raw geometry data (positions, normals, UVs, indices).
 * Mesh assets are created when importing 3D models and are referenced by MeshEntity.
 *
 * Unlike primitives (Cube, Sphere) which generate geometry procedurally,
 * MeshAsset stores pre-computed geometry data from imported files.
 *
 * @example
 * ```typescript
 * const bodyMesh: IMeshAsset = {
 *   uuid: 'mesh-a1b2c3d4-...',
 *   name: 'Body',
 *   type: 'mesh',
 *   version: 1,
 *   created: '2026-03-02T12:00:00Z',
 *   modified: '2026-03-02T12:00:00Z',
 *   isBuiltIn: false,
 *   positions: [0, 0, 0, 1, 0, 0, ...],
 *   normals: [0, 0, 1, 0, 0, 1, ...],
 *   indices: [0, 1, 2, ...],
 *   bounds: { min: [-1, -1, -1], max: [1, 1, 1] },
 *   parentModelRef: { uuid: 'model-uuid', type: 'model' }
 * };
 * ```
 */

import type { IAsset } from './IAsset';
import type { IAssetReference } from './IAssetReference';

/**
 * Current schema version for mesh assets.
 * Increment when making breaking changes to the mesh format.
 */
export const MESH_ASSET_VERSION = 1;

/**
 * Axis-aligned bounding box for a mesh.
 * Used for frustum culling and ray picking.
 */
export interface IMeshBounds {
  /**
   * Minimum corner of the bounding box [x, y, z].
   */
  min: [number, number, number];

  /**
   * Maximum corner of the bounding box [x, y, z].
   */
  max: [number, number, number];
}

/**
 * Mesh asset interface.
 * Represents stored geometry data from an imported 3D model.
 */
export interface IMeshAsset extends IAsset {
  /**
   * Asset type discriminator.
   */
  readonly type: 'mesh';

  /**
   * Whether this is a built-in mesh.
   * Built-in meshes (e.g., primitive shapes) are read-only.
   * Imported meshes are always isBuiltIn: false.
   */
  readonly isBuiltIn: boolean;

  /**
   * Vertex positions as flat array [x0, y0, z0, x1, y1, z1, ...].
   * Length must be a multiple of 3.
   */
  positions: number[];

  /**
   * Vertex normals as flat array [nx0, ny0, nz0, nx1, ny1, nz1, ...].
   * Length must match positions.length.
   */
  normals: number[];

  /**
   * UV texture coordinates as flat array [u0, v0, u1, v1, ...] (optional).
   * Length must be (positions.length / 3) * 2 when present.
   */
  uvs?: number[];

  /**
   * Triangle indices (3 indices per triangle).
   * References vertices in the positions/normals/uvs arrays.
   */
  indices: number[];

  /**
   * Axis-aligned bounding box for the mesh.
   * Pre-computed for efficient ray picking and culling.
   */
  bounds: IMeshBounds;

  /**
   * Reference to the parent model asset (for imported meshes).
   * Undefined for standalone meshes or built-in primitives.
   */
  parentModelRef?: IAssetReference;

  /**
   * Optional description of the mesh.
   */
  description?: string;

  /**
   * Number of vertices (positions.length / 3).
   * Pre-computed for display in Asset Browser.
   */
  vertexCount: number;

  /**
   * Number of triangles (indices.length / 3).
   * Pre-computed for display in Asset Browser.
   */
  triangleCount: number;
}

/**
 * Type guard to check if an object is a valid mesh asset.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid IMeshAsset
 */
export function isMeshAsset(obj: unknown): obj is IMeshAsset {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const asset = obj as Record<string, unknown>;

  // Check required fields
  if (
    asset.type !== 'mesh' ||
    typeof asset.uuid !== 'string' ||
    typeof asset.name !== 'string' ||
    typeof asset.version !== 'number' ||
    typeof asset.isBuiltIn !== 'boolean'
  ) {
    return false;
  }

  // Check geometry arrays
  if (
    !Array.isArray(asset.positions) ||
    !Array.isArray(asset.normals) ||
    !Array.isArray(asset.indices)
  ) {
    return false;
  }

  // Check bounds
  const bounds = asset.bounds as Record<string, unknown> | null | undefined;
  if (
    typeof bounds !== 'object' ||
    bounds === null ||
    !Array.isArray(bounds.min) ||
    !Array.isArray(bounds.max) ||
    bounds.min.length !== 3 ||
    bounds.max.length !== 3
  ) {
    return false;
  }

  // Check vertex/triangle counts
  if (
    typeof asset.vertexCount !== 'number' ||
    typeof asset.triangleCount !== 'number'
  ) {
    return false;
  }

  return true;
}

/**
 * Calculate mesh bounds from vertex positions.
 *
 * @param positions - Flat array of vertex positions [x0, y0, z0, x1, y1, z1, ...]
 * @returns The axis-aligned bounding box
 */
export function calculateMeshBounds(positions: number[]): IMeshBounds {
  if (positions.length === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
    };
  }

  const min: [number, number, number] = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ];
  const max: [number, number, number] = [
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    min[0] = Math.min(min[0], x);
    min[1] = Math.min(min[1], y);
    min[2] = Math.min(min[2], z);

    max[0] = Math.max(max[0], x);
    max[1] = Math.max(max[1], y);
    max[2] = Math.max(max[2], z);
  }

  return { min, max };
}

/**
 * Create default mesh bounds.
 *
 * @returns Default bounds centered at origin
 */
export function createDefaultMeshBounds(): IMeshBounds {
  return {
    min: [0, 0, 0],
    max: [0, 0, 0],
  };
}
