/**
 * Asset Interfaces
 *
 * Re-exports all asset-related interface definitions.
 *
 * @example
 * ```typescript
 * import { IAsset, IAssetMetadata, IAssetReference } from '@core/assets/interfaces';
 * ```
 */

// Serialization
export type { ISerializable } from './ISerializable';

// Asset Metadata
export type { IAssetMetadata, AssetType } from './IAssetMetadata';
export { isAssetMetadata, getAssetFileExtension } from './IAssetMetadata';

// Asset References
export type { IAssetReference } from './IAssetReference';
export { createAssetReference, isAssetReference } from './IAssetReference';

// Base Asset
export type { IAsset, IAssetCreateOptions } from './IAsset';

// Asset Store
export type {
  IAssetStore,
  IFolderOpenResult,
  IAssetLoadResult,
  IAssetSaveResult,
} from './IAssetStore';

// Migrations
export type { IMigration, IMigrationResult } from './IMigration';

// Shader Assets
export type {
  IShaderAsset,
  IUniformDeclaration,
  UniformType,
  UniformUIType,
} from './IShaderAsset';
export { isShaderAsset, isUniformDeclaration } from './IShaderAsset';

// Material Assets
export type { IMaterialAsset } from './IMaterialAsset';
export { isMaterialAsset } from './IMaterialAsset';

// Scene Assets
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
} from './ISceneAsset';
export {
  isSceneAsset,
  isSerializedEntity,
  createDefaultSceneSettings,
  SCENE_ASSET_VERSION,
} from './ISceneAsset';

// Model Assets
export type {
  IModelAsset,
  IModelSource,
  IModelContents,
  IModelNode,
  IMeshAssetReference,
  IMaterialAssetReference,
  ITextureAssetReference,
  ModelFormat,
} from './IModelAsset';
export {
  isModelAsset,
  isModelNode,
  createDefaultModelContents,
  createDefaultModelNode,
  MODEL_ASSET_VERSION,
} from './IModelAsset';

// Mesh Assets
export type { IMeshAsset, IMeshBounds } from './IMeshAsset';
export {
  isMeshAsset,
  calculateMeshBounds,
  createDefaultMeshBounds,
  MESH_ASSET_VERSION,
} from './IMeshAsset';

// Asset Meta (Unity-style .assetmeta files)
export type {
  IAssetMeta,
  AssetMetaType,
  IDerivedAssetRef,
  IDerivedMeshRef,
  IDerivedMaterialRef,
  IDerivedTextureRef,
} from './IAssetMeta';
export {
  isAssetMeta,
  isDerivedAssetRef,
  isDerivedMeshRef,
  isDerivedMaterialRef,
  getAssetMetaFilename,
  getSourceFilename,
  ASSET_META_VERSION,
} from './IAssetMeta';

// Model Asset Meta
export type {
  IModelAssetMeta,
  IModelImportSettings,
  ICoordinateConversionSettings,
  IMeshImportSettings,
  IMaterialImportSettings,
  IAnimationImportSettings,
  IModelMetaContents,
  IModelMetaNode,
  CoordinateUpAxis,
} from './IModelAssetMeta';
export {
  isModelAssetMeta,
  isModelMetaNode,
  createDefaultModelMetaNode,
  MODEL_ASSET_META_VERSION,
} from './IModelAssetMeta';

// Texture Asset Meta
export type {
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
} from './ITextureAssetMeta';
export {
  isTextureAssetMeta,
  TEXTURE_ASSET_META_VERSION,
} from './ITextureAssetMeta';
