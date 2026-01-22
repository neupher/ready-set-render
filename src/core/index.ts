/**
 * Core Module Exports
 *
 * Re-exports all core functionality for convenient importing.
 *
 * @example
 * ```typescript
 * import {
 *   EventBus,
 *   WebGLContext,
 *   SceneGraph,
 *   PluginManager,
 *   type IPlugin,
 *   type IPluginContext
 * } from '@core';
 * ```
 */

// Event System
export { EventBus } from './EventBus';
export type { EventCallback } from './EventBus';

// WebGL Context
export {
  WebGLContext,
  ShaderCompilationError,
  ProgramLinkError,
} from './WebGLContext';

// Scene Graph
export { SceneGraph, SceneObject } from './SceneGraph';

// Camera
export { Camera } from './Camera';

// Plugin Manager
export {
  PluginManager,
  PluginDependencyError,
  CircularDependencyError,
} from './PluginManager';

// Interfaces
export type {
  IPlugin,
  IPluginContext,
  IRenderPipeline,
  RenderPipelineType,
  ICamera,
  IScene,
  ISceneObject,
  IRenderable,
  Transform,
  IImporter,
  ImportResult,
} from './interfaces';

export { createDefaultTransform } from './interfaces';
