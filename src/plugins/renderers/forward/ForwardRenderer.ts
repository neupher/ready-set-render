/**
 * Forward Renderer Plugin
 *
 * A forward render pipeline that draws solid meshes with basic lighting.
 * Implements IRenderPipeline for the plugin system.
 *
 * Features:
 * - Solid mesh rendering with depth testing
 * - Directional light support (direction, color, intensity)
 * - Ambient light approximation
 * - Normal matrix computation for correct lighting
 * - PBR shader support (Cook-Torrance BRDF, Blender Principled BSDF style)
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
import { PBRShaderProgram } from '../shaders/pbr';

/**
 * Vertex shader for forward rendering with lighting.
 */
const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uModelMatrix;
uniform mat4 uViewProjectionMatrix;
uniform mat3 uNormalMatrix;

out vec3 vNormal;
out vec3 vWorldPosition;

void main() {
  vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uViewProjectionMatrix * worldPosition;
}
`;

/**
 * Fragment shader for forward rendering with multi-light support.
 * Uses Lambertian diffuse + hemisphere ambient.
 * Supports up to MAX_LIGHTS directional lights.
 */
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

// Maximum number of lights (keep in sync with TypeScript MAX_LIGHTS)
#define MAX_LIGHTS 8

in vec3 vNormal;
in vec3 vWorldPosition;

// Material
uniform vec3 uBaseColor;

// Lighting - arrays for multi-light support
uniform vec3 uLightDirections[MAX_LIGHTS];
uniform vec3 uLightColors[MAX_LIGHTS];
uniform int uLightCount;

// Ambient
uniform vec3 uAmbientColor;

// Camera
uniform vec3 uCameraPosition;

out vec4 outColor;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(uCameraPosition - vWorldPosition);

  // Accumulate light contribution
  vec3 diffuse = vec3(0.0);

  for (int i = 0; i < MAX_LIGHTS; i++) {
    if (i >= uLightCount) break;

    // Lambertian diffuse for this light
    float NdotL = max(dot(normal, -uLightDirections[i]), 0.0);
    diffuse += uBaseColor * uLightColors[i] * NdotL;
  }

  // Hemisphere ambient (sky color top, ground color bottom) - Z-up convention
  float hemiFactor = normal.z * 0.5 + 0.5;
  vec3 ambient = uBaseColor * mix(uAmbientColor * 0.6, uAmbientColor, hemiFactor);

  // Simple rim light for better definition (using primary light if available)
  vec3 rimColor = vec3(0.0);
  if (uLightCount > 0) {
    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    rim = pow(rim, 3.0) * 0.15;
    rimColor = uLightColors[0] * rim;
  }

  vec3 finalColor = diffuse + ambient + rimColor;

  // Gamma correction (approximate)
  finalColor = pow(finalColor, vec3(1.0 / 2.2));

  outColor = vec4(finalColor, 1.0);
}
`;

