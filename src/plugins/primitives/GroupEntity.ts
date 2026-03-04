/**
 * GroupEntity - Container for hierarchical mesh groups
 *
 * Used to represent non-mesh nodes in imported 3D model hierarchies
 * (e.g., from GLTF files). GroupEntity maintains transform hierarchy
 * and provides world matrix computation for its children.
 *
 * Unlike SceneObject, GroupEntity properly computes world transforms
 * for rendering and is identifiable as a mesh group in the UI.
 *
 * @example
 * ```typescript
 * const group = new GroupEntity('CarBody');
 * group.transform.position = [0, 0, 1];
 *
 * const wheel = new MeshEntity(undefined, 'Wheel');
 * wheel.parent = group;
 * group.children.push(wheel);
 * ```
 */

import type {
  ISceneObject,
  Transform,
  IComponent,
  IEntity,
} from '@core/interfaces';
import { createDefaultTransform } from '@core/interfaces';
import type { ISerializable } from '@core/assets/interfaces/ISerializable';
import type {
  ISerializedEntity,
  ISerializedTransform,
} from '@core/assets/interfaces/ISceneAsset';
import { generateUUID } from '@utils/uuid';
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
 * A group entity for containing mesh hierarchies.
 * Provides proper world transform computation for child entities.
 */
export class GroupEntity implements ISceneObject, IEntity, ISerializable<ISerializedEntity> {
  readonly id: string;
  readonly entityId: number;
  name: string;
  parent: ISceneObject | null = null;
  children: ISceneObject[] = [];
  transform: Transform;

  /**
   * Marker to identify this as a mesh group (for UI icon differentiation).
   */
  readonly isMeshGroup: boolean = true;

  private readonly components: Map<string, IComponent> = new Map();

  constructor(name: string, id?: string) {
    this.id = id ?? generateUUID();
    this.entityId = EntityIdGenerator.next();
    this.name = name;
    this.transform = createDefaultTransform();
  }

  // =========================================
  // IEntity Implementation
  // =========================================

  /**
   * Get a component by type.
   */
  getComponent<T extends IComponent>(type: string): T | null {
    const component = this.components.get(type);
    return component ? (component as T) : null;
  }

  /**
   * Check if entity has a component.
   */
  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  /**
   * Get all components.
   */
  getComponents(): IComponent[] {
    return Array.from(this.components.values());
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
   */
  private getParentWorldMatrix(parent: ISceneObject): Float32Array {
    // Check if parent has getModelMatrix method
    if ('getModelMatrix' in parent && typeof (parent as { getModelMatrix: () => Float32Array }).getModelMatrix === 'function') {
      return (parent as { getModelMatrix: () => Float32Array }).getModelMatrix();
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
      const grandParentMatrix = this.getParentWorldMatrix(parent.parent);
      return mat4Multiply(grandParentMatrix, localMatrix);
    }

    return localMatrix;
  }

  // =========================================
  // ISerializable Implementation
  // =========================================

  /**
   * Serialize this GroupEntity to a JSON-compatible structure.
   *
   * @returns The serialized entity data
   */
  toJSON(): ISerializedEntity {
    const transform: ISerializedTransform = {
      position: [...this.transform.position],
      rotation: [...this.transform.rotation],
      scale: [...this.transform.scale],
    };

    return {
      uuid: this.id,
      name: this.name,
      type: 'GroupEntity',
      parentUuid: this.parent?.id,
      transform,
      components: [],
      metadata: {
        isMeshGroup: this.isMeshGroup,
      },
    };
  }

  /**
   * Deserialize data from JSON into this GroupEntity.
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
  }
}

/**
 * Type guard to check if an object is a GroupEntity.
 */
export function isGroupEntity(obj: unknown): obj is GroupEntity {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'isMeshGroup' in obj &&
    (obj as GroupEntity).isMeshGroup === true
  );
}
