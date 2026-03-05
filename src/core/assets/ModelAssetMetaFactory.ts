/**
 * ModelAssetMetaFactory - Factory for creating IModelAssetMeta instances
 *
 * Converts GLTF import results into the IModelAssetMeta format for
 * storage as .assetmeta companion files.
 *
 * @example
 * ```typescript
 * const factory = new ModelAssetMetaFactory();
 *
 * // Create meta from GLTF import result
 * const meta = factory.createFromGLTFResult(
 *   gltfResult,
 *   'car.glb',
 *   'Assets/Models/car.glb',
 *   sourceHash
 * );
 * ```
 */

import { generateUUID } from '@utils/uuid';
import {
  MODEL_ASSET_META_VERSION,
  type IModelAssetMeta,
  type IModelImportSettings,
  type IModelMetaContents,
  type IModelMetaNode,
} from './interfaces/IModelAssetMeta';
import {
  type IDerivedMeshRef,
  type IDerivedMaterialRef,
} from './interfaces/IAssetMeta';
import { createDefaultModelImportSettings } from './DefaultImportSettings';
import type {
  IGLTFMeshData,
  IGLTFMaterialData,
  IGLTFNodeData,
  IGLTFImportResult,
} from '@plugins/importers/gltf/GLTFImportService';

/**
 * Factory for creating model asset metadata.
 */
export class ModelAssetMetaFactory {
  /**
   * Create a model asset meta from GLTF import results.
   *
   * @param gltfResult - The result from GLTFImportService
   * @param _sourceFilename - Name of the source file (e.g., "car.glb") - reserved for future use
   * @param sourcePath - Relative path from project root (e.g., "Assets/Models/car.glb")
   * @param sourceHash - Hash of the source file for change detection
   * @param importSettings - Optional custom import settings
   * @returns The created model asset meta
   */
  createFromGLTFResult(
    gltfResult: IGLTFImportResult,
    _sourceFilename: string,
    sourcePath: string,
    sourceHash: string,
    importSettings?: Partial<IModelImportSettings>
  ): IModelAssetMeta {
    const now = new Date().toISOString();

    // Create mesh references with UUIDs
    const meshRefs = this.createMeshReferences(gltfResult.meshes);

    // Create material references with UUIDs
    const materialRefs = this.createMaterialReferences(gltfResult.materials);

    // Convert GLTF hierarchy to model meta nodes
    const hierarchy = this.convertHierarchy(gltfResult.hierarchy);

    return {
      version: MODEL_ASSET_META_VERSION,
      uuid: generateUUID(),
      type: 'model',
      importedAt: now,
      sourceHash,
      isDirty: false,
      sourcePath,
      importSettings: {
        ...createDefaultModelImportSettings(),
        ...importSettings,
      },
      contents: {
        meshes: meshRefs,
        materials: materialRefs,
      },
      hierarchy,
    };
  }

  /**
   * Create mesh references from GLTF mesh data.
   * Each mesh gets a stable UUID that will be used for scene references.
   */
  private createMeshReferences(meshes: IGLTFMeshData[]): IDerivedMeshRef[] {
    return meshes.map((mesh, index) => ({
      uuid: generateUUID(),
      name: mesh.name,
      sourceIndex: index,
      vertexCount: mesh.vertexCount,
      triangleCount: mesh.triangleCount,
    }));
  }

  /**
   * Create material references from GLTF material data.
   * Imported materials are read-only by default (isOverridden: false).
   */
  private createMaterialReferences(materials: IGLTFMaterialData[]): IDerivedMaterialRef[] {
    return materials.map((material, index) => ({
      uuid: generateUUID(),
      name: material.name,
      sourceIndex: index,
      isOverridden: false,
    }));
  }

  /**
   * Convert GLTF hierarchy to model meta nodes.
   */
  private convertHierarchy(nodes: IGLTFNodeData[]): IModelMetaNode[] {
    return nodes.map(node => this.convertNode(node));
  }

  /**
   * Convert a single GLTF node to model meta node format.
   */
  private convertNode(node: IGLTFNodeData): IModelMetaNode {
    return {
      name: node.name,
      meshIndex: node.meshIndex,
      materialIndices: node.materialIndices,
      transform: {
        position: [...node.transform.position],
        rotation: [...node.transform.rotation],
        scale: [...node.transform.scale],
      },
      children: node.children.map(child => this.convertNode(child)),
    };
  }

  /**
   * Update mesh references in an existing meta with new import data.
   * Preserves existing UUIDs where possible (matched by sourceIndex).
   *
   * @param existingMeta - The existing model asset meta
   * @param newMeshes - New mesh data from reimport
   * @returns Updated mesh references
   */
  updateMeshReferences(
    existingMeta: IModelAssetMeta,
    newMeshes: IGLTFMeshData[]
  ): IDerivedMeshRef[] {
    const existingByIndex = new Map<number, IDerivedMeshRef>();
    for (const mesh of existingMeta.contents.meshes) {
      existingByIndex.set(mesh.sourceIndex, mesh);
    }

    return newMeshes.map((mesh, index) => {
      const existing = existingByIndex.get(index);

      if (existing) {
        // Preserve UUID, update other fields
        return {
          ...existing,
          name: mesh.name,
          vertexCount: mesh.vertexCount,
          triangleCount: mesh.triangleCount,
        };
      }

      // New mesh, create new reference
      return {
        uuid: generateUUID(),
        name: mesh.name,
        sourceIndex: index,
        vertexCount: mesh.vertexCount,
        triangleCount: mesh.triangleCount,
      };
    });
  }

  /**
   * Update material references in an existing meta with new import data.
   * Preserves existing UUIDs and override state where possible.
   *
   * @param existingMeta - The existing model asset meta
   * @param newMaterials - New material data from reimport
   * @returns Updated material references
   */
  updateMaterialReferences(
    existingMeta: IModelAssetMeta,
    newMaterials: IGLTFMaterialData[]
  ): IDerivedMaterialRef[] {
    const existingByIndex = new Map<number, IDerivedMaterialRef>();
    for (const material of existingMeta.contents.materials) {
      existingByIndex.set(material.sourceIndex, material);
    }

    return newMaterials.map((material, index) => {
      const existing = existingByIndex.get(index);

      if (existing) {
        // Preserve UUID and override state, update name
        return {
          ...existing,
          name: material.name,
        };
      }

      // New material, create new reference
      return {
        uuid: generateUUID(),
        name: material.name,
        sourceIndex: index,
        isOverridden: false,
      };
    });
  }

  /**
   * Create updated contents for reimport, preserving UUIDs.
   *
   * @param existingMeta - The existing model asset meta
   * @param gltfResult - New import result
   * @returns Updated contents
   */
  createUpdatedContents(
    existingMeta: IModelAssetMeta,
    gltfResult: IGLTFImportResult
  ): IModelMetaContents {
    return {
      meshes: this.updateMeshReferences(existingMeta, gltfResult.meshes),
      materials: this.updateMaterialReferences(existingMeta, gltfResult.materials),
    };
  }
}
