/**
 * Core Interfaces
 *
 * Re-exports all interface definitions for convenient importing.
 *
 * @example
 * ```typescript
 * import { IPlugin, IPluginContext, IRenderPipeline } from '@core/interfaces';
 * ```
 */

export type { IPlugin, IPluginContext } from './IPlugin';
export type {
  IRenderPipeline,
  RenderPipelineType,
  ICamera,
  IScene,
} from './IRenderPipeline';
export type {
  ISceneObject,
  IRenderable,
  Transform,
} from './ISceneObject';
export { createDefaultTransform } from './ISceneObject';
export type { IImporter, ImportResult } from './IImporter';
