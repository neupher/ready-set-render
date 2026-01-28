/**
 * ShaderAssetFactory - Factory for creating shader assets
 *
 * Provides methods for creating new shader assets, duplicating existing ones,
 * and validating shader data.
 *
 * @example
 * ```typescript
 * const factory = new ShaderAssetFactory();
 *
 * // Create a new blank shader
 * const shader = factory.create({ name: 'My Shader' });
 *
 * // Duplicate an existing shader
 * const copy = factory.duplicate(existingShader, 'My Shader Copy');
 * ```
 */

import type { IShaderAsset, IUniformDeclaration } from './interfaces/IShaderAsset';
import { generateUUID } from '../../utils/uuid';

/**
 * Options for creating a new shader asset.
 */
export interface IShaderCreateOptions {
  /**
   * Name for the new shader.
   */
  name: string;

  /**
   * Optional custom UUID. If not provided, one will be generated.
   */
  uuid?: string;

  /**
   * Optional vertex shader source. Defaults to basic unlit vertex shader.
   */
  vertexSource?: string;

  /**
   * Optional fragment shader source. Defaults to basic unlit fragment shader.
   */
  fragmentSource?: string;

  /**
   * Optional uniform declarations. Defaults to basic unlit uniforms.
   */
  uniforms?: IUniformDeclaration[];

  /**
   * Optional description.
   */
  description?: string;
}

/**
 * Default unlit vertex shader source.
 * Simple pass-through shader for getting started.
 */
export const DEFAULT_UNLIT_VERTEX_SHADER = `#version 300 es
/**
 * Unlit Vertex Shader
 * Simple transform without lighting calculations.
 */
precision highp float;

// Vertex attributes
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;

// Transform uniforms
uniform mat4 uModelMatrix;
uniform mat4 uViewProjectionMatrix;

// Output to fragment shader
out vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  gl_Position = uViewProjectionMatrix * uModelMatrix * vec4(aPosition, 1.0);
}
`;

/**
 * Default unlit fragment shader source.
 * Simple solid color output for getting started.
 */
export const DEFAULT_UNLIT_FRAGMENT_SHADER = `#version 300 es
/**
 * Unlit Fragment Shader
 * Simple solid color output without lighting.
 */
precision highp float;

// Material uniforms
uniform vec3 uColor;
uniform float uOpacity;

// Input from vertex shader
in vec2 vTexCoord;

// Output
out vec4 outColor;

void main() {
  outColor = vec4(uColor, uOpacity);
}
`;

/**
 * Default uniforms for the unlit shader template.
 */
export const DEFAULT_UNLIT_UNIFORMS: IUniformDeclaration[] = [
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
 * Current schema version for shader assets.
 */
export const SHADER_ASSET_VERSION = 1;

/**
 * Factory for creating and duplicating shader assets.
 */
export class ShaderAssetFactory {
  /**
   * Create a new shader asset with the unlit template.
   *
   * @param options - Creation options
   * @returns A new shader asset
   */
  create(options: IShaderCreateOptions): IShaderAsset {
    const now = new Date().toISOString();

    return {
      uuid: options.uuid ?? generateUUID(),
      name: options.name,
      type: 'shader',
      version: SHADER_ASSET_VERSION,
      created: now,
      modified: now,
      isBuiltIn: false,
      vertexSource: options.vertexSource ?? DEFAULT_UNLIT_VERTEX_SHADER,
      fragmentSource: options.fragmentSource ?? DEFAULT_UNLIT_FRAGMENT_SHADER,
      uniforms: options.uniforms ?? [...DEFAULT_UNLIT_UNIFORMS],
      description: options.description,
    };
  }

  /**
   * Duplicate an existing shader asset with a new UUID and name.
   * The duplicate is always marked as non-built-in (editable).
   *
   * @param source - The shader to duplicate
   * @param newName - Name for the duplicate
   * @param newUuid - Optional custom UUID for the duplicate
   * @returns A new shader asset that is a copy of the source
   */
  duplicate(source: IShaderAsset, newName: string, newUuid?: string): IShaderAsset {
    const now = new Date().toISOString();

    return {
      uuid: newUuid ?? generateUUID(),
      name: newName,
      type: 'shader',
      version: SHADER_ASSET_VERSION,
      created: now,
      modified: now,
      isBuiltIn: false, // Duplicates are always editable
      vertexSource: source.vertexSource,
      fragmentSource: source.fragmentSource,
      uniforms: this.deepCopyUniforms(source.uniforms),
      description: source.description
        ? `Copy of ${source.name}: ${source.description}`
        : `Copy of ${source.name}`,
    };
  }

  /**
   * Create a shader asset from raw JSON data.
   * Used when loading from storage.
   *
   * @param data - Raw JSON data
   * @returns A shader asset
   * @throws Error if the data is invalid
   */
  fromJSON(data: unknown): IShaderAsset {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid shader data: expected object');
    }

    const obj = data as Record<string, unknown>;

    // Validate required fields
    if (typeof obj.uuid !== 'string') {
      throw new Error('Invalid shader data: missing or invalid uuid');
    }
    if (typeof obj.name !== 'string') {
      throw new Error('Invalid shader data: missing or invalid name');
    }
    if (obj.type !== 'shader') {
      throw new Error('Invalid shader data: type must be "shader"');
    }
    if (typeof obj.vertexSource !== 'string') {
      throw new Error('Invalid shader data: missing or invalid vertexSource');
    }
    if (typeof obj.fragmentSource !== 'string') {
      throw new Error('Invalid shader data: missing or invalid fragmentSource');
    }
    if (!Array.isArray(obj.uniforms)) {
      throw new Error('Invalid shader data: missing or invalid uniforms array');
    }

    return {
      uuid: obj.uuid,
      name: obj.name,
      type: 'shader',
      version: typeof obj.version === 'number' ? obj.version : SHADER_ASSET_VERSION,
      created: typeof obj.created === 'string' ? obj.created : new Date().toISOString(),
      modified: typeof obj.modified === 'string' ? obj.modified : new Date().toISOString(),
      isBuiltIn: typeof obj.isBuiltIn === 'boolean' ? obj.isBuiltIn : false,
      vertexSource: obj.vertexSource,
      fragmentSource: obj.fragmentSource,
      uniforms: obj.uniforms as IUniformDeclaration[],
      description: typeof obj.description === 'string' ? obj.description : undefined,
    };
  }

  /**
   * Convert a shader asset to JSON for storage.
   *
   * @param shader - The shader asset to convert
   * @returns JSON-serializable object
   */
  toJSON(shader: IShaderAsset): Record<string, unknown> {
    return {
      uuid: shader.uuid,
      name: shader.name,
      type: shader.type,
      version: shader.version,
      created: shader.created,
      modified: shader.modified,
      isBuiltIn: shader.isBuiltIn,
      vertexSource: shader.vertexSource,
      fragmentSource: shader.fragmentSource,
      uniforms: shader.uniforms,
      description: shader.description,
    };
  }

  /**
   * Deep copy uniform declarations to prevent mutation.
   */
  private deepCopyUniforms(uniforms: IUniformDeclaration[]): IUniformDeclaration[] {
    return uniforms.map((u) => ({
      name: u.name,
      type: u.type,
      displayName: u.displayName,
      defaultValue: this.deepCopyValue(u.defaultValue),
      min: u.min,
      max: u.max,
      step: u.step,
      uiType: u.uiType,
      group: u.group,
    }));
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
    return value;
  }
}
