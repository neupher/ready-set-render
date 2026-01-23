/**
 * Cube Primitive
 *
 * A basic cube primitive that implements IEntity and IMeshProvider.
 * Provides geometry data for renderers - does NOT manage GPU resources.
 *
 * GPU resources are managed centrally by MeshGPUCache in the renderers.
 * This separation allows:
 * - Multiple primitives (Cube, Sphere, etc.) without duplicating GPU code
 * - Importers (OBJ, GLTF) to use the same rendering infrastructure
 * - Clean entity lifecycle (no GPU cleanup needed in primitives)
 */

import type {
  IRenderable,
  Transform,
  IComponent,
  IEntity,
  IMeshComponent,
  IMaterialComponent,
  IMeshData,
  IEdgeData,
  IMeshProvider,
  ICloneable,
} from '@core/interfaces';
import { createDefaultTransform, cloneEntityBase } from '@core/interfaces';
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
 * A cube primitive that provides geometry data.
 * Vertices define a unit cube centered at origin.
 * Implements IMeshProvider for renderer integration.
 */
export class Cube implements IRenderable, IEntity, IMeshProvider, ICloneable {
  readonly id: string;
  readonly entityId: number;
  name: string;
  parent: IRenderable | null = null;
  children: IRenderable[] = [];
  transform: Transform;

  private readonly components: Map<string, IComponent> = new Map();

  // Cached geometry data
  private meshData: IMeshData;
  private edgeData: IEdgeData;

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

    // Build geometry data once in constructor
    this.meshData = this.buildMeshData();
    this.edgeData = this.buildEdgeData();

    // Initialize components
    this.initializeComponents();
  }

  // =========================================
  // IMeshProvider Implementation
  // =========================================

  /**
   * Get the mesh data for solid rendering.
   * Returns cached geometry - no allocation on each call.
   */
  getMeshData(): IMeshData {
    return this.meshData;
  }

  /**
   * Get edge data for wireframe rendering.
   * Returns cached edge geometry - no allocation on each call.
   */
  getEdgeData(): IEdgeData {
    return this.edgeData;
  }

  // =========================================
  // IRenderable Implementation (legacy)
  // =========================================

  /**
   * Legacy render method - now handled by ForwardRenderer.
   * Kept for interface compatibility but does nothing.
   * @deprecated Use ForwardRenderer which reads getMeshData() instead
   */
  render(_gl: WebGL2RenderingContext, _viewProjection: Float32Array): void {
    // No-op: Rendering is now handled by ForwardRenderer using getMeshData()
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
  // Geometry Data (Internal)
  // =========================================

  /**
   * Build mesh data for solid rendering.
   * 6 faces × 4 vertices = 24 vertices (for correct per-face normals)
   */
  private buildMeshData(): IMeshData {
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

    return {
      positions,
      normals,
      indices,
      bounds: {
        min: [-0.5, -0.5, -0.5],
        max: [0.5, 0.5, 0.5],
      },
    };
  }

  /**
   * Build edge data for wireframe rendering.
   * 12 edges connecting the 8 corners of the cube.
   */
  private buildEdgeData(): IEdgeData {
    // 8 vertices of a unit cube centered at origin
    const vertices = [
      [-0.5, -0.5, 0.5],  // v0 - front bottom left
      [0.5, -0.5, 0.5],   // v1 - front bottom right
      [0.5, 0.5, 0.5],    // v2 - front top right
      [-0.5, 0.5, 0.5],   // v3 - front top left
      [-0.5, -0.5, -0.5], // v4 - back bottom left
      [0.5, -0.5, -0.5],  // v5 - back bottom right
      [0.5, 0.5, -0.5],   // v6 - back top right
      [-0.5, 0.5, -0.5],  // v7 - back top left
    ];

    // 12 edges defined as pairs of vertex indices
    const edges = [
      // Front face edges
      [0, 1], [1, 2], [2, 3], [3, 0],
      // Back face edges
      [4, 5], [5, 6], [6, 7], [7, 4],
      // Side edges connecting front and back
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    // Expand edges to line vertices
    const lineVertices = new Float32Array(edges.length * 6);
    for (let i = 0; i < edges.length; i++) {
      const [v0, v1] = edges[i];
      const offset = i * 6;
      lineVertices[offset + 0] = vertices[v0][0];
      lineVertices[offset + 1] = vertices[v0][1];
      lineVertices[offset + 2] = vertices[v0][2];
      lineVertices[offset + 3] = vertices[v1][0];
      lineVertices[offset + 4] = vertices[v1][1];
      lineVertices[offset + 5] = vertices[v1][2];
    }

    return {
      lineVertices,
      lineCount: edges.length,
    };
  }

/**
   * Initialize default components for the cube.
   */
  private initializeComponents(): void {
    // Mesh component
    const meshComponent: IMeshComponent = {
      type: 'mesh',
      vertexCount: 24, // For solid rendering
      edgeCount: 12,
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
  // ICloneable Implementation
  // =========================================

  /**
   * Create a deep copy of this Cube.
   */
  clone(): Cube {
    const cloned = new Cube(undefined, this.name);
    cloneEntityBase(this, cloned);
    cloned.setRenderMode(this.renderMode);
    return cloned;
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
