/**
 * MeshEntity - Generic entity for imported mesh geometry
 *
 * Unlike Cube/Sphere which generate geometry procedurally,
 * MeshEntity references an IMeshAsset for its geometry data.
 * This enables imported 3D models to use the same rendering infrastructure.
 *
 * MeshEntity implements IMeshProvider, allowing ForwardRenderer to render it
 * the same way as primitives. Geometry data is retrieved from AssetRegistry
 * via the meshAssetRef.
 *
 * @example
 * ```typescript
 * // Create MeshEntity referencing an imported mesh asset
 * const entity = new MeshEntity('entity-uuid', 'CarBody');
 * entity.meshAssetRef = { uuid: 'mesh-asset-uuid', type: 'mesh' };
 *
 * // Renderer calls getMeshData() which looks up the asset
 * const meshData = entity.getMeshData();
 * ```
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
import type { ISerializable } from '@core/assets/interfaces/ISerializable';
import type {
  ISerializedEntity,
  ISerializedTransform,
  ISerializedComponent,
} from '@core/assets/interfaces/ISceneAsset';
import type { IAssetReference } from '@core/assets/interfaces/IAssetReference';
import type { IMeshAsset } from '@core/assets/interfaces/IMeshAsset';
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
 * Render mode for the mesh entity.
 */
export type RenderMode = 'wireframe' | 'solid' | 'both';

/**
 * Callback type for resolving mesh assets from AssetRegistry.
 * This allows MeshEntity to remain decoupled from AssetRegistry.
 */
export type MeshAssetResolver = (uuid: string) => IMeshAsset | null;

/**
 * Global mesh asset resolver.
 * Set by Application during initialization to provide access to AssetRegistry.
 */
let globalMeshAssetResolver: MeshAssetResolver | null = null;

/**
 * Set the global mesh asset resolver.
 * Called by Application during initialization.
 *
 * @param resolver - Function to resolve mesh assets by UUID
 */
export function setMeshAssetResolver(resolver: MeshAssetResolver): void {
  globalMeshAssetResolver = resolver;
}

/**
 * Get the current mesh asset resolver.
 *
 * @returns The current resolver or null if not set
 */
export function getMeshAssetResolver(): MeshAssetResolver | null {
  return globalMeshAssetResolver;
}

/**
 * Serialized mesh component data for MeshEntity.
 */
export interface ISerializedMeshEntityComponent extends ISerializedComponent {
  type: 'meshEntity';
  meshAssetRef: IAssetReference;
  vertexCount: number;
  triangleCount: number;
}

/**
 * A generic mesh entity that references an IMeshAsset for geometry.
 * Used for imported 3D models (GLTF, OBJ, etc.).
 */
