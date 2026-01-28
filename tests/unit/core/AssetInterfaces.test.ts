/**
 * Asset Interfaces Tests
 *
 * Tests for asset metadata, references, and utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  isAssetMetadata,
  getAssetFileExtension,
  createAssetReference,
  isAssetReference,
} from '../../../src/core/assets/interfaces';
import type { IAssetMetadata, AssetType } from '../../../src/core/assets/interfaces';

describe('Asset Interfaces', () => {
  describe('isAssetMetadata', () => {
    it('should return true for valid asset metadata', () => {
      const validAsset: IAssetMetadata = {
        uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Test Asset',
        type: 'material',
        version: 1,
        created: '2026-01-28T12:00:00Z',
        modified: '2026-01-28T12:00:00Z',
      };

      expect(isAssetMetadata(validAsset)).toBe(true);
    });

    it('should return true for all asset types', () => {
      const types: AssetType[] = ['shader', 'material', 'scene', 'texture'];

      for (const type of types) {
        const asset = {
          uuid: 'test-uuid',
          name: 'Test',
          type,
          version: 1,
          created: '2026-01-28T12:00:00Z',
          modified: '2026-01-28T12:00:00Z',
        };
        expect(isAssetMetadata(asset)).toBe(true);
      }
    });

    it('should return false for null', () => {
      expect(isAssetMetadata(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isAssetMetadata(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isAssetMetadata('string')).toBe(false);
      expect(isAssetMetadata(42)).toBe(false);
      expect(isAssetMetadata(true)).toBe(false);
    });

    it('should return false for missing uuid', () => {
      const invalid = {
        name: 'Test',
        type: 'material',
        version: 1,
        created: '2026-01-28T12:00:00Z',
        modified: '2026-01-28T12:00:00Z',
      };
      expect(isAssetMetadata(invalid)).toBe(false);
    });

    it('should return false for missing name', () => {
      const invalid = {
        uuid: 'test-uuid',
        type: 'material',
        version: 1,
        created: '2026-01-28T12:00:00Z',
        modified: '2026-01-28T12:00:00Z',
      };
      expect(isAssetMetadata(invalid)).toBe(false);
    });

    it('should return false for invalid type', () => {
      const invalid = {
        uuid: 'test-uuid',
        name: 'Test',
        type: 'invalid',
        version: 1,
        created: '2026-01-28T12:00:00Z',
        modified: '2026-01-28T12:00:00Z',
      };
      expect(isAssetMetadata(invalid)).toBe(false);
    });

    it('should return false for non-number version', () => {
      const invalid = {
        uuid: 'test-uuid',
        name: 'Test',
        type: 'material',
        version: '1',
        created: '2026-01-28T12:00:00Z',
        modified: '2026-01-28T12:00:00Z',
      };
      expect(isAssetMetadata(invalid)).toBe(false);
    });

    it('should return false for missing timestamps', () => {
      const noCreated = {
        uuid: 'test-uuid',
        name: 'Test',
        type: 'material',
        version: 1,
        modified: '2026-01-28T12:00:00Z',
      };
      expect(isAssetMetadata(noCreated)).toBe(false);

      const noModified = {
        uuid: 'test-uuid',
        name: 'Test',
        type: 'material',
        version: 1,
        created: '2026-01-28T12:00:00Z',
      };
      expect(isAssetMetadata(noModified)).toBe(false);
    });
  });

  describe('getAssetFileExtension', () => {
    it('should return correct extension for shader', () => {
      expect(getAssetFileExtension('shader')).toBe('.shader.json');
    });

    it('should return correct extension for material', () => {
      expect(getAssetFileExtension('material')).toBe('.material.json');
    });

    it('should return correct extension for scene', () => {
      expect(getAssetFileExtension('scene')).toBe('.scene.json');
    });

    it('should return correct extension for texture', () => {
      expect(getAssetFileExtension('texture')).toBe('.texture.json');
    });
  });

  describe('createAssetReference', () => {
    it('should create asset reference with uuid and type', () => {
      const ref = createAssetReference('test-uuid', 'material');

      expect(ref).toEqual({
        uuid: 'test-uuid',
        type: 'material',
      });
    });

    it('should create reference for all asset types', () => {
      const types: AssetType[] = ['shader', 'material', 'scene', 'texture'];

      for (const type of types) {
        const ref = createAssetReference('uuid', type);
        expect(ref.type).toBe(type);
      }
    });
  });

  describe('isAssetReference', () => {
    it('should return true for valid reference', () => {
      const ref = { uuid: 'test-uuid', type: 'material' };
      expect(isAssetReference(ref)).toBe(true);
    });

    it('should return true for all asset types', () => {
      const types: AssetType[] = ['shader', 'material', 'scene', 'texture'];

      for (const type of types) {
        const ref = { uuid: 'test', type };
        expect(isAssetReference(ref)).toBe(true);
      }
    });

    it('should return false for null', () => {
      expect(isAssetReference(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isAssetReference(undefined)).toBe(false);
    });

    it('should return false for missing uuid', () => {
      expect(isAssetReference({ type: 'material' })).toBe(false);
    });

    it('should return false for missing type', () => {
      expect(isAssetReference({ uuid: 'test' })).toBe(false);
    });

    it('should return false for invalid type', () => {
      expect(isAssetReference({ uuid: 'test', type: 'invalid' })).toBe(false);
    });

    it('should return false for non-string uuid', () => {
      expect(isAssetReference({ uuid: 123, type: 'material' })).toBe(false);
    });
  });
});
