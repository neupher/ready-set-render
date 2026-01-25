/**
 * PBRShaderProgram - Manages the PBR shader program and uniforms
 *
 * Encapsulates the WebGL program creation, uniform location caching,
 * and uniform setting for PBR materials.
 *
 * @module shaders/pbr
 */

import PBR_VERTEX_SHADER from './pbr.vert.glsl';
import PBR_FRAGMENT_SHADER from './pbr.frag.glsl';
import type { IMaterialComponent } from '@core/interfaces';

/**
 * Uniform locations for the PBR shader
 */
export interface PBRUniformLocations {
  // Transform uniforms
  uModelMatrix: WebGLUniformLocation | null;
  uViewProjectionMatrix: WebGLUniformLocation | null;
  uNormalMatrix: WebGLUniformLocation | null;

  // Material uniforms
  uBaseColor: WebGLUniformLocation | null;
  uMetallic: WebGLUniformLocation | null;
  uRoughness: WebGLUniformLocation | null;
  uEmission: WebGLUniformLocation | null;
  uEmissionStrength: WebGLUniformLocation | null;

  // Lighting uniforms
  uLightDirections: WebGLUniformLocation | null;
  uLightColors: WebGLUniformLocation | null;
  uLightCount: WebGLUniformLocation | null;
  uAmbientColor: WebGLUniformLocation | null;
  uCameraPosition: WebGLUniformLocation | null;
}

/**
 * Default PBR material values (Blender Principled BSDF defaults)
 */
export const PBR_MATERIAL_DEFAULTS = {
  baseColor: [0.8, 0.8, 0.8] as [number, number, number],
  metallic: 0.0,
  roughness: 0.5,
  emission: [0.0, 0.0, 0.0] as [number, number, number],
  emissionStrength: 0.0,
};

/**
 * PBR Shader Program
 *
 * Manages the WebGL2 program for PBR rendering with Cook-Torrance BRDF.
 *
 * @example
 * ```typescript
 * const pbrProgram = new PBRShaderProgram(gl);
 * pbrProgram.compile();
 *
 * // In render loop
 * pbrProgram.use();
 * pbrProgram.setMaterialUniforms(material);
 * ```
 */
