/**
 * MigrationRunner Tests
 *
 * Tests for the asset schema migration system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MigrationRunner } from '../../../src/core/assets/MigrationRunner';
import type { IMigration } from '../../../src/core/assets/interfaces';

describe('MigrationRunner', () => {
  let runner: MigrationRunner;

  beforeEach(() => {
    runner = new MigrationRunner();
  });

  describe('register', () => {
    it('should register a migration', () => {
      const migration: IMigration = {
        fromVersion: 1,
        toVersion: 2,
        assetType: 'material',
        description: 'Add roughness field',
        migrate: (data) => ({ ...data as object, roughness: 0.5, version: 2 }),
      };

      runner.register(migration);

      expect(runner.getMigrations('material')).toHaveLength(1);
    });

    it('should throw when registering duplicate migration', () => {
      const migration: IMigration = {
        fromVersion: 1,
        toVersion: 2,
        assetType: 'material',
        description: 'First migration',
        migrate: (data) => data,
      };

      runner.register(migration);

      const duplicate: IMigration = {
        fromVersion: 1,
        toVersion: 2,
        assetType: 'material',
        description: 'Duplicate migration',
        migrate: (data) => data,
      };

      expect(() => runner.register(duplicate)).toThrow(/already registered/);
    });

    it('should track current version', () => {
      runner.register({
        fromVersion: 1,
        toVersion: 2,
        assetType: 'material',
        description: 'v1 to v2',
        migrate: (data) => data,
      });

      runner.register({
        fromVersion: 2,
        toVersion: 3,
        assetType: 'material',
        description: 'v2 to v3',
        migrate: (data) => data,
      });

      expect(runner.getCurrentVersion('material')).toBe(3);
    });
  });

  describe('getCurrentVersion', () => {
    it('should return 1 for types without migrations', () => {
      expect(runner.getCurrentVersion('material')).toBe(1);
    });

    it('should return highest toVersion', () => {
      runner.register({
        fromVersion: 1,
        toVersion: 2,
        assetType: 'shader',
        description: 'v1 to v2',
        migrate: (data) => data,
      });

      expect(runner.getCurrentVersion('shader')).toBe(2);
    });
  });

  describe('setCurrentVersion', () => {
    it('should set current version for an asset type', () => {
      runner.setCurrentVersion('material', 5);

      expect(runner.getCurrentVersion('material')).toBe(5);
    });
  });

  describe('needsMigration', () => {
    it('should return true when data version is lower', () => {
      runner.setCurrentVersion('material', 3);

      expect(runner.needsMigration('material', 1)).toBe(true);
      expect(runner.needsMigration('material', 2)).toBe(true);
    });

    it('should return false when data version is current or higher', () => {
      runner.setCurrentVersion('material', 3);

      expect(runner.needsMigration('material', 3)).toBe(false);
      expect(runner.needsMigration('material', 4)).toBe(false);
    });
  });

  describe('migrate', () => {
    it('should return unchanged data when no migration needed', () => {
      const data = { uuid: 'test', version: 1 };
      runner.setCurrentVersion('material', 1);

      const result = runner.migrate(data, 'material', 1);

      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
      expect(result.toVersion).toBe(1);
      expect(result.appliedMigrations).toEqual([]);
    });

    it('should apply single migration', () => {
      runner.register({
        fromVersion: 1,
        toVersion: 2,
        assetType: 'material',
        description: 'Add roughness',
        migrate: (data) => ({
          ...(data as object),
          roughness: 0.5,
          version: 2,
        }),
      });

      const data = { uuid: 'test', version: 1, color: 'red' };
      const result = runner.migrate(data, 'material', 1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        uuid: 'test',
        version: 2,
        color: 'red',
        roughness: 0.5,
      });
      expect(result.toVersion).toBe(2);
      expect(result.appliedMigrations).toHaveLength(1);
      expect(result.appliedMigrations![0]).toContain('Add roughness');
    });

    it('should apply multiple migrations in sequence', () => {
      runner.register({
        fromVersion: 1,
        toVersion: 2,
        assetType: 'material',
        description: 'Add roughness',
        migrate: (data) => ({
          ...(data as object),
          roughness: 0.5,
          version: 2,
        }),
      });

      runner.register({
        fromVersion: 2,
        toVersion: 3,
        assetType: 'material',
        description: 'Add metallic',
        migrate: (data) => ({
          ...(data as object),
          metallic: 0.0,
          version: 3,
        }),
      });

      const data = { uuid: 'test', version: 1 };
      const result = runner.migrate(data, 'material', 1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        uuid: 'test',
        version: 3,
        roughness: 0.5,
        metallic: 0.0,
      });
      expect(result.toVersion).toBe(3);
      expect(result.appliedMigrations).toHaveLength(2);
    });

    it('should fail when migration chain has gap', () => {
      runner.register({
        fromVersion: 1,
        toVersion: 2,
        assetType: 'material',
        description: 'v1 to v2',
        migrate: (data) => data,
      });

      // Missing v2 to v3
      runner.register({
        fromVersion: 3,
        toVersion: 4,
        assetType: 'material',
        description: 'v3 to v4',
        migrate: (data) => data,
      });

      const result = runner.migrate({ uuid: 'test' }, 'material', 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing migration');
      expect(result.toVersion).toBe(2);
    });

    it('should fail when no migrations registered for type', () => {
      runner.setCurrentVersion('material', 2);

      const result = runner.migrate({ uuid: 'test' }, 'material', 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No migrations registered');
    });

    it('should handle migration errors gracefully', () => {
      runner.register({
        fromVersion: 1,
        toVersion: 2,
        assetType: 'material',
        description: 'Broken migration',
        migrate: () => {
          throw new Error('Migration failed!');
        },
      });

      const result = runner.migrate({ uuid: 'test' }, 'material', 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Migration failed');
      expect(result.toVersion).toBe(1);
    });

    it('should stop at failed migration in chain', () => {
      runner.register({
        fromVersion: 1,
        toVersion: 2,
        assetType: 'material',
        description: 'Working migration',
        migrate: (data) => ({ ...(data as object), step1: true, version: 2 }),
      });

      runner.register({
        fromVersion: 2,
        toVersion: 3,
        assetType: 'material',
        description: 'Broken migration',
        migrate: () => {
          throw new Error('Oops!');
        },
      });

      const result = runner.migrate({ uuid: 'test', version: 1 }, 'material', 1);

      expect(result.success).toBe(false);
      expect(result.toVersion).toBe(2);
      expect(result.data).toEqual({ uuid: 'test', version: 2, step1: true });
      expect(result.appliedMigrations).toHaveLength(1);
    });
  });

  describe('getMigrations', () => {
    it('should return empty array for type with no migrations', () => {
      expect(runner.getMigrations('material')).toEqual([]);
    });

    it('should return migrations sorted by fromVersion', () => {
      runner.register({
        fromVersion: 3,
        toVersion: 4,
        assetType: 'material',
        description: 'v3 to v4',
        migrate: (data) => data,
      });

      runner.register({
        fromVersion: 1,
        toVersion: 2,
        assetType: 'material',
        description: 'v1 to v2',
        migrate: (data) => data,
      });

      runner.register({
        fromVersion: 2,
        toVersion: 3,
        assetType: 'material',
        description: 'v2 to v3',
        migrate: (data) => data,
      });

      const migrations = runner.getMigrations('material');

      expect(migrations).toHaveLength(3);
      expect(migrations[0].fromVersion).toBe(1);
      expect(migrations[1].fromVersion).toBe(2);
      expect(migrations[2].fromVersion).toBe(3);
    });
  });

  describe('clear', () => {
    it('should clear all migrations', () => {
      runner.register({
        fromVersion: 1,
        toVersion: 2,
        assetType: 'material',
        description: 'test',
        migrate: (data) => data,
      });
      runner.setCurrentVersion('shader', 3);

      runner.clear();

      expect(runner.getMigrations('material')).toEqual([]);
      expect(runner.getCurrentVersion('shader')).toBe(1);
    });
  });
});
