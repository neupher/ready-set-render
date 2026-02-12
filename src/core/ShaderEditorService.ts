/**
 * ShaderEditorService - Live shader editing lifecycle manager
 *
 * Coordinates the shader editing workflow: opening a shader for editing,
 * debounced compilation, error recovery, and program caching. Acts as the
 * bridge between the UI editor, AssetRegistry, and ForwardRenderer.
 *
 * Key features:
 * - Debounced compilation (300ms) prevents compile spam during typing
 * - Error recovery: keeps the last working program on failure
 * - Program cache: compiled WebGLPrograms keyed by shader UUID
 * - EventBus integration for reactive updates
 *
 * Events emitted:
 * - `shader:editing` - A shader has been opened for editing
 * - `shader:compilationResult` - Compilation attempt completed (success or failure)
 * - `shader:programUpdated` - A new compiled program is available for rendering
 * - `shader:closed` - The shader editor has been closed
 *
 * @example
 * ```typescript
 * const service = new ShaderEditorService({
 *   gl,
 *   eventBus,
 *   assetRegistry,
 * });
 *
 * // Open a shader for editing
 * service.openShader('shader-uuid');
 *
 * // Update source (triggers debounced compilation)
 * service.updateSource('fragment', newFragmentSource);
 *
 * // Get compiled program for renderer
 * const program = service.getCompiledProgram('shader-uuid');
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { AssetRegistry } from '@core/assets/AssetRegistry';
import type { IShaderAsset } from '@core/assets/interfaces/IShaderAsset';
import {
  ShaderCompilationService,
  type IShaderCompilationResult,
  type IShaderError,
} from '@core/assets/ShaderCompilationService';

/**
 * Shader stage type: vertex or fragment.
 */
export type ShaderStage = 'vertex' | 'fragment';

/**
 * Compilation status for UI display.
 */
export type CompilationStatus = 'idle' | 'compiling' | 'success' | 'error';

/**
 * Event data emitted when a shader is opened for editing.
 */
export interface ShaderEditingEvent {
  readonly shaderUUID: string;
  readonly shader: IShaderAsset;
}

/**
 * Event data emitted after a compilation attempt.
 */
export interface ShaderCompilationEvent {
  readonly shaderUUID: string;
  readonly result: IShaderCompilationResult;
  readonly stage?: ShaderStage;
}

/**
 * Event data emitted when a compiled program is updated in the cache.
 */
export interface ShaderProgramUpdatedEvent {
  readonly shaderUUID: string;
  readonly program: WebGLProgram;
}

/**
 * Cached program entry with uniform location metadata.
 */
interface CachedProgram {
  readonly program: WebGLProgram;
  readonly uniformLocations: Map<string, WebGLUniformLocation | null>;
}

/**
 * Configuration options for ShaderEditorService.
 */
export interface ShaderEditorServiceOptions {
  readonly gl: WebGL2RenderingContext;
  readonly eventBus: EventBus;
  readonly assetRegistry: AssetRegistry;
  readonly compilationService?: ShaderCompilationService;
}

/**
 * Service for managing the live shader editing lifecycle.
 */
export class ShaderEditorService {
  private readonly gl: WebGL2RenderingContext;
  private readonly eventBus: EventBus;
  private readonly assetRegistry: AssetRegistry;
  private readonly compilationService: ShaderCompilationService;

  /** Currently active shader UUID being edited */
  private activeShaderUUID: string | null = null;

  /** Working copies of shader source (may differ from saved asset) */
  private workingVertexSource: string = '';
  private workingFragmentSource: string = '';

  /** Debounce timer for compilation */
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Debounce delay in milliseconds */
  private readonly debounceDelay: number;

  /** Compiled program cache: shader UUID → CachedProgram */
  private readonly programCache: Map<string, CachedProgram> = new Map();

  /** Current compilation status */
  private _status: CompilationStatus = 'idle';

  /** Latest compilation errors */
  private _errors: IShaderError[] = [];

  /** Whether working sources have unsaved changes */
  private _isDirty: boolean = false;

  /**
   * Create a new ShaderEditorService.
   *
   * @param options - Service configuration
   */
  constructor(options: ShaderEditorServiceOptions) {
    this.gl = options.gl;
    this.eventBus = options.eventBus;
    this.assetRegistry = options.assetRegistry;
    this.compilationService =
      options.compilationService ?? new ShaderCompilationService(options.gl);
    this.debounceDelay = 300;
  }

  /**
   * Current compilation status.
   */
  get status(): CompilationStatus {
    return this._status;
  }

  /**
   * Latest compilation errors (empty array if no errors).
   */
  get errors(): readonly IShaderError[] {
    return this._errors;
  }