/**
 * Forward Renderer - A solid mesh render pipeline with lighting.
 *
 * Renders all IRenderable objects in the scene as solid shaded meshes
 * with directional lighting and ambient contribution.
 *
 * Supports two shading models:
 * - Default (Lambertian): Simple diffuse + ambient + rim lighting
 * - PBR (Cook-Torrance): Physically-based with metallic/roughness workflow
 *
 * Uses MeshGPUCache for centralized GPU resource management.
 * Entities only need to implement IMeshProvider to be rendered.
 *
 * @example
 * ```typescript
 * const forwardRenderer = new ForwardRenderer();
 * forwardRenderer.setLightManager(lightManager);
 * pluginManager.register(forwardRenderer);
 * await pluginManager.initialize('forward-renderer');
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
  private program: WebGLProgram | null = null;
  private pbrProgram: PBRShaderProgram | null = null;
  private currentCamera: ICamera | null = null;
  private lightManager: LightManager | null = null;
  private meshGPUCache: MeshGPUCache | null = null;
  private initialized = false;

  // Track which shader is currently bound
  private currentShader: 'default' | 'pbr' = 'default';

  // Uniform locations for default shader
  private uModelMatrix: WebGLUniformLocation | null = null;
  private uViewProjectionMatrix: WebGLUniformLocation | null = null;
  private uNormalMatrix: WebGLUniformLocation | null = null;
  private uBaseColor: WebGLUniformLocation | null = null;
  private uLightDirections: WebGLUniformLocation | null = null;
  private uLightColors: WebGLUniformLocation | null = null;
  private uLightCount: WebGLUniformLocation | null = null;
  private uAmbientColor: WebGLUniformLocation | null = null;
  private uCameraPosition: WebGLUniformLocation | null = null;

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
   * Compiles shaders and creates the rendering program.
   */
  async initialize(context: IPluginContext): Promise<void> {
    this.gl = context.gl;

    // Compile and link default (Lambertian) shader
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);

    // Compile PBR shader
    this.pbrProgram = new PBRShaderProgram(this.gl);
    this.pbrProgram.compile();

    // Create GPU resource cache
    this.meshGPUCache = new MeshGPUCache(this.gl);

    // Cache uniform locations for default shader
    this.uModelMatrix = this.gl.getUniformLocation(this.program, 'uModelMatrix');
    this.uViewProjectionMatrix = this.gl.getUniformLocation(this.program, 'uViewProjectionMatrix');
    this.uNormalMatrix = this.gl.getUniformLocation(this.program, 'uNormalMatrix');
    this.uBaseColor = this.gl.getUniformLocation(this.program, 'uBaseColor');
    this.uLightDirections = this.gl.getUniformLocation(this.program, 'uLightDirections');
    this.uLightColors = this.gl.getUniformLocation(this.program, 'uLightColors');
    this.uLightCount = this.gl.getUniformLocation(this.program, 'uLightCount');
    this.uAmbientColor = this.gl.getUniformLocation(this.program, 'uAmbientColor');
    this.uCameraPosition = this.gl.getUniformLocation(this.program, 'uCameraPosition');

    this.initialized = true;

    context.eventBus.emit('renderer:initialized', { id: this.id });
  }

  /**
   * Dispose of GPU resources.
   */
  async dispose(): Promise<void> {
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }

    // Dispose PBR shader
    if (this.pbrProgram) {
      this.pbrProgram.dispose();
      this.pbrProgram = null;
    }

    // Dispose mesh cache
    if (this.meshGPUCache) {
      this.meshGPUCache.disposeAll();
      this.meshGPUCache = null;
    }

    this.gl = null;
    this.program = null;
    this.initialized = false;
  }

  /**
   * Set the light manager for retrieving active lights.
   */
  setLightManager(lightManager: LightManager): void {
    this.lightManager = lightManager;
  }

  /**
   * Begin a new render frame.
   * Sets up depth testing and culling, clears the screen.
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

    // Set clear color to match editor background
    this.gl.clearColor(0.15, 0.15, 0.17, 1.0);

    // Clear the framebuffer
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  /**
   * Render all objects in the scene.
   */
  render(scene: IScene): void {
    if (!this.gl || !this.program || !this.currentCamera || !this.initialized) {
      return;
    }

    const gl = this.gl;

    // Start with default shader
    gl.useProgram(this.program);
    this.currentShader = 'default';

    // Cache view-projection matrix and camera position for shader switching
    this.cachedViewProjection = this.currentCamera.getViewProjectionMatrix();
    const cameraPos = this.currentCamera.position;
    this.cachedCameraPosition = [cameraPos[0], cameraPos[1], cameraPos[2]];

    // Set up view-projection matrix
    gl.uniformMatrix4fv(this.uViewProjectionMatrix, false, this.cachedViewProjection);

    // Set up camera position for specular/rim lighting
    gl.uniform3f(this.uCameraPosition, cameraPos[0], cameraPos[1], cameraPos[2]);

    // Cache and set up lights
    this.cacheLightUniforms();
    this.setLightUniformsForShader(gl, 'default');

    // Set ambient color
    gl.uniform3fv(this.uAmbientColor, this.getAmbientColor());

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
   * Set light uniforms for the currently active shader.
   */
  private setLightUniformsForShader(gl: WebGL2RenderingContext, shader: 'default' | 'pbr'): void {
    if (shader === 'default') {
      gl.uniform3fv(this.uLightDirections, this.cachedLightDirections);
      gl.uniform3fv(this.uLightColors, this.cachedLightColors);
      gl.uniform1i(this.uLightCount, this.cachedLightCount);
      gl.uniform3fv(this.uAmbientColor, this.cachedAmbientColor);
    } else if (shader === 'pbr' && this.pbrProgram) {
      this.pbrProgram.setLightingUniforms(
        this.cachedLightDirections,
        this.cachedLightColors,
        this.cachedLightCount,
        this.cachedAmbientColor
      );
      this.pbrProgram.setCameraPosition(this.cachedCameraPosition);
    }
  }

  /**
   * Set light uniforms for multi-light rendering (legacy method for compatibility).
   */
  private setLightUniforms(gl: WebGL2RenderingContext): void {
    this.cacheLightUniforms();
    this.setLightUniformsForShader(gl, 'default');
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
   * Get the shader program.
   */
  getProgram(): WebGLProgram | null {
    return this.program;
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
   * Automatically switches between default and PBR shaders based on material.
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
    if (!this.meshGPUCache || !this.program) {
      return;
    }

    // Get material from entity if available
    let material: IMaterialComponent | null = null;
    const entityWithComponent = renderable as { getComponent?: <T>(type: string) => T | null };
    if (typeof entityWithComponent.getComponent === 'function') {
      material = entityWithComponent.getComponent<IMaterialComponent>('material');
    }

    // Determine which shader to use based on material
    const usePBR = material?.shaderName === 'pbr' && this.pbrProgram?.isReady();

    // Switch shader if needed
    if (usePBR && this.currentShader !== 'pbr') {
      this.switchToPBRShader(gl);
    } else if (!usePBR && this.currentShader !== 'default') {
      this.switchToDefaultShader(gl);
    }

    // Compute model matrix from transform
    const modelMatrix = this.computeModelMatrix(renderable.transform);

    // Compute normal matrix for correct lighting
    const normalMat = normalMatrix(modelMatrix);

    // Get GPU resources using appropriate program
    const activeProgram = usePBR ? this.pbrProgram!.getProgram()! : this.program;
    const gpuResources = this.meshGPUCache.getOrCreateSolid(
      renderable.id,
      meshData,
      activeProgram
    );

    if (usePBR && this.pbrProgram) {
      // Set PBR uniforms
      this.pbrProgram.setTransformUniforms(
        modelMatrix,
        this.cachedViewProjection!,
        normalMat
      );
      this.pbrProgram.setMaterialUniforms(material);
    } else {
      // Set default shader uniforms
      gl.uniformMatrix4fv(this.uModelMatrix, false, modelMatrix);
      gl.uniformMatrix3fv(this.uNormalMatrix, false, normalMat);

      // Set base color
      const baseColor = material?.color ?? [0.8, 0.8, 0.8];
      gl.uniform3fv(this.uBaseColor, baseColor);
    }

    // Bind VAO and draw
    gl.bindVertexArray(gpuResources.vao);
    gl.drawElements(gl.TRIANGLES, gpuResources.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  /**
   * Switch to PBR shader program.
   */
  private switchToPBRShader(gl: WebGL2RenderingContext): void {
    if (!this.pbrProgram || !this.cachedViewProjection) return;

    this.pbrProgram.use();
    this.currentShader = 'pbr';

    // Set up per-frame uniforms for PBR shader
    this.setLightUniformsForShader(gl, 'pbr');
  }

  /**
   * Switch to default (Lambertian) shader program.
   */
  private switchToDefaultShader(gl: WebGL2RenderingContext): void {
    if (!this.program || !this.cachedViewProjection) return;

    gl.useProgram(this.program);
    this.currentShader = 'default';

    // Restore per-frame uniforms for default shader
    gl.uniformMatrix4fv(this.uViewProjectionMatrix, false, this.cachedViewProjection);
    gl.uniform3f(
      this.uCameraPosition,
      this.cachedCameraPosition[0],
      this.cachedCameraPosition[1],
      this.cachedCameraPosition[2]
    );
    this.setLightUniformsForShader(gl, 'default');
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

  /**
   * Create and link a shader program.
   */
  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const gl = this.gl!;

    const vertShader = this.compileShader(vertSrc, gl.VERTEX_SHADER);
    const fragShader = this.compileShader(fragSrc, gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create WebGL program');
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
      throw new Error(`Program link error: ${log}`);
    }

    return program;
  }

  /**
   * Compile a shader.
   */
  private compileShader(source: string, type: number): WebGLShader {
    const gl = this.gl!;

    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${log}`);
    }

    return shader;
  }
}
