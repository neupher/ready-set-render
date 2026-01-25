/**
 * Common Shader Modules - Barrel Export
 *
 * Provides reusable GLSL code snippets that can be composed
 * into complete shaders.
 *
 * These import from raw .glsl files which are processed by:
 * - vite-plugin-glsl (development/production): Handles #include directives
 * - glslRawPlugin (tests): Simple raw file loader
 *
 * @module shaders/common
 */

// Import from raw .glsl files as default exports
// (see src/shaders.d.ts for type declarations)
import GLSL_MATH from './math.glsl';
import GLSL_BRDF from './brdf.glsl';
import GLSL_LIGHTING from './lighting.glsl';

// Re-export for use in other modules
export { GLSL_MATH, GLSL_BRDF, GLSL_LIGHTING };

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
