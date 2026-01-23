/**
 * Math Utilities
 *
 * Re-exports all math utility functions.
 */

export * from './transforms';

// Re-export ray utilities (excluding mat4Inverse which is already in transforms)
export {
  unprojectScreenToRay,
  rayAABBIntersection,
  createAABB,
  createAABBFromTransform,
} from './ray';
export type { Ray, AABB, RayHit } from './ray';

// For backward compatibility, also re-export mat4Inverse from ray for code that uses nullable return
export { mat4Inverse as mat4InverseNullable } from './ray';
