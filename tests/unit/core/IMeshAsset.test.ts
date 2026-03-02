/**
 * IMeshAsset Tests
 *
 * Tests for mesh asset interfaces and type guards.
 */

import { describe, it, expect } from 'vitest';
import {
  isMeshAsset,
  calculateMeshBounds,
  createDefaultMeshBounds,
  MESH_ASSET_VERSION,
  type IMeshAsset,
} from '../../../src/core/assets/interfaces/IMeshAsset';

describe('IMeshAsset', () => {
  /**
   * Create a valid mesh asset for testing.
   */
  function createValidMeshAsset(): IMeshAsset {
    return {
      uuid: 'test-mesh-uuid',
      name: 'Test Mesh',
      type: 'mesh',
      version: MESH_ASSET_VERSION,
      created: '2026-03-02T12:00:00Z',
      modified: '2026-03-02T12:00:00Z',
      isBuiltIn: false,
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      indices: [0, 1, 2],
      bounds: {
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
      vertexCount: 3,
      triangleCount: 1,
    };
  }

  describe('isMeshAsset', () => {
    it('should return true for valid mesh asset', () => {
      const mesh = createValidMeshAsset();
      expect(isMeshAsset(mesh)).toBe(true);
    });

    it('should return true for mesh with UVs', () => {
      const mesh = createValidMeshAsset();
      mesh.uvs = [0, 0, 1, 0, 0.5, 1];
      expect(isMeshAsset(mesh)).toBe(true);
    });

    it('should return true for mesh with description', () => {
      const mesh = createValidMeshAsset();
      mesh.description = 'A test mesh';
      expect(isMeshAsset(mesh)).toBe(true);
    });

    it('should return true for mesh with parent model reference', () => {
      const mesh = createValidMeshAsset();
      mesh.parentModelRef = { uuid: 'model-uuid', type: 'model' };
      expect(isMeshAsset(mesh)).toBe(true);
    });

    it('should return true for built-in mesh', () => {
      const mesh = createValidMeshAsset();
      (mesh as { isBuiltIn: boolean }).isBuiltIn = true;
      expect(isMeshAsset(mesh)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isMeshAsset(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isMeshAsset(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isMeshAsset('not an object')).toBe(false);
      expect(isMeshAsset(123)).toBe(false);
      expect(isMeshAsset(true)).toBe(false);
    });

    it('should return false for wrong type', () => {
      const mesh = createValidMeshAsset();
      (mesh as unknown as Record<string, unknown>).type = 'model';
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for missing uuid', () => {
      const mesh = createValidMeshAsset();
      delete (mesh as unknown as Record<string, unknown>).uuid;
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for missing name', () => {
      const mesh = createValidMeshAsset();
      delete (mesh as unknown as Record<string, unknown>).name;
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for missing version', () => {
      const mesh = createValidMeshAsset();
      delete (mesh as unknown as Record<string, unknown>).version;
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for missing isBuiltIn', () => {
      const mesh = createValidMeshAsset();
      delete (mesh as unknown as Record<string, unknown>).isBuiltIn;
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for missing positions', () => {
      const mesh = createValidMeshAsset();
      delete (mesh as unknown as Record<string, unknown>).positions;
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for missing normals', () => {
      const mesh = createValidMeshAsset();
      delete (mesh as unknown as Record<string, unknown>).normals;
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for missing indices', () => {
      const mesh = createValidMeshAsset();
      delete (mesh as unknown as Record<string, unknown>).indices;
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for missing bounds', () => {
      const mesh = createValidMeshAsset();
      delete (mesh as unknown as Record<string, unknown>).bounds;
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for missing bounds.min', () => {
      const mesh = createValidMeshAsset();
      delete (mesh.bounds as unknown as Record<string, unknown>).min;
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for missing bounds.max', () => {
      const mesh = createValidMeshAsset();
      delete (mesh.bounds as unknown as Record<string, unknown>).max;
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for invalid bounds.min length', () => {
      const mesh = createValidMeshAsset();
      mesh.bounds.min = [0, 0] as unknown as [number, number, number];
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for invalid bounds.max length', () => {
      const mesh = createValidMeshAsset();
      mesh.bounds.max = [1, 1] as unknown as [number, number, number];
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for missing vertexCount', () => {
      const mesh = createValidMeshAsset();
      delete (mesh as unknown as Record<string, unknown>).vertexCount;
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for missing triangleCount', () => {
      const mesh = createValidMeshAsset();
      delete (mesh as unknown as Record<string, unknown>).triangleCount;
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for non-array positions', () => {
      const mesh = createValidMeshAsset();
      (mesh as unknown as Record<string, unknown>).positions = 'not an array';
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for non-array normals', () => {
      const mesh = createValidMeshAsset();
      (mesh as unknown as Record<string, unknown>).normals = 'not an array';
      expect(isMeshAsset(mesh)).toBe(false);
    });

    it('should return false for non-array indices', () => {
      const mesh = createValidMeshAsset();
      (mesh as unknown as Record<string, unknown>).indices = 'not an array';
      expect(isMeshAsset(mesh)).toBe(false);
    });
  });

  describe('calculateMeshBounds', () => {
    it('should calculate bounds for a single point', () => {
      const positions = [1, 2, 3];
      const bounds = calculateMeshBounds(positions);
      expect(bounds.min).toEqual([1, 2, 3]);
      expect(bounds.max).toEqual([1, 2, 3]);
    });

    it('should calculate bounds for multiple vertices', () => {
      const positions = [
        -1, -2, -3,
        1, 2, 3,
        0, 0, 0,
      ];
      const bounds = calculateMeshBounds(positions);
      expect(bounds.min).toEqual([-1, -2, -3]);
      expect(bounds.max).toEqual([1, 2, 3]);
    });

    it('should handle empty positions array', () => {
      const positions: number[] = [];
      const bounds = calculateMeshBounds(positions);
      expect(bounds.min).toEqual([0, 0, 0]);
      expect(bounds.max).toEqual([0, 0, 0]);
    });

    it('should handle negative values', () => {
      const positions = [
        -5, -10, -15,
        -1, -2, -3,
      ];
      const bounds = calculateMeshBounds(positions);
      expect(bounds.min).toEqual([-5, -10, -15]);
      expect(bounds.max).toEqual([-1, -2, -3]);
    });

    it('should handle identical points', () => {
      const positions = [
        5, 5, 5,
        5, 5, 5,
        5, 5, 5,
      ];
      const bounds = calculateMeshBounds(positions);
      expect(bounds.min).toEqual([5, 5, 5]);
      expect(bounds.max).toEqual([5, 5, 5]);
    });
  });

  describe('createDefaultMeshBounds', () => {
    it('should create bounds centered at origin', () => {
      const bounds = createDefaultMeshBounds();
      expect(bounds.min).toEqual([0, 0, 0]);
      expect(bounds.max).toEqual([0, 0, 0]);
    });
  });

  describe('MESH_ASSET_VERSION', () => {
    it('should be defined', () => {
      expect(MESH_ASSET_VERSION).toBeDefined();
    });

    it('should be a positive integer', () => {
      expect(typeof MESH_ASSET_VERSION).toBe('number');
      expect(MESH_ASSET_VERSION).toBeGreaterThan(0);
      expect(Number.isInteger(MESH_ASSET_VERSION)).toBe(true);
    });
  });
});
