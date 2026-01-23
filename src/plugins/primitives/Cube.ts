/**
 * Cube Primitive
 *
 * A basic cube primitive that implements IRenderable and IEntity.
 * Supports both wireframe (LineRenderer) and solid (ForwardRenderer) rendering.
 * Implements Entity Component System for property display.
 *
 * Property editing is handled centrally by PropertyChangeHandler,
 * which manipulates the transform and components directly.
 */

import type {
  IRenderable,
  Transform,
  IComponent,
  IEntity,
  IMeshComponent,
  IMaterialComponent,
  IInitializable,
} from '@core/interfaces';
import { createDefaultTransform } from '@core/interfaces';
import type { IPrimitiveFactory } from './interfaces/IPrimitiveFactory';
import { EntityIdGenerator } from '@utils/EntityIdGenerator';
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
import type { Mat3 } from '@utils/math';

/**
 * Render mode for the cube.
 */
export type RenderMode = 'wireframe' | 'solid' | 'both';

/**
 * A cube primitive with wireframe and solid rendering capability.
 * Vertices define the 8 corners of a unit cube centered at origin.
 * Supports both GL_LINES (wireframe) and GL_TRIANGLES (solid) rendering.
 * Implements IEntity for component-based property display.
 */
export class Cube implements IRenderable, IEntity, IInitializable {
  readonly id: string;
  readonly entityId: number;
  name: string;
  parent: IRenderable | null = null;
  children: IRenderable[] = [];
  transform: Transform;

  private readonly components: Map<string, IComponent> = new Map();

  // Geometry data
  private readonly vertices: Float32Array;
  private readonly edges: Uint16Array;
  private readonly triangleVertices: Float32Array;
  private readonly triangleNormals: Float32Array;
  private readonly triangleIndices: Uint16Array;

  // GPU resources for wireframe
  private gl: WebGL2RenderingContext | null = null;
  private wireframeVao: WebGLVertexArrayObject | null = null;
  private wireframeVbo: WebGLBuffer | null = null;
  private wireframeProgram: WebGLProgram | null = null;
  private wireframeMvpLocation: WebGLUniformLocation | null = null;

  // GPU resources for solid rendering
  private solidVao: WebGLVertexArrayObject | null = null;
  private solidVbo: WebGLBuffer | null = null;
  private solidNormalVbo: WebGLBuffer | null = null;
  private solidEbo: WebGLBuffer | null = null;
  private solidProgram: WebGLProgram | null = null;

  // Render mode
  private renderMode: RenderMode = 'solid';

  /**
   * Create a new Cube.
   *
   * @param id - Unique identifier (defaults to random UUID)
   * @param name - Display name (defaults to 'Cube')
   */
  constructor(id?: string, name?: string) {
    this.id = id ?? crypto.randomUUID();
    this.entityId = EntityIdGenerator.next();
    this.name = name ?? 'Cube';
    this.transform = createDefaultTransform();

    // 8 vertices of a unit cube centered at origin (for wireframe)
    this.vertices = new Float32Array([
      // Front face
      -0.5, -0.5, 0.5, // v0 - front bottom left
      0.5, -0.5, 0.5, // v1 - front bottom right
      0.5, 0.5, 0.5, // v2 - front top right
      -0.5, 0.5, 0.5, // v3 - front top left

      // Back face
      -0.5, -0.5, -0.5, // v4 - back bottom left
      0.5, -0.5, -0.5, // v5 - back bottom right
      0.5, 0.5, -0.5, // v6 - back top right
      -0.5, 0.5, -0.5, // v7 - back top left
    ]);

    // 12 edges defined as pairs of vertex indices (for wireframe)
    this.edges = new Uint16Array([
      // Front face edges
      0, 1, 1, 2, 2, 3, 3, 0,
      // Back face edges
      4, 5, 5, 6, 6, 7, 7, 4,
      // Side edges connecting front and back
      0, 4, 1, 5, 2, 6, 3, 7,
    ]);

    // Build solid geometry (24 vertices for proper normals per face)
    const { positions, normals, indices } = this.buildSolidGeometry();
    this.triangleVertices = positions;
    this.triangleNormals = normals;
    this.triangleIndices = indices;

    // Initialize components
    this.initializeComponents();
  }

