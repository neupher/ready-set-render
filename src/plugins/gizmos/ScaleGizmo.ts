/**
 * ScaleGizmo - Scale Gizmo for Size Manipulation
 *
 * Visual gizmo with 3 box handles (X, Y, Z axes) and center handle for uniform scaling.
 * Uses Z-up coordinate system (Blender convention).
 *
 * Geometry:
 * - X handle (red): Scale along X axis
 * - Y handle (green): Scale along Y axis (forward)
 * - Z handle (blue): Scale along Z axis (up)
 * - Center handle (yellow): Uniform scaling on all axes
 *
 * @example
 * ```typescript
 * const gizmo = new ScaleGizmo();
 * const geometry = gizmo.generateGeometry([0, 0, 0], 1.0, null);
 * renderer.drawGizmo(geometry);
 * ```
 */

import type {
  IGizmo,
  GizmoMode,
  GizmoAxis,
  GizmoGeometry,
  GizmoHitResult,
  GizmoDragState,
} from './interfaces';
import { GIZMO_COLORS } from './interfaces';

/**
 * Gizmo dimensions (relative to scale factor).
 */
const HANDLE_LENGTH = 1.0;
const HANDLE_SIZE = 0.1;
const CENTER_SIZE = 0.15;
const HIT_THRESHOLD = 0.12;

/**
 * Scale gizmo with box handles for each axis.
 */
export class ScaleGizmo implements IGizmo {
  readonly mode: GizmoMode = 'scale';

  /**
   * Generate geometry for rendering.
   */
  generateGeometry(
    position: [number, number, number],
    scale: number,
    hoveredAxis: GizmoAxis
  ): GizmoGeometry {
    const vertices: number[] = [];
    const colors: number[] = [];

    // Generate X handle (red)
    this.addScaleHandle(
      vertices,
      colors,
      position,
      [1, 0, 0],
      scale,
      hoveredAxis === 'x' ? GIZMO_COLORS.hover : GIZMO_COLORS.x
    );

    // Generate Y handle (green)
    this.addScaleHandle(
      vertices,
      colors,
      position,
      [0, 1, 0],
      scale,
      hoveredAxis === 'y' ? GIZMO_COLORS.hover : GIZMO_COLORS.y
    );

    // Generate Z handle (blue)
    this.addScaleHandle(
      vertices,
      colors,
      position,
      [0, 0, 1],
      scale,
      hoveredAxis === 'z' ? GIZMO_COLORS.hover : GIZMO_COLORS.z
    );

    // Generate center handle (yellow cube)
    this.addCenterHandle(
      vertices,
      colors,
      position,
      scale,
      hoveredAxis === 'xyz' ? GIZMO_COLORS.hover : GIZMO_COLORS.free
    );

    return {
      vertices: new Float32Array(vertices),
      vertexCount: vertices.length / 3,
      colors: new Float32Array(colors),
      drawMode: WebGL2RenderingContext.LINES,
    };
  }

