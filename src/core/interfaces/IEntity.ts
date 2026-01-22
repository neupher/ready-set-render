/**
 * IEntity - Extended scene object with component support
 *
 * Entities extend scene objects with a component-based architecture.
 * Components are data containers that describe properties of an entity.
 * This allows for flexible composition of behaviors and data.
 *
 * @example
 * ```typescript
 * const cube = new Cube();
 *
 * // Check for mesh component
 * if (cube.hasComponent('mesh')) {
 *   const mesh = cube.getComponent<IMeshComponent>('mesh');
 *   console.log(`Vertices: ${mesh?.vertexCount}`);
 * }
 * ```
 */

import type { ISceneObject } from './ISceneObject';
import type { IComponent } from './IComponent';

/**
 * Entity interface extending scene objects with component support.
 */
export interface IEntity extends ISceneObject {
  /**
   * Unique entity ID (auto-incremented).
   * Used for display purposes (e.g., "Cube (Entity #1)").
   */
  readonly entityId: number;

  /**
   * Get all components attached to this entity.
   *
   * @returns Array of all components
   */
  getComponents(): IComponent[];

  /**
   * Get a specific component by type.
   *
   * @param type - The component type to retrieve
   * @returns The component if found, null otherwise
   */
  getComponent<T extends IComponent>(type: string): T | null;

  /**
   * Check if this entity has a specific component type.
   *
   * @param type - The component type to check
   * @returns True if the component exists
   */
  hasComponent(type: string): boolean;
}

/**
 * Type guard to check if an object is an entity.
 *
 * @param obj - The object to check
 * @returns True if the object implements IEntity
 */
export function isEntity(obj: ISceneObject): obj is IEntity {
  return (
    'entityId' in obj &&
    typeof (obj as IEntity).entityId === 'number' &&
    'getComponents' in obj &&
    typeof (obj as IEntity).getComponents === 'function'
  );
}