  /**
   * Build solid geometry with proper normals for each face.
   * Each face has 4 vertices (not shared) so normals are correct.
   */
  private buildSolidGeometry(): {
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint16Array;
  } {
    // 6 faces × 4 vertices = 24 vertices
    const positions = new Float32Array([
      // Front face (+Z)
      -0.5, -0.5, 0.5,
      0.5, -0.5, 0.5,
      0.5, 0.5, 0.5,
      -0.5, 0.5, 0.5,

      // Back face (-Z)
      0.5, -0.5, -0.5,
      -0.5, -0.5, -0.5,
      -0.5, 0.5, -0.5,
      0.5, 0.5, -0.5,

      // Top face (+Y)
      -0.5, 0.5, 0.5,
      0.5, 0.5, 0.5,
      0.5, 0.5, -0.5,
      -0.5, 0.5, -0.5,

      // Bottom face (-Y)
      -0.5, -0.5, -0.5,
      0.5, -0.5, -0.5,
      0.5, -0.5, 0.5,
      -0.5, -0.5, 0.5,

      // Right face (+X)
      0.5, -0.5, 0.5,
      0.5, -0.5, -0.5,
      0.5, 0.5, -0.5,
      0.5, 0.5, 0.5,

      // Left face (-X)
      -0.5, -0.5, -0.5,
      -0.5, -0.5, 0.5,
      -0.5, 0.5, 0.5,
      -0.5, 0.5, -0.5,
    ]);

    // Normals for each vertex (same for all 4 vertices of each face)
    const normals = new Float32Array([
      // Front face (+Z)
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,

      // Back face (-Z)
      0, 0, -1,
      0, 0, -1,
      0, 0, -1,
      0, 0, -1,

      // Top face (+Y)
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,

      // Bottom face (-Y)
      0, -1, 0,
      0, -1, 0,
      0, -1, 0,
      0, -1, 0,

      // Right face (+X)
      1, 0, 0,
      1, 0, 0,
      1, 0, 0,
      1, 0, 0,

      // Left face (-X)
      -1, 0, 0,
      -1, 0, 0,
      -1, 0, 0,
      -1, 0, 0,
    ]);

    // Indices for 12 triangles (2 per face, 6 faces)
    const indices = new Uint16Array([
      // Front face
      0, 1, 2, 0, 2, 3,
      // Back face
      4, 5, 6, 4, 6, 7,
      // Top face
      8, 9, 10, 8, 10, 11,
      // Bottom face
      12, 13, 14, 12, 14, 15,
      // Right face
      16, 17, 18, 16, 18, 19,
      // Left face
      20, 21, 22, 20, 22, 23,
    ]);

    return { positions, normals, indices };
  }

  /**
   * Initialize default components for the cube.
   */
  private initializeComponents(): void {
    // Mesh component
    const meshComponent: IMeshComponent = {
      type: 'mesh',
      vertexCount: 24, // For solid rendering
      edgeCount: this.edges.length / 2,
      triangleCount: 12, // 6 faces × 2 triangles
      doubleSided: false,
    };
    this.components.set('mesh', meshComponent);

    // Material component
    const materialComponent: IMaterialComponent = {
      type: 'material',
      shaderName: 'ForwardShader',
      color: [0.8, 0.8, 0.8], // Default gray
      opacity: 1,
      transparent: false,
    };
    this.components.set('material', materialComponent);
  }

  // =========================================
  // IEntity Implementation
  // =========================================

  getComponents(): IComponent[] {
    return Array.from(this.components.values());
  }

  getComponent<T extends IComponent>(type: string): T | null {
    const component = this.components.get(type);
    return component ? (component as T) : null;
  }

  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  // =========================================
  // Geometry Accessors
  // =========================================

  getVertices(): Float32Array {
    return this.vertices;
  }

  getEdges(): Uint16Array {
    return this.edges;
  }

  getTriangleVertices(): Float32Array {
    return this.triangleVertices;
  }

  getTriangleNormals(): Float32Array {
    return this.triangleNormals;
  }

