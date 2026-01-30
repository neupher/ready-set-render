/**
 * IMaterialAsset Tests
 *
 * Tests for material asset interfaces and type guards.
 */

import { describe, it, expect } from 'vitest';
import {
  isMaterialAsset,
  type IMaterialAsset,
} from '../../../src/core/assets/interfaces/IMaterialAsset';

describe('IMaterialAsset', () => {
  /**
   * Create a valid material asset for testing.
   */
  function createValidMaterialAsset(): IMaterialAsset {
    return {
      uuid: 'test-material-uuid',
      name: 'Test Material',
      type: 'material',
      version: 1,
      created: '2026-01-28T12:00:00Z',
      modified: '2026-01-28T12:00:00Z',
      isBuiltIn: false,
      shaderRef: {
        uuid: 'test-shader-uuid',
        type: 'shader',
      },
      parameters: {
        uBaseColor: [0.8, 0.8, 0.8],
        uMetallic: 0.0,
        uRoughness: 0.5,
      },
    };
  }

  describe('isMaterialAsset', () => {
    it('should return true for valid material asset', () => {
      const material = createValidMaterialAsset();

      expect(isMaterialAsset(material)).toBe(true);
    });

    it('should return true for built-in material asset', () => {
      const material = createValidMaterialAsset();
      (material as { isBuiltIn: boolean }).isBuiltIn = true;

      expect(isMaterialAsset(material)).toBe(true);
    });

    it('should return true for material with optional description', () => {
      const material = createValidMaterialAsset();
      material.description = 'A test material';

      expect(isMaterialAsset(material)).toBe(true);
    });

    it('should return true for material with empty parameters', () => {
      const material = createValidMaterialAsset();
      material.parameters = {};

      expect(isMaterialAsset(material)).toBe(true);
    });

    it('should return true for material with various parameter types', () => {
      const material = createValidMaterialAsset();
      material.parameters = {
        uFloat: 0.5,
        uVec2: [1.0, 2.0],
        uVec3: [1.0, 2.0, 3.0],
        uVec4: [1.0, 2.0, 3.0, 4.0],
        uBool: true,
        uTexture: null,
      };

      expect(isMaterialAsset(material)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isMaterialAsset(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isMaterialAsset(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isMaterialAsset('not an object')).toBe(false);
      expect(isMaterialAsset(123)).toBe(false);
      expect(isMaterialAsset(true)).toBe(false);
    });

    it('should return false for missing uuid', () => {
      const material = createValidMaterialAsset();
      delete (material as unknown as Record<string, unknown>).uuid;

      expect(isMaterialAsset(material)).toBe(false);
    });

    it('should return false for missing name', () => {
      const material = createValidMaterialAsset();
      delete (material as unknown as Record<string, unknown>).name;

      expect(isMaterialAsset(material)).toBe(false);
    });

    it('should return false for wrong type', () => {
      const material = createValidMaterialAsset();
      (material as unknown as Record<string, unknown>).type = 'shader';

      expect(isMaterialAsset(material)).toBe(false);
    });

    it('should return false for missing version', () => {
      const material = createValidMaterialAsset();
      delete (material as unknown as Record<string, unknown>).version;

      expect(isMaterialAsset(material)).toBe(false);
    });

    it('should return false for missing isBuiltIn', () => {
      const material = createValidMaterialAsset();
      delete (material as unknown as Record<string, unknown>).isBuiltIn;

      expect(isMaterialAsset(material)).toBe(false);
    });

    it('should return false for missing shaderRef', () => {
      const material = createValidMaterialAsset();
      delete (material as unknown as Record<string, unknown>).shaderRef;

      expect(isMaterialAsset(material)).toBe(false);
    });

    it('should return false for null shaderRef', () => {
      const material = createValidMaterialAsset();
      (material as unknown as Record<string, unknown>).shaderRef = null;

      expect(isMaterialAsset(material)).toBe(false);
    });

    it('should return false for shaderRef missing uuid', () => {
      const material = createValidMaterialAsset();
      (material as unknown as Record<string, unknown>).shaderRef = { type: 'shader' };

      expect(isMaterialAsset(material)).toBe(false);
    });

    it('should return false for shaderRef with wrong type', () => {
      const material = createValidMaterialAsset();
      (material as unknown as Record<string, unknown>).shaderRef = {
        uuid: 'test-uuid',
        type: 'material', // Wrong type - should be 'shader'
      };

      expect(isMaterialAsset(material)).toBe(false);
    });

    it('should return false for missing parameters', () => {
      const material = createValidMaterialAsset();
      delete (material as unknown as Record<string, unknown>).parameters;

      expect(isMaterialAsset(material)).toBe(false);
    });

    it('should return false for null parameters', () => {
      const material = createValidMaterialAsset();
      (material as unknown as Record<string, unknown>).parameters = null;

      expect(isMaterialAsset(material)).toBe(false);
    });

    it('should return false for non-object parameters', () => {
      const material = createValidMaterialAsset();
      (material as unknown as Record<string, unknown>).parameters = 'not an object';

      expect(isMaterialAsset(material)).toBe(false);
    });

    it('should return false for array instead of object', () => {
      expect(isMaterialAsset([])).toBe(false);
    });
  });
});