export class MeshEntity
  implements IRenderable, IEntity, IMeshProvider, ICloneable, ISerializable<ISerializedEntity>
{
  readonly id: string;
  readonly entityId: number;
  name: string;
  parent: IRenderable | null = null;
  children: IRenderable[] = [];
  transform: Transform;

  /**
   * Reference to the mesh asset providing geometry data.
   */
  meshAssetRef: IAssetReference | null = null;

  private readonly components: Map<string, IComponent> = new Map();

  private renderMode: RenderMode = 'solid';

  /**
   * Cached mesh data for rendering.
   * Lazily loaded from the mesh asset on first access.
   */
  private cachedMeshData: IMeshData | null = null;
  private cachedEdgeData: IEdgeData | null = null;
  private lastMeshAssetUuid: string | null = null;

  /**
   * Create a new MeshEntity.
   *
   * @param id - Unique identifier (defaults to random UUID)
   * @param name - Display name (defaults to 'Mesh')
   */
  constructor(id?: string, name?: string) {
    this.id = id ?? generateUUID();
    this.entityId = EntityIdGenerator.next();
    this.name = name ?? 'Mesh';
    this.transform = createDefaultTransform();

    this.initializeComponents();
  }

  // =========================================
  // IMeshProvider Implementation
  // =========================================

  /**
   * Get the mesh data for solid rendering.
   * Retrieves geometry from the referenced IMeshAsset via AssetRegistry.
   *
   * @returns The mesh data or null if no mesh asset is assigned
   */
  getMeshData(): IMeshData | null {
    if (!this.meshAssetRef) {
      return null;
    }

    // Check if we need to refresh the cache
    if (
      this.cachedMeshData &&
      this.lastMeshAssetUuid === this.meshAssetRef.uuid
    ) {
      return this.cachedMeshData;
    }

    // Try to resolve the mesh asset
    const resolver = getMeshAssetResolver();
    if (!resolver) {
      console.warn('MeshEntity: No mesh asset resolver configured');
      return null;
    }

    const meshAsset = resolver(this.meshAssetRef.uuid);
    if (!meshAsset) {
      console.warn(
        `MeshEntity: Mesh asset not found: ${this.meshAssetRef.uuid}`
      );
      return null;
    }

    // Convert asset data to IMeshData format
    this.cachedMeshData = {
      positions: new Float32Array(meshAsset.positions),
      normals: new Float32Array(meshAsset.normals),
      indices: new Uint16Array(meshAsset.indices),
      uvs: meshAsset.uvs ? new Float32Array(meshAsset.uvs) : undefined,
      bounds: {
        min: [...meshAsset.bounds.min],
        max: [...meshAsset.bounds.max],
      },
    };
    this.lastMeshAssetUuid = this.meshAssetRef.uuid;

    // Update mesh component with actual counts
    this.updateMeshComponent(meshAsset);

    return this.cachedMeshData;
  }

  /**
   * Get edge data for wireframe rendering.
   * Generates wireframe edges from the triangle mesh.
   *
   * @returns Edge data or null if no mesh is assigned
   */
  getEdgeData(): IEdgeData | null {
    const meshData = this.getMeshData();
    if (!meshData) {
      return null;
    }

    // Use cached edge data if available
    if (
      this.cachedEdgeData &&
      this.lastMeshAssetUuid === this.meshAssetRef?.uuid
    ) {
      return this.cachedEdgeData;
    }

    // Generate edges from triangles
    this.cachedEdgeData = this.buildEdgeData(meshData);
    return this.cachedEdgeData;
  }

  /**
   * Update mesh component with data from the mesh asset.
   */
  private updateMeshComponent(meshAsset: IMeshAsset): void {
    const meshComponent = this.getComponent<IMeshComponent>('mesh');
    if (meshComponent) {
      meshComponent.vertexCount = meshAsset.vertexCount;
      meshComponent.triangleCount = meshAsset.triangleCount;
      meshComponent.edgeCount = Math.floor(meshAsset.triangleCount * 1.5); // Approximate
    }
  }

  /**
   * Build edge data from mesh triangles for wireframe rendering.
   */
  private buildEdgeData(meshData: IMeshData): IEdgeData {
    const { positions, indices } = meshData;

    // Use a Set to avoid duplicate edges
    const edgeSet = new Set<string>();
    const edges: Array<[number, number]> = [];

    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      // Add each edge (sorted to avoid duplicates)
      const addEdge = (a: number, b: number) => {
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push([a, b]);
        }
      };

      addEdge(i0, i1);
      addEdge(i1, i2);
      addEdge(i2, i0);
    }

    // Build line vertices
    const lineVertices = new Float32Array(edges.length * 6);
    for (let i = 0; i < edges.length; i++) {
      const [v0, v1] = edges[i];
      const offset = i * 6;
      lineVertices[offset + 0] = positions[v0 * 3];
      lineVertices[offset + 1] = positions[v0 * 3 + 1];
      lineVertices[offset + 2] = positions[v0 * 3 + 2];
      lineVertices[offset + 3] = positions[v1 * 3];
      lineVertices[offset + 4] = positions[v1 * 3 + 1];
      lineVertices[offset + 5] = positions[v1 * 3 + 2];
    }

    return {
      lineVertices,
      lineCount: edges.length,
    };
  }

  /**
   * Invalidate cached mesh data.
   * Call when the mesh asset reference changes.
   */
  invalidateCache(): void {
    this.cachedMeshData = null;
    this.cachedEdgeData = null;
    this.lastMeshAssetUuid = null;
  }

  // =========================================
  // IRenderable Implementation (legacy)
  // =========================================

  /**
   * Legacy render method - now handled by ForwardRenderer.
   * @deprecated Use ForwardRenderer which reads getMeshData() instead
   */
  render(_gl: WebGL2RenderingContext, _viewProjection: Float32Array): void {
    // No-op: Rendering is now handled by ForwardRenderer
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
   * Compute the local model matrix from this entity's transform.
   */
  private computeLocalModelMatrix(): Float32Array {
    const { position, rotation, scale } = this.transform;

    const t = mat4Translation(position[0], position[1], position[2]);
    const rx = mat4RotationX(degToRad(rotation[0]));
    const ry = mat4RotationY(degToRad(rotation[1]));
    const rz = mat4RotationZ(degToRad(rotation[2]));
    const s = mat4Scale(scale[0], scale[1], scale[2]);

    let model = mat4Multiply(t, rz);
    model = mat4Multiply(model, ry);
    model = mat4Multiply(model, rx);
    model = mat4Multiply(model, s);

    return model;
  }

  /**
   * Compute the world model matrix by multiplying parent transforms.
   * This traverses up the hierarchy and combines all parent transforms.
   */
  getModelMatrix(): Float32Array {
    const localMatrix = this.computeLocalModelMatrix();

    // If no parent or parent is root, just return local matrix
    if (!this.parent || this.parent.id === 'root') {
      return localMatrix;
    }

    // Get parent's world matrix and multiply with local
    const parentMatrix = this.getParentWorldMatrix(this.parent);
    return mat4Multiply(parentMatrix, localMatrix);
  }

  /**
   * Get the world matrix of a parent object.
   * Works with any IRenderable that has transform and parent.
   */
  private getParentWorldMatrix(parent: IRenderable): Float32Array {
    // Check if parent has getModelMatrix method (it's a MeshEntity or similar)
    if ('getModelMatrix' in parent && typeof parent.getModelMatrix === 'function') {
      return parent.getModelMatrix();
    }

    // Otherwise compute from transform (for SceneObject groups)
    const { position, rotation, scale } = parent.transform;

    const t = mat4Translation(position[0], position[1], position[2]);
    const rx = mat4RotationX(degToRad(rotation[0]));
    const ry = mat4RotationY(degToRad(rotation[1]));
    const rz = mat4RotationZ(degToRad(rotation[2]));
    const s = mat4Scale(scale[0], scale[1], scale[2]);

    let localMatrix = mat4Multiply(t, rz);
    localMatrix = mat4Multiply(localMatrix, ry);
    localMatrix = mat4Multiply(localMatrix, rx);
    localMatrix = mat4Multiply(localMatrix, s);

    // Recurse up to get parent's parent matrix
    if (parent.parent && parent.parent.id !== 'root') {
      const grandParentMatrix = this.getParentWorldMatrix(parent.parent as IRenderable);
      return mat4Multiply(grandParentMatrix, localMatrix);
    }

    return localMatrix;
  }

  /**
   * Get the normal matrix for lighting calculations.
   */
  getNormalMatrix(): Mat3 {
    return normalMatrix(this.getModelMatrix());
  }

  // =========================================
  // Component Initialization
  // =========================================

  /**
   * Initialize default components for the mesh entity.
   */
  private initializeComponents(): void {
    // Mesh component (counts will be updated when mesh asset is loaded)
    const meshComponent: IMeshComponent = {
      type: 'mesh',
      vertexCount: 0,
      edgeCount: 0,
      triangleCount: 0,
      doubleSided: false,
    };
    this.components.set('mesh', meshComponent);

    // Material component
    const materialComponent: IMaterialComponent = {
      type: 'material',
      shaderName: 'pbr',
      color: [0.8, 0.8, 0.8],
      opacity: 1,
      transparent: false,
    };
    this.components.set('material', materialComponent);
  }

  // =========================================
  // ICloneable Implementation
  // =========================================

  /**
   * Create a deep copy of this MeshEntity.
   */
  clone(): MeshEntity {
    const cloned = new MeshEntity(undefined, this.name);
    cloneEntityBase(this, cloned);
    cloned.setRenderMode(this.renderMode);

    // Copy mesh asset reference
    if (this.meshAssetRef) {
      cloned.meshAssetRef = { ...this.meshAssetRef };
    }

    return cloned;
  }

  // =========================================
  // ISerializable Implementation
  // =========================================

  /**
   * Serialize this MeshEntity to a JSON-compatible structure.
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

    // Serialize mesh entity component (includes asset reference)
    const meshComponent = this.getComponent<IMeshComponent>('mesh');
    if (meshComponent && this.meshAssetRef) {
      components.push({
        type: 'meshEntity',
        meshAssetRef: this.meshAssetRef,
        vertexCount: meshComponent.vertexCount,
        triangleCount: meshComponent.triangleCount,
      } as ISerializedMeshEntityComponent);
    }

    // Serialize material component
    const materialComponent = this.getComponent<IMaterialComponent>('material');
    if (materialComponent) {
      components.push({
        type: 'material',
        shaderName: materialComponent.shaderName,
        color: materialComponent.color
          ? [...materialComponent.color]
          : [0.8, 0.8, 0.8],
        opacity: materialComponent.opacity,
        transparent: materialComponent.transparent,
        materialAssetRef: materialComponent.materialAssetRef,
      });
    }

    return {
      uuid: this.id,
      name: this.name,
      type: 'MeshEntity',
      parentUuid: this.parent?.id,
      transform,
      components,
      metadata: {
        renderMode: this.renderMode,
        meshAssetRef: this.meshAssetRef,
      },
    };
  }

  /**
   * Deserialize data from JSON into this MeshEntity.
   *
   * @param data - The serialized entity data to load
   */
  fromJSON(data: ISerializedEntity): void {
    this.name = data.name;

    // Restore transform
    if (data.transform) {
      this.transform.position = [...data.transform.position];
      this.transform.rotation = [...data.transform.rotation];
      this.transform.scale = [...data.transform.scale];
    }

    // Restore mesh asset reference from metadata
    if (data.metadata?.meshAssetRef) {
      this.meshAssetRef = data.metadata.meshAssetRef as IAssetReference;
      this.invalidateCache();
    }

    // Restore material component
    const materialData = data.components.find((c) => c.type === 'material');
    if (materialData) {
      const materialComponent =
        this.getComponent<IMaterialComponent>('material');
      if (materialComponent) {
        if (materialData.shaderName !== undefined) {
          materialComponent.shaderName = materialData.shaderName as string;
        }
        if (materialData.color !== undefined) {
          materialComponent.color = [
            ...(materialData.color as [number, number, number]),
          ];
        }
        if (materialData.opacity !== undefined) {
          materialComponent.opacity = materialData.opacity as number;
        }
        if (materialData.transparent !== undefined) {
          materialComponent.transparent = materialData.transparent as boolean;
        }
        if (materialData.materialAssetRef !== undefined) {
          materialComponent.materialAssetRef =
            materialData.materialAssetRef as IMaterialComponent['materialAssetRef'];
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
 * Type guard to check if an entity is a MeshEntity.
 */
export function isMeshEntity(obj: unknown): obj is MeshEntity {
  return obj instanceof MeshEntity;
}
