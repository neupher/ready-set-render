/**
 * Shaders Module - Barrel Export
 *
 * Central export point for all shader sources and utilities.
 *
 * @module shaders
 */

// Common shader utilities and GLSL snippets
export * from './common';

// Lambert shader (Lambertian diffuse with hemisphere ambient)
export * from './lambert';

// PBR shader (Blender Principled BSDF style)
export * from './pbr';

// Unlit shader (solid color, no lighting)
export * from './unlit';
