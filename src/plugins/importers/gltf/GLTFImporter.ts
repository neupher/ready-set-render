/**
 * GLTFImporter - Plugin for importing GLTF/GLB 3D models
 *
 * This importer plugin uses GLTFImportService to parse GLTF files and
 * creates scene objects (MeshEntity instances) from the imported data.
 *
 * Phase 2 Update: Now creates .assetmeta companion files instead of separate
 * asset JSON files. Source files stay in place and are not duplicated.
 *
 * Features:
 * - Imports .gltf and .glb files
 * - Converts geometry from Y-up to Z-up coordinate system
 * - Extracts PBR materials from GLTF files
 * - Preserves scene hierarchy with parent-child relationships
 * - Creates .assetmeta files for project persistence (Unity-style)
 * - Mesh data loaded from .glb on demand (not stored separately)
 *
 * @example
 * ```typescript
 * const importer = new GLTFImporter(importService, assetRegistry, materialFactory);
 *
 * if (importer.canImport(file)) {
 *   const result = await importer.import(file, { sourcePath: 'Assets/Models/car.glb' });
 *   // Add root objects - children are already attached
 *   result.objects.forEach(obj => sceneGraph.add(obj));
 * }
 * ```
 */

import type { IImporter, ImportResult, ISceneObject } from '@core/interfaces';
import type { IPluginContext } from '@core/interfaces/IPlugin';
import type { AssetRegistry } from '@core/assets/AssetRegistry';
import type { MaterialAssetFactory } from '@core/assets/MaterialAssetFactory';
import type { IMaterialAsset } from '@core/assets/interfaces/IMaterialAsset';
import type { IMeshAsset } from '@core/assets/interfaces/IMeshAsset';
import type { IAssetReference } from '@core/assets/interfaces/IAssetReference';
import type { ProjectService } from '@core/ProjectService';
import type { IModelAssetMeta, IModelImportSettings } from '@core/assets/interfaces/IModelAssetMeta';
import type { IDerivedMeshRef, IDerivedMaterialRef } from '@core/assets/interfaces/IAssetMeta';
import { MeshEntity } from '@plugins/primitives/MeshEntity';
import { GroupEntity } from '@plugins/primitives/GroupEntity';
import { BUILT_IN_SHADER_IDS } from '@core/assets/BuiltInShaders';
import { AssetMetaService } from '@core/assets/AssetMetaService';
import { SourceHashService } from '@core/assets/SourceHashService';
import { ModelAssetMetaFactory } from '@core/assets/ModelAssetMetaFactory';
import {
  GLTFImportService,
  type IGLTFMeshData,
  type IGLTFMaterialData,
  type IGLTFNodeData,
} from './GLTFImportService';

/**
 * Options for importing a GLTF file.
 */
export interface GLTFImportOptions {
  /**
   * Relative path where the source file is located (or will be placed).
   * Example: "Assets/Models/car.glb"
   * If not provided, file will be treated as external (no .assetmeta created).
   */
  sourcePath?: string;

  /**
   * Custom import settings to override defaults.
   */
  importSettings?: Partial<IModelImportSettings>;

  /**
   * Whether to skip creating .assetmeta file (useful for preview imports).
   * Default: false
   */
  skipMeta?: boolean;
}

/**
 * Extended import result that includes asset metadata information.
 */
export interface GLTFImportResult extends ImportResult {
  /** The mesh assets created during import (in-memory only, not saved separately) */
  meshAssets: IMeshAsset[];
  /** The material assets created during import (in-memory only, read-only from .glb) */
  materialAssets: IMaterialAsset[];
  /** The model asset metadata (if .assetmeta was created) */
  assetMeta?: IModelAssetMeta;
  /** Mesh references for scene entity binding */
  meshRefs: IDerivedMeshRef[];
  /** Material references for scene entity binding */
  materialRefs: IDerivedMaterialRef[];
}

/**
 * GLTF/GLB importer plugin.
 *
 * Implements the IImporter interface to integrate with the plugin system.
 * Uses GLTFImportService for parsing and creates scene entities from the result.
 */
export class GLTFImporter implements IImporter {
  readonly id = 'gltf-importer';
  readonly name = 'GLTF/GLB Importer';
  readonly version = '2.0.0';
  readonly supportedExtensions = ['.gltf', '.glb'];

