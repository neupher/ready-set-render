/**
 * IMigration - Interface for asset schema migrations
 *
 * Migrations enable safe schema evolution over time. When an asset's schema
 * changes, a migration is created to transform old data to the new format.
 *
 * @example
 * ```typescript
 * // Migration from v1 to v2: added 'roughness' field to materials
 * const migration: IMigration = {
 *   fromVersion: 1,
 *   toVersion: 2,
 *   assetType: 'material',
 *   description: 'Add roughness field with default value',
 *   migrate: (data) => ({
 *     ...data,
 *     roughness: 0.5, // Default value
 *     version: 2,
 *   }),
 * };
 * ```
 */

import type { AssetType } from './IAssetMetadata';

/**
 * A migration transforms asset data from one version to another.
 */
export interface IMigration {
  /**
   * The version this migration upgrades from.
   */
  readonly fromVersion: number;

  /**
   * The version this migration upgrades to.
   */
  readonly toVersion: number;

  /**
   * The asset type this migration applies to.
   */
  readonly assetType: AssetType;

  /**
   * Human-readable description of what this migration does.
   */
  readonly description: string;

  /**
   * Transform asset data from the old version to the new version.
   *
   * @param data - The asset data in the old version's schema
   * @returns The asset data in the new version's schema
   */
  migrate(data: unknown): unknown;
}

/**
 * Result of running a migration.
 */
export interface IMigrationResult {
  /**
   * True if migration was successful.
   */
  success: boolean;

  /**
   * The migrated data (if successful).
   */
  data?: unknown;

  /**
   * The version after migration.
   */
  toVersion?: number;

  /**
   * Error message if migration failed.
   */
  error?: string;

  /**
   * List of migrations that were applied.
   */
  appliedMigrations?: string[];
}
