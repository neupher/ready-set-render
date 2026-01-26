/**
 * TranslateGizmo - Translation Gizmo for Position Manipulation
 *
 * Visual gizmo with 3 arrows (X, Y, Z axes) and center handle for free movement.
 * Uses Z-up coordinate system (Blender convention).
 *
 * Geometry:
 * - X arrow (red): Points along +X axis
 * - Y arrow (green): Points along +Y axis (forward)
 * - Z arrow (blue): Points along +Z axis (up)
 * - Center handle (yellow): Free XY plane movement
 * - Plane handles: XY, XZ, YZ plane movement
 *
 * @example
 * ```typescript
 * const gizmo = new TranslateGizmo();
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
const ARROW_LENGTH = 1.0;
const ARROW_HEAD_LENGTH = 0.2;
const ARROW_HEAD_RADIUS = 0.08;
const CENTER_SIZE = 0.15;
const PLANE_HANDLE_SIZE = 0.3;
const PLANE_HANDLE_OFFSET = 0.3;
const HIT_THRESHOLD = 0.1;

/**
 * Translation gizmo with arrows for each axis.
 */
export class TranslateGizmo implements IGizmo {
  readonly mode: GizmoMode = 'translate';

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

    // Generate X arrow (red)
    this.addArrow(
      vertices,
      colors,
      position,
      [1, 0, 0],
      scale,
      hoveredAxis === 'x' || hoveredAxis === 'xy' || hoveredAxis === 'xz' ? GIZMO_COLORS.hover : GIZMO_COLORS.x
    );

    // Generate Y arrow (green)
    this.addArrow(
      vertices,
      colors,
      position,
      [0, 1, 0],
      scale,
      hoveredAxis === 'y' || hoveredAxis === 'xy' || hoveredAxis === 'yz' ? GIZMO_COLORS.hover : GIZMO_COLORS.y
    );

    // Generate Z arrow (blue)
    this.addArrow(
      vertices,
      colors,
      position,
      [0, 0, 1],
      scale,
      hoveredAxis === 'z' || hoveredAxis === 'xz' || hoveredAxis === 'yz' ? GIZMO_COLORS.hover : GIZMO_COLORS.z
    );

    // Generate center handle (yellow square)
    this.addCenterHandle(
      vertices,
      colors,
      position,
      scale,
      hoveredAxis === 'xyz' ? GIZMO_COLORS.hover : GIZMO_COLORS.free
    );

    // Generate plane handles (XY, XZ, YZ)
    this.addPlaneHandle(
      vertices,
      colors,
      position,
      [1, 0, 0],
      [0, 1, 0],
      scale,
      hoveredAxis === 'xy' ? GIZMO_COLORS.hover : GIZMO_COLORS.free,
      0.3 // Alpha for plane fills
    );

    this.addPlaneHandle(
      vertices,
      colors,
      position,
      [1, 0, 0],
      [0, 0, 1],
      scale,
      hoveredAxis === 'xz' ? GIZMO_COLORS.hover : GIZMO_COLORS.free,
      0.3
    );

