/**
 * GridRenderer Plugin
 *
 * Renders a configurable ground grid on the XY plane at Z=0.
 * Used for spatial reference in the 3D viewport.
 *
 * Features:
 * - Procedural grid generation (no stored geometry)
 * - Major/minor line subdivisions
 * - Axis indicator lines (X=Red, Y=Green)
 * - Distance-based fade
 * - Anti-aliased lines
 * - Configurable via SettingsService
 *
 * Coordinate System: Z-up right-handed (Blender convention)
 * - Grid lies on XY plane at Z=0
 * - X axis = Red (right)
 * - Y axis = Green (forward)
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
 * Fade is based on a large fixed distance to keep grid visible when zoomed out.
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
  // Distance-based fade using camera distance from origin for better zoom behavior
  float distFromCamera = length(uCameraPosition);
  float distFromFragment = length(vWorldPosition - uCameraPosition);

  // Adaptive fade: use the larger of fixed distance or camera-based distance
  // This keeps the grid visible even when camera is far from origin
  float adaptiveFadeStart = max(uFadeDistance * 0.5, distFromCamera * 0.8);
  float adaptiveFadeEnd = max(uFadeDistance, distFromCamera * 2.0);

  float fade = 1.0 - smoothstep(adaptiveFadeStart, adaptiveFadeEnd, distFromFragment);

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
          data.property === 'lineColor' || data.property === 'axisLineColor' ||
          data.property === 'showAxisLines') {
        this.regenerateGrid();
      }
      // opacity and visible are handled at render time
    }
  }

  /**
   * Generate grid geometry based on settings.
   * Grid lies on XY plane at Z=0 (Z-up convention).
   * Grid extends from -size to +size on both X and Y axes.
   * Axis lines (red X, green Y) are always at world origin (0,0).
   */
  private generateGridGeometry(settings: GridSettings): GridLineData {
    const { size, subdivisions, lineColor, showAxisLines } = settings;

    const halfSize = size;
    const step = (size * 2) / subdivisions;

    // Parse colors - use lineColor for all grid lines
    const gridColor = this.hexToRgba(lineColor);

    // Axis colors (full opacity, always at origin)
    const xAxisColor: [number, number, number, number] = [0.9, 0.2, 0.2, 1.0]; // Red
    const yAxisColor: [number, number, number, number] = [0.2, 0.9, 0.2, 1.0]; // Green

    // Collect lines
    const positions: number[] = [];
    const colors: number[] = [];

    // Generate grid lines parallel to Y axis (vertical lines in XY plane)
    // Lines run from (x, -halfSize, 0) to (x, halfSize, 0)
    for (let i = 0; i <= subdivisions; i++) {
      const x = -halfSize + i * step;

      // Skip line at x=0 if showing axis (will be drawn as colored axis)
      if (showAxisLines && Math.abs(x) < 0.0001) continue;

      positions.push(x, -halfSize, 0);
      positions.push(x, halfSize, 0);
      colors.push(...gridColor, ...gridColor);
    }

    // Generate grid lines parallel to X axis (horizontal lines in XY plane)
    // Lines run from (-halfSize, y, 0) to (halfSize, y, 0)
    for (let i = 0; i <= subdivisions; i++) {
      const y = -halfSize + i * step;

      // Skip line at y=0 if showing axis (will be drawn as colored axis)
      if (showAxisLines && Math.abs(y) < 0.0001) continue;

      positions.push(-halfSize, y, 0);
      positions.push(halfSize, y, 0);
      colors.push(...gridColor, ...gridColor);
    }

    // Add axis indicator lines if enabled - ALWAYS at world origin (0,0)
    if (showAxisLines) {
      // X axis (red) - runs along X direction at Y=0, Z=0
      positions.push(-halfSize, 0, 0);
      positions.push(halfSize, 0, 0);
      colors.push(...xAxisColor, ...xAxisColor);

      // Y axis (green) - runs along Y direction at X=0, Z=0
      positions.push(0, -halfSize, 0);
      positions.push(0, halfSize, 0);
      colors.push(...yAxisColor, ...yAxisColor);
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