  /**
   * Whether the working source differs from the saved asset.
   */
  get isDirty(): boolean {
    return this._isDirty;
  }

  /**
   * UUID of the currently active shader being edited, or null.
   */
  get activeShader(): string | null {
    return this.activeShaderUUID;
  }

  /**
   * Current working vertex shader source.
   */
  get vertexSource(): string {
    return this.workingVertexSource;
  }

  /**
   * Current working fragment shader source.
   */
  get fragmentSource(): string {
    return this.workingFragmentSource;
  }

  /**
   * Open a shader asset for editing.
   *
   * Loads the shader's source code into the working buffers and
   * compiles it immediately to populate the program cache.
   *
   * @param shaderUUID - UUID of the shader asset to edit
   * @returns True if the shader was opened successfully
   */
  openShader(shaderUUID: string): boolean {
    const shader = this.assetRegistry.get<IShaderAsset>(shaderUUID);
    if (!shader || shader.type !== 'shader') {
      console.warn(`ShaderEditorService: Shader not found: ${shaderUUID}`);
      return false;
    }

    // Close any previously open shader
    if (this.activeShaderUUID) {
      this.closeShader();
    }

    this.activeShaderUUID = shaderUUID;
    this.workingVertexSource = shader.vertexSource;
    this.workingFragmentSource = shader.fragmentSource;
    this._isDirty = false;
    this._errors = [];
    this._status = 'idle';

    // Compile immediately to populate cache
    this.compileNow();

    this.eventBus.emit<ShaderEditingEvent>('shader:editing', {
      shaderUUID,
      shader,
    });

    return true;
  }

  /**
   * Close the current shader editor session.
   * Clears working buffers but preserves the compiled program in cache.
   */
  closeShader(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    const closedUUID = this.activeShaderUUID;
    this.activeShaderUUID = null;
    this.workingVertexSource = '';
    this.workingFragmentSource = '';
    this._isDirty = false;
    this._errors = [];
    this._status = 'idle';

    if (closedUUID) {
      this.eventBus.emit('shader:closed', { shaderUUID: closedUUID });
    }
  }

  /**
   * Update shader source code for a given stage.
   * Triggers debounced compilation automatically.
   *
   * @param stage - Which shader stage to update ('vertex' or 'fragment')
   * @param source - The new GLSL source code
   */
  updateSource(stage: ShaderStage, source: string): void {
    if (!this.activeShaderUUID) {
      console.warn('ShaderEditorService: No shader is currently open for editing');
      return;
    }

    if (stage === 'vertex') {
      this.workingVertexSource = source;
    } else {
      this.workingFragmentSource = source;
    }

    this._isDirty = true;
    this._status = 'compiling';
    this.scheduleCompilation();
  }

  /**
   * Save the current working sources back to the shader asset.
   * Only works for non-built-in shaders.
   *
   * @returns True if the save was successful
   */
  saveShader(): boolean {
    if (!this.activeShaderUUID) {
      return false;
    }

    const shader = this.assetRegistry.get<IShaderAsset>(this.activeShaderUUID);
    if (!shader || shader.isBuiltIn) {
      console.warn('ShaderEditorService: Cannot save built-in shader');
      return false;
    }

    shader.vertexSource = this.workingVertexSource;
    shader.fragmentSource = this.workingFragmentSource;
    this.assetRegistry.notifyModified(this.activeShaderUUID, 'source');

    this._isDirty = false;
    return true;
  }

  /**
   * Revert working sources back to the saved asset state.
   *
   * @returns True if the revert was successful
   */
  revertShader(): boolean {
    if (!this.activeShaderUUID) {
      return false;
    }

    const shader = this.assetRegistry.get<IShaderAsset>(this.activeShaderUUID);
    if (!shader) {
      return false;
    }

    this.workingVertexSource = shader.vertexSource;
    this.workingFragmentSource = shader.fragmentSource;
    this._isDirty = false;

    // Recompile with reverted sources
    this.compileNow();

    return true;
  }

  /**
   * Get a compiled WebGL program from the cache.
   * Used by the renderer to draw entities with custom shaders.
   *
   * @param shaderUUID - UUID of the shader asset
   * @returns The compiled WebGLProgram, or null if not cached
   */
  getCompiledProgram(shaderUUID: string): WebGLProgram | null {
    return this.programCache.get(shaderUUID)?.program ?? null;
  }

  /**
   * Get cached uniform locations for a compiled shader program.
   *
   * @param shaderUUID - UUID of the shader asset
   * @returns Map of uniform names to locations, or null if not cached
   */
  getUniformLocations(shaderUUID: string): Map<string, WebGLUniformLocation | null> | null {
    return this.programCache.get(shaderUUID)?.uniformLocations ?? null;
  }

