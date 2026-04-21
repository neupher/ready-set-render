/**
 * Forward Renderer Plugin
 *
 * A forward render pipeline that draws solid meshes with lighting.
 * Implements IRenderPipeline for the plugin system.
 *
 * Features:
 * - Solid mesh rendering with depth testing
 * - Multi-light support (up to 8 directional lights)
 * - Shader support: Lambert (default), PBR, Unlit, and custom shaders
 * - All shaders are loaded from assets via ShaderEditorService
 */

import type {
  IRenderPipeline,
  IPluginContext,
  ICamera,
  IScene,
  IRenderable,
  IMaterialComponent,
} from '@core/interfaces';
import { isMeshProvider } from '@core/interfaces';
import type { LightManager, LightData } from '@core/LightManager';
import type { ShaderEditorService } from '@core/ShaderEditorService';
import type { AssetRegistry } from '@core/assets/AssetRegistry';
import type { IMaterialAsset } from '@core/assets/interfaces/IMaterialAsset';
import type { IShaderAsset, IUniformDeclaration } from '@core/assets/interfaces/IShaderAsset';
import { BUILT_IN_SHADER_IDS } from '@core/assets/BuiltInShaders';
import {
  mat4Multiply,
  mat4Translation,
  mat4RotationX,
  mat4RotationY,
  mat4RotationZ,
  mat4Scale,
  degToRad,
  normalMatrix,
} from '@utils/math';
import { MeshGPUCache } from '../shared/MeshGPUCache';

/**
 * Forward Renderer - A solid mesh render pipeline with lighting.
 *
 * Renders all IRenderable objects in the scene as solid shaded meshes
 * with directional lighting and ambient contribution.
 *
 * Supports multiple shading models via shader assets:
 * - Lambert: Diffuse + ambient + rim lighting (default)
 * - PBR: Cook-Torrance BRDF with metallic/roughness workflow
 * - Unlit: Solid color without lighting
 * - Custom: User-defined shaders
 *
 * Uses MeshGPUCache for centralized GPU resource management.
 * Entities only need to implement IMeshProvider to be rendered.
 *
 * @example
 * ```typescript
 * const forwardRenderer = new ForwardRenderer();
 * pluginManager.register(forwardRenderer);
 * await pluginManager.initializeAll();
 *
 * // In render loop:
 * forwardRenderer.beginFrame(camera);
 * forwardRenderer.render(scene);
 * forwardRenderer.endFrame();
 * ```
 */
export class ForwardRenderer implements IRenderPipeline {
  readonly id = 'forward-renderer';
  readonly name = 'Forward Renderer';
  readonly version = '1.0.0';
  readonly type = 'forward' as const;

  private gl: WebGL2RenderingContext | null = null;
  private currentCamera: ICamera | null = null;
  private lightManager: LightManager | null = null;
  private shaderEditorService: ShaderEditorService | null = null;
  private assetRegistry: AssetRegistry | null = null;
  private meshGPUCache: MeshGPUCache | null = null;
  private initialized = false;

  // Track which shader is currently bound
  private currentShaderUUID: string | null = null;

  // Maximum lights supported
  private readonly MAX_LIGHTS = 8;

  // Cached light data for shader switching
  private cachedLightDirections: Float32Array = new Float32Array(8 * 3);
  private cachedLightColors: Float32Array = new Float32Array(8 * 3);
  private cachedLightCount = 0;
  private cachedAmbientColor: [number, number, number] = [0.15, 0.15, 0.2];
  private cachedCameraPosition: [number, number, number] = [0, 0, 0];
  private cachedViewProjection: Float32Array | null = null;

  // Default light values (used when no lights in scene)
  private defaultLightDirection: [number, number, number] = [-0.5, -1, -0.5];
  private defaultLightColor: [number, number, number] = [1, 1, 1];
  private defaultAmbientColor: [number, number, number] = [0.15, 0.15, 0.2];