  private readonly importService: GLTFImportService;
  private readonly assetRegistry: AssetRegistry;
  private readonly materialFactory: MaterialAssetFactory;
  private readonly assetMetaService: AssetMetaService;
  private readonly sourceHashService: SourceHashService;
  private readonly modelMetaFactory: ModelAssetMetaFactory;
  private projectService: ProjectService | null = null;

  /**
   * Create a new GLTFImporter.
   *
   * @param importService - Service for parsing GLTF files
   * @param assetRegistry - Registry for storing imported assets
   * @param materialFactory - Factory for creating material assets
   */
  constructor(
    importService: GLTFImportService,
    assetRegistry: AssetRegistry,
    materialFactory: MaterialAssetFactory
  ) {
    this.importService = importService;
    this.assetRegistry = assetRegistry;
    this.materialFactory = materialFactory;
    this.assetMetaService = new AssetMetaService();
    this.sourceHashService = new SourceHashService();
    this.modelMetaFactory = new ModelAssetMetaFactory();
  }

  /**
   * Initialize the importer plugin.
   * Reads optional services from the plugin context.
   */
  async initialize(context: IPluginContext): Promise<void> {
    this.projectService = context.projectService ?? null;
  }

  /**
   * Dispose of the importer plugin.
   * Currently a no-op as there are no resources to clean up.
   */
  async dispose(): Promise<void> {
    // No cleanup needed
  }

