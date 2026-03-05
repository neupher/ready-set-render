/**
 * Asset System
 *
 * The asset system provides infrastructure for persistent storage of
 * shaders, materials, scenes, and other resources.
 *
 * Key components:
 * - AssetRegistry: Central registry for all loaded assets
 * - FileSystemAssetStore: File System Access API based persistence
 * - MigrationRunner: Schema migration support
 * - ShaderAssetFactory: Factory for creating shader assets
 * - ShaderCompilationService: Service for compiling shader assets
 * - BuiltInShaders: Pre-defined PBR and Unlit shader assets
 *
 * @example
 * ```typescript
 * import {
 *   AssetRegistry,
 *   FileSystemAssetStore,
 *   MigrationRunner,
 *   ShaderAssetFactory,
 *   BUILT_IN_SHADERS,
 * } from '@core/assets';
 *
 * const registry = new AssetRegistry(eventBus);
 * const store = new FileSystemAssetStore(eventBus);
 * const shaderFactory = new ShaderAssetFactory();
 *
 * // Register built-in shaders
 * for (const shader of BUILT_IN_SHADERS) {
 *   registry.register(shader);
 * }
 * ```
 */

// Interfaces
export type {
  ISerializable,
  IAssetMetadata,
  AssetType,
  IAssetReference,
  IAsset,
  IAssetCreateOptions,
  IAssetStore,
  IFolderOpenResult,
  IAssetLoadResult,
  IAssetSaveResult,
  IMigration,
  IMigrationResult,
  // Shader interfaces
  IShaderAsset,
  IUniformDeclaration,
  UniformType,
  UniformUIType,
  // Material interfaces
  IMaterialAsset,
} from './interfaces';

export {
  isAssetMetadata,
  getAssetFileExtension,
  createAssetReference,
  isAssetReference,
  // Shader type guards
  isShaderAsset,
  isUniformDeclaration,
  // Material type guards
  isMaterialAsset,
} from './interfaces';

// Services
export { AssetRegistry } from './AssetRegistry';
export type {
  AssetRegisteredEvent,
  AssetUnregisteredEvent,
  AssetModifiedEvent,
} from './AssetRegistry';

export { FileSystemAssetStore } from './FileSystemAssetStore';
export type { AssetStoreOpenedEvent, AssetStoreClosedEvent } from './FileSystemAssetStore';

export { MigrationRunner } from './MigrationRunner';

// Shader Assets
export { ShaderAssetFactory } from './ShaderAssetFactory';
export type { IShaderCreateOptions } from './ShaderAssetFactory';
export {
  DEFAULT_UNLIT_VERTEX_SHADER,
  DEFAULT_UNLIT_FRAGMENT_SHADER,
  DEFAULT_UNLIT_UNIFORMS,
  SHADER_ASSET_VERSION,
} from './ShaderAssetFactory';

export { ShaderCompilationService } from './ShaderCompilationService';
export type {
  ShaderErrorType,
  IShaderError,
  IShaderCompilationResult,
} from './ShaderCompilationService';

// Built-in Shaders
export {
  BUILT_IN_SHADER_IDS,
  BUILT_IN_PBR_SHADER,
  BUILT_IN_UNLIT_SHADER,
  BUILT_IN_SHADERS,
  isBuiltInShaderUUID,
} from './BuiltInShaders';

// Material Assets
export { MaterialAssetFactory, MATERIAL_ASSET_VERSION } from './MaterialAssetFactory';
export type { IMaterialCreateOptions } from './MaterialAssetFactory';

// Built-in Materials
export {
  BUILT_IN_MATERIAL_IDS,
  BUILT_IN_DEFAULT_PBR_MATERIAL,
  BUILT_IN_MATERIALS,
  isBuiltInMaterialUUID,
} from './BuiltInMaterials';

// Scene Assets
export { SceneAssetFactory } from './SceneAssetFactory';
export type { CreateSceneOptions } from './SceneAssetFactory';

