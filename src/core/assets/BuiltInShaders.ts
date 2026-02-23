/**
 * BuiltInShaders - Pre-defined shader assets
 *
 * Contains the built-in Lambert, PBR, and Unlit shader definitions as IShaderAsset objects.
 * Shader sources are loaded from external .glsl files.
 *
 * These are registered as read-only assets that can be duplicated to create
 * editable custom shaders.
 *
 * @example
 * ```typescript
 * import { BUILT_IN_SHADERS } from './BuiltInShaders';
 *
 * // Register all built-in shaders
 * BUILT_IN_SHADERS.forEach(shader => registry.register(shader));
 * ```
 */

import type { IShaderAsset, IUniformDeclaration } from './interfaces/IShaderAsset';

// Import shader sources from .glsl files
import { lambertVertexSource, lambertFragmentSource } from '@plugins/renderers/shaders/lambert';
import { unlitVertexSource, unlitFragmentSource } from '@plugins/renderers/shaders/unlit';
import pbrVertexSource from '@plugins/renderers/shaders/pbr/pbr.vert.glsl';
import pbrFragmentSource from '@plugins/renderers/shaders/pbr/pbr.frag.glsl';

/**
 * Built-in shader UUIDs.
 * These are constant and never change.
 */
export const BUILT_IN_SHADER_IDS = {
  LAMBERT: 'built-in-shader-lambert',
  PBR: 'built-in-shader-pbr',
  UNLIT: 'built-in-shader-unlit',
} as const;

//=============================================================================
// LAMBERT SHADER
//=============================================================================

/**
 * Lambert shader uniform declarations.
 */
const LAMBERT_UNIFORMS: IUniformDeclaration[] = [
  {
    name: 'uBaseColor',
    type: 'vec3',
    displayName: 'Base Color',
    defaultValue: [0.8, 0.8, 0.8],
    uiType: 'color',
    group: 'Surface',
  },
];

/**
 * Built-in Lambert shader asset.
 *
 * Lambertian diffuse lighting with hemisphere ambient.
 * The default shader for new primitives.
 */
export const BUILT_IN_LAMBERT_SHADER: IShaderAsset = {
  uuid: BUILT_IN_SHADER_IDS.LAMBERT,
  name: 'Lambert',
  type: 'shader',
  version: 1,
  created: '2026-01-01T00:00:00Z',
  modified: '2026-01-01T00:00:00Z',
  isBuiltIn: true,
  vertexSource: lambertVertexSource,
  fragmentSource: lambertFragmentSource,
  uniforms: LAMBERT_UNIFORMS,
  description:
    'Lambertian diffuse shader with hemisphere ambient and rim lighting. ' +
    'Supports multi-light setup with up to 8 directional lights.',
};

//=============================================================================
// PBR SHADER
//=============================================================================

/**
 * PBR shader uniform declarations.
 */
const PBR_UNIFORMS: IUniformDeclaration[] = [
  {
    name: 'uBaseColor',
    type: 'vec3',
    displayName: 'Base Color',
    defaultValue: [0.8, 0.8, 0.8],
    uiType: 'color',
    group: 'Surface',
  },
  {
    name: 'uMetallic',
    type: 'float',
    displayName: 'Metallic',
    defaultValue: 0.0,
    min: 0.0,
    max: 1.0,
    step: 0.01,
    uiType: 'slider',
    group: 'Surface',
  },
  {
    name: 'uRoughness',
    type: 'float',
    displayName: 'Roughness',
    defaultValue: 0.5,
    min: 0.0,
    max: 1.0,
    step: 0.01,
    uiType: 'slider',
    group: 'Surface',
  },
  {
    name: 'uEmission',
    type: 'vec3',
    displayName: 'Emission',
    defaultValue: [0.0, 0.0, 0.0],
    uiType: 'color',
    group: 'Emission',
  },
  {
    name: 'uEmissionStrength',
    type: 'float',
    displayName: 'Emission Strength',
    defaultValue: 0.0,
    min: 0.0,
    max: 10.0,
    step: 0.1,
    uiType: 'slider',
    group: 'Emission',
  },
];

/**
 * Built-in PBR shader asset.
 *
 * Cook-Torrance BRDF with metallic/roughness workflow.
 * Follows Blender's Principled BSDF conventions.
 */
export const BUILT_IN_PBR_SHADER: IShaderAsset = {
  uuid: BUILT_IN_SHADER_IDS.PBR,
  name: 'PBR',
  type: 'shader',
  version: 1,
  created: '2026-01-01T00:00:00Z',
  modified: '2026-01-01T00:00:00Z',
  isBuiltIn: true,
  vertexSource: pbrVertexSource,
  fragmentSource: pbrFragmentSource,
  uniforms: PBR_UNIFORMS,
  description:
    'Physically-based rendering shader using Cook-Torrance BRDF. ' +
    'Supports metallic/roughness workflow with multi-light support.',
};

//=============================================================================
// UNLIT SHADER
//=============================================================================

/**
 * Unlit shader uniform declarations.
 */
const UNLIT_UNIFORMS: IUniformDeclaration[] = [
  {
    name: 'uColor',
    type: 'vec3',
    displayName: 'Color',
    defaultValue: [0.8, 0.8, 0.8],
    uiType: 'color',
    group: 'Surface',
  },
  {
    name: 'uOpacity',
    type: 'float',
    displayName: 'Opacity',
    defaultValue: 1.0,
    min: 0.0,
    max: 1.0,
    step: 0.01,
    uiType: 'slider',
    group: 'Surface',
  },
];

/**
 * Built-in Unlit shader asset.
 *
 * Simple solid color shader without lighting calculations.
 * Useful for debug visualization or UI elements.
 */
export const BUILT_IN_UNLIT_SHADER: IShaderAsset = {
  uuid: BUILT_IN_SHADER_IDS.UNLIT,
  name: 'Unlit',
  type: 'shader',
  version: 1,
  created: '2026-01-01T00:00:00Z',
  modified: '2026-01-01T00:00:00Z',
  isBuiltIn: true,
  vertexSource: unlitVertexSource,
  fragmentSource: unlitFragmentSource,
  uniforms: UNLIT_UNIFORMS,
  description: 'Simple unlit shader that outputs a solid color without lighting calculations.',
};

//=============================================================================
// EXPORTS
//=============================================================================

/**
 * All built-in shaders for easy registration.
 * Order: Lambert (default), PBR, Unlit
 */
export const BUILT_IN_SHADERS: IShaderAsset[] = [
  BUILT_IN_LAMBERT_SHADER,
  BUILT_IN_PBR_SHADER,
  BUILT_IN_UNLIT_SHADER,
];

/**
 * Check if a shader UUID is a built-in shader.
 *
 * @param uuid - The UUID to check
 * @returns True if the UUID is a built-in shader
 */
export function isBuiltInShaderUUID(uuid: string): boolean {
  return Object.values(BUILT_IN_SHADER_IDS).includes(
    uuid as (typeof BUILT_IN_SHADER_IDS)[keyof typeof BUILT_IN_SHADER_IDS]
  );
}
