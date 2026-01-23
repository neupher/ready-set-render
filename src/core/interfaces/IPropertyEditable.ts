/**
 * IPropertyEditable Interface
 *
 * OPTIONAL interface for entities that need CUSTOM property handling.
 *
 * IMPORTANT: Most entities do NOT need to implement this interface!
 *
 * The PropertyChangeHandler handles standard properties centrally:
 * - Transform (position, rotation, scale) - handled for ALL entities
 * - Camera component - handled if hasComponent('camera')
 * - Material component - handled if hasComponent('material')
 *
 * Only implement IPropertyEditable when:
 * - Your entity has truly custom properties not covered above
 * - You need special validation or transformation of values
 * - You have computed/derived properties
 *
 * For standard entities (Cube, Sphere, Plane, imported meshes), the
 * PropertyChangeHandler works automatically with zero code needed.
 *
 * @example
 * ```typescript
 * // Most entities: NO implementation needed - works automatically!
 * class Cube implements IEntity {
 *   // transform editing just works via PropertyChangeHandler
 * }
 *
 * // Only for special cases:
 * class SpecialEntity implements IEntity, IPropertyEditable {
 *   setProperty(path: string, value: unknown): boolean {
 *     if (path === 'customProp') {
 *       this.customProp = validate(value);
 *       return true;
 *     }
 *     return false; // Let PropertyChangeHandler handle the rest
 *   }
 * }
 * ```
 */

/**
 * Interface for entities that can have their properties edited.
 */
export interface IPropertyEditable {
  /**
   * Set a property value using dot notation path.
   *
   * @param path - Property path (e.g., 'position.x', 'camera.fieldOfView')
   * @param value - The new value to set
   * @returns True if the property was successfully set
   *
   * @example
   * ```typescript
   * entity.setProperty('position.x', 5.0);
   * entity.setProperty('rotation.y', 45);
   * entity.setProperty('camera.fieldOfView', 60);
   * ```
   */
  setProperty(path: string, value: unknown): boolean;

  /**
   * Get a property value using dot notation path.
   *
   * @param path - Property path (e.g., 'position.x', 'camera.fieldOfView')
   * @returns The property value, or undefined if not found
   *
   * @example
   * ```typescript
   * const x = entity.getProperty('position.x'); // number
   * const fov = entity.getProperty('camera.fieldOfView'); // number
   * ```
   */
  getProperty(path: string): unknown;
}

/**
 * Type guard to check if an object implements IPropertyEditable.
 *
 * @param obj - The object to check
 * @returns True if the object implements IPropertyEditable
 */
export function isPropertyEditable(obj: unknown): obj is IPropertyEditable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'setProperty' in obj &&
    'getProperty' in obj &&
    typeof (obj as IPropertyEditable).setProperty === 'function' &&
    typeof (obj as IPropertyEditable).getProperty === 'function'
  );
}