  getTriangleIndices(): Uint16Array {
    return this.triangleIndices;
  }

  getVertexCount(): number {
    return this.vertices.length / 3;
  }

  getEdgeCount(): number {
    return this.edges.length / 2;
  }

  getTriangleCount(): number {
    return this.triangleIndices.length / 3;
  }

  // =========================================
  // Render Mode
  // =========================================

  getRenderMode(): RenderMode {
    return this.renderMode;
  }

  setRenderMode(mode: RenderMode): void {
    this.renderMode = mode;
  }

  // =========================================
  // Transform
  // =========================================

  /**
   * Compute the model matrix from the transform.
   */
  getModelMatrix(): Float32Array {
    const { position, rotation, scale } = this.transform;

    // Build model matrix: Translation × RotationZ × RotationY × RotationX × Scale
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
   * Get the normal matrix for lighting calculations.
   */
  getNormalMatrix(): Mat3 {
    return normalMatrix(this.getModelMatrix());
  }

  // =========================================
  // GPU Resource Initialization
  // =========================================

  /**
   * Initialize GPU resources for wireframe rendering.
   * Called by LineRenderer.
   */
  initializeGPUResources(
    gl: WebGL2RenderingContext,
    program: WebGLProgram
  ): void {
    this.gl = gl;
    this.wireframeProgram = program;

    // Convert edge indices to actual vertex positions for GL_LINES
    const lineVerts = this.buildLineVertices();

    // Create wireframe VAO
    this.wireframeVao = gl.createVertexArray();
    if (!this.wireframeVao) {
      throw new Error('Failed to create wireframe VAO for Cube');
    }

    gl.bindVertexArray(this.wireframeVao);

    // Create and fill wireframe VBO
    this.wireframeVbo = gl.createBuffer();
    if (!this.wireframeVbo) {
      throw new Error('Failed to create wireframe VBO for Cube');
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.wireframeVbo);
    gl.bufferData(gl.ARRAY_BUFFER, lineVerts, gl.STATIC_DRAW);

    // Set up vertex attribute
    const aPositionLoc = gl.getAttribLocation(program, 'aPosition');
    if (aPositionLoc >= 0) {
      gl.enableVertexAttribArray(aPositionLoc);
      gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);
    }

    // Cache MVP uniform location
    this.wireframeMvpLocation = gl.getUniformLocation(
      program,
      'uModelViewProjection'
    );

    // Unbind
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Initialize GPU resources for solid rendering.
   * Called by ForwardRenderer.
   */
  initializeSolidGPUResources(
    gl: WebGL2RenderingContext,
    program: WebGLProgram
  ): void {
    this.gl = gl;
    this.solidProgram = program;

    // Create solid VAO
    this.solidVao = gl.createVertexArray();
    if (!this.solidVao) {
      throw new Error('Failed to create solid VAO for Cube');
    }

    gl.bindVertexArray(this.solidVao);

    // Create and fill position VBO
    this.solidVbo = gl.createBuffer();
    if (!this.solidVbo) {
      throw new Error('Failed to create solid VBO for Cube');
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.solidVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.triangleVertices, gl.STATIC_DRAW);

    const aPositionLoc = gl.getAttribLocation(program, 'aPosition');
    if (aPositionLoc >= 0) {
      gl.enableVertexAttribArray(aPositionLoc);
      gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);
    }

    // Create and fill normal VBO
    this.solidNormalVbo = gl.createBuffer();
    if (!this.solidNormalVbo) {
      throw new Error('Failed to create solid normal VBO for Cube');
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.solidNormalVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.triangleNormals, gl.STATIC_DRAW);

    const aNormalLoc = gl.getAttribLocation(program, 'aNormal');
    if (aNormalLoc >= 0) {
      gl.enableVertexAttribArray(aNormalLoc);
      gl.vertexAttribPointer(aNormalLoc, 3, gl.FLOAT, false, 0, 0);
    }

    // Create and fill index buffer
    this.solidEbo = gl.createBuffer();
    if (!this.solidEbo) {
      throw new Error('Failed to create solid EBO for Cube');
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.solidEbo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.triangleIndices, gl.STATIC_DRAW);

    // Unbind VAO (but keep EBO bound to VAO)
    gl.bindVertexArray(null);
  }

