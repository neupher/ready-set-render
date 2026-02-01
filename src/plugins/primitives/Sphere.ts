/**
 * Sphere Primitive
 *
 * A UV sphere primitive that implements IEntity and IMeshProvider.
 * Provides geometry data for renderers - does NOT manage GPU resources.
 *
 * GPU resources are managed centrally by MeshGPUCache in the renderers.
 * This is the same pattern used by Cube - only geometry data is provided.
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
import type { ISerializable } from '@core/assets/interfaces/ISerializable';
import type {
  ISerializedEntity,
  ISerializedTransform,
  ISerializedComponent,
} from '@core/assets/interfaces/ISceneAsset';
import { EntityIdGenerator } from '@utils/EntityIdGenerator';
import { generateUUID } from '@utils/uuid';
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
 * Render mode for the sphere.
 */
export type RenderMode = 'wireframe' | 'solid' | 'both';

/**
 * Configuration options for sphere generation.
 */
export interface SphereOptions {
  /** Number of horizontal segments (longitude). Default: 32 */
  segments?: number;
  /** Number of vertical rings (latitude). Default: 16 */
  rings?: number;
  /** Radius of the sphere. Default: 0.5 (unit sphere) */
  radius?: number;
}

const DEFAULT_SEGMENTS = 32;
const DEFAULT_RINGS = 16;
const DEFAULT_RADIUS = 0.5;

/**
 * A UV sphere primitive that provides geometry data.
 * Creates a sphere using latitude/longitude subdivision.
 * Implements IMeshProvider for renderer integration.
 */
export class Sphere implements IRenderable, IEntity, IMeshProvider, ICloneable, ISerializable<ISerializedEntity> {
  readonly id: string;
  readonly entityId: number;
  name: string;
  parent: IRenderable | null = null;
  children: IRenderable[] = [];
  transform: Transform;

  private readonly components: Map<string, IComponent> = new Map();

  // Sphere parameters
  private readonly segments: number;
  private readonly rings: number;
  private readonly radius: number;

  // Cached geometry data
  private meshData: IMeshData;
  private edgeData: IEdgeData;

  // Render mode
  private renderMode: RenderMode = 'solid';

  /**
   * Create a new Sphere.
   *
   * @param id - Unique identifier (defaults to random UUID)
   * @param name - Display name (defaults to 'Sphere')
   * @param options - Sphere generation options
   */
  constructor(id?: string, name?: string, options?: SphereOptions) {
    this.id = id ?? generateUUID();
    this.entityId = EntityIdGenerator.next();
    this.name = name ?? 'Sphere';
    this.transform = createDefaultTransform();

    // Store sphere parameters
    this.segments = options?.segments ?? DEFAULT_SEGMENTS;
    this.rings = options?.rings ?? DEFAULT_RINGS;
    this.radius = options?.radius ?? DEFAULT_RADIUS;

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
  // Sphere Parameters (Read-only)
  // =========================================

  getSegments(): number {
    return this.segments;
  }

  getRings(): number {
    return this.rings;
  }

  getRadius(): number {
    return this.radius;
  }

  // =========================================
  // Geometry Data (Internal)
  // =========================================

  /**
   * Build mesh data for solid rendering.
   * Uses UV sphere algorithm with latitude/longitude subdivision.
   * Z-up coordinate system: Poles along Z axis.
   */
  private buildMeshData(): IMeshData {
    const segments = this.segments;
    const rings = this.rings;
    const radius = this.radius;

    // Calculate vertex count: (rings + 1) rows of (segments + 1) vertices
    // We duplicate the first column to avoid texture seam issues
    const vertexCount = (rings + 1) * (segments + 1);
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);

    // Generate vertices (Z-up convention)
    let vertexIndex = 0;
    for (let ring = 0; ring <= rings; ring++) {
      // phi: 0 at top pole (z = +radius), PI at bottom pole (z = -radius)
      const phi = (ring / rings) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let seg = 0; seg <= segments; seg++) {
        // theta: 0 to 2*PI around the equator (in XY plane)
        const theta = (seg / segments) * Math.PI * 2;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        // Position on unit sphere (Z-up: poles along Z axis)
        const x = cosTheta * sinPhi;
        const y = sinTheta * sinPhi;
        const z = cosPhi;

        // Position (scaled by radius)
        positions[vertexIndex * 3 + 0] = x * radius;
        positions[vertexIndex * 3 + 1] = y * radius;
        positions[vertexIndex * 3 + 2] = z * radius;

        // Normal (same as position for unit sphere, just normalized)
        normals[vertexIndex * 3 + 0] = x;
        normals[vertexIndex * 3 + 1] = y;
        normals[vertexIndex * 3 + 2] = z;

        vertexIndex++;
      }
    }

