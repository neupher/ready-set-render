/**
 * PBR Shader Module - Barrel Export
 *
 * Exports the PBR (Physically Based Rendering) shader sources
 * following Blender's Principled BSDF conventions.
 *
 * @module shaders/pbr
 */

export { PBR_VERTEX_SHADER } from './pbr.vert.glsl';
export { PBR_FRAGMENT_SHADER } from './pbr.frag.glsl';
export { PBRShaderProgram, PBR_MATERIAL_DEFAULTS } from './PBRShaderProgram';
export type { PBRUniformLocations } from './PBRShaderProgram';
