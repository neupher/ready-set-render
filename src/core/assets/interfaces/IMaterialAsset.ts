/**
 * IMaterialAsset - Material asset interface
 *
 * Represents a material asset that references a shader and stores
 * parameter values for the shader's uniforms.
 *
 * Materials are standalone assets that can be assigned to entities.
 * They store the shader reference and uniform values, enabling
 * material reuse across multiple entities.
 *
 * @example
 * ```typescript
 * const myMaterial: IMaterialAsset = {
 *   uuid: 'a1b2c3d4-...',
 *   name: 'Gold Metal',
 *   type: 'material',
 *   version: 1,
 *   created: '2026-01-28T12:00:00Z',
 *   modified: '2026-01-28T12:00:00Z',
 *   isBuiltIn: false,
 *   shaderRef: { uuid: 'built-in-shader-pbr', type: 'shader' },
 *   parameters: {
 *     uBaseColor: [1.0, 0.843, 0.0],
 *     uMetallic: 1.0,
 *     uRoughness: 0.3
 *   }
 * };
 * ```
 */

import type { IAsset } from './IAsset';
import type { IAssetReference } from './IAssetReference';

/**
 * Material asset interface.
 * Represents a material with shader reference and parameter values.
 */
export interface IMaterialAsset extends IAsset {
  /**
   * Asset type discriminator.
   */
  readonly type: 'material';

  /**
   * Whether this is a built-in (read-only) material.
   * Built-in materials cannot be modified or deleted.
   * Users must duplicate them to create editable versions.
   */
  readonly isBuiltIn: boolean;

  /**
   * Reference to the shader asset used by this material.
   * The shader defines available uniforms and their types.
   */
  shaderRef: IAssetReference;

  /**
   * Parameter values keyed by uniform name.
   *
   * Keys must match uniform names from the referenced shader's
   * IUniformDeclaration array. Values must match the uniform type:
   * - float/int: number
   * - vec2: [number, number]
   * - vec3: [number, number, number]
   * - vec4: [number, number, number, number]
   * - bool: boolean
   * - sampler2D: string (texture asset UUID) or null
   * - mat3/mat4: number[] (9 or 16 elements)
   */
  parameters: Record<string, unknown>;

  /**
   * Optional description of the material's purpose or appearance.
   */
  description?: string;
}

/**
 * Type guard to check if an object is a valid material asset.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid IMaterialAsset
 */
export function isMaterialAsset(obj: unknown): obj is IMaterialAsset {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const asset = obj as Record<string, unknown>;

  // Check required fields
  if (
    asset.type !== 'material' ||
    typeof asset.uuid !== 'string' ||
    typeof asset.name !== 'string' ||
    typeof asset.version !== 'number' ||
    typeof asset.isBuiltIn !== 'boolean'
  ) {
    return false;
  }

  // Check shaderRef
  const shaderRef = asset.shaderRef as Record<string, unknown> | null | undefined;
  if (
    typeof shaderRef !== 'object' ||
    shaderRef === null ||
    typeof shaderRef.uuid !== 'string' ||
    shaderRef.type !== 'shader'
  ) {
    return false;
  }

  // Check parameters
  if (typeof asset.parameters !== 'object' || asset.parameters === null) {
    return false;
  }

  return true;
}
