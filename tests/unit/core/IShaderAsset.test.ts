/**
 * IShaderAsset Tests
 *
 * Tests for shader asset interfaces and type guards.
 */

import { describe, it, expect } from 'vitest';
import {
  isShaderAsset,
  isUniformDeclaration,
  type IShaderAsset,
  type IUniformDeclaration,
} from '../../../src/core/assets/interfaces/IShaderAsset';

describe('IShaderAsset', () => {
  /**
   * Create a valid shader asset for testing.
   */
  function createValidShaderAsset(): IShaderAsset {
    return {
      uuid: 'test-shader-uuid',
      name: 'Test Shader',
      type: 'shader',
      version: 1,
      created: '2026-01-28T12:00:00Z',
      modified: '2026-01-28T12:00:00Z',
      isBuiltIn: false,
      vertexSource: '#version 300 es\nvoid main() { gl_Position = vec4(0.0); }',
      fragmentSource: '#version 300 es\nout vec4 color;\nvoid main() { color = vec4(1.0); }',
      uniforms: [
        {
          name: 'uColor',
          type: 'vec3',
          displayName: 'Color',
          defaultValue: [1.0, 1.0, 1.0],
        },
      ],
    };
  }

  describe('isShaderAsset', () => {
    it('should return true for valid shader asset', () => {
      const shader = createValidShaderAsset();

      expect(isShaderAsset(shader)).toBe(true);
    });

    it('should return true for built-in shader asset', () => {
      const shader = createValidShaderAsset();
      (shader as { isBuiltIn: boolean }).isBuiltIn = true;

      expect(isShaderAsset(shader)).toBe(true);
    });

    it('should return true for shader with optional description', () => {
      const shader = createValidShaderAsset();
      shader.description = 'A test shader';

      expect(isShaderAsset(shader)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isShaderAsset(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isShaderAsset(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isShaderAsset('not an object')).toBe(false);
      expect(isShaderAsset(123)).toBe(false);
      expect(isShaderAsset(true)).toBe(false);
    });

    it('should return false for missing uuid', () => {
      const shader = createValidShaderAsset();
      delete (shader as unknown as Record<string, unknown>).uuid;

      expect(isShaderAsset(shader)).toBe(false);
    });

    it('should return false for missing name', () => {
      const shader = createValidShaderAsset();
      delete (shader as unknown as Record<string, unknown>).name;

      expect(isShaderAsset(shader)).toBe(false);
    });

    it('should return false for wrong type', () => {
      const shader = createValidShaderAsset();
      (shader as unknown as Record<string, unknown>).type = 'material';

      expect(isShaderAsset(shader)).toBe(false);
    });

    it('should return false for missing version', () => {
      const shader = createValidShaderAsset();
      delete (shader as unknown as Record<string, unknown>).version;

      expect(isShaderAsset(shader)).toBe(false);
    });

    it('should return false for missing isBuiltIn', () => {
      const shader = createValidShaderAsset();
      delete (shader as unknown as Record<string, unknown>).isBuiltIn;

      expect(isShaderAsset(shader)).toBe(false);
    });

    it('should return false for missing vertexSource', () => {
      const shader = createValidShaderAsset();
      delete (shader as unknown as Record<string, unknown>).vertexSource;

      expect(isShaderAsset(shader)).toBe(false);
    });

    it('should return false for missing fragmentSource', () => {
      const shader = createValidShaderAsset();
      delete (shader as unknown as Record<string, unknown>).fragmentSource;

      expect(isShaderAsset(shader)).toBe(false);
    });

    it('should return false for missing uniforms array', () => {
      const shader = createValidShaderAsset();
      delete (shader as unknown as Record<string, unknown>).uniforms;

      expect(isShaderAsset(shader)).toBe(false);
    });

    it('should return false for non-array uniforms', () => {
      const shader = createValidShaderAsset();
      (shader as unknown as Record<string, unknown>).uniforms = 'not an array';

      expect(isShaderAsset(shader)).toBe(false);
    });

    it('should return true for empty uniforms array', () => {
      const shader = createValidShaderAsset();
      shader.uniforms = [];

      expect(isShaderAsset(shader)).toBe(true);
    });
  });

  describe('isUniformDeclaration', () => {
    /**
     * Create a valid uniform declaration for testing.
     */
    function createValidUniform(): IUniformDeclaration {
      return {
        name: 'uColor',
        type: 'vec3',
        displayName: 'Color',
        defaultValue: [1.0, 0.0, 0.0],
      };
    }

    it('should return true for valid uniform with vec3 type', () => {
      const uniform = createValidUniform();

      expect(isUniformDeclaration(uniform)).toBe(true);
    });

    it('should return true for valid uniform with float type', () => {
      const uniform: IUniformDeclaration = {
        name: 'uRoughness',
        type: 'float',
        displayName: 'Roughness',
        defaultValue: 0.5,
      };

      expect(isUniformDeclaration(uniform)).toBe(true);
    });

    it('should return true for valid uniform with all optional fields', () => {
      const uniform: IUniformDeclaration = {
        name: 'uMetallic',
        type: 'float',
        displayName: 'Metallic',
        defaultValue: 0.0,
        min: 0.0,
        max: 1.0,
        step: 0.01,
        uiType: 'slider',
        group: 'Surface',
      };

      expect(isUniformDeclaration(uniform)).toBe(true);
    });

    it('should return true for all valid uniform types', () => {
      const types = ['float', 'vec2', 'vec3', 'vec4', 'int', 'bool', 'sampler2D', 'mat3', 'mat4'];

      for (const type of types) {
        const uniform = {
          name: 'uTest',
          type,
          displayName: 'Test',
          defaultValue: type === 'bool' ? true : type.startsWith('mat') ? [] : 0,
        };

        expect(isUniformDeclaration(uniform)).toBe(true);
      }
    });

    it('should return false for null', () => {
      expect(isUniformDeclaration(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isUniformDeclaration(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isUniformDeclaration('not an object')).toBe(false);
      expect(isUniformDeclaration(123)).toBe(false);
    });

    it('should return false for missing name', () => {
      const uniform = createValidUniform();
      delete (uniform as unknown as Record<string, unknown>).name;

      expect(isUniformDeclaration(uniform)).toBe(false);
    });

    it('should return false for missing type', () => {
      const uniform = createValidUniform();
      delete (uniform as unknown as Record<string, unknown>).type;

      expect(isUniformDeclaration(uniform)).toBe(false);
    });

    it('should return false for invalid type', () => {
      const uniform = createValidUniform();
      (uniform as unknown as Record<string, unknown>).type = 'invalid';

      expect(isUniformDeclaration(uniform)).toBe(false);
    });

    it('should return false for missing displayName', () => {
      const uniform = createValidUniform();
      delete (uniform as unknown as Record<string, unknown>).displayName;

      expect(isUniformDeclaration(uniform)).toBe(false);
    });

    it('should return false for undefined defaultValue', () => {
      const uniform = createValidUniform();
      delete (uniform as unknown as Record<string, unknown>).defaultValue;

      expect(isUniformDeclaration(uniform)).toBe(false);
    });
  });
});
