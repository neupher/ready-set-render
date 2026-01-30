/**
 * Serialization Module
 *
 * Provides scene and entity serialization/deserialization functionality.
 *
 * @example
 * ```typescript
 * import { EntitySerializer } from '@core/serialization';
 *
 * // Serialize an entity
 * const data = EntitySerializer.serializeEntity(cube);
 *
 * // Deserialize an entity
 * const entity = EntitySerializer.deserializeEntity(data);
 * ```
 */

export { EntitySerializer, registerEntityFactory } from './EntitySerializer';
