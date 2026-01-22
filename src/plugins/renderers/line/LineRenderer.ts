/**
 * Line Renderer Plugin
 *
 * A forward render pipeline that draws objects as wireframe lines.
 * Implements IRenderPipeline for the plugin system.
 */

import type {
  IRenderPipeline,
  IPluginContext,
  ICamera,
  IScene,
  IRenderable,
} from '@core/interfaces';

/**
 * Vertex shader source for basic line rendering.
 * Transforms vertices by MVP matrix.
 */
const VERTEX_SHADER = `#version 300 es
precision mediump float;

in vec3 aPosition;

uniform mat4 uModelViewProjection;

void main() {
  gl_Position = uModelViewProjection * vec4(aPosition, 1.0);
}
`;

/**
 * Fragment shader source for basic line rendering.
 * Outputs solid white color.
 */
const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform vec3 uColor;

out vec4 outColor;

void main() {
  outColor = vec4(uColor, 1.0);
}
`;

/**
 * Line Renderer - A forward render pipeline for wireframe rendering.
 *
 * Renders all IRenderable objects in the scene as wireframe lines.
 * Uses a simple vertex/fragment shader pair for basic visualization.
 *
 * @example
 * ```typescript
 * const lineRenderer = new LineRenderer();
 * pluginManager.register(lineRenderer);
 * await pluginManager.initialize('line-renderer');
 *
 * // In render loop:
 * lineRenderer.beginFrame(camera);
 * lineRenderer.render(scene);
 * lineRenderer.endFrame();
 * ```
 */
export class LineRenderer implements IRenderPipeline {
  readonly id = 'line-renderer';
  readonly name = 'Line Renderer';
  readonly version = '1.0.0';
  readonly type = 'forward' as const;

  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private colorLocation: WebGLUniformLocation | null = null;
  private currentCamera: ICamera | null = null;
  private lineColor: [number, number, number] = [1, 1, 1];
  private initialized = false;

  /**
   * Initialize the line renderer.
   * Compiles shaders and creates the rendering program.
   *
   * @param context - The plugin context containing gl and eventBus
   */
  async initialize(context: IPluginContext): Promise<void> {
    this.gl = context.gl;

    // Compile and link shaders
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);

    // Cache uniform location for color
    this.colorLocation = this.gl.getUniformLocation(this.program, 'uColor');

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
    this.colorLocation = null;
    this.initialized = false;
  }

  /**
   * Begin a new render frame.
   * Clears the screen and stores the camera.
   *
   * @param camera - The camera to render from
   */
  beginFrame(camera: ICamera): void {
    if (!this.gl || !this.initialized) return;

    this.currentCamera = camera;

    // Clear the framebuffer
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  /**
   * Render all objects in the scene.
   * Uses polymorphism - calls render() on each IRenderable.
   *
   * @param scene - The scene to render
   */
  render(scene: IScene): void {
    if (!this.gl || !this.program || !this.currentCamera || !this.initialized) {
      return;
    }

    const gl = this.gl;

    // Get view-projection matrix from camera
    const viewProjection = this.currentCamera.getViewProjectionMatrix();

    // Use our shader program
    gl.useProgram(this.program);

    // Set line color
    if (this.colorLocation) {
      gl.uniform3fv(this.colorLocation, this.lineColor);
    }

    // Render all objects using polymorphism
    const renderables = scene.getRenderables() as IRenderable[];
    for (const renderable of renderables) {
      renderable.render(gl, viewProjection);
    }
  }

  /**
   * End the render frame.
   * Currently no-op for forward rendering.
   */
  endFrame(): void {
    this.currentCamera = null;
  }

  /**
   * Handle viewport resize.
   *
   * @param width - New width in pixels
   * @param height - New height in pixels
   */
  resize(width: number, height: number): void {
    if (this.gl) {
      this.gl.viewport(0, 0, width, height);
    }
  }

  /**
   * Set the line color for rendering.
   *
   * @param r - Red component (0-1)
   * @param g - Green component (0-1)
   * @param b - Blue component (0-1)
   */
  setLineColor(r: number, g: number, b: number): void {
    this.lineColor = [r, g, b];
  }

  /**
   * Get the shader program.
   * Used by primitives to initialize their GPU resources.
   *
   * @returns The WebGL program, or null if not initialized
   */
  getProgram(): WebGLProgram | null {
    return this.program;
  }

  /**
   * Check if the renderer is initialized.
   *
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
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
