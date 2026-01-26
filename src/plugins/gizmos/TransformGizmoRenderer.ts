/**
 * TransformGizmoRenderer - Renders Transform Gizmos for Selected Entities
 *
 * Renders translate, rotate, and scale gizmos on selected entities.
 * Gizmos are rendered after the main scene with depth testing disabled
 * so they are always visible on top of scene geometry.
 *
 * Features:
 * - Screen-space constant size (gizmo stays same size regardless of distance)
 * - Per-vertex coloring for axis identification
 * - Depth disabled for always-on-top rendering
 * - Support for translate, rotate, and scale modes
 *
 * @example
 * ```typescript
 * const renderer = new TransformGizmoRenderer({ gl, eventBus });
 * renderer.initialize();
 *
 * // In render loop after main scene:
 * if (selectedEntity) {
 *   renderer.render(camera, selectedEntity, 'translate', hoveredAxis);
 * }
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { ICamera } from '@core/interfaces';
import type { GizmoMode, GizmoAxis, IGizmo } from './interfaces';
import { TranslateGizmo } from './TranslateGizmo';
import { RotateGizmo } from './RotateGizmo';
import { ScaleGizmo } from './ScaleGizmo';

/**
 * Configuration for TransformGizmoRenderer.
 */
export interface TransformGizmoRendererConfig {
  gl: WebGL2RenderingContext;
  eventBus: EventBus;
}

/**
 * Vertex shader for gizmo rendering.
 * Supports per-vertex colors and view-projection transformation.
 */
const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aColor;

uniform mat4 uViewProjectionMatrix;

out vec3 vColor;

void main() {
  vColor = aColor;
  gl_Position = uViewProjectionMatrix * vec4(aPosition, 1.0);
}
`;

/**
 * Fragment shader for gizmo rendering.
 * Simple pass-through for vertex colors.
 */
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vColor;

out vec4 outColor;

void main() {
  outColor = vec4(vColor, 1.0);
}
`;

/**
 * Renders transform gizmos for selected entities.
 */
export class TransformGizmoRenderer {
  private readonly gl: WebGL2RenderingContext;

  // Shader program
  private program: WebGLProgram | null = null;
  private uViewProjectionMatrix: WebGLUniformLocation | null = null;

  // Geometry buffers
  private vao: WebGLVertexArrayObject | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private colorBuffer: WebGLBuffer | null = null;

  // Gizmo instances
  private translateGizmo: IGizmo;
  private rotateGizmo: IGizmo;
  private scaleGizmo: IGizmo;

  // State
  private initialized = false;

  constructor(config: TransformGizmoRendererConfig) {
    this.gl = config.gl;
    // eventBus is available via config but not currently used
    // It could be used for future event-based features

    // Create gizmo instances
    this.translateGizmo = new TranslateGizmo();
    this.rotateGizmo = new RotateGizmo();
    this.scaleGizmo = new ScaleGizmo();
  }

  /**
   * Initialize shader program and buffers.
   */
  initialize(): void {
    if (this.initialized) return;

    const gl = this.gl;

    // Create shader program
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    this.uViewProjectionMatrix = gl.getUniformLocation(this.program, 'uViewProjectionMatrix');

    // Create VAO and buffers
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Position buffer
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    const aPosition = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

    // Color buffer
    this.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    const aColor = gl.getAttribLocation(this.program, 'aColor');
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    this.initialized = true;
  }

  /**
   * Render a transform gizmo for an entity.
   *
   * @param camera - The camera for view-projection matrix
   * @param position - World position of the gizmo
   * @param mode - Gizmo mode (translate, rotate, scale)
   * @param hoveredAxis - Currently hovered axis for highlighting
   * @param rotation - Optional rotation in Euler angles (degrees) for local space gizmos
   */
  render(
    camera: ICamera,
    position: [number, number, number],
    mode: GizmoMode,
    hoveredAxis: GizmoAxis,
    _rotation?: [number, number, number]
  ): void {
    if (!this.initialized || !this.program) return;

    const gl = this.gl;

    // Get the appropriate gizmo for the current mode
    const gizmo = this.getGizmoForMode(mode);
    if (!gizmo) return;

    // Calculate screen-space scale factor for constant size
    const scale = this.calculateScreenScale(camera, position);

    // Generate gizmo geometry
    const geometry = gizmo.generateGeometry(position, scale, hoveredAxis);

    // Disable depth testing so gizmo renders on top
    gl.disable(gl.DEPTH_TEST);

    // Use shader program
    gl.useProgram(this.program);

    // Set view-projection matrix
    const viewProjection = camera.getViewProjectionMatrix();
    gl.uniformMatrix4fv(this.uViewProjectionMatrix, false, viewProjection);

    // Update buffers with geometry data
    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.colors, gl.DYNAMIC_DRAW);

    // Draw gizmo
    gl.drawArrays(geometry.drawMode, 0, geometry.vertexCount);

    gl.bindVertexArray(null);

    // Re-enable depth testing
    gl.enable(gl.DEPTH_TEST);
  }

  /**
   * Get the gizmo instance for a given mode.
   */
  getGizmoForMode(mode: GizmoMode): IGizmo | null {
    switch (mode) {
      case 'translate':
        return this.translateGizmo;
      case 'rotate':
        return this.rotateGizmo;
      case 'scale':
        return this.scaleGizmo;
      default:
        return null;
    }
  }

  /**
   * Calculate screen-space scale factor for constant gizmo size.
   * This ensures the gizmo appears the same size on screen regardless of distance.
   */
  private calculateScreenScale(camera: ICamera, position: [number, number, number]): number {
    // Get camera position from view matrix
    const viewMatrix = camera.getViewMatrix();

    // Extract camera position (inverse of translation in view matrix)
    const cameraPos: [number, number, number] = [
      -(viewMatrix[0] * viewMatrix[12] + viewMatrix[1] * viewMatrix[13] + viewMatrix[2] * viewMatrix[14]),
      -(viewMatrix[4] * viewMatrix[12] + viewMatrix[5] * viewMatrix[13] + viewMatrix[6] * viewMatrix[14]),
      -(viewMatrix[8] * viewMatrix[12] + viewMatrix[9] * viewMatrix[13] + viewMatrix[10] * viewMatrix[14]),
    ];

    // Calculate distance from camera to gizmo position
    const dx = position[0] - cameraPos[0];
    const dy = position[1] - cameraPos[1];
    const dz = position[2] - cameraPos[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Scale factor based on distance (larger distance = larger scale)
    // The multiplier controls the screen size of the gizmo
    const baseScale = 0.15;
    return distance * baseScale;
  }

  /**
   * Dispose of GPU resources.
   */
  dispose(): void {
    const gl = this.gl;

    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.colorBuffer) gl.deleteBuffer(this.colorBuffer);
    if (this.program) gl.deleteProgram(this.program);

    this.initialized = false;
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
