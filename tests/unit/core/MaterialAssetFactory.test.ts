/**
 * MaterialAssetFactory Tests
 *
 * Tests for material asset creation and duplication.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MaterialAssetFactory,
  MATERIAL_ASSET_VERSION,
} from '../../../src/core/assets/MaterialAssetFactory';
import type { IMaterialAsset } from '../../../src/core/assets/interfaces/IMaterialAsset';
import type { IShaderAsset, IUniformDeclaration } from '../../../src/core/assets/interfaces';

describe('MaterialAssetFactory', () => {
  let factory: MaterialAssetFactory;

  /**
   * Create a mock shader for testing.
   */
  function createMockShader(): IShaderAsset {
    return {
      uuid: 'mock-shader-uuid',
      name: 'Mock Shader',
      type: 'shader',
      version: 1,
      created: '2026-01-01T00:00:00Z',
      modified: '2026-01-01T00:00:00Z',
      isBuiltIn: false,
      vertexSource: '#version 300 es\nvoid main() {}',
      fragmentSource: '#version 300 es\nout vec4 c;\nvoid main() { c = vec4(1.0); }',
      uniforms: [
        {
          name: 'uBaseColor',
          type: 'vec3',
          displayName: 'Base Color',
          defaultValue: [0.8, 0.8, 0.8],
          uiType: 'color',
          group: 'Surface',
        },
        {
          name: 'uMetallic',
          type: 'float',
          displayName: 'Metallic',
          defaultValue: 0.0,
          min: 0.0,
          max: 1.0,
          uiType: 'slider',
          group: 'Surface',
        },
        {
          name: 'uRoughness',
          type: 'float',
          displayName: 'Roughness',
          defaultValue: 0.5,
          min: 0.0,
          max: 1.0,
          uiType: 'slider',
          group: 'Surface',
        },
      ],
    };
  }

  beforeEach(() => {
    factory = new MaterialAssetFactory();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-28T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('should create a material with the given name', () => {
      const material = factory.create({
        name: 'My Material',
        shaderRef: { uuid: 'shader-uuid', type: 'shader' },
      });

      expect(material.name).toBe('My Material');
    });

    it('should create a material with a valid UUID', () => {
      const material = factory.create({
        name: 'Test',
        shaderRef: { uuid: 'shader-uuid', type: 'shader' },
      });

      expect(material.uuid).toBeDefined();
      expect(typeof material.uuid).toBe('string');
      expect(material.uuid.length).toBeGreaterThan(0);
    });

    it('should use custom UUID if provided', () => {
      const material = factory.create({
        name: 'Test',
        uuid: 'custom-uuid-123',
        shaderRef: { uuid: 'shader-uuid', type: 'shader' },
      });

      expect(material.uuid).toBe('custom-uuid-123');
    });

    it('should set type to material', () => {
      const material = factory.create({
        name: 'Test',
        shaderRef: { uuid: 'shader-uuid', type: 'shader' },
      });

      expect(material.type).toBe('material');
    });

    it('should set version to current schema version', () => {
      const material = factory.create({
        name: 'Test',
        shaderRef: { uuid: 'shader-uuid', type: 'shader' },
      });

      expect(material.version).toBe(MATERIAL_ASSET_VERSION);
    });

    it('should set isBuiltIn to false', () => {
      const material = factory.create({
        name: 'Test',
        shaderRef: { uuid: 'shader-uuid', type: 'shader' },
      });

      expect(material.isBuiltIn).toBe(false);
    });

    it('should copy shader reference', () => {
      const material = factory.create({
        name: 'Test',
        shaderRef: { uuid: 'shader-uuid-123', type: 'shader' },
      });

      expect(material.shaderRef.uuid).toBe('shader-uuid-123');
      expect(material.shaderRef.type).toBe('shader');
    });

    it('should use empty parameters if no shader provided', () => {
      const material = factory.create({
        name: 'Test',
        shaderRef: { uuid: 'shader-uuid', type: 'shader' },
      });

      expect(material.parameters).toEqual({});
    });

    it('should use shader default parameters if shader provided', () => {
      const shader = createMockShader();
      const material = factory.create(
        {
          name: 'Test',
          shaderRef: { uuid: shader.uuid, type: 'shader' },
        },
        shader
      );

      expect(material.parameters.uBaseColor).toEqual([0.8, 0.8, 0.8]);
      expect(material.parameters.uMetallic).toBe(0.0);
      expect(material.parameters.uRoughness).toBe(0.5);
    });

    it('should override shader defaults with provided parameters', () => {
      const shader = createMockShader();
      const material = factory.create(
        {
          name: 'Test',
          shaderRef: { uuid: shader.uuid, type: 'shader' },
          parameters: {
            uBaseColor: [1.0, 0.0, 0.0], // Red instead of gray
            uMetallic: 1.0, // Metal instead of dielectric
          },
        },
        shader
      );

      expect(material.parameters.uBaseColor).toEqual([1.0, 0.0, 0.0]);
      expect(material.parameters.uMetallic).toBe(1.0);
      expect(material.parameters.uRoughness).toBe(0.5); // Still shader default
    });

    it('should set created and modified timestamps', () => {
      const material = factory.create({
        name: 'Test',
        shaderRef: { uuid: 'shader-uuid', type: 'shader' },
      });

      expect(material.created).toBe('2026-01-28T12:00:00.000Z');
      expect(material.modified).toBe('2026-01-28T12:00:00.000Z');
    });

    it('should set description if provided', () => {
      const material = factory.create({
        name: 'Test',
        shaderRef: { uuid: 'shader-uuid', type: 'shader' },
        description: 'A test material',
      });

      expect(material.description).toBe('A test material');
    });

    it('should not set description if not provided', () => {
      const material = factory.create({
        name: 'Test',
        shaderRef: { uuid: 'shader-uuid', type: 'shader' },
      });

      expect(material.description).toBeUndefined();
    });
  });

  describe('duplicate', () => {
    let sourceMaterial: IMaterialAsset;

    beforeEach(() => {
      sourceMaterial = {
        uuid: 'source-uuid',
        name: 'Source Material',
        type: 'material',
        version: 1,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: true,
        shaderRef: { uuid: 'pbr-shader-uuid', type: 'shader' },
        parameters: {
          uBaseColor: [1.0, 0.843, 0.0], // Gold
          uMetallic: 1.0,
          uRoughness: 0.3,
        },
        description: 'Original gold material',
      };
    });

    it('should create a duplicate with new name', () => {
      const duplicate = factory.duplicate(sourceMaterial, 'Copy of Gold');

      expect(duplicate.name).toBe('Copy of Gold');
    });

    it('should create a duplicate with new UUID', () => {
      const duplicate = factory.duplicate(sourceMaterial, 'Copy');

      expect(duplicate.uuid).not.toBe(sourceMaterial.uuid);
      expect(duplicate.uuid).toBeDefined();
    });

    it('should use custom UUID if provided', () => {
      const duplicate = factory.duplicate(sourceMaterial, 'Copy', 'custom-dup-uuid');

      expect(duplicate.uuid).toBe('custom-dup-uuid');
    });

    it('should set isBuiltIn to false (duplicates are always editable)', () => {
      const duplicate = factory.duplicate(sourceMaterial, 'Copy');

      expect(duplicate.isBuiltIn).toBe(false);
    });

    it('should copy shader reference', () => {
      const duplicate = factory.duplicate(sourceMaterial, 'Copy');

      expect(duplicate.shaderRef.uuid).toBe('pbr-shader-uuid');
      expect(duplicate.shaderRef.type).toBe('shader');
    });

    it('should deep copy parameters', () => {
      const duplicate = factory.duplicate(sourceMaterial, 'Copy');

      expect(duplicate.parameters).toEqual(sourceMaterial.parameters);
      expect(duplicate.parameters).not.toBe(sourceMaterial.parameters);
    });

    it('should deep copy array parameter values', () => {
      const duplicate = factory.duplicate(sourceMaterial, 'Copy');

      expect(duplicate.parameters.uBaseColor).toEqual([1.0, 0.843, 0.0]);
      expect(duplicate.parameters.uBaseColor).not.toBe(sourceMaterial.parameters.uBaseColor);
    });

    it('should set new timestamps', () => {
      const duplicate = factory.duplicate(sourceMaterial, 'Copy');

      expect(duplicate.created).toBe('2026-01-28T12:00:00.000Z');
      expect(duplicate.modified).toBe('2026-01-28T12:00:00.000Z');
    });

    it('should update description to indicate copy', () => {
      const duplicate = factory.duplicate(sourceMaterial, 'Copy');

      expect(duplicate.description).toBe('Copy of Source Material: Original gold material');
    });

    it('should set description for source without description', () => {
      delete sourceMaterial.description;
      const duplicate = factory.duplicate(sourceMaterial, 'Copy');

      expect(duplicate.description).toBe('Copy of Source Material');
    });
  });

  describe('fromJSON', () => {
    it('should parse valid material JSON', () => {
      const json = {
        uuid: 'json-uuid',
        name: 'JSON Material',
        type: 'material',
        version: 1,
        created: '2026-01-20T10:00:00Z',
        modified: '2026-01-21T11:00:00Z',
        isBuiltIn: false,
        shaderRef: { uuid: 'shader-uuid', type: 'shader' },
        parameters: { uColor: [1.0, 0.0, 0.0] },
      };

      const material = factory.fromJSON(json);

      expect(material.uuid).toBe('json-uuid');
      expect(material.name).toBe('JSON Material');
      expect(material.type).toBe('material');
      expect(material.version).toBe(1);
      expect(material.created).toBe('2026-01-20T10:00:00Z');
      expect(material.modified).toBe('2026-01-21T11:00:00Z');
      expect(material.isBuiltIn).toBe(false);
      expect(material.shaderRef.uuid).toBe('shader-uuid');
      expect(material.parameters.uColor).toEqual([1.0, 0.0, 0.0]);
    });

    it('should throw for null data', () => {
      expect(() => factory.fromJSON(null)).toThrow('expected object');
    });

    it('should throw for non-object data', () => {
      expect(() => factory.fromJSON('not an object')).toThrow('expected object');
    });

    it('should throw for missing uuid', () => {
      const json = { name: 'Test', type: 'material' };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid uuid');
    });

    it('should throw for missing name', () => {
      const json = { uuid: 'test', type: 'material' };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid name');
    });

    it('should throw for wrong type', () => {
      const json = { uuid: 'test', name: 'Test', type: 'shader' };
      expect(() => factory.fromJSON(json)).toThrow('type must be "material"');
    });

    it('should throw for missing shaderRef', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'material',
        parameters: {},
      };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid shaderRef');
    });

    it('should throw for null shaderRef', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'material',
        shaderRef: null,
        parameters: {},
      };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid shaderRef');
    });

    it('should throw for shaderRef missing uuid', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'material',
        shaderRef: { type: 'shader' },
        parameters: {},
      };
      expect(() => factory.fromJSON(json)).toThrow('shaderRef.uuid must be a string');
    });

    it('should throw for shaderRef with wrong type', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'material',
        shaderRef: { uuid: 'shader', type: 'material' },
        parameters: {},
      };
      expect(() => factory.fromJSON(json)).toThrow('shaderRef.type must be "shader"');
    });

    it('should throw for missing parameters', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'material',
        shaderRef: { uuid: 'shader', type: 'shader' },
      };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid parameters');
    });

    it('should throw for null parameters', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'material',
        shaderRef: { uuid: 'shader', type: 'shader' },
        parameters: null,
      };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid parameters');
    });

    it('should default version if missing', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'material',
        shaderRef: { uuid: 'shader', type: 'shader' },
        parameters: {},
      };

      const material = factory.fromJSON(json);

      expect(material.version).toBe(MATERIAL_ASSET_VERSION);
    });

    it('should default isBuiltIn to false if missing', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'material',
        shaderRef: { uuid: 'shader', type: 'shader' },
        parameters: {},
      };

      const material = factory.fromJSON(json);

      expect(material.isBuiltIn).toBe(false);
    });

    it('should parse description if present', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'material',
        shaderRef: { uuid: 'shader', type: 'shader' },
        parameters: {},
        description: 'A test material',
      };

      const material = factory.fromJSON(json);

      expect(material.description).toBe('A test material');
    });
  });

  describe('toJSON', () => {
    it('should convert material to JSON', () => {
      const material = factory.create({
        name: 'Test Material',
        shaderRef: { uuid: 'shader-uuid', type: 'shader' },
        description: 'A test material',
      });

      const json = factory.toJSON(material);

      expect(json.uuid).toBe(material.uuid);
      expect(json.name).toBe('Test Material');
      expect(json.type).toBe('material');
      expect(json.description).toBe('A test material');
    });

    it('should include all material properties', () => {
      const shader = createMockShader();
      const material = factory.create(
        {
          name: 'Test',
          shaderRef: { uuid: shader.uuid, type: 'shader' },
        },
        shader
      );

      const json = factory.toJSON(material);

      expect(json).toHaveProperty('uuid');
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('type');
      expect(json).toHaveProperty('version');
      expect(json).toHaveProperty('created');
      expect(json).toHaveProperty('modified');
      expect(json).toHaveProperty('isBuiltIn');
      expect(json).toHaveProperty('shaderRef');
      expect(json).toHaveProperty('parameters');
    });

    it('should include shaderRef with uuid and type', () => {
      const material = factory.create({
        name: 'Test',
        shaderRef: { uuid: 'shader-uuid-123', type: 'shader' },
      });

      const json = factory.toJSON(material);

      expect((json.shaderRef as Record<string, unknown>).uuid).toBe('shader-uuid-123');
      expect((json.shaderRef as Record<string, unknown>).type).toBe('shader');
    });
  });

  describe('getDefaultParameters', () => {
    it('should extract default values from uniforms', () => {
      const uniforms: IUniformDeclaration[] = [
        { name: 'uFloat', type: 'float', displayName: 'Float', defaultValue: 0.5 },
        { name: 'uVec3', type: 'vec3', displayName: 'Vec3', defaultValue: [1, 2, 3] },
        { name: 'uBool', type: 'bool', displayName: 'Bool', defaultValue: true },
      ];

      const params = factory.getDefaultParameters(uniforms);

      expect(params.uFloat).toBe(0.5);
      expect(params.uVec3).toEqual([1, 2, 3]);
      expect(params.uBool).toBe(true);
    });

    it('should return empty object for empty uniforms', () => {
      const params = factory.getDefaultParameters([]);

      expect(params).toEqual({});
    });

    it('should deep copy array values', () => {
      const originalArray = [1.0, 0.0, 0.0];
      const uniforms: IUniformDeclaration[] = [
        { name: 'uColor', type: 'vec3', displayName: 'Color', defaultValue: originalArray },
      ];

      const params = factory.getDefaultParameters(uniforms);

      expect(params.uColor).toEqual([1.0, 0.0, 0.0]);
      expect(params.uColor).not.toBe(originalArray);
    });
  });

  describe('syncParametersWithShader', () => {
    it('should add missing parameters from shader', () => {
      const shader = createMockShader();
      const material: IMaterialAsset = {
        uuid: 'test',
        name: 'Test',
        type: 'material',
        version: 1,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        shaderRef: { uuid: shader.uuid, type: 'shader' },
        parameters: {
          uBaseColor: [1.0, 0.0, 0.0], // Has base color
          // Missing uMetallic and uRoughness
        },
      };

      const updated = factory.syncParametersWithShader(material, shader);

      expect(updated.uBaseColor).toEqual([1.0, 0.0, 0.0]); // Preserved
      expect(updated.uMetallic).toBe(0.0); // Added from shader default
      expect(updated.uRoughness).toBe(0.5); // Added from shader default
    });

    it('should not overwrite existing parameters', () => {
      const shader = createMockShader();
      const material: IMaterialAsset = {
        uuid: 'test',
        name: 'Test',
        type: 'material',
        version: 1,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        shaderRef: { uuid: shader.uuid, type: 'shader' },
        parameters: {
          uBaseColor: [1.0, 0.0, 0.0],
          uMetallic: 1.0, // Custom value, not shader default
          uRoughness: 0.1, // Custom value, not shader default
        },
      };

      const updated = factory.syncParametersWithShader(material, shader);

      expect(updated.uBaseColor).toEqual([1.0, 0.0, 0.0]);
      expect(updated.uMetallic).toBe(1.0); // Preserved custom value
      expect(updated.uRoughness).toBe(0.1); // Preserved custom value
    });

    it('should only include parameters defined in shader', () => {
      const shader = createMockShader();
      const material: IMaterialAsset = {
        uuid: 'test',
        name: 'Test',
        type: 'material',
        version: 1,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        shaderRef: { uuid: shader.uuid, type: 'shader' },
        parameters: {
          uBaseColor: [1.0, 0.0, 0.0],
          uObsoleteParam: 'should be removed', // Not in shader
        },
      };

      const updated = factory.syncParametersWithShader(material, shader);

      expect(updated.uObsoleteParam).toBeUndefined();
      expect(Object.keys(updated)).toEqual(['uBaseColor', 'uMetallic', 'uRoughness']);
    });
  });
});
