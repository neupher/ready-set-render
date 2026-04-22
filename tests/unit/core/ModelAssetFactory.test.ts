/**
 * ModelAssetFactory Tests
 *
 * Tests for model asset creation and serialization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModelAssetFactory } from '../../../src/core/assets/ModelAssetFactory';
import type { IMeshAsset } from '../../../src/core/assets/interfaces/IMeshAsset';
import type { IMaterialAsset } from '../../../src/core/assets/interfaces/IMaterialAsset';
import type { IModelNode } from '../../../src/core/assets/interfaces/IModelAsset';
import { MODEL_ASSET_VERSION } from '../../../src/core/assets/interfaces/IModelAsset';

describe('ModelAssetFactory', () => {
  let factory: ModelAssetFactory;

  /**
   * Create mock mesh assets for testing.
   */
  function createMockMeshAssets(): IMeshAsset[] {
    return [
      {
        uuid: 'mesh-uuid-1',
        name: 'Body',
        type: 'mesh',
        version: 1,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        positions: [0, 0, 0, 1, 0, 0, 1, 1, 0],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
        indices: [0, 1, 2],
        bounds: { min: [0, 0, 0], max: [1, 1, 0] },
        vertexCount: 3,
        triangleCount: 1,
      },
      {
        uuid: 'mesh-uuid-2',
        name: 'Wheels',
        type: 'mesh',
        version: 1,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
        indices: [0, 1, 2, 1, 3, 2],
        bounds: { min: [0, 0, 0], max: [1, 1, 0] },
        vertexCount: 4,
        triangleCount: 2,
      },
    ];
  }

  /**
   * Create mock material assets for testing.
   */
  function createMockMaterialAssets(): IMaterialAsset[] {
    return [
      {
        uuid: 'material-uuid-1',
        name: 'CarPaint',
        type: 'material',
        version: 1,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        shaderRef: { uuid: 'pbr-shader', type: 'shader' },
        parameters: { albedo: [1, 0, 0], metallic: 0.8, roughness: 0.2 },
      },
      {
        uuid: 'material-uuid-2',
        name: 'Rubber',
        type: 'material',
        version: 1,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        shaderRef: { uuid: 'pbr-shader', type: 'shader' },
        parameters: { albedo: [0.1, 0.1, 0.1], metallic: 0, roughness: 0.9 },
      },
    ];
  }

  /**
   * Create mock hierarchy for testing.
   */
  function createMockHierarchy(): IModelNode[] {
    return [
      {
        name: 'Root',
        meshIndex: 0,
        materialIndices: [0],
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        children: [
          {
            name: 'FrontWheel',
            meshIndex: 1,
            materialIndices: [1],
            transform: {
              position: [1, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            },
            children: [],
          },
        ],
      },
    ];
  }

  beforeEach(() => {
    factory = new ModelAssetFactory();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createFromImport', () => {
    it('should create a model asset with correct name from filename', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      expect(model.name).toBe('car');
    });

    it('should create a model asset with provided name override', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      }, { name: 'My Car' });

      expect(model.name).toBe('My Car');
    });

    it('should create a model asset with valid UUID', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      expect(model.uuid).toBeDefined();
      expect(typeof model.uuid).toBe('string');
      expect(model.uuid.length).toBeGreaterThan(0);
    });

    it('should use custom UUID if provided', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      }, { uuid: 'custom-model-uuid' });

      expect(model.uuid).toBe('custom-model-uuid');
    });

    it('should set type to model', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      expect(model.type).toBe('model');
    });

    it('should set version to current schema version', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      expect(model.version).toBe(MODEL_ASSET_VERSION);
    });

    it('should set isBuiltIn to false', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      expect(model.isBuiltIn).toBe(false);
    });

    it('should set source information correctly for GLB', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      expect(model.source.filename).toBe('car.glb');
      expect(model.source.format).toBe('glb');
      expect(model.source.importedAt).toBe('2026-03-04T12:00:00.000Z');
    });

    it('should set source information correctly for GLTF', () => {
      const model = factory.createFromImport('car.gltf', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      expect(model.source.format).toBe('gltf');
    });

    it('should set source information correctly for OBJ', () => {
      const model = factory.createFromImport('car.obj', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      expect(model.source.format).toBe('obj');
    });

    it('should populate mesh references from mesh assets', () => {
      const meshAssets = createMockMeshAssets();
      const model = factory.createFromImport('car.glb', {
        meshAssets,
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      expect(model.contents.meshes).toHaveLength(2);
      expect(model.contents.meshes[0].uuid).toBe('mesh-uuid-1');
      expect(model.contents.meshes[0].name).toBe('Body');
      expect(model.contents.meshes[0].vertexCount).toBe(3);
      expect(model.contents.meshes[0].triangleCount).toBe(1);
      expect(model.contents.meshes[1].uuid).toBe('mesh-uuid-2');
      expect(model.contents.meshes[1].name).toBe('Wheels');
    });

    it('should populate material references from material assets', () => {
      const materialAssets = createMockMaterialAssets();
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets,
        hierarchy: createMockHierarchy(),
      });

      expect(model.contents.materials).toHaveLength(2);
      expect(model.contents.materials[0].uuid).toBe('material-uuid-1');
      expect(model.contents.materials[0].name).toBe('CarPaint');
      expect(model.contents.materials[1].uuid).toBe('material-uuid-2');
      expect(model.contents.materials[1].name).toBe('Rubber');
    });

    it('should store hierarchy correctly', () => {
      const hierarchy = createMockHierarchy();
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy,
      });

      expect(model.hierarchy).toHaveLength(1);
      expect(model.hierarchy[0].name).toBe('Root');
      expect(model.hierarchy[0].children).toHaveLength(1);
      expect(model.hierarchy[0].children[0].name).toBe('FrontWheel');
    });

    it('should set created and modified timestamps', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      expect(model.created).toBe('2026-03-04T12:00:00.000Z');
      expect(model.modified).toBe('2026-03-04T12:00:00.000Z');
    });

    it('should set description if provided', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      }, { description: 'A test car model' });

      expect(model.description).toBe('A test car model');
    });

    it('should handle filename with path', () => {
      const model = factory.createFromImport('path/to/car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      expect(model.name).toBe('car');
      expect(model.source.filename).toBe('path/to/car.glb');
    });

    it('should handle empty mesh and material lists', () => {
      const model = factory.createFromImport('empty.glb', {
        meshAssets: [],
        materialAssets: [],
        hierarchy: [],
      });

      expect(model.contents.meshes).toHaveLength(0);
      expect(model.contents.materials).toHaveLength(0);
      expect(model.hierarchy).toHaveLength(0);
    });
  });

  describe('fromJSON', () => {
    it('should parse valid model JSON', () => {
      const json = {
        uuid: 'json-model-uuid',
        name: 'Car Model',
        type: 'model',
        version: 1,
        created: '2026-03-01T10:00:00Z',
        modified: '2026-03-02T11:00:00Z',
        isBuiltIn: false,
        source: {
          filename: 'car.glb',
          format: 'glb',
          importedAt: '2026-03-01T10:00:00Z',
        },
        contents: {
          meshes: [{ uuid: 'mesh-1', name: 'Body', vertexCount: 100, triangleCount: 50 }],
          materials: [{ uuid: 'mat-1', name: 'Paint' }],
        },
        hierarchy: [
          {
            name: 'Root',
            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            children: [],
          },
        ],
      };

      const model = factory.fromJSON(json);

      expect(model.uuid).toBe('json-model-uuid');
      expect(model.name).toBe('Car Model');
      expect(model.type).toBe('model');
      expect(model.source.filename).toBe('car.glb');
      expect(model.contents.meshes[0].name).toBe('Body');
    });

    it('should throw for null data', () => {
      expect(() => factory.fromJSON(null)).toThrow('expected object');
    });

    it('should throw for non-object data', () => {
      expect(() => factory.fromJSON('not an object')).toThrow('expected object');
    });

    it('should throw for missing uuid', () => {
      const json = { name: 'Test', type: 'model' };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid uuid');
    });

    it('should throw for missing name', () => {
      const json = { uuid: 'test', type: 'model' };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid name');
    });

    it('should throw for wrong type', () => {
      const json = { uuid: 'test', name: 'Test', type: 'shader' };
      expect(() => factory.fromJSON(json)).toThrow('type must be "model"');
    });

    it('should throw for missing source', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'model',
        contents: { meshes: [], materials: [] },
        hierarchy: [],
      };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid source');
    });

    it('should throw for missing source filename', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'model',
        source: { format: 'glb' },
        contents: { meshes: [], materials: [] },
        hierarchy: [],
      };
      expect(() => factory.fromJSON(json)).toThrow('source.filename must be a string');
    });

    it('should throw for missing contents', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'model',
        source: { filename: 'test.glb', format: 'glb', importedAt: '2026-01-01' },
        hierarchy: [],
      };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid contents');
    });

    it('should throw for missing hierarchy', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'model',
        source: { filename: 'test.glb', format: 'glb', importedAt: '2026-01-01' },
        contents: { meshes: [], materials: [] },
      };
      expect(() => factory.fromJSON(json)).toThrow('hierarchy must be an array');
    });

    it('should default version if missing', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'model',
        source: { filename: 'test.glb', format: 'glb', importedAt: '2026-01-01' },
        contents: { meshes: [], materials: [] },
        hierarchy: [],
      };

      const model = factory.fromJSON(json);

      expect(model.version).toBe(MODEL_ASSET_VERSION);
    });

    it('should parse description if present', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'model',
        source: { filename: 'test.glb', format: 'glb', importedAt: '2026-01-01' },
        contents: { meshes: [], materials: [] },
        hierarchy: [],
        description: 'A test model',
      };

      const model = factory.fromJSON(json);

      expect(model.description).toBe('A test model');
    });
  });

  describe('toJSON', () => {
    it('should convert model to JSON', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      }, { description: 'A test car' });

      const json = factory.toJSON(model);

      expect(json.uuid).toBe(model.uuid);
      expect(json.name).toBe('car');
      expect(json.type).toBe('model');
      expect(json.description).toBe('A test car');
    });

    it('should include all model properties', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      const json = factory.toJSON(model);

      expect(json).toHaveProperty('uuid');
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('type');
      expect(json).toHaveProperty('version');
      expect(json).toHaveProperty('created');
      expect(json).toHaveProperty('modified');
      expect(json).toHaveProperty('isBuiltIn');
      expect(json).toHaveProperty('source');
      expect(json).toHaveProperty('contents');
      expect(json).toHaveProperty('hierarchy');
    });

    it('should include source details', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      const json = factory.toJSON(model);
      const source = json.source as Record<string, unknown>;

      expect(source.filename).toBe('car.glb');
      expect(source.format).toBe('glb');
      expect(source.importedAt).toBe('2026-03-04T12:00:00.000Z');
    });

    it('should include contents details', () => {
      const model = factory.createFromImport('car.glb', {
        meshAssets: createMockMeshAssets(),
        materialAssets: createMockMaterialAssets(),
        hierarchy: createMockHierarchy(),
      });

      const json = factory.toJSON(model);
      const contents = json.contents as Record<string, unknown>;

      expect((contents.meshes as unknown[]).length).toBe(2);
      expect((contents.materials as unknown[]).length).toBe(2);
    });
  });

  describe('fromMeta', () => {
    /**
     * Build a minimal IModelAssetMeta with two meshes, two materials, and
     * a one-level hierarchy. Used by all fromMeta tests.
     */
    function createMockMeta(): import('../../../src/core/assets/interfaces/IModelAssetMeta').IModelAssetMeta {
      return {
        version: 1,
        uuid: 'model-uuid-from-meta',
        type: 'model',
        importedAt: '2026-03-04T12:00:00.000Z',
        sourceHash: 'size:1234:mtime:1709553600000',
        isDirty: false,
        sourcePath: 'sources/models/car.glb',
        importSettings: {
          scaleFactor: 1.0,
          convertCoordinates: { sourceUp: 'Y', convertToZUp: true },
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
            { uuid: 'mesh-uuid-1', name: 'Body', sourceIndex: 0, vertexCount: 3, triangleCount: 1 },
            { uuid: 'mesh-uuid-2', name: 'Wheels', sourceIndex: 1, vertexCount: 4, triangleCount: 2 },
          ],
          materials: [
            { uuid: 'material-uuid-1', name: 'CarPaint', sourceIndex: 0, isOverridden: false },
            { uuid: 'material-uuid-2', name: 'Rubber', sourceIndex: 1, isOverridden: false },
          ],
        },
        hierarchy: [
          {
            name: 'Root',
            meshIndex: 0,
            materialIndices: [0],
            transform: {
              position: [1, 2, 3],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            },
            children: [
              {
                name: 'Wheel',
                meshIndex: 1,
                materialIndices: [1],
                transform: {
                  position: [0, 0, 0],
                  rotation: [0, 0, 0],
                  scale: [1, 1, 1],
                },
                children: [],
              },
            ],
          },
        ],
      };
    }

    it('preserves the meta UUID on the synthesized model', () => {
      const meta = createMockMeta();
      const model = factory.fromMeta(meta, 'car.glb');
      expect(model.uuid).toBe('model-uuid-from-meta');
    });

    it('derives the model name from the source filename', () => {
      const meta = createMockMeta();
      const model = factory.fromMeta(meta, 'cool_car.glb');
      expect(model.name).toBe('cool_car');
    });

    it('copies derived mesh references with vertex/triangle counts', () => {
      const meta = createMockMeta();
      const model = factory.fromMeta(meta, 'car.glb');
      expect(model.contents.meshes).toHaveLength(2);
      expect(model.contents.meshes[0]).toMatchObject({
        uuid: 'mesh-uuid-1',
        name: 'Body',
        vertexCount: 3,
        triangleCount: 1,
      });
    });

    it('copies derived material references', () => {
      const meta = createMockMeta();
      const model = factory.fromMeta(meta, 'car.glb');
      expect(model.contents.materials).toHaveLength(2);
      expect(model.contents.materials[1]).toMatchObject({
        uuid: 'material-uuid-2',
        name: 'Rubber',
      });
    });

    it('converts the meta hierarchy to model nodes recursively', () => {
      const meta = createMockMeta();
      const model = factory.fromMeta(meta, 'car.glb');
      expect(model.hierarchy).toHaveLength(1);
      expect(model.hierarchy[0].name).toBe('Root');
      expect(model.hierarchy[0].meshIndex).toBe(0);
      expect(model.hierarchy[0].transform.position).toEqual([1, 2, 3]);
      expect(model.hierarchy[0].children).toHaveLength(1);
      expect(model.hierarchy[0].children[0].name).toBe('Wheel');
    });

    it('produces independent transform arrays (no aliasing with the meta)', () => {
      const meta = createMockMeta();
      const model = factory.fromMeta(meta, 'car.glb');
      // Mutate the model's transform; the meta must remain unchanged.
      model.hierarchy[0].transform.position[0] = 999;
      expect(meta.hierarchy[0].transform.position[0]).toBe(1);
    });

    it('marks the asset as not built-in', () => {
      const meta = createMockMeta();
      const model = factory.fromMeta(meta, 'car.glb');
      expect(model.isBuiltIn).toBe(false);
    });

    it('infers the format from the filename extension', () => {
      const meta = createMockMeta();
      const glbModel = factory.fromMeta(meta, 'car.glb');
      const gltfModel = factory.fromMeta(meta, 'car.gltf');
      expect(glbModel.source.format).toBe('glb');
      expect(gltfModel.source.format).toBe('gltf');
    });
  });
});
