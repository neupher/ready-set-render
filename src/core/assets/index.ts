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
