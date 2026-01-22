/**
 * IComponent - Base interface for entity components
 *
 * Part of a lightweight Entity Component System (ECS) for organizing
 * object properties and behaviors. Components are data containers
 * that describe aspects of an entity.
 *
 * @example
 * ```typescript
 * interface ITransformComponent extends IComponent {
 *   type: 'transform';
 *   position: [number, number, number];
 * }
 * ```
 */

/**
 * Base interface for all components.
 * Each component type is identified by its `type` string.
 */
export interface IComponent {
  /**
   * The type identifier for this component.
   * Used to distinguish between component types.
   */
  readonly type: string;
}
