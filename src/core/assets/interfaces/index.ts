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
