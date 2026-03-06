/**
 * SourceHashService Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SourceHashService } from '../../../src/core/assets/SourceHashService';

describe('SourceHashService', () => {
  let service: SourceHashService;

  beforeEach(() => {
    service = new SourceHashService();
  });

  describe('computeQuickHash', () => {
    it('should compute hash from file size and lastModified', () => {
      const file = new File(['test content'], 'test.txt');
      const hash = service.computeQuickHash(file);

      expect(hash).toMatch(/^size:\d+:mtime:\d+$/);
      expect(hash).toContain(`size:${file.size}`);
      expect(hash).toContain(`mtime:${file.lastModified}`);
    });

    it('should produce different hashes for different files', () => {
      const file1 = new File(['content 1'], 'file1.txt');
      const file2 = new File(['different content'], 'file2.txt');

      const hash1 = service.computeQuickHash(file1);
      const hash2 = service.computeQuickHash(file2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('computeContentHash', () => {
    it('should compute SHA-256 hash of file content', async () => {
      // Create a mock file with arrayBuffer method
      const content = 'test content';
      const blob = new Blob([content]);
      const file = new File([blob], 'test.txt');

      // Skip if arrayBuffer is not available in test environment
      if (typeof file.arrayBuffer !== 'function') {
        console.log('Skipping test: File.arrayBuffer not available in test environment');
        return;
      }

      const hash = await service.computeContentHash(file);
      expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('should produce same hash for identical content', async () => {
      const blob1 = new Blob(['identical content']);
      const blob2 = new Blob(['identical content']);
      const file1 = new File([blob1], 'file1.txt');
      const file2 = new File([blob2], 'file2.txt');

      // Skip if arrayBuffer is not available in test environment
      if (typeof file1.arrayBuffer !== 'function') {
        console.log('Skipping test: File.arrayBuffer not available in test environment');
        return;
      }

      const hash1 = await service.computeContentHash(file1);
      const hash2 = await service.computeContentHash(file2);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different content', async () => {
      const blob1 = new Blob(['content 1']);
      const blob2 = new Blob(['content 2']);
      const file1 = new File([blob1], 'file1.txt');
      const file2 = new File([blob2], 'file2.txt');

      // Skip if arrayBuffer is not available in test environment
      if (typeof file1.arrayBuffer !== 'function') {
        console.log('Skipping test: File.arrayBuffer not available in test environment');
        return;
      }

      const hash1 = await service.computeContentHash(file1);
      const hash2 = await service.computeContentHash(file2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('computeHash', () => {
    it('should default to quick hash', async () => {
      const file = new File(['test'], 'test.txt');
      const hash = await service.computeHash(file);

      expect(hash).toMatch(/^size:\d+:mtime:\d+$/);
    });

    it('should compute SHA-256 when specified', async () => {
      const blob = new Blob(['test']);
      const file = new File([blob], 'test.txt');

      // Skip if arrayBuffer is not available in test environment
      if (typeof file.arrayBuffer !== 'function') {
        console.log('Skipping test: File.arrayBuffer not available in test environment');
        return;
      }

      const hash = await service.computeHash(file, 'sha256');
      expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });

  describe('parseHash', () => {
    it('should parse quick hash format', () => {
      const parsed = service.parseHash('size:1234:mtime:1709564400000');

      expect(parsed.format).toBe('quick');
      expect(parsed.size).toBe(1234);
      expect(parsed.mtime).toBe(1709564400000);
    });

    it('should parse SHA-256 hash format', () => {
      const hash = 'sha256:' + 'a'.repeat(64);
      const parsed = service.parseHash(hash);

      expect(parsed.format).toBe('sha256');
      expect(parsed.sha256).toBe('a'.repeat(64));
    });

    it('should treat unknown format as SHA-256', () => {
      const hash = 'abcdef123456';
      const parsed = service.parseHash(hash);

      expect(parsed.format).toBe('sha256');
      expect(parsed.sha256).toBe(hash);
    });
  });

  describe('hasChanged', () => {
    it('should return false for identical hashes', () => {
      const hash = 'size:100:mtime:1234567890';
      expect(service.hasChanged(hash, hash)).toBe(false);
    });

    it('should return true for different hashes', () => {
      const hash1 = 'size:100:mtime:1234567890';
      const hash2 = 'size:200:mtime:1234567890';
      expect(service.hasChanged(hash1, hash2)).toBe(true);
    });
  });

  describe('hasFileChanged', () => {
    it('should detect unchanged file with quick hash', async () => {
      const file = new File(['test content'], 'test.txt');
      const storedHash = service.computeQuickHash(file);

      const changed = await service.hasFileChanged(file, storedHash);
      expect(changed).toBe(false);
    });

    it('should detect changed file when content differs', async () => {
      const storedHash = 'size:5:mtime:1234567890';
      const file = new File(['different content'], 'test.txt');

      const changed = await service.hasFileChanged(file, storedHash);
      expect(changed).toBe(true);
    });

    it('should use correct format based on stored hash', async () => {
      const blob = new Blob(['test']);
      const file = new File([blob], 'test.txt');

      // Skip if arrayBuffer is not available in test environment
      if (typeof file.arrayBuffer !== 'function') {
        console.log('Skipping test: File.arrayBuffer not available in test environment');
        return;
      }

      const sha256Hash = await service.computeContentHash(file);
      const changed = await service.hasFileChanged(file, sha256Hash);
      expect(changed).toBe(false);
    });
  });

  describe('createEmptyHash', () => {
    it('should create an invalid hash that triggers reimport', () => {
      const hash = service.createEmptyHash();
      expect(hash).toBe('size:0:mtime:0');
    });
  });

  describe('isValidHash', () => {
    it('should return true for valid quick hash', () => {
      expect(service.isValidHash('size:100:mtime:1234567890')).toBe(true);
    });

    it('should return true for valid SHA-256 hash', () => {
      expect(service.isValidHash('sha256:' + 'a'.repeat(64))).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(service.isValidHash('')).toBe(false);
    });

    it('should return false for empty hash', () => {
      expect(service.isValidHash('size:0:mtime:0')).toBe(false);
    });

    it('should return false for malformed quick hash', () => {
      expect(service.isValidHash('size:abc:mtime:123')).toBe(false);
    });

    it('should return false for truncated SHA-256', () => {
      expect(service.isValidHash('sha256:abc123')).toBe(false);
    });
  });
});
