/**
 * GLTFImporter Tests
 *
 * Tests for the GLTF/GLB importer plugin.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GLTFImporter } from '@plugins/importers/gltf/GLTFImporter';
import type { GLTFImportService, IGLTFImportResult } from '@plugins/importers/gltf/GLTFImportService';
import type { AssetRegistry } from '@core/assets/AssetRegistry';
import type { MaterialAssetFactory } from '@core/assets/MaterialAssetFactory';

describe('GLTFImporter', () => {
  // Mock dependencies
  let mockImportService: GLTFImportService;
  let mockAssetRegistry: AssetRegistry;
  let mockMaterialFactory: MaterialAssetFactory;

  beforeEach(() => {
    // Create mock import service
    mockImportService = {
      import: vi.fn(),
    } as unknown as GLTFImportService;

    // Create mock asset registry
    mockAssetRegistry = {
      register: vi.fn(),
      get: vi.fn(),
      getAll: vi.fn(),
    } as unknown as AssetRegistry;

    // Create mock material factory
    mockMaterialFactory = {
      create: vi.fn().mockImplementation((options) => ({
        uuid: `mock-material-${Date.now()}`,
        name: options.name,
        type: 'material',
        isBuiltIn: false,
        shaderRef: options.shaderRef,
        parameters: options.parameters,
      })),
    } as unknown as MaterialAssetFactory;
  });

  describe('constructor', () => {
    it('should create an instance with correct properties', () => {
      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);

      expect(importer.id).toBe('gltf-importer');
      expect(importer.name).toBe('GLTF/GLB Importer');
      expect(importer.version).toBe('2.0.0');
      expect(importer.supportedExtensions).toEqual(['.gltf', '.glb']);
    });
  });

  describe('canImport', () => {
    it('should return true for .glb files', () => {
      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'model.glb');

      expect(importer.canImport(file)).toBe(true);
    });

    it('should return true for .gltf files', () => {
      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'model.gltf');

      expect(importer.canImport(file)).toBe(true);
    });

    it('should return true for uppercase .GLB files', () => {
      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'MODEL.GLB');

      expect(importer.canImport(file)).toBe(true);
    });

    it('should return true for uppercase .GLTF files', () => {
      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'MODEL.GLTF');

      expect(importer.canImport(file)).toBe(true);
    });

    it('should return false for .obj files', () => {
      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'model.obj');

      expect(importer.canImport(file)).toBe(false);
    });

    it('should return false for .fbx files', () => {
      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'model.fbx');

      expect(importer.canImport(file)).toBe(false);
    });

    it('should return false for files without extension', () => {
      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'modelfile');

      expect(importer.canImport(file)).toBe(false);
    });
  });

  describe('import', () => {
    it('should import a simple GLTF file and create mesh assets', async () => {
      const mockGLTFResult: IGLTFImportResult = {
        meshes: [
          {
            name: 'Cube',
            positions: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]),
            normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
            indices: new Uint16Array([0, 1, 2]),
            bounds: { min: [0, 0, 0], max: [1, 1, 0] },
            vertexCount: 3,
            triangleCount: 1,
          },
        ],
        materials: [],
        hierarchy: [
          {
            name: 'Cube',
            meshIndex: 0,
            transform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            },
            children: [],
          },
        ],
        warnings: [],
      };

      vi.mocked(mockImportService.import).mockResolvedValue(mockGLTFResult);

      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'cube.glb');

      const result = await importer.import(file);

      expect(result.objects.length).toBe(1);
      expect(result.meshAssets.length).toBe(1);
      expect(result.warnings).toEqual([]);
      expect(mockAssetRegistry.register).toHaveBeenCalled();
    });

    it('should import a GLTF file with materials', async () => {
      const mockGLTFResult: IGLTFImportResult = {
        meshes: [
          {
            name: 'Cube',
            positions: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]),
            normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
            indices: new Uint16Array([0, 1, 2]),
            bounds: { min: [0, 0, 0], max: [1, 1, 0] },
            vertexCount: 3,
            triangleCount: 1,
            materialIndex: 0,
          },
        ],
        materials: [
          {
            name: 'Red Material',
            baseColor: [1, 0, 0],
            alpha: 1,
            metallic: 0,
            roughness: 0.5,
            transparent: false,
          },
        ],
        hierarchy: [
          {
            name: 'Cube',
            meshIndex: 0,
            materialIndices: [0],
            transform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            },
            children: [],
          },
        ],
        warnings: [],
      };

      vi.mocked(mockImportService.import).mockResolvedValue(mockGLTFResult);

      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'cube.glb');

      const result = await importer.import(file);

      expect(result.meshAssets.length).toBe(1);
      expect(result.materialAssets.length).toBe(1);
      expect(mockMaterialFactory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Red Material',
          parameters: expect.objectContaining({
            albedo: [1, 0, 0],
            metallic: 0,
            roughness: 0.5,
          }),
        })
      );
    });

    it('should handle import warnings', async () => {
      const mockGLTFResult: IGLTFImportResult = {
        meshes: [],
        materials: [],
        hierarchy: [],
        warnings: ['No meshes found in file', 'Missing textures'],
      };

      vi.mocked(mockImportService.import).mockResolvedValue(mockGLTFResult);

      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'empty.glb');

      const result = await importer.import(file);

      expect(result.warnings).toEqual(['No meshes found in file', 'Missing textures']);
    });

    it('should create correct mesh asset data', async () => {
      const positions = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]);
      const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
      const indices = new Uint16Array([0, 1, 2]);

      const mockGLTFResult: IGLTFImportResult = {
        meshes: [
          {
            name: 'TestMesh',
            positions,
            normals,
            indices,
            bounds: { min: [0, 0, 0], max: [1, 1, 0] },
            vertexCount: 3,
            triangleCount: 1,
          },
        ],
        materials: [],
        hierarchy: [
          {
            name: 'TestMesh',
            meshIndex: 0,
            transform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            },
            children: [],
          },
        ],
        warnings: [],
      };

      vi.mocked(mockImportService.import).mockResolvedValue(mockGLTFResult);

      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'test.glb');

      const result = await importer.import(file);

      expect(result.meshAssets[0]).toMatchObject({
        name: 'TestMesh',
        type: 'mesh',
        isBuiltIn: false,
        vertexCount: 3,
        triangleCount: 1,
      });

      // Verify positions are converted to array
      expect(Array.isArray(result.meshAssets[0].positions)).toBe(true);
      expect(result.meshAssets[0].positions).toEqual(Array.from(positions));
    });

    it('should apply transforms from hierarchy to created entities', async () => {
      const mockGLTFResult: IGLTFImportResult = {
        meshes: [
          {
            name: 'Cube',
            positions: new Float32Array([0, 0, 0]),
            normals: new Float32Array([0, 0, 1]),
            indices: new Uint16Array([0]),
            bounds: { min: [0, 0, 0], max: [0, 0, 0] },
            vertexCount: 1,
            triangleCount: 0,
          },
        ],
        materials: [],
        hierarchy: [
          {
            name: 'Cube',
            meshIndex: 0,
            transform: {
              position: [5, 10, 15],
              rotation: [45, 90, 0],
              scale: [2, 2, 2],
            },
            children: [],
          },
        ],
        warnings: [],
      };

      vi.mocked(mockImportService.import).mockResolvedValue(mockGLTFResult);

      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'cube.glb');

      const result = await importer.import(file);
      const entity = result.objects[0];

      // Check that transform was applied
      expect((entity as { transform: { position: number[] } }).transform.position).toEqual([5, 10, 15]);
      expect((entity as { transform: { rotation: number[] } }).transform.rotation).toEqual([45, 90, 0]);
      expect((entity as { transform: { scale: number[] } }).transform.scale).toEqual([2, 2, 2]);
    });
  });

  describe('initialize', () => {
    it('should complete without error', async () => {
      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      await expect(importer.initialize({} as never)).resolves.toBeUndefined();
    });
  });

  describe('dispose', () => {
    it('should complete without error', async () => {
      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      await expect(importer.dispose()).resolves.toBeUndefined();
    });
  });
});
