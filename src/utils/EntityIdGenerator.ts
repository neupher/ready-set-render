/**
 * EntityIdGenerator - Generates unique entity IDs
 *
 * Provides auto-incrementing IDs for entities.
 * IDs are unique per session (not persistent).
 *
 * @example
 * ```typescript
 * const id1 = EntityIdGenerator.next(); // 1
 * const id2 = EntityIdGenerator.next(); // 2
 *
 * // Reset for testing
 * EntityIdGenerator.reset();
 * const id3 = EntityIdGenerator.next(); // 1
 * ```
 */

/**
 * Static class for generating unique entity IDs.
 */
export class EntityIdGenerator {
  private static counter = 0;

  /**
   * Get the next unique entity ID.
   *
   * @returns The next entity ID (1-based)
   */
  static next(): number {
    return ++EntityIdGenerator.counter;
  }

  /**
   * Get the current counter value without incrementing.
   *
   * @returns The current counter value
   */
  static current(): number {
    return EntityIdGenerator.counter;
  }

  /**
   * Reset the counter to 0.
   * Primarily used for testing purposes.
   */
  static reset(): void {
    EntityIdGenerator.counter = 0;
  }
}
