/**
 * GridRenderer Plugin
 *
 * Renders a configurable ground grid on the XY plane at Z=0.
 * Used for spatial reference in the 3D viewport.
 *
 * Features:
 * - Procedural grid generation (no stored geometry)
 * - Major/minor line subdivisions
 * - Axis indicator lines (X=Red, Y=Green, Z=Blue)
 * - Distance-based fade
 * - Anti-aliased lines
 * - Configurable via SettingsService
 *
 * Coordinate System: Z-up right-handed (Blender convention)
 * - Grid lies on XY plane at Z=0
 * - X axis = Red (right)
 * - Y axis = Green (forward)
 * - Z axis = Blue (up) - optional vertical indicator
 *
 * @example
 * ```typescript
 * const gridRenderer = new GridRenderer({
 *   gl,
 *   eventBus,
 *   settingsService,
 * });
 * gridRenderer.initialize();
 *
 * // In render loop:
 * gridRenderer.render(camera);
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { SettingsService, GridSettings } from '@core/SettingsService';
import type { ICamera } from '@core/interfaces';

/**
 * Options for GridRenderer constructor.
 */
export interface GridRendererOptions {
  /** WebGL2 rendering context */
  gl: WebGL2RenderingContext;
  /** Event bus for settings change notifications */
  eventBus: EventBus;
  /** Settings service for grid configuration */
  settingsService: SettingsService;
}

/**
 * Vertex shader for grid rendering.
 * Passes through vertex positions and colors.
 */
const GRID_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec4 aColor;

uniform mat4 uViewProjectionMatrix;

out vec4 vColor;
out vec3 vWorldPosition;

void main() {
  vColor = aColor;
  vWorldPosition = aPosition;
  gl_Position = uViewProjectionMatrix * vec4(aPosition, 1.0);
}
`;

/**
 * Fragment shader for grid rendering.
 * Applies distance-based fade and opacity.
 */
const GRID_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec4 vColor;
in vec3 vWorldPosition;

uniform vec3 uCameraPosition;
uniform float uOpacity;
uniform float uFadeDistance;

out vec4 outColor;

void main() {
  // Distance-based fade
  float dist = length(vWorldPosition - uCameraPosition);
  float fade = 1.0 - smoothstep(uFadeDistance * 0.5, uFadeDistance, dist);

  // Apply opacity and fade
  outColor = vec4(vColor.rgb, vColor.a * uOpacity * fade);
}
`;

/**
 * Grid line data for rendering.
 */
interface GridLineData {
  positions: Float32Array;
  colors: Float32Array;
  vertexCount: number;
}

/**
 * GridRenderer - Renders a configurable ground grid.
 *
 * Implements a procedural grid that regenerates when settings change.
 * Uses alpha blending for smooth line rendering with distance fade.
 */
