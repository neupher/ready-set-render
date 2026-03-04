/**
 * EntitySerializer Tests
 *
 * Tests for entity serialization and deserialization.
 * Covers all supported entity types: Cube, Sphere, DirectionalLight, Camera, MeshEntity, GroupEntity.
 */

import { describe, it, expect } from 'vitest';
import { EntitySerializer, registerEntityFactory } from '../../../src/core/serialization/EntitySerializer';
import type { ISerializedEntity } from '../../../src/core/assets/interfaces/ISceneAsset';
import type { IMaterialComponent, ILightComponent } from '../../../src/core/interfaces';
import type { ICameraComponent } from '../../../src/core/interfaces/ICameraComponent';
import { Cube } from '../../../src/plugins/primitives/Cube';
import { Sphere } from '../../../src/plugins/primitives/Sphere';
import { DirectionalLight } from '../../../src/plugins/lights/DirectionalLight';
import { CameraEntity } from '../../../src/core/CameraEntity';
import { MeshEntity } from '../../../src/plugins/primitives/MeshEntity';
import { GroupEntity } from '../../../src/plugins/primitives/GroupEntity';

describe('EntitySerializer', () => {
  describe('serializeEntity', () => {
    describe('Cube serialization', () => {
      it('should serialize a Cube with default values', () => {
        const cube = new Cube('test-cube-id', 'Test Cube');

        const serialized = EntitySerializer.serializeEntity(cube);

        expect(serialized.uuid).toBe('test-cube-id');
        expect(serialized.name).toBe('Test Cube');
        expect(serialized.type).toBe('Cube');
      });

      it('should serialize Cube transform', () => {
        const cube = new Cube('test-cube-id', 'Test Cube');
        cube.transform.position = [1, 2, 3];
        cube.transform.rotation = [45, 90, 0];
        cube.transform.scale = [2, 2, 2];

        const serialized = EntitySerializer.serializeEntity(cube);

        expect(serialized.transform.position).toEqual([1, 2, 3]);
        expect(serialized.transform.rotation).toEqual([45, 90, 0]);
        expect(serialized.transform.scale).toEqual([2, 2, 2]);
      });

      it('should serialize Cube components', () => {
        const cube = new Cube('test-cube-id', 'Test Cube');

        const serialized = EntitySerializer.serializeEntity(cube);

        expect(serialized.components).toBeDefined();
        expect(serialized.components.length).toBeGreaterThan(0);

        const meshComponent = serialized.components.find(c => c.type === 'mesh');
        expect(meshComponent).toBeDefined();
        expect(meshComponent?.vertexCount).toBe(24);
        expect(meshComponent?.triangleCount).toBe(12);

        const materialComponent = serialized.components.find(c => c.type === 'material');
        expect(materialComponent).toBeDefined();
      });

      it('should serialize Cube parent reference', () => {
        const parent = new Cube('parent-id', 'Parent');
        const child = new Cube('child-id', 'Child');
        child.parent = parent;

        const serialized = EntitySerializer.serializeEntity(child);

        expect(serialized.parentUuid).toBe('parent-id');
      });

      it('should serialize Cube without parent as undefined parentUuid', () => {
        const cube = new Cube('test-cube-id', 'Test Cube');

        const serialized = EntitySerializer.serializeEntity(cube);

        expect(serialized.parentUuid).toBeUndefined();
      });
    });

    describe('Sphere serialization', () => {
      it('should serialize a Sphere with default values', () => {
        const sphere = new Sphere('test-sphere-id', 'Test Sphere');

        const serialized = EntitySerializer.serializeEntity(sphere);

        expect(serialized.uuid).toBe('test-sphere-id');
        expect(serialized.name).toBe('Test Sphere');
        expect(serialized.type).toBe('Sphere');
      });

      it('should serialize Sphere-specific metadata', () => {
        const sphere = new Sphere('test-sphere-id', 'Test Sphere', {
          segments: 64,
          rings: 32,
          radius: 1.5,
        });

        const serialized = EntitySerializer.serializeEntity(sphere);

        expect(serialized.metadata).toBeDefined();
        expect(serialized.metadata?.segments).toBe(64);
        expect(serialized.metadata?.rings).toBe(32);
        expect(serialized.metadata?.radius).toBe(1.5);
      });

      it('should serialize Sphere transform', () => {
        const sphere = new Sphere('test-sphere-id', 'Test Sphere');
        sphere.transform.position = [5, 10, 15];

        const serialized = EntitySerializer.serializeEntity(sphere);

        expect(serialized.transform.position).toEqual([5, 10, 15]);
      });
    });

    describe('DirectionalLight serialization', () => {
      it('should serialize a DirectionalLight', () => {
        const light = new DirectionalLight({ name: 'Test Light' });
        // Override ID for testing
        (light as unknown as { id: string }).id = 'test-light-id';

        const serialized = EntitySerializer.serializeEntity(light);

        expect(serialized.uuid).toBe('test-light-id');
        expect(serialized.name).toBe('Test Light');
        expect(serialized.type).toBe('DirectionalLight');
      });

      it('should serialize DirectionalLight light component', () => {
        const light = new DirectionalLight({
          name: 'Test Light',
          color: [1.0, 0.5, 0.0],
          intensity: 2.0,
        });

        const serialized = EntitySerializer.serializeEntity(light);

        const lightComponent = serialized.components.find(c => c.type === 'light');
        expect(lightComponent).toBeDefined();
        expect(lightComponent?.lightType).toBe('directional');
        expect(lightComponent?.color).toEqual([1.0, 0.5, 0.0]);
        expect(lightComponent?.intensity).toBe(2.0);
      });
    });

    describe('CameraEntity serialization', () => {
      it('should serialize a CameraEntity', () => {
        const camera = new CameraEntity({ id: 'test-camera-id', name: 'Test Camera' });

        const serialized = EntitySerializer.serializeEntity(camera);

        expect(serialized.uuid).toBe('test-camera-id');
        expect(serialized.name).toBe('Test Camera');
        expect(serialized.type).toBe('Camera');
      });

      it('should serialize CameraEntity camera component', () => {
        const camera = new CameraEntity({
          id: 'test-camera-id',
          name: 'Test Camera',
          fieldOfView: 75,
          nearClipPlane: 0.5,
          farClipPlane: 500,
        });

        const serialized = EntitySerializer.serializeEntity(camera);

        const cameraComponent = serialized.components.find(c => c.type === 'camera');
        expect(cameraComponent).toBeDefined();
        expect(cameraComponent?.fieldOfView).toBe(75);
        expect(cameraComponent?.nearClipPlane).toBe(0.5);
        expect(cameraComponent?.farClipPlane).toBe(500);
      });
    });

    describe('MeshEntity serialization', () => {
      it('should serialize a MeshEntity with default values', () => {
        const meshEntity = new MeshEntity('test-mesh-id', 'Test Mesh');

        const serialized = EntitySerializer.serializeEntity(meshEntity);

        expect(serialized.uuid).toBe('test-mesh-id');
        expect(serialized.name).toBe('Test Mesh');
        expect(serialized.type).toBe('MeshEntity');
      });

      it('should serialize MeshEntity transform', () => {
        const meshEntity = new MeshEntity('test-mesh-id', 'Test Mesh');
        meshEntity.transform.position = [1, 2, 3];
        meshEntity.transform.rotation = [45, 90, 0];
        meshEntity.transform.scale = [2, 2, 2];

        const serialized = EntitySerializer.serializeEntity(meshEntity);

        expect(serialized.transform.position).toEqual([1, 2, 3]);
        expect(serialized.transform.rotation).toEqual([45, 90, 0]);
        expect(serialized.transform.scale).toEqual([2, 2, 2]);
      });

      it('should serialize MeshEntity with mesh asset reference', () => {
        const meshEntity = new MeshEntity('test-mesh-id', 'Test Mesh');
        meshEntity.meshAssetRef = { uuid: 'mesh-asset-uuid', type: 'mesh' };

        const serialized = EntitySerializer.serializeEntity(meshEntity);

        expect(serialized.metadata?.meshAssetRef).toEqual({
          uuid: 'mesh-asset-uuid',
          type: 'mesh',
        });
      });

      it('should serialize MeshEntity parent reference', () => {
        const parent = new GroupEntity('Parent');
        (parent as unknown as { id: string }).id = 'parent-id';
        const meshEntity = new MeshEntity('mesh-id', 'Child Mesh');
        meshEntity.parent = parent as any;

        const serialized = EntitySerializer.serializeEntity(meshEntity);

        expect(serialized.parentUuid).toBe('parent-id');
      });
    });

    describe('GroupEntity serialization', () => {
      it('should serialize a GroupEntity', () => {
        const group = new GroupEntity('Test Group', 'test-group-id');

        const serialized = EntitySerializer.serializeEntity(group);

        expect(serialized.uuid).toBe('test-group-id');
        expect(serialized.name).toBe('Test Group');
        expect(serialized.type).toBe('GroupEntity');
      });

      it('should serialize GroupEntity transform', () => {
        const group = new GroupEntity('Test Group', 'test-group-id');
        group.transform.position = [5, 10, 15];
        group.transform.rotation = [30, 60, 90];
        group.transform.scale = [2, 2, 2];

        const serialized = EntitySerializer.serializeEntity(group);

        expect(serialized.transform.position).toEqual([5, 10, 15]);
        expect(serialized.transform.rotation).toEqual([30, 60, 90]);
        expect(serialized.transform.scale).toEqual([2, 2, 2]);
      });

      it('should serialize GroupEntity with isMeshGroup metadata', () => {
        const group = new GroupEntity('Test Group', 'test-group-id');

        const serialized = EntitySerializer.serializeEntity(group);

        expect(serialized.metadata?.isMeshGroup).toBe(true);
      });

      it('should serialize GroupEntity parent reference', () => {
        const parent = new GroupEntity('Parent', 'parent-id');
        const child = new GroupEntity('Child', 'child-id');
        child.parent = parent;

        const serialized = EntitySerializer.serializeEntity(child);

        expect(serialized.parentUuid).toBe('parent-id');
      });
    });

    describe('error handling', () => {
      it('should throw for entity without toJSON method', () => {
        const fakeEntity = {
          id: 'fake-id',
          name: 'Fake Entity',
        };

        expect(() => EntitySerializer.serializeEntity(fakeEntity as any)).toThrow(
          'does not implement ISerializable'
        );
      });
    });
  });

  describe('deserializeEntity', () => {
    describe('Cube deserialization', () => {
      it('should deserialize a Cube', () => {
        const serialized: ISerializedEntity = {
          uuid: 'cube-uuid',
          name: 'Deserialized Cube',
          type: 'Cube',
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: [],
        };

        const entity = EntitySerializer.deserializeEntity(serialized);

        expect(entity.id).toBe('cube-uuid');
        expect(entity.name).toBe('Deserialized Cube');
        expect(entity).toBeInstanceOf(Cube);
      });

      it('should deserialize Cube transform', () => {
        const serialized: ISerializedEntity = {
          uuid: 'cube-uuid',
          name: 'Test Cube',
          type: 'Cube',
          transform: {
            position: [10, 20, 30],
            rotation: [45, 90, 180],
            scale: [0.5, 2, 1],
          },
          components: [],
        };

        const entity = EntitySerializer.deserializeEntity(serialized);

        expect(entity.transform.position).toEqual([10, 20, 30]);
        expect(entity.transform.rotation).toEqual([45, 90, 180]);
        expect(entity.transform.scale).toEqual([0.5, 2, 1]);
      });

      it('should deserialize Cube material component', () => {
        const serialized: ISerializedEntity = {
          uuid: 'cube-uuid',
          name: 'Test Cube',
          type: 'Cube',
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: [
            {
              type: 'material',
              shaderName: 'pbr',
              color: [1.0, 0.0, 0.0],
              opacity: 0.5,
              transparent: true,
            },
          ],
        };

        const entity = EntitySerializer.deserializeEntity(serialized) as Cube;
        const material = entity.getComponent<IMaterialComponent>('material');

        expect(material).toBeDefined();
        expect(material?.shaderName).toBe('pbr');
        expect(material?.color).toEqual([1.0, 0.0, 0.0]);
        expect(material?.opacity).toBe(0.5);
        expect(material?.transparent).toBe(true);
      });
    });

    describe('Sphere deserialization', () => {
      it('should deserialize a Sphere with default parameters', () => {
        const serialized: ISerializedEntity = {
          uuid: 'sphere-uuid',
          name: 'Test Sphere',
          type: 'Sphere',
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: [],
        };

        const entity = EntitySerializer.deserializeEntity(serialized);

        expect(entity.id).toBe('sphere-uuid');
        expect(entity.name).toBe('Test Sphere');
        expect(entity).toBeInstanceOf(Sphere);
      });

      it('should deserialize Sphere with custom parameters', () => {
        const serialized: ISerializedEntity = {
          uuid: 'sphere-uuid',
          name: 'Custom Sphere',
          type: 'Sphere',
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: [],
          metadata: {
            segments: 48,
            rings: 24,
            radius: 2.0,
          },
        };

        const entity = EntitySerializer.deserializeEntity(serialized) as Sphere;

        expect(entity.id).toBe('sphere-uuid');
        // Sphere stores these in metadata when serializing again
        const reserialized = EntitySerializer.serializeEntity(entity);
        expect(reserialized.metadata?.segments).toBe(48);
        expect(reserialized.metadata?.rings).toBe(24);
        expect(reserialized.metadata?.radius).toBe(2.0);
      });
    });

    describe('DirectionalLight deserialization', () => {
      it('should deserialize a DirectionalLight', () => {
        const serialized: ISerializedEntity = {
          uuid: 'light-uuid',
          name: 'Test Light',
          type: 'DirectionalLight',
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: [
            {
              type: 'light',
              lightType: 'directional',
              color: [0.5, 0.5, 1.0],
              intensity: 1.5,
              enabled: true,
            },
          ],
        };

        const entity = EntitySerializer.deserializeEntity(serialized);

        expect(entity.id).toBe('light-uuid');
        expect(entity.name).toBe('Test Light');
        expect(entity).toBeInstanceOf(DirectionalLight);
      });

      it('should deserialize DirectionalLight properties', () => {
        const serialized: ISerializedEntity = {
          uuid: 'light-uuid',
          name: 'Blue Light',
          type: 'DirectionalLight',
          transform: {
            position: [10, 10, 10],
            rotation: [45, 45, 0],
            scale: [1, 1, 1],
          },
          components: [
            {
              type: 'light',
              lightType: 'directional',
              color: [0.0, 0.0, 1.0],
              intensity: 3.0,
              enabled: false,
            },
          ],
        };

        const entity = EntitySerializer.deserializeEntity(serialized) as DirectionalLight;
        const lightComponent = entity.getComponent<ILightComponent>('light');

        expect(lightComponent?.color).toEqual([0.0, 0.0, 1.0]);
        expect(lightComponent?.intensity).toBe(3.0);
        expect(lightComponent?.enabled).toBe(false);
      });
    });

    describe('CameraEntity deserialization', () => {
      it('should deserialize a CameraEntity', () => {
        const serialized: ISerializedEntity = {
          uuid: 'camera-uuid',
          name: 'Test Camera',
          type: 'Camera',
          transform: {
            position: [0, -10, 5],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: [
            {
              type: 'camera',
              fieldOfView: 60,
              nearClipPlane: 0.1,
              farClipPlane: 1000,
              target: [0, 0, 0],
            },
          ],
        };

        const entity = EntitySerializer.deserializeEntity(serialized);

        expect(entity.id).toBe('camera-uuid');
        expect(entity.name).toBe('Test Camera');
        expect(entity).toBeInstanceOf(CameraEntity);
      });

      it('should deserialize CameraEntity properties', () => {
        const serialized: ISerializedEntity = {
          uuid: 'camera-uuid',
          name: 'Custom Camera',
          type: 'Camera',
          transform: {
            position: [5, -15, 8],
            rotation: [30, 0, 0],
            scale: [1, 1, 1],
          },
          components: [
            {
              type: 'camera',
              fieldOfView: 90,
              nearClipPlane: 0.01,
              farClipPlane: 5000,
              target: [0, 0, 5],
            },
          ],
        };

        const entity = EntitySerializer.deserializeEntity(serialized) as CameraEntity;
        const cameraComponent = entity.getComponent<ICameraComponent>('camera');

        expect(cameraComponent?.fieldOfView).toBe(90);
        expect(cameraComponent?.nearClipPlane).toBe(0.01);
        expect(cameraComponent?.farClipPlane).toBe(5000);
      });
    });

    describe('MeshEntity deserialization', () => {
      it('should deserialize a MeshEntity', () => {
        const serialized: ISerializedEntity = {
          uuid: 'mesh-uuid',
          name: 'Test Mesh',
          type: 'MeshEntity',
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: [],
        };

        const entity = EntitySerializer.deserializeEntity(serialized);

        expect(entity.id).toBe('mesh-uuid');
        expect(entity.name).toBe('Test Mesh');
        expect(entity).toBeInstanceOf(MeshEntity);
      });

      it('should deserialize MeshEntity transform', () => {
        const serialized: ISerializedEntity = {
          uuid: 'mesh-uuid',
          name: 'Test Mesh',
          type: 'MeshEntity',
          transform: {
            position: [10, 20, 30],
            rotation: [45, 90, 180],
            scale: [0.5, 2, 1],
          },
          components: [],
        };

        const entity = EntitySerializer.deserializeEntity(serialized);

        expect(entity.transform.position).toEqual([10, 20, 30]);
        expect(entity.transform.rotation).toEqual([45, 90, 180]);
        expect(entity.transform.scale).toEqual([0.5, 2, 1]);
      });

      it('should deserialize MeshEntity with mesh asset reference', () => {
        const serialized: ISerializedEntity = {
          uuid: 'mesh-uuid',
          name: 'Imported Mesh',
          type: 'MeshEntity',
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: [],
          metadata: {
            meshAssetRef: { uuid: 'mesh-asset-uuid', type: 'mesh' },
          },
        };

        const entity = EntitySerializer.deserializeEntity(serialized) as MeshEntity;

        expect(entity.meshAssetRef).toEqual({ uuid: 'mesh-asset-uuid', type: 'mesh' });
      });

      it('should deserialize MeshEntity material component', () => {
        const serialized: ISerializedEntity = {
          uuid: 'mesh-uuid',
          name: 'Test Mesh',
          type: 'MeshEntity',
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: [
            {
              type: 'material',
              shaderName: 'pbr',
              color: [1.0, 0.5, 0.0],
              opacity: 0.8,
              transparent: false,
            },
          ],
        };

        const entity = EntitySerializer.deserializeEntity(serialized) as MeshEntity;
        const material = entity.getComponent<IMaterialComponent>('material');

        expect(material).toBeDefined();
        expect(material?.shaderName).toBe('pbr');
        expect(material?.color).toEqual([1.0, 0.5, 0.0]);
        expect(material?.opacity).toBe(0.8);
      });
    });

    describe('GroupEntity deserialization', () => {
      it('should deserialize a GroupEntity', () => {
        const serialized: ISerializedEntity = {
          uuid: 'group-uuid',
          name: 'Test Group',
          type: 'GroupEntity',
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: [],
        };

        const entity = EntitySerializer.deserializeEntity(serialized);

        expect(entity.id).toBe('group-uuid');
        expect(entity.name).toBe('Test Group');
        expect(entity).toBeInstanceOf(GroupEntity);
      });

      it('should deserialize GroupEntity transform', () => {
        const serialized: ISerializedEntity = {
          uuid: 'group-uuid',
          name: 'Test Group',
          type: 'GroupEntity',
          transform: {
            position: [5, 10, 15],
            rotation: [30, 60, 90],
            scale: [2, 2, 2],
          },
          components: [],
        };

        const entity = EntitySerializer.deserializeEntity(serialized);

        expect(entity.transform.position).toEqual([5, 10, 15]);
        expect(entity.transform.rotation).toEqual([30, 60, 90]);
        expect(entity.transform.scale).toEqual([2, 2, 2]);
      });

      it('should deserialize GroupEntity and preserve isMeshGroup', () => {
        const serialized: ISerializedEntity = {
          uuid: 'group-uuid',
          name: 'Mesh Group',
          type: 'GroupEntity',
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: [],
          metadata: {
            isMeshGroup: true,
          },
        };

        const entity = EntitySerializer.deserializeEntity(serialized) as GroupEntity;

        expect(entity.isMeshGroup).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should throw for unknown entity type', () => {
        const serialized: ISerializedEntity = {
          uuid: 'unknown-uuid',
          name: 'Unknown',
          type: 'UnknownType' as any,
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: [],
        };

        expect(() => EntitySerializer.deserializeEntity(serialized)).toThrow(
          'Unknown entity type: "UnknownType"'
        );
      });
    });
  });

  describe('serializeEntities', () => {
    it('should serialize an array of entities', () => {
      const cube = new Cube('cube-id', 'Cube');
      const sphere = new Sphere('sphere-id', 'Sphere');

      const serialized = EntitySerializer.serializeEntities([cube, sphere]);

      expect(serialized).toHaveLength(2);
      expect(serialized[0].type).toBe('Cube');
      expect(serialized[1].type).toBe('Sphere');
    });

    it('should return empty array for empty input', () => {
      const serialized = EntitySerializer.serializeEntities([]);

      expect(serialized).toEqual([]);
    });

    it('should preserve entity order', () => {
      const entities = [
        new DirectionalLight({ name: 'Light' }),
        new Cube('cube-id', 'Cube'),
        new Sphere('sphere-id', 'Sphere'),
      ];

      const serialized = EntitySerializer.serializeEntities(entities);

      expect(serialized[0].type).toBe('DirectionalLight');
      expect(serialized[1].type).toBe('Cube');
      expect(serialized[2].type).toBe('Sphere');
    });
  });

  describe('deserializeEntities', () => {
    it('should deserialize an array of entities', () => {
      const serializedData: ISerializedEntity[] = [
        {
          uuid: 'cube-uuid',
          name: 'Cube',
          type: 'Cube',
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
        },
        {
          uuid: 'sphere-uuid',
          name: 'Sphere',
          type: 'Sphere',
          transform: { position: [5, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
        },
      ];

      const entities = EntitySerializer.deserializeEntities(serializedData);

      expect(entities).toHaveLength(2);
      expect(entities[0]).toBeInstanceOf(Cube);
      expect(entities[1]).toBeInstanceOf(Sphere);
    });

    it('should reconstruct parent-child hierarchy', () => {
      const serializedData: ISerializedEntity[] = [
        {
          uuid: 'parent-uuid',
          name: 'Parent Cube',
          type: 'Cube',
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
        },
        {
          uuid: 'child-uuid',
          name: 'Child Cube',
          type: 'Cube',
          parentUuid: 'parent-uuid',
          transform: { position: [2, 0, 0], rotation: [0, 0, 0], scale: [0.5, 0.5, 0.5] },
          components: [],
        },
      ];

      const entities = EntitySerializer.deserializeEntities(serializedData);

      expect(entities[0].id).toBe('parent-uuid');
      expect(entities[1].id).toBe('child-uuid');
      expect(entities[1].parent).toBe(entities[0]);
      expect(entities[0].children).toContain(entities[1]);
    });

    it('should handle missing parent gracefully', () => {
      const serializedData: ISerializedEntity[] = [
        {
          uuid: 'orphan-uuid',
          name: 'Orphan Cube',
          type: 'Cube',
          parentUuid: 'non-existent-parent',
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
        },
      ];

      const entities = EntitySerializer.deserializeEntities(serializedData);

      expect(entities).toHaveLength(1);
      expect(entities[0].parent).toBeNull();
    });

    it('should return empty array for empty input', () => {
      const entities = EntitySerializer.deserializeEntities([]);

      expect(entities).toEqual([]);
    });

    it('should handle complex hierarchy', () => {
      const serializedData: ISerializedEntity[] = [
        {
          uuid: 'root-uuid',
          name: 'Root',
          type: 'Cube',
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
        },
        {
          uuid: 'child1-uuid',
          name: 'Child 1',
          type: 'Sphere',
          parentUuid: 'root-uuid',
          transform: { position: [1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
        },
        {
          uuid: 'child2-uuid',
          name: 'Child 2',
          type: 'Sphere',
          parentUuid: 'root-uuid',
          transform: { position: [-1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
        },
        {
          uuid: 'grandchild-uuid',
          name: 'Grandchild',
          type: 'Cube',
          parentUuid: 'child1-uuid',
          transform: { position: [0, 1, 0], rotation: [0, 0, 0], scale: [0.5, 0.5, 0.5] },
          components: [],
        },
      ];

      const entities = EntitySerializer.deserializeEntities(serializedData);

      expect(entities).toHaveLength(4);

      const root = entities.find(e => e.id === 'root-uuid')!;
      const child1 = entities.find(e => e.id === 'child1-uuid')!;
      const child2 = entities.find(e => e.id === 'child2-uuid')!;
      const grandchild = entities.find(e => e.id === 'grandchild-uuid')!;

      expect(root.children).toContain(child1);
      expect(root.children).toContain(child2);
      expect(child1.parent).toBe(root);
      expect(child2.parent).toBe(root);
      expect(grandchild.parent).toBe(child1);
      expect(child1.children).toContain(grandchild);
    });
  });

  describe('round-trip serialization', () => {
    it('should preserve Cube data through serialize/deserialize cycle', () => {
      const original = new Cube('test-id', 'Test Cube');
      original.transform.position = [5, 10, 15];
      original.transform.rotation = [30, 60, 90];
      original.transform.scale = [2, 3, 4];

      const serialized = EntitySerializer.serializeEntity(original);
      const deserialized = EntitySerializer.deserializeEntity(serialized) as Cube;

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.name).toBe(original.name);
      expect(deserialized.transform.position).toEqual(original.transform.position);
      expect(deserialized.transform.rotation).toEqual(original.transform.rotation);
      expect(deserialized.transform.scale).toEqual(original.transform.scale);
    });

    it('should preserve Sphere data through serialize/deserialize cycle', () => {
      const original = new Sphere('test-id', 'Test Sphere', {
        segments: 48,
        rings: 24,
        radius: 2.5,
      });
      original.transform.position = [1, 2, 3];

      const serialized = EntitySerializer.serializeEntity(original);
      const deserialized = EntitySerializer.deserializeEntity(serialized) as Sphere;

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.name).toBe(original.name);
      expect(deserialized.transform.position).toEqual(original.transform.position);
    });

    it('should preserve DirectionalLight data through serialize/deserialize cycle', () => {
      const original = new DirectionalLight({
        name: 'Test Light',
        color: [0.8, 0.6, 0.4],
        intensity: 2.5,
      });
      original.transform.rotation = [45, 30, 0];

      const serialized = EntitySerializer.serializeEntity(original);
      const deserialized = EntitySerializer.deserializeEntity(serialized) as DirectionalLight;

      expect(deserialized.name).toBe(original.name);

      const origLight = original.getComponent<ILightComponent>('light');
      const deserLight = deserialized.getComponent<ILightComponent>('light');

      expect(deserLight?.color).toEqual(origLight?.color);
      expect(deserLight?.intensity).toBe(origLight?.intensity);
    });

    it('should preserve CameraEntity data through serialize/deserialize cycle', () => {
      const original = new CameraEntity({
        id: 'camera-id',
        name: 'Test Camera',
        fieldOfView: 75,
        nearClipPlane: 0.5,
        farClipPlane: 2000,
      });
      original.transform.position = [0, -20, 10];

      const serialized = EntitySerializer.serializeEntity(original);
      const deserialized = EntitySerializer.deserializeEntity(serialized) as CameraEntity;

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.name).toBe(original.name);
      expect(deserialized.transform.position).toEqual(original.transform.position);

      const origCamera = original.getComponent<ICameraComponent>('camera');
      const deserCamera = deserialized.getComponent<ICameraComponent>('camera');

      expect(deserCamera?.fieldOfView).toBe(origCamera?.fieldOfView);
      expect(deserCamera?.nearClipPlane).toBe(origCamera?.nearClipPlane);
      expect(deserCamera?.farClipPlane).toBe(origCamera?.farClipPlane);
    });

    it('should preserve MeshEntity data through serialize/deserialize cycle', () => {
      const original = new MeshEntity('mesh-id', 'Test Mesh');
      original.transform.position = [5, 10, 15];
      original.transform.rotation = [30, 60, 90];
      original.transform.scale = [2, 3, 4];
      original.meshAssetRef = { uuid: 'mesh-asset-uuid', type: 'mesh' };

      const serialized = EntitySerializer.serializeEntity(original);
      const deserialized = EntitySerializer.deserializeEntity(serialized) as MeshEntity;

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.name).toBe(original.name);
      expect(deserialized.transform.position).toEqual(original.transform.position);
      expect(deserialized.transform.rotation).toEqual(original.transform.rotation);
      expect(deserialized.transform.scale).toEqual(original.transform.scale);
      expect(deserialized.meshAssetRef).toEqual(original.meshAssetRef);
    });

    it('should preserve GroupEntity data through serialize/deserialize cycle', () => {
      const original = new GroupEntity('Test Group', 'group-id');
      original.transform.position = [1, 2, 3];
      original.transform.rotation = [15, 30, 45];
      original.transform.scale = [1.5, 1.5, 1.5];

      const serialized = EntitySerializer.serializeEntity(original);
      const deserialized = EntitySerializer.deserializeEntity(serialized) as GroupEntity;

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.name).toBe(original.name);
      expect(deserialized.transform.position).toEqual(original.transform.position);
      expect(deserialized.transform.rotation).toEqual(original.transform.rotation);
      expect(deserialized.transform.scale).toEqual(original.transform.scale);
      expect(deserialized.isMeshGroup).toBe(original.isMeshGroup);
    });
  });

  describe('isTypeSupported', () => {
    it('should return true for supported types', () => {
      expect(EntitySerializer.isTypeSupported('Cube')).toBe(true);
      expect(EntitySerializer.isTypeSupported('Sphere')).toBe(true);
      expect(EntitySerializer.isTypeSupported('DirectionalLight')).toBe(true);
      expect(EntitySerializer.isTypeSupported('Camera')).toBe(true);
      expect(EntitySerializer.isTypeSupported('MeshEntity')).toBe(true);
      expect(EntitySerializer.isTypeSupported('GroupEntity')).toBe(true);
    });

    it('should return false for unsupported types', () => {
      expect(EntitySerializer.isTypeSupported('Unknown')).toBe(false);
      expect(EntitySerializer.isTypeSupported('Mesh')).toBe(false);
      expect(EntitySerializer.isTypeSupported('')).toBe(false);
    });
  });

  describe('getSupportedTypes', () => {
    it('should return all supported entity types', () => {
      const types = EntitySerializer.getSupportedTypes();

      expect(types).toContain('Cube');
      expect(types).toContain('Sphere');
      expect(types).toContain('DirectionalLight');
      expect(types).toContain('Camera');
      expect(types).toContain('MeshEntity');
      expect(types).toContain('GroupEntity');
    });

    it('should return an array', () => {
      const types = EntitySerializer.getSupportedTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('registerEntityFactory', () => {
    it('should allow registering custom entity factories', () => {
      // Register a mock factory for testing
      const mockFactory = (data: ISerializedEntity) => {
        const cube = new Cube(data.uuid, data.name);
        return cube;
      };

      // This shouldn't throw
      registerEntityFactory('Cube', mockFactory);

      // The factory should now work
      const serialized: ISerializedEntity = {
        uuid: 'custom-uuid',
        name: 'Custom',
        type: 'Cube',
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        components: [],
      };

      const entity = EntitySerializer.deserializeEntity(serialized);
      expect(entity.id).toBe('custom-uuid');
    });
  });

  describe('imported model hierarchy serialization', () => {
    it('should serialize GroupEntity with MeshEntity children', () => {
      const group = new GroupEntity('CarModel', 'car-group-id');
      const body = new MeshEntity('body-id', 'Body');
      const wheel = new MeshEntity('wheel-id', 'Wheel');

      body.parent = group as any;
      wheel.parent = group as any;
      group.children.push(body as any, wheel as any);

      const groupSerialized = EntitySerializer.serializeEntity(group);
      const bodySerialized = EntitySerializer.serializeEntity(body);
      const wheelSerialized = EntitySerializer.serializeEntity(wheel);

      expect(groupSerialized.type).toBe('GroupEntity');
      expect(bodySerialized.type).toBe('MeshEntity');
      expect(bodySerialized.parentUuid).toBe('car-group-id');
      expect(wheelSerialized.parentUuid).toBe('car-group-id');
    });

    it('should deserialize imported model hierarchy', () => {
      const serializedData: ISerializedEntity[] = [
        {
          uuid: 'model-root-uuid',
          name: 'ImportedModel',
          type: 'GroupEntity',
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
          metadata: { isMeshGroup: true },
        },
        {
          uuid: 'mesh-1-uuid',
          name: 'Mesh1',
          type: 'MeshEntity',
          parentUuid: 'model-root-uuid',
          transform: { position: [1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
          metadata: { meshAssetRef: { uuid: 'asset-1', type: 'mesh' } },
        },
        {
          uuid: 'mesh-2-uuid',
          name: 'Mesh2',
          type: 'MeshEntity',
          parentUuid: 'model-root-uuid',
          transform: { position: [-1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
          metadata: { meshAssetRef: { uuid: 'asset-2', type: 'mesh' } },
        },
      ];

      const entities = EntitySerializer.deserializeEntities(serializedData);

      expect(entities).toHaveLength(3);

      const root = entities.find(e => e.id === 'model-root-uuid')!;
      const mesh1 = entities.find(e => e.id === 'mesh-1-uuid')!;
      const mesh2 = entities.find(e => e.id === 'mesh-2-uuid')!;

      expect(root).toBeInstanceOf(GroupEntity);
      expect(mesh1).toBeInstanceOf(MeshEntity);
      expect(mesh2).toBeInstanceOf(MeshEntity);

      expect(mesh1.parent).toBe(root);
      expect(mesh2.parent).toBe(root);
      expect(root.children).toContain(mesh1);
      expect(root.children).toContain(mesh2);
    });

    it('should handle nested GroupEntity hierarchy', () => {
      const serializedData: ISerializedEntity[] = [
        {
          uuid: 'root-group-uuid',
          name: 'Root',
          type: 'GroupEntity',
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
        },
        {
          uuid: 'child-group-uuid',
          name: 'ChildGroup',
          type: 'GroupEntity',
          parentUuid: 'root-group-uuid',
          transform: { position: [0, 0, 1], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
        },
        {
          uuid: 'nested-mesh-uuid',
          name: 'NestedMesh',
          type: 'MeshEntity',
          parentUuid: 'child-group-uuid',
          transform: { position: [1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          components: [],
          metadata: { meshAssetRef: { uuid: 'mesh-asset', type: 'mesh' } },
        },
      ];

      const entities = EntitySerializer.deserializeEntities(serializedData);

      expect(entities).toHaveLength(3);

      const rootGroup = entities.find(e => e.id === 'root-group-uuid')!;
      const childGroup = entities.find(e => e.id === 'child-group-uuid')!;
      const nestedMesh = entities.find(e => e.id === 'nested-mesh-uuid')!;

      expect(childGroup.parent).toBe(rootGroup);
      expect(nestedMesh.parent).toBe(childGroup);
      expect(rootGroup.children).toContain(childGroup);
      expect(childGroup.children).toContain(nestedMesh);
    });

    it('should round-trip complex imported model hierarchy', () => {
      // Build a hierarchy: GroupEntity -> 2 MeshEntities
      const rootGroup = new GroupEntity('Model', 'model-uuid');
      rootGroup.transform.position = [5, 5, 5];

      const meshA = new MeshEntity('mesh-a-uuid', 'MeshA');
      meshA.transform.position = [1, 0, 0];
      meshA.meshAssetRef = { uuid: 'mesh-asset-a', type: 'mesh' };
      meshA.parent = rootGroup as any;

      const meshB = new MeshEntity('mesh-b-uuid', 'MeshB');
      meshB.transform.position = [-1, 0, 0];
      meshB.meshAssetRef = { uuid: 'mesh-asset-b', type: 'mesh' };
      meshB.parent = rootGroup as any;

      rootGroup.children.push(meshA as any, meshB as any);

      // Serialize
      const serialized = EntitySerializer.serializeEntities([rootGroup as any, meshA, meshB]);

      // Deserialize
      const deserialized = EntitySerializer.deserializeEntities(serialized);

      const deserRoot = deserialized.find(e => e.id === 'model-uuid')! as GroupEntity;
      const deserMeshA = deserialized.find(e => e.id === 'mesh-a-uuid')! as MeshEntity;
      const deserMeshB = deserialized.find(e => e.id === 'mesh-b-uuid')! as MeshEntity;

      // Verify
      expect(deserRoot).toBeInstanceOf(GroupEntity);
      expect(deserRoot.transform.position).toEqual([5, 5, 5]);
      expect(deserRoot.isMeshGroup).toBe(true);

      expect(deserMeshA).toBeInstanceOf(MeshEntity);
      expect(deserMeshA.transform.position).toEqual([1, 0, 0]);
      expect(deserMeshA.meshAssetRef).toEqual({ uuid: 'mesh-asset-a', type: 'mesh' });
      expect(deserMeshA.parent).toBe(deserRoot);

      expect(deserMeshB).toBeInstanceOf(MeshEntity);
      expect(deserMeshB.transform.position).toEqual([-1, 0, 0]);
      expect(deserMeshB.meshAssetRef).toEqual({ uuid: 'mesh-asset-b', type: 'mesh' });
      expect(deserMeshB.parent).toBe(deserRoot);

      expect(deserRoot.children).toContain(deserMeshA);
      expect(deserRoot.children).toContain(deserMeshB);
    });
  });
});
