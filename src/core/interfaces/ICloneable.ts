/**
 * ICloneable Interface
 *
 * Allows entities to be duplicated via a polymorphic clone() method.
 * Each entity type implements its own cloning logic, enabling:
 * - Primitives (Cube, Sphere) to create new instances of themselves
 * - Lights to duplicate their configuration
 * - Imported meshes (OBJ, GLTF) to duplicate their mesh data
 * - Any future entity type to define custom cloning behavior
 *
 * @example
 * ```typescript
 * if (isCloneable(entity)) {
 *   const duplicate = entity.clone();
 *   duplicate.transform.position[0] += 1; // Offset position
 *   sceneGraph.add(duplicate);
 * }
 * ```
 */

import type { IEntity } from './IEntity';
import type { IMaterialComponent } from './IMaterialComponent';

/**
 * Interface for entities that can be cloned/duplicated.
 */
export interface ICloneable {
  /**
   * Create a deep copy of this entity.
   *
   * @returns A new entity instance that is a copy of this one
   */
  clone(): IEntity;
}

/**
 * Type guard to check if an object implements ICloneable.
 */
export function isCloneable(obj: unknown): obj is ICloneable {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'clone' in obj &&
    typeof (obj as ICloneable).clone === 'function'
  );
}

/**
 * Helper to copy common entity properties during cloning.
 * Copies transform and material component.
 *
 * @example
 * ```typescript
 * clone(): MyEntity {
 *   const cloned = new MyEntity(undefined, this.name);
 *   cloneEntityBase(this, cloned);
 *   // Copy entity-specific properties here
 *   return cloned;
 * }
 * ```
 */
export function cloneEntityBase(source: IEntity, target: IEntity): void {
  // Copy transform
  target.transform.position = [...source.transform.position];
  target.transform.rotation = [...source.transform.rotation];
  target.transform.scale = [...source.transform.scale];

  // Copy material component if present
  const srcMat = source.getComponent<IMaterialComponent>('material');
  const tgtMat = target.getComponent<IMaterialComponent>('material');
  if (srcMat && tgtMat) {
    if (srcMat.color) {
      tgtMat.color = [srcMat.color[0], srcMat.color[1], srcMat.color[2]];
    }
    tgtMat.opacity = srcMat.opacity;
    tgtMat.transparent = srcMat.transparent;
  }
}
