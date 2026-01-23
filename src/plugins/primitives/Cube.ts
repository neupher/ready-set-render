/**
 * Cube Primitive
 *
 * A basic cube primitive that implements IRenderable and IEntity.
 * Used for testing the line renderer and as a building block for scenes.
 * Supports the Entity Component System for property display.
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
} from '@utils/math';

/**
 * A cube primitive with wireframe rendering capability.
 * Vertices define the 8 corners of a unit cube centered at origin.
 * Edges define the 12 wireframe lines.
 * Implements IEntity for component-based property display.
 *
 * Note: No IPropertyEditable implementation needed - PropertyChangeHandler
 * handles transforms and component properties centrally for all entities.
 */
export class Cube implements IRenderable, IEntity, IInitializable {
  readonly id: string;
  readonly entityId: number;
  name: string;
  parent: IRenderable | null = null;
  children: IRenderable[] = [];
  transform: Transform;

  private readonly vertices: Float32Array;
  private readonly edges: Uint16Array;
  private readonly components: Map<string, IComponent> = new Map();

  private gl: WebGL2RenderingContext | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private vbo: WebGLBuffer | null = null;
  private program: WebGLProgram | null = null;
  private mvpLocation: WebGLUniformLocation | null = null;

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

    // 8 vertices of a unit cube centered at origin
    this.vertices = new Float32Array([
      // Front face
      -0.5, -0.5,  0.5, // v0 - front bottom left
       0.5, -0.5,  0.5, // v1 - front bottom right
       0.5,  0.5,  0.5, // v2 - front top right
      -0.5,  0.5,  0.5, // v3 - front top left

      // Back face
      -0.5, -0.5, -0.5, // v4 - back bottom left
       0.5, -0.5, -0.5, // v5 - back bottom right
       0.5,  0.5, -0.5, // v6 - back top right
      -0.5,  0.5, -0.5, // v7 - back top left
    ]);

    // 12 edges defined as pairs of vertex indices
    this.edges = new Uint16Array([
      // Front face edges
      0, 1,  1, 2,  2, 3,  3, 0,
      // Back face edges
      4, 5,  5, 6,  6, 7,  7, 4,
      // Side edges connecting front and back
      0, 4,  1, 5,  2, 6,  3, 7,
    ]);

