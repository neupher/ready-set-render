/**
 * MaterialAssetFactory - Factory for creating material assets
 *
 * Provides methods for creating new material assets, duplicating existing ones,
 * and serializing/deserializing material data.
 *
 * @example
 * ```typescript
 * const factory = new MaterialAssetFactory();
 *
 * // Create a new material with PBR shader defaults
 * const material = factory.create({
 *   name: 'My Material',
 *   shaderRef: { uuid: BUILT_IN_SHADER_IDS.PBR, type: 'shader' }
 * }, pbrShader);
 *
 * // Duplicate an existing material
 * const copy = factory.duplicate(existingMaterial, 'My Material Copy');
 * ```
 */

import type { IMaterialAsset } from './interfaces/IMaterialAsset';
import type { IAssetReference } from './interfaces/IAssetReference';
import type { IShaderAsset, IUniformDeclaration } from './interfaces/IShaderAsset';
import { generateUUID } from '../../utils/uuid';

/**
 * Options for creating a new material asset.
 */
export interface IMaterialCreateOptions {
  /**
   * Name for the new material.
   */
  name: string;

  /**
   * Optional custom UUID. If not provided, one will be generated.
   */
  uuid?: string;

  /**
   * Reference to the shader asset to use.
   */
  shaderRef: IAssetReference;

  /**
   * Optional parameter overrides. If not provided, shader defaults will be used.
   */
  parameters?: Record<string, unknown>;

  /**
   * Optional description.
   */
  description?: string;
}

/**
 * Current schema version for material assets.
 */
export const MATERIAL_ASSET_VERSION = 1;

/**
 * Factory for creating and duplicating material assets.
 */
export class MaterialAssetFactory {
  /**
   * Create a new material asset.
   *
   * If a shader is provided, the material will be initialized with the shader's
   * default uniform values. Any values in options.parameters will override defaults.
   *
   * @param options - Creation options
   * @param shader - Optional shader asset to get default parameter values from
   * @returns A new material asset
   */
  create(options: IMaterialCreateOptions, shader?: IShaderAsset): IMaterialAsset {
    const now = new Date().toISOString();

    // Build default parameters from shader uniforms if shader is provided
    const defaultParameters = shader ? this.getDefaultParameters(shader.uniforms) : {};

    // Merge with any provided overrides
    const parameters = {
      ...defaultParameters,
      ...(options.parameters ?? {}),
    };

    return {
      uuid: options.uuid ?? generateUUID(),
      name: options.name,
      type: 'material',
      version: MATERIAL_ASSET_VERSION,
      created: now,
      modified: now,
      isBuiltIn: false,
      shaderRef: { ...options.shaderRef },
      parameters,
      description: options.description,
    };
  }

  /**
   * Duplicate an existing material asset with a new UUID and name.
   * The duplicate is always marked as non-built-in (editable).
   *
   * @param source - The material to duplicate
   * @param newName - Name for the duplicate
   * @param newUuid - Optional custom UUID for the duplicate
   * @returns A new material asset that is a copy of the source
   */
  duplicate(source: IMaterialAsset, newName: string, newUuid?: string): IMaterialAsset {
    const now = new Date().toISOString();

    return {
      uuid: newUuid ?? generateUUID(),
      name: newName,
      type: 'material',
      version: MATERIAL_ASSET_VERSION,
      created: now,
      modified: now,
      isBuiltIn: false,
      shaderRef: { ...source.shaderRef },
      parameters: this.deepCopyParameters(source.parameters),
      description: source.description
        ? `Copy of ${source.name}: ${source.description}`
        : `Copy of ${source.name}`,
    };
  }

  /**
   * Create a material asset from raw JSON data.
   * Used when loading from storage.
   *
   * @param data - Raw JSON data
   * @returns A material asset
   * @throws Error if the data is invalid
   */
  fromJSON(data: unknown): IMaterialAsset {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid material data: expected object');
    }

    const obj = data as Record<string, unknown>;

