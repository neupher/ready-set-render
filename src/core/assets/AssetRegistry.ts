/**
 * AssetRegistry - Central registry for all loaded assets
 *
 * The AssetRegistry is the single source of truth for all assets in the editor.
 * It manages registration, lookup, and events for assets of all types.
 *
 * @example
 * ```typescript
 * const registry = new AssetRegistry(eventBus);
 *
 * // Register an asset
 * registry.register(myMaterial);
 *
 * // Get an asset by UUID
 * const material = registry.get<IMaterialAsset>('uuid-here');
 *
 * // Get all assets of a type
 * const allMaterials = registry.getByType<IMaterialAsset>('material');
 *
 * // Listen for changes
 * eventBus.on('asset:registered', ({ asset }) => {
 *   console.log('Asset registered:', asset.name);
 * });
 * ```
 */

import type { EventBus } from '../EventBus';
import type { IAsset, AssetType, IAssetReference } from './interfaces';

/**
 * Event data for asset registration events.
 */
export interface AssetRegisteredEvent {
  asset: IAsset;
}

/**
 * Event data for asset unregistration events.
 */
export interface AssetUnregisteredEvent {
  uuid: string;
  type: AssetType;
  name: string;
}

/**
 * Event data for asset modification events.
 */
export interface AssetModifiedEvent {
  asset: IAsset;
  field?: string;
}

/**
 * Central registry for all assets in the editor.
 * Provides CRUD operations and event notifications.
 */
export class AssetRegistry {
  /**
   * Primary storage: UUID -> Asset
   */
  private readonly assets = new Map<string, IAsset>();

  /**
   * Secondary index: Type -> Set of UUIDs
   * Enables efficient lookup by asset type.
   */
  private readonly typeIndex = new Map<AssetType, Set<string>>();

  /**
   * Create a new AssetRegistry.
   *
   * @param eventBus - The event bus for publishing asset events
   */
  constructor(private readonly eventBus: EventBus) {
    // Initialize type indices
    this.typeIndex.set('shader', new Set());
    this.typeIndex.set('material', new Set());
    this.typeIndex.set('scene', new Set());
    this.typeIndex.set('texture', new Set());
  }

  /**
   * Register an asset in the registry.
   * Emits 'asset:registered' event on success.
   *
   * @param asset - The asset to register
   * @throws Error if an asset with the same UUID already exists
   */
  register(asset: IAsset): void {
    if (this.assets.has(asset.uuid)) {
      throw new Error(
        `Asset with UUID ${asset.uuid} already registered. ` +
          `Use update() to modify existing assets.`
      );
    }

    this.assets.set(asset.uuid, asset);
    this.typeIndex.get(asset.type)?.add(asset.uuid);

    this.eventBus.emit<AssetRegisteredEvent>('asset:registered', { asset });
  }

  /**
   * Unregister an asset from the registry.
   * Emits 'asset:unregistered' event on success.
   *
   * @param uuid - The UUID of the asset to unregister
   * @returns True if the asset was removed, false if not found
   */
  unregister(uuid: string): boolean {
    const asset = this.assets.get(uuid);
    if (!asset) {
      return false;
    }

    this.assets.delete(uuid);
    this.typeIndex.get(asset.type)?.delete(uuid);

    this.eventBus.emit<AssetUnregisteredEvent>('asset:unregistered', {
      uuid,
      type: asset.type,
      name: asset.name,
    });

    return true;
  }

  /**
   * Get an asset by UUID.
   *
   * @param uuid - The UUID of the asset
   * @returns The asset if found, undefined otherwise
   */
  get<T extends IAsset = IAsset>(uuid: string): T | undefined {
    return this.assets.get(uuid) as T | undefined;
  }

  /**
   * Resolve an asset reference to the actual asset.
   *
   * @param ref - The asset reference to resolve
   * @returns The referenced asset if found, undefined otherwise
   */
  resolve<T extends IAsset = IAsset>(ref: IAssetReference): T | undefined {
    const asset = this.assets.get(ref.uuid);
    if (asset && asset.type === ref.type) {
      return asset as T;
    }
    return undefined;
  }

  /**
   * Check if an asset exists in the registry.
   *
   * @param uuid - The UUID to check
   * @returns True if the asset exists
   */
  has(uuid: string): boolean {
    return this.assets.has(uuid);
  }

  /**
   * Get all assets of a specific type.
   *
   * @param type - The asset type to filter by
   * @returns Array of assets of the specified type
   */
  getByType<T extends IAsset = IAsset>(type: AssetType): T[] {
    const uuids = this.typeIndex.get(type);
    if (!uuids) {
      return [];
    }

    const result: T[] = [];
    for (const uuid of uuids) {
      const asset = this.assets.get(uuid);
      if (asset) {
        result.push(asset as T);
      }
    }
    return result;
  }

  /**
   * Get all registered assets.
   *
   * @returns Array of all assets
   */
  getAll(): IAsset[] {
    return Array.from(this.assets.values());
  }

  /**
   * Get the count of assets, optionally filtered by type.
   *
   * @param type - Optional type to count
   * @returns The number of assets
   */
  count(type?: AssetType): number {
    if (type) {
      return this.typeIndex.get(type)?.size ?? 0;
    }
    return this.assets.size;
  }

  /**
   * Notify the registry that an asset has been modified.
   * This updates the modified timestamp and emits an event.
   *
   * @param uuid - The UUID of the modified asset
   * @param field - Optional field name that was modified
   */
  notifyModified(uuid: string, field?: string): void {
    const asset = this.assets.get(uuid);
    if (!asset) {
      return;
    }

    // Update the modified timestamp
    asset.modified = new Date().toISOString();

    this.eventBus.emit<AssetModifiedEvent>('asset:modified', {
      asset,
      field,
    });
  }

  /**
   * Find assets by name (partial match, case-insensitive).
   *
   * @param query - The search query
   * @param type - Optional type filter
   * @returns Array of matching assets
   */
  search(query: string, type?: AssetType): IAsset[] {
    const lowerQuery = query.toLowerCase();
    const results: IAsset[] = [];

    const searchSet = type ? this.typeIndex.get(type) : this.assets.keys();

    if (!searchSet) {
      return results;
    }

    for (const uuid of searchSet) {
      const asset = this.assets.get(uuid);
      if (asset && asset.name.toLowerCase().includes(lowerQuery)) {
        results.push(asset);
      }
    }

    return results;
  }

  /**
   * Clear all assets from the registry.
   * Emits 'asset:unregistered' for each asset.
   */
  clear(): void {
    // Collect all assets to emit events
    const allAssets = Array.from(this.assets.values());

    // Clear storage
    this.assets.clear();
    for (const set of this.typeIndex.values()) {
      set.clear();
    }

    // Emit events for each cleared asset
    for (const asset of allAssets) {
      this.eventBus.emit<AssetUnregisteredEvent>('asset:unregistered', {
        uuid: asset.uuid,
        type: asset.type,
        name: asset.name,
      });
    }
  }
}
