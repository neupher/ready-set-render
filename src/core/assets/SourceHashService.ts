/**
 * SourceHashService - Compute file hashes for change detection
 *
 * Provides simple hash computation for source files to detect changes.
 * Uses a combination of file size and modification time for fast hashing,
 * with optional SHA-256 for content-based hashing.
 *
 * @example
 * ```typescript
 * const hashService = new SourceHashService();
 *
 * // Quick hash (size + mtime)
 * const quickHash = hashService.computeQuickHash(file);
 * // Result: "size:1234567:mtime:1709564400000"
 *
 * // Content hash (SHA-256)
 * const contentHash = await hashService.computeContentHash(file);
 * // Result: "sha256:a1b2c3d4..."
 *
 * // Compare hashes
 * const changed = hashService.hasChanged(storedHash, currentHash);
 * ```
 */

/**
 * Hash format types.
 */
export type HashFormat = 'quick' | 'sha256';

/**
 * Parsed hash components.
 */
export interface ParsedHash {
  format: HashFormat;
  size?: number;
  mtime?: number;
  sha256?: string;
}

/**
 * Service for computing and comparing file hashes.
 */
export class SourceHashService {
  /**
   * Compute a quick hash based on file size and modification time.
   * This is fast but may miss changes if file is modified without size change
   * and mtime is not updated (rare in practice).
   *
   * @param file - The file to hash
   * @returns Hash string in format "size:{bytes}:mtime:{timestamp}"
   */
  computeQuickHash(file: File): string {
    return `size:${file.size}:mtime:${file.lastModified}`;
  }

  /**
   * Compute a SHA-256 content hash.
   * More reliable but slower than quick hash.
   *
   * @param file - The file to hash
   * @returns Hash string in format "sha256:{hex}"
   */
  async computeContentHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `sha256:${hashHex}`;
  }

  /**
   * Compute a hash for a file using the specified format.
   *
   * @param file - The file to hash
   * @param format - Hash format to use (default: 'quick')
   * @returns Hash string
   */
  async computeHash(file: File, format: HashFormat = 'quick'): Promise<string> {
    if (format === 'sha256') {
      return this.computeContentHash(file);
    }
    return this.computeQuickHash(file);
  }

  /**
   * Parse a hash string into its components.
   *
   * @param hash - The hash string to parse
   * @returns Parsed hash components
   */
  parseHash(hash: string): ParsedHash {
    if (hash.startsWith('sha256:')) {
      return {
        format: 'sha256',
        sha256: hash.slice(7),
      };
    }

    if (hash.startsWith('size:')) {
      const parts = hash.split(':');
      return {
        format: 'quick',
        size: parseInt(parts[1], 10),
        mtime: parseInt(parts[3], 10),
      };
    }

    // Unknown format, treat as sha256
    return {
      format: 'sha256',
      sha256: hash,
    };
  }

  /**
   * Check if a file has changed by comparing hashes.
   *
   * @param storedHash - The previously stored hash
   * @param currentHash - The current computed hash
   * @returns True if the file has changed
   */
  hasChanged(storedHash: string, currentHash: string): boolean {
    return storedHash !== currentHash;
  }

  /**
   * Check if a file has changed by computing a new hash and comparing.
   *
   * @param file - The current file
   * @param storedHash - The previously stored hash
   * @returns True if the file has changed
   */
  async hasFileChanged(file: File, storedHash: string): Promise<boolean> {
    // Determine the format of the stored hash
    const parsed = this.parseHash(storedHash);

    // Compute hash using the same format
    const currentHash = await this.computeHash(file, parsed.format);

    return this.hasChanged(storedHash, currentHash);
  }

  /**
   * Create an empty/invalid hash that will always trigger reimport.
   * Useful for forcing reimport.
   *
   * @returns An empty hash string
   */
  createEmptyHash(): string {
    return 'size:0:mtime:0';
  }

  /**
   * Check if a hash is valid (not empty or malformed).
   *
   * @param hash - The hash to check
   * @returns True if the hash is valid
   */
  isValidHash(hash: string): boolean {
    if (!hash || hash.length === 0) {
      return false;
    }

    const parsed = this.parseHash(hash);

    if (parsed.format === 'sha256') {
      return parsed.sha256 !== undefined && parsed.sha256.length === 64;
    }

    if (parsed.format === 'quick') {
      return (
        parsed.size !== undefined &&
        parsed.mtime !== undefined &&
        !isNaN(parsed.size) &&
        !isNaN(parsed.mtime) &&
        parsed.size > 0
      );
    }

    return false;
  }
}
