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
  IInitializable,
} from './ISceneObject';
export { createDefaultTransform, isInitializable } from './ISceneObject';
export type { IImporter, ImportResult } from './IImporter';

// Entity Component System
export type { IComponent } from './IComponent';
export type { IEntity } from './IEntity';
export { isEntity } from './IEntity';
export type { IMeshComponent } from './IMeshComponent';
export type { IMaterialComponent } from './IMaterialComponent';
export type { ICameraComponent, CameraClearFlags } from './ICameraComponent';
export { createDefaultCameraComponent } from './ICameraComponent';
export type { ILightComponent, LightType, ILightDirectionProvider } from './ILightComponent';
export { createDefaultDirectionalLightComponent, createDefaultPointLightComponent, createDefaultSpotLightComponent, isLightDirectionProvider } from './ILightComponent';

// Property Editing
export type { IPropertyEditable } from './IPropertyEditable';
export { isPropertyEditable } from './IPropertyEditable';

// Mesh Data
export type { IMeshData, IEdgeData, MeshBounds, IMeshProvider } from './IMeshData';
export { isMeshProvider } from './IMeshData';

// Cloneable
export type { ICloneable } from './ICloneable';
export { isCloneable, cloneEntityBase } from './ICloneable';