  /**
   * Initialize the forward renderer.
   * Creates the GPU resource cache. Shader programs are managed by ShaderEditorService.
   */
  async initialize(context: IPluginContext): Promise<void> {
    this.gl = context.gl;
    this.lightManager = context.lightManager ?? null;
    this.shaderEditorService = context.shaderEditorService ?? null;
    this.assetRegistry = context.assetRegistry ?? null;

    // Create GPU resource cache
    this.meshGPUCache = new MeshGPUCache(this.gl);

    this.initialized = true;

    context.eventBus.emit('renderer:initialized', { id: this.id });
  }

  /**
   * Dispose of GPU resources.
   */
  async dispose(): Promise<void> {
    // Dispose mesh cache
    if (this.meshGPUCache) {
      this.meshGPUCache.disposeAll();
      this.meshGPUCache = null;
    }

    this.gl = null;
    this.initialized = false;
  }

  /**
   * Begin a new render frame.
   * Sets up depth testing, culling, and blending, then clears the screen.
   */
  beginFrame(camera: ICamera): void {
    if (!this.gl || !this.initialized) return;

    this.currentCamera = camera;

    // Enable depth testing
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LESS);

    // Enable back-face culling
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);
    this.gl.frontFace(this.gl.CCW);

    // Enable alpha blending for transparency support
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Set clear color to match editor background
    this.gl.clearColor(0.15, 0.15, 0.17, 1.0);

    // Clear the framebuffer
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  /**
   * Render all objects in the scene.
   */
  render(scene: IScene): void {
    if (!this.gl || !this.currentCamera || !this.initialized || !this.shaderEditorService) {
      return;
    }

    const gl = this.gl;

    // Cache view-projection matrix and camera position for shader switching
    this.cachedViewProjection = this.currentCamera.getViewProjectionMatrix();
    const cameraPos = this.currentCamera.position;
    this.cachedCameraPosition = [cameraPos[0], cameraPos[1], cameraPos[2]];

    // Cache light uniforms
    this.cacheLightUniforms();

    // Reset current shader to force first object to bind
    this.currentShaderUUID = null;

    // Render all solid objects
    const renderables = scene.getRenderables() as IRenderable[];
    for (const renderable of renderables) {
      this.renderObject(gl, renderable);
    }
  }

  /**
   * Cache light uniforms for use when switching between shaders.
   */
  private cacheLightUniforms(): void {
    const lights = this.getLightsData();

    // Reset cached data
    this.cachedLightDirections.fill(0);
    this.cachedLightColors.fill(0);

    for (let i = 0; i < Math.min(lights.length, this.MAX_LIGHTS); i++) {
      const light = lights[i];
      const normalizedDir = this.normalizeDirection(light.direction);

      this.cachedLightDirections[i * 3 + 0] = normalizedDir[0];
      this.cachedLightDirections[i * 3 + 1] = normalizedDir[1];
      this.cachedLightDirections[i * 3 + 2] = normalizedDir[2];

      this.cachedLightColors[i * 3 + 0] = light.color[0];
      this.cachedLightColors[i * 3 + 1] = light.color[1];
      this.cachedLightColors[i * 3 + 2] = light.color[2];
    }

    this.cachedLightCount = Math.min(lights.length, this.MAX_LIGHTS);
    this.cachedAmbientColor = this.getAmbientColor();
  }

  /**
   * End the render frame.
   */
  endFrame(): void {
    this.currentCamera = null;
  }

  /**
   * Handle viewport resize.
   */
  resize(width: number, height: number): void {
    if (this.gl) {
      this.gl.viewport(0, 0, width, height);
    }
  }

  /**
   * Get the shader program for a given UUID.
   */
  getProgram(): WebGLProgram | null {
    // Return the Lambert program as the default
    return this.shaderEditorService?.getCompiledProgram(BUILT_IN_SHADER_IDS.LAMBERT) ?? null;
  }

  /**
   * Check if the renderer is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Render a single object using MeshGPUCache.
   *
   * Objects that implement IMeshProvider will be rendered.
   * Objects without mesh data (cameras, lights) are skipped.
   * Uses shader from material component or defaults to Lambert.
   */
  private renderObject(gl: WebGL2RenderingContext, renderable: IRenderable): void {
    // Check if this object provides mesh data
    if (!isMeshProvider(renderable)) {
      return; // Skip non-mesh objects (cameras, lights)
    }

    // Get mesh data from the provider
    const meshData = renderable.getMeshData();
    if (!meshData) {
      return; // Entity exists but has no geometry
    }

    // Get or create GPU resources via cache
    if (!this.meshGPUCache || !this.shaderEditorService) {
      return;
    }

    // Get material from entity if available
    let material: IMaterialComponent | null = null;
    const entityWithComponent = renderable as { getComponent?: <T>(type: string) => T | null };
    if (typeof entityWithComponent.getComponent === 'function') {
      material = entityWithComponent.getComponent<IMaterialComponent>('material');
    }

    // Resolve shader UUID from material
    const shaderUUID = this.resolveShaderUUID(material);
    const program = this.shaderEditorService.getCompiledProgram(shaderUUID);

    if (!program) {
      // Fallback to Lambert if shader not compiled
      const fallbackProgram = this.shaderEditorService.getCompiledProgram(BUILT_IN_SHADER_IDS.LAMBERT);
      if (!fallbackProgram) return;
      this.switchToShader(gl, BUILT_IN_SHADER_IDS.LAMBERT, fallbackProgram);
    } else {
      // Switch shader if needed
      this.switchToShader(gl, shaderUUID, program);
    }

    // Get the active program
    const activeProgram = this.shaderEditorService.getCompiledProgram(this.currentShaderUUID!) ?? program;
    if (!activeProgram) return;

    // Compute model matrix - use entity's getModelMatrix() if available (for hierarchy support)
    // Otherwise fall back to computing from local transform only
    let modelMatrix: Float32Array;
    if ('getModelMatrix' in renderable && typeof (renderable as { getModelMatrix: () => Float32Array }).getModelMatrix === 'function') {
      modelMatrix = (renderable as { getModelMatrix: () => Float32Array }).getModelMatrix();
    } else {
      modelMatrix = this.computeModelMatrix(renderable.transform);
    }

    // Compute normal matrix for correct lighting
    const normalMat = normalMatrix(modelMatrix);

    // Get GPU resources using active program
    const gpuResources = this.meshGPUCache.getOrCreateSolid(
      renderable.id,
      meshData,
      activeProgram
    );

    // Set uniforms for the current shader
    this.setShaderUniforms(gl, this.currentShaderUUID!, modelMatrix, normalMat, material);

    // Bind VAO and draw
    gl.bindVertexArray(gpuResources.vao);
    gl.drawElements(gl.TRIANGLES, gpuResources.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  /**
   * Resolve the shader UUID to use for a material.
   *
   * Priority:
   * 1. If material has materialAssetRef → get shader from material asset
   * 2. Check if shaderName is already a valid shader UUID (custom shaders)
   * 3. Map shaderName to built-in shader UUID ('lambert', 'pbr', 'unlit')
   * 4. Default to Lambert
   */
  private resolveShaderUUID(material: IMaterialComponent | null): string {
    // Try to resolve via materialAssetRef → IMaterialAsset → shaderRef
    if (material?.materialAssetRef && this.assetRegistry) {
      const materialAsset = this.assetRegistry.get<IMaterialAsset>(material.materialAssetRef.uuid);
      if (materialAsset) {
        return materialAsset.shaderRef.uuid;
      }
    }

    const shaderName = material?.shaderName;

    // Check if shaderName is already a UUID of a registered shader (custom shaders)
    if (shaderName && this.shaderEditorService?.hasCachedProgram(shaderName)) {
      return shaderName;
    }

    // Map shaderName to built-in shader UUID
    const shaderNameLower = shaderName?.toLowerCase();
    switch (shaderNameLower) {
      case 'pbr':
        return BUILT_IN_SHADER_IDS.PBR;
      case 'unlit':
        return BUILT_IN_SHADER_IDS.UNLIT;
      case 'lambert':
      default:
        return BUILT_IN_SHADER_IDS.LAMBERT;
    }
  }

  /**
   * Switch to a shader program.
   */
  private switchToShader(
    gl: WebGL2RenderingContext,
    shaderUUID: string,
    program: WebGLProgram,
  ): void {
    if (!this.cachedViewProjection) return;

    // Only rebind if different shader than current
    if (this.currentShaderUUID === shaderUUID) {
      return;
    }

    gl.useProgram(program);
    this.currentShaderUUID = shaderUUID;

    // Set per-frame uniforms
    const locations = this.shaderEditorService?.getUniformLocations(shaderUUID);
    if (locations) {
      const vpLoc = locations.get('uViewProjectionMatrix');
      if (vpLoc) gl.uniformMatrix4fv(vpLoc, false, this.cachedViewProjection);

      const camLoc = locations.get('uCameraPosition');
      if (camLoc) gl.uniform3f(camLoc, ...this.cachedCameraPosition);

      // Set light arrays
      const lightDirLoc = locations.get('uLightDirections');
      if (lightDirLoc) gl.uniform3fv(lightDirLoc, this.cachedLightDirections);

      const lightColLoc = locations.get('uLightColors');
      if (lightColLoc) gl.uniform3fv(lightColLoc, this.cachedLightColors);

      const lightCountLoc = locations.get('uLightCount');
      if (lightCountLoc) gl.uniform1i(lightCountLoc, this.cachedLightCount);

      const ambientLoc = locations.get('uAmbientColor');
      if (ambientLoc) gl.uniform3fv(ambientLoc, this.cachedAmbientColor);
    }
  }

  /**
   * Set uniforms for the current shader program based on material parameters.
   */
  private setShaderUniforms(
    gl: WebGL2RenderingContext,
    shaderUUID: string,
    modelMatrix: Float32Array,
    normalMat: Float32Array,
    material: IMaterialComponent | null,
  ): void {
    const locations = this.shaderEditorService?.getUniformLocations(shaderUUID);
    if (!locations) return;

    // Set transform uniforms
    const modelLoc = locations.get('uModelMatrix');
    if (modelLoc) gl.uniformMatrix4fv(modelLoc, false, modelMatrix);

    const normalLoc = locations.get('uNormalMatrix');
    if (normalLoc) gl.uniformMatrix3fv(normalLoc, false, normalMat);

    // Get material asset parameters if available
    let parameters: Record<string, unknown> = {};
    if (material?.materialAssetRef && this.assetRegistry) {
      const materialAsset = this.assetRegistry.get<IMaterialAsset>(material.materialAssetRef.uuid);
      if (materialAsset) {
        parameters = materialAsset.parameters;
      }
    }

    // Get shader asset for uniform declarations
    const shader = this.assetRegistry?.get<IShaderAsset>(shaderUUID);
    if (!shader) {
      // Fallback: set basic color uniform from material component
      const baseColorLoc = locations.get('uBaseColor');
      const colorLoc = locations.get('uColor');
      const color = material?.color ?? [0.8, 0.8, 0.8];
      if (baseColorLoc) gl.uniform3fv(baseColorLoc, color);
      if (colorLoc) gl.uniform3fv(colorLoc, color);

      const opacityLoc = locations.get('uOpacity');
      if (opacityLoc) gl.uniform1f(opacityLoc, material?.opacity ?? 1.0);
      return;
    }

    // Set each declared uniform from material parameters or defaults
    for (const uniform of shader.uniforms) {
      const loc = locations.get(uniform.name);
      if (!loc) continue;

      // Use material component value for base color if no material asset
      let value = parameters[uniform.name] ?? uniform.defaultValue;
      if (uniform.name === 'uBaseColor' && !parameters[uniform.name] && material?.color) {
        value = material.color;
      }
      if (uniform.name === 'uColor' && !parameters[uniform.name] && material?.color) {
        value = material.color;
      }
      if (uniform.name === 'uOpacity' && !parameters[uniform.name] && material?.opacity !== undefined) {
        value = material.opacity;
      }

      this.setUniformValue(gl, loc, uniform, value);
    }
  }

  /**
   * Set a single uniform value based on its type declaration.
   */
  private setUniformValue(
    gl: WebGL2RenderingContext,
    location: WebGLUniformLocation,
    uniform: IUniformDeclaration,
    value: unknown,
  ): void {
    switch (uniform.type) {
      case 'float':
        gl.uniform1f(location, value as number);
        break;
      case 'int':
        gl.uniform1i(location, value as number);
        break;
      case 'bool':
        gl.uniform1i(location, (value as boolean) ? 1 : 0);
        break;
      case 'vec2': {
        const v2 = value as [number, number];
        gl.uniform2f(location, v2[0], v2[1]);
        break;
      }
      case 'vec3': {
        const v3 = value as [number, number, number];
        gl.uniform3f(location, v3[0], v3[1], v3[2]);
        break;
      }
      case 'vec4': {
        const v4 = value as [number, number, number, number];
        gl.uniform4f(location, v4[0], v4[1], v4[2], v4[3]);
        break;
      }
      case 'mat3': {
        const m3 = value as Float32Array | number[];
        gl.uniformMatrix3fv(location, false, m3);
        break;
      }
      case 'mat4': {
        const m4 = value as Float32Array | number[];
        gl.uniformMatrix4fv(location, false, m4);
        break;
      }
    }
  }

  /**
   * Compute model matrix from a transform.
   * Order: Translation × RotationZ × RotationY × RotationX × Scale
   */
  private computeModelMatrix(transform: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }): Float32Array {
    const { position, rotation, scale } = transform;

    const t = mat4Translation(position[0], position[1], position[2]);
    const rx = mat4RotationX(degToRad(rotation[0]));
    const ry = mat4RotationY(degToRad(rotation[1]));
    const rz = mat4RotationZ(degToRad(rotation[2]));
    const s = mat4Scale(scale[0], scale[1], scale[2]);

    // Combine: T × Rz × Ry × Rx × S
    let model = mat4Multiply(t, rz);
    model = mat4Multiply(model, ry);
    model = mat4Multiply(model, rx);
    model = mat4Multiply(model, s);

    return model;
  }

  /**
   * Get light data from LightManager or use defaults.
   * Returns array of lights for multi-light rendering.
   */
  private getLightsData(): LightData[] {
    if (this.lightManager) {
      const lights = this.lightManager.getActiveLights();
      if (lights.length > 0) {
        return lights;
      }
    }

    // Return default single light if no lights in scene
    return [{
      lightType: 'directional',
      direction: this.defaultLightDirection,
      position: [0, 0, 0],
      color: this.defaultLightColor,
      enabled: true,
    }];
  }

  /**
   * Get ambient color from LightManager or use defaults.
   */
  private getAmbientColor(): [number, number, number] {
    if (this.lightManager) {
      return this.lightManager.getAmbientColor();
    }
    return this.defaultAmbientColor;
  }

  /**
   * Normalize a direction vector.
   */
  private normalizeDirection(dir: [number, number, number]): Float32Array {
    const len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
    if (len === 0) {
      return new Float32Array([0, -1, 0]);
    }
    return new Float32Array([dir[0] / len, dir[1] / len, dir[2] / len]);
  }
}