    this.addPlaneHandle(
      vertices,
      colors,
      position,
      [0, 1, 0],
      [0, 0, 1],
      scale,
      hoveredAxis === 'yz' ? GIZMO_COLORS.hover : GIZMO_COLORS.free,
      0.3
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
    const threshold = HIT_THRESHOLD * scale;
    let closestHit: GizmoHitResult | null = null;
    let closestDistance = Infinity;

    // Test X axis
    const xHit = this.testAxisHit(rayOrigin, rayDirection, gizmoPosition, [1, 0, 0], scale, threshold);
    if (xHit !== null && xHit.distance < closestDistance) {
      closestDistance = xHit.distance;
      closestHit = { axis: 'x', distance: xHit.distance, hitPoint: xHit.point };
    }

    // Test Y axis
    const yHit = this.testAxisHit(rayOrigin, rayDirection, gizmoPosition, [0, 1, 0], scale, threshold);
    if (yHit !== null && yHit.distance < closestDistance) {
      closestDistance = yHit.distance;
      closestHit = { axis: 'y', distance: yHit.distance, hitPoint: yHit.point };
    }

    // Test Z axis
    const zHit = this.testAxisHit(rayOrigin, rayDirection, gizmoPosition, [0, 0, 1], scale, threshold);
    if (zHit !== null && zHit.distance < closestDistance) {
      closestDistance = zHit.distance;
      closestHit = { axis: 'z', distance: zHit.distance, hitPoint: zHit.point };
    }

    // Test plane handles (with priority over axes for overlapping regions)
    const xyHit = this.testPlaneHandleHit(rayOrigin, rayDirection, gizmoPosition, [0, 0, 1], scale);
    if (xyHit !== null && xyHit.distance < closestDistance) {
      closestDistance = xyHit.distance;
      closestHit = { axis: 'xy', distance: xyHit.distance, hitPoint: xyHit.point };
    }

    const xzHit = this.testPlaneHandleHit(rayOrigin, rayDirection, gizmoPosition, [0, 1, 0], scale);
    if (xzHit !== null && xzHit.distance < closestDistance) {
      closestDistance = xzHit.distance;
      closestHit = { axis: 'xz', distance: xzHit.distance, hitPoint: xzHit.point };
    }

    const yzHit = this.testPlaneHandleHit(rayOrigin, rayDirection, gizmoPosition, [1, 0, 0], scale);
    if (yzHit !== null && yzHit.distance < closestDistance) {
      closestDistance = yzHit.distance;
      closestHit = { axis: 'yz', distance: yzHit.distance, hitPoint: yzHit.point };
    }

    // Test center handle
    const centerHit = this.testCenterHit(rayOrigin, rayDirection, gizmoPosition, scale, threshold);
    if (centerHit !== null && centerHit.distance < closestDistance) {
      closestHit = { axis: 'xyz', distance: centerHit.distance, hitPoint: centerHit.point };
    }

    return closestHit;
  }