    // Validate required fields
    if (typeof obj.uuid !== 'string') {
      throw new Error('Invalid material data: missing or invalid uuid');
    }
    if (typeof obj.name !== 'string') {
      throw new Error('Invalid material data: missing or invalid name');
    }
    if (obj.type !== 'material') {
      throw new Error('Invalid material data: type must be "material"');
    }

    // Validate shaderRef
    const shaderRef = obj.shaderRef as Record<string, unknown> | null | undefined;
    if (typeof shaderRef !== 'object' || shaderRef === null) {
      throw new Error('Invalid material data: missing or invalid shaderRef');
    }
    if (typeof shaderRef.uuid !== 'string') {
      throw new Error('Invalid material data: shaderRef.uuid must be a string');
    }
    if (shaderRef.type !== 'shader') {
      throw new Error('Invalid material data: shaderRef.type must be "shader"');
    }

    // Validate parameters
    if (typeof obj.parameters !== 'object' || obj.parameters === null) {
      throw new Error('Invalid material data: missing or invalid parameters');
    }

    return {
      uuid: obj.uuid,
      name: obj.name,
      type: 'material',
      version: typeof obj.version === 'number' ? obj.version : MATERIAL_ASSET_VERSION,
      created: typeof obj.created === 'string' ? obj.created : new Date().toISOString(),
      modified: typeof obj.modified === 'string' ? obj.modified : new Date().toISOString(),
      isBuiltIn: typeof obj.isBuiltIn === 'boolean' ? obj.isBuiltIn : false,
      shaderRef: {
        uuid: shaderRef.uuid,
        type: 'shader',
      },
      parameters: obj.parameters as Record<string, unknown>,
      description: typeof obj.description === 'string' ? obj.description : undefined,
    };
  }

  /**
   * Convert a material asset to JSON for storage.
   *
   * @param material - The material asset to convert
   * @returns JSON-serializable object
   */
  toJSON(material: IMaterialAsset): Record<string, unknown> {
    return {
      uuid: material.uuid,
      name: material.name,
      type: material.type,
      version: material.version,
      created: material.created,
      modified: material.modified,
      isBuiltIn: material.isBuiltIn,
      shaderRef: {
        uuid: material.shaderRef.uuid,
        type: material.shaderRef.type,
      },
      parameters: material.parameters,
      description: material.description,
    };
  }

  /**
   * Get default parameter values from shader uniform declarations.
   *
   * @param uniforms - Array of uniform declarations
   * @returns Record of parameter name to default value
   */
  getDefaultParameters(uniforms: IUniformDeclaration[]): Record<string, unknown> {
    const parameters: Record<string, unknown> = {};

    for (const uniform of uniforms) {
      parameters[uniform.name] = this.deepCopyValue(uniform.defaultValue);
    }

    return parameters;
  }

  /**
   * Update material parameters from shader defaults.
   * Adds missing parameters without overwriting existing ones.
   *
   * @param material - The material to update
   * @param shader - The shader with uniform declarations
   * @returns Updated parameters record
   */
  syncParametersWithShader(
    material: IMaterialAsset,
    shader: IShaderAsset
  ): Record<string, unknown> {
    const defaultParams = this.getDefaultParameters(shader.uniforms);
    const updatedParams: Record<string, unknown> = {};

    // Add defaults for any missing parameters
    for (const [name, defaultValue] of Object.entries(defaultParams)) {
      if (name in material.parameters) {
        updatedParams[name] = material.parameters[name];
      } else {
        updatedParams[name] = defaultValue;
      }
    }

    return updatedParams;
  }

  /**
   * Deep copy parameter values to prevent mutation.
   */
  private deepCopyParameters(parameters: Record<string, unknown>): Record<string, unknown> {
    const copy: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(parameters)) {
      copy[key] = this.deepCopyValue(value);
    }

    return copy;
  }

  /**
   * Deep copy a value (handles arrays and primitives).
   */
  private deepCopyValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return [...value];
    }
    if (value instanceof Float32Array) {
      return new Float32Array(value);
    }
    if (typeof value === 'object' && value !== null) {
      return { ...value };
    }
    return value;
  }
}
