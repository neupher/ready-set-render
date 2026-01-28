/**
 * BuiltInShaders Tests
 *
 * Tests for built-in shader definitions and utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  BUILT_IN_SHADER_IDS,
  BUILT_IN_PBR_SHADER,
  BUILT_IN_UNLIT_SHADER,
  BUILT_IN_SHADERS,
  isBuiltInShaderUUID,
} from '../../../src/core/assets/BuiltInShaders';
import { isShaderAsset } from '../../../src/core/assets/interfaces';

describe('BuiltInShaders', () => {
  describe('BUILT_IN_SHADER_IDS', () => {
    it('should have PBR shader ID', () => {
      expect(BUILT_IN_SHADER_IDS.PBR).toBe('built-in-shader-pbr');
    });

    it('should have Unlit shader ID', () => {
      expect(BUILT_IN_SHADER_IDS.UNLIT).toBe('built-in-shader-unlit');
    });

    it('should have unique IDs for each shader', () => {
      expect(BUILT_IN_SHADER_IDS.PBR).not.toBe(BUILT_IN_SHADER_IDS.UNLIT);
    });
  });

  describe('BUILT_IN_PBR_SHADER', () => {
    it('should be a valid shader asset', () => {
      expect(isShaderAsset(BUILT_IN_PBR_SHADER)).toBe(true);
    });

    it('should have correct UUID', () => {
      expect(BUILT_IN_PBR_SHADER.uuid).toBe(BUILT_IN_SHADER_IDS.PBR);
    });

    it('should be named PBR', () => {
      expect(BUILT_IN_PBR_SHADER.name).toBe('PBR');
    });

    it('should be marked as built-in', () => {
      expect(BUILT_IN_PBR_SHADER.isBuiltIn).toBe(true);
    });

    it('should have vertex source containing PBR-specific code', () => {
      expect(BUILT_IN_PBR_SHADER.vertexSource).toContain('#version 300 es');
      expect(BUILT_IN_PBR_SHADER.vertexSource).toContain('uNormalMatrix');
    });

    it('should have fragment source with Cook-Torrance BRDF', () => {
      expect(BUILT_IN_PBR_SHADER.fragmentSource).toContain('distributionGGX');
      expect(BUILT_IN_PBR_SHADER.fragmentSource).toContain('geometrySmith');
      expect(BUILT_IN_PBR_SHADER.fragmentSource).toContain('fresnelSchlick');
    });

    it('should have material uniforms', () => {
      const uniformNames = BUILT_IN_PBR_SHADER.uniforms.map((u) => u.name);
      expect(uniformNames).toContain('uBaseColor');
      expect(uniformNames).toContain('uMetallic');
      expect(uniformNames).toContain('uRoughness');
      expect(uniformNames).toContain('uEmission');
      expect(uniformNames).toContain('uEmissionStrength');
    });

    it('should have correct uniform types', () => {
      const baseColor = BUILT_IN_PBR_SHADER.uniforms.find((u) => u.name === 'uBaseColor');
      const metallic = BUILT_IN_PBR_SHADER.uniforms.find((u) => u.name === 'uMetallic');

      expect(baseColor?.type).toBe('vec3');
      expect(metallic?.type).toBe('float');
    });

    it('should have correct uniform default values', () => {
      const metallic = BUILT_IN_PBR_SHADER.uniforms.find((u) => u.name === 'uMetallic');
      const roughness = BUILT_IN_PBR_SHADER.uniforms.find((u) => u.name === 'uRoughness');

      expect(metallic?.defaultValue).toBe(0.0);
      expect(roughness?.defaultValue).toBe(0.5);
    });

    it('should have correct uniform UI types', () => {
      const baseColor = BUILT_IN_PBR_SHADER.uniforms.find((u) => u.name === 'uBaseColor');
      const metallic = BUILT_IN_PBR_SHADER.uniforms.find((u) => u.name === 'uMetallic');

      expect(baseColor?.uiType).toBe('color');
      expect(metallic?.uiType).toBe('slider');
    });

    it('should have uniform groups defined', () => {
      const surfaceUniforms = BUILT_IN_PBR_SHADER.uniforms.filter((u) => u.group === 'Surface');
      const emissionUniforms = BUILT_IN_PBR_SHADER.uniforms.filter((u) => u.group === 'Emission');

      expect(surfaceUniforms.length).toBeGreaterThan(0);
      expect(emissionUniforms.length).toBeGreaterThan(0);
    });

    it('should have a description', () => {
      expect(BUILT_IN_PBR_SHADER.description).toBeDefined();
      expect(BUILT_IN_PBR_SHADER.description).toContain('Cook-Torrance');
    });
  });

  describe('BUILT_IN_UNLIT_SHADER', () => {
    it('should be a valid shader asset', () => {
      expect(isShaderAsset(BUILT_IN_UNLIT_SHADER)).toBe(true);
    });

    it('should have correct UUID', () => {
      expect(BUILT_IN_UNLIT_SHADER.uuid).toBe(BUILT_IN_SHADER_IDS.UNLIT);
    });

    it('should be named Unlit', () => {
      expect(BUILT_IN_UNLIT_SHADER.name).toBe('Unlit');
    });

    it('should be marked as built-in', () => {
      expect(BUILT_IN_UNLIT_SHADER.isBuiltIn).toBe(true);
    });

    it('should have vertex source', () => {
      expect(BUILT_IN_UNLIT_SHADER.vertexSource).toContain('#version 300 es');
      expect(BUILT_IN_UNLIT_SHADER.vertexSource).toContain('gl_Position');
    });

    it('should have simple fragment source without lighting', () => {
      expect(BUILT_IN_UNLIT_SHADER.fragmentSource).toContain('#version 300 es');
      expect(BUILT_IN_UNLIT_SHADER.fragmentSource).toContain('outColor');
      expect(BUILT_IN_UNLIT_SHADER.fragmentSource).not.toContain('distributionGGX');
    });

    it('should have color and opacity uniforms', () => {
      const uniformNames = BUILT_IN_UNLIT_SHADER.uniforms.map((u) => u.name);
      expect(uniformNames).toContain('uColor');
      expect(uniformNames).toContain('uOpacity');
    });

    it('should have fewer uniforms than PBR shader', () => {
      expect(BUILT_IN_UNLIT_SHADER.uniforms.length).toBeLessThan(
        BUILT_IN_PBR_SHADER.uniforms.length
      );
    });

    it('should have a description', () => {
      expect(BUILT_IN_UNLIT_SHADER.description).toBeDefined();
      expect(BUILT_IN_UNLIT_SHADER.description).toContain('unlit');
    });
  });

  describe('BUILT_IN_SHADERS array', () => {
    it('should contain all built-in shaders', () => {
      expect(BUILT_IN_SHADERS).toHaveLength(2);
    });

    it('should contain PBR shader', () => {
      expect(BUILT_IN_SHADERS).toContain(BUILT_IN_PBR_SHADER);
    });

    it('should contain Unlit shader', () => {
      expect(BUILT_IN_SHADERS).toContain(BUILT_IN_UNLIT_SHADER);
    });

    it('should have all valid shader assets', () => {
      for (const shader of BUILT_IN_SHADERS) {
        expect(isShaderAsset(shader)).toBe(true);
      }
    });
  });

  describe('isBuiltInShaderUUID', () => {
    it('should return true for PBR shader UUID', () => {
      expect(isBuiltInShaderUUID(BUILT_IN_SHADER_IDS.PBR)).toBe(true);
    });

    it('should return true for Unlit shader UUID', () => {
      expect(isBuiltInShaderUUID(BUILT_IN_SHADER_IDS.UNLIT)).toBe(true);
    });

    it('should return false for custom UUID', () => {
      expect(isBuiltInShaderUUID('custom-shader-uuid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isBuiltInShaderUUID('')).toBe(false);
    });

    it('should return false for partial match', () => {
      expect(isBuiltInShaderUUID('built-in-shader')).toBe(false);
    });
  });
});
