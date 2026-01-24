/**
 * Light Gizmo Renderer
 *
 * Renders debug visualization for light entities in the scene.
 * Shows direction arrows and icons when lights are selected.
 *
 * Features:
 * - Directional light: Sun icon (billboard) + direction arrow
 * - Uses light's color for visualization
 * - Sun icon always faces camera (billboard)
 * - Arrow follows light's actual direction from transform
 * - Only visible when light is selected
 */

import type { EventBus } from '@core/EventBus';
import type { ICamera } from '@core/interfaces';
import { isLightDirectionProvider } from '@core/interfaces';
import type { ILightComponent } from '@core/interfaces/ILightComponent';

/**
 * Configuration for LightGizmoRenderer.
 */
export interface LightGizmoRendererConfig {
  gl: WebGL2RenderingContext;
  eventBus: EventBus;
}

/**
 * Data about a light to visualize.
 */
interface LightVisualData {
  id: string;
  position: [number, number, number];
  direction: [number, number, number];
  color: [number, number, number];
  lightType: string;
}

/**
 * Billboard vertex shader - always faces camera.
 * Uses camera right/up vectors to orient vertices.
 */
const BILLBOARD_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aPosition;

uniform mat4 uViewProjectionMatrix;
uniform vec3 uWorldPosition;
uniform vec3 uCameraRight;
uniform vec3 uCameraUp;
uniform float uScale;

void main() {
  // Billboard: position vertices in camera-aligned plane
  vec3 worldPos = uWorldPosition
    + uCameraRight * aPosition.x * uScale
    + uCameraUp * aPosition.y * uScale;

  gl_Position = uViewProjectionMatrix * vec4(worldPos, 1.0);
}
`;

/**
 * Arrow vertex shader - rotates to match light direction.
 * Uses a rotation matrix derived from the light direction.
 * Arrow points in the direction light travels (from sun toward scene).
 */
const ARROW_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aPosition;

uniform mat4 uViewProjectionMatrix;
uniform vec3 uWorldPosition;
uniform vec3 uLightDirection;
uniform float uScale;

void main() {
  // Build rotation matrix to align arrow with light direction
  // Arrow geometry points along +Z, we rotate it to match light direction
  // Light direction vector points where light travels (from sun to scene)
  vec3 dir = normalize(uLightDirection);

  // Create orthonormal basis from direction
  vec3 up = abs(dir.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 right = normalize(cross(up, dir));
  up = cross(dir, right);

  // Rotation matrix - columns are the basis vectors
  // This rotates +Z to point along dir
  mat3 rotation = mat3(right, up, dir);

  // Transform vertex: rotate then scale, then translate to world position
  vec3 rotatedPos = rotation * aPosition;
  vec3 worldPos = rotatedPos * uScale + uWorldPosition;

  gl_Position = uViewProjectionMatrix * vec4(worldPos, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec3 uColor;

out vec4 outColor;

void main() {
  outColor = vec4(uColor, 1.0);
}
`;

/**
 * Renders gizmos for selected light entities.
 *
 * @example
 * ```typescript
 * const gizmoRenderer = new LightGizmoRenderer({ gl, eventBus });
 * gizmoRenderer.initialize();
 *
 * // In render loop after main scene:
 * if (selectedLight) {
 *   gizmoRenderer.render(camera, selectedLight);
 * }
 * ```
 */
export class LightGizmoRenderer {
  private readonly gl: WebGL2RenderingContext;

  // Billboard shader (for sun icon)
  private billboardProgram: WebGLProgram | null = null;
  private uBillboardViewProjection: WebGLUniformLocation | null = null;
  private uBillboardWorldPosition: WebGLUniformLocation | null = null;
  private uBillboardCameraRight: WebGLUniformLocation | null = null;
  private uBillboardCameraUp: WebGLUniformLocation | null = null;
  private uBillboardScale: WebGLUniformLocation | null = null;
  private uBillboardColor: WebGLUniformLocation | null = null;

  // Arrow shader (for direction arrow)
  private arrowProgram: WebGLProgram | null = null;
  private uArrowViewProjection: WebGLUniformLocation | null = null;
  private uArrowWorldPosition: WebGLUniformLocation | null = null;
  private uArrowLightDirection: WebGLUniformLocation | null = null;
  private uArrowScale: WebGLUniformLocation | null = null;
  private uArrowColor: WebGLUniformLocation | null = null;

  // Geometry
  private sunVAO: WebGLVertexArrayObject | null = null;
  private sunVBO: WebGLBuffer | null = null;
  private arrowVAO: WebGLVertexArrayObject | null = null;
  private arrowVBO: WebGLBuffer | null = null;

