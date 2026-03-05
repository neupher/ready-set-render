/**
 * IAssetMeta Tests
 *
 * Tests for base asset metadata interfaces and type guards.
 */

import { describe, it, expect } from 'vitest';
import {
  isAssetMeta,
  isDerivedAssetRef,
  isDerivedMeshRef,
  isDerivedMaterialRef,
  getAssetMetaFilename,
  getSourceFilename,
  ASSET_META_VERSION,
  type IAssetMeta,
  type IDerivedAssetRef,
  type IDerivedMeshRef,
  type IDerivedMaterialRef,
} from '../../../src/core/assets/interfaces/IAssetMeta';

describe('IAssetMeta', () => {
  /**
   * Create a valid asset meta for testing.
   */
  function createValidAssetMeta(): IAssetMeta {
    return {
      version: ASSET_META_VERSION,
      uuid: 'test-asset-uuid',
      type: 'model',
      importedAt: '2026-03-04T12:00:00Z',
      sourceHash: 'size:1234567:mtime:1709564400000',
      isDirty: false,
      sourcePath: 'Assets/Models/car.glb',
    };
  }

  describe('isAssetMeta', () => {
    it('should return true for valid asset meta', () => {
      const meta = createValidAssetMeta();
      expect(isAssetMeta(meta)).toBe(true);
    });

    it('should return true for all valid meta types', () => {
      const types = ['model', 'texture', 'audio', 'other'] as const;
      for (const type of types) {
        const meta = { ...createValidAssetMeta(), type };
        expect(isAssetMeta(meta)).toBe(true);
      }
    });

    it('should return true for dirty asset', () => {
      const meta = { ...createValidAssetMeta(), isDirty: true };
      expect(isAssetMeta(meta)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isAssetMeta(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isAssetMeta(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isAssetMeta('not an object')).toBe(false);
      expect(isAssetMeta(123)).toBe(false);
      expect(isAssetMeta(true)).toBe(false);
    });

    it('should return false for missing version', () => {
      const meta = createValidAssetMeta();
      delete (meta as unknown as Record<string, unknown>).version;
      expect(isAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing uuid', () => {
      const meta = createValidAssetMeta();
      delete (meta as unknown as Record<string, unknown>).uuid;
      expect(isAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing type', () => {
      const meta = createValidAssetMeta();
      delete (meta as unknown as Record<string, unknown>).type;
      expect(isAssetMeta(meta)).toBe(false);
    });

    it('should return false for invalid type', () => {
      const meta = createValidAssetMeta();
      (meta as unknown as Record<string, unknown>).type = 'invalid';
      expect(isAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing importedAt', () => {
      const meta = createValidAssetMeta();
      delete (meta as unknown as Record<string, unknown>).importedAt;
      expect(isAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing sourceHash', () => {
      const meta = createValidAssetMeta();
      delete (meta as unknown as Record<string, unknown>).sourceHash;
      expect(isAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing isDirty', () => {
      const meta = createValidAssetMeta();
      delete (meta as unknown as Record<string, unknown>).isDirty;
      expect(isAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing sourcePath', () => {
      const meta = createValidAssetMeta();
      delete (meta as unknown as Record<string, unknown>).sourcePath;
      expect(isAssetMeta(meta)).toBe(false);
    });
  });

  describe('isDerivedAssetRef', () => {
    function createValidDerivedRef(): IDerivedAssetRef {
      return {
        uuid: 'derived-uuid',
        name: 'Derived Asset',
        sourceIndex: 0,
      };
    }

    it('should return true for valid derived asset ref', () => {
      const ref = createValidDerivedRef();
      expect(isDerivedAssetRef(ref)).toBe(true);
    });

    it('should return true for ref with higher source index', () => {
      const ref = { ...createValidDerivedRef(), sourceIndex: 5 };
      expect(isDerivedAssetRef(ref)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isDerivedAssetRef(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isDerivedAssetRef(undefined)).toBe(false);
    });

    it('should return false for missing uuid', () => {
      const ref = createValidDerivedRef();
      delete (ref as unknown as Record<string, unknown>).uuid;
      expect(isDerivedAssetRef(ref)).toBe(false);
    });

    it('should return false for missing name', () => {
      const ref = createValidDerivedRef();
      delete (ref as unknown as Record<string, unknown>).name;
      expect(isDerivedAssetRef(ref)).toBe(false);
    });

    it('should return false for missing sourceIndex', () => {
      const ref = createValidDerivedRef();
      delete (ref as unknown as Record<string, unknown>).sourceIndex;
      expect(isDerivedAssetRef(ref)).toBe(false);
    });
  });

  describe('isDerivedMeshRef', () => {
    function createValidMeshRef(): IDerivedMeshRef {
      return {
        uuid: 'mesh-uuid',
        name: 'Body',
        sourceIndex: 0,
        vertexCount: 1000,
        triangleCount: 500,
      };
    }

    it('should return true for valid mesh ref', () => {
      const ref = createValidMeshRef();
      expect(isDerivedMeshRef(ref)).toBe(true);
    });

    it('should return false for missing vertexCount', () => {
      const ref = createValidMeshRef();
      delete (ref as unknown as Record<string, unknown>).vertexCount;
      expect(isDerivedMeshRef(ref)).toBe(false);
    });

    it('should return false for missing triangleCount', () => {
      const ref = createValidMeshRef();
      delete (ref as unknown as Record<string, unknown>).triangleCount;
      expect(isDerivedMeshRef(ref)).toBe(false);
    });

    it('should return false for base ref without mesh fields', () => {
      const ref: IDerivedAssetRef = {
        uuid: 'base-uuid',
        name: 'Base',
        sourceIndex: 0,
      };
      expect(isDerivedMeshRef(ref)).toBe(false);
    });
  });

  describe('isDerivedMaterialRef', () => {
    function createValidMaterialRef(): IDerivedMaterialRef {
      return {
        uuid: 'material-uuid',
        name: 'CarPaint',
        sourceIndex: 0,
        isOverridden: false,
      };
    }

    it('should return true for valid material ref', () => {
      const ref = createValidMaterialRef();
      expect(isDerivedMaterialRef(ref)).toBe(true);
    });

    it('should return true for overridden material', () => {
      const ref: IDerivedMaterialRef = {
        ...createValidMaterialRef(),
        isOverridden: true,
        overrideUuid: 'override-uuid',
      };
      expect(isDerivedMaterialRef(ref)).toBe(true);
    });

    it('should return false for missing isOverridden', () => {
      const ref = createValidMaterialRef();
      delete (ref as unknown as Record<string, unknown>).isOverridden;
      expect(isDerivedMaterialRef(ref)).toBe(false);
    });

    it('should return false for base ref without material fields', () => {
      const ref: IDerivedAssetRef = {
        uuid: 'base-uuid',
        name: 'Base',
        sourceIndex: 0,
      };
      expect(isDerivedMaterialRef(ref)).toBe(false);
    });
  });

  describe('getAssetMetaFilename', () => {
    it('should append .assetmeta to filename', () => {
      expect(getAssetMetaFilename('car.glb')).toBe('car.glb.assetmeta');
    });

    it('should work with various file extensions', () => {
      expect(getAssetMetaFilename('model.gltf')).toBe('model.gltf.assetmeta');
      expect(getAssetMetaFilename('texture.png')).toBe('texture.png.assetmeta');
      expect(getAssetMetaFilename('wood.jpg')).toBe('wood.jpg.assetmeta');
    });

    it('should handle filenames without extension', () => {
      expect(getAssetMetaFilename('filename')).toBe('filename.assetmeta');
    });

    it('should handle filenames with multiple dots', () => {
      expect(getAssetMetaFilename('my.file.name.glb')).toBe('my.file.name.glb.assetmeta');
    });
  });

  describe('getSourceFilename', () => {
    it('should remove .assetmeta suffix', () => {
      expect(getSourceFilename('car.glb.assetmeta')).toBe('car.glb');
    });

    it('should work with various file extensions', () => {
      expect(getSourceFilename('model.gltf.assetmeta')).toBe('model.gltf');
      expect(getSourceFilename('texture.png.assetmeta')).toBe('texture.png');
    });

    it('should return null for non-meta filename', () => {
      expect(getSourceFilename('car.glb')).toBe(null);
      expect(getSourceFilename('texture.png')).toBe(null);
    });

    it('should return null for partial match', () => {
      expect(getSourceFilename('car.assetmet')).toBe(null);
      expect(getSourceFilename('car.assetmeta.bak')).toBe(null);
    });

    it('should handle filenames with multiple dots', () => {
      expect(getSourceFilename('my.file.name.glb.assetmeta')).toBe('my.file.name.glb');
    });
  });

  describe('ASSET_META_VERSION', () => {
    it('should be defined', () => {
      expect(ASSET_META_VERSION).toBeDefined();
    });

    it('should be a positive integer', () => {
      expect(typeof ASSET_META_VERSION).toBe('number');
      expect(ASSET_META_VERSION).toBeGreaterThan(0);
      expect(Number.isInteger(ASSET_META_VERSION)).toBe(true);
    });
  });
});
