/**
 * IModelAsset Tests
 *
 * Tests for model asset interfaces and type guards.
 */

import { describe, it, expect } from 'vitest';
import {
  isModelAsset,
  isModelNode,
  createDefaultModelContents,
  createDefaultModelNode,
  MODEL_ASSET_VERSION,
  type IModelAsset,
  type IModelNode,
} from '../../../src/core/assets/interfaces/IModelAsset';

describe('IModelAsset', () => {
  /**
   * Create a valid model asset for testing.
   */
  function createValidModelAsset(): IModelAsset {
    return {
      uuid: 'test-model-uuid',
      name: 'Test Model',
      type: 'model',
      version: MODEL_ASSET_VERSION,
      created: '2026-03-02T12:00:00Z',
      modified: '2026-03-02T12:00:00Z',
      isBuiltIn: false,
      source: {
        filename: 'test-model.glb',
        format: 'glb',
        importedAt: '2026-03-02T12:00:00Z',
      },
      contents: {
        meshes: [
          { uuid: 'mesh-1', name: 'Body', vertexCount: 1000, triangleCount: 500 },
        ],
        materials: [
          { uuid: 'mat-1', name: 'Material' },
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

  describe('isModelAsset', () => {
    it('should return true for valid model asset', () => {
      const model = createValidModelAsset();
      expect(isModelAsset(model)).toBe(true);
    });

    it('should return true for model with description', () => {
      const model = createValidModelAsset();
      model.description = 'A test model';
      expect(isModelAsset(model)).toBe(true);
    });

    it('should return true for model with file size', () => {
      const model = createValidModelAsset();
      model.source.fileSize = 1024;
      expect(isModelAsset(model)).toBe(true);
    });

    it('should return true for model with multiple meshes', () => {
      const model = createValidModelAsset();
      model.contents.meshes.push({
        uuid: 'mesh-2',
        name: 'Wheels',
        vertexCount: 500,
        triangleCount: 250,
      });
      expect(isModelAsset(model)).toBe(true);
    });

    it('should return true for model with nested hierarchy', () => {
      const model = createValidModelAsset();
      model.hierarchy[0].children = [
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
      expect(isModelAsset(model)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isModelAsset(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isModelAsset(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isModelAsset('not an object')).toBe(false);
      expect(isModelAsset(123)).toBe(false);
      expect(isModelAsset(true)).toBe(false);
    });

    it('should return false for wrong type', () => {
      const model = createValidModelAsset();
      (model as unknown as Record<string, unknown>).type = 'shader';
      expect(isModelAsset(model)).toBe(false);
    });

    it('should return false for missing uuid', () => {
      const model = createValidModelAsset();
      delete (model as unknown as Record<string, unknown>).uuid;
      expect(isModelAsset(model)).toBe(false);
    });

    it('should return false for missing name', () => {
      const model = createValidModelAsset();
      delete (model as unknown as Record<string, unknown>).name;
      expect(isModelAsset(model)).toBe(false);
    });

    it('should return false for missing version', () => {
      const model = createValidModelAsset();
      delete (model as unknown as Record<string, unknown>).version;
      expect(isModelAsset(model)).toBe(false);
    });

    it('should return false if isBuiltIn is not false', () => {
      const model = createValidModelAsset();
      (model as unknown as Record<string, unknown>).isBuiltIn = true;
      expect(isModelAsset(model)).toBe(false);
    });

    it('should return false for missing source', () => {
      const model = createValidModelAsset();
      delete (model as unknown as Record<string, unknown>).source;
      expect(isModelAsset(model)).toBe(false);
    });

    it('should return false for missing source.filename', () => {
      const model = createValidModelAsset();
      delete (model.source as unknown as Record<string, unknown>).filename;
      expect(isModelAsset(model)).toBe(false);
    });

    it('should return false for missing source.format', () => {
      const model = createValidModelAsset();
      delete (model.source as unknown as Record<string, unknown>).format;
      expect(isModelAsset(model)).toBe(false);
    });

    it('should return false for missing source.importedAt', () => {
      const model = createValidModelAsset();
      delete (model.source as unknown as Record<string, unknown>).importedAt;
      expect(isModelAsset(model)).toBe(false);
    });

    it('should return false for missing contents', () => {
      const model = createValidModelAsset();
      delete (model as unknown as Record<string, unknown>).contents;
      expect(isModelAsset(model)).toBe(false);
    });

    it('should return false for missing contents.meshes', () => {
      const model = createValidModelAsset();
      delete (model.contents as unknown as Record<string, unknown>).meshes;
      expect(isModelAsset(model)).toBe(false);
    });

    it('should return false for missing contents.materials', () => {
      const model = createValidModelAsset();
      delete (model.contents as unknown as Record<string, unknown>).materials;
      expect(isModelAsset(model)).toBe(false);
    });

    it('should return false for missing hierarchy', () => {
      const model = createValidModelAsset();
      delete (model as unknown as Record<string, unknown>).hierarchy;
      expect(isModelAsset(model)).toBe(false);
    });

    it('should return false for non-array hierarchy', () => {
      const model = createValidModelAsset();
      (model as unknown as Record<string, unknown>).hierarchy = 'not an array';
      expect(isModelAsset(model)).toBe(false);
    });
  });

  describe('isModelNode', () => {
    function createValidModelNode(): IModelNode {
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

    it('should return true for valid model node', () => {
      const node = createValidModelNode();
      expect(isModelNode(node)).toBe(true);
    });

    it('should return true for node with meshIndex', () => {
      const node = createValidModelNode();
      node.meshIndex = 0;
      expect(isModelNode(node)).toBe(true);
    });

    it('should return true for node with materialIndices', () => {
      const node = createValidModelNode();
      node.materialIndices = [0, 1];
      expect(isModelNode(node)).toBe(true);
    });

    it('should return true for node with children', () => {
      const node = createValidModelNode();
      node.children = [createValidModelNode()];
      expect(isModelNode(node)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isModelNode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isModelNode(undefined)).toBe(false);
    });

    it('should return false for missing name', () => {
      const node = createValidModelNode();
      delete (node as unknown as Record<string, unknown>).name;
      expect(isModelNode(node)).toBe(false);
    });

    it('should return false for missing transform', () => {
      const node = createValidModelNode();
      delete (node as unknown as Record<string, unknown>).transform;
      expect(isModelNode(node)).toBe(false);
    });

    it('should return false for missing transform.position', () => {
      const node = createValidModelNode();
      delete (node.transform as unknown as Record<string, unknown>).position;
      expect(isModelNode(node)).toBe(false);
    });

    it('should return false for missing transform.rotation', () => {
      const node = createValidModelNode();
      delete (node.transform as unknown as Record<string, unknown>).rotation;
      expect(isModelNode(node)).toBe(false);
    });

    it('should return false for missing transform.scale', () => {
      const node = createValidModelNode();
      delete (node.transform as unknown as Record<string, unknown>).scale;
      expect(isModelNode(node)).toBe(false);
    });

    it('should return false for missing children', () => {
      const node = createValidModelNode();
      delete (node as unknown as Record<string, unknown>).children;
      expect(isModelNode(node)).toBe(false);
    });
  });

  describe('createDefaultModelContents', () => {
    it('should create empty model contents', () => {
      const contents = createDefaultModelContents();
      expect(contents.meshes).toEqual([]);
      expect(contents.materials).toEqual([]);
      expect(contents.textures).toEqual([]);
    });
  });

  describe('createDefaultModelNode', () => {
    it('should create node with given name', () => {
      const node = createDefaultModelNode('TestNode');
      expect(node.name).toBe('TestNode');
    });

    it('should create node with default transform', () => {
      const node = createDefaultModelNode('TestNode');
      expect(node.transform.position).toEqual([0, 0, 0]);
      expect(node.transform.rotation).toEqual([0, 0, 0]);
      expect(node.transform.scale).toEqual([1, 1, 1]);
    });

    it('should create node with empty children array', () => {
      const node = createDefaultModelNode('TestNode');
      expect(node.children).toEqual([]);
    });
  });

  describe('MODEL_ASSET_VERSION', () => {
    it('should be defined', () => {
      expect(MODEL_ASSET_VERSION).toBeDefined();
    });

    it('should be a positive integer', () => {
      expect(typeof MODEL_ASSET_VERSION).toBe('number');
      expect(MODEL_ASSET_VERSION).toBeGreaterThan(0);
      expect(Number.isInteger(MODEL_ASSET_VERSION)).toBe(true);
    });
  });
});
