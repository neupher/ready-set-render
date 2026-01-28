/**
 * UUID Utilities
 *
 * Provides UUID generation for asset identification.
 *
 * @example
 * ```typescript
 * import { generateUUID } from './uuid';
 *
 * const id = generateUUID(); // 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
 * ```
 */

/**
 * Generate a UUID v4.
 *
 * Uses crypto.randomUUID when available (modern browsers),
 * falls back to manual generation for older environments.
 *
 * @returns A UUID v4 string
 */
export function generateUUID(): string {
  // Use native crypto.randomUUID if available (modern browsers, Node 14.17+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: Manual UUID v4 generation
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where x is any hex digit and y is one of 8, 9, a, or b
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validate a UUID string format.
 *
 * @param uuid - The string to validate
 * @returns True if the string is a valid UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
