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
 *
 * @example
 * ```typescript
 * import { AssetRegistry, FileSystemAssetStore, MigrationRunner } from '@core/assets';
 *
 * const registry = new AssetRegistry(eventBus);
 * const store = new FileSystemAssetStore(eventBus);
 * const migrations = new MigrationRunner();
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
} from './interfaces';

export {
  isAssetMetadata,
  getAssetFileExtension,
  createAssetReference,
  isAssetReference,
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