    // Initialize components
    this.initializeComponents();
  }

  /**
   * Initialize default components for the cube.
   */
  private initializeComponents(): void {
    // Mesh component
    const meshComponent: IMeshComponent = {
      type: 'mesh',
      vertexCount: this.vertices.length / 3,
      edgeCount: this.edges.length / 2,
      triangleCount: 12, // 6 faces * 2 triangles
      doubleSided: false
    };
    this.components.set('mesh', meshComponent);

    // Material component
    const materialComponent: IMaterialComponent = {
      type: 'material',
      shaderName: 'LineShader',
      color: [1, 1, 1],
      opacity: 1,
      transparent: false
    };
    this.components.set('material', materialComponent);
  }

  // =========================================
  // IEntity Implementation
  // =========================================

  /**
   * Get all components attached to this entity.
   *
   * @returns Array of all components
   */
  getComponents(): IComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get a specific component by type.
   *
   * @param type - The component type to retrieve
   * @returns The component if found, null otherwise
   */
  getComponent<T extends IComponent>(type: string): T | null {
    const component = this.components.get(type);
    return component ? (component as T) : null;
  }

  /**
   * Check if this entity has a specific component type.
   *
   * @param type - The component type to check
   * @returns True if the component exists
   */
  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  /**
   * Get the raw vertex positions.
   *
   * @returns Float32Array of vertex positions (x, y, z) × 8
   */
  getVertices(): Float32Array {
    return this.vertices;
  }

  /**
   * Get the edge indices for wireframe rendering.
   *
   * @returns Uint16Array of edge pairs
   */
  getEdges(): Uint16Array {
    return this.edges;
  }

  /**
   * Get the number of vertices.
   *
   * @returns Number of vertices (8 for a cube)
   */
  getVertexCount(): number {
    return this.vertices.length / 3;
  }

  /**
   * Get the number of edges.
   *
   * @returns Number of edges (12 for a cube)
   */
  getEdgeCount(): number {
    return this.edges.length / 2;
  }

  /**
   * Compute the model matrix from the transform.
   *
   * @returns The model matrix as a Float32Array
   */
  getModelMatrix(): Float32Array {
    const { position, rotation, scale } = this.transform;

    // Build model matrix: Translation * RotationZ * RotationY * RotationX * Scale
    const t = mat4Translation(position[0], position[1], position[2]);
    const rx = mat4RotationX(degToRad(rotation[0]));
    const ry = mat4RotationY(degToRad(rotation[1]));
    const rz = mat4RotationZ(degToRad(rotation[2]));
    const s = mat4Scale(scale[0], scale[1], scale[2]);

    // Combine: T * Rz * Ry * Rx * S
    let model = mat4Multiply(t, rz);
    model = mat4Multiply(model, ry);
    model = mat4Multiply(model, rx);
    model = mat4Multiply(model, s);

    return model;
  }

  /**
   * Initialize GPU resources for rendering.
   * Called by the renderer to set up VAO, VBO.
   *
   * @param gl - The WebGL2 rendering context
   * @param program - The shader program to use
   */
  initializeGPUResources(
    gl: WebGL2RenderingContext,
    program: WebGLProgram
  ): void {
    this.gl = gl;
    this.program = program;

    // Convert edge indices to actual vertex positions for GL_LINES
    const lineVerts = this.buildLineVertices();

    // Create VAO
    this.vao = gl.createVertexArray();
    if (!this.vao) {
      throw new Error('Failed to create VAO for Cube');
    }

    gl.bindVertexArray(this.vao);

    // Create and fill VBO
    this.vbo = gl.createBuffer();
    if (!this.vbo) {
      throw new Error('Failed to create VBO for Cube');
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, lineVerts, gl.STATIC_DRAW);

    // Set up vertex attribute
    const aPositionLoc = gl.getAttribLocation(program, 'aPosition');
    if (aPositionLoc >= 0) {
      gl.enableVertexAttribArray(aPositionLoc);
      gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);
    }

    // Cache MVP uniform location
    this.mvpLocation = gl.getUniformLocation(program, 'uModelViewProjection');

    // Unbind
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
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

  /**
   * Render this cube using the given view-projection matrix.
   * Uses polymorphism - no type checking needed by the renderer.
   *
   * @param gl - The WebGL2 rendering context
   * @param viewProjection - The combined view-projection matrix
   */
  render(gl: WebGL2RenderingContext, viewProjection: Float32Array): void {
    if (!this.vao || !this.program) {
      return;
    }

    // Compute MVP matrix
    const model = this.getModelMatrix();
    const mvp = mat4Multiply(viewProjection, model);

    // Draw
    gl.useProgram(this.program);

    if (this.mvpLocation) {
      gl.uniformMatrix4fv(this.mvpLocation, false, mvp);
    }

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.LINES, 0, this.edges.length);
    gl.bindVertexArray(null);
  }

/**
   * Check if GPU resources have been initialized.
   *
   * @returns True if GPU resources are ready for rendering
   */
  isInitialized(): boolean {
    return this.vao !== null && this.program !== null;
  }

  /**
   * Dispose GPU resources.
   */
  dispose(): void {
    if (this.gl) {
      if (this.vao) {
        this.gl.deleteVertexArray(this.vao);
        this.vao = null;
      }
      if (this.vbo) {
        this.gl.deleteBuffer(this.vbo);
        this.vbo = null;
      }
    }

    this.gl = null;
    this.program = null;
    this.mvpLocation = null;
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