export class PBRShaderProgram {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private uniforms: PBRUniformLocations | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Compile and link the PBR shader program
   *
   * @throws Error if shader compilation or linking fails
   */
  compile(): void {
    const gl = this.gl;

    const vertShader = this.compileShader(PBR_VERTEX_SHADER, gl.VERTEX_SHADER);
    const fragShader = this.compileShader(PBR_FRAGMENT_SHADER, gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create PBR WebGL program');
    }

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    // Shaders can be deleted after linking
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`PBR program link error: ${log}`);
    }

    this.program = program;
    this.cacheUniformLocations();
  }

  /**
   * Get the WebGL program
   */
  getProgram(): WebGLProgram | null {
    return this.program;
  }

  /**
   * Get cached uniform locations
   */
  getUniformLocations(): PBRUniformLocations | null {
    return this.uniforms;
  }

  /**
   * Bind this shader program for use
   */
  use(): void {
    if (this.program) {
      this.gl.useProgram(this.program);
    }
  }

  /**
   * Set material uniforms from an IMaterialComponent
   *
   * @param material - Material component with PBR properties
   */
  setMaterialUniforms(material: IMaterialComponent | null): void {
    if (!this.uniforms) return;
    const gl = this.gl;

    // Base color (albedo)
    const baseColor = material?.color ?? PBR_MATERIAL_DEFAULTS.baseColor;
    gl.uniform3fv(this.uniforms.uBaseColor, baseColor);

    // Metallic
    const metallic = material?.metallic ?? PBR_MATERIAL_DEFAULTS.metallic;
    gl.uniform1f(this.uniforms.uMetallic, metallic);

    // Roughness
    const roughness = material?.roughness ?? PBR_MATERIAL_DEFAULTS.roughness;
    gl.uniform1f(this.uniforms.uRoughness, roughness);

    // Emission
    const emission = material?.emission ?? PBR_MATERIAL_DEFAULTS.emission;
    gl.uniform3fv(this.uniforms.uEmission, emission);

    // Emission strength
    const emissionStrength =
      material?.emissionStrength ?? PBR_MATERIAL_DEFAULTS.emissionStrength;
    gl.uniform1f(this.uniforms.uEmissionStrength, emissionStrength);
  }

  /**
   * Set transform uniforms
   *
   * @param modelMatrix - 4x4 model matrix
   * @param viewProjectionMatrix - 4x4 view-projection matrix
   * @param normalMatrix - 3x3 normal matrix
   */
  setTransformUniforms(
    modelMatrix: Float32Array,
    viewProjectionMatrix: Float32Array,
    normalMatrix: Float32Array
  ): void {
    if (!this.uniforms) return;
    const gl = this.gl;

    gl.uniformMatrix4fv(this.uniforms.uModelMatrix, false, modelMatrix);
    gl.uniformMatrix4fv(this.uniforms.uViewProjectionMatrix, false, viewProjectionMatrix);
    gl.uniformMatrix3fv(this.uniforms.uNormalMatrix, false, normalMatrix);
  }

  /**
   * Set camera position uniform
   *
   * @param position - Camera world position
   */
  setCameraPosition(position: [number, number, number]): void {
    if (!this.uniforms) return;
    this.gl.uniform3f(
      this.uniforms.uCameraPosition,
      position[0],
      position[1],
      position[2]
    );
  }

  /**
   * Set lighting uniforms for multi-light rendering
   *
   * @param directions - Flat array of light directions (3 floats per light)
   * @param colors - Flat array of light colors (3 floats per light)
   * @param count - Number of active lights
   * @param ambientColor - Ambient light color
   */
  setLightingUniforms(
    directions: Float32Array,
    colors: Float32Array,
    count: number,
    ambientColor: [number, number, number]
  ): void {
    if (!this.uniforms) return;
    const gl = this.gl;

    gl.uniform3fv(this.uniforms.uLightDirections, directions);
    gl.uniform3fv(this.uniforms.uLightColors, colors);
    gl.uniform1i(this.uniforms.uLightCount, count);
    gl.uniform3fv(this.uniforms.uAmbientColor, ambientColor);
  }

  /**
   * Dispose of GPU resources
   */
  dispose(): void {
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
      this.uniforms = null;
    }
  }

  /**
   * Check if the program is compiled and ready
   */
  isReady(): boolean {
    return this.program !== null;
  }

  /**
   * Cache all uniform locations for fast access
   */
  private cacheUniformLocations(): void {
    if (!this.program) return;
    const gl = this.gl;

    this.uniforms = {
      // Transform
      uModelMatrix: gl.getUniformLocation(this.program, 'uModelMatrix'),
      uViewProjectionMatrix: gl.getUniformLocation(this.program, 'uViewProjectionMatrix'),
      uNormalMatrix: gl.getUniformLocation(this.program, 'uNormalMatrix'),

      // Material
      uBaseColor: gl.getUniformLocation(this.program, 'uBaseColor'),
      uMetallic: gl.getUniformLocation(this.program, 'uMetallic'),
      uRoughness: gl.getUniformLocation(this.program, 'uRoughness'),
      uEmission: gl.getUniformLocation(this.program, 'uEmission'),
      uEmissionStrength: gl.getUniformLocation(this.program, 'uEmissionStrength'),

      // Lighting
      uLightDirections: gl.getUniformLocation(this.program, 'uLightDirections'),
      uLightColors: gl.getUniformLocation(this.program, 'uLightColors'),
      uLightCount: gl.getUniformLocation(this.program, 'uLightCount'),
      uAmbientColor: gl.getUniformLocation(this.program, 'uAmbientColor'),
      uCameraPosition: gl.getUniformLocation(this.program, 'uCameraPosition'),
    };
  }

  /**
   * Compile a single shader
   */
  private compileShader(source: string, type: number): WebGLShader {
    const gl = this.gl;

    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`PBR shader compile error: ${log}`);
    }

    return shader;
  }
}
