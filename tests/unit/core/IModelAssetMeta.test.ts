/**
 * IModelAssetMeta Tests
 *
 * Tests for model asset metadata interfaces and type guards.
 */

import { describe, it, expect } from 'vitest';
import {
  isModelAssetMeta,
  isModelMetaNode,
  createDefaultModelMetaNode,
  MODEL_ASSET_META_VERSION,
  type IModelAssetMeta,
  type IModelMetaNode,
} from '../../../src/core/assets/interfaces/IModelAssetMeta';
import {
  DEFAULT_MODEL_IMPORT_SETTINGS,
  createDefaultModelImportSettings,
} from '../../../src/core/assets/DefaultImportSettings';

describe('IModelAssetMeta', () => {
  /**
   * Create a valid model asset meta for testing.
   */
  function createValidModelAssetMeta(): IModelAssetMeta {
    return {
      version: MODEL_ASSET_META_VERSION,
      uuid: 'test-model-meta-uuid',
      type: 'model',
      importedAt: '2026-03-04T12:00:00Z',
      sourceHash: 'size:1234567:mtime:1709564400000',
      isDirty: false,
      sourcePath: 'Assets/Models/car.glb',
      importSettings: { ...DEFAULT_MODEL_IMPORT_SETTINGS },
      contents: {
        meshes: [
          {
            uuid: 'mesh-1',
            name: 'Body',
            sourceIndex: 0,
            vertexCount: 1000,
            triangleCount: 500,
          },
        ],
        materials: [
          {
            uuid: 'mat-1',
            name: 'CarPaint',
            sourceIndex: 0,
            isOverridden: false,
          },
        ],
      },
      hierarchy: [
        {
          name: 'Root',
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
    };
  }

  describe('isModelAssetMeta', () => {
    it('should return true for valid model asset meta', () => {
      const meta = createValidModelAssetMeta();
      expect(isModelAssetMeta(meta)).toBe(true);
    });

    it('should return true for model with description', () => {
      const meta = createValidModelAssetMeta();
      meta.description = 'A test model';
      expect(isModelAssetMeta(meta)).toBe(true);
    });

    it('should return true for model with multiple meshes', () => {
      const meta = createValidModelAssetMeta();
      meta.contents.meshes.push({
        uuid: 'mesh-2',
        name: 'Wheels',
        sourceIndex: 1,
        vertexCount: 500,
        triangleCount: 250,
      });
      expect(isModelAssetMeta(meta)).toBe(true);
    });

    it('should return true for model with nested hierarchy', () => {
      const meta = createValidModelAssetMeta();
      meta.hierarchy[0].children = [
        {
          name: 'Child',
          transform: {
            position: [1, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          children: [],
        },
      ];
      expect(isModelAssetMeta(meta)).toBe(true);
    });

    it('should return true for model with overridden material', () => {
      const meta = createValidModelAssetMeta();
      meta.contents.materials[0] = {
        uuid: 'mat-1',
        name: 'CarPaint',
        sourceIndex: 0,
        isOverridden: true,
        overrideUuid: 'custom-mat-uuid',
      };
      expect(isModelAssetMeta(meta)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isModelAssetMeta(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isModelAssetMeta(undefined)).toBe(false);
    });

    it('should return false for wrong type', () => {
      const meta = createValidModelAssetMeta();
      (meta as unknown as Record<string, unknown>).type = 'texture';
      expect(isModelAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing version', () => {
      const meta = createValidModelAssetMeta();
      delete (meta as unknown as Record<string, unknown>).version;
      expect(isModelAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing uuid', () => {
      const meta = createValidModelAssetMeta();
      delete (meta as unknown as Record<string, unknown>).uuid;
      expect(isModelAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing importedAt', () => {
      const meta = createValidModelAssetMeta();
      delete (meta as unknown as Record<string, unknown>).importedAt;
      expect(isModelAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing sourceHash', () => {
      const meta = createValidModelAssetMeta();
      delete (meta as unknown as Record<string, unknown>).sourceHash;
      expect(isModelAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing isDirty', () => {
      const meta = createValidModelAssetMeta();
      delete (meta as unknown as Record<string, unknown>).isDirty;
      expect(isModelAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing sourcePath', () => {
      const meta = createValidModelAssetMeta();
      delete (meta as unknown as Record<string, unknown>).sourcePath;
      expect(isModelAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing importSettings', () => {
      const meta = createValidModelAssetMeta();
      delete (meta as unknown as Record<string, unknown>).importSettings;
      expect(isModelAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing importSettings.scaleFactor', () => {
      const meta = createValidModelAssetMeta();
      delete (meta.importSettings as unknown as Record<string, unknown>).scaleFactor;
      expect(isModelAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing contents', () => {
      const meta = createValidModelAssetMeta();
      delete (meta as unknown as Record<string, unknown>).contents;
      expect(isModelAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing contents.meshes', () => {
      const meta = createValidModelAssetMeta();
      delete (meta.contents as unknown as Record<string, unknown>).meshes;
      expect(isModelAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing contents.materials', () => {
      const meta = createValidModelAssetMeta();
      delete (meta.contents as unknown as Record<string, unknown>).materials;
      expect(isModelAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing hierarchy', () => {
      const meta = createValidModelAssetMeta();
      delete (meta as unknown as Record<string, unknown>).hierarchy;
      expect(isModelAssetMeta(meta)).toBe(false);
    });

    it('should return false for non-array hierarchy', () => {
      const meta = createValidModelAssetMeta();
      (meta as unknown as Record<string, unknown>).hierarchy = 'not an array';
      expect(isModelAssetMeta(meta)).toBe(false);
    });
  });

  describe('isModelMetaNode', () => {
    function createValidNode(): IModelMetaNode {
      return {
        name: 'TestNode',
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        children: [],
      };
    }

    it('should return true for valid model meta node', () => {
      const node = createValidNode();
      expect(isModelMetaNode(node)).toBe(true);
    });

    it('should return true for node with meshIndex', () => {
      const node = { ...createValidNode(), meshIndex: 0 };
      expect(isModelMetaNode(node)).toBe(true);
    });

    it('should return true for node with materialIndices', () => {
      const node = { ...createValidNode(), materialIndices: [0, 1] };
      expect(isModelMetaNode(node)).toBe(true);
    });

    it('should return true for node with children', () => {
      const node = createValidNode();
      node.children = [createValidNode()];
      expect(isModelMetaNode(node)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isModelMetaNode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isModelMetaNode(undefined)).toBe(false);
    });

    it('should return false for missing name', () => {
      const node = createValidNode();
      delete (node as unknown as Record<string, unknown>).name;
      expect(isModelMetaNode(node)).toBe(false);
    });

    it('should return false for missing transform', () => {
      const node = createValidNode();
      delete (node as unknown as Record<string, unknown>).transform;
      expect(isModelMetaNode(node)).toBe(false);
    });

    it('should return false for missing transform.position', () => {
      const node = createValidNode();
      delete (node.transform as unknown as Record<string, unknown>).position;
      expect(isModelMetaNode(node)).toBe(false);
    });

    it('should return false for missing transform.rotation', () => {
      const node = createValidNode();
      delete (node.transform as unknown as Record<string, unknown>).rotation;
      expect(isModelMetaNode(node)).toBe(false);
    });

    it('should return false for missing transform.scale', () => {
      const node = createValidNode();
      delete (node.transform as unknown as Record<string, unknown>).scale;
      expect(isModelMetaNode(node)).toBe(false);
    });

    it('should return false for missing children', () => {
      const node = createValidNode();
      delete (node as unknown as Record<string, unknown>).children;
      expect(isModelMetaNode(node)).toBe(false);
    });
  });

  describe('createDefaultModelMetaNode', () => {
    it('should create node with given name', () => {
      const node = createDefaultModelMetaNode('TestNode');
      expect(node.name).toBe('TestNode');
    });

    it('should create node with default transform', () => {
      const node = createDefaultModelMetaNode('TestNode');
      expect(node.transform.position).toEqual([0, 0, 0]);
      expect(node.transform.rotation).toEqual([0, 0, 0]);
      expect(node.transform.scale).toEqual([1, 1, 1]);
    });

    it('should create node with empty children array', () => {
      const node = createDefaultModelMetaNode('TestNode');
      expect(node.children).toEqual([]);
    });

    it('should not have meshIndex or materialIndices', () => {
      const node = createDefaultModelMetaNode('TestNode');
      expect(node.meshIndex).toBeUndefined();
      expect(node.materialIndices).toBeUndefined();
    });
  });

  describe('MODEL_ASSET_META_VERSION', () => {
    it('should be defined', () => {
      expect(MODEL_ASSET_META_VERSION).toBeDefined();
    });

    it('should be a positive integer', () => {
      expect(typeof MODEL_ASSET_META_VERSION).toBe('number');
      expect(MODEL_ASSET_META_VERSION).toBeGreaterThan(0);
      expect(Number.isInteger(MODEL_ASSET_META_VERSION)).toBe(true);
    });
  });
});

describe('DefaultImportSettings', () => {
  describe('DEFAULT_MODEL_IMPORT_SETTINGS', () => {
    it('should have scaleFactor of 1.0', () => {
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.scaleFactor).toBe(1.0);
    });

    it('should have coordinate conversion settings', () => {
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.convertCoordinates.sourceUp).toBe('Y');
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.convertCoordinates.convertToZUp).toBe(true);
    });

    it('should have mesh import settings', () => {
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.meshes.generateNormals).toBe(true);
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.meshes.normalAngleThreshold).toBe(60);
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.meshes.generateTangents).toBe(true);
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.meshes.weldVertices).toBe(false);
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.meshes.weldThreshold).toBe(0.0001);
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.meshes.optimizeMesh).toBe(true);
    });

    it('should have material import settings', () => {
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.materials.importMaterials).toBe(true);
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.materials.namePrefix).toBe('');
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.materials.extractTextures).toBe(true);
    });

    it('should have animation import settings', () => {
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.animations.importAnimations).toBe(true);
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.animations.animationNamePrefix).toBe('');
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.animations.sampleRate).toBe(30);
    });
  });

  describe('createDefaultModelImportSettings', () => {
    it('should return a new object each time', () => {
      const settings1 = createDefaultModelImportSettings();
      const settings2 = createDefaultModelImportSettings();
      expect(settings1).not.toBe(settings2);
    });

    it('should return settings matching defaults', () => {
      const settings = createDefaultModelImportSettings();
      expect(settings.scaleFactor).toBe(DEFAULT_MODEL_IMPORT_SETTINGS.scaleFactor);
      expect(settings.convertCoordinates.sourceUp).toBe(DEFAULT_MODEL_IMPORT_SETTINGS.convertCoordinates.sourceUp);
    });

    it('should allow modification without affecting defaults', () => {
      const settings = createDefaultModelImportSettings();
      settings.scaleFactor = 0.01;
      settings.meshes.generateNormals = false;

      expect(DEFAULT_MODEL_IMPORT_SETTINGS.scaleFactor).toBe(1.0);
      expect(DEFAULT_MODEL_IMPORT_SETTINGS.meshes.generateNormals).toBe(true);
    });
  });
});
