/**
 * PrimitiveRegistry - Registry for primitive factories
 *
 * Implements the Plugin pattern with a registry for extensibility.
 * New primitives can be added by registering a factory without modifying existing code.
 *
 * @example
 * ```typescript
 * const registry = new PrimitiveRegistry(eventBus);
 *
 * // Register built-in primitives
 * registry.register(new CubeFactory());
 *
 * // Create a primitive
 * const cube = registry.create('Cube', 'MyCube');
 * if (cube) {
 *   sceneGraph.add(cube);
 * }
 * ```
 */

import { EventBus } from '@core/EventBus';
import type { IRenderable } from '@core/interfaces';
import type { IPrimitiveFactory, PrimitiveCategory } from './interfaces/IPrimitiveFactory';

export interface PrimitiveRegistryOptions {
  /** Event bus for communication */
  eventBus: EventBus;
}

/**
 * Registry for primitive factories.
 * Allows registering and creating primitive objects via factory pattern.
 */
export class PrimitiveRegistry {
  private readonly factories = new Map<string, IPrimitiveFactory>();
  private readonly eventBus: EventBus;
  private instanceCounter = new Map<string, number>();

  constructor(options: PrimitiveRegistryOptions) {
    this.eventBus = options.eventBus;
  }

  /**
   * Register a primitive factory.
   * Factories can be registered from any plugin without modifying the registry.
   *
   * @param factory - The factory to register
   * @throws Error if a factory with the same type is already registered
   */
  register(factory: IPrimitiveFactory): void {
    if (this.factories.has(factory.type)) {
      throw new Error(`PrimitiveFactory '${factory.type}' is already registered`);
    }

    this.factories.set(factory.type, factory);
    this.instanceCounter.set(factory.type, 0);

    this.eventBus.emit('primitives:factoryRegistered', {
      type: factory.type,
      category: factory.category
    });
  }

  /**
   * Unregister a primitive factory.
   *
   * @param type - The type name of the factory to unregister
   * @returns True if the factory was unregistered, false if not found
   */
  unregister(type: string): boolean {
    const removed = this.factories.delete(type);

    if (removed) {
      this.instanceCounter.delete(type);
      this.eventBus.emit('primitives:factoryUnregistered', { type });
    }

    return removed;
  }

  /**
   * Check if a factory is registered.
   *
   * @param type - The type name to check
   * @returns True if registered
   */
  has(type: string): boolean {
    return this.factories.has(type);
  }

  /**
   * Create a new primitive instance.
   * Automatically generates a unique name if not provided.
   *
   * @param type - The type of primitive to create
   * @param name - Optional custom name (will auto-generate if not provided)
   * @returns The created primitive, or null if type not found
   */
  create(type: string, name?: string): IRenderable | null {
    const factory = this.factories.get(type);

    if (!factory) {
      console.warn(`PrimitiveFactory '${type}' not found`);
      return null;
    }

    // Auto-generate name with incrementing counter
    let objectName = name;
    if (!objectName) {
      const count = (this.instanceCounter.get(type) ?? 0) + 1;
      this.instanceCounter.set(type, count);
      objectName = `${type}.${count.toString().padStart(3, '0')}`;
    }

    const primitive = factory.create(objectName);

    this.eventBus.emit('primitives:created', {
      type: factory.type,
      name: objectName,
      id: primitive.id
    });

    return primitive;
  }

  /**
   * Get a factory by type.
   *
   * @param type - The type name of the factory
   * @returns The factory, or undefined if not found
   */
  getFactory(type: string): IPrimitiveFactory | undefined {
    return this.factories.get(type);
  }

  /**
   * Get all registered factories.
   *
   * @returns Array of all registered factories
   */
  getFactories(): IPrimitiveFactory[] {
    return Array.from(this.factories.values());
  }

  /**
   * Get all factories in a specific category.
   *
   * @param category - The category to filter by
   * @returns Array of factories in the category
   */
  getByCategory(category: PrimitiveCategory): IPrimitiveFactory[] {
    return Array.from(this.factories.values())
      .filter(factory => factory.category === category);
  }

  /**
   * Get all registered type names.
   *
   * @returns Array of type names
   */
  getTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Get the number of registered factories.
   *
   * @returns The factory count
   */
  get count(): number {
    return this.factories.size;
  }

  /**
   * Clear all registered factories.
   */
  clear(): void {
    this.factories.clear();
    this.instanceCounter.clear();
    this.eventBus.emit('primitives:registryCleared', {});
  }
}
