/**
 * SceneAssetFactory - Factory for creating and managing scene assets
 *
 * Provides CRUD operations for scene assets including:
 * - Creating new scenes from current SceneGraph state
 * - Loading scenes from serialized data
 * - Duplicating scenes
 * - Managing scene metadata
 *
 * @example
 * ```typescript
 * // Create a scene from current SceneGraph
 * const sceneAsset = SceneAssetFactory.createFromSceneGraph(sceneGraph, 'My Scene');
 *
 * // Save to JSON
 * const json = JSON.stringify(sceneAsset);
 *
 * // Load from JSON
 * const loadedScene = SceneAssetFactory.fromJSON(json);
 * ```
 */

import type { IEntity, ISceneObject } from '@core/interfaces';
import { isEntity } from '@core/interfaces/IEntity';
import type { SceneGraph } from '@core/SceneGraph';
import type {
  ISceneAsset,
  ISerializedEntity,
  ISceneSettings,
} from '@core/assets/interfaces/ISceneAsset';
import {
  createDefaultSceneSettings,
  SCENE_ASSET_VERSION,
} from '@core/assets/interfaces/ISceneAsset';
import { EntitySerializer } from '@core/serialization/EntitySerializer';

/**
 * Generate a UUID v4.
 * Uses crypto.randomUUID() for secure random generation.
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Options for creating a new scene.
 */
export interface CreateSceneOptions {
  /** Scene name */
  name: string;
  /** Optional scene description */
  description?: string;
  /** Optional custom scene settings */
  settings?: Partial<ISceneSettings>;
}

/**
 * Factory class for scene asset operations.
 */
export class SceneAssetFactory {
  /**
   * Create a new empty scene asset.
   *
   * @param options - Scene creation options
   * @returns A new empty scene asset
   */
  static create(options: CreateSceneOptions): ISceneAsset {
    const now = new Date().toISOString();

    return {
      uuid: generateUUID(),
      name: options.name,
      type: 'scene',
      version: SCENE_ASSET_VERSION,
      created: now,
      modified: now,
      isBuiltIn: false,
      entities: [],
      settings: {
        ...createDefaultSceneSettings(),
        ...options.settings,
      },
      description: options.description,
    };
  }

  /**
   * Create a scene asset from the current SceneGraph state.
   *
   * @param sceneGraph - The SceneGraph to serialize
   * @param name - Name for the scene asset
   * @param description - Optional description
   * @returns A scene asset containing all serialized entities
   */
  static createFromSceneGraph(
    sceneGraph: SceneGraph,
    name: string,
    description?: string
  ): ISceneAsset {
    const now = new Date().toISOString();

    // Get all objects from scene graph
    const allObjects = sceneGraph.getAllObjects();

    // Filter to only entities (not plain ISceneObject instances)
    const entities: IEntity[] = [];
    for (const obj of allObjects) {
      if (isEntity(obj)) {
        entities.push(obj);
      }
    }

    // Serialize all entities
    const serializedEntities = EntitySerializer.serializeEntities(entities);

    return {
      uuid: generateUUID(),
      name,
      type: 'scene',
      version: SCENE_ASSET_VERSION,
      created: now,
      modified: now,
      isBuiltIn: false,
      entities: serializedEntities,
      settings: createDefaultSceneSettings(),
      description,
    };
  }

  /**
   * Load entities from a scene asset into a SceneGraph.
   *
   * @param scene - The scene asset to load
   * @param sceneGraph - The SceneGraph to populate
   * @param clearFirst - Whether to clear the scene graph before loading (default: true)
   * @returns Array of loaded entities
   */
  static loadIntoSceneGraph(
    scene: ISceneAsset,
    sceneGraph: SceneGraph,
    clearFirst: boolean = true
  ): IEntity[] {
    if (clearFirst) {
      // Clear the scene graph
      sceneGraph.clear();
    }

    // Deserialize entities
    const entities = EntitySerializer.deserializeEntities(scene.entities);

    // Add to scene graph (root entities only, children are added via parent reference)
    for (const entity of entities) {
      if (!entity.parent) {
        sceneGraph.add(entity as ISceneObject);
      }
    }

    return entities;
  }