  /**
   * Perform hit testing against gizmo geometry.
   */
  hitTest(
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number],
    scale: number
  ): GizmoHitResult | null {
    let closestHit: GizmoHitResult | null = null;
    let closestDistance = Infinity;

    // Test X handle
    const xHit = this.testHandleHit(rayOrigin, rayDirection, gizmoPosition, [1, 0, 0], scale);
    if (xHit !== null && xHit.distance < closestDistance) {
      closestDistance = xHit.distance;
      closestHit = { axis: 'x', distance: xHit.distance, hitPoint: xHit.point };
    }

    // Test Y handle
    const yHit = this.testHandleHit(rayOrigin, rayDirection, gizmoPosition, [0, 1, 0], scale);
    if (yHit !== null && yHit.distance < closestDistance) {
      closestDistance = yHit.distance;
      closestHit = { axis: 'y', distance: yHit.distance, hitPoint: yHit.point };
    }

    // Test Z handle
    const zHit = this.testHandleHit(rayOrigin, rayDirection, gizmoPosition, [0, 0, 1], scale);
    if (zHit !== null && zHit.distance < closestDistance) {
      closestDistance = zHit.distance;
      closestHit = { axis: 'z', distance: zHit.distance, hitPoint: zHit.point };
    }

    // Test center handle
    const centerHit = this.testCenterHit(rayOrigin, rayDirection, gizmoPosition, scale);
    if (centerHit !== null && centerHit.distance < closestDistance) {
      closestHit = { axis: 'xyz', distance: centerHit.distance, hitPoint: centerHit.point };
    }

    return closestHit;
  }

  /**
   * Calculate transform delta from drag movement.
   * Returns scale factors [sx, sy, sz].
   */
  calculateDragDelta(
    dragState: GizmoDragState,
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number]
  ): [number, number, number] {
    if (!dragState.active || !dragState.axis) {
      return [0, 0, 0];
    }

    switch (dragState.axis) {
      case 'x':
        return this.calculateAxisScaleDelta(
          dragState,
          rayOrigin,
          rayDirection,
          gizmoPosition,
          [1, 0, 0],
          0
        );

      case 'y':
        return this.calculateAxisScaleDelta(
          dragState,
          rayOrigin,
          rayDirection,
          gizmoPosition,
          [0, 1, 0],
          1
        );

      case 'z':
        return this.calculateAxisScaleDelta(
          dragState,
          rayOrigin,
          rayDirection,
          gizmoPosition,
          [0, 0, 1],
          2
        );

      case 'xyz':
        return this.calculateUniformScaleDelta(dragState, rayOrigin, rayDirection, gizmoPosition);

      default:
        return [0, 0, 0];
    }
  }

  /**
   * Add scale handle geometry (line + box) for a single axis.
   */
  private addScaleHandle(
    vertices: number[],
    colors: number[],
    origin: [number, number, number],
    direction: [number, number, number],
    scale: number,
    color: [number, number, number]
  ): void {
    const length = HANDLE_LENGTH * scale;
    const boxSize = HANDLE_SIZE * scale;

    // Line from origin to handle
    const endX = origin[0] + direction[0] * length;
    const endY = origin[1] + direction[1] * length;
    const endZ = origin[2] + direction[2] * length;

    vertices.push(
      origin[0], origin[1], origin[2],
      endX, endY, endZ
    );
    colors.push(
      color[0], color[1], color[2],
      color[0], color[1], color[2]
    );

    // Box at the end of the handle
    this.addBox(vertices, colors, [endX, endY, endZ], boxSize, color);
  }

  /**
   * Add center handle geometry (cube).
   */
  private addCenterHandle(
    vertices: number[],
    colors: number[],
    origin: [number, number, number],
    scale: number,
    color: [number, number, number]
  ): void {
    const size = CENTER_SIZE * scale;
    this.addBox(vertices, colors, origin, size, color);
  }

  /**
   * Add box geometry (wireframe cube).
   */
  private addBox(
    vertices: number[],
    colors: number[],
    center: [number, number, number],
    size: number,
    color: [number, number, number]
  ): void {
    const halfSize = size / 2;

    const corners = [
      [center[0] - halfSize, center[1] - halfSize, center[2] - halfSize],
      [center[0] + halfSize, center[1] - halfSize, center[2] - halfSize],
      [center[0] + halfSize, center[1] + halfSize, center[2] - halfSize],
      [center[0] - halfSize, center[1] + halfSize, center[2] - halfSize],
      [center[0] - halfSize, center[1] - halfSize, center[2] + halfSize],
      [center[0] + halfSize, center[1] - halfSize, center[2] + halfSize],
      [center[0] + halfSize, center[1] + halfSize, center[2] + halfSize],
      [center[0] - halfSize, center[1] + halfSize, center[2] + halfSize],
    ];

    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // Bottom face
      [4, 5], [5, 6], [6, 7], [7, 4], // Top face
      [0, 4], [1, 5], [2, 6], [3, 7], // Vertical edges
    ];

    for (const [a, b] of edges) {
      vertices.push(...corners[a], ...corners[b]);
      colors.push(color[0], color[1], color[2], color[0], color[1], color[2]);
    }
  }

  /**
   * Test ray-handle intersection (box at end of axis).
   */
  private testHandleHit(
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number],
    axis: [number, number, number],
    scale: number
  ): { distance: number; point: [number, number, number] } | null {
    const length = HANDLE_LENGTH * scale;
    const boxSize = HANDLE_SIZE * scale;
    const halfSize = boxSize / 2;

    // Box center is at the end of the handle
    const boxCenter: [number, number, number] = [
      gizmoPosition[0] + axis[0] * length,
      gizmoPosition[1] + axis[1] * length,
      gizmoPosition[2] + axis[2] * length,
    ];

    // AABB bounds
    const min: [number, number, number] = [
      boxCenter[0] - halfSize,
      boxCenter[1] - halfSize,
      boxCenter[2] - halfSize,
    ];
    const max: [number, number, number] = [
      boxCenter[0] + halfSize,
      boxCenter[1] + halfSize,
      boxCenter[2] + halfSize,
    ];

    // Also test the line from origin to box
    const lineHit = this.testLineHit(rayOrigin, rayDirection, gizmoPosition, boxCenter, HIT_THRESHOLD * scale);
    const boxHit = this.rayAABBIntersection(rayOrigin, rayDirection, min, max);

    // Return whichever hit is closer
    let closestT: number | null = null;
    if (lineHit !== null && (closestT === null || lineHit < closestT)) {
      closestT = lineHit;
    }
    if (boxHit !== null && boxHit >= 0 && (closestT === null || boxHit < closestT)) {
      closestT = boxHit;
    }

    if (closestT === null) return null;

    return {
      distance: closestT,
      point: [
        rayOrigin[0] + rayDirection[0] * closestT,
        rayOrigin[1] + rayDirection[1] * closestT,
        rayOrigin[2] + rayDirection[2] * closestT,
      ],
    };
  }

  /**
   * Test center handle hit (box at origin).
   */
  private testCenterHit(
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number],
    scale: number
  ): { distance: number; point: [number, number, number] } | null {
    const size = CENTER_SIZE * scale;
    const halfSize = size / 2;

    const min: [number, number, number] = [
      gizmoPosition[0] - halfSize,
      gizmoPosition[1] - halfSize,
      gizmoPosition[2] - halfSize,
    ];
    const max: [number, number, number] = [
      gizmoPosition[0] + halfSize,
      gizmoPosition[1] + halfSize,
      gizmoPosition[2] + halfSize,
    ];

    const t = this.rayAABBIntersection(rayOrigin, rayDirection, min, max);
    if (t === null || t < 0) return null;

    return {
      distance: t,
      point: [
        rayOrigin[0] + rayDirection[0] * t,
        rayOrigin[1] + rayDirection[1] * t,
        rayOrigin[2] + rayDirection[2] * t,
      ],
    };
  }

  /**
   * Test ray-line intersection for handle lines.
   */
  private testLineHit(
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    lineStart: [number, number, number],
    lineEnd: [number, number, number],
    threshold: number
  ): number | null {
    const lineDir = this.subtractVectors(lineEnd, lineStart);
    const lineLen = Math.sqrt(lineDir[0] * lineDir[0] + lineDir[1] * lineDir[1] + lineDir[2] * lineDir[2]);
    if (lineLen < 1e-6) return null;

    const normalizedDir: [number, number, number] = [
      lineDir[0] / lineLen,
      lineDir[1] / lineLen,
      lineDir[2] / lineLen,
    ];

    const result = this.closestPointsOnLines(rayOrigin, rayDirection, lineStart, normalizedDir);
    if (!result) return null;

    // Check if point is within line segment
    const t2 = result.t2;
    if (t2 < 0 || t2 > lineLen) return null;

    // Check distance threshold
    if (result.distance > threshold) return null;

    return result.t1;
  }

  /**
   * Calculate scale delta for single-axis scaling.
   */
  private calculateAxisScaleDelta(
    dragState: GizmoDragState,
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number],
    axis: [number, number, number],
    axisIndex: number
  ): [number, number, number] {
    // Project current ray onto axis
    const result = this.closestPointsOnLines(rayOrigin, rayDirection, gizmoPosition, axis);
    if (!result) return [0, 0, 0];

    // Calculate movement along axis
    const currentPoint = result.point2;
    const movement =
      (currentPoint[0] - dragState.startIntersection[0]) * axis[0] +
      (currentPoint[1] - dragState.startIntersection[1]) * axis[1] +
      (currentPoint[2] - dragState.startIntersection[2]) * axis[2];

    // Convert to scale factor (movement of 1 unit = 1x scale increase)
    const scaleFactor = movement;

    const delta: [number, number, number] = [0, 0, 0];
    delta[axisIndex] = scaleFactor;
    return delta;
  }

  /**
   * Calculate uniform scale delta.
   */
  private calculateUniformScaleDelta(
    dragState: GizmoDragState,
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number]
  ): [number, number, number] {
    // Use screen-space vertical movement for uniform scale
    // Calculate distance from camera to current hit point
    const diff = this.subtractVectors(gizmoPosition, rayOrigin);
    const t = this.dotProduct(diff, rayDirection);

    const currentHit: [number, number, number] = [
      rayOrigin[0] + rayDirection[0] * t,
      rayOrigin[1] + rayDirection[1] * t,
      rayOrigin[2] + rayDirection[2] * t,
    ];

    // Calculate change in distance from center
    const startDist = Math.sqrt(
      Math.pow(dragState.startIntersection[0] - gizmoPosition[0], 2) +
      Math.pow(dragState.startIntersection[1] - gizmoPosition[1], 2) +
      Math.pow(dragState.startIntersection[2] - gizmoPosition[2], 2)
    );

    const currentDist = Math.sqrt(
      Math.pow(currentHit[0] - gizmoPosition[0], 2) +
      Math.pow(currentHit[1] - gizmoPosition[1], 2) +
      Math.pow(currentHit[2] - gizmoPosition[2], 2)
    );

    // Scale factor based on distance ratio
    const scaleFactor = startDist > 0.001 ? (currentDist / startDist) - 1 : 0;

    return [scaleFactor, scaleFactor, scaleFactor];
  }

  // --- Vector math utilities ---

  private closestPointsOnLines(
    p1: [number, number, number],
    d1: [number, number, number],
    p2: [number, number, number],
    d2: [number, number, number]
  ): { t1: number; t2: number; point1: number[]; point2: number[]; distance: number } | null {
    const w = this.subtractVectors(p1, p2);

    const a = this.dotProduct(d1, d1);
    const b = this.dotProduct(d1, d2);
    const c = this.dotProduct(d2, d2);
    const d = this.dotProduct(d1, w);
    const e = this.dotProduct(d2, w);

    const denom = a * c - b * b;
    if (Math.abs(denom) < 1e-6) return null;

    const t1 = (b * e - c * d) / denom;
    const t2 = (a * e - b * d) / denom;

    const point1 = [p1[0] + d1[0] * t1, p1[1] + d1[1] * t1, p1[2] + d1[2] * t1];
    const point2 = [p2[0] + d2[0] * t2, p2[1] + d2[1] * t2, p2[2] + d2[2] * t2];

    const distance = Math.sqrt(
      Math.pow(point1[0] - point2[0], 2) +
      Math.pow(point1[1] - point2[1], 2) +
      Math.pow(point1[2] - point2[2], 2)
    );

    return { t1, t2, point1, point2, distance };
  }

  private rayAABBIntersection(
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    min: [number, number, number],
    max: [number, number, number]
  ): number | null {
    let tMin = -Infinity;
    let tMax = Infinity;

    for (let i = 0; i < 3; i++) {
      if (Math.abs(rayDirection[i]) < 1e-6) {
        if (rayOrigin[i] < min[i] || rayOrigin[i] > max[i]) {
          return null;
        }
      } else {
        const invD = 1.0 / rayDirection[i];
        let t0 = (min[i] - rayOrigin[i]) * invD;
        let t1 = (max[i] - rayOrigin[i]) * invD;

        if (invD < 0) {
          [t0, t1] = [t1, t0];
        }

        tMin = Math.max(tMin, t0);
        tMax = Math.min(tMax, t1);

        if (tMax < tMin) {
          return null;
        }
      }
    }

    return tMin;
  }

  private dotProduct(a: [number, number, number], b: [number, number, number]): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  private subtractVectors(
    a: [number, number, number],
    b: [number, number, number]
  ): [number, number, number] {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }
}
