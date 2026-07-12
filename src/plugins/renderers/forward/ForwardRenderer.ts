/**
 * Forward Renderer Plugin
 *
 * A forward render pipeline that draws solid meshes with lighting.
 * Implements IRenderPipeline for the plugin system.
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
import { ShaderResolver } from './ShaderResolver';
import { UniformSetter } from './UniformSetter';

/**
 * Forward Renderer - A solid mesh render pipeline with lighting.
 *
 * Supports Lambert, PBR, Unlit, and custom shader assets. Uses MeshGPUCache
 * for centralized GPU resource management.
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
  private meshGPUCache: MeshGPUCache | null = null;
  private shaderResolver: ShaderResolver | null = null;
  private uniformSetter: UniformSetter | null = null;
  private initialized = false;

  private currentShaderUUID: string | null = null;

  private readonly MAX_LIGHTS = 8;

  private cachedLightDirections: Float32Array = new Float32Array(8 * 3);
  private cachedLightColors: Float32Array = new Float32Array(8 * 3);
  private cachedLightCount = 0;
  private cachedAmbientColor: [number, number, number] = [0.15, 0.15, 0.2];
  private cachedCameraPosition: [number, number, number] = [0, 0, 0];
  private cachedViewProjection: Float32Array | null = null;

  private defaultLightDirection: [number, number, number] = [-0.5, -1, -0.5];
  private defaultLightColor: [number, number, number] = [1, 1, 1];
  private defaultAmbientColor: [number, number, number] = [0.15, 0.15, 0.2];

  async initialize(context: IPluginContext): Promise<void> {
    this.gl = context.gl;
    this.lightManager = context.lightManager ?? null;
    this.shaderEditorService = context.shaderEditorService ?? null;

    this.meshGPUCache = new MeshGPUCache(this.gl);
    if (this.shaderEditorService) {
      this.shaderResolver = new ShaderResolver({
        shaderEditorService: this.shaderEditorService,
        assetRegistry: context.assetRegistry ?? null,
      });
      this.uniformSetter = new UniformSetter({
        gl: this.gl,
        shaderEditorService: this.shaderEditorService,
        assetRegistry: context.assetRegistry ?? null,
      });
    }

    this.initialized = true;
    context.eventBus.emit('renderer:initialized', { id: this.id });
  }

  async dispose(): Promise<void> {
    this.meshGPUCache?.disposeAll();
    this.meshGPUCache = null;
    this.shaderResolver = null;
    this.uniformSetter = null;
    this.gl = null;
    this.initialized = false;
  }

  beginFrame(camera: ICamera): void {
    if (!this.gl || !this.initialized) return;

    this.currentCamera = camera;

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LESS);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);
    this.gl.frontFace(this.gl.CCW);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.clearColor(0.15, 0.15, 0.17, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  render(scene: IScene): void {
    if (!this.gl || !this.currentCamera || !this.initialized || !this.shaderEditorService) {
      return;
    }

    this.cachedViewProjection = this.currentCamera.getViewProjectionMatrix();
    const cameraPos = this.currentCamera.position;
    this.cachedCameraPosition = [cameraPos[0], cameraPos[1], cameraPos[2]];

    this.cacheLightUniforms();
    this.currentShaderUUID = null;

    const renderables = scene.getRenderables() as IRenderable[];
    for (const renderable of renderables) {
      this.renderObject(this.gl, renderable);
    }
  }

  endFrame(): void {
    this.currentCamera = null;
  }

  resize(width: number, height: number): void {
    this.gl?.viewport(0, 0, width, height);
  }

  getProgram(): WebGLProgram | null {
    return this.shaderEditorService?.getCompiledProgram(BUILT_IN_SHADER_IDS.LAMBERT) ?? null;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private renderObject(gl: WebGL2RenderingContext, renderable: IRenderable): void {
    if (!isMeshProvider(renderable)) {
      return;
    }

    const meshData = renderable.getMeshData();
    if (!meshData || !this.meshGPUCache || !this.shaderResolver || !this.uniformSetter) {
      return;
    }

    const material = this.getMaterialComponent(renderable);
    const requestedShaderUUID = this.shaderResolver.resolveShaderUUID(material);
    const resolvedShader = this.shaderResolver.resolveProgram(requestedShaderUUID);
    if (!resolvedShader) return;

    this.switchToShader(gl, resolvedShader.shaderUUID, resolvedShader.program);

    const modelMatrix = this.getRenderableModelMatrix(renderable);
    const normalMat = normalMatrix(modelMatrix);

    const gpuResources = this.meshGPUCache.getOrCreateSolid(
      renderable.id,
      meshData,
      resolvedShader.program,
    );

    this.uniformSetter.setObjectUniforms({
      shaderUUID: resolvedShader.shaderUUID,
      modelMatrix,
      normalMatrix: normalMat,
      material,
    });

    gl.bindVertexArray(gpuResources.vao);
    gl.drawElements(gl.TRIANGLES, gpuResources.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  private getMaterialComponent(renderable: IRenderable): IMaterialComponent | null {
    const entityWithComponent = renderable as { getComponent?: <T>(type: string) => T | null };
    if (typeof entityWithComponent.getComponent !== 'function') {
      return null;
    }

    return entityWithComponent.getComponent<IMaterialComponent>('material');
  }

  private getRenderableModelMatrix(renderable: IRenderable): Float32Array {
    const entityWithModelMatrix = renderable as { getModelMatrix?: () => Float32Array };
    if (typeof entityWithModelMatrix.getModelMatrix === 'function') {
      return entityWithModelMatrix.getModelMatrix();
    }

    return this.computeModelMatrix(renderable.transform);
  }

  private switchToShader(
    gl: WebGL2RenderingContext,
    shaderUUID: string,
    program: WebGLProgram,
  ): void {
    if (!this.cachedViewProjection) return;

    if (this.currentShaderUUID === shaderUUID) {
      return;
    }

    gl.useProgram(program);
    this.currentShaderUUID = shaderUUID;

    this.uniformSetter?.setFrameUniforms(shaderUUID, {
      viewProjectionMatrix: this.cachedViewProjection,
      cameraPosition: this.cachedCameraPosition,
      lightDirections: this.cachedLightDirections,
      lightColors: this.cachedLightColors,
      lightCount: this.cachedLightCount,
      ambientColor: this.cachedAmbientColor,
    });
  }

  /**
   * Compute model matrix from a transform.
   * Order: Translation x RotationZ x RotationY x RotationX x Scale
   */
  private computeModelMatrix(transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }): Float32Array {
    const { position, rotation, scale } = transform;

    const t = mat4Translation(position[0], position[1], position[2]);
    const rx = mat4RotationX(degToRad(rotation[0]));
    const ry = mat4RotationY(degToRad(rotation[1]));
    const rz = mat4RotationZ(degToRad(rotation[2]));
    const s = mat4Scale(scale[0], scale[1], scale[2]);

    let model = mat4Multiply(t, rz);
    model = mat4Multiply(model, ry);
    model = mat4Multiply(model, rx);
    model = mat4Multiply(model, s);

    return model;
  }

  private cacheLightUniforms(): void {
    const lights = this.getLightsData();

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

  private getLightsData(): LightData[] {
    if (this.lightManager) {
      const lights = this.lightManager.getActiveLights();
      if (lights.length > 0) {
        return lights;
      }
    }

    return [{
      lightType: 'directional',
      direction: this.defaultLightDirection,
      position: [0, 0, 0],
      color: this.defaultLightColor,
      enabled: true,
    }];
  }

  private getAmbientColor(): [number, number, number] {
    return this.lightManager?.getAmbientColor() ?? this.defaultAmbientColor;
  }

  private normalizeDirection(dir: [number, number, number]): Float32Array {
    const len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
    if (len === 0) {
      return new Float32Array([0, -1, 0]);
    }
    return new Float32Array([dir[0] / len, dir[1] / len, dir[2] / len]);
  }
}
