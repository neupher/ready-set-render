/**
 * EntitySerializer - Scene-level entity serialization and deserialization
 *
 * Provides factory methods for creating entities from serialized data and
 * serializing scenes to JSON. Handles the mapping between entity types
 * and their concrete classes.
 *
 * @example
 * ```typescript
 * // Serialize a scene
 * const entities = sceneGraph.getEntities();
 * const serialized = entities.map(e => EntitySerializer.serializeEntity(e));
 *
 * // Deserialize a scene
 * const entities = serializedData.map(data => EntitySerializer.deserializeEntity(data));
 * ```
 */

import type { IEntity } from '@core/interfaces';
import type {
  ISerializedEntity,
  SerializedEntityType,
} from '@core/assets/interfaces/ISceneAsset';
import { Cube } from '@plugins/primitives/Cube';
import { Sphere } from '@plugins/primitives/Sphere';
import { DirectionalLight } from '@plugins/lights/DirectionalLight';
import { CameraEntity } from '@core/CameraEntity';

/**
 * Entity factory function type.
 * Creates an entity from serialized data.
 */
type EntityFactory = (data: ISerializedEntity) => IEntity;

/**
 * Registry of entity factories by type.
 */
const entityFactories: Map<SerializedEntityType, EntityFactory> = new Map();

/**
 * Register a factory for creating entities of a specific type.
 *
 * @param type - The entity type identifier
 * @param factory - Factory function that creates the entity
 */
export function registerEntityFactory(
  type: SerializedEntityType,
  factory: EntityFactory
): void {
  entityFactories.set(type, factory);
}

/**
 * Initialize default entity factories.
 * Called once at module load time.
 */
function initializeDefaultFactories(): void {
  // Cube factory
  registerEntityFactory('Cube', (data: ISerializedEntity): IEntity => {
    const cube = new Cube(data.uuid, data.name);
    cube.fromJSON(data);
    return cube;
  });

  // Sphere factory
  registerEntityFactory('Sphere', (data: ISerializedEntity): IEntity => {
    // Extract sphere-specific parameters from metadata
    const segments = (data.metadata?.segments as number) ?? 32;
    const rings = (data.metadata?.rings as number) ?? 16;
    const radius = (data.metadata?.radius as number) ?? 0.5;

    const sphere = new Sphere(data.uuid, data.name, { segments, rings, radius });
    sphere.fromJSON(data);
    return sphere;
  });

  // DirectionalLight factory
  registerEntityFactory('DirectionalLight', (data: ISerializedEntity): IEntity => {
    const light = new DirectionalLight({ name: data.name });
    // Override the auto-generated ID with the serialized one
    (light as unknown as { id: string }).id = data.uuid;
    light.fromJSON(data);
    return light;
  });

  // Camera factory
  registerEntityFactory('Camera', (data: ISerializedEntity): IEntity => {
    const camera = new CameraEntity({ id: data.uuid, name: data.name });
    camera.fromJSON(data);
    return camera;
  });
}

// Initialize factories on module load
initializeDefaultFactories();

/**
 * EntitySerializer provides static methods for serializing and deserializing entities.
 */
export class EntitySerializer {
  /**
   * Serialize an entity to JSON-compatible format.
   *
   * @param entity - The entity to serialize
   * @returns Serialized entity data
   * @throws Error if entity doesn't implement ISerializable
   */
  static serializeEntity(entity: IEntity): ISerializedEntity {
    // Check if entity has toJSON method (implements ISerializable)
    const serializable = entity as unknown as { toJSON?: () => ISerializedEntity };
    if (typeof serializable.toJSON !== 'function') {
      throw new Error(
        `Entity "${entity.name}" (${entity.id}) does not implement ISerializable`
      );
    }

    return serializable.toJSON();
  }

  /**
   * Deserialize an entity from JSON data.
   *
   * @param data - The serialized entity data
   * @returns A new entity instance
   * @throws Error if entity type is unknown
   */
  static deserializeEntity(data: ISerializedEntity): IEntity {
    const factory = entityFactories.get(data.type);

    if (!factory) {
      throw new Error(`Unknown entity type: "${data.type}"`);
    }

    return factory(data);
  }

  /**
   * Serialize multiple entities preserving hierarchy information.
   *
   * @param entities - Array of entities to serialize
   * @returns Array of serialized entity data
   */
  static serializeEntities(entities: IEntity[]): ISerializedEntity[] {
    return entities.map((entity) => this.serializeEntity(entity));
  }

  /**
   * Deserialize multiple entities and reconstruct hierarchy.
   *
   * @param dataArray - Array of serialized entity data
   * @returns Array of deserialized entities with parent references set
   */
  static deserializeEntities(dataArray: ISerializedEntity[]): IEntity[] {
    // First pass: create all entities
    const entityMap = new Map<string, IEntity>();
    const entities: IEntity[] = [];

    for (const data of dataArray) {
      const entity = this.deserializeEntity(data);
      entityMap.set(data.uuid, entity);
      entities.push(entity);
    }

    // Second pass: reconstruct hierarchy
    for (let i = 0; i < dataArray.length; i++) {
      const data = dataArray[i];
      const entity = entities[i];

      if (data.parentUuid) {
        const parent = entityMap.get(data.parentUuid);
        if (parent) {
          entity.parent = parent;
          // Also add to parent's children if it has a children array
          if (Array.isArray(parent.children)) {
            parent.children.push(entity);
          }
        }
      }
    }

    return entities;
  }

  /**
   * Check if an entity type is supported for serialization.
   *
   * @param type - The entity type to check
   * @returns True if the type has a registered factory
   */
  static isTypeSupported(type: string): type is SerializedEntityType {
    return entityFactories.has(type as SerializedEntityType);
  }

  /**
   * Get all supported entity types.
   *
   * @returns Array of supported entity type identifiers
   */
  static getSupportedTypes(): SerializedEntityType[] {
    return Array.from(entityFactories.keys());
  }
}
