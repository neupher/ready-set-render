/**
 * ShaderCompilationService - Service for compiling shader assets
 *
 * Provides shader compilation, validation, and error reporting for the
 * shader editor and asset system.
 *
 * @example
 * ```typescript
 * const service = new ShaderCompilationService(gl);
 *
 * const result = service.compile(shaderAsset);
 * if (result.success) {
 *   // Use result.program
 * } else {
 *   // Display result.errors
 * }
 * ```
 */

import type { IShaderAsset } from './interfaces/IShaderAsset';

/**
 * Type of shader error.
 */
export type ShaderErrorType = 'vertex' | 'fragment' | 'link';

/**
 * Parsed shader compilation error.
 */
export interface IShaderError {
  /**
   * Which shader stage caused the error.
   */
  readonly type: ShaderErrorType;

  /**
   * Line number in the shader source (if available).
   */
  readonly line?: number;

  /**
   * Error message from the GPU driver.
   */
  readonly message: string;

  /**
   * The source code line that caused the error (if available).
   */
  readonly sourceSnippet?: string;
}

/**
 * Result of shader compilation.
 */
export interface IShaderCompilationResult {
  /**
   * Whether compilation and linking succeeded.
   */
  readonly success: boolean;

  /**
   * The compiled WebGL program (only present on success).
   */
  readonly program?: WebGLProgram;

  /**
   * Compilation errors (only present on failure).
   */
  readonly errors?: IShaderError[];

  /**
   * Warnings from compilation (present even on success).
   */
  readonly warnings?: IShaderError[];
}

/**
 * Service for compiling shader assets to WebGL programs.
 */
export class ShaderCompilationService {
  private gl: WebGL2RenderingContext;

  /**
   * Create a new ShaderCompilationService.
   *
   * @param gl - The WebGL2 rendering context
   */
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Compile a shader asset into a WebGL program.
   *
   * @param shader - The shader asset to compile
   * @returns Compilation result with program or errors
   */
  compile(shader: IShaderAsset): IShaderCompilationResult {
    return this.compileFromSources(shader.vertexSource, shader.fragmentSource);
  }

  /**
   * Compile vertex and fragment shader sources into a WebGL program.
   *
   * @param vertexSource - The vertex shader GLSL source
   * @param fragmentSource - The fragment shader GLSL source
   * @returns Compilation result with program or errors
   */
  compileFromSources(vertexSource: string, fragmentSource: string): IShaderCompilationResult {
    const gl = this.gl;
    const errors: IShaderError[] = [];

    // Compile vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!vertexShader) {
      return {
        success: false,
        errors: [{ type: 'vertex', message: 'Failed to create vertex shader object' }],
      };
    }

    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(vertexShader) ?? 'Unknown error';
      gl.deleteShader(vertexShader);
      errors.push(...this.parseShaderErrors('vertex', log, vertexSource));
      return { success: false, errors };
    }

    // Compile fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShader) {
      gl.deleteShader(vertexShader);
      return {
        success: false,
        errors: [{ type: 'fragment', message: 'Failed to create fragment shader object' }],
      };
    }

    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(fragmentShader) ?? 'Unknown error';
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      errors.push(...this.parseShaderErrors('fragment', log, fragmentSource));
      return { success: false, errors };
    }

    // Link program
    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return {
        success: false,
        errors: [{ type: 'link', message: 'Failed to create program object' }],
      };
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // Shaders can be deleted after linking
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? 'Unknown link error';
      gl.deleteProgram(program);
      errors.push(...this.parseLinkErrors(log));
      return { success: false, errors };
    }

    return { success: true, program };
  }

  /**
   * Validate shader source without creating a persistent program.
   * Useful for live validation in the shader editor.
   *
   * @param shader - The shader asset to validate
   * @returns Compilation result (program is deleted after validation)
   */
  validate(shader: IShaderAsset): IShaderCompilationResult {
    const result = this.compile(shader);

    // Clean up the program if validation succeeded
    if (result.success && result.program) {
      this.gl.deleteProgram(result.program);
      return { success: true };
    }

    return result;
  }

  /**
   * Validate shader sources without creating a persistent program.
   *
   * @param vertexSource - The vertex shader GLSL source
   * @param fragmentSource - The fragment shader GLSL source
   * @returns Compilation result (program is deleted after validation)
   */
  validateSources(vertexSource: string, fragmentSource: string): IShaderCompilationResult {
    const result = this.compileFromSources(vertexSource, fragmentSource);

    // Clean up the program if validation succeeded
    if (result.success && result.program) {
      this.gl.deleteProgram(result.program);
      return { success: true };
    }

    return result;
  }

  /**
   * Parse shader compilation errors from the error log.
   *
   * GPU driver error messages vary, but typically follow the format:
   * ERROR: 0:42: 'foo' : undeclared identifier
   *
   * @param type - The shader type (vertex or fragment)
   * @param log - The shader info log
   * @param source - The shader source code for context
   * @returns Array of parsed errors
   */
  private parseShaderErrors(
    type: 'vertex' | 'fragment',
    log: string,
    source: string
  ): IShaderError[] {
    const errors: IShaderError[] = [];
    const lines = log.split('\n');
    const sourceLines = source.split('\n');

    // Common error formats:
    // ERROR: 0:42: message
    // ERROR: column:line: message
    // line:column: ERROR: message
    const errorRegex = /(?:ERROR:\s*)?(?:(\d+):)?(\d+):\s*(.+)/i;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const match = trimmed.match(errorRegex);
      if (match) {
        const lineNum = parseInt(match[2], 10);
        const message = match[3] ?? trimmed;

        const error: IShaderError = {
          type,
          message: message.trim(),
        };

        if (!isNaN(lineNum) && lineNum > 0) {
          (error as { line: number }).line = lineNum;

          // Get source snippet if available
          if (lineNum <= sourceLines.length) {
            (error as { sourceSnippet: string }).sourceSnippet = sourceLines[lineNum - 1];
          }
        }

        errors.push(error);
      } else {
        // Unrecognized format, add as-is
        errors.push({
          type,
          message: trimmed,
        });
      }
    }

    // If no errors were parsed, add the entire log as a single error
    if (errors.length === 0 && log.trim()) {
      errors.push({
        type,
        message: log.trim(),
      });
    }

    return errors;
  }

  /**
   * Parse linker errors from the program info log.
   *
   * @param log - The program info log
   * @returns Array of parsed errors
   */
  private parseLinkErrors(log: string): IShaderError[] {
    const errors: IShaderError[] = [];
    const lines = log.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      errors.push({
        type: 'link',
        message: trimmed,
      });
    }

    // If no errors were parsed, add the entire log as a single error
    if (errors.length === 0 && log.trim()) {
      errors.push({
        type: 'link',
        message: log.trim(),
      });
    }

    return errors;
  }

  /**
   * Get uniform locations for a compiled program.
   *
   * @param program - The compiled WebGL program
   * @param shader - The shader asset with uniform declarations
   * @returns Map of uniform names to locations
   */
  getUniformLocations(
    program: WebGLProgram,
    shader: IShaderAsset
  ): Map<string, WebGLUniformLocation | null> {
    const locations = new Map<string, WebGLUniformLocation | null>();
    const gl = this.gl;

    for (const uniform of shader.uniforms) {
      locations.set(uniform.name, gl.getUniformLocation(program, uniform.name));
    }

    return locations;
  }

  /**
   * Delete a compiled program.
   *
   * @param program - The program to delete
   */
  deleteProgram(program: WebGLProgram): void {
    this.gl.deleteProgram(program);
  }
}