  /**
   * Build line vertices from edge indices.
   * Expands edge pairs into actual vertex positions for GL_LINES.
   */
  private buildLineVertices(): Float32Array {
    const { vertices, edges } = this;
    const lineVerts = new Float32Array(edges.length * 3);

    for (let i = 0; i < edges.length; i++) {
      const vertexIndex = edges[i];
      lineVerts[i * 3 + 0] = vertices[vertexIndex * 3 + 0];
      lineVerts[i * 3 + 1] = vertices[vertexIndex * 3 + 1];
      lineVerts[i * 3 + 2] = vertices[vertexIndex * 3 + 2];
    }

    return lineVerts;
  }

  // =========================================
  // Rendering
  // =========================================

  /**
   * Render this cube as wireframe.
   * Called by LineRenderer.
   */
  render(gl: WebGL2RenderingContext, viewProjection: Float32Array): void {
    if (!this.wireframeVao || !this.wireframeProgram) {
      return;
    }

    // Compute MVP matrix
    const model = this.getModelMatrix();
    const mvp = mat4Multiply(viewProjection, model);

    // Draw
    gl.useProgram(this.wireframeProgram);

    if (this.wireframeMvpLocation) {
      gl.uniformMatrix4fv(this.wireframeMvpLocation, false, mvp);
    }

    gl.bindVertexArray(this.wireframeVao);
    gl.drawArrays(gl.LINES, 0, this.edges.length);
    gl.bindVertexArray(null);
  }

  /**
   * Render this cube as solid geometry.
   * Called by ForwardRenderer.
   */
  renderSolid(gl: WebGL2RenderingContext): void {
    if (!this.solidVao) {
      return;
    }

    gl.bindVertexArray(this.solidVao);
    gl.drawElements(gl.TRIANGLES, this.triangleIndices.length, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  // =========================================
  // Lifecycle
  // =========================================

  /**
   * Check if GPU resources have been initialized.
   * Returns true if either wireframe or solid resources are ready.
   */
  isInitialized(): boolean {
    return this.wireframeVao !== null || this.solidVao !== null;
  }

  /**
   * Check if wireframe GPU resources are initialized.
   */
  isWireframeInitialized(): boolean {
    return this.wireframeVao !== null && this.wireframeProgram !== null;
  }

  /**
   * Check if solid GPU resources are initialized.
   */
  isSolidInitialized(): boolean {
    return this.solidVao !== null && this.solidProgram !== null;
  }

  /**
   * Dispose GPU resources.
   */
  dispose(): void {
    if (this.gl) {
      // Dispose wireframe resources
      if (this.wireframeVao) {
        this.gl.deleteVertexArray(this.wireframeVao);
        this.wireframeVao = null;
      }
      if (this.wireframeVbo) {
        this.gl.deleteBuffer(this.wireframeVbo);
        this.wireframeVbo = null;
      }

      // Dispose solid resources
      if (this.solidVao) {
        this.gl.deleteVertexArray(this.solidVao);
        this.solidVao = null;
      }
      if (this.solidVbo) {
        this.gl.deleteBuffer(this.solidVbo);
        this.solidVbo = null;
      }
      if (this.solidNormalVbo) {
        this.gl.deleteBuffer(this.solidNormalVbo);
        this.solidNormalVbo = null;
      }
      if (this.solidEbo) {
        this.gl.deleteBuffer(this.solidEbo);
        this.solidEbo = null;
      }
    }

    this.gl = null;
    this.wireframeProgram = null;
    this.wireframeMvpLocation = null;
    this.solidProgram = null;
  }
}

/**
 * Factory for creating Cube primitives.
 * Implements IPrimitiveFactory for registration with PrimitiveRegistry.
 */
export class CubeFactory implements IPrimitiveFactory {
  readonly type = 'Cube';
  readonly category = 'Mesh' as const;
  readonly icon = 'cube';

  /**
   * Create a new Cube instance.
   *
   * @param name - Optional name for the cube
   * @returns A new Cube instance
   */
  create(name?: string): Cube {
    return new Cube(undefined, name);
  }
}
