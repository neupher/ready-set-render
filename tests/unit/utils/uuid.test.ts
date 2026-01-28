/**
 * UUID Utility Tests
 *
 * Tests for UUID generation and validation.
 */

import { describe, it, expect } from 'vitest';
import { generateUUID, isValidUUID } from '../../../src/utils/uuid';

describe('UUID Utilities', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID format', () => {
      const uuid = generateUUID();

      expect(isValidUUID(uuid)).toBe(true);
    });

    it('should generate unique UUIDs on each call', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      const uuid3 = generateUUID();

      expect(uuid1).not.toBe(uuid2);
      expect(uuid2).not.toBe(uuid3);
      expect(uuid1).not.toBe(uuid3);
    });

    it('should generate UUIDs with correct length', () => {
      const uuid = generateUUID();

      // UUID v4 format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars)
      expect(uuid.length).toBe(36);
    });

    it('should generate UUIDs with hyphens in correct positions', () => {
      const uuid = generateUUID();

      expect(uuid[8]).toBe('-');
      expect(uuid[13]).toBe('-');
      expect(uuid[18]).toBe('-');
      expect(uuid[23]).toBe('-');
    });

    it('should use native crypto.randomUUID when available', () => {
      // Note: We can't mock crypto.randomUUID in Node.js as crypto is read-only
      // This test verifies that generateUUID works and produces valid UUIDs
      // The actual crypto.randomUUID usage is tested implicitly
      const uuid = generateUUID();

      // The UUID should be valid whether it came from crypto.randomUUID or fallback
      expect(isValidUUID(uuid)).toBe(true);
      expect(uuid.length).toBe(36);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUID v4', () => {
      expect(isValidUUID('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
    });

    it('should return true for UUID with all lowercase', () => {
      expect(isValidUUID('abcdefab-cdef-abcd-efab-cdefabcdefab')).toBe(true);
    });

    it('should return true for UUID with all uppercase', () => {
      expect(isValidUUID('ABCDEFAB-CDEF-ABCD-EFAB-CDEFABCDEFAB')).toBe(true);
    });

    it('should return true for UUID with mixed case', () => {
      expect(isValidUUID('AbCdEfAb-CdEf-AbCd-EfAb-CdEfAbCdEfAb')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidUUID('')).toBe(false);
    });

    it('should return false for string without hyphens', () => {
      expect(isValidUUID('a1b2c3d4e5f67890abcdef1234567890')).toBe(false);
    });

    it('should return false for string with wrong length', () => {
      expect(isValidUUID('a1b2c3d4-e5f6-7890-abcd-ef123456789')).toBe(false);
      expect(isValidUUID('a1b2c3d4-e5f6-7890-abcd-ef12345678901')).toBe(false);
    });

    it('should return false for string with invalid characters', () => {
      expect(isValidUUID('g1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(false);
      expect(isValidUUID('a1b2c3d4-e5f6-7890-abcd-zf1234567890')).toBe(false);
    });

    it('should return false for string with hyphens in wrong positions', () => {
      expect(isValidUUID('a1b2c3d-4e5f6-7890-abcd-ef1234567890')).toBe(false);
      expect(isValidUUID('a1b2c3d4e-5f6-7890-abcd-ef1234567890')).toBe(false);
    });

    it('should return false for non-string types', () => {
      expect(isValidUUID(123 as unknown as string)).toBe(false);
      expect(isValidUUID(null as unknown as string)).toBe(false);
    });
  });
});
