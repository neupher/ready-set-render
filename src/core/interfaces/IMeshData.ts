/**
 * Mesh Data Interface
 *
 * Defines a common interface for all geometry data sources.
 * This is the contract between geometry providers (Cube, Sphere, OBJ Importer, etc.)
 * and the rendering system (MeshGPUCache, ForwardRenderer, etc.).
 *
 * @example
 * ```typescript
 * // A primitive or importer provides mesh data:
 * const meshData = cube.getMeshData();
 *
 * // The renderer uses it to create GPU resources:
 * const gpuResources = meshGPUCache.getOrCreate(entity.id, meshData);
 * ```
 */

import type { Vec3 } from '@utils/math';

/**
 * Axis-aligned bounding box for a mesh.
 * Used for frustum culling and ray picking.
 */
export interface MeshBounds {
  /** Minimum corner of the bounding box [x, y, z] */
  min: Vec3;
  /** Maximum corner of the bounding box [x, y, z] */
  max: Vec3;
}

/**
 * Geometry data for a mesh.
 * This is a pure data structure with no GPU resources.
 * All geometry providers (primitives, importers) should produce this format.
 */
export interface IMeshData {
  /** Vertex positions as flat array [x0, y0, z0, x1, y1, z1, ...] */
  positions: Float32Array;
  /** Vertex normals as flat array [nx0, ny0, nz0, nx1, ny1, nz1, ...] */
  normals: Float32Array;
  /** Triangle indices (3 per triangle) */
  indices: Uint16Array;
  /** UV coordinates as flat array [u0, v0, u1, v1, ...] (optional) */
  uvs?: Float32Array;
  /** Axis-aligned bounding box for the mesh */
  bounds: MeshBounds;
}

/**
 * Edge data for wireframe rendering.
 * Separate from IMeshData since not all meshes need wireframe.
 */
export interface IEdgeData {
  /** Edge vertex positions as flat array for GL_LINES [x0, y0, z0, x1, y1, z1, ...] */
  lineVertices: Float32Array;
  /** Number of line segments (lineVertices.length / 6) */
  lineCount: number;
}

/**
 * Interface for entities that provide mesh data.
 * Used by renderers to check if an entity has geometry to render.
 */
export interface IMeshProvider {
  /**
   * Get the mesh data for this entity.
   * Returns null for entities without geometry (cameras, lights, etc.).
   */
  getMeshData(): IMeshData | null;

  /**
   * Get edge data for wireframe rendering.
   * Returns null if wireframe is not supported.
   */
  getEdgeData?(): IEdgeData | null;
}

/**
 * Type guard to check if an object implements IMeshProvider.
 */
export function isMeshProvider(obj: unknown): obj is IMeshProvider {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'getMeshData' in obj &&
    typeof (obj as IMeshProvider).getMeshData === 'function'
  );
}