// Model Assets
export { ModelAssetFactory } from './ModelAssetFactory';
export type { IImportedModelData, IModelCreateOptions } from './ModelAssetFactory';

// Re-export scene-related types from interfaces
export type {
  ISceneAsset,
  ISerializedEntity,
  ISerializedTransform,
  ISerializedComponent,
  ISerializedMeshComponent,
  ISerializedMaterialComponent,
  ISerializedLightComponent,
  ISerializedCameraComponent,
  ISceneSettings,
  SerializedEntityType,
} from './interfaces';

export {
  isSceneAsset,
  isSerializedEntity,
  createDefaultSceneSettings,
  SCENE_ASSET_VERSION,
} from './interfaces';

// Re-export model-related types from interfaces
export type {
  IModelAsset,
  IModelSource,
  IModelContents,
  IModelNode,
  IMeshAssetReference,
  IMaterialAssetReference,
  ITextureAssetReference,
  ModelFormat,
} from './interfaces';

export {
  isModelAsset,
  isModelNode,
  createDefaultModelContents,
  createDefaultModelNode,
  MODEL_ASSET_VERSION,
} from './interfaces';

// Re-export mesh-related types from interfaces
export type {
  IMeshAsset,
  IMeshBounds,
} from './interfaces';

export {
  isMeshAsset,
  calculateMeshBounds,
  createDefaultMeshBounds,
  MESH_ASSET_VERSION,
} from './interfaces';

// Re-export asset meta types from interfaces (Unity-style .assetmeta files)
export type {
  IAssetMeta,
  AssetMetaType,
  IDerivedAssetRef,
  IDerivedMeshRef,
  IDerivedMaterialRef,
  IDerivedTextureRef,
  // Model asset meta
  IModelAssetMeta,
  IModelImportSettings,
  ICoordinateConversionSettings,
  IMeshImportSettings,
  IMaterialImportSettings,
  IAnimationImportSettings,
  IModelMetaContents,
  IModelMetaNode,
  CoordinateUpAxis,
  // Texture asset meta
  ITextureAssetMeta,
  ITextureImportSettings,
  ITextureProperties,
  TextureType,
  AlphaSource,
  WrapMode,
  FilterMode,
  MipMapFilter,
  CompressionQuality,
  MaxTextureSize,
} from './interfaces';

export {
  isAssetMeta,
  isDerivedAssetRef,
  isDerivedMeshRef,
  isDerivedMaterialRef,
  getAssetMetaFilename,
  getSourceFilename,
  ASSET_META_VERSION,
  // Model asset meta
  isModelAssetMeta,
  isModelMetaNode,
  createDefaultModelMetaNode,
  MODEL_ASSET_META_VERSION,
  // Texture asset meta
  isTextureAssetMeta,
  TEXTURE_ASSET_META_VERSION,
} from './interfaces';

// Default Import Settings
export {
  DEFAULT_MODEL_IMPORT_SETTINGS,
  DEFAULT_COORDINATE_SETTINGS,
  DEFAULT_MESH_IMPORT_SETTINGS,
  DEFAULT_MATERIAL_IMPORT_SETTINGS,
  DEFAULT_ANIMATION_IMPORT_SETTINGS,
  createDefaultModelImportSettings,
  DEFAULT_TEXTURE_IMPORT_SETTINGS,
  TEXTURE_TYPE_PRESETS,
  createTextureImportSettings,
  createDefaultTextureImportSettings,
} from './DefaultImportSettings';

// Asset Meta Services (Phase 2)
export { AssetMetaService } from './AssetMetaService';
export type { AssetMetaResult } from './AssetMetaService';

export { SourceHashService } from './SourceHashService';
export type { HashFormat, ParsedHash } from './SourceHashService';

export { ModelAssetMetaFactory } from './ModelAssetMetaFactory';
