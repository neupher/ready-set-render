/**
 * Common Shader Modules - Barrel Export
 *
 * Provides reusable GLSL code snippets that can be composed
 * into complete shaders.
 *
 * @module shaders/common
 */

export { GLSL_MATH } from './math.glsl';
export { GLSL_BRDF } from './brdf.glsl';
export { GLSL_LIGHTING } from './lighting.glsl';

/**
 * Compose multiple GLSL code snippets into a single shader source.
 *
 * @param snippets - Array of GLSL code snippets to compose
 * @returns Combined GLSL code string
 *
 * @example
 * ```typescript
 * const fragmentSource = composeShader([
 *   GLSL_MATH,
 *   GLSL_BRDF,
 *   MY_MAIN_CODE
 * ]);
 * ```
 */
export function composeShader(...snippets: string[]): string {
  return snippets.join('\n');
}
