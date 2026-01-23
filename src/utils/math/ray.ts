/**
 * Ray Math Utilities
 *
 * Ray casting and intersection utilities for object picking.
 *
 * @example
 * ```typescript
 * const ray = unprojectScreenToRay(mouseX, mouseY, viewportWidth, viewportHeight, invViewProj);
 * const hit = rayAABBIntersection(ray, bounds);
 * ```
 */

/**
 * A ray in 3D space defined by origin and direction.
 */
export interface Ray {
  /** Ray origin point */
  origin: [number, number, number];
  /** Normalized ray direction */
  direction: [number, number, number];
}

/**
 * Axis-Aligned Bounding Box.
 */
export interface AABB {
  /** Minimum corner */
  min: [number, number, number];
  /** Maximum corner */
  max: [number, number, number];
}

/**
 * Result of a ray intersection test.
 */
export interface RayHit {
  /** Whether the ray hit something */
  hit: boolean;
  /** Distance from ray origin to hit point (if hit) */
  distance: number;
  /** Hit point in world space (if hit) */
  point: [number, number, number] | null;
}

/**
 * Unproject a screen point to a world-space ray.
 *
 * @param screenX - Screen X coordinate (0 = left)
 * @param screenY - Screen Y coordinate (0 = top)
 * @param viewportWidth - Viewport width in pixels
 * @param viewportHeight - Viewport height in pixels
 * @param invViewProjection - Inverse of the view-projection matrix
 * @returns A ray from the camera through the screen point
 */
export function unprojectScreenToRay(
  screenX: number,
  screenY: number,
  viewportWidth: number,
  viewportHeight: number,
  invViewProjection: Float32Array
): Ray {
  // Convert screen coords to NDC (-1 to 1)
  const ndcX = (screenX / viewportWidth) * 2 - 1;
  const ndcY = 1 - (screenY / viewportHeight) * 2; // Flip Y

  // Near point (z = -1 in NDC)
  const nearPoint = unprojectPoint(ndcX, ndcY, -1, invViewProjection);

  // Far point (z = 1 in NDC)
  const farPoint = unprojectPoint(ndcX, ndcY, 1, invViewProjection);

  // Ray direction
  const direction = normalize([
    farPoint[0] - nearPoint[0],
    farPoint[1] - nearPoint[1],
    farPoint[2] - nearPoint[2],
  ]);

  return {
    origin: nearPoint,
    direction,
  };
}

/**
 * Unproject a point from NDC to world space.
 */
function unprojectPoint(
  ndcX: number,
  ndcY: number,
  ndcZ: number,
  invViewProjection: Float32Array
): [number, number, number] {
  // Transform NDC point by inverse view-projection matrix
  const x = ndcX * invViewProjection[0] + ndcY * invViewProjection[4] + ndcZ * invViewProjection[8] + invViewProjection[12];
  const y = ndcX * invViewProjection[1] + ndcY * invViewProjection[5] + ndcZ * invViewProjection[9] + invViewProjection[13];
  const z = ndcX * invViewProjection[2] + ndcY * invViewProjection[6] + ndcZ * invViewProjection[10] + invViewProjection[14];
  const w = ndcX * invViewProjection[3] + ndcY * invViewProjection[7] + ndcZ * invViewProjection[11] + invViewProjection[15];

  // Perspective divide
  const invW = 1 / w;
  return [x * invW, y * invW, z * invW];
}

/**
 * Test ray intersection with an Axis-Aligned Bounding Box.
 * Uses the slab method for efficient AABB testing.
 *
 * @param ray - The ray to test
 * @param aabb - The bounding box to test against
 * @returns Intersection result
 */
export function rayAABBIntersection(ray: Ray, aabb: AABB): RayHit {
  const { origin, direction } = ray;
  const { min, max } = aabb;

  let tmin = -Infinity;
  let tmax = Infinity;

  // Check each axis
  for (let i = 0; i < 3; i++) {
    if (Math.abs(direction[i]) < 1e-8) {
      // Ray is parallel to this slab
      if (origin[i] < min[i] || origin[i] > max[i]) {
        return { hit: false, distance: Infinity, point: null };
      }
    } else {
      const invD = 1 / direction[i];
      let t1 = (min[i] - origin[i]) * invD;
      let t2 = (max[i] - origin[i]) * invD;

      if (t1 > t2) {
        const temp = t1;
        t1 = t2;
        t2 = temp;
      }

      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);

      if (tmin > tmax) {
        return { hit: false, distance: Infinity, point: null };
      }
    }
  }

  // If tmin is negative, ray started inside the box
  const distance = tmin >= 0 ? tmin : tmax;

  if (distance < 0) {
    return { hit: false, distance: Infinity, point: null };
  }

  const point: [number, number, number] = [
    origin[0] + direction[0] * distance,
    origin[1] + direction[1] * distance,
    origin[2] + direction[2] * distance,
  ];

  return { hit: true, distance, point };
}

/**
 * Create an AABB from a position and half-extents.
 *
 * @param center - Center position
 * @param halfExtents - Half-extents in each axis
 * @returns AABB
 */
export function createAABB(
  center: [number, number, number],
  halfExtents: [number, number, number]
): AABB {
  return {
    min: [
      center[0] - halfExtents[0],
      center[1] - halfExtents[1],
      center[2] - halfExtents[2],
    ],
    max: [
      center[0] + halfExtents[0],
      center[1] + halfExtents[1],
      center[2] + halfExtents[2],
    ],
  };
}

/**
 * Create an AABB from position and scale (for unit primitives).
 *
 * @param position - Object position
 * @param scale - Object scale
 * @returns AABB for a unit cube at that position/scale
 */
export function createAABBFromTransform(
  position: [number, number, number],
  scale: [number, number, number]
): AABB {
  // For a unit cube (-0.5 to 0.5), scaled and positioned
  const halfExtents: [number, number, number] = [
    scale[0] * 0.5,
    scale[1] * 0.5,
    scale[2] * 0.5,
  ];
  return createAABB(position, halfExtents);
}

/**
 * Normalize a vector.
 */
function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Invert a 4x4 matrix.
 * Used for computing inverse view-projection matrix.
 *
 * @param m - The matrix to invert
 * @returns Inverted matrix or null if not invertible
 */
export function mat4Inverse(m: Float32Array): Float32Array | null {
  const inv = new Float32Array(16);

  inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] +
           m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];

  inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] -
           m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];

  inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] +
           m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];

  inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] -
            m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];

  inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] -
           m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];

  inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] +
           m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];

  inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] -
           m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];

  inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] +
            m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];

  inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] +
           m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];

  inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] -
           m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];

  inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] +
            m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];

  inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] -
            m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];

  inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] -
           m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];

  inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] +
           m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];

  inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] -
            m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];

  inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] +
            m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

  let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];

  if (Math.abs(det) < 1e-8) {
    return null;
  }

  det = 1.0 / det;

  const result = new Float32Array(16);
  for (let i = 0; i < 16; i++) {
    result[i] = inv[i] * det;
  }

  return result;
}
