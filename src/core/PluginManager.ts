/**
 * PluginManager - Plugin Lifecycle Management
 *
 * Manages plugin registration, initialization, and disposal.
 * Handles dependency resolution and provides a plugin context.
 *
 * @example
 * ```typescript
 * const manager = new PluginManager(context);
 *
 * manager.register(new ForwardRenderer());
 * manager.register(new OBJImporter());
 *
 * await manager.initializeAll();
 *
 * const renderer = manager.get<IRenderPipeline>('forward-renderer');
 * ```
 */

import type { IPlugin, IPluginContext } from './interfaces';

/**
 * Error thrown when a plugin dependency cannot be resolved.
 */
export class PluginDependencyError extends Error {
  constructor(
    public readonly pluginId: string,
    public readonly missingDependency: string
  ) {
    super(
      `Plugin "${pluginId}" depends on "${missingDependency}" which is not registered`
    );
    this.name = 'PluginDependencyError';
  }
}

/**
 * Error thrown when a circular dependency is detected.
 */
export class CircularDependencyError extends Error {
  constructor(public readonly cycle: string[]) {
    super(`Circular dependency detected: ${cycle.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

/**
 * Plugin state tracking.
 */
interface PluginEntry {
  plugin: IPlugin;
  initialized: boolean;
}

/**
 * PluginManager handles the lifecycle of all plugins.
 * Supports dependency injection and topological initialization.
 */
export class PluginManager {
  private readonly plugins = new Map<string, PluginEntry>();
  private readonly context: IPluginContext;

  /**
   * Create a new PluginManager.
   *
   * @param context - The plugin context to provide to plugins
   */
  constructor(context: IPluginContext) {
    this.context = context;
  }

  /**
   * Register a plugin.
   * The plugin will not be initialized until initialize() or initializeAll() is called.
   *
   * @param plugin - The plugin to register
   * @throws Error if a plugin with the same ID is already registered
   */
  register(plugin: IPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" is already registered`);
    }

    this.plugins.set(plugin.id, {
      plugin,
      initialized: false,
    });

    this.context.eventBus.emit('plugin:registered', {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
    });
  }

  /**
   * Unregister a plugin.
   * If the plugin is initialized, it will be disposed first.
   *
   * @param id - The plugin ID to unregister
   * @returns True if the plugin was unregistered
   */
  async unregister(id: string): Promise<boolean> {
    const entry = this.plugins.get(id);
    if (!entry) {
      return false;
    }

    if (entry.initialized) {
      await this.dispose(id);
    }

    this.plugins.delete(id);

    this.context.eventBus.emit('plugin:unregistered', { id });

    return true;
  }

  /**
   * Initialize a specific plugin and its dependencies.
   *
   * @param id - The plugin ID to initialize
   * @throws PluginDependencyError if a dependency is missing
   * @throws CircularDependencyError if a circular dependency exists
   */
  async initialize(id: string): Promise<void> {
    const entry = this.plugins.get(id);
    if (!entry) {
      throw new Error(`Plugin "${id}" is not registered`);
    }

    if (entry.initialized) {
      return;
    }

    // Check and initialize dependencies first
    const { plugin } = entry;
    if (plugin.dependencies) {
      // Check for missing dependencies
      for (const depId of plugin.dependencies) {
        if (!this.plugins.has(depId)) {
          throw new PluginDependencyError(id, depId);
        }
      }

      // Initialize dependencies
      for (const depId of plugin.dependencies) {
        await this.initialize(depId);
      }
    }

    // Initialize the plugin
    await plugin.initialize(this.context);
    entry.initialized = true;

    this.context.eventBus.emit('plugin:initialized', {
      id: plugin.id,
      name: plugin.name,
    });
  }

  /**
   * Initialize all registered plugins in dependency order.
   *
   * @throws PluginDependencyError if a dependency is missing
   * @throws CircularDependencyError if a circular dependency exists
   */
  async initializeAll(): Promise<void> {
    const sorted = this.topologicalSort();

    for (const id of sorted) {
      await this.initialize(id);
    }
  }

  /**
   * Dispose of a specific plugin.
   *
   * @param id - The plugin ID to dispose
   */
  async dispose(id: string): Promise<void> {
    const entry = this.plugins.get(id);
    if (!entry || !entry.initialized) {
      return;
    }

    await entry.plugin.dispose();
    entry.initialized = false;

    this.context.eventBus.emit('plugin:disposed', { id });
  }

  /**
   * Dispose of all plugins in reverse initialization order.
   */
  async disposeAll(): Promise<void> {
    const sorted = this.topologicalSort().reverse();

    for (const id of sorted) {
      await this.dispose(id);
    }
  }

  /**
   * Get a plugin by ID.
   *
   * @param id - The plugin ID
   * @returns The plugin, or undefined if not found
   */
  get<T extends IPlugin = IPlugin>(id: string): T | undefined {
    const entry = this.plugins.get(id);
    return entry?.plugin as T | undefined;
  }

  /**
   * Check if a plugin is registered.
   *
   * @param id - The plugin ID
   * @returns True if registered
   */
  has(id: string): boolean {
    return this.plugins.has(id);
  }

  /**
   * Check if a plugin is initialized.
   *
   * @param id - The plugin ID
   * @returns True if initialized
   */
  isInitialized(id: string): boolean {
    const entry = this.plugins.get(id);
    return entry?.initialized ?? false;
  }

  /**
   * Get all registered plugin IDs.
   *
   * @returns Array of plugin IDs
   */
  getPluginIds(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get all plugins of a specific type.
   *
   * @param predicate - Filter function to match plugins
   * @returns Array of matching plugins
   */
  getPluginsWhere<T extends IPlugin = IPlugin>(
    predicate: (plugin: IPlugin) => boolean
  ): T[] {
    const result: T[] = [];
    for (const entry of this.plugins.values()) {
      if (predicate(entry.plugin)) {
        result.push(entry.plugin as T);
      }
    }
    return result;
  }

  /**
   * Sort plugins in topological order based on dependencies.
   *
   * @returns Array of plugin IDs in initialization order
   * @throws PluginDependencyError if a dependency is missing
   * @throws CircularDependencyError if a circular dependency exists
   */
  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (id: string, path: string[]): void => {
      if (visited.has(id)) {
        return;
      }

      if (visiting.has(id)) {
        throw new CircularDependencyError([...path, id]);
      }

      const entry = this.plugins.get(id);
      if (!entry) {
        return;
      }

      visiting.add(id);

      const { plugin } = entry;
      if (plugin.dependencies) {
        for (const depId of plugin.dependencies) {
          if (!this.plugins.has(depId)) {
            throw new PluginDependencyError(id, depId);
          }
          visit(depId, [...path, id]);
        }
      }

      visiting.delete(id);
      visited.add(id);
      result.push(id);
    };

    for (const id of this.plugins.keys()) {
      visit(id, []);
    }

    return result;
  }

  /**
   * Get plugin count.
   *
   * @returns The number of registered plugins
   */
  get count(): number {
    return this.plugins.size;
  }

  /**
   * Get initialized plugin count.
   *
   * @returns The number of initialized plugins
   */
  get initializedCount(): number {
    let count = 0;
    for (const entry of this.plugins.values()) {
      if (entry.initialized) {
        count++;
      }
    }
    return count;
  }
}
