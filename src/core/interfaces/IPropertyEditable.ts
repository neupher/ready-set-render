/**
 * IPropertyEditable Interface
 *
 * Interface for entities that support property editing from the Properties Panel
 * or other sources (like transform gizmos, scripting, etc.).
 *
 * This enables bidirectional data binding:
 * - UI → Entity: PropertiesPanel emits changes, handler calls setProperty()
 * - Entity → UI: Changes from gizmos/scripts emit events, UI updates displayed values
 *
 * @example
 * ```typescript
 * // Check if entity supports property editing
 * if (isPropertyEditable(entity)) {
 *   entity.setProperty('position.x', 5.0);
 *   const value = entity.getProperty('position.x');
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
