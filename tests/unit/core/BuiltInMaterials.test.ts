/**
 * BuiltInMaterials Tests
 *
 * Tests for built-in material definitions and utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  BUILT_IN_MATERIAL_IDS,
  BUILT_IN_DEFAULT_PBR_MATERIAL,
  BUILT_IN_MATERIALS,
  isBuiltInMaterialUUID,
} from '../../../src/core/assets/BuiltInMaterials';
import { BUILT_IN_SHADER_IDS } from '../../../src/core/assets/BuiltInShaders';
import { isMaterialAsset } from '../../../src/core/assets/interfaces';

describe('BuiltInMaterials', () => {
  describe('BUILT_IN_MATERIAL_IDS', () => {
    it('should have Default PBR material ID', () => {
      expect(BUILT_IN_MATERIAL_IDS.DEFAULT_PBR).toBe('built-in-material-default-pbr');
    });
  });

  describe('BUILT_IN_DEFAULT_PBR_MATERIAL', () => {
    it('should be a valid material asset', () => {
      expect(isMaterialAsset(BUILT_IN_DEFAULT_PBR_MATERIAL)).toBe(true);
    });

    it('should have correct UUID', () => {
      expect(BUILT_IN_DEFAULT_PBR_MATERIAL.uuid).toBe(BUILT_IN_MATERIAL_IDS.DEFAULT_PBR);
    });

    it('should be named Default PBR', () => {
      expect(BUILT_IN_DEFAULT_PBR_MATERIAL.name).toBe('Default PBR');
    });

    it('should be marked as built-in', () => {
      expect(BUILT_IN_DEFAULT_PBR_MATERIAL.isBuiltIn).toBe(true);
    });

    it('should have type material', () => {
      expect(BUILT_IN_DEFAULT_PBR_MATERIAL.type).toBe('material');
    });

    it('should reference the built-in PBR shader', () => {
      expect(BUILT_IN_DEFAULT_PBR_MATERIAL.shaderRef.uuid).toBe(BUILT_IN_SHADER_IDS.PBR);
      expect(BUILT_IN_DEFAULT_PBR_MATERIAL.shaderRef.type).toBe('shader');
    });

    it('should have default PBR parameters', () => {
      const params = BUILT_IN_DEFAULT_PBR_MATERIAL.parameters;

      expect(params.uBaseColor).toEqual([0.8, 0.8, 0.8]); // Gray
      expect(params.uMetallic).toBe(0.0); // Dielectric
      expect(params.uRoughness).toBe(0.5); // Medium roughness
      expect(params.uEmission).toEqual([0.0, 0.0, 0.0]); // No emission
      expect(params.uEmissionStrength).toBe(0.0); // No emission strength
    });

    it('should have a description', () => {
      expect(BUILT_IN_DEFAULT_PBR_MATERIAL.description).toBeDefined();
      expect(BUILT_IN_DEFAULT_PBR_MATERIAL.description).toContain('Default PBR');
    });

    it('should have version 1', () => {
      expect(BUILT_IN_DEFAULT_PBR_MATERIAL.version).toBe(1);
    });

    it('should have created timestamp', () => {
      expect(BUILT_IN_DEFAULT_PBR_MATERIAL.created).toBeDefined();
      expect(typeof BUILT_IN_DEFAULT_PBR_MATERIAL.created).toBe('string');
    });

    it('should have modified timestamp', () => {
      expect(BUILT_IN_DEFAULT_PBR_MATERIAL.modified).toBeDefined();
      expect(typeof BUILT_IN_DEFAULT_PBR_MATERIAL.modified).toBe('string');
    });
  });

  describe('BUILT_IN_MATERIALS array', () => {
    it('should contain all built-in materials', () => {
      expect(BUILT_IN_MATERIALS).toHaveLength(1);
    });

    it('should contain Default PBR material', () => {
      expect(BUILT_IN_MATERIALS).toContain(BUILT_IN_DEFAULT_PBR_MATERIAL);
    });

    it('should have all valid material assets', () => {
      for (const material of BUILT_IN_MATERIALS) {
        expect(isMaterialAsset(material)).toBe(true);
      }
    });

    it('should have all materials marked as built-in', () => {
      for (const material of BUILT_IN_MATERIALS) {
        expect(material.isBuiltIn).toBe(true);
      }
    });
  });

  describe('isBuiltInMaterialUUID', () => {
    it('should return true for Default PBR material UUID', () => {
      expect(isBuiltInMaterialUUID(BUILT_IN_MATERIAL_IDS.DEFAULT_PBR)).toBe(true);
    });

    it('should return false for custom UUID', () => {
      expect(isBuiltInMaterialUUID('custom-material-uuid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isBuiltInMaterialUUID('')).toBe(false);
    });

    it('should return false for partial match', () => {
      expect(isBuiltInMaterialUUID('built-in-material')).toBe(false);
    });

    it('should return false for shader UUID (different asset type)', () => {
      expect(isBuiltInMaterialUUID(BUILT_IN_SHADER_IDS.PBR)).toBe(false);
    });
  });
});
