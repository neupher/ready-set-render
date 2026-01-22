/**
 * Transform Utilities Tests
 *
 * Unit tests for the matrix math functions.
 */

import { describe, it, expect } from 'vitest';
import {
  mat4Identity,
  mat4Perspective,
  mat4LookAt,
  mat4Multiply,
  mat4Translation,
  mat4Scale,
  mat4RotationX,
  mat4RotationY,
  mat4RotationZ,
  degToRad,
  radToDeg,
} from '@utils/math/transforms';

describe('Transform Utilities', () => {
  describe('mat4Identity', () => {
    it('should create a 4x4 identity matrix', () => {
      const identity = mat4Identity();

      expect(identity).toBeInstanceOf(Float32Array);
      expect(identity.length).toBe(16);

      // Check diagonal elements are 1
      expect(identity[0]).toBe(1);
      expect(identity[5]).toBe(1);
      expect(identity[10]).toBe(1);
      expect(identity[15]).toBe(1);

      // Check off-diagonal elements are 0
      expect(identity[1]).toBe(0);
      expect(identity[2]).toBe(0);
      expect(identity[4]).toBe(0);
      expect(identity[8]).toBe(0);
    });

    it('should create a new matrix each time', () => {
      const a = mat4Identity();
      const b = mat4Identity();

      expect(a).not.toBe(b);
    });
  });

  describe('mat4Perspective', () => {
    it('should create a perspective projection matrix', () => {
      const fov = degToRad(90);
      const aspect = 16 / 9;
      const near = 0.1;
      const far = 100;

      const perspective = mat4Perspective(fov, aspect, near, far);

      expect(perspective).toBeInstanceOf(Float32Array);
      expect(perspective.length).toBe(16);

      // Check key elements
      expect(perspective[0]).toBeCloseTo(1 / (Math.tan(fov / 2) * aspect));
      expect(perspective[5]).toBeCloseTo(1 / Math.tan(fov / 2));
      expect(perspective[11]).toBe(-1);
      expect(perspective[15]).toBe(0);
    });

    it('should handle square aspect ratio', () => {
      const perspective = mat4Perspective(degToRad(60), 1, 0.1, 1000);

      // For square aspect, [0] and [5] should be equal
      expect(perspective[0]).toBeCloseTo(perspective[5]);
    });

    it('should handle different FOV values', () => {
      const narrow = mat4Perspective(degToRad(30), 1, 0.1, 100);
      const wide = mat4Perspective(degToRad(120), 1, 0.1, 100);

      // Narrower FOV should have larger scaling
      expect(narrow[5]).toBeGreaterThan(wide[5]);
    });
  });

  describe('mat4LookAt', () => {
    it('should create a view matrix looking along -Z', () => {
      const eye: [number, number, number] = [0, 0, 5];
      const target: [number, number, number] = [0, 0, 0];
      const up: [number, number, number] = [0, 1, 0];

      const view = mat4LookAt(eye, target, up);

      expect(view).toBeInstanceOf(Float32Array);
      expect(view.length).toBe(16);

      // Translation should move eye to origin
      expect(view[14]).toBeCloseTo(-5);
    });

    it('should handle looking along +X axis', () => {
      const eye: [number, number, number] = [0, 0, 0];
      const target: [number, number, number] = [1, 0, 0];
      const up: [number, number, number] = [0, 1, 0];

      const view = mat4LookAt(eye, target, up);

      expect(view).toBeInstanceOf(Float32Array);
      // The matrix should rotate scene so +X becomes -Z
    });

    it('should work with arbitrary positions', () => {
      const eye: [number, number, number] = [3, 4, 5];
      const target: [number, number, number] = [0, 1, 0];
      const up: [number, number, number] = [0, 1, 0];

      const view = mat4LookAt(eye, target, up);

      expect(view).toBeInstanceOf(Float32Array);
      expect(view.length).toBe(16);
    });
  });

  describe('mat4Multiply', () => {
    it('should multiply identity matrices correctly', () => {
      const a = mat4Identity();
      const b = mat4Identity();
      const result = mat4Multiply(a, b);

      // Identity * Identity = Identity
      for (let i = 0; i < 16; i++) {
        expect(result[i]).toBeCloseTo(a[i]);
      }
    });

    it('should preserve left operand when multiplying by identity on right', () => {
      const translation = mat4Translation(1, 2, 3);
      const identity = mat4Identity();
      const result = mat4Multiply(translation, identity);

      for (let i = 0; i < 16; i++) {
        expect(result[i]).toBeCloseTo(translation[i]);
      }
    });

    it('should preserve right operand when multiplying by identity on left', () => {
      const scale = mat4Scale(2, 3, 4);
      const identity = mat4Identity();
      const result = mat4Multiply(identity, scale);

      for (let i = 0; i < 16; i++) {
        expect(result[i]).toBeCloseTo(scale[i]);
      }
    });

    it('should combine translations correctly', () => {
      const t1 = mat4Translation(1, 0, 0);
      const t2 = mat4Translation(0, 2, 0);
      const result = mat4Multiply(t1, t2);

      // Combined translation should be (1, 2, 0)
      expect(result[12]).toBeCloseTo(1);
      expect(result[13]).toBeCloseTo(2);
      expect(result[14]).toBeCloseTo(0);
    });

    it('should be non-commutative', () => {
      const rotation = mat4RotationY(degToRad(90));
      const translation = mat4Translation(1, 0, 0);

      const rotThenTrans = mat4Multiply(rotation, translation);
      const transThenRot = mat4Multiply(translation, rotation);

      // Results should be different
      let areDifferent = false;
      for (let i = 0; i < 16; i++) {
        if (Math.abs(rotThenTrans[i] - transThenRot[i]) > 0.0001) {
          areDifferent = true;
          break;
        }
      }
      expect(areDifferent).toBe(true);
    });
  });

  describe('mat4Translation', () => {
    it('should create a translation matrix', () => {
      const translation = mat4Translation(5, -3, 2);

      expect(translation).toBeInstanceOf(Float32Array);
      expect(translation.length).toBe(16);

      // Translation values should be in column 4 (indices 12, 13, 14)
      expect(translation[12]).toBe(5);
      expect(translation[13]).toBe(-3);
      expect(translation[14]).toBe(2);
      expect(translation[15]).toBe(1);

      // Diagonal should be 1
      expect(translation[0]).toBe(1);
      expect(translation[5]).toBe(1);
      expect(translation[10]).toBe(1);
    });

    it('should handle zero translation', () => {
      const translation = mat4Translation(0, 0, 0);
      const identity = mat4Identity();

      for (let i = 0; i < 16; i++) {
        expect(translation[i]).toBe(identity[i]);
      }
    });
  });

  describe('mat4Scale', () => {
    it('should create a scale matrix', () => {
      const scale = mat4Scale(2, 3, 4);

      expect(scale).toBeInstanceOf(Float32Array);
      expect(scale.length).toBe(16);

      // Scale values should be on diagonal
      expect(scale[0]).toBe(2);
      expect(scale[5]).toBe(3);
      expect(scale[10]).toBe(4);
      expect(scale[15]).toBe(1);
    });

    it('should handle uniform scale', () => {
      const scale = mat4Scale(5, 5, 5);

      expect(scale[0]).toBe(5);
      expect(scale[5]).toBe(5);
      expect(scale[10]).toBe(5);
    });

    it('should handle unit scale', () => {
      const scale = mat4Scale(1, 1, 1);
      const identity = mat4Identity();

      for (let i = 0; i < 16; i++) {
        expect(scale[i]).toBe(identity[i]);
      }
    });
  });

  describe('mat4RotationX', () => {
    it('should rotate around X axis', () => {
      const rotation = mat4RotationX(degToRad(90));

      expect(rotation).toBeInstanceOf(Float32Array);
      expect(rotation.length).toBe(16);

      // X axis should be unchanged
      expect(rotation[0]).toBeCloseTo(1);

      // Y becomes Z, Z becomes -Y
      expect(rotation[5]).toBeCloseTo(0);
      expect(rotation[6]).toBeCloseTo(1);
      expect(rotation[9]).toBeCloseTo(-1);
      expect(rotation[10]).toBeCloseTo(0);
    });

    it('should return identity for zero rotation', () => {
      const rotation = mat4RotationX(0);
      const identity = mat4Identity();

      for (let i = 0; i < 16; i++) {
        expect(rotation[i]).toBeCloseTo(identity[i]);
      }
    });

    it('should return identity for full rotation', () => {
      const rotation = mat4RotationX(degToRad(360));
      const identity = mat4Identity();

      for (let i = 0; i < 16; i++) {
        expect(rotation[i]).toBeCloseTo(identity[i]);
      }
    });
  });

  describe('mat4RotationY', () => {
    it('should rotate around Y axis', () => {
      const rotation = mat4RotationY(degToRad(90));

      // Y axis should be unchanged
      expect(rotation[5]).toBeCloseTo(1);

      // X becomes -Z, Z becomes X
      expect(rotation[0]).toBeCloseTo(0);
      expect(rotation[8]).toBeCloseTo(1);
      expect(rotation[2]).toBeCloseTo(-1);
      expect(rotation[10]).toBeCloseTo(0);
    });

    it('should return identity for zero rotation', () => {
      const rotation = mat4RotationY(0);
      const identity = mat4Identity();

      for (let i = 0; i < 16; i++) {
        expect(rotation[i]).toBeCloseTo(identity[i]);
      }
    });
  });

  describe('mat4RotationZ', () => {
    it('should rotate around Z axis', () => {
      const rotation = mat4RotationZ(degToRad(90));

      // Z axis should be unchanged
      expect(rotation[10]).toBeCloseTo(1);

      // X becomes Y, Y becomes -X
      expect(rotation[0]).toBeCloseTo(0);
      expect(rotation[1]).toBeCloseTo(1);
      expect(rotation[4]).toBeCloseTo(-1);
      expect(rotation[5]).toBeCloseTo(0);
    });

    it('should return identity for zero rotation', () => {
      const rotation = mat4RotationZ(0);
      const identity = mat4Identity();

      for (let i = 0; i < 16; i++) {
        expect(rotation[i]).toBeCloseTo(identity[i]);
      }
    });
  });

  describe('degToRad', () => {
    it('should convert 0 degrees to 0 radians', () => {
      expect(degToRad(0)).toBe(0);
    });

    it('should convert 90 degrees to PI/2 radians', () => {
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
    });

    it('should convert 180 degrees to PI radians', () => {
      expect(degToRad(180)).toBeCloseTo(Math.PI);
    });

    it('should convert 360 degrees to 2*PI radians', () => {
      expect(degToRad(360)).toBeCloseTo(Math.PI * 2);
    });

    it('should handle negative degrees', () => {
      expect(degToRad(-90)).toBeCloseTo(-Math.PI / 2);
    });
  });

  describe('radToDeg', () => {
    it('should convert 0 radians to 0 degrees', () => {
      expect(radToDeg(0)).toBe(0);
    });

    it('should convert PI/2 radians to 90 degrees', () => {
      expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
    });

    it('should convert PI radians to 180 degrees', () => {
      expect(radToDeg(Math.PI)).toBeCloseTo(180);
    });

    it('should convert 2*PI radians to 360 degrees', () => {
      expect(radToDeg(Math.PI * 2)).toBeCloseTo(360);
    });

    it('should be inverse of degToRad', () => {
      const original = 45;
      const result = radToDeg(degToRad(original));
      expect(result).toBeCloseTo(original);
    });
  });
});
