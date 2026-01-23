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
 * Fragment shader for forward rendering with lighting.
 * Uses Lambertian diffuse + hemisphere ambient.
 */
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vNormal;
in vec3 vWorldPosition;

// Material
uniform vec3 uBaseColor;

// Lighting
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;

// Camera
uniform vec3 uCameraPosition;

out vec4 outColor;

void main() {
  vec3 normal = normalize(vNormal);

  // Lambertian diffuse
  float NdotL = max(dot(normal, -uLightDirection), 0.0);
  vec3 diffuse = uBaseColor * uLightColor * NdotL;

  // Hemisphere ambient (sky color top, ground color bottom)
  float hemiFactor = normal.y * 0.5 + 0.5;
  vec3 ambient = uBaseColor * mix(uAmbientColor * 0.6, uAmbientColor, hemiFactor);

  // Simple rim light for better definition
  vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
  float rim = 1.0 - max(dot(viewDir, normal), 0.0);
  rim = pow(rim, 3.0) * 0.15;
  vec3 rimColor = uLightColor * rim;

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
  private currentCamera: ICamera | null = null;
  private lightManager: LightManager | null = null;
  private meshGPUCache: MeshGPUCache | null = null;
  private initialized = false;

  // Uniform locations
  private uModelMatrix: WebGLUniformLocation | null = null;
  private uViewProjectionMatrix: WebGLUniformLocation | null = null;
  private uNormalMatrix: WebGLUniformLocation | null = null;
  private uBaseColor: WebGLUniformLocation | null = null;
  private uLightDirection: WebGLUniformLocation | null = null;
  private uLightColor: WebGLUniformLocation | null = null;
  private uAmbientColor: WebGLUniformLocation | null = null;
  private uCameraPosition: WebGLUniformLocation | null = null;

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

    // Compile and link shaders
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);

    // Create GPU resource cache
    this.meshGPUCache = new MeshGPUCache(this.gl);

    // Cache uniform locations
    this.uModelMatrix = this.gl.getUniformLocation(this.program, 'uModelMatrix');
    this.uViewProjectionMatrix = this.gl.getUniformLocation(this.program, 'uViewProjectionMatrix');
    this.uNormalMatrix = this.gl.getUniformLocation(this.program, 'uNormalMatrix');
    this.uBaseColor = this.gl.getUniformLocation(this.program, 'uBaseColor');
    this.uLightDirection = this.gl.getUniformLocation(this.program, 'uLightDirection');
    this.uLightColor = this.gl.getUniformLocation(this.program, 'uLightColor');
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

    // Use our shader program
    gl.useProgram(this.program);

    // Set up view-projection matrix
    const viewProjection = this.currentCamera.getViewProjectionMatrix();
    gl.uniformMatrix4fv(this.uViewProjectionMatrix, false, viewProjection);

    // Set up camera position for specular/rim lighting
    const cameraPos = this.currentCamera.position;
    gl.uniform3f(this.uCameraPosition, cameraPos[0], cameraPos[1], cameraPos[2]);

    // Get light data
    const light = this.getLightData();
    const normalizedDir = this.normalizeDirection(light.direction);
    gl.uniform3fv(this.uLightDirection, normalizedDir);
    gl.uniform3fv(this.uLightColor, light.color);
    gl.uniform3fv(this.uAmbientColor, this.getAmbientColor());

    // Render all solid objects
    const renderables = scene.getRenderables() as IRenderable[];
    for (const renderable of renderables) {
      this.renderObject(gl, renderable, viewProjection);
    }
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
   */
  private renderObject(
    gl: WebGL2RenderingContext,
    renderable: IRenderable,
    _viewProjection: Float32Array
  ): void {
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

    const gpuResources = this.meshGPUCache.getOrCreateSolid(
      renderable.id,
      meshData,
      this.program
    );

    // Compute model matrix from transform
    const modelMatrix = this.computeModelMatrix(renderable.transform);
    gl.uniformMatrix4fv(this.uModelMatrix, false, modelMatrix);

    // Compute normal matrix for correct lighting
    const normalMat = normalMatrix(modelMatrix);
    gl.uniformMatrix3fv(this.uNormalMatrix, false, normalMat);

    // Get material color from entity if available
    let baseColor: [number, number, number] = [0.8, 0.8, 0.8];
    const entityWithComponent = renderable as { getComponent?: <T>(type: string) => T | null };
    if (typeof entityWithComponent.getComponent === 'function') {
      const material = entityWithComponent.getComponent<IMaterialComponent>('material');
      if (material?.color) {
        baseColor = material.color;
      }
    }
    gl.uniform3fv(this.uBaseColor, baseColor);

    // Bind VAO and draw
    gl.bindVertexArray(gpuResources.vao);
    gl.drawElements(gl.TRIANGLES, gpuResources.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
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
   */
  private getLightData(): LightData {
    if (this.lightManager) {
      const light = this.lightManager.getPrimaryDirectionalLight();
      if (light) {
        return light;
      }
    }

    return {
      direction: this.defaultLightDirection,
      color: this.defaultLightColor,
      enabled: true,
    };
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
