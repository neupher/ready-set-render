/**
 * Viewport Gizmo Renderer
 *
 * Renders an orientation indicator (coordinate gizmo) in the bottom-left corner
 * of the viewport. Shows the current camera orientation with colored XYZ axes.
 *
 * Features:
 * - Always visible in a fixed screen position (bottom-left)
 * - Rotates to match the current camera view
 * - Color-coded axes: X=Red, Y=Green, Z=Blue
 * - Axis labels at the end of each arrow
 * - Z-up coordinate system visualization
 *
 * @example
 * ```typescript
 * const gizmo = new ViewportGizmoRenderer(gl);
 * gizmo.initialize();
 *
 * // In render loop after main scene:
 * gizmo.render(camera, viewportWidth, viewportHeight);
 * ```
 */

import type { ICamera } from '@core/interfaces';

/**
 * Vertex shader for the orientation gizmo.
 * Applies camera rotation (not translation) and projects to a fixed screen position.
 */
const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aColor;

uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec2 uScreenOffset;
uniform float uSize;

out vec3 vColor;

void main() {
  // Extract rotation from view matrix (upper-left 3x3)
  mat3 viewRotation = mat3(uViewMatrix);

  // Rotate the gizmo position to match camera orientation
  vec3 rotatedPos = viewRotation * aPosition;

  // Scale the gizmo
  rotatedPos *= uSize;

  // Project with orthographic-like behavior
  // Keep Z for depth testing within the gizmo itself
  vec4 projected = uProjectionMatrix * vec4(rotatedPos, 1.0);

  // Override XY to fixed screen position (bottom-left corner)
  // NDC coordinates: (-1,-1) is bottom-left, (1,1) is top-right
  gl_Position = vec4(
    uScreenOffset.x + rotatedPos.x * 0.15,
    uScreenOffset.y + rotatedPos.y * 0.15,
    -0.99, // Very close to near plane so it draws on top
    1.0
  );

  vColor = aColor;
}
`;

/**
 * Fragment shader for the orientation gizmo.
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
 * Configuration for ViewportGizmoRenderer.
 */
export interface ViewportGizmoConfig {
  /** Size of the gizmo in normalized units. Default: 0.5 */
  size?: number;
  /** Screen offset from bottom-left in NDC. Default: [-0.85, -0.75] */
  screenOffset?: [number, number];
}

/**
 * Renders an orientation gizmo showing XYZ axes in the viewport corner.
 */
export class ViewportGizmoRenderer {
  private readonly gl: WebGL2RenderingContext;

  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private vbo: WebGLBuffer | null = null;

  // Uniform locations
  private uViewMatrix: WebGLUniformLocation | null = null;
  private uProjectionMatrix: WebGLUniformLocation | null = null;
  private uScreenOffset: WebGLUniformLocation | null = null;
  private uSize: WebGLUniformLocation | null = null;

  // Configuration
  private size: number;
  private screenOffset: [number, number];

  // Geometry
  private vertexCount = 0;

  private initialized = false;

  /**
   * Create a new ViewportGizmoRenderer.
   *
   * @param gl - WebGL2 rendering context
   * @param config - Optional configuration
   */
  constructor(gl: WebGL2RenderingContext, config?: ViewportGizmoConfig) {
    this.gl = gl;
    this.size = config?.size ?? 0.3;
    this.screenOffset = config?.screenOffset ?? [-0.85, -0.85];
  }

  /**
   * Initialize shaders and geometry.
   */
  initialize(): void {
    if (this.initialized) return;

    const gl = this.gl;

    // Create shader program
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);

    // Cache uniform locations
    this.uViewMatrix = gl.getUniformLocation(this.program, 'uViewMatrix');
    this.uProjectionMatrix = gl.getUniformLocation(this.program, 'uProjectionMatrix');
    this.uScreenOffset = gl.getUniformLocation(this.program, 'uScreenOffset');
    this.uSize = gl.getUniformLocation(this.program, 'uSize');

    // Create axis geometry
    this.createGeometry();

    this.initialized = true;
  }

  /**
   * Render the orientation gizmo.
   *
   * @param camera - Current camera for view matrix
   */
  render(camera: ICamera): void {
    if (!this.initialized || !this.program) return;

    const gl = this.gl;

    // Save current state
    const depthTestEnabled = gl.isEnabled(gl.DEPTH_TEST);
    const cullFaceEnabled = gl.isEnabled(gl.CULL_FACE);

    // Set up rendering state
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    // Use gizmo shader
    gl.useProgram(this.program);

    // Set uniforms
    gl.uniformMatrix4fv(this.uViewMatrix, false, camera.getViewMatrix());
    gl.uniformMatrix4fv(this.uProjectionMatrix, false, camera.getProjectionMatrix());
    gl.uniform2fv(this.uScreenOffset, this.screenOffset);
    gl.uniform1f(this.uSize, this.size);

    // Draw the axes
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.LINES, 0, this.vertexCount);
    gl.bindVertexArray(null);

    // Restore state
    if (depthTestEnabled) gl.enable(gl.DEPTH_TEST);
    if (cullFaceEnabled) gl.enable(gl.CULL_FACE);
  }

  /**
   * Update the screen offset position.
   */
  setScreenOffset(x: number, y: number): void {
    this.screenOffset = [x, y];
  }

  /**
   * Update the gizmo size.
   */
  setSize(size: number): void {
    this.size = size;
  }

  /**
   * Dispose of GPU resources.
   */
  dispose(): void {
    const gl = this.gl;

    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.vbo) gl.deleteBuffer(this.vbo);
    if (this.program) gl.deleteProgram(this.program);

    this.vao = null;
    this.vbo = null;
    this.program = null;
    this.initialized = false;
  }

  /**
   * Create the axis geometry with colors.
   * Interleaved format: position (3) + color (3) per vertex.
   *
   * Z-up coordinate system:
   * - X axis: Red, points right
   * - Y axis: Green, points forward
   * - Z axis: Blue, points up
   */
  private createGeometry(): void {
    const gl = this.gl;

    // Axis length
    const axisLength = 1.0;

    // Colors for each axis
    const RED: [number, number, number] = [1.0, 0.3, 0.3];
    const GREEN: [number, number, number] = [0.3, 1.0, 0.3];
    const BLUE: [number, number, number] = [0.4, 0.6, 1.0];

    // Build vertex data: position (x,y,z) + color (r,g,b) per vertex
    const vertices: number[] = [];

    // Helper to add a line segment
    const addLine = (
      x1: number, y1: number, z1: number,
      x2: number, y2: number, z2: number,
      color: [number, number, number]
    ) => {
      vertices.push(x1, y1, z1, ...color);
      vertices.push(x2, y2, z2, ...color);
    };

    // X axis (Red) - points right (+X)
    addLine(0, 0, 0, axisLength, 0, 0, RED);

    // Y axis (Green) - points forward (+Y)
    addLine(0, 0, 0, 0, axisLength, 0, GREEN);

    // Z axis (Blue) - points up (+Z)
    addLine(0, 0, 0, 0, 0, axisLength, BLUE);

    this.vertexCount = vertices.length / 6; // 6 floats per vertex (pos + color)

    // Create VAO and VBO
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Position attribute (location 0)
    const aPosition = gl.getAttribLocation(this.program!, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 24, 0); // 24 = 6 floats * 4 bytes

    // Color attribute (location 1)
    const aColor = gl.getAttribLocation(this.program!, 'aColor');
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 24, 12); // offset 12 = 3 floats * 4 bytes

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
