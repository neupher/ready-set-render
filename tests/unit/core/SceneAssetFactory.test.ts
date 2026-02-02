/**
 * SceneAssetFactory Tests
 *
 * Tests for scene asset creation, serialization, and SceneGraph integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SceneAssetFactory } from '../../../src/core/assets/SceneAssetFactory';
import type { ISceneAsset } from '../../../src/core/assets/interfaces/ISceneAsset';
import {
  SCENE_ASSET_VERSION,
  createDefaultSceneSettings,
} from '../../../src/core/assets/interfaces/ISceneAsset';
import { SceneGraph } from '../../../src/core/SceneGraph';
import { EventBus } from '../../../src/core/EventBus';
import { Cube } from '../../../src/plugins/primitives/Cube';
import { Sphere } from '../../../src/plugins/primitives/Sphere';
import { DirectionalLight } from '../../../src/plugins/lights/DirectionalLight';

describe('SceneAssetFactory', () => {
  let eventBus: EventBus;
  let sceneGraph: SceneGraph;

  beforeEach(() => {
    eventBus = new EventBus();
    sceneGraph = new SceneGraph(eventBus);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('should create an empty scene with the given name', () => {
      const scene = SceneAssetFactory.create({ name: 'My Scene' });

      expect(scene.name).toBe('My Scene');
    });

    it('should create a scene with a valid UUID', () => {
      const scene = SceneAssetFactory.create({ name: 'Test Scene' });

      expect(scene.uuid).toBeDefined();
      expect(typeof scene.uuid).toBe('string');
      expect(scene.uuid.length).toBeGreaterThan(0);
    });

    it('should set type to scene', () => {
      const scene = SceneAssetFactory.create({ name: 'Test Scene' });

      expect(scene.type).toBe('scene');
    });

    it('should set version to current schema version', () => {
      const scene = SceneAssetFactory.create({ name: 'Test Scene' });

      expect(scene.version).toBe(SCENE_ASSET_VERSION);
    });

    it('should set isBuiltIn to false', () => {
      const scene = SceneAssetFactory.create({ name: 'Test Scene' });

      expect(scene.isBuiltIn).toBe(false);
    });

    it('should create empty entities array', () => {
      const scene = SceneAssetFactory.create({ name: 'Test Scene' });

      expect(scene.entities).toEqual([]);
    });

    it('should set created and modified timestamps', () => {
      const scene = SceneAssetFactory.create({ name: 'Test Scene' });

      expect(scene.created).toBe('2026-02-01T12:00:00.000Z');
      expect(scene.modified).toBe('2026-02-01T12:00:00.000Z');
    });

    it('should set description if provided', () => {
      const scene = SceneAssetFactory.create({
        name: 'Test Scene',
        description: 'A test scene for unit tests',
      });

      expect(scene.description).toBe('A test scene for unit tests');
    });

    it('should use default settings', () => {
      const scene = SceneAssetFactory.create({ name: 'Test Scene' });
      const defaults = createDefaultSceneSettings();

      expect(scene.settings.ambientColor).toEqual(defaults.ambientColor);
      expect(scene.settings.backgroundColor).toEqual(defaults.backgroundColor);
      expect(scene.settings.showGrid).toBe(defaults.showGrid);
    });

    it('should merge custom settings with defaults', () => {
      const scene = SceneAssetFactory.create({
        name: 'Test Scene',
        settings: {
          backgroundColor: [0.5, 0.5, 0.5],
          showGrid: false,
        },
      });

      expect(scene.settings.backgroundColor).toEqual([0.5, 0.5, 0.5]);
      expect(scene.settings.showGrid).toBe(false);
      // Other defaults should still be present
      expect(scene.settings.ambientColor).toBeDefined();
    });
  });

  describe('createFromSceneGraph', () => {
    it('should create a scene from an empty SceneGraph', () => {
      const scene = SceneAssetFactory.createFromSceneGraph(sceneGraph, 'Empty Scene');

      expect(scene.name).toBe('Empty Scene');
      expect(scene.entities).toEqual([]);
    });

    it('should serialize entities from SceneGraph', () => {
      const cube = new Cube('cube-id', 'Test Cube');
      sceneGraph.add(cube);

      const scene = SceneAssetFactory.createFromSceneGraph(sceneGraph, 'Cube Scene');

      expect(scene.entities).toHaveLength(1);
      expect(scene.entities[0].type).toBe('Cube');
      expect(scene.entities[0].name).toBe('Test Cube');
    });

    it('should serialize multiple entities', () => {
      const cube = new Cube('cube-id', 'Cube');
      const sphere = new Sphere('sphere-id', 'Sphere');
      const light = new DirectionalLight({ name: 'Light' });

      sceneGraph.add(cube);
      sceneGraph.add(sphere);
      sceneGraph.add(light);

      const scene = SceneAssetFactory.createFromSceneGraph(sceneGraph, 'Multi-Entity Scene');

      expect(scene.entities).toHaveLength(3);
    });

    it('should include description if provided', () => {
      const scene = SceneAssetFactory.createFromSceneGraph(
        sceneGraph,
        'Test Scene',
        'Scene with description'
      );

      expect(scene.description).toBe('Scene with description');
    });

    it('should set timestamps correctly', () => {
      const scene = SceneAssetFactory.createFromSceneGraph(sceneGraph, 'Test Scene');

      expect(scene.created).toBe('2026-02-01T12:00:00.000Z');
      expect(scene.modified).toBe('2026-02-01T12:00:00.000Z');
    });

    it('should use default scene settings', () => {
      const scene = SceneAssetFactory.createFromSceneGraph(sceneGraph, 'Test Scene');
      const defaults = createDefaultSceneSettings();

      expect(scene.settings).toEqual(defaults);
    });
  });

  describe('loadIntoSceneGraph', () => {
    it('should load entities into an empty SceneGraph', () => {
      const sceneAsset: ISceneAsset = {
        uuid: 'scene-uuid',
        name: 'Test Scene',
        type: 'scene',
        version: SCENE_ASSET_VERSION,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        entities: [
          {
            uuid: 'cube-uuid',
            name: 'Loaded Cube',
            type: 'Cube',
            transform: { position: [1, 2, 3], rotation: [0, 0, 0], scale: [1, 1, 1] },
            components: [],
          },
        ],
        settings: createDefaultSceneSettings(),
      };

      const entities = SceneAssetFactory.loadIntoSceneGraph(sceneAsset, sceneGraph);

      expect(entities).toHaveLength(1);
      expect(entities[0].id).toBe('cube-uuid');
      expect(entities[0].name).toBe('Loaded Cube');
      // getAllObjects includes the root 'Scene' object, so expect 2 (root + cube)
      expect(sceneGraph.getAllObjects()).toHaveLength(2);
    });

    it('should clear SceneGraph by default', () => {
      const existingCube = new Cube('existing-id', 'Existing Cube');
      sceneGraph.add(existingCube);

      const sceneAsset: ISceneAsset = {
        uuid: 'scene-uuid',
        name: 'Test Scene',
        type: 'scene',
        version: SCENE_ASSET_VERSION,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        entities: [
          {
            uuid: 'new-cube-uuid',
            name: 'New Cube',
            type: 'Cube',
            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            components: [],
          },
        ],
        settings: createDefaultSceneSettings(),
      };

      SceneAssetFactory.loadIntoSceneGraph(sceneAsset, sceneGraph, true);

      // getAllObjects includes root, so expect 2 (root + new cube)
      expect(sceneGraph.getAllObjects()).toHaveLength(2);
      // Verify that the new cube is in the scene (exclude root)
      const nonRootObjects = sceneGraph.getAllObjects().filter((obj) => obj.id !== 'root');
      expect(nonRootObjects).toHaveLength(1);
      expect(nonRootObjects[0].id).toBe('new-cube-uuid');
    });

    it('should not clear SceneGraph when clearFirst is false', () => {
      const existingCube = new Cube('existing-id', 'Existing Cube');
      sceneGraph.add(existingCube);

      const sceneAsset: ISceneAsset = {
        uuid: 'scene-uuid',
        name: 'Test Scene',
        type: 'scene',
        version: SCENE_ASSET_VERSION,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        entities: [
          {
            uuid: 'new-cube-uuid',
            name: 'New Cube',
            type: 'Cube',
            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            components: [],
          },
        ],
        settings: createDefaultSceneSettings(),
      };

      SceneAssetFactory.loadIntoSceneGraph(sceneAsset, sceneGraph, false);

      // getAllObjects includes root, so expect 3 (root + existing + new)
      expect(sceneGraph.getAllObjects()).toHaveLength(3);
    });

    it('should reconstruct parent-child hierarchy', () => {
      const sceneAsset: ISceneAsset = {
        uuid: 'scene-uuid',
        name: 'Hierarchy Scene',
        type: 'scene',
        version: SCENE_ASSET_VERSION,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        entities: [
          {
            uuid: 'parent-uuid',
            name: 'Parent',
            type: 'Cube',
            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            components: [],
          },
          {
            uuid: 'child-uuid',
            name: 'Child',
            type: 'Sphere',
            parentUuid: 'parent-uuid',
            transform: { position: [2, 0, 0], rotation: [0, 0, 0], scale: [0.5, 0.5, 0.5] },
            components: [],
          },
        ],
        settings: createDefaultSceneSettings(),
      };

      const entities = SceneAssetFactory.loadIntoSceneGraph(sceneAsset, sceneGraph);

      expect(entities).toHaveLength(2);
      expect(entities[1].parent).toBe(entities[0]);
      expect(entities[0].children).toContain(entities[1]);
    });

    it('should only add root entities to SceneGraph', () => {
      const sceneAsset: ISceneAsset = {
        uuid: 'scene-uuid',
        name: 'Hierarchy Scene',
        type: 'scene',
        version: SCENE_ASSET_VERSION,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        entities: [
          {
            uuid: 'parent-uuid',
            name: 'Parent',
            type: 'Cube',
            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            components: [],
          },
          {
            uuid: 'child-uuid',
            name: 'Child',
            type: 'Sphere',
            parentUuid: 'parent-uuid',
            transform: { position: [2, 0, 0], rotation: [0, 0, 0], scale: [0.5, 0.5, 0.5] },
            components: [],
          },
        ],
        settings: createDefaultSceneSettings(),
      };

      SceneAssetFactory.loadIntoSceneGraph(sceneAsset, sceneGraph);

      // SceneGraph root 'Scene' has no parent, and 'Parent' entity is a child of 'Scene'
      // Only the SceneGraph's root 'Scene' should have no parent
      const rootObjects = sceneGraph.getAllObjects().filter((obj) => !obj.parent);
      expect(rootObjects).toHaveLength(1);
      expect(rootObjects[0].id).toBe('root'); // SceneGraph root

      // The 'Parent' entity should be a child of root, and 'Child' should be a child of 'Parent'
      const parentEntity = sceneGraph.find('parent-uuid');
      expect(parentEntity).toBeDefined();
      expect(parentEntity?.parent?.id).toBe('root');
    });

    it('should load empty scene', () => {
      const sceneAsset: ISceneAsset = {
        uuid: 'scene-uuid',
        name: 'Empty Scene',
        type: 'scene',
        version: SCENE_ASSET_VERSION,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        entities: [],
        settings: createDefaultSceneSettings(),
      };

      const entities = SceneAssetFactory.loadIntoSceneGraph(sceneAsset, sceneGraph);

      expect(entities).toHaveLength(0);
      // getAllObjects still includes the root 'Scene' object
      expect(sceneGraph.getAllObjects()).toHaveLength(1);
      expect(sceneGraph.getAllObjects()[0].id).toBe('root');
    });
  });

  describe('duplicate', () => {
    let sourceScene: ISceneAsset;

    beforeEach(() => {
      sourceScene = {
        uuid: 'source-uuid',
        name: 'Source Scene',
        type: 'scene',
        version: SCENE_ASSET_VERSION,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-15T00:00:00Z',
        isBuiltIn: true,
        entities: [
          {
            uuid: 'entity-1-uuid',
            name: 'Entity 1',
            type: 'Cube',
            transform: { position: [1, 2, 3], rotation: [0, 0, 0], scale: [1, 1, 1] },
            components: [{ type: 'mesh', vertexCount: 24, edgeCount: 12, triangleCount: 12, doubleSided: false }],
          },
          {
            uuid: 'entity-2-uuid',
            name: 'Entity 2',
            type: 'Sphere',
            parentUuid: 'entity-1-uuid',
            transform: { position: [0, 0, 2], rotation: [0, 0, 0], scale: [0.5, 0.5, 0.5] },
            components: [],
            metadata: { segments: 32, rings: 16, radius: 0.5 },
          },
        ],
        settings: {
          ambientColor: [0.2, 0.2, 0.2],
          backgroundColor: [0.1, 0.1, 0.1],
          showGrid: true,
        },
        description: 'Original scene description',
      };
    });

    it('should create duplicate with new name', () => {
      const duplicate = SceneAssetFactory.duplicate(sourceScene, 'Duplicated Scene');

      expect(duplicate.name).toBe('Duplicated Scene');
    });

    it('should use default name if not provided', () => {
      const duplicate = SceneAssetFactory.duplicate(sourceScene);

      expect(duplicate.name).toBe('Copy of Source Scene');
    });

    it('should create duplicate with new UUID', () => {
      const duplicate = SceneAssetFactory.duplicate(sourceScene);

      expect(duplicate.uuid).not.toBe(sourceScene.uuid);
      expect(duplicate.uuid).toBeDefined();
    });

    it('should set isBuiltIn to false', () => {
      const duplicate = SceneAssetFactory.duplicate(sourceScene);

      expect(duplicate.isBuiltIn).toBe(false);
    });

    it('should generate new UUIDs for entities', () => {
      const duplicate = SceneAssetFactory.duplicate(sourceScene);

      expect(duplicate.entities[0].uuid).not.toBe(sourceScene.entities[0].uuid);
      expect(duplicate.entities[1].uuid).not.toBe(sourceScene.entities[1].uuid);
    });

    it('should clear parent references in duplicated entities', () => {
      const duplicate = SceneAssetFactory.duplicate(sourceScene);

      // Parent references should be cleared since UUIDs change
      expect(duplicate.entities[0].parentUuid).toBeUndefined();
      expect(duplicate.entities[1].parentUuid).toBeUndefined();
    });

    it('should copy entity data', () => {
      const duplicate = SceneAssetFactory.duplicate(sourceScene);

      // The duplicate method uses spread which creates shallow copies.
      // Verify that the duplicated entity has correct values
      expect(duplicate.entities[0].transform.position).toEqual([1, 2, 3]);
      expect(duplicate.entities[0].transform.rotation).toEqual([0, 0, 0]);
      expect(duplicate.entities[0].transform.scale).toEqual([1, 1, 1]);
      expect(duplicate.entities[0].name).toBe('Entity 1');
      expect(duplicate.entities[0].type).toBe('Cube');
    });

    it('should deep copy components', () => {
      const duplicate = SceneAssetFactory.duplicate(sourceScene);

      expect(duplicate.entities[0].components).toHaveLength(1);
      expect(duplicate.entities[0].components[0]).not.toBe(sourceScene.entities[0].components[0]);
    });

    it('should deep copy metadata', () => {
      const duplicate = SceneAssetFactory.duplicate(sourceScene);

      expect(duplicate.entities[1].metadata).toBeDefined();
      expect(duplicate.entities[1].metadata).not.toBe(sourceScene.entities[1].metadata);
      expect(duplicate.entities[1].metadata?.segments).toBe(32);
    });

    it('should copy settings', () => {
      const duplicate = SceneAssetFactory.duplicate(sourceScene);

      expect(duplicate.settings.ambientColor).toEqual([0.2, 0.2, 0.2]);
      expect(duplicate.settings.backgroundColor).toEqual([0.1, 0.1, 0.1]);
      expect(duplicate.settings.showGrid).toBe(true);
    });

    it('should copy description', () => {
      const duplicate = SceneAssetFactory.duplicate(sourceScene);

      expect(duplicate.description).toBe('Original scene description');
    });

    it('should set new timestamps', () => {
      const duplicate = SceneAssetFactory.duplicate(sourceScene);

      expect(duplicate.created).toBe('2026-02-01T12:00:00.000Z');
      expect(duplicate.modified).toBe('2026-02-01T12:00:00.000Z');
    });

    it('should preserve version', () => {
      const duplicate = SceneAssetFactory.duplicate(sourceScene);

      expect(duplicate.version).toBe(sourceScene.version);
    });
  });

  describe('fromJSON', () => {
    it('should parse valid scene JSON', () => {
      const json = JSON.stringify({
        uuid: 'json-uuid',
        name: 'JSON Scene',
        type: 'scene',
        version: SCENE_ASSET_VERSION,
        created: '2026-01-20T10:00:00Z',
        modified: '2026-01-21T11:00:00Z',
        isBuiltIn: false,
        entities: [],
        settings: createDefaultSceneSettings(),
      });

      const scene = SceneAssetFactory.fromJSON(json);

      expect(scene.uuid).toBe('json-uuid');
      expect(scene.name).toBe('JSON Scene');
      expect(scene.type).toBe('scene');
    });

    it('should parse scene with entities', () => {
      const json = JSON.stringify({
        uuid: 'json-uuid',
        name: 'Scene with Entities',
        type: 'scene',
        version: SCENE_ASSET_VERSION,
        created: '2026-01-20T10:00:00Z',
        modified: '2026-01-21T11:00:00Z',
        isBuiltIn: false,
        entities: [
          {
            uuid: 'cube-uuid',
            name: 'Cube',
            type: 'Cube',
            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            components: [],
          },
        ],
        settings: createDefaultSceneSettings(),
      });

      const scene = SceneAssetFactory.fromJSON(json);

      expect(scene.entities).toHaveLength(1);
      expect(scene.entities[0].type).toBe('Cube');
    });

    it('should throw for invalid JSON', () => {
      expect(() => SceneAssetFactory.fromJSON('not valid json')).toThrow();
    });

    it('should throw for wrong type', () => {
      const json = JSON.stringify({
        uuid: 'test',
        name: 'Test',
        type: 'material',
        entities: [],
      });

      expect(() => SceneAssetFactory.fromJSON(json)).toThrow('expected type "scene"');
    });

    it('should throw for missing uuid', () => {
      const json = JSON.stringify({
        name: 'Test',
        type: 'scene',
        entities: [],
      });

      expect(() => SceneAssetFactory.fromJSON(json)).toThrow('missing or invalid uuid');
    });

    it('should throw for missing name', () => {
      const json = JSON.stringify({
        uuid: 'test',
        type: 'scene',
        entities: [],
      });

      expect(() => SceneAssetFactory.fromJSON(json)).toThrow('missing or invalid name');
    });

    it('should throw for missing entities array', () => {
      const json = JSON.stringify({
        uuid: 'test',
        name: 'Test',
        type: 'scene',
      });

      expect(() => SceneAssetFactory.fromJSON(json)).toThrow('entities must be an array');
    });

    it('should throw for non-array entities', () => {
      const json = JSON.stringify({
        uuid: 'test',
        name: 'Test',
        type: 'scene',
        entities: 'not an array',
      });

      expect(() => SceneAssetFactory.fromJSON(json)).toThrow('entities must be an array');
    });

    it('should create default settings if missing', () => {
      const json = JSON.stringify({
        uuid: 'test',
        name: 'Test',
        type: 'scene',
        version: 1,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        entities: [],
      });

      const scene = SceneAssetFactory.fromJSON(json);
      const defaults = createDefaultSceneSettings();

      expect(scene.settings).toEqual(defaults);
    });

    it('should parse description if present', () => {
      const json = JSON.stringify({
        uuid: 'test',
        name: 'Test',
        type: 'scene',
        version: 1,
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-01T00:00:00Z',
        isBuiltIn: false,
        entities: [],
        settings: {},
        description: 'A test scene',
      });

      const scene = SceneAssetFactory.fromJSON(json);

      expect(scene.description).toBe('A test scene');
    });
  });

  describe('toJSON', () => {
    it('should convert scene to JSON string', () => {
      const scene = SceneAssetFactory.create({ name: 'Test Scene' });

      const json = SceneAssetFactory.toJSON(scene);
      const parsed = JSON.parse(json);

      expect(parsed.name).toBe('Test Scene');
      expect(parsed.type).toBe('scene');
    });

    it('should produce compact JSON by default', () => {
      const scene = SceneAssetFactory.create({ name: 'Test Scene' });

      const json = SceneAssetFactory.toJSON(scene);

      // Compact JSON has no newlines
      expect(json.includes('\n')).toBe(false);
    });

    it('should produce pretty JSON when requested', () => {
      const scene = SceneAssetFactory.create({ name: 'Test Scene' });

      const json = SceneAssetFactory.toJSON(scene, true);

      // Pretty JSON has newlines and indentation
      expect(json.includes('\n')).toBe(true);
      expect(json.includes('  ')).toBe(true);
    });

    it('should include all scene properties', () => {
      const scene = SceneAssetFactory.create({
        name: 'Full Scene',
        description: 'A complete scene',
        settings: { showGrid: false },
      });

      const json = SceneAssetFactory.toJSON(scene);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('uuid');
      expect(parsed).toHaveProperty('name');
      expect(parsed).toHaveProperty('type');
      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('created');
      expect(parsed).toHaveProperty('modified');
      expect(parsed).toHaveProperty('isBuiltIn');
      expect(parsed).toHaveProperty('entities');
      expect(parsed).toHaveProperty('settings');
      expect(parsed).toHaveProperty('description');
    });
  });

  describe('updateMetadata', () => {
    let scene: ISceneAsset;

    beforeEach(() => {
      scene = SceneAssetFactory.create({ name: 'Original Name' });
    });

    it('should update scene name', () => {
      SceneAssetFactory.updateMetadata(scene, { name: 'New Name' });

      expect(scene.name).toBe('New Name');
    });

    it('should update scene description', () => {
      SceneAssetFactory.updateMetadata(scene, { description: 'New description' });

      expect(scene.description).toBe('New description');
    });

    it('should update scene settings', () => {
      SceneAssetFactory.updateMetadata(scene, {
        settings: { showGrid: false },
      });

      expect(scene.settings.showGrid).toBe(false);
    });

    it('should merge settings with existing', () => {
      const originalAmbient = scene.settings.ambientColor;

      SceneAssetFactory.updateMetadata(scene, {
        settings: { showGrid: false },
      });

      expect(scene.settings.showGrid).toBe(false);
      expect(scene.settings.ambientColor).toEqual(originalAmbient);
    });

    it('should update modified timestamp', () => {
      const originalModified = scene.modified;

      vi.setSystemTime(new Date('2026-02-15T15:00:00Z'));
      SceneAssetFactory.updateMetadata(scene, { name: 'Updated' });

      expect(scene.modified).not.toBe(originalModified);
      expect(scene.modified).toBe('2026-02-15T15:00:00.000Z');
    });

    it('should return the updated scene', () => {
      const result = SceneAssetFactory.updateMetadata(scene, { name: 'Updated' });

      expect(result).toBe(scene);
    });

    it('should not modify other properties when updating name only', () => {
      const originalUuid = scene.uuid;
      const originalCreated = scene.created;

      SceneAssetFactory.updateMetadata(scene, { name: 'Updated' });

      expect(scene.uuid).toBe(originalUuid);
      expect(scene.created).toBe(originalCreated);
    });
  });

  describe('updateEntities', () => {
    let scene: ISceneAsset;

    beforeEach(() => {
      scene = SceneAssetFactory.create({ name: 'Test Scene' });
    });

    it('should update entities from SceneGraph', () => {
      const cube = new Cube('cube-id', 'New Cube');
      sceneGraph.add(cube);

      SceneAssetFactory.updateEntities(scene, sceneGraph);

      expect(scene.entities).toHaveLength(1);
      expect(scene.entities[0].name).toBe('New Cube');
    });

    it('should replace existing entities', () => {
      scene.entities = [
        {
          uuid: 'old-uuid',
          name: 'Old Entity',
          type: 'Cube',
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
        },
      ];

      const sphere = new Sphere('sphere-id', 'New Sphere');
      sceneGraph.add(sphere);

      SceneAssetFactory.updateEntities(scene, sceneGraph);

      expect(scene.entities).toHaveLength(1);
      expect(scene.entities[0].type).toBe('Sphere');
      expect(scene.entities[0].name).toBe('New Sphere');
    });

    it('should update modified timestamp', () => {
      const originalModified = scene.modified;

      vi.setSystemTime(new Date('2026-02-15T15:00:00Z'));

      const cube = new Cube('cube-id', 'Cube');
      sceneGraph.add(cube);

      SceneAssetFactory.updateEntities(scene, sceneGraph);

      expect(scene.modified).not.toBe(originalModified);
      expect(scene.modified).toBe('2026-02-15T15:00:00.000Z');
    });

    it('should return the updated scene', () => {
      const result = SceneAssetFactory.updateEntities(scene, sceneGraph);

      expect(result).toBe(scene);
    });

    it('should handle empty SceneGraph', () => {
      scene.entities = [
        {
          uuid: 'old-uuid',
          name: 'Old Entity',
          type: 'Cube',
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
        },
      ];

      SceneAssetFactory.updateEntities(scene, sceneGraph);

      expect(scene.entities).toHaveLength(0);
    });
  });

  describe('round-trip serialization', () => {
    it('should preserve scene data through create -> toJSON -> fromJSON cycle', () => {
      const original = SceneAssetFactory.create({
        name: 'Round Trip Scene',
        description: 'Testing round-trip',
        settings: {
          backgroundColor: [0.3, 0.3, 0.3],
          showGrid: false,
        },
      });

      const json = SceneAssetFactory.toJSON(original);
      const restored = SceneAssetFactory.fromJSON(json);

      expect(restored.uuid).toBe(original.uuid);
      expect(restored.name).toBe(original.name);
      expect(restored.description).toBe(original.description);
      expect(restored.settings.backgroundColor).toEqual([0.3, 0.3, 0.3]);
      expect(restored.settings.showGrid).toBe(false);
    });

    it('should preserve scene with entities through round-trip', () => {
      const cube = new Cube('cube-id', 'Test Cube');
      cube.transform.position = [5, 10, 15];
      sceneGraph.add(cube);

      const original = SceneAssetFactory.createFromSceneGraph(sceneGraph, 'Scene with Cube');
      const json = SceneAssetFactory.toJSON(original);
      const restored = SceneAssetFactory.fromJSON(json);

      expect(restored.entities).toHaveLength(1);
      expect(restored.entities[0].name).toBe('Test Cube');
      expect(restored.entities[0].transform.position).toEqual([5, 10, 15]);
    });

    it('should preserve hierarchy through full round-trip with SceneGraph', () => {
      // Create scene with hierarchy - use sceneGraph.add for proper hierarchy
      const parent = new Cube('parent-id', 'Parent');
      const child = new Sphere('child-id', 'Child');

      sceneGraph.add(parent);
      sceneGraph.add(child, parent); // Add child under parent

      // Serialize to scene asset
      const sceneAsset = SceneAssetFactory.createFromSceneGraph(sceneGraph, 'Hierarchy Scene');

      // Verify serialization captured hierarchy
      expect(sceneAsset.entities).toHaveLength(2);
      const serializedChild = sceneAsset.entities.find((e) => e.name === 'Child');
      expect(serializedChild?.parentUuid).toBe('parent-id');

      // Convert to JSON and back
      const json = SceneAssetFactory.toJSON(sceneAsset);
      const restored = SceneAssetFactory.fromJSON(json);

      // Load into new SceneGraph
      const newEventBus = new EventBus();
      const newSceneGraph = new SceneGraph(newEventBus);
      const loadedEntities = SceneAssetFactory.loadIntoSceneGraph(restored, newSceneGraph);

      // Verify hierarchy was preserved
      const loadedParent = loadedEntities.find((e) => e.name === 'Parent');
      const loadedChild = loadedEntities.find((e) => e.name === 'Child');

      expect(loadedParent).toBeDefined();
      expect(loadedChild).toBeDefined();
      expect(loadedChild?.parent).toBe(loadedParent);
      expect(loadedParent?.children).toContain(loadedChild);
    });
  });
});
