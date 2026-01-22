/**
 * IMeshComponent - Mesh data component
 *
 * Provides mesh-related information for entities that have geometry.
 * Used by the Properties panel to display mesh statistics.
 */

import type { IComponent } from './IComponent';

/**
 * Mesh component containing geometry information.
 */
export interface IMeshComponent extends IComponent {
  /** Component type identifier */
  readonly type: 'mesh';

  /** Number of vertices in the mesh */
  vertexCount: number;

  /** Number of edges (for wireframe rendering) */
  edgeCount: number;

  /** Number of triangles (faces) */
  triangleCount: number;

  /** Whether the mesh is double-sided */
  doubleSided?: boolean;
}