  /**
   * Calculate transform delta from drag movement.
   */
  calculateDragDelta(
    dragState: GizmoDragState,
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number]
  ): [number, number, number] {
    const delta: [number, number, number] = [0, 0, 0];

    if (!dragState.active || !dragState.axis) {
      return delta;
    }

    switch (dragState.axis) {
      case 'x':
        return this.calculateAxisDelta(
          dragState,
          rayOrigin,
          rayDirection,
          gizmoPosition,
          [1, 0, 0]
        );

      case 'y':
        return this.calculateAxisDelta(
          dragState,
          rayOrigin,
          rayDirection,
          gizmoPosition,
          [0, 1, 0]
        );

      case 'z':
        return this.calculateAxisDelta(
          dragState,
          rayOrigin,
          rayDirection,
          gizmoPosition,
          [0, 0, 1]
        );

      case 'xy':
        return this.calculatePlaneDelta(
          dragState,
          rayOrigin,
          rayDirection,
          gizmoPosition,
          [0, 0, 1]
        );

      case 'xz':
        return this.calculatePlaneDelta(
          dragState,
          rayOrigin,
          rayDirection,
          gizmoPosition,
          [0, 1, 0]
        );

      case 'yz':
        return this.calculatePlaneDelta(
          dragState,
          rayOrigin,
          rayDirection,
          gizmoPosition,
          [1, 0, 0]
        );

      case 'xyz':
        // Free movement in camera plane
        return this.calculateFreeDelta(dragState, rayOrigin, rayDirection, gizmoPosition);

      default:
        return delta;
    }
  }

  /**
   * Add arrow geometry for a single axis.
   */
  private addArrow(
    vertices: number[],
    colors: number[],
    origin: [number, number, number],
    direction: [number, number, number],
    scale: number,
    color: [number, number, number]
  ): void {
    const length = ARROW_LENGTH * scale;
    const headLength = ARROW_HEAD_LENGTH * scale;

    // Arrow shaft (line from origin to tip)
    const tipX = origin[0] + direction[0] * length;
    const tipY = origin[1] + direction[1] * length;
    const tipZ = origin[2] + direction[2] * length;

    vertices.push(
      origin[0], origin[1], origin[2],
      tipX, tipY, tipZ
    );
    colors.push(
      color[0], color[1], color[2],
      color[0], color[1], color[2]
    );

    // Arrow head (cone represented as lines)
    const headBaseX = tipX - direction[0] * headLength;
    const headBaseY = tipY - direction[1] * headLength;
    const headBaseZ = tipZ - direction[2] * headLength;

    // Create perpendicular vectors for the cone base
    const perp1 = this.getPerpendicularVector(direction);
    const perp2 = this.crossProduct(direction, perp1);

    const headRadius = ARROW_HEAD_RADIUS * scale;
    const segments = 8;

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const nextAngle = ((i + 1) / segments) * Math.PI * 2;

      const cos1 = Math.cos(angle);
      const sin1 = Math.sin(angle);
      const cos2 = Math.cos(nextAngle);
      const sin2 = Math.sin(nextAngle);

      // Point on cone base
      const base1X = headBaseX + (perp1[0] * cos1 + perp2[0] * sin1) * headRadius;
      const base1Y = headBaseY + (perp1[1] * cos1 + perp2[1] * sin1) * headRadius;
      const base1Z = headBaseZ + (perp1[2] * cos1 + perp2[2] * sin1) * headRadius;

      const base2X = headBaseX + (perp1[0] * cos2 + perp2[0] * sin2) * headRadius;
      const base2Y = headBaseY + (perp1[1] * cos2 + perp2[1] * sin2) * headRadius;
      const base2Z = headBaseZ + (perp1[2] * cos2 + perp2[2] * sin2) * headRadius;

      // Lines from tip to base
      vertices.push(tipX, tipY, tipZ, base1X, base1Y, base1Z);
      colors.push(color[0], color[1], color[2], color[0], color[1], color[2]);

      // Lines around base circle
      vertices.push(base1X, base1Y, base1Z, base2X, base2Y, base2Z);
      colors.push(color[0], color[1], color[2], color[0], color[1], color[2]);
    }
  }

  /**
   * Add center handle geometry.
   */
  private addCenterHandle(
    vertices: number[],
    colors: number[],
    origin: [number, number, number],
    scale: number,
    color: [number, number, number]
  ): void {
    const size = CENTER_SIZE * scale;
    const halfSize = size / 2;

    // Draw a small cube outline at the center
    const corners = [
      [origin[0] - halfSize, origin[1] - halfSize, origin[2] - halfSize],
      [origin[0] + halfSize, origin[1] - halfSize, origin[2] - halfSize],
      [origin[0] + halfSize, origin[1] + halfSize, origin[2] - halfSize],
      [origin[0] - halfSize, origin[1] + halfSize, origin[2] - halfSize],
      [origin[0] - halfSize, origin[1] - halfSize, origin[2] + halfSize],
      [origin[0] + halfSize, origin[1] - halfSize, origin[2] + halfSize],
      [origin[0] + halfSize, origin[1] + halfSize, origin[2] + halfSize],
      [origin[0] - halfSize, origin[1] + halfSize, origin[2] + halfSize],
    ];

    // Bottom face edges
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // Bottom
      [4, 5], [5, 6], [6, 7], [7, 4], // Top
      [0, 4], [1, 5], [2, 6], [3, 7], // Verticals
    ];

    for (const [a, b] of edges) {
      vertices.push(...corners[a], ...corners[b]);
      colors.push(color[0], color[1], color[2], color[0], color[1], color[2]);
    }
  }

  /**
   * Add plane handle geometry (small square).
   */
  private addPlaneHandle(
    vertices: number[],
    colors: number[],
    origin: [number, number, number],
    axis1: [number, number, number],
    axis2: [number, number, number],
    scale: number,
    color: [number, number, number],
    _alpha: number
  ): void {
    const size = PLANE_HANDLE_SIZE * scale;
    const offset = PLANE_HANDLE_OFFSET * scale;

    // Four corners of the plane handle square
    const corner1 = [
      origin[0] + axis1[0] * offset + axis2[0] * offset,
      origin[1] + axis1[1] * offset + axis2[1] * offset,
      origin[2] + axis1[2] * offset + axis2[2] * offset,
    ];
    const corner2 = [
      origin[0] + axis1[0] * (offset + size) + axis2[0] * offset,
      origin[1] + axis1[1] * (offset + size) + axis2[1] * offset,
      origin[2] + axis1[2] * (offset + size) + axis2[2] * offset,
    ];
    const corner3 = [
      origin[0] + axis1[0] * (offset + size) + axis2[0] * (offset + size),
      origin[1] + axis1[1] * (offset + size) + axis2[1] * (offset + size),
      origin[2] + axis1[2] * (offset + size) + axis2[2] * (offset + size),
    ];
    const corner4 = [
      origin[0] + axis1[0] * offset + axis2[0] * (offset + size),
      origin[1] + axis1[1] * offset + axis2[1] * (offset + size),
      origin[2] + axis1[2] * offset + axis2[2] * (offset + size),
    ];

    // Draw as lines (outline)
    vertices.push(...corner1, ...corner2);
    colors.push(color[0], color[1], color[2], color[0], color[1], color[2]);

    vertices.push(...corner2, ...corner3);
    colors.push(color[0], color[1], color[2], color[0], color[1], color[2]);

    vertices.push(...corner3, ...corner4);
    colors.push(color[0], color[1], color[2], color[0], color[1], color[2]);

    vertices.push(...corner4, ...corner1);
    colors.push(color[0], color[1], color[2], color[0], color[1], color[2]);
  }

  /**
   * Test ray-axis intersection for hit detection.
   */
  private testAxisHit(
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number],
    axis: [number, number, number],
    scale: number,
    threshold: number
  ): { distance: number; point: [number, number, number] } | null {
    // Find closest point between ray and axis line
    const axisEnd: [number, number, number] = [
      gizmoPosition[0] + axis[0] * ARROW_LENGTH * scale,
      gizmoPosition[1] + axis[1] * ARROW_LENGTH * scale,
      gizmoPosition[2] + axis[2] * ARROW_LENGTH * scale,
    ];

    const result = this.closestPointsOnLines(
      rayOrigin,
      rayDirection,
      gizmoPosition,
      this.subtractVectors(axisEnd, gizmoPosition)
    );

    if (!result) return null;

    // Check if point is within axis segment
    const t2 = result.t2;
    if (t2 < 0 || t2 > 1) return null;

    // Check distance threshold
    const distance = result.distance;
    if (distance > threshold) return null;

    return {
      distance: result.t1,
      point: result.point2 as [number, number, number],
    };
  }

  /**
   * Test ray-plane handle intersection.
   */
  private testPlaneHandleHit(
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number],
    planeNormal: [number, number, number],
    scale: number
  ): { distance: number; point: [number, number, number] } | null {
    // Ray-plane intersection
    const denom = this.dotProduct(planeNormal, rayDirection);
    if (Math.abs(denom) < 1e-6) return null;

    const offset = PLANE_HANDLE_OFFSET * scale;
    const size = PLANE_HANDLE_SIZE * scale;

    // Plane passes through gizmo position
    const diff = this.subtractVectors(gizmoPosition, rayOrigin);
    const t = this.dotProduct(diff, planeNormal) / denom;

    if (t < 0) return null;

    // Hit point
    const hitPoint: [number, number, number] = [
      rayOrigin[0] + rayDirection[0] * t,
      rayOrigin[1] + rayDirection[1] * t,
      rayOrigin[2] + rayDirection[2] * t,
    ];

    // Check if hit point is within the plane handle bounds
    const relativeHit = this.subtractVectors(hitPoint, gizmoPosition);

    // Get the two axes that span this plane
    const [axis1, axis2] = this.getPlaneAxes(planeNormal);

    const u = this.dotProduct(relativeHit, axis1);
    const v = this.dotProduct(relativeHit, axis2);

    // Check bounds
    if (u >= offset && u <= offset + size && v >= offset && v <= offset + size) {
      return { distance: t, point: hitPoint };
    }

    return null;
  }

  /**
   * Test center handle hit.
   */
  private testCenterHit(
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number],
    scale: number,
    _threshold: number
  ): { distance: number; point: [number, number, number] } | null {
    const size = CENTER_SIZE * scale;
    const halfSize = size / 2;

    // Simple AABB intersection
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

    const tMin = this.rayAABBIntersection(rayOrigin, rayDirection, min, max);
    if (tMin === null || tMin < 0) return null;

    return {
      distance: tMin,
      point: [
        rayOrigin[0] + rayDirection[0] * tMin,
        rayOrigin[1] + rayDirection[1] * tMin,
        rayOrigin[2] + rayDirection[2] * tMin,
      ],
    };
  }

  /**
   * Calculate delta for single-axis movement.
   */
  private calculateAxisDelta(
    dragState: GizmoDragState,
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number],
    axis: [number, number, number]
  ): [number, number, number] {
    // Project current ray onto axis
    const result = this.closestPointsOnLines(
      rayOrigin,
      rayDirection,
      gizmoPosition,
      axis
    );

    if (!result) return [0, 0, 0];

    // Calculate movement along axis
    const currentPoint = result.point2;
    const movement =
      (currentPoint[0] - dragState.startIntersection[0]) * axis[0] +
      (currentPoint[1] - dragState.startIntersection[1]) * axis[1] +
      (currentPoint[2] - dragState.startIntersection[2]) * axis[2];

    return [axis[0] * movement, axis[1] * movement, axis[2] * movement];
  }

  /**
   * Calculate delta for plane movement.
   */
  private calculatePlaneDelta(
    dragState: GizmoDragState,
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number],
    planeNormal: [number, number, number]
  ): [number, number, number] {
    // Ray-plane intersection
    const denom = this.dotProduct(planeNormal, rayDirection);
    if (Math.abs(denom) < 1e-6) return [0, 0, 0];

    const diff = this.subtractVectors(gizmoPosition, rayOrigin);
    const t = this.dotProduct(diff, planeNormal) / denom;

    if (t < 0) return [0, 0, 0];

    const hitPoint: [number, number, number] = [
      rayOrigin[0] + rayDirection[0] * t,
      rayOrigin[1] + rayDirection[1] * t,
      rayOrigin[2] + rayDirection[2] * t,
    ];

    return [
      hitPoint[0] - dragState.startIntersection[0],
      hitPoint[1] - dragState.startIntersection[1],
      hitPoint[2] - dragState.startIntersection[2],
    ];
  }

  /**
   * Calculate delta for free movement (camera plane).
   */
  private calculateFreeDelta(
    dragState: GizmoDragState,
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    _gizmoPosition: [number, number, number]
  ): [number, number, number] {
    // For free movement, we move in the camera plane
    // Use the ray direction as the plane normal
    const planeNormal = rayDirection;
    const denom = this.dotProduct(planeNormal, rayDirection);

    if (Math.abs(denom) < 1e-6) return [0, 0, 0];

    // Plane at start intersection point
    const diff = this.subtractVectors(dragState.startIntersection, rayOrigin);
    const t = this.dotProduct(diff, planeNormal) / denom;

    const hitPoint: [number, number, number] = [
      rayOrigin[0] + rayDirection[0] * t,
      rayOrigin[1] + rayDirection[1] * t,
      rayOrigin[2] + rayDirection[2] * t,
    ];

    return [
      hitPoint[0] - dragState.startIntersection[0],
      hitPoint[1] - dragState.startIntersection[1],
      hitPoint[2] - dragState.startIntersection[2],
    ];
  }

  // --- Vector math utilities ---

  private getPerpendicularVector(v: [number, number, number]): [number, number, number] {
    // Find a vector perpendicular to v
    if (Math.abs(v[0]) < 0.9) {
      return this.normalizeVector(this.crossProduct(v, [1, 0, 0]));
    } else {
      return this.normalizeVector(this.crossProduct(v, [0, 1, 0]));
    }
  }

  private crossProduct(
    a: [number, number, number],
    b: [number, number, number]
  ): [number, number, number] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
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

  private normalizeVector(v: [number, number, number]): [number, number, number] {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (len < 1e-6) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  private getPlaneAxes(
    normal: [number, number, number]
  ): [[number, number, number], [number, number, number]] {
    // Given a plane normal, return two axes that span the plane
    if (normal[0] !== 0) {
      // Normal is X, plane is YZ
      return [[0, 1, 0], [0, 0, 1]];
    } else if (normal[1] !== 0) {
      // Normal is Y, plane is XZ
      return [[1, 0, 0], [0, 0, 1]];
    } else {
      // Normal is Z, plane is XY
      return [[1, 0, 0], [0, 1, 0]];
    }
  }

  /**
   * Find closest points between two lines.
   */
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

  /**
   * Ray-AABB intersection test.
   */
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
        // Ray is parallel to slab
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
}