    // Generate indices for triangles
    // Each quad (except at poles) becomes 2 triangles
    const triangleCount = rings * segments * 2;
    const indices = new Uint16Array(triangleCount * 3);

    let indexOffset = 0;
    for (let ring = 0; ring < rings; ring++) {
      for (let seg = 0; seg < segments; seg++) {
        // Current quad's corner indices
        const topLeft = ring * (segments + 1) + seg;
        const topRight = topLeft + 1;
        const bottomLeft = topLeft + (segments + 1);
        const bottomRight = bottomLeft + 1;

        // Triangle 1: top-left, bottom-left, bottom-right (CCW when viewed from outside)
        indices[indexOffset++] = topLeft;
        indices[indexOffset++] = bottomLeft;
        indices[indexOffset++] = bottomRight;

        // Triangle 2: top-left, bottom-right, top-right (CCW when viewed from outside)
        indices[indexOffset++] = topLeft;
        indices[indexOffset++] = bottomRight;
        indices[indexOffset++] = topRight;
      }
    }

    return {
      positions,
      normals,
      indices,
      bounds: {
        min: [-radius, -radius, -radius],
        max: [radius, radius, radius],
      },
    };
  }

  /**
   * Build edge data for wireframe rendering.
   * Creates latitude and longitude lines.
   */
  private buildEdgeData(): IEdgeData {
    const segments = this.segments;
    const rings = this.rings;
    const radius = this.radius;

    // Calculate edge count:
    // - Longitude lines: segments lines, each with rings segments = segments * rings
    // - Latitude lines: rings lines, each with segments segments = rings * segments
    // Total = 2 * segments * rings
    const edgeCount = 2 * segments * rings;
    const lineVertices = new Float32Array(edgeCount * 6); // 2 vertices per edge, 3 components each

    let edgeIndex = 0;

    // Generate vertices for a given spherical coordinate
    const sphereVertex = (ring: number, seg: number): [number, number, number] => {
      const phi = (ring / rings) * Math.PI;
      const theta = (seg / segments) * Math.PI * 2;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      return [
        cosTheta * sinPhi * radius,
        cosPhi * radius,
        sinTheta * sinPhi * radius,
      ];
    };

    // Longitude lines (vertical)
    for (let seg = 0; seg < segments; seg++) {
      for (let ring = 0; ring < rings; ring++) {
        const v0 = sphereVertex(ring, seg);
        const v1 = sphereVertex(ring + 1, seg);

        const offset = edgeIndex * 6;
        lineVertices[offset + 0] = v0[0];
        lineVertices[offset + 1] = v0[1];
        lineVertices[offset + 2] = v0[2];
        lineVertices[offset + 3] = v1[0];
        lineVertices[offset + 4] = v1[1];
        lineVertices[offset + 5] = v1[2];

        edgeIndex++;
      }
    }

    // Latitude lines (horizontal)
    for (let ring = 1; ring < rings; ring++) {
      // Skip poles (ring 0 and ring == rings)
      for (let seg = 0; seg < segments; seg++) {
        const v0 = sphereVertex(ring, seg);
        const v1 = sphereVertex(ring, seg + 1);

        const offset = edgeIndex * 6;
        lineVertices[offset + 0] = v0[0];
        lineVertices[offset + 1] = v0[1];
        lineVertices[offset + 2] = v0[2];
        lineVertices[offset + 3] = v1[0];
        lineVertices[offset + 4] = v1[1];
        lineVertices[offset + 5] = v1[2];

        edgeIndex++;
      }
    }

    // Actual edge count may be less due to skipping pole latitude
    const actualEdgeCount = edgeIndex;
    const trimmedVertices = lineVertices.slice(0, actualEdgeCount * 6);

    return {
      lineVertices: trimmedVertices,
      lineCount: actualEdgeCount,
    };
  }