  // Geometry counts
  private sunVertexCount = 0;
  private arrowVertexCount = 0;

  private initialized = false;

  constructor(config: LightGizmoRendererConfig) {
    this.gl = config.gl;
  }

  /**
   * Initialize shaders and geometry.
   */
  initialize(): void {
    if (this.initialized) return;

    // Create billboard shader for sun icon
    this.billboardProgram = this.createProgram(BILLBOARD_VERTEX_SHADER, FRAGMENT_SHADER);
    this.uBillboardViewProjection = this.gl.getUniformLocation(this.billboardProgram, 'uViewProjectionMatrix');
    this.uBillboardWorldPosition = this.gl.getUniformLocation(this.billboardProgram, 'uWorldPosition');
    this.uBillboardCameraRight = this.gl.getUniformLocation(this.billboardProgram, 'uCameraRight');
    this.uBillboardCameraUp = this.gl.getUniformLocation(this.billboardProgram, 'uCameraUp');
    this.uBillboardScale = this.gl.getUniformLocation(this.billboardProgram, 'uScale');
    this.uBillboardColor = this.gl.getUniformLocation(this.billboardProgram, 'uColor');

    // Create arrow shader for direction arrow
    this.arrowProgram = this.createProgram(ARROW_VERTEX_SHADER, FRAGMENT_SHADER);
    this.uArrowViewProjection = this.gl.getUniformLocation(this.arrowProgram, 'uViewProjectionMatrix');
    this.uArrowWorldPosition = this.gl.getUniformLocation(this.arrowProgram, 'uWorldPosition');
    this.uArrowLightDirection = this.gl.getUniformLocation(this.arrowProgram, 'uLightDirection');
    this.uArrowScale = this.gl.getUniformLocation(this.arrowProgram, 'uScale');
    this.uArrowColor = this.gl.getUniformLocation(this.arrowProgram, 'uColor');

    // Create sun icon geometry (in XY plane, will be billboarded)
    this.createSunIconGeometry();

    // Create direction arrow geometry (points along +Z, will be rotated)
    this.createArrowGeometry();

    this.initialized = true;
  }

  /**
   * Render light gizmo for a selected light entity.
   */
  render(camera: ICamera, lightEntity: unknown): void {
    if (!this.initialized || !this.billboardProgram || !this.arrowProgram) return;

    const lightData = this.extractLightData(lightEntity);
    if (!lightData) return;

    const gl = this.gl;

    // Disable depth test so gizmo shows through objects
    gl.disable(gl.DEPTH_TEST);

    // Get view-projection matrix
    const viewProjection = camera.getViewProjectionMatrix();

    // Extract camera vectors for billboarding
    const cameraRight = this.extractCameraRight(camera);
    const cameraUp = this.extractCameraUp(camera);

    // Draw billboarded sun icon
    this.drawSunIcon(viewProjection, lightData, cameraRight, cameraUp);

    // Draw direction arrow
    this.drawDirectionArrow(viewProjection, lightData);

    // Restore depth test
    gl.enable(gl.DEPTH_TEST);
  }

  /**
   * Dispose of GPU resources.
   */
  dispose(): void {
    const gl = this.gl;

    if (this.sunVAO) gl.deleteVertexArray(this.sunVAO);
    if (this.sunVBO) gl.deleteBuffer(this.sunVBO);
    if (this.arrowVAO) gl.deleteVertexArray(this.arrowVAO);
    if (this.arrowVBO) gl.deleteBuffer(this.arrowVBO);
    if (this.billboardProgram) gl.deleteProgram(this.billboardProgram);
    if (this.arrowProgram) gl.deleteProgram(this.arrowProgram);

    this.initialized = false;
  }

  /**
   * Extract light data from an entity for visualization.
   */
  private extractLightData(entity: unknown): LightVisualData | null {
    if (!entity || typeof entity !== 'object') return null;

    const e = entity as {
      id?: string;
      transform?: { position: [number, number, number] };
      hasComponent?: (type: string) => boolean;
      getComponent?: <T>(type: string) => T | null;
    };

    if (!e.id || !e.transform || typeof e.hasComponent !== 'function') {
      return null;
    }

    if (!e.hasComponent('light')) {
      return null;
    }

    const lightComponent = e.getComponent?.('light') as ILightComponent | null;
    if (!lightComponent) return null;

    // Get direction from ILightDirectionProvider (computed from transform rotation)
    let direction: [number, number, number] = [0, -1, 0];
    if (isLightDirectionProvider(entity)) {
      direction = entity.getWorldDirection();
    }

    return {
      id: e.id,
      position: [...e.transform.position] as [number, number, number],
      direction,
      color: lightComponent.color,
      lightType: lightComponent.lightType,
    };
  }

