/**
 * MigrationRunner - Executes asset schema migrations
 *
 * The MigrationRunner manages and executes migrations to upgrade asset
 * data from older versions to the current version. Migrations are applied
 * in sequence to ensure data integrity.
 *
 * @example
 * ```typescript
 * const runner = new MigrationRunner();
 *
 * // Register migrations
 * runner.register(migrationV1ToV2);
 * runner.register(migrationV2ToV3);
 *
 * // Migrate asset data
 * const result = runner.migrate(oldAssetData, 'material', 1);
 * if (result.success) {
 *   console.log('Migrated to version:', result.toVersion);
 * }
 * ```
 */

import type { AssetType } from './interfaces/IAssetMetadata';
import type { IMigration, IMigrationResult } from './interfaces/IMigration';

/**
 * Runs asset migrations to upgrade data from older versions.
 */
export class MigrationRunner {
  /**
   * Registered migrations indexed by asset type and version.
   * Structure: type -> fromVersion -> migration
   */
  private migrations = new Map<AssetType, Map<number, IMigration>>();

  /**
   * Current schema versions for each asset type.
   * Assets should be migrated to these versions.
   */
  private currentVersions = new Map<AssetType, number>();

  /**
   * Register a migration.
   *
   * @param migration - The migration to register
   * @throws Error if a migration for the same type and version already exists
   */
  register(migration: IMigration): void {
    let typeMigrations = this.migrations.get(migration.assetType);
    if (!typeMigrations) {
      typeMigrations = new Map();
      this.migrations.set(migration.assetType, typeMigrations);
    }

    if (typeMigrations.has(migration.fromVersion)) {
      throw new Error(
        `Migration already registered for ${migration.assetType} ` +
          `from version ${migration.fromVersion}`
      );
    }

    typeMigrations.set(migration.fromVersion, migration);

    // Track the highest version we can migrate to
    const currentVersion = this.currentVersions.get(migration.assetType) ?? 0;
    if (migration.toVersion > currentVersion) {
      this.currentVersions.set(migration.assetType, migration.toVersion);
    }
  }

  /**
   * Get the current schema version for an asset type.
   *
   * @param assetType - The asset type
   * @returns The current version (0 if no migrations registered)
   */
  getCurrentVersion(assetType: AssetType): number {
    return this.currentVersions.get(assetType) ?? 1;
  }

  /**
   * Set the current schema version for an asset type.
   * This is useful when no migrations exist yet but you want to track the version.
   *
   * @param assetType - The asset type
   * @param version - The current version
   */
  setCurrentVersion(assetType: AssetType, version: number): void {
    this.currentVersions.set(assetType, version);
  }

  /**
   * Check if migration is needed for asset data.
   *
   * @param assetType - The asset type
   * @param dataVersion - The version of the data
   * @returns True if migration is needed
   */
  needsMigration(assetType: AssetType, dataVersion: number): boolean {
    const currentVersion = this.getCurrentVersion(assetType);
    return dataVersion < currentVersion;
  }

  /**
   * Migrate asset data to the current version.
   *
   * @param data - The asset data to migrate
   * @param assetType - The asset type
   * @param fromVersion - The version of the input data
   * @returns Migration result with the upgraded data
   */
  migrate(data: unknown, assetType: AssetType, fromVersion: number): IMigrationResult {
    const currentVersion = this.getCurrentVersion(assetType);

    // No migration needed
    if (fromVersion >= currentVersion) {
      return {
        success: true,
        data,
        toVersion: fromVersion,
        appliedMigrations: [],
      };
    }

    const typeMigrations = this.migrations.get(assetType);
    if (!typeMigrations) {
      // No migrations registered, can't upgrade
      return {
        success: false,
        error: `No migrations registered for asset type: ${assetType}`,
      };
    }

    let currentData = data;
    let currentDataVersion = fromVersion;
    const appliedMigrations: string[] = [];

    // Apply migrations in sequence
    while (currentDataVersion < currentVersion) {
      const migration = typeMigrations.get(currentDataVersion);

      if (!migration) {
        // Gap in migration chain
        return {
          success: false,
          error:
            `Missing migration for ${assetType} from version ${currentDataVersion}. ` +
            `Cannot upgrade to version ${currentVersion}.`,
          data: currentData,
          toVersion: currentDataVersion,
          appliedMigrations,
        };
      }

      try {
        currentData = migration.migrate(currentData);
        appliedMigrations.push(
          `v${migration.fromVersion} → v${migration.toVersion}: ${migration.description}`
        );
        currentDataVersion = migration.toVersion;
      } catch (error) {
        return {
          success: false,
          error:
            `Migration failed for ${assetType} v${migration.fromVersion} → v${migration.toVersion}: ` +
            (error instanceof Error ? error.message : 'Unknown error'),
          data: currentData,
          toVersion: currentDataVersion,
          appliedMigrations,
        };
      }
    }

    return {
      success: true,
      data: currentData,
      toVersion: currentDataVersion,
      appliedMigrations,
    };
  }

  /**
   * Get all registered migrations for an asset type.
   *
   * @param assetType - The asset type
   * @returns Array of migrations sorted by fromVersion
   */
  getMigrations(assetType: AssetType): IMigration[] {
    const typeMigrations = this.migrations.get(assetType);
    if (!typeMigrations) {
      return [];
    }

    return Array.from(typeMigrations.values()).sort((a, b) => a.fromVersion - b.fromVersion);
  }

  /**
   * Clear all registered migrations.
   */
  clear(): void {
    this.migrations.clear();
    this.currentVersions.clear();
  }
}