/**
   * Initialize default components for the sphere.
   */
  private initializeComponents(): void {
    // Calculate actual counts
    const vertexCount = (this.rings + 1) * (this.segments + 1);
    const triangleCount = this.rings * this.segments * 2;
    const edgeCount = 2 * this.segments * this.rings;

    // Mesh component
    const meshComponent: IMeshComponent = {
      type: 'mesh',
      vertexCount,
      edgeCount,
      triangleCount,
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
   * Create a deep copy of this Sphere.
   */
  clone(): Sphere {
    const cloned = new Sphere(undefined, this.name, {
      segments: this.segments,
      rings: this.rings,
      radius: this.radius,
    });
    cloneEntityBase(this, cloned);
    cloned.setRenderMode(this.renderMode);
    return cloned;
  }

  // =========================================
  // ISerializable Implementation
  // =========================================

  /**
   * Serialize this Sphere to a JSON-compatible structure.
   *
   * @returns The serialized entity data
   */
  toJSON(): ISerializedEntity {
    const transform: ISerializedTransform = {
      position: [...this.transform.position],
      rotation: [...this.transform.rotation],
      scale: [...this.transform.scale],
    };

    const components: ISerializedComponent[] = [];

    // Serialize mesh component
    const meshComponent = this.getComponent<IMeshComponent>('mesh');
    if (meshComponent) {
      components.push({
        type: 'mesh',
        vertexCount: meshComponent.vertexCount,
        edgeCount: meshComponent.edgeCount,
        triangleCount: meshComponent.triangleCount,
        doubleSided: meshComponent.doubleSided,
      });
    }

    // Serialize material component
    const materialComponent = this.getComponent<IMaterialComponent>('material');
    if (materialComponent) {
      components.push({
        type: 'material',
        shaderName: materialComponent.shaderName,
        color: materialComponent.color ? [...materialComponent.color] : [0.8, 0.8, 0.8],
        opacity: materialComponent.opacity,
        transparent: materialComponent.transparent,
        materialAssetRef: materialComponent.materialAssetRef,
      });
    }

    return {
      uuid: this.id,
      name: this.name,
      type: 'Sphere',
      parentUuid: this.parent?.id,
      transform,
      components,
      metadata: {
        renderMode: this.renderMode,
        segments: this.segments,
        rings: this.rings,
        radius: this.radius,
      },
    };
  }

  /**
   * Deserialize data from JSON into this Sphere.
   * This method mutates the current instance.
   *
   * Note: Sphere parameters (segments, rings, radius) are read-only after construction.
   * To deserialize a sphere with different parameters, create a new Sphere instance
   * using the EntitySerializer.deserialize() factory method.
   *
   * @param data - The serialized entity data to load
   */
  fromJSON(data: ISerializedEntity): void {
    // Restore name
    this.name = data.name;

    // Restore transform
    if (data.transform) {
      this.transform.position = [...data.transform.position];
      this.transform.rotation = [...data.transform.rotation];
      this.transform.scale = [...data.transform.scale];
    }

    // Restore material component
    const materialData = data.components.find((c) => c.type === 'material');
    if (materialData) {
      const materialComponent = this.getComponent<IMaterialComponent>('material');
      if (materialComponent) {
        if (materialData.shaderName !== undefined) {
          materialComponent.shaderName = materialData.shaderName as string;
        }
        if (materialData.color !== undefined) {
          materialComponent.color = [...(materialData.color as [number, number, number])];
        }
        if (materialData.opacity !== undefined) {
          materialComponent.opacity = materialData.opacity as number;
        }
        if (materialData.transparent !== undefined) {
          materialComponent.transparent = materialData.transparent as boolean;
        }
        if (materialData.materialAssetRef !== undefined) {
          materialComponent.materialAssetRef = materialData.materialAssetRef as IMaterialComponent['materialAssetRef'];
        }
      }
    }

    // Restore render mode from metadata
    if (data.metadata?.renderMode) {
      this.renderMode = data.metadata.renderMode as RenderMode;
    }
  }
}

/**
 * Factory for creating Sphere primitives.
 * Implements IPrimitiveFactory for registration with PrimitiveRegistry.
 */
export class SphereFactory implements IPrimitiveFactory {
  readonly type = 'Sphere';
  readonly category = 'Mesh' as const;
  readonly icon = 'sphere';

  /**
   * Create a new Sphere instance.
   *
   * @param name - Optional name for the sphere
   * @returns A new Sphere instance
   */
  create(name?: string): Sphere {
    return new Sphere(undefined, name);
  }
}
