/**
 * ModelAssetMetaFactory Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModelAssetMetaFactory } from '../../../src/core/assets/ModelAssetMetaFactory';
import type { IGLTFImportResult } from '../../../src/plugins/importers/gltf/GLTFImportService';

describe('ModelAssetMetaFactory', () => {
  let factory: ModelAssetMetaFactory;

  beforeEach(() => {
    factory = new ModelAssetMetaFactory();
  });

  const createMockGLTFResult = (): IGLTFImportResult => ({
    meshes: [
      {
        name: 'Mesh1',
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint16Array([0, 1, 2]),
        bounds: { min: [0, 0, 0], max: [1, 1, 0] },
        vertexCount: 3,
        triangleCount: 1,
        materialIndex: 0,
      },
      {
        name: 'Mesh2',
        positions: new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint16Array([0, 1, 2]),
        bounds: { min: [0, 0, 0], max: [2, 2, 0] },
        vertexCount: 3,
        triangleCount: 1,
      },
    ],
    materials: [
      {
        name: 'Material1',
        baseColor: [1, 0, 0],
        alpha: 1,
        metallic: 0.5,
        roughness: 0.5,
        transparent: false,
      },
    ],
    hierarchy: [
      {
        name: 'Root',
        meshIndex: 0,
        materialIndices: [0],
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        children: [
          {
            name: 'Child',
            meshIndex: 1,
            transform: {
              position: [1, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            },
            children: [],
          },
        ],
      },
    ],
    warnings: [],
  });

  describe('createFromGLTFResult', () => {
    it('should create a valid IModelAssetMeta', () => {
      const gltfResult = createMockGLTFResult();
      const meta = factory.createFromGLTFResult(
        gltfResult,
        'model.glb',
        'Assets/Models/model.glb',
        'size:1234:mtime:1234567890'
      );

      expect(meta.version).toBe(1);
      expect(meta.type).toBe('model');
      expect(meta.uuid).toBeDefined();
      expect(meta.uuid.length).toBe(36); // UUID format
      expect(meta.sourcePath).toBe('Assets/Models/model.glb');
      expect(meta.sourceHash).toBe('size:1234:mtime:1234567890');
      expect(meta.isDirty).toBe(false);
      expect(meta.importedAt).toBeDefined();
    });

    it('should create mesh references with UUIDs', () => {
      const gltfResult = createMockGLTFResult();
      const meta = factory.createFromGLTFResult(
        gltfResult,
        'model.glb',
        'Assets/Models/model.glb',
        'size:1234:mtime:1234567890'
      );

      expect(meta.contents.meshes).toHaveLength(2);
      expect(meta.contents.meshes[0].uuid).toBeDefined();
      expect(meta.contents.meshes[0].name).toBe('Mesh1');
      expect(meta.contents.meshes[0].sourceIndex).toBe(0);
      expect(meta.contents.meshes[0].vertexCount).toBe(3);
      expect(meta.contents.meshes[0].triangleCount).toBe(1);

      expect(meta.contents.meshes[1].name).toBe('Mesh2');
      expect(meta.contents.meshes[1].sourceIndex).toBe(1);
    });

    it('should create material references with UUIDs', () => {
      const gltfResult = createMockGLTFResult();
      const meta = factory.createFromGLTFResult(
        gltfResult,
        'model.glb',
        'Assets/Models/model.glb',
        'size:1234:mtime:1234567890'
      );

      expect(meta.contents.materials).toHaveLength(1);
      expect(meta.contents.materials[0].uuid).toBeDefined();
      expect(meta.contents.materials[0].name).toBe('Material1');
      expect(meta.contents.materials[0].sourceIndex).toBe(0);
      expect(meta.contents.materials[0].isOverridden).toBe(false);
    });

    it('should convert hierarchy to model meta nodes', () => {
      const gltfResult = createMockGLTFResult();
      const meta = factory.createFromGLTFResult(
        gltfResult,
        'model.glb',
        'Assets/Models/model.glb',
        'size:1234:mtime:1234567890'
      );

      expect(meta.hierarchy).toHaveLength(1);
      expect(meta.hierarchy[0].name).toBe('Root');
      expect(meta.hierarchy[0].meshIndex).toBe(0);
      expect(meta.hierarchy[0].materialIndices).toEqual([0]);
      expect(meta.hierarchy[0].transform.position).toEqual([0, 0, 0]);
      expect(meta.hierarchy[0].children).toHaveLength(1);
      expect(meta.hierarchy[0].children[0].name).toBe('Child');
    });

    it('should apply default import settings', () => {
      const gltfResult = createMockGLTFResult();
      const meta = factory.createFromGLTFResult(
        gltfResult,
        'model.glb',
        'Assets/Models/model.glb',
        'size:1234:mtime:1234567890'
      );

      expect(meta.importSettings.scaleFactor).toBe(1.0);
      expect(meta.importSettings.convertCoordinates.sourceUp).toBe('Y');
      expect(meta.importSettings.convertCoordinates.convertToZUp).toBe(true);
      expect(meta.importSettings.meshes.generateNormals).toBe(true);
      expect(meta.importSettings.materials.importMaterials).toBe(true);
    });

    it('should apply custom import settings', () => {
      const gltfResult = createMockGLTFResult();
      const meta = factory.createFromGLTFResult(
        gltfResult,
        'model.glb',
        'Assets/Models/model.glb',
        'size:1234:mtime:1234567890',
        {
          scaleFactor: 0.01,
          convertCoordinates: { sourceUp: 'Z', convertToZUp: false },
        }
      );

      expect(meta.importSettings.scaleFactor).toBe(0.01);
      expect(meta.importSettings.convertCoordinates.sourceUp).toBe('Z');
      expect(meta.importSettings.convertCoordinates.convertToZUp).toBe(false);
    });
  });

  describe('updateMeshReferences', () => {
    it('should preserve existing UUIDs when updating', () => {
      const gltfResult = createMockGLTFResult();
      const existingMeta = factory.createFromGLTFResult(
        gltfResult,
        'model.glb',
        'Assets/Models/model.glb',
        'size:1234:mtime:1234567890'
      );

      const originalUuid = existingMeta.contents.meshes[0].uuid;

      // Update with new meshes (same indices)
      const updatedRefs = factory.updateMeshReferences(existingMeta, gltfResult.meshes);

      expect(updatedRefs[0].uuid).toBe(originalUuid);
      expect(updatedRefs[0].sourceIndex).toBe(0);
    });

    it('should generate new UUIDs for new meshes', () => {
      const gltfResult = createMockGLTFResult();
      const existingMeta = factory.createFromGLTFResult(
        gltfResult,
        'model.glb',
        'Assets/Models/model.glb',
        'size:1234:mtime:1234567890'
      );

      // Add a new mesh
      const newMeshes: IGLTFImportResult['meshes'] = [
        ...gltfResult.meshes,
        {
          name: 'NewMesh',
          positions: new Float32Array([0, 0, 0]),
          normals: new Float32Array([0, 0, 1]),
          indices: new Uint16Array([0]),
          bounds: { min: [0, 0, 0], max: [0, 0, 0] },
          vertexCount: 1,
          triangleCount: 0,
        },
      ];

      const updatedRefs = factory.updateMeshReferences(existingMeta, newMeshes);

      expect(updatedRefs).toHaveLength(3);
      expect(updatedRefs[2].uuid).toBeDefined();
      expect(updatedRefs[2].name).toBe('NewMesh');
      expect(updatedRefs[2].sourceIndex).toBe(2);
    });
  });

  describe('updateMaterialReferences', () => {
    it('should preserve existing UUIDs and override state', () => {
      const gltfResult = createMockGLTFResult();
      const existingMeta = factory.createFromGLTFResult(
        gltfResult,
        'model.glb',
        'Assets/Models/model.glb',
        'size:1234:mtime:1234567890'
      );

      // Mark the material as overridden
      existingMeta.contents.materials[0].isOverridden = true;
      existingMeta.contents.materials[0].overrideUuid = 'override-uuid';

      const originalUuid = existingMeta.contents.materials[0].uuid;

      const updatedRefs = factory.updateMaterialReferences(existingMeta, gltfResult.materials);

      expect(updatedRefs[0].uuid).toBe(originalUuid);
      expect(updatedRefs[0].isOverridden).toBe(true);
      expect(updatedRefs[0].overrideUuid).toBe('override-uuid');
    });
  });

  describe('createUpdatedContents', () => {
    it('should create updated contents preserving UUIDs', () => {
      const gltfResult = createMockGLTFResult();
      const existingMeta = factory.createFromGLTFResult(
        gltfResult,
        'model.glb',
        'Assets/Models/model.glb',
        'size:1234:mtime:1234567890'
      );

      const originalMeshUuid = existingMeta.contents.meshes[0].uuid;
      const originalMaterialUuid = existingMeta.contents.materials[0].uuid;

      const updatedContents = factory.createUpdatedContents(existingMeta, gltfResult);

      expect(updatedContents.meshes[0].uuid).toBe(originalMeshUuid);
      expect(updatedContents.materials[0].uuid).toBe(originalMaterialUuid);
    });
  });
});