  /**
   * Duplicate a scene asset with a new UUID.
   *
   * @param scene - The scene to duplicate
   * @param newName - Optional new name (defaults to "Copy of [original name]")
   * @returns A new scene asset with duplicated data
   */
  static duplicate(scene: ISceneAsset, newName?: string): ISceneAsset {
    const now = new Date().toISOString();

    // Deep clone entities with new UUIDs
    const clonedEntities = scene.entities.map(
      (entity): ISerializedEntity => ({
        ...entity,
        uuid: generateUUID(),
        // Clear parent UUID since we're making a fresh copy
        parentUuid: undefined,
        components: entity.components.map((c) => ({ ...c })),
        metadata: entity.metadata ? { ...entity.metadata } : undefined,
      })
    );

    return {
      uuid: generateUUID(),
      name: newName ?? `Copy of ${scene.name}`,
      type: 'scene',
      version: scene.version,
      created: now,
      modified: now,
      isBuiltIn: false,
      entities: clonedEntities,
      settings: { ...scene.settings },
      description: scene.description,
    };
  }

  /**
   * Parse a scene asset from a JSON string.
   *
   * @param json - JSON string representation of a scene asset
   * @returns Parsed scene asset
   * @throws Error if JSON is invalid or doesn't represent a valid scene
   */
  static fromJSON(json: string): ISceneAsset {
    const data = JSON.parse(json);

    // Validate required fields
    if (data.type !== 'scene') {
      throw new Error(`Invalid scene asset: expected type "scene", got "${data.type}"`);
    }

    if (!data.uuid || typeof data.uuid !== 'string') {
      throw new Error('Invalid scene asset: missing or invalid uuid');
    }

    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Invalid scene asset: missing or invalid name');
    }

    if (!Array.isArray(data.entities)) {
      throw new Error('Invalid scene asset: entities must be an array');
    }

    // Ensure settings exist
    if (!data.settings) {
      data.settings = createDefaultSceneSettings();
    }

    return data as ISceneAsset;
  }

  /**
   * Convert a scene asset to a JSON string.
   *
   * @param scene - The scene asset to serialize
   * @param pretty - Whether to format with indentation (default: false)
   * @returns JSON string representation
   */
  static toJSON(scene: ISceneAsset, pretty: boolean = false): string {
    return JSON.stringify(scene, null, pretty ? 2 : undefined);
  }

  /**
   * Update a scene asset's metadata.
   *
   * @param scene - The scene to update
   * @param updates - Partial updates to apply
   * @returns Updated scene asset (mutates original)
   */
  static updateMetadata(
    scene: ISceneAsset,
    updates: {
      name?: string;
      description?: string;
      settings?: Partial<ISceneSettings>;
    }
  ): ISceneAsset {
    if (updates.name !== undefined) {
      scene.name = updates.name;
    }

    if (updates.description !== undefined) {
      scene.description = updates.description;
    }

    if (updates.settings) {
      scene.settings = {
        ...scene.settings,
        ...updates.settings,
      };
    }

    scene.modified = new Date().toISOString();

    return scene;
  }

  /**
   * Update the entities in a scene asset from a SceneGraph.
   * Used to sync scene asset with current scene state before saving.
   *
   * @param scene - The scene asset to update
   * @param sceneGraph - The SceneGraph to serialize
   * @returns Updated scene asset (mutates original)
   */
  static updateEntities(scene: ISceneAsset, sceneGraph: SceneGraph): ISceneAsset {
    const allObjects = sceneGraph.getAllObjects();
    const entities: IEntity[] = [];

    for (const obj of allObjects) {
      if (isEntity(obj)) {
        entities.push(obj);
      }
    }

    scene.entities = EntitySerializer.serializeEntities(entities);
    scene.modified = new Date().toISOString();

    return scene;
  }
}