  /**
   * Compile a shader asset and cache the result.
   * Can be called for any shader, not just the active one.
   *
   * @param shaderUUID - UUID of the shader to compile
   * @returns The compilation result
   */
  compileShader(shaderUUID: string): IShaderCompilationResult {
    const shader = this.assetRegistry.get<IShaderAsset>(shaderUUID);
    if (!shader || shader.type !== 'shader') {
      return {
        success: false,
        errors: [{ type: 'link', message: `Shader not found: ${shaderUUID}` }],
      };
    }

    const result = this.compilationService.compile(shader);

    if (result.success && result.program) {
      this.cacheProgram(shaderUUID, result.program, shader);
    }

    return result;
  }

  /**
   * Pre-compile all registered shader assets and cache the programs.
   * Called during initialization to populate the cache for built-in shaders.
   */
  compileAllRegistered(): void {
    const shaders = this.assetRegistry.getByType<IShaderAsset>('shader');
    for (const shader of shaders) {
      this.compileShader(shader.uuid);
    }
  }

  /**
   * Check if a compiled program exists in the cache.
   *
   * @param shaderUUID - UUID of the shader asset
   * @returns True if a compiled program is cached
   */
  hasCachedProgram(shaderUUID: string): boolean {
    return this.programCache.has(shaderUUID);
  }

  /**
   * Remove a compiled program from the cache and delete the WebGL resource.
   *
   * @param shaderUUID - UUID of the shader to evict
   */
  evictProgram(shaderUUID: string): void {
    const cached = this.programCache.get(shaderUUID);
    if (cached) {
      this.gl.deleteProgram(cached.program);
      this.programCache.delete(shaderUUID);
    }
  }

  /**
   * Dispose all cached programs and clean up resources.
   */
  dispose(): void {
    this.closeShader();

    for (const [uuid] of this.programCache) {
      this.evictProgram(uuid);
    }

    this.programCache.clear();
  }

  /**
   * Schedule a debounced compilation of the working sources.
   */
  private scheduleCompilation(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.compileNow();
    }, this.debounceDelay);
  }

  /**
   * Immediately compile the current working sources.
   */
  private compileNow(): void {
    if (!this.activeShaderUUID) {
      return;
    }

    this._status = 'compiling';
    const shaderUUID = this.activeShaderUUID;

    const result = this.compilationService.compileFromSources(
      this.workingVertexSource,
      this.workingFragmentSource,
    );

    if (result.success && result.program) {
      this._status = 'success';
      this._errors = [];

      // Look up the shader for uniform metadata
      const shader = this.assetRegistry.get<IShaderAsset>(shaderUUID);
      this.cacheProgram(shaderUUID, result.program, shader ?? undefined);

      this.eventBus.emit<ShaderProgramUpdatedEvent>('shader:programUpdated', {
        shaderUUID,
        program: result.program,
      });
    } else {
      this._status = 'error';
      this._errors = result.errors ?? [];
      // Keep the last working program in cache (error recovery)
    }

    this.eventBus.emit<ShaderCompilationEvent>('shader:compilationResult', {
      shaderUUID,
      result,
    });
  }

  /**
   * Cache a compiled program with its uniform locations.
   * Disposes any previously cached program for the same UUID.
   *
   * @param shaderUUID - UUID of the shader
   * @param program - The compiled WebGL program
   * @param shader - Optional shader asset for uniform location lookup
   */
  private cacheProgram(
    shaderUUID: string,
    program: WebGLProgram,
    shader?: IShaderAsset,
  ): void {
    // Dispose old program if it exists
    const old = this.programCache.get(shaderUUID);
    if (old && old.program !== program) {
      this.gl.deleteProgram(old.program);
    }

    // Build uniform locations map
    const uniformLocations = new Map<string, WebGLUniformLocation | null>();

    if (shader) {
      // Map user-declared uniforms from the shader asset
      for (const uniform of shader.uniforms) {
        uniformLocations.set(
          uniform.name,
          this.gl.getUniformLocation(program, uniform.name),
        );
      }
    }

    // Always look up common transform/lighting uniforms
    const commonUniforms = [
      'uModelMatrix',
      'uViewProjectionMatrix',
      'uNormalMatrix',
      'uCameraPosition',
      'uLightDirections',
      'uLightColors',
      'uLightCount',
      'uAmbientColor',
    ];

    for (const name of commonUniforms) {
      if (!uniformLocations.has(name)) {
        uniformLocations.set(name, this.gl.getUniformLocation(program, name));
      }
    }

    this.programCache.set(shaderUUID, { program, uniformLocations });
  }
}
