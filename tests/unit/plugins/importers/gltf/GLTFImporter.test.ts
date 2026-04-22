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

      expect(result.entities.length).toBe(1);
      expect(result.assets.filter(a => a.type === 'mesh').length).toBe(1);
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

      expect(result.assets.filter(a => a.type === 'mesh').length).toBe(1);
      expect(result.assets.filter(a => a.type === 'material').length).toBe(1);
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

    it('should expose the model asset meta UUID as primaryAssetId', async () => {
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

      expect(result.primaryAssetId).toBeDefined();
      expect(typeof result.primaryAssetId).toBe('string');
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

      const meshAsset = result.assets.find(a => a.type === 'mesh');
      expect(meshAsset).toMatchObject({
        name: 'TestMesh',
        type: 'mesh',
        isBuiltIn: false,
        vertexCount: 3,
        triangleCount: 1,
      });

      // Verify positions are converted to array
      expect(Array.isArray((meshAsset as unknown as { positions: unknown }).positions)).toBe(true);
      expect((meshAsset as unknown as { positions: number[] }).positions).toEqual(Array.from(positions));
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
      const entity = result.entities[0];

      // Check that transform was applied
      expect((entity as { transform: { position: number[] } }).transform.position).toEqual([5, 10, 15]);
      expect((entity as { transform: { rotation: number[] } }).transform.rotation).toEqual([45, 90, 0]);
      expect((entity as { transform: { scale: number[] } }).transform.scale).toEqual([2, 2, 2]);
    });

    it('registers an IModelAsset in the registry alongside meshes/materials', async () => {
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
            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            children: [],
          },
        ],
        warnings: [],
      };

      vi.mocked(mockImportService.import).mockResolvedValue(mockGLTFResult);

      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'cube.glb');

      const result = await importer.import(file);

      // The result.assets array should include exactly one model asset
      const modelAssets = result.assets.filter(a => a.type === 'model');
      expect(modelAssets).toHaveLength(1);
      expect(modelAssets[0].uuid).toBe(result.primaryAssetId);

      // The model asset must have been registered in the registry
      const registerCalls = vi.mocked(mockAssetRegistry.register).mock.calls;
      const registeredTypes = registerCalls.map(call => (call[0] as { type: string }).type);
      expect(registeredTypes).toContain('model');
    });
  });

  describe('loadFromMeta', () => {
    it('registers meshes and materials with UUIDs preserved from the meta', async () => {
      const mockGLTFResult: IGLTFImportResult = {
        meshes: [
          {
            name: 'Body',
            positions: new Float32Array([0, 0, 0]),
            normals: new Float32Array([0, 0, 1]),
            indices: new Uint16Array([0]),
            bounds: { min: [0, 0, 0], max: [0, 0, 0] },
            vertexCount: 1,
            triangleCount: 0,
          },
        ],
        materials: [
          {
            name: 'Paint',
            baseColor: [1, 0, 0],
            alpha: 1,
            metallic: 0.5,
            roughness: 0.5,
            transparent: false,
          },
        ],
        hierarchy: [],
        warnings: [],
      };

      vi.mocked(mockImportService.import).mockResolvedValue(mockGLTFResult);

      const meta = {
        version: 1,
        uuid: 'preserved-model-uuid',
        type: 'model' as const,
        importedAt: '2026-03-04T12:00:00.000Z',
        sourceHash: 'size:0:mtime:0',
        isDirty: false,
        sourcePath: 'sources/models/car.glb',
        importSettings: {
          scaleFactor: 1,
          convertCoordinates: { sourceUp: 'Y' as const, convertToZUp: true },
          meshes: {
            generateNormals: true,
            normalAngleThreshold: 60,
            generateTangents: true,
            weldVertices: false,
            weldThreshold: 0.0001,
            optimizeMesh: true,
          },
          materials: {
            importMaterials: true,
            namePrefix: '',
            extractTextures: true,
          },
          animations: {
            importAnimations: true,
            animationNamePrefix: '',
            sampleRate: 30,
          },
        },
        contents: {
          meshes: [
            { uuid: 'preserved-mesh-uuid', name: 'Body', sourceIndex: 0, vertexCount: 1, triangleCount: 0 },
          ],
          materials: [
            { uuid: 'preserved-material-uuid', name: 'Paint', sourceIndex: 0, isOverridden: false },
          ],
        },
        hierarchy: [],
      };

      const importer = new GLTFImporter(mockImportService, mockAssetRegistry, mockMaterialFactory);
      const file = new File([], 'car.glb');
      const loaded = await importer.loadFromMeta(file, meta);

      expect(loaded.meshAssets[0].uuid).toBe('preserved-mesh-uuid');
      expect(loaded.materialAssets[0].uuid).toBe('preserved-material-uuid');
      expect(loaded.modelAsset.uuid).toBe('preserved-model-uuid');

      // The model + derived assets must be registered
      const registered = vi.mocked(mockAssetRegistry.register).mock.calls.map(c => (c[0] as { uuid: string }).uuid);
      expect(registered).toContain('preserved-mesh-uuid');
      expect(registered).toContain('preserved-material-uuid');
      expect(registered).toContain('preserved-model-uuid');
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
