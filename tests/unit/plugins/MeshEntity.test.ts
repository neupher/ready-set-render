/**
 * MeshEntity Tests
 *
 * Tests for MeshEntity class that references IMeshAsset for geometry.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MeshEntity,
  isMeshEntity,
  setMeshAssetResolver,
  getMeshAssetResolver,
} from '../../../src/plugins/primitives/MeshEntity';
import type { IMeshAsset } from '../../../src/core/assets/interfaces/IMeshAsset';
import { MESH_ASSET_VERSION } from '../../../src/core/assets/interfaces/IMeshAsset';
import type { IMaterialComponent } from '../../../src/core/interfaces/IMaterialComponent';

describe('MeshEntity', () => {
  /**
   * Create a valid mesh asset for testing.
   */
  function createMockMeshAsset(): IMeshAsset {
    return {
      uuid: 'test-mesh-asset-uuid',
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

  beforeEach(() => {
    // Reset the global mesh asset resolver before each test
    setMeshAssetResolver(() => null);
  });

  describe('constructor', () => {
    it('should create MeshEntity with default values', () => {
      const entity = new MeshEntity();

      expect(entity.id).toBeDefined();
      expect(entity.entityId).toBeDefined();
      expect(entity.name).toBe('Mesh');
      expect(entity.transform.position).toEqual([0, 0, 0]);
      expect(entity.transform.rotation).toEqual([0, 0, 0]);
      expect(entity.transform.scale).toEqual([1, 1, 1]);
      expect(entity.meshAssetRef).toBeNull();
    });

    it('should create MeshEntity with custom id', () => {
      const entity = new MeshEntity('custom-id');
      expect(entity.id).toBe('custom-id');
    });

    it('should create MeshEntity with custom name', () => {
      const entity = new MeshEntity(undefined, 'Custom Name');
      expect(entity.name).toBe('Custom Name');
    });

    it('should create MeshEntity with both custom id and name', () => {
      const entity = new MeshEntity('custom-id', 'Custom Name');
      expect(entity.id).toBe('custom-id');
      expect(entity.name).toBe('Custom Name');
    });
  });

  describe('components', () => {
    it('should have mesh component', () => {
      const entity = new MeshEntity();
      const meshComponent = entity.getComponent('mesh');

      expect(meshComponent).not.toBeNull();
      expect(meshComponent?.type).toBe('mesh');
    });

    it('should have material component', () => {
      const entity = new MeshEntity();
      const materialComponent = entity.getComponent('material');

      expect(materialComponent).not.toBeNull();
      expect(materialComponent?.type).toBe('material');
    });

    it('should return all components', () => {
      const entity = new MeshEntity();
      const components = entity.getComponents();

      expect(components.length).toBe(2);
      expect(components.some((c) => c.type === 'mesh')).toBe(true);
      expect(components.some((c) => c.type === 'material')).toBe(true);
    });

    it('should return null for non-existent component', () => {
      const entity = new MeshEntity();
      const component = entity.getComponent('nonexistent');

      expect(component).toBeNull();
    });

    it('should correctly check if component exists', () => {
      const entity = new MeshEntity();

      expect(entity.hasComponent('mesh')).toBe(true);
      expect(entity.hasComponent('material')).toBe(true);
      expect(entity.hasComponent('nonexistent')).toBe(false);
    });
  });

  describe('getMeshData', () => {
    it('should return null when no meshAssetRef is set', () => {
      const entity = new MeshEntity();

      expect(entity.getMeshData()).toBeNull();
    });

    it('should return null when resolver is not configured', () => {
      const entity = new MeshEntity();
      entity.meshAssetRef = { uuid: 'some-uuid', type: 'mesh' };

      // Suppress console warning
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(entity.getMeshData()).toBeNull();
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should return null when mesh asset is not found', () => {
      setMeshAssetResolver(() => null);
      const entity = new MeshEntity();
      entity.meshAssetRef = { uuid: 'some-uuid', type: 'mesh' };

      // Suppress console warning
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(entity.getMeshData()).toBeNull();

      warnSpy.mockRestore();
    });

    it('should return mesh data from resolved asset', () => {
      const mockAsset = createMockMeshAsset();
      setMeshAssetResolver((uuid) =>
        uuid === 'test-mesh-asset-uuid' ? mockAsset : null
      );

      const entity = new MeshEntity();
      entity.meshAssetRef = { uuid: 'test-mesh-asset-uuid', type: 'mesh' };

      const meshData = entity.getMeshData();

      expect(meshData).not.toBeNull();
      expect(meshData?.positions).toBeInstanceOf(Float32Array);
      expect(meshData?.normals).toBeInstanceOf(Float32Array);
      expect(meshData?.indices).toBeInstanceOf(Uint16Array);
      expect(meshData?.bounds.min).toEqual([0, 0, 0]);
      expect(meshData?.bounds.max).toEqual([1, 1, 0]);
    });

    it('should cache mesh data', () => {
      const mockAsset = createMockMeshAsset();
      const resolver = vi.fn((uuid: string) =>
        uuid === 'test-mesh-asset-uuid' ? mockAsset : null
      );
      setMeshAssetResolver(resolver);

      const entity = new MeshEntity();
      entity.meshAssetRef = { uuid: 'test-mesh-asset-uuid', type: 'mesh' };

      // First call
      entity.getMeshData();
      // Second call should use cache
      entity.getMeshData();

      expect(resolver).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache when meshAssetRef changes', () => {
      const mockAsset1 = createMockMeshAsset();
      const mockAsset2 = { ...createMockMeshAsset(), uuid: 'asset-2' };

      const resolver = vi.fn((uuid: string) => {
        if (uuid === 'test-mesh-asset-uuid') return mockAsset1;
        if (uuid === 'asset-2') return mockAsset2;
        return null;
      });
      setMeshAssetResolver(resolver);

      const entity = new MeshEntity();
      entity.meshAssetRef = { uuid: 'test-mesh-asset-uuid', type: 'mesh' };

      // First call
      entity.getMeshData();

      // Change reference
      entity.meshAssetRef = { uuid: 'asset-2', type: 'mesh' };

      // Second call should re-resolve
      entity.getMeshData();

      expect(resolver).toHaveBeenCalledTimes(2);
    });
  });

  describe('getEdgeData', () => {
    it('should return null when no meshAssetRef is set', () => {
      const entity = new MeshEntity();
      expect(entity.getEdgeData()).toBeNull();
    });

    it('should generate edge data from mesh', () => {
      const mockAsset = createMockMeshAsset();
      setMeshAssetResolver(() => mockAsset);

      const entity = new MeshEntity();
      entity.meshAssetRef = { uuid: 'test-mesh-asset-uuid', type: 'mesh' };

      const edgeData = entity.getEdgeData();

      expect(edgeData).not.toBeNull();
      expect(edgeData?.lineVertices).toBeInstanceOf(Float32Array);
      expect(edgeData?.lineCount).toBeGreaterThan(0);
    });
  });

  describe('invalidateCache', () => {
    it('should clear cached mesh data', () => {
      const mockAsset = createMockMeshAsset();
      const resolver = vi.fn(() => mockAsset);
      setMeshAssetResolver(resolver);

      const entity = new MeshEntity();
      entity.meshAssetRef = { uuid: 'test-mesh-asset-uuid', type: 'mesh' };

      // Load mesh data
      entity.getMeshData();
      expect(resolver).toHaveBeenCalledTimes(1);

      // Invalidate cache
      entity.invalidateCache();

      // Should resolve again
      entity.getMeshData();
      expect(resolver).toHaveBeenCalledTimes(2);
    });
  });

  describe('render mode', () => {
    it('should default to solid render mode', () => {
      const entity = new MeshEntity();
      expect(entity.getRenderMode()).toBe('solid');
    });

    it('should set render mode', () => {
      const entity = new MeshEntity();
      entity.setRenderMode('wireframe');
      expect(entity.getRenderMode()).toBe('wireframe');

      entity.setRenderMode('both');
      expect(entity.getRenderMode()).toBe('both');
    });
  });

  describe('transform', () => {
    it('should compute model matrix', () => {
      const entity = new MeshEntity();
      entity.transform.position = [1, 2, 3];

      const modelMatrix = entity.getModelMatrix();

      expect(modelMatrix).toBeInstanceOf(Float32Array);
      expect(modelMatrix.length).toBe(16);
    });

    it('should compute normal matrix', () => {
      const entity = new MeshEntity();

      const normalMatrix = entity.getNormalMatrix();

      expect(normalMatrix).toBeInstanceOf(Float32Array);
      expect(normalMatrix.length).toBe(9);
    });
  });

  describe('clone', () => {
    it('should create a clone with new id', () => {
      const entity = new MeshEntity('original-id', 'Original');
      entity.transform.position = [1, 2, 3];
      entity.meshAssetRef = { uuid: 'mesh-uuid', type: 'mesh' };
      entity.setRenderMode('wireframe');

      const cloned = entity.clone();

      expect(cloned.id).not.toBe(entity.id);
      expect(cloned.name).toBe('Original');
      expect(cloned.transform.position).toEqual([1, 2, 3]);
      expect(cloned.meshAssetRef).toEqual({ uuid: 'mesh-uuid', type: 'mesh' });
      expect(cloned.getRenderMode()).toBe('wireframe');
    });

    it('should create independent copy of meshAssetRef', () => {
      const entity = new MeshEntity();
      entity.meshAssetRef = { uuid: 'mesh-uuid', type: 'mesh' };

      const cloned = entity.clone();

      // Should be equal but not the same object
      expect(cloned.meshAssetRef).toEqual(entity.meshAssetRef);
      expect(cloned.meshAssetRef).not.toBe(entity.meshAssetRef);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const entity = new MeshEntity('test-id', 'Test Mesh Entity');
      entity.transform.position = [1, 2, 3];
      entity.transform.rotation = [45, 0, 0];
      entity.transform.scale = [2, 2, 2];
      entity.meshAssetRef = { uuid: 'mesh-uuid', type: 'mesh' };
      entity.setRenderMode('both');

      const json = entity.toJSON();

      expect(json.uuid).toBe('test-id');
      expect(json.name).toBe('Test Mesh Entity');
      expect(json.type).toBe('MeshEntity');
      expect(json.transform.position).toEqual([1, 2, 3]);
      expect(json.transform.rotation).toEqual([45, 0, 0]);
      expect(json.transform.scale).toEqual([2, 2, 2]);
      expect(json.metadata?.meshAssetRef).toEqual({ uuid: 'mesh-uuid', type: 'mesh' });
      expect(json.metadata?.renderMode).toBe('both');
    });

    it('should deserialize from JSON', () => {
      const entity = new MeshEntity();
      const json = {
        uuid: 'test-id',
        name: 'Loaded Mesh',
        type: 'MeshEntity' as const,
        transform: {
          position: [5, 5, 5] as [number, number, number],
          rotation: [90, 0, 0] as [number, number, number],
          scale: [0.5, 0.5, 0.5] as [number, number, number],
        },
        components: [
          {
            type: 'material',
            shaderName: 'pbr',
            color: [1, 0, 0] as [number, number, number],
            opacity: 0.8,
            transparent: true,
          },
        ],
        metadata: {
          meshAssetRef: { uuid: 'loaded-mesh-uuid', type: 'mesh' },
          renderMode: 'wireframe',
        },
      };

      entity.fromJSON(json);

      expect(entity.name).toBe('Loaded Mesh');
      expect(entity.transform.position).toEqual([5, 5, 5]);
      expect(entity.transform.rotation).toEqual([90, 0, 0]);
      expect(entity.transform.scale).toEqual([0.5, 0.5, 0.5]);
      expect(entity.meshAssetRef).toEqual({ uuid: 'loaded-mesh-uuid', type: 'mesh' });
      expect(entity.getRenderMode()).toBe('wireframe');

      const materialComponent = entity.getComponent<IMaterialComponent>('material');
      expect(materialComponent?.shaderName).toBe('pbr');
      expect(materialComponent?.color).toEqual([1, 0, 0]);
      expect(materialComponent?.opacity).toBe(0.8);
      expect(materialComponent?.transparent).toBe(true);
    });
  });

  describe('isMeshEntity', () => {
    it('should return true for MeshEntity instance', () => {
      const entity = new MeshEntity();
      expect(isMeshEntity(entity)).toBe(true);
    });

    it('should return false for non-MeshEntity objects', () => {
      expect(isMeshEntity(null)).toBe(false);
      expect(isMeshEntity(undefined)).toBe(false);
      expect(isMeshEntity({})).toBe(false);
      expect(isMeshEntity({ id: 'test' })).toBe(false);
    });
  });

  describe('getMeshAssetResolver', () => {
    it('should return null when no resolver is set', () => {
      setMeshAssetResolver(() => null);
      const resolver = getMeshAssetResolver();
      expect(resolver).not.toBeNull();
    });

    it('should return the set resolver', () => {
      const mockResolver = () => null;
      setMeshAssetResolver(mockResolver);

      expect(getMeshAssetResolver()).toBe(mockResolver);
    });
  });
});
