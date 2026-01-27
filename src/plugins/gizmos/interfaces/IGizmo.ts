/**
 * IGizmo - Transform Gizmo Interfaces
 *
 * Defines the contract for transform gizmos (translate, rotate, scale).
 * Gizmos are visual handles that allow direct manipulation of entities.
 *
 * Conventions:
 * - Axis colors: X=Red, Y=Green, Z=Blue (industry standard)
 * - Free/center manipulation: Yellow
 * - Coordinate system: Z-up, right-handed (Blender convention)
 */

import type { ISceneObject } from '@core/interfaces';

/**
 * Gizmo mode types.
 */
export type GizmoMode = 'translate' | 'rotate' | 'scale';

/**
 * Axis identifiers for gizmo interaction.
 */
export type GizmoAxis = 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz' | 'xyz' | 'view' | null;

/**
 * Axis colors following industry standard (Unity, Blender, Maya).
 */
export const GIZMO_COLORS = {
  x: [1, 0.2, 0.2] as [number, number, number], // Red
  y: [0.2, 1, 0.2] as [number, number, number], // Green
  z: [0.2, 0.5, 1] as [number, number, number], // Blue
  free: [1, 1, 0.2] as [number, number, number], // Yellow
  hover: [1, 1, 1] as [number, number, number], // White (highlighted)
} as const;

/**
 * Gizmo configuration.
 */
export interface GizmoConfig {
  /** Base size of gizmo handles (screen-space units) */
  size: number;

  /** Hover detection threshold */
  pickThreshold: number;

  /** Line width for rendering */
  lineWidth: number;

  /** Opacity for gizmo rendering */
  opacity: number;
}

/**
 * Default gizmo configuration.
 */
export const DEFAULT_GIZMO_CONFIG: GizmoConfig = {
  size: 1.0,
  pickThreshold: 0.1,
  lineWidth: 2.0,
  opacity: 1.0,
};

/**
 * Gizmo geometry batch for a single draw call.
 */
export interface GizmoGeometryBatch {
  /** Vertex positions (x, y, z) */
  vertices: Float32Array;

  /** Number of vertices */
  vertexCount: number;

  /** Colors per vertex (r, g, b) */
  colors: Float32Array;

  /** Drawing mode (gl.LINES, gl.TRIANGLES, etc.) */
  drawMode: number;
}

/**
 * Gizmo geometry data for rendering.
 * Supports multiple batches with different draw modes.
 */
export interface GizmoGeometry {
  /** Vertex positions (x, y, z) */
  vertices: Float32Array;

  /** Number of vertices */
  vertexCount: number;

  /** Colors per vertex (r, g, b) */
  colors: Float32Array;

  /** Drawing mode (gl.LINES, gl.TRIANGLES, etc.) */
  drawMode: number;

  /** Additional batches with different draw modes (optional) */
  additionalBatches?: GizmoGeometryBatch[];
}

/**
 * Result of gizmo hit testing.
 */
export interface GizmoHitResult {
  /** Which axis was hit */
  axis: GizmoAxis;

  /** Distance from ray origin to hit point */
  distance: number;

  /** World-space hit point */
  hitPoint: [number, number, number];
}

/**
 * Gizmo drag state during interaction.
 */
export interface GizmoDragState {
  /** Currently dragging */
  active: boolean;

  /** The entity being dragged (stored at drag start to avoid selection dependency) */
  entity: ISceneObject;

  /** Initial mouse position in screen space */
  startMouse: [number, number];

  /** Current mouse position in screen space */
  currentMouse: [number, number];

  /** Initial entity position before drag */
  startPosition: [number, number, number];

  /** Initial entity rotation before drag (degrees) */
  startRotation: [number, number, number];

  /** Initial entity scale before drag */
  startScale: [number, number, number];

  /** Axis being manipulated */
  axis: GizmoAxis;

  /** Intersection point at drag start */
  startIntersection: [number, number, number];
}

/**
 * Interface for a transform gizmo.
 */
export interface IGizmo {
  /** Gizmo mode (translate, rotate, scale) */
  readonly mode: GizmoMode;

  /**
   * Generate geometry for rendering.
   *
   * @param position - World position of the target entity
   * @param scale - Screen-space scale factor for consistent size
   * @param hoveredAxis - Currently hovered axis for highlighting
   * @param cameraDirection - Optional camera view direction for view-dependent rendering
   */
  generateGeometry(
    position: [number, number, number],
    scale: number,
    hoveredAxis: GizmoAxis,
    cameraDirection?: [number, number, number]
  ): GizmoGeometry;

  /**
   * Perform hit testing against gizmo geometry.
   *
   * @param rayOrigin - Ray origin in world space
   * @param rayDirection - Normalized ray direction
   * @param gizmoPosition - World position of the gizmo
   * @param scale - Screen-space scale factor
   * @returns Hit result or null if no hit
   */
  hitTest(
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number],
    scale: number
  ): GizmoHitResult | null;

  /**
   * Calculate transform delta from drag movement.
   *
   * @param dragState - Current drag state
   * @param rayOrigin - Current ray origin
   * @param rayDirection - Current ray direction
   * @param gizmoPosition - World position of the gizmo
   * @returns Transform delta [dx, dy, dz] or angle delta for rotation
   */
  calculateDragDelta(
    dragState: GizmoDragState,
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number]
  ): [number, number, number];
}

/**
 * Transform delta event emitted during gizmo interaction.
 */
export interface GizmoTransformEvent {
  /** Target entity */
  entity: ISceneObject;

  /** Gizmo mode */
  mode: GizmoMode;

  /** Axis being manipulated */
  axis: GizmoAxis;

  /** Transform delta */
  delta: [number, number, number];

  /** Whether this is the final update (drag ended) */
  final: boolean;
}