export class GridRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly eventBus: EventBus;
  private readonly settingsService: SettingsService;

  // WebGL resources
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private colorBuffer: WebGLBuffer | null = null;

  // Uniform locations
  private uViewProjectionMatrix: WebGLUniformLocation | null = null;
  private uCameraPosition: WebGLUniformLocation | null = null;
  private uOpacity: WebGLUniformLocation | null = null;
  private uFadeDistance: WebGLUniformLocation | null = null;

  // State
  private vertexCount = 0;
  private initialized = false;

  constructor(options: GridRendererOptions) {
    this.gl = options.gl;
    this.eventBus = options.eventBus;
    this.settingsService = options.settingsService;
  }

  /**
   * Initialize the grid renderer.
   * Compiles shaders and creates initial grid geometry.
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Compile shader program
    this.program = this.createProgram(GRID_VERTEX_SHADER, GRID_FRAGMENT_SHADER);

    // Get uniform locations
    this.uViewProjectionMatrix = this.gl.getUniformLocation(this.program, 'uViewProjectionMatrix');
    this.uCameraPosition = this.gl.getUniformLocation(this.program, 'uCameraPosition');
    this.uOpacity = this.gl.getUniformLocation(this.program, 'uOpacity');
    this.uFadeDistance = this.gl.getUniformLocation(this.program, 'uFadeDistance');

    // Create VAO
    this.vao = this.gl.createVertexArray();

    // Create buffers
    this.positionBuffer = this.gl.createBuffer();
    this.colorBuffer = this.gl.createBuffer();

    // Set up VAO
    this.gl.bindVertexArray(this.vao);

    // Position attribute
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    const positionLoc = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 3, this.gl.FLOAT, false, 0, 0);

    // Color attribute
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    const colorLoc = this.gl.getAttribLocation(this.program, 'aColor');
    this.gl.enableVertexAttribArray(colorLoc);
    this.gl.vertexAttribPointer(colorLoc, 4, this.gl.FLOAT, false, 0, 0);

    this.gl.bindVertexArray(null);

    // Generate initial grid
    this.regenerateGrid();

    // Listen for settings changes
    this.eventBus.on('settings:changed', this.handleSettingsChange.bind(this));

    this.initialized = true;
  }

  /**
   * Render the grid.
   *
   * @param camera - The camera to render from
   */
  render(camera: ICamera): void {
    if (!this.initialized || !this.program || !this.vao) {
      return;
    }

    const settings = this.settingsService.get('grid');

    // Skip if grid is hidden
    if (!settings.visible) {
      return;
    }

    const gl = this.gl;

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Disable depth writing but keep depth testing
    // This allows objects to occlude the grid but grid doesn't occlude itself
    gl.depthMask(false);

    // Use grid shader
    gl.useProgram(this.program);

    // Set uniforms
    gl.uniformMatrix4fv(this.uViewProjectionMatrix, false, camera.getViewProjectionMatrix());

    const cameraPos = camera.position;
    gl.uniform3f(this.uCameraPosition, cameraPos[0], cameraPos[1], cameraPos[2]);
    gl.uniform1f(this.uOpacity, settings.opacity);
    gl.uniform1f(this.uFadeDistance, settings.size * 1.5);

    // Draw grid
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.LINES, 0, this.vertexCount);
    gl.bindVertexArray(null);

    // Restore state
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  /**
   * Force grid regeneration (useful after settings changes).
   */
  regenerateGrid(): void {
    const settings = this.settingsService.get('grid');

    const gridData = this.generateGridGeometry(settings);

    // Upload to GPU
    const gl = this.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, gridData.positions, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, gridData.colors, gl.STATIC_DRAW);

    this.vertexCount = gridData.vertexCount;
  }

  /**
   * Check if the grid is currently visible.
   */
  isVisible(): boolean {
    return this.settingsService.get('grid', 'visible');
  }

  /**
   * Toggle grid visibility.
   */
  toggleVisibility(): void {
    const current = this.settingsService.get('grid', 'visible');
    this.settingsService.set('grid', 'visible', !current);
  }

  /**
   * Dispose of GPU resources.
   */
  dispose(): void {
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }

    if (this.vao) {
      this.gl.deleteVertexArray(this.vao);
      this.vao = null;
    }

    if (this.positionBuffer) {
      this.gl.deleteBuffer(this.positionBuffer);
      this.positionBuffer = null;
    }

    if (this.colorBuffer) {
      this.gl.deleteBuffer(this.colorBuffer);
      this.colorBuffer = null;
    }

    this.initialized = false;
  }

  /**
   * Handle settings changes.
   */
  private handleSettingsChange(data: { section: string; property: string }): void {
    if (data.section === 'grid') {
      // Regenerate grid for structural changes
      if (data.property === 'size' || data.property === 'subdivisions' ||
          data.property === 'majorLineColor' || data.property === 'minorLineColor' ||
          data.property === 'showAxisLines') {
        this.regenerateGrid();
      }
      // opacity and visible are handled at render time
    }
  }

  /**
   * Generate grid geometry based on settings.
   * Grid lies on XY plane at Z=0 (Z-up convention).
   */
  private generateGridGeometry(settings: GridSettings): GridLineData {
    const { size, subdivisions, majorLineColor, minorLineColor, showAxisLines } = settings;

    const halfSize = size;
    const step = (size * 2) / subdivisions;

    // Parse colors
    const majorColor = this.hexToRgba(majorLineColor);
    const minorColor = this.hexToRgba(minorLineColor);

    // Axis colors (thicker lines, full opacity)
    const xAxisColor: [number, number, number, number] = [0.9, 0.2, 0.2, 1.0]; // Red
    const yAxisColor: [number, number, number, number] = [0.2, 0.9, 0.2, 1.0]; // Green
    const zAxisColor: [number, number, number, number] = [0.2, 0.2, 0.9, 1.0]; // Blue

    // Collect lines
    const positions: number[] = [];
    const colors: number[] = [];

    // Generate grid lines parallel to X axis (running in Y direction)
    for (let i = -subdivisions; i <= subdivisions; i++) {
      const x = i * step;
      const isMajor = i % 10 === 0;
      const isCenter = i === 0;

      // Skip center line if showing axis (will be drawn separately)
      if (isCenter && showAxisLines) continue;

      const color = isMajor ? majorColor : minorColor;

      // Line from (-halfSize, x, 0) to (halfSize, x, 0) - parallel to Y
      positions.push(-halfSize, x, 0);
      positions.push(halfSize, x, 0);
      colors.push(...color, ...color);
    }

    // Generate grid lines parallel to Y axis (running in X direction)
    for (let i = -subdivisions; i <= subdivisions; i++) {
      const y = i * step;
      const isMajor = i % 10 === 0;
      const isCenter = i === 0;

      // Skip center line if showing axis (will be drawn separately)
      if (isCenter && showAxisLines) continue;

      const color = isMajor ? majorColor : minorColor;

      // Line from (y, -halfSize, 0) to (y, halfSize, 0) - parallel to X
      positions.push(y, -halfSize, 0);
      positions.push(y, halfSize, 0);
      colors.push(...color, ...color);
    }

    // Add axis indicator lines if enabled
    if (showAxisLines) {
      // X axis (red) - runs in +X direction
      positions.push(-halfSize, 0, 0);
      positions.push(halfSize, 0, 0);
      colors.push(...xAxisColor, ...xAxisColor);

      // Y axis (green) - runs in +Y direction
      positions.push(0, -halfSize, 0);
      positions.push(0, halfSize, 0);
      colors.push(...yAxisColor, ...yAxisColor);

      // Z axis (blue) - small vertical indicator at origin
      // Only show a small portion to indicate up direction
      const zAxisLength = size * 0.1;
      positions.push(0, 0, 0);
      positions.push(0, 0, zAxisLength);
      colors.push(...zAxisColor, ...zAxisColor);
    }

    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      vertexCount: positions.length / 3,
    };
  }

  /**
   * Convert hex color string to RGBA array.
   */
  private hexToRgba(hex: string): [number, number, number, number] {
    // Remove # if present
    const cleanHex = hex.replace('#', '');

    // Parse components
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    return [r, g, b, 1.0];
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
      throw new Error('Failed to create WebGL program for GridRenderer');
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
      throw new Error(`GridRenderer program link error: ${log}`);
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
      throw new Error('Failed to create shader for GridRenderer');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`GridRenderer shader compile error: ${log}`);
    }

    return shader;
  }
}
