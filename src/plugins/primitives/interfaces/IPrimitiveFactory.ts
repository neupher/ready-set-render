/**
 * IPrimitiveFactory - Interface for primitive factory plugins
 *
 * Factory pattern for creating primitive objects.
 * Each factory creates a specific type of primitive (Cube, Sphere, etc.)
 */

import type { IRenderable } from '@core/interfaces';

/**
 * Primitive categories for organization in menus/UI
 */
export type PrimitiveCategory = 'Mesh' | 'Light' | 'Camera' | 'Empty';

/**
 * Factory interface for creating primitive objects.
 * Implements the Factory Pattern for extensibility.
 */
export interface IPrimitiveFactory {
  /**
   * The type name of the primitive (e.g., "Cube", "Sphere")
   * Used as identifier in the registry
   */
  readonly type: string;

  /**
   * Category for menu/UI organization
   */
  readonly category: PrimitiveCategory;

  /**
   * Optional icon identifier for UI display
   */
  readonly icon?: string;

  /**
   * Create a new instance of this primitive.
   *
   * @param name - Optional custom name for the object
   * @returns A new renderable primitive instance
   */
  create(name?: string): IRenderable;
}
