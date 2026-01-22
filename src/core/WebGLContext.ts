/**
 * WebGLContext - WebGL2 Context Management
 *
 * Manages the WebGL2 rendering context, shader compilation,
 * program linking, and GL state tracking.
 *
 * @example
 * ```typescript
 * const canvas = document.querySelector('canvas');
 * const context = new WebGLContext(canvas);
 *
 * const program = context.createProgram(vertexShaderSource, fragmentShaderSource);
 * context.useProgram(program);
 * ```
 */

/**
 * Shader compilation error with detailed information.
 */
export class ShaderCompilationError extends Error {
  constructor(
    public readonly shaderType: 'vertex' | 'fragment',
    public readonly source: string,
    public readonly log: string
  ) {
    super(`${shaderType} shader compilation failed: ${log}`);
    this.name = 'ShaderCompilationError';
  }
}

/**
 * Program linking error with detailed information.
 */
export class ProgramLinkError extends Error {
  constructor(public readonly log: string) {
    super(`Program linking failed: ${log}`);
    this.name = 'ProgramLinkError';
  }
}

/**
 * WebGL2 context wrapper with utility methods.
 * Provides shader compilation, program creation, and state management.
 */
export class WebGLContext {
  private readonly gl: WebGL2RenderingContext;
  private currentProgram: WebGLProgram | null = null;
  private currentVAO: WebGLVertexArrayObject | null = null;

  /**
   * Create a new WebGLContext from a canvas element.
   *
   * @param canvas - The canvas element to get the context from
   * @param options - Optional WebGL context attributes
   * @throws Error if WebGL2 is not supported
   */
  constructor(
    canvas: HTMLCanvasElement,
    options?: WebGLContextAttributes
  ) {
    const gl = canvas.getContext('webgl2', options);

    if (!gl) {
      throw new Error(
        'WebGL2 is not supported. Please use a modern browser.'
      );
    }

    this.gl = gl;
    this.setupDefaults();
  }

  /**
   * Set up default WebGL state.
   */
  private setupDefaults(): void {
    const { gl } = this;

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);

    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clearDepth(1.0);
  }

  /**
   * Get the underlying WebGL2 rendering context.
   *
   * @returns The WebGL2 rendering context
   */
  getGL(): WebGL2RenderingContext {
    return this.gl;
  }

  /**
   * Get the canvas element.
   *
   * @returns The canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.gl.canvas as HTMLCanvasElement;
  }

  /**
   * Compile a shader from source.
   *
   * @param source - The GLSL shader source code
   * @param type - The shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
   * @returns The compiled shader
   * @throws ShaderCompilationError if compilation fails
   */
  compileShader(source: string, type: number): WebGLShader {
    const { gl } = this;

    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader object');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) || 'Unknown error';
      gl.deleteShader(shader);

      const shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
      throw new ShaderCompilationError(shaderType, source, log);
    }

    return shader;
  }

  /**
   * Create a shader program from vertex and fragment shader sources.
   *
   * @param vertexSource - The vertex shader GLSL source
   * @param fragmentSource - The fragment shader GLSL source
   * @returns The linked shader program
   * @throws ShaderCompilationError if shader compilation fails
   * @throws ProgramLinkError if program linking fails
   */
  createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const { gl } = this;

    const vertexShader = this.compileShader(vertexSource, gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentSource, gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error('Failed to create program object');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // Shaders can be deleted after linking
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) || 'Unknown error';
      gl.deleteProgram(program);
      throw new ProgramLinkError(log);
    }

    return program;
  }

  /**
   * Use a shader program.
   * Tracks current program to avoid redundant state changes.
   *
   * @param program - The program to use, or null to unbind
   */
  useProgram(program: WebGLProgram | null): void {
    if (this.currentProgram !== program) {
      this.gl.useProgram(program);
      this.currentProgram = program;
    }
  }

  /**
   * Bind a vertex array object.
   * Tracks current VAO to avoid redundant state changes.
   *
   * @param vao - The VAO to bind, or null to unbind
   */
  bindVAO(vao: WebGLVertexArrayObject | null): void {
    if (this.currentVAO !== vao) {
      this.gl.bindVertexArray(vao);
      this.currentVAO = vao;
    }
  }

  /**
   * Create a vertex array object.
   *
   * @returns A new VAO
   * @throws Error if VAO creation fails
   */
  createVAO(): WebGLVertexArrayObject {
    const vao = this.gl.createVertexArray();
    if (!vao) {
      throw new Error('Failed to create vertex array object');
    }
    return vao;
  }

  /**
   * Create a buffer.
   *
   * @returns A new buffer
   * @throws Error if buffer creation fails
   */
  createBuffer(): WebGLBuffer {
    const buffer = this.gl.createBuffer();
    if (!buffer) {
      throw new Error('Failed to create buffer');
    }
    return buffer;
  }

  /**
   * Get a uniform location from a program.
   *
   * @param program - The shader program
   * @param name - The uniform name
   * @returns The uniform location, or null if not found
   */
  getUniformLocation(
    program: WebGLProgram,
    name: string
  ): WebGLUniformLocation | null {
    return this.gl.getUniformLocation(program, name);
  }

  /**
   * Get an attribute location from a program.
   *
   * @param program - The shader program
   * @param name - The attribute name
   * @returns The attribute location (-1 if not found)
   */
  getAttribLocation(program: WebGLProgram, name: string): number {
    return this.gl.getAttribLocation(program, name);
  }

  /**
   * Resize the viewport to match canvas dimensions.
   *
   * @param width - The new width in pixels
   * @param height - The new height in pixels
   */
  resize(width: number, height: number): void {
    const { gl } = this;
    const canvas = gl.canvas as HTMLCanvasElement;

    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }

  /**
   * Clear the color and depth buffers.
   *
   * @param color - Optional clear color [r, g, b, a] (0-1 range)
   */
  clear(color?: [number, number, number, number]): void {
    const { gl } = this;

    if (color) {
      gl.clearColor(color[0], color[1], color[2], color[3]);
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /**
   * Get the current drawing buffer dimensions.
   *
   * @returns Object with width and height
   */
  getDrawingBufferSize(): { width: number; height: number } {
    return {
      width: this.gl.drawingBufferWidth,
      height: this.gl.drawingBufferHeight,
    };
  }

  /**
   * Check for WebGL errors.
   * Useful for debugging.
   *
   * @returns The error code, or gl.NO_ERROR if none
   */
  getError(): number {
    return this.gl.getError();
  }

  /**
   * Check if there's an active WebGL error.
   *
   * @returns True if there's an error
   */
  hasError(): boolean {
    return this.gl.getError() !== this.gl.NO_ERROR;
  }
}
