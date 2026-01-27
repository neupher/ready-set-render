/**
 * RotateGizmo - Rotation Gizmo for Orientation Manipulation
 *
 * Visual gizmo with 3 circular rings (X, Y, Z axes) for rotation.
 * Uses Z-up coordinate system (Blender convention).
 *
 * Geometry:
 * - X ring (red): Rotation around X axis
 * - Y ring (green): Rotation around Y axis (forward)
 * - Z ring (blue): Rotation around Z axis (up)
 *
 * @example
 * ```typescript
 * const gizmo = new RotateGizmo();
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
const RING_RADIUS = 0.8;
const RING_SEGMENTS = 48;
const HIT_THRESHOLD = 0.15; // Larger threshold for easier ring selection

/**
 * Rotation gizmo with rings for each axis.
 */
export class RotateGizmo implements IGizmo {
  readonly mode: GizmoMode = 'rotate';

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

    // Generate X ring (red) - rotation around X axis
    this.addRing(
      vertices,
      colors,
      position,
      [1, 0, 0],
      scale,
      hoveredAxis === 'x' ? GIZMO_COLORS.hover : GIZMO_COLORS.x
    );

    // Generate Y ring (green) - rotation around Y axis
    this.addRing(
      vertices,
      colors,
      position,
      [0, 1, 0],
      scale,
      hoveredAxis === 'y' ? GIZMO_COLORS.hover : GIZMO_COLORS.y
    );

    // Generate Z ring (blue) - rotation around Z axis
    this.addRing(
      vertices,
      colors,
      position,
      [0, 0, 1],
      scale,
      hoveredAxis === 'z' ? GIZMO_COLORS.hover : GIZMO_COLORS.z
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

    // Test X ring
    const xHit = this.testRingHit(rayOrigin, rayDirection, gizmoPosition, [1, 0, 0], scale, threshold);
    if (xHit !== null && xHit.distance < closestDistance) {
      closestDistance = xHit.distance;
      closestHit = { axis: 'x', distance: xHit.distance, hitPoint: xHit.point };
    }

    // Test Y ring
    const yHit = this.testRingHit(rayOrigin, rayDirection, gizmoPosition, [0, 1, 0], scale, threshold);
    if (yHit !== null && yHit.distance < closestDistance) {
      closestDistance = yHit.distance;
      closestHit = { axis: 'y', distance: yHit.distance, hitPoint: yHit.point };
    }

    // Test Z ring
    const zHit = this.testRingHit(rayOrigin, rayDirection, gizmoPosition, [0, 0, 1], scale, threshold);
    if (zHit !== null && zHit.distance < closestDistance) {
      closestHit = { axis: 'z', distance: zHit.distance, hitPoint: zHit.point };
    }

    return closestHit;
  }

  /**
   * Calculate transform delta from drag movement.
   * Returns rotation angles in degrees [rx, ry, rz].
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

    // Get the rotation axis
    let axis: [number, number, number];
    switch (dragState.axis) {
      case 'x':
        axis = [1, 0, 0];
        break;
      case 'y':
        axis = [0, 1, 0];
        break;
      case 'z':
        axis = [0, 0, 1];
        break;
      default:
        return [0, 0, 0];
    }

    // Calculate angle from start to current position
    const angle = this.calculateRotationAngle(
      dragState.startIntersection,
      rayOrigin,
      rayDirection,
      gizmoPosition,
      axis
    );

    // Return rotation delta in degrees for the appropriate axis
    switch (dragState.axis) {
      case 'x':
        return [angle, 0, 0];
      case 'y':
        return [0, angle, 0];
      case 'z':
        return [0, 0, angle];
      default:
        return [0, 0, 0];
    }
  }

  /**
   * Add ring geometry for a single rotation axis.
   */
  private addRing(
    vertices: number[],
    colors: number[],
    center: [number, number, number],
    normal: [number, number, number],
    scale: number,
    color: [number, number, number]
  ): void {
    const radius = RING_RADIUS * scale;

    // Get perpendicular vectors to create the ring plane
    const perp1 = this.getPerpendicularVector(normal);
    const perp2 = this.crossProduct(normal, perp1);

    // Generate ring as line segments
    for (let i = 0; i < RING_SEGMENTS; i++) {
      const angle1 = (i / RING_SEGMENTS) * Math.PI * 2;
      const angle2 = ((i + 1) / RING_SEGMENTS) * Math.PI * 2;

      const cos1 = Math.cos(angle1);
      const sin1 = Math.sin(angle1);
      const cos2 = Math.cos(angle2);
      const sin2 = Math.sin(angle2);

      // Points on the ring
      const p1X = center[0] + (perp1[0] * cos1 + perp2[0] * sin1) * radius;
      const p1Y = center[1] + (perp1[1] * cos1 + perp2[1] * sin1) * radius;
      const p1Z = center[2] + (perp1[2] * cos1 + perp2[2] * sin1) * radius;

      const p2X = center[0] + (perp1[0] * cos2 + perp2[0] * sin2) * radius;
      const p2Y = center[1] + (perp1[1] * cos2 + perp2[1] * sin2) * radius;
      const p2Z = center[2] + (perp1[2] * cos2 + perp2[2] * sin2) * radius;

      vertices.push(p1X, p1Y, p1Z, p2X, p2Y, p2Z);
      colors.push(color[0], color[1], color[2], color[0], color[1], color[2]);
    }
  }