  /**
   * Extract camera right vector from view matrix.
   */
  private extractCameraRight(camera: ICamera): [number, number, number] {
    // Camera right is the first row of the view matrix
    const viewMatrix = camera.getViewMatrix();
    return [viewMatrix[0], viewMatrix[4], viewMatrix[8]];
  }

  /**
   * Extract camera up vector from view matrix.
   */
  private extractCameraUp(camera: ICamera): [number, number, number] {
    // Camera up is the second row of the view matrix
    const viewMatrix = camera.getViewMatrix();
    return [viewMatrix[1], viewMatrix[5], viewMatrix[9]];
  }

  /**
   * Draw the billboarded sun icon at the light position.
   */
  private drawSunIcon(
    viewProjection: Float32Array,
    light: LightVisualData,
    cameraRight: [number, number, number],
    cameraUp: [number, number, number]
  ): void {
    const gl = this.gl;

    gl.useProgram(this.billboardProgram);

    gl.uniformMatrix4fv(this.uBillboardViewProjection, false, viewProjection);
    gl.uniform3fv(this.uBillboardWorldPosition, light.position);
    gl.uniform3fv(this.uBillboardCameraRight, cameraRight);
    gl.uniform3fv(this.uBillboardCameraUp, cameraUp);
    gl.uniform1f(this.uBillboardScale, 0.3);
    gl.uniform3fv(this.uBillboardColor, light.color);

    gl.bindVertexArray(this.sunVAO);
    gl.drawArrays(gl.LINES, 0, this.sunVertexCount);
    gl.bindVertexArray(null);
  }

  /**
   * Draw the direction arrow pointing in light direction.
   */
  private drawDirectionArrow(viewProjection: Float32Array, light: LightVisualData): void {
    const gl = this.gl;

    gl.useProgram(this.arrowProgram);

    gl.uniformMatrix4fv(this.uArrowViewProjection, false, viewProjection);
    gl.uniform3fv(this.uArrowWorldPosition, light.position);
    gl.uniform3fv(this.uArrowLightDirection, light.direction);
    gl.uniform1f(this.uArrowScale, 1.5);
    gl.uniform3fv(this.uArrowColor, light.color);

    gl.bindVertexArray(this.arrowVAO);
    gl.drawArrays(gl.LINES, 0, this.arrowVertexCount);
    gl.bindVertexArray(null);
  }

  /**
   * Create geometry for the sun icon (circle with rays in XY plane).
   */
  private createSunIconGeometry(): void {
    const gl = this.gl;

    const vertices: number[] = [];

    // Circle (approximated with segments)
    const segments = 16;
    const radius = 0.3;
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      vertices.push(
        Math.cos(a1) * radius, Math.sin(a1) * radius, 0,
        Math.cos(a2) * radius, Math.sin(a2) * radius, 0
      );
    }

    // Rays (8 rays extending outward)
    const rayCount = 8;
    const innerRadius = 0.4;
    const outerRadius = 0.7;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      vertices.push(
        cos * innerRadius, sin * innerRadius, 0,
        cos * outerRadius, sin * outerRadius, 0
      );
    }

    this.sunVertexCount = vertices.length / 3;

    this.sunVAO = gl.createVertexArray();
    gl.bindVertexArray(this.sunVAO);

    this.sunVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sunVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(this.billboardProgram!, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  /**
   * Create geometry for the direction arrow.
   * Arrow points along +Z axis (will be rotated to light direction in shader).
   */
  private createArrowGeometry(): void {
    const gl = this.gl;

    // Arrow pointing along +Z with arrowhead
    const vertices = [
      // Shaft from origin to +Z
      0, 0, 0,
      0, 0, 1,
      // Arrowhead (4 lines from tip)
      0, 0, 1,
      0.02, 0, 0.95,
      0, 0, 1,
      -0.02, 0, 0.95,
      0, 0, 1,
      0, 0.02, 0.95,
      0, 0, 1,
      0, -0.02, 0.95,
    ];

    this.arrowVertexCount = vertices.length / 3;

    this.arrowVAO = gl.createVertexArray();
    gl.bindVertexArray(this.arrowVAO);

    this.arrowVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.arrowVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(this.arrowProgram!, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  /**
   * Create and link a shader program.
   */
  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const gl = this.gl;

    const vertShader = this.compileShader(vertSrc, gl.VERTEX_SHADER);
    const fragShader = this.compileShader(fragSrc, gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create WebGL program');
    }

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

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
      throw new Error(`Shader compile error: ${log}`);
    }

    return shader;
  }
}
