/**
 * Plugin Interface
 *
 * Base interface that all plugins must implement.
 * Plugins are the primary extensibility mechanism for the WebGL Editor.
 */

import type { EventBus } from '../EventBus';

/**
 * Context provided to plugins during initialization.
 * Contains all core services a plugin may need.
 */
export interface IPluginContext {
  /** Event bus for inter-module communication */
  readonly eventBus: EventBus;
  /** The main WebGL canvas element */
  readonly canvas: HTMLCanvasElement;
  /** The WebGL2 rendering context */
  readonly gl: WebGL2RenderingContext;
}

/**
 * Base plugin interface.
 * All plugins must implement this interface.
 *
 * @example
 * ```typescript
 * class MyPlugin implements IPlugin {
 *   readonly id = 'my-plugin';
 *   readonly name = 'My Plugin';
 *   readonly version = '1.0.0';
 *
 *   async initialize(context: IPluginContext): Promise<void> {
 *     // Setup code
 *   }
 *
 *   async dispose(): Promise<void> {
 *     // Cleanup code
 *   }
 * }
 * ```
 */
export interface IPlugin {
  /** Unique identifier for the plugin */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Semantic version string */
  readonly version: string;
  /** Optional list of plugin IDs this plugin depends on */
  readonly dependencies?: string[];

  /**
   * Initialize the plugin with the provided context.
   * Called by PluginManager after all dependencies are initialized.
   *
   * @param context - The plugin context containing core services
   */
  initialize(context: IPluginContext): Promise<void>;

  /**
   * Dispose of the plugin and clean up resources.
   * Called by PluginManager when the plugin is unloaded.
   */
  dispose(): Promise<void>;
}
