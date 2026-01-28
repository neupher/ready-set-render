/**
 * ISerializable - Interface for objects that can be serialized to/from JSON
 *
 * All assets and entities that need persistence must implement this interface.
 * The generic type T represents the JSON schema for the serialized form.
 *
 * @example
 * ```typescript
 * class Cube implements ISerializable<ICubeJSON> {
 *   toJSON(): ICubeJSON {
 *     return { type: 'cube', size: this.size };
 *   }
 *
 *   fromJSON(data: ICubeJSON): void {
 *     this.size = data.size;
 *   }
 * }
 * ```
 */

/**
 * Interface for objects that can be serialized to and deserialized from JSON.
 *
 * @template T - The JSON schema type for the serialized form
 */
export interface ISerializable<T> {
  /**
   * Serialize this object to a JSON-compatible structure.
   *
   * @returns The serialized representation of this object
   */
  toJSON(): T;

  /**
   * Deserialize data from JSON into this object.
   * This method mutates the current instance.
   *
   * @param data - The serialized data to load
   */
  fromJSON(data: T): void;
}
