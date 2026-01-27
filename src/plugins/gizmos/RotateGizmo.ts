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
 * - Center handle (yellow): All-axis rotation
 *
 * The rings are rendered as solid torus segments with alpha fading
 * based on their orientation to the camera (rings facing away fade out).
 *
 * @example
 * ```typescript
 * const gizmo = new RotateGizmo();
 * const geometry = gizmo.generateGeometry([0, 0, 0], 1.0, null, cameraDirection);
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
const RING_WIDTH_RATIO = 0.08; // 8% of radius for solid rings
const RING_SEGMENTS = 48;
const HIT_THRESHOLD = 0.1;
const CENTER_HIT_RADIUS = 0.15; // Radius for center all-axis hit detection

/**
 * Rotation gizmo with rings for each axis.
 */
export class RotateGizmo implements IGizmo {
  readonly mode: GizmoMode = 'rotate';

  /**
   * Generate geometry for rendering.
   * @param cameraDirection - Optional camera view direction for fading rings facing away
   */
  generateGeometry(
    position: [number, number, number],
    scale: number,
    hoveredAxis: GizmoAxis,
    cameraDirection?: [number, number, number]
  ): GizmoGeometry {
    const vertices: number[] = [];
    const colors: number[] = [];

    // Default camera direction if not provided (looking down -Y)
    const viewDir = cameraDirection ?? [0, -1, 0];

    // Generate X ring (red) - rotation around X axis
    const xColor = hoveredAxis === 'x' || hoveredAxis === 'xyz'
      ? GIZMO_COLORS.hover
      : GIZMO_COLORS.x;
    const xFade = this.calculateRingFade([1, 0, 0], viewDir);
    this.addRingWithFade(
      vertices,
      colors,
      position,
      [1, 0, 0], // Ring normal (perpendicular to rotation plane)
      scale,
      xColor,
      xFade,
      viewDir
    );

    // Generate Y ring (green) - rotation around Y axis
    const yColor = hoveredAxis === 'y' || hoveredAxis === 'xyz'
      ? GIZMO_COLORS.hover
      : GIZMO_COLORS.y;
    const yFade = this.calculateRingFade([0, 1, 0], viewDir);
    this.addRingWithFade(
      vertices,
      colors,
      position,
      [0, 1, 0],
      scale,
      yColor,
      yFade,
      viewDir
    );

    // Generate Z ring (blue) - rotation around Z axis
    const zColor = hoveredAxis === 'z' || hoveredAxis === 'xyz'
      ? GIZMO_COLORS.hover
      : GIZMO_COLORS.z;
    const zFade = this.calculateRingFade([0, 0, 1], viewDir);
    this.addRingWithFade(
      vertices,
      colors,
      position,
      [0, 0, 1],
      scale,
      zColor,
      zFade,
      viewDir
    );

    return {
      vertices: new Float32Array(vertices),
      vertexCount: vertices.length / 3,
      colors: new Float32Array(colors),
      drawMode: WebGL2RenderingContext.TRIANGLES,
    };
  }

  /**
   * Calculate fade factor for a ring based on its orientation to the camera.
   * Returns 1.0 for rings facing camera (perpendicular to view), fades to ~0 when edge-on.
   */
  private calculateRingFade(
    ringNormal: [number, number, number],
    cameraDirection: [number, number, number]
  ): number {
    // When the ring normal is perpendicular to the view direction,
    // the ring is "facing" the camera (we see it as a circle).
    // When the ring normal is parallel to the view direction,
    // the ring is "edge-on" (we see it as a line) - this should fade out.

    // Dot product: 0 when perpendicular (ring facing camera), ±1 when parallel (edge-on)
    const dot = Math.abs(this.dotProduct(ringNormal, cameraDirection));

    // We want full opacity (1.0) when dot is 0 (ring facing camera)
    // and low opacity when dot approaches 1 (ring edge-on to camera)
    // Using a smooth curve: fade = 1 - dot^2 gives smooth falloff
    // Clamp minimum to 0.1 so rings never fully disappear
    const minFade = 0.15;
    const fade = Math.max(minFade, 1 - dot * dot);

    return fade;
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

    // First, test center hit for all-axis rotation (takes priority if hit)
    const centerHit = this.testCenterHit(rayOrigin, rayDirection, gizmoPosition, scale);
    if (centerHit !== null && centerHit.distance < closestDistance) {
      closestDistance = centerHit.distance;
      closestHit = { axis: 'xyz', distance: centerHit.distance, hitPoint: centerHit.point };
    }

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
   * Test hit for center handle (all-axis rotation).
   * Detects clicks near the center origin of the gizmo.
   */
  private testCenterHit(
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number],
    scale: number
  ): { distance: number; point: [number, number, number] } | null {
    // Calculate closest point on ray to gizmo position
    const diff = this.subtractVectors(gizmoPosition, rayOrigin);
    const t = this.dotProduct(diff, rayDirection);

    if (t < 0) return null;

    const closestPoint: [number, number, number] = [
      rayOrigin[0] + rayDirection[0] * t,
      rayOrigin[1] + rayDirection[1] * t,
      rayOrigin[2] + rayDirection[2] * t,
    ];

    // Check distance from closest point to gizmo center
    const dx = closestPoint[0] - gizmoPosition[0];
    const dy = closestPoint[1] - gizmoPosition[1];
    const dz = closestPoint[2] - gizmoPosition[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const centerRadius = CENTER_HIT_RADIUS * scale;
    if (dist > centerRadius) return null;

    return { distance: t, point: closestPoint };
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

    // Handle all-axis (trackball) rotation
    if (dragState.axis === 'xyz') {
      return this.calculateTrackballRotation(dragState, rayOrigin, rayDirection, gizmoPosition);
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
   * Calculate trackball-style rotation for all-axis mode.
   * Converts screen-space mouse movement to rotation around two axes.
   */
  private calculateTrackballRotation(
    dragState: GizmoDragState,
    rayOrigin: [number, number, number],
    rayDirection: [number, number, number],
    gizmoPosition: [number, number, number]
  ): [number, number, number] {
    // Calculate closest point on ray to gizmo position
    const diff = this.subtractVectors(gizmoPosition, rayOrigin);
    const t = this.dotProduct(diff, rayDirection);

    const currentPoint: [number, number, number] = [
      rayOrigin[0] + rayDirection[0] * t,
      rayOrigin[1] + rayDirection[1] * t,
      rayOrigin[2] + rayDirection[2] * t,
    ];

    // Get vectors from center to start and current
    const startVec = this.subtractVectors(dragState.startIntersection, gizmoPosition);
    const currentVec = this.subtractVectors(currentPoint, gizmoPosition);

    // Calculate delta in view space
    const deltaX = currentVec[0] - startVec[0];
    const deltaY = currentVec[1] - startVec[1];
    const deltaZ = currentVec[2] - startVec[2];

    // Scale sensitivity
    const sensitivity = 2.0;

    // Convert delta to rotation:
    // - Horizontal movement (X) rotates around Z (up axis)
    // - Vertical movement (Z in Z-up coords) rotates around X
    // - Y movement rotates around Y (could also use for forward tilt)
    const rotX = deltaZ * sensitivity * 100; // Convert to degrees
    const rotY = deltaY * sensitivity * 100;
    const rotZ = -deltaX * sensitivity * 100;

    return [rotX, rotY, rotZ];
  }

  /**
   * Add ring geometry with per-segment fading based on camera orientation.
   * Segments facing away from the camera (edge-on) fade out.
   */
  private addRingWithFade(
    vertices: number[],
    colors: number[],
    center: [number, number, number],
    normal: [number, number, number],
    scale: number,
    baseColor: [number, number, number],
    globalFade: number,
    cameraDirection: [number, number, number]
  ): void {
    const outerRadius = RING_RADIUS * scale;
    const innerRadius = outerRadius * (1 - RING_WIDTH_RATIO);

    // Get perpendicular vectors to create the ring plane
    const perp1 = this.getPerpendicularVector(normal);
    const perp2 = this.crossProduct(normal, perp1);

    // Generate ring as solid triangles with per-segment fading
    for (let i = 0; i < RING_SEGMENTS; i++) {
      const angle1 = (i / RING_SEGMENTS) * Math.PI * 2;
      const angle2 = ((i + 1) / RING_SEGMENTS) * Math.PI * 2;

      const cos1 = Math.cos(angle1);
      const sin1 = Math.sin(angle1);
      const cos2 = Math.cos(angle2);
      const sin2 = Math.sin(angle2);

      // Outer ring points
      const outer1: [number, number, number] = [
        center[0] + (perp1[0] * cos1 + perp2[0] * sin1) * outerRadius,
        center[1] + (perp1[1] * cos1 + perp2[1] * sin1) * outerRadius,
        center[2] + (perp1[2] * cos1 + perp2[2] * sin1) * outerRadius,
      ];

      const outer2: [number, number, number] = [
        center[0] + (perp1[0] * cos2 + perp2[0] * sin2) * outerRadius,
        center[1] + (perp1[1] * cos2 + perp2[1] * sin2) * outerRadius,
        center[2] + (perp1[2] * cos2 + perp2[2] * sin2) * outerRadius,
      ];

      // Inner ring points
      const inner1: [number, number, number] = [
        center[0] + (perp1[0] * cos1 + perp2[0] * sin1) * innerRadius,
        center[1] + (perp1[1] * cos1 + perp2[1] * sin1) * innerRadius,
        center[2] + (perp1[2] * cos1 + perp2[2] * sin1) * innerRadius,
      ];

      const inner2: [number, number, number] = [
        center[0] + (perp1[0] * cos2 + perp2[0] * sin2) * innerRadius,
        center[1] + (perp1[1] * cos2 + perp2[1] * sin2) * innerRadius,
        center[2] + (perp1[2] * cos2 + perp2[2] * sin2) * innerRadius,
      ];

      // Calculate segment direction at this point on the ring (tangent to ring center)
      const midAngle = (angle1 + angle2) / 2;
      const segmentDir: [number, number, number] = [
        perp1[0] * Math.cos(midAngle) + perp2[0] * Math.sin(midAngle),
        perp1[1] * Math.cos(midAngle) + perp2[1] * Math.sin(midAngle),
        perp1[2] * Math.cos(midAngle) + perp2[2] * Math.sin(midAngle),
      ];

      // Calculate fade for this segment based on whether it faces the camera
      // Segments where the direction points toward/away from camera should be more visible
      // Segments where direction is perpendicular to camera view are "edge-on"
      const segmentDot = Math.abs(this.dotProduct(segmentDir, cameraDirection));

      // segmentDot = 0 when segment faces camera (visible)
      // segmentDot = 1 when segment is perpendicular to view (edge-on)
      // We want high fade when facing camera, low fade when edge-on
      const segmentFade = Math.max(0.2, 1 - segmentDot * 0.7);

      // Combine global ring fade with segment fade
      const combinedFade = globalFade * segmentFade;

      // Apply fade by dimming the color (multiply by fade factor)
      const fadedColor: [number, number, number] = [
        baseColor[0] * combinedFade,
        baseColor[1] * combinedFade,
        baseColor[2] * combinedFade,
      ];

      // Triangle 1: outer1, inner1, outer2
      vertices.push(...outer1, ...inner1, ...outer2);
      colors.push(
        fadedColor[0], fadedColor[1], fadedColor[2],
        fadedColor[0], fadedColor[1], fadedColor[2],
        fadedColor[0], fadedColor[1], fadedColor[2]
      );

      // Triangle 2: outer2, inner1, inner2
      vertices.push(...outer2, ...inner1, ...inner2);
      colors.push(
        fadedColor[0], fadedColor[1], fadedColor[2],
        fadedColor[0], fadedColor[1], fadedColor[2],
        fadedColor[0], fadedColor[1], fadedColor[2]
      );
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