  /**
   * Check if this importer can handle the given file.
   *
   * @param file - The file to check
   * @returns True if file extension is .gltf or .glb
   */
  canImport(file: File): boolean {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  /**
   * Import a GLTF/GLB file.
   *
   * Parses the file, creates mesh and material assets in memory,
   * creates MeshEntity scene objects from the hierarchy, and optionally
   * saves a .assetmeta file alongside the source file.
   *
   * Note: Mesh and material data are NOT saved as separate files.
   * They are loaded from the .glb on demand. The .assetmeta file
   * contains only references (UUIDs) and import settings.
   *
   * @param file - The file to import
   * @param options - Import options (sourcePath, settings, etc.)
   * @returns Import result with scene objects and warnings
   */
  async import(file: File, options: GLTFImportOptions = {}): Promise<GLTFImportResult> {
    // Parse the GLTF file
    const gltfResult = await this.importService.import(file);

    // Compute source file hash for change detection
    const sourceHash = this.sourceHashService.computeQuickHash(file);

    // Determine the source path
    const sourcePath = options.sourcePath || file.name;

    // Create the asset meta (this generates UUIDs for meshes/materials)
    const assetMeta = this.modelMetaFactory.createFromGLTFResult(
      gltfResult,
      file.name,
      sourcePath,
      sourceHash,
      options.importSettings
    );

    // Create mesh assets using UUIDs from the meta
    const meshAssets = this.createMeshAssets(
      gltfResult.meshes,
      assetMeta.contents.meshes
    );

    // Create material assets using UUIDs from the meta
    const materialAssets = this.createMaterialAssets(
      gltfResult.materials,
      assetMeta.contents.materials
    );

    // Register assets in memory (not saved to disk separately)
    for (const mesh of meshAssets) {
      this.assetRegistry.register(mesh);
    }
    for (const material of materialAssets) {
      this.assetRegistry.register(material);
    }

    // Save .assetmeta to project folder if available
    if (!options.skipMeta && this.projectService?.isProjectOpen) {
      await this.saveAssetMeta(file.name, sourcePath, assetMeta);
    }

    // Create scene objects from hierarchy
    const objects = this.createSceneObjects(
      gltfResult.hierarchy,
      meshAssets,
      materialAssets
    );

    return {
      objects,
      warnings: gltfResult.warnings,
      meshAssets,
      materialAssets,
      assetMeta,
      meshRefs: assetMeta.contents.meshes,
      materialRefs: assetMeta.contents.materials,
    };
  }

  /**
   * Reimport a model using existing .assetmeta settings.
   * Preserves UUIDs so scene references remain valid.
   *
   * @param file - The source file to reimport
   * @param existingMeta - The existing asset meta to update
   * @returns Import result with updated data
   */
  async reimport(
    file: File,
    existingMeta: IModelAssetMeta
  ): Promise<GLTFImportResult> {
    // Parse the GLTF file with existing settings
    const gltfResult = await this.importService.import(file);

    // Compute new source hash
    const sourceHash = this.sourceHashService.computeQuickHash(file);

    // Update contents while preserving UUIDs
    const updatedContents = this.modelMetaFactory.createUpdatedContents(
      existingMeta,
      gltfResult
    );

    // Update the hierarchy
    const hierarchy = gltfResult.hierarchy.map(node => this.convertGLTFNodeToMetaNode(node));

    // Create updated meta
    const updatedMeta: IModelAssetMeta = {
      ...existingMeta,
      sourceHash,
      isDirty: false,
      importedAt: new Date().toISOString(),
      contents: updatedContents,
      hierarchy,
    };

    // Create mesh assets using preserved UUIDs
    const meshAssets = this.createMeshAssets(
      gltfResult.meshes,
      updatedMeta.contents.meshes
    );

    // Create material assets using preserved UUIDs
    const materialAssets = this.createMaterialAssets(
      gltfResult.materials,
      updatedMeta.contents.materials
    );

    // Update registry (replace existing assets)
    for (const mesh of meshAssets) {
      if (this.assetRegistry.get(mesh.uuid)) {
        this.assetRegistry.unregister(mesh.uuid);
      }
      this.assetRegistry.register(mesh);
    }
    for (const material of materialAssets) {
      if (this.assetRegistry.get(material.uuid)) {
        this.assetRegistry.unregister(material.uuid);
      }
      this.assetRegistry.register(material);
    }

    // Save updated .assetmeta
    if (this.projectService?.isProjectOpen) {
      await this.saveAssetMeta(file.name, existingMeta.sourcePath, updatedMeta);
    }

    // Create scene objects
    const objects = this.createSceneObjects(
      gltfResult.hierarchy,
      meshAssets,
      materialAssets
    );

    return {
      objects,
      warnings: gltfResult.warnings,
      meshAssets,
      materialAssets,
      assetMeta: updatedMeta,
      meshRefs: updatedMeta.contents.meshes,
      materialRefs: updatedMeta.contents.materials,
    };
  }

  /**
   * Save .assetmeta file to the project folder.
   */
  private async saveAssetMeta(
    sourceFilename: string,
    sourcePath: string,
    assetMeta: IModelAssetMeta
  ): Promise<void> {
    if (!this.projectService) {
      return;
    }

    // Get the directory handle for the source file location
    const dirHandle = await this.projectService.getDirectoryHandleForPath(sourcePath);
    if (!dirHandle) {
      console.warn('Could not get directory handle for:', sourcePath);
      return;
    }

    const result = await this.assetMetaService.saveMeta(dirHandle, sourceFilename, assetMeta);
    if (!result.success) {
      console.error('Failed to save .assetmeta:', result.error);
    }
  }

  /**
   * Convert GLTF node to model meta node format.
   */
  private convertGLTFNodeToMetaNode(node: IGLTFNodeData): IModelAssetMeta['hierarchy'][0] {
    return {
      name: node.name,
      meshIndex: node.meshIndex,
      materialIndices: node.materialIndices,
      transform: {
        position: [...node.transform.position],
        rotation: [...node.transform.rotation],
        scale: [...node.transform.scale],
      },
      children: node.children.map(child => this.convertGLTFNodeToMetaNode(child)),
    };
  }

  /**
   * Create mesh assets from extracted GLTF mesh data.
   * Uses UUIDs from the asset meta references.
   */
  private createMeshAssets(
    meshes: IGLTFMeshData[],
    meshRefs: IDerivedMeshRef[]
  ): IMeshAsset[] {
    const now = new Date().toISOString();

    return meshes.map((mesh, index) => {
      const ref = meshRefs[index];

      return {
        uuid: ref.uuid,
        name: mesh.name || ref.name,
        type: 'mesh' as const,
        version: 1,
        created: now,
        modified: now,
        isBuiltIn: false,
        positions: Array.from(mesh.positions),
        normals: Array.from(mesh.normals),
        uvs: mesh.uvs ? Array.from(mesh.uvs) : undefined,
        indices: Array.from(mesh.indices),
        bounds: mesh.bounds,
        vertexCount: mesh.vertexCount,
        triangleCount: mesh.triangleCount,
      };
    });
  }

  /**
   * Create material assets from extracted GLTF material data.
   * Uses UUIDs from the asset meta references.
   * These are read-only imported materials.
   */
  private createMaterialAssets(
    materials: IGLTFMaterialData[],
    materialRefs: IDerivedMaterialRef[]
  ): IMaterialAsset[] {
    return materials.map((mat, index) => {
      const ref = materialRefs[index];

      // Create material with the UUID from the meta reference
      const material = this.materialFactory.create({
        name: mat.name,
        shaderRef: { uuid: BUILT_IN_SHADER_IDS.PBR, type: 'shader' },
        parameters: {
          albedo: mat.baseColor,
          metallic: mat.metallic,
          roughness: mat.roughness,
          opacity: mat.alpha,
        },
      });

      // Override the UUID to match the meta reference
      return {
        ...material,
        uuid: ref.uuid,
        isReadOnly: true, // Mark as imported/read-only
      } as IMaterialAsset;
    });
  }

  /**
   * Create scene objects from GLTF hierarchy, preserving parent-child relationships.
   * Returns only root-level objects; children are attached to their parents.
   */
  private createSceneObjects(
    hierarchy: IGLTFNodeData[],
    meshAssets: IMeshAsset[],
    materialAssets: IMaterialAsset[]
  ): ISceneObject[] {
    const rootObjects: ISceneObject[] = [];

    for (const node of hierarchy) {
      const sceneObject = this.createNodeWithHierarchy(
        node,
        meshAssets,
        materialAssets
      );
      if (sceneObject) {
        rootObjects.push(sceneObject);
      }
    }

    return rootObjects;
  }

  /**
   * Create a scene object from a GLTF node, preserving hierarchy.
   * Creates MeshEntity for nodes with meshes, GroupEntity for group nodes.
   * Recursively creates and attaches child objects.
   *
   * @param node - The GLTF node data
   * @param meshAssets - All mesh assets
   * @param materialAssets - All material assets
   * @returns The created scene object with children attached, or null if node should be skipped
   */
  private createNodeWithHierarchy(
    node: IGLTFNodeData,
    meshAssets: IMeshAsset[],
    materialAssets: IMaterialAsset[]
  ): ISceneObject | null {
    let sceneObject: ISceneObject;

    // Create appropriate object type based on whether node has a mesh
    if (node.meshIndex !== undefined) {
      const meshAsset = meshAssets[node.meshIndex];
      if (meshAsset) {
        const entity = new MeshEntity(undefined, node.name);

        // Set mesh asset reference
        entity.meshAssetRef = {
          uuid: meshAsset.uuid,
          type: 'mesh',
        } as IAssetReference;

        // Apply local transform (relative to parent)
        entity.transform.position = [...node.transform.position];
        entity.transform.rotation = [...node.transform.rotation];
        entity.transform.scale = [...node.transform.scale];

        // Apply material if available
        if (node.materialIndices && node.materialIndices.length > 0) {
          const materialAsset = materialAssets[node.materialIndices[0]];
          if (materialAsset) {
            const materialComponent = entity.getComponent('material');
            if (materialComponent) {
              (materialComponent as { materialAssetRef?: IAssetReference }).materialAssetRef = {
                uuid: materialAsset.uuid,
                type: 'material',
              };
            }
          }
        }

        sceneObject = entity;
      } else {
        // Mesh asset not found, create empty group
        sceneObject = new GroupEntity(node.name);
        sceneObject.transform.position = [...node.transform.position];
        sceneObject.transform.rotation = [...node.transform.rotation];
        sceneObject.transform.scale = [...node.transform.scale];
      }
    } else {
      // No mesh - create a group node if it has children
      // Skip empty nodes with no children
      if (node.children.length === 0) {
        return null;
      }

      sceneObject = new GroupEntity(node.name);
      sceneObject.transform.position = [...node.transform.position];
      sceneObject.transform.rotation = [...node.transform.rotation];
      sceneObject.transform.scale = [...node.transform.scale];
    }

    // Recursively create and attach children
    for (const childNode of node.children) {
      const childObject = this.createNodeWithHierarchy(
        childNode,
        meshAssets,
        materialAssets
      );
      if (childObject) {
        // Set up parent-child relationship
        childObject.parent = sceneObject;
        sceneObject.children.push(childObject);
      }
    }

    return sceneObject;
  }
}
