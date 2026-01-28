/**
 * ShaderAssetFactory Tests
 *
 * Tests for shader asset creation and duplication.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ShaderAssetFactory,
  DEFAULT_UNLIT_VERTEX_SHADER,
  DEFAULT_UNLIT_FRAGMENT_SHADER,
  DEFAULT_UNLIT_UNIFORMS,
  SHADER_ASSET_VERSION,
} from '../../../src/core/assets/ShaderAssetFactory';
import type { IShaderAsset, IUniformDeclaration } from '../../../src/core/assets/interfaces';

describe('ShaderAssetFactory', () => {
  let factory: ShaderAssetFactory;

  beforeEach(() => {
    factory = new ShaderAssetFactory();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-28T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('should create a shader with the given name', () => {
      const shader = factory.create({ name: 'My Shader' });

      expect(shader.name).toBe('My Shader');
    });

    it('should create a shader with a valid UUID', () => {
      const shader = factory.create({ name: 'Test' });

      expect(shader.uuid).toBeDefined();
      expect(typeof shader.uuid).toBe('string');
      expect(shader.uuid.length).toBeGreaterThan(0);
    });

    it('should use custom UUID if provided', () => {
      const shader = factory.create({
        name: 'Test',
        uuid: 'custom-uuid-123',
      });

      expect(shader.uuid).toBe('custom-uuid-123');
    });

    it('should set type to shader', () => {
      const shader = factory.create({ name: 'Test' });

      expect(shader.type).toBe('shader');
    });

    it('should set version to current schema version', () => {
      const shader = factory.create({ name: 'Test' });

      expect(shader.version).toBe(SHADER_ASSET_VERSION);
    });

    it('should set isBuiltIn to false', () => {
      const shader = factory.create({ name: 'Test' });

      expect(shader.isBuiltIn).toBe(false);
    });

    it('should use default unlit vertex shader if not provided', () => {
      const shader = factory.create({ name: 'Test' });

      expect(shader.vertexSource).toBe(DEFAULT_UNLIT_VERTEX_SHADER);
    });

    it('should use default unlit fragment shader if not provided', () => {
      const shader = factory.create({ name: 'Test' });

      expect(shader.fragmentSource).toBe(DEFAULT_UNLIT_FRAGMENT_SHADER);
    });

    it('should use default unlit uniforms if not provided', () => {
      const shader = factory.create({ name: 'Test' });

      expect(shader.uniforms).toEqual(DEFAULT_UNLIT_UNIFORMS);
    });

    it('should use custom vertex shader if provided', () => {
      const customVertex = '#version 300 es\nvoid main() {}';
      const shader = factory.create({
        name: 'Test',
        vertexSource: customVertex,
      });

      expect(shader.vertexSource).toBe(customVertex);
    });

    it('should use custom fragment shader if provided', () => {
      const customFragment = '#version 300 es\nout vec4 color;\nvoid main() { color = vec4(1.0); }';
      const shader = factory.create({
        name: 'Test',
        fragmentSource: customFragment,
      });

      expect(shader.fragmentSource).toBe(customFragment);
    });

    it('should use custom uniforms if provided', () => {
      const customUniforms: IUniformDeclaration[] = [
        {
          name: 'uCustom',
          type: 'float',
          displayName: 'Custom',
          defaultValue: 0.5,
        },
      ];
      const shader = factory.create({
        name: 'Test',
        uniforms: customUniforms,
      });

      expect(shader.uniforms).toEqual(customUniforms);
    });

    it('should set created and modified timestamps', () => {
      const shader = factory.create({ name: 'Test' });

      expect(shader.created).toBe('2026-01-28T12:00:00.000Z');
      expect(shader.modified).toBe('2026-01-28T12:00:00.000Z');
    });

    it('should set description if provided', () => {
      const shader = factory.create({
        name: 'Test',
        description: 'A test shader',
      });

      expect(shader.description).toBe('A test shader');
    });

    it('should not set description if not provided', () => {
      const shader = factory.create({ name: 'Test' });

      expect(shader.description).toBeUndefined();
    });
  });

  describe('duplicate', () => {
    let sourceShader: IShaderAsset;

    beforeEach(() => {
      sourceShader = {
        uuid: 'source-uuid',
        name: 'Source Shader',
        type: 'shader',
        version: 1,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: true,
        vertexSource: '#version 300 es\nvoid main() { gl_Position = vec4(1.0); }',
        fragmentSource: '#version 300 es\nout vec4 c;\nvoid main() { c = vec4(0.5); }',
        uniforms: [
          {
            name: 'uTest',
            type: 'vec3',
            displayName: 'Test',
            defaultValue: [1.0, 0.0, 0.0],
          },
        ],
        description: 'Original description',
      };
    });

    it('should create a duplicate with new name', () => {
      const duplicate = factory.duplicate(sourceShader, 'Copy of Source');

      expect(duplicate.name).toBe('Copy of Source');
    });

    it('should create a duplicate with new UUID', () => {
      const duplicate = factory.duplicate(sourceShader, 'Copy');

      expect(duplicate.uuid).not.toBe(sourceShader.uuid);
      expect(duplicate.uuid).toBeDefined();
    });

    it('should use custom UUID if provided', () => {
      const duplicate = factory.duplicate(sourceShader, 'Copy', 'custom-dup-uuid');

      expect(duplicate.uuid).toBe('custom-dup-uuid');
    });

    it('should set isBuiltIn to false (duplicates are always editable)', () => {
      const duplicate = factory.duplicate(sourceShader, 'Copy');

      expect(duplicate.isBuiltIn).toBe(false);
    });

    it('should copy vertex source', () => {
      const duplicate = factory.duplicate(sourceShader, 'Copy');

      expect(duplicate.vertexSource).toBe(sourceShader.vertexSource);
    });

    it('should copy fragment source', () => {
      const duplicate = factory.duplicate(sourceShader, 'Copy');

      expect(duplicate.fragmentSource).toBe(sourceShader.fragmentSource);
    });

    it('should deep copy uniforms', () => {
      const duplicate = factory.duplicate(sourceShader, 'Copy');

      expect(duplicate.uniforms).toEqual(sourceShader.uniforms);
      expect(duplicate.uniforms).not.toBe(sourceShader.uniforms);
    });

    it('should deep copy uniform default values', () => {
      const duplicate = factory.duplicate(sourceShader, 'Copy');

      expect(duplicate.uniforms[0].defaultValue).toEqual([1.0, 0.0, 0.0]);
      expect(duplicate.uniforms[0].defaultValue).not.toBe(sourceShader.uniforms[0].defaultValue);
    });

    it('should set new timestamps', () => {
      const duplicate = factory.duplicate(sourceShader, 'Copy');

      expect(duplicate.created).toBe('2026-01-28T12:00:00.000Z');
      expect(duplicate.modified).toBe('2026-01-28T12:00:00.000Z');
    });

    it('should update description to indicate copy', () => {
      const duplicate = factory.duplicate(sourceShader, 'Copy');

      expect(duplicate.description).toBe('Copy of Source Shader: Original description');
    });

    it('should set description for source without description', () => {
      delete sourceShader.description;
      const duplicate = factory.duplicate(sourceShader, 'Copy');

      expect(duplicate.description).toBe('Copy of Source Shader');
    });
  });

  describe('fromJSON', () => {
    it('should parse valid shader JSON', () => {
      const json = {
        uuid: 'json-uuid',
        name: 'JSON Shader',
        type: 'shader',
        version: 1,
        created: '2026-01-20T10:00:00Z',
        modified: '2026-01-21T11:00:00Z',
        isBuiltIn: false,
        vertexSource: '#version 300 es\nvoid main() {}',
        fragmentSource: '#version 300 es\nout vec4 c;\nvoid main() { c = vec4(1.0); }',
        uniforms: [],
      };

      const shader = factory.fromJSON(json);

      expect(shader.uuid).toBe('json-uuid');
      expect(shader.name).toBe('JSON Shader');
      expect(shader.type).toBe('shader');
      expect(shader.version).toBe(1);
      expect(shader.created).toBe('2026-01-20T10:00:00Z');
      expect(shader.modified).toBe('2026-01-21T11:00:00Z');
      expect(shader.isBuiltIn).toBe(false);
    });

    it('should throw for null data', () => {
      expect(() => factory.fromJSON(null)).toThrow('expected object');
    });

    it('should throw for non-object data', () => {
      expect(() => factory.fromJSON('not an object')).toThrow('expected object');
    });

    it('should throw for missing uuid', () => {
      const json = { name: 'Test', type: 'shader' };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid uuid');
    });

    it('should throw for missing name', () => {
      const json = { uuid: 'test', type: 'shader' };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid name');
    });

    it('should throw for wrong type', () => {
      const json = { uuid: 'test', name: 'Test', type: 'material' };
      expect(() => factory.fromJSON(json)).toThrow('type must be "shader"');
    });

    it('should throw for missing vertexSource', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'shader',
        fragmentSource: '#version 300 es\nvoid main() {}',
        uniforms: [],
      };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid vertexSource');
    });

    it('should throw for missing fragmentSource', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'shader',
        vertexSource: '#version 300 es\nvoid main() {}',
        uniforms: [],
      };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid fragmentSource');
    });

    it('should throw for missing uniforms', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'shader',
        vertexSource: '#version 300 es\nvoid main() {}',
        fragmentSource: '#version 300 es\nvoid main() {}',
      };
      expect(() => factory.fromJSON(json)).toThrow('missing or invalid uniforms');
    });

    it('should default version if missing', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'shader',
        vertexSource: '#version 300 es\nvoid main() {}',
        fragmentSource: '#version 300 es\nout vec4 c;\nvoid main() { c = vec4(1.0); }',
        uniforms: [],
      };

      const shader = factory.fromJSON(json);

      expect(shader.version).toBe(SHADER_ASSET_VERSION);
    });

    it('should default isBuiltIn to false if missing', () => {
      const json = {
        uuid: 'test',
        name: 'Test',
        type: 'shader',
        vertexSource: '#version 300 es\nvoid main() {}',
        fragmentSource: '#version 300 es\nout vec4 c;\nvoid main() { c = vec4(1.0); }',
        uniforms: [],
      };

      const shader = factory.fromJSON(json);

      expect(shader.isBuiltIn).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should convert shader to JSON', () => {
      const shader = factory.create({
        name: 'Test Shader',
        description: 'A test shader',
      });

      const json = factory.toJSON(shader);

      expect(json.uuid).toBe(shader.uuid);
      expect(json.name).toBe('Test Shader');
      expect(json.type).toBe('shader');
      expect(json.description).toBe('A test shader');
    });

    it('should include all shader properties', () => {
      const shader = factory.create({ name: 'Test' });

      const json = factory.toJSON(shader);

      expect(json).toHaveProperty('uuid');
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('type');
      expect(json).toHaveProperty('version');
      expect(json).toHaveProperty('created');
      expect(json).toHaveProperty('modified');
      expect(json).toHaveProperty('isBuiltIn');
      expect(json).toHaveProperty('vertexSource');
      expect(json).toHaveProperty('fragmentSource');
      expect(json).toHaveProperty('uniforms');
    });
  });
});
