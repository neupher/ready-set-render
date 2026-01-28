/**
 * IShaderAsset - Shader asset interface
 *
 * Represents a shader program asset with vertex and fragment sources,
 * uniform declarations, and metadata for the Asset Browser UI.
 *
 * @example
 * ```typescript
 * const pbrShader: IShaderAsset = {
 *   uuid: 'built-in-pbr',
 *   name: 'PBR',
 *   type: 'shader',
 *   version: 1,
 *   created: '2026-01-28T12:00:00Z',
 *   modified: '2026-01-28T12:00:00Z',
 *   isBuiltIn: true,
 *   vertexSource: '...',
 *   fragmentSource: '...',
 *   uniforms: [
 *     { name: 'uBaseColor', type: 'vec3', displayName: 'Base Color', ... }
 *   ]
 * };
 * ```
 */

import type { IAsset } from './IAsset';

/**
 * Supported uniform types in GLSL.
 */
export type UniformType =
  | 'float'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'int'
  | 'bool'
  | 'sampler2D'
  | 'mat3'
  | 'mat4';

/**
 * UI control types for uniform editing.
 */
export type UniformUIType = 'slider' | 'color' | 'number' | 'checkbox' | 'texture';

/**
 * Declaration of a shader uniform with metadata for UI generation.
 */
export interface IUniformDeclaration {
  /**
   * The GLSL uniform name (e.g., 'uBaseColor').
   */
  readonly name: string;

  /**
   * The GLSL type of the uniform.
   */
  readonly type: UniformType;

  /**
   * Human-readable display name for the UI.
   */
  readonly displayName: string;

  /**
   * Default value for this uniform.
   * Type depends on the uniform type:
   * - float/int: number
   * - vec2: [number, number]
   * - vec3/vec4: [number, number, number] or [number, number, number, number]
   * - bool: boolean
   * - sampler2D: null (texture reference)
   * - mat3/mat4: Float32Array (9 or 16 elements)
   */
  readonly defaultValue: unknown;

  /**
   * Minimum value for numeric uniforms.
   */
  readonly min?: number;

  /**
   * Maximum value for numeric uniforms.
   */
  readonly max?: number;

  /**
   * Step size for numeric uniforms.
   */
  readonly step?: number;

  /**
   * UI control type to use for editing.
   * If not specified, inferred from the uniform type.
   */
  readonly uiType?: UniformUIType;

  /**
   * Optional group name for organizing uniforms in the UI.
   * E.g., 'Surface', 'Emission', 'Advanced'
   */
  readonly group?: string;
}

/**
 * Shader asset interface.
 * Represents a complete shader program with sources and uniform metadata.
 */
export interface IShaderAsset extends IAsset {
  /**
   * Asset type discriminator.
   */
  readonly type: 'shader';

  /**
   * Whether this is a built-in (read-only) shader.
   * Built-in shaders cannot be modified or deleted.
   * Users must duplicate them to create editable versions.
   */
  readonly isBuiltIn: boolean;

  /**
   * GLSL vertex shader source code.
   */
  vertexSource: string;

  /**
   * GLSL fragment shader source code.
   */
  fragmentSource: string;

  /**
   * Uniform declarations for this shader.
   * Used for auto-generating material editor UI.
   */
  uniforms: IUniformDeclaration[];

  /**
   * Optional description of the shader's purpose.
   */
  description?: string;
}

/**
 * Type guard to check if an object is a valid shader asset.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid IShaderAsset
 */
export function isShaderAsset(obj: unknown): obj is IShaderAsset {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const asset = obj as Record<string, unknown>;

  return (
    asset.type === 'shader' &&
    typeof asset.uuid === 'string' &&
    typeof asset.name === 'string' &&
    typeof asset.version === 'number' &&
    typeof asset.isBuiltIn === 'boolean' &&
    typeof asset.vertexSource === 'string' &&
    typeof asset.fragmentSource === 'string' &&
    Array.isArray(asset.uniforms)
  );
}

/**
 * Type guard to check if an object is a valid uniform declaration.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid IUniformDeclaration
 */
export function isUniformDeclaration(obj: unknown): obj is IUniformDeclaration {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const uniform = obj as Record<string, unknown>;
  const validTypes: UniformType[] = [
    'float',
    'vec2',
    'vec3',
    'vec4',
    'int',
    'bool',
    'sampler2D',
    'mat3',
    'mat4',
  ];

  return (
    typeof uniform.name === 'string' &&
    typeof uniform.type === 'string' &&
    validTypes.includes(uniform.type as UniformType) &&
    typeof uniform.displayName === 'string' &&
    uniform.defaultValue !== undefined
  );
}