  /**
   * Test ray-ring intersection for hit detection.
   */
  private testRingHit(
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number],
    ringNormal: [number, number, number],
    scale: number,
    threshold: number
  ): { distance: number; point: [number, number, number] } | null {
    // First, intersect ray with the ring's plane
    const denom = this.dotProduct(ringNormal, rayDirection);

    // Handle rays nearly parallel to the plane
    if (Math.abs(denom) < 1e-6) return null;

    const diff = this.subtractVectors(gizmoPosition, rayOrigin);
    const t = this.dotProduct(diff, ringNormal) / denom;

    if (t < 0) return null;

    // Calculate hit point
    const hitPoint: [number, number, number] = [
      rayOrigin[0] + rayDirection[0] * t,
      rayOrigin[1] + rayDirection[1] * t,
      rayOrigin[2] + rayDirection[2] * t,
    ];

    // Check if hit point is near the ring (within threshold of ring radius)
    const relativeHit = this.subtractVectors(hitPoint, gizmoPosition);
    const hitDistance = Math.sqrt(
      relativeHit[0] * relativeHit[0] +
      relativeHit[1] * relativeHit[1] +
      relativeHit[2] * relativeHit[2]
    );

    const ringRadius = RING_RADIUS * scale;
    const distFromRing = Math.abs(hitDistance - ringRadius);

    if (distFromRing > threshold) return null;

    return { distance: t, point: hitPoint };
  }

  /**
   * Calculate rotation angle from drag start to current ray position.
   */
  private calculateRotationAngle(
    startPoint: [number, number, number],
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number],
    rotationAxis: [number, number, number]
  ): number {
    // Intersect current ray with rotation plane
    const denom = this.dotProduct(rotationAxis, rayDirection);
    if (Math.abs(denom) < 1e-6) return 0;

    const diff = this.subtractVectors(gizmoPosition, rayOrigin);
    const t = this.dotProduct(diff, rotationAxis) / denom;

    if (t < 0) return 0;

    const currentPoint: [number, number, number] = [
      rayOrigin[0] + rayDirection[0] * t,
      rayOrigin[1] + rayDirection[1] * t,
      rayOrigin[2] + rayDirection[2] * t,
    ];

    // Get vectors from center to start and current points
    const startVec = this.subtractVectors(startPoint, gizmoPosition);
    const currentVec = this.subtractVectors(currentPoint, gizmoPosition);

    // Normalize the vectors
    const startNorm = this.normalizeVector(startVec);
    const currentNorm = this.normalizeVector(currentVec);

    // Calculate angle using dot product
    let dot = this.dotProduct(startNorm, currentNorm);
    dot = Math.max(-1, Math.min(1, dot)); // Clamp to [-1, 1]
    let angle = Math.acos(dot) * (180 / Math.PI);

    // Determine rotation direction using cross product
    const cross = this.crossProduct(startNorm, currentNorm);
    const crossDot = this.dotProduct(cross, rotationAxis);
    if (crossDot < 0) {
      angle = -angle;
    }

    return angle;
  }

  // --- Vector math utilities ---

  private getPerpendicularVector(v: [number, number, number]): [number, number, number] {
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
}
