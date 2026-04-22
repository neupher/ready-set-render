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

import type { IImporter, ImportOptions, ImportResult } from '@core/interfaces';
import type { IEntity } from '@core/interfaces/IEntity';
import type { IPluginContext } from '@core/interfaces/IPlugin';
import type { AssetRegistry } from '@core/assets/AssetRegistry';
import type { MaterialAssetFactory } from '@core/assets/MaterialAssetFactory';
import type { IMaterialAsset } from '@core/assets/interfaces/IMaterialAsset';
import type { IMeshAsset } from '@core/assets/interfaces/IMeshAsset';
import type { IModelAsset } from '@core/assets/interfaces/IModelAsset';
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
import { ModelAssetFactory } from '@core/assets/ModelAssetFactory';
import {
  GLTFImportService,
  type IGLTFMeshData,
  type IGLTFMaterialData,
  type IGLTFNodeData,
} from './GLTFImportService';

/**
 * Options for importing a GLTF file.
 *
 * Extends the standard `ImportOptions` with GLTF-specific overrides.
 * GLTF-specific `importSettings` are also accepted via the inherited
 * `settings` field, but the typed property is preferred for type safety.
 */
export interface GLTFImportOptions extends ImportOptions {
  /**
   * Custom GLTF import settings to override defaults.
   * Equivalent to passing `settings: { ...importSettings }` via the
   * generic `ImportOptions.settings` field.
   */
  importSettings?: Partial<IModelImportSettings>;
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
  private readonly modelAssetFactory: ModelAssetFactory;
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
    this.modelAssetFactory = new ModelAssetFactory();
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
   * @returns Standard ImportResult with entities, assets, primaryAssetId, warnings
   */
  async import(file: File, options: GLTFImportOptions = {}): Promise<ImportResult> {
    // Parse the GLTF file
    const gltfResult = await this.importService.import(file);

    // Compute source file hash for change detection
    const sourceHash = this.sourceHashService.computeQuickHash(file);

    // Determine the source path
    const sourcePath = options.sourcePath || file.name;

    // Resolve GLTF-specific import settings: prefer typed `importSettings`,
    // fall back to the generic `settings` field for cross-importer callers.
    const importSettings =
      options.importSettings ??
      (options.settings as Partial<IModelImportSettings> | undefined);

    // Create the asset meta (this generates UUIDs for meshes/materials)
    const assetMeta = this.modelMetaFactory.createFromGLTFResult(
      gltfResult,
      file.name,
      sourcePath,
      sourceHash,
      importSettings
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

    // Synthesize an IModelAsset and register it so downstream consumers
    // (instantiation, drag-and-drop, scene serialization) can look up the
    // model by its UUID. Idempotent — a previously registered model with the
    // same UUID is replaced.
    const modelAsset = this.modelAssetFactory.fromMeta(assetMeta, file.name);
    if (this.assetRegistry.get(modelAsset.uuid)) {
      this.assetRegistry.unregister(modelAsset.uuid);
    }
    this.assetRegistry.register(modelAsset);

    // Save .assetmeta to project folder if available
    if (!options.skipMeta && this.projectService?.isProjectOpen) {
      await this.saveAssetMeta(file.name, sourcePath, assetMeta);
    }

    // Create scene objects from hierarchy
    const entities = this.createSceneObjects(
      gltfResult.hierarchy,
      meshAssets,
      materialAssets
    );

    return {
      entities,
      assets: [modelAsset, ...meshAssets, ...materialAssets],
      primaryAssetId: assetMeta.uuid,
      warnings: gltfResult.warnings,
    };
  }

  /**
   * Load a previously-imported `.glb`/`.gltf` using its existing `.assetmeta`.
   *
   * Used when reopening a project: the source file and meta both already
   * exist on disk; we just need to repopulate the in-memory `AssetRegistry`
   * (model + derived meshes/materials) with the UUIDs preserved from the meta.
   *
   * Does not write the `.assetmeta`; does not touch the source file. Idempotent
   * — re-running for the same UUIDs replaces the existing registry entries.
   *
   * @param file - The source file (read by the caller from project sources)
   * @param existingMeta - The deserialized companion `.assetmeta` contents
   * @returns The registered mesh, material, and model assets
   */
  async loadFromMeta(
    file: File,
    existingMeta: IModelAssetMeta
  ): Promise<{
    meshAssets: IMeshAsset[];
    materialAssets: IMaterialAsset[];
    modelAsset: IModelAsset;
  }> {
    // Parse the source file
    const gltfResult = await this.importService.import(file);

    // Create mesh assets with UUIDs preserved from the meta
    const meshAssets = this.createMeshAssets(
      gltfResult.meshes,
      existingMeta.contents.meshes
    );

    // Create material assets with UUIDs preserved from the meta
    const materialAssets = this.createMaterialAssets(
      gltfResult.materials,
      existingMeta.contents.materials
    );

    // Replace any existing registrations for these UUIDs (idempotent reload)
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

    // Synthesize and register the IModelAsset (no parse-of-source needed —
    // the meta carries the same data)
    const modelAsset = this.modelAssetFactory.fromMeta(existingMeta, file.name);
    if (this.assetRegistry.get(modelAsset.uuid)) {
      this.assetRegistry.unregister(modelAsset.uuid);
    }
    this.assetRegistry.register(modelAsset);

    return { meshAssets, materialAssets, modelAsset };
  }

  /**
   * Reimport a model using existing .assetmeta settings.
   * Preserves UUIDs so scene references remain valid.
   *
   * @param file - The source file to reimport
   * @param existingMeta - The existing asset meta to update
   * @returns Standard ImportResult with entities, assets, primaryAssetId, warnings
   */
  async reimport(
    file: File,
    existingMeta: IModelAssetMeta
  ): Promise<ImportResult> {
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

    // Replace the IModelAsset registration with the updated metadata
    const modelAsset = this.modelAssetFactory.fromMeta(updatedMeta, file.name);
    if (this.assetRegistry.get(modelAsset.uuid)) {
      this.assetRegistry.unregister(modelAsset.uuid);
    }
    this.assetRegistry.register(modelAsset);

    // Save updated .assetmeta
    if (this.projectService?.isProjectOpen) {
      await this.saveAssetMeta(file.name, existingMeta.sourcePath, updatedMeta);
    }

    // Create scene objects
    const entities = this.createSceneObjects(
      gltfResult.hierarchy,
      meshAssets,
      materialAssets
    );

    return {
      entities,
      assets: [modelAsset, ...meshAssets, ...materialAssets],
      primaryAssetId: updatedMeta.uuid,
      warnings: gltfResult.warnings,
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
   * Create scene entities from GLTF hierarchy, preserving parent-child relationships.
   * Returns only root-level entities; children are attached to their parents.
   */
  private createSceneObjects(
    hierarchy: IGLTFNodeData[],
    meshAssets: IMeshAsset[],
    materialAssets: IMaterialAsset[]
  ): IEntity[] {
    const rootEntities: IEntity[] = [];

    for (const node of hierarchy) {
      const entity = this.createNodeWithHierarchy(
        node,
        meshAssets,
        materialAssets
      );
      if (entity) {
        rootEntities.push(entity);
      }
    }

    return rootEntities;
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
  ): IEntity | null {
    let entity: IEntity;

    // Create appropriate object type based on whether node has a mesh
    if (node.meshIndex !== undefined) {
      const meshAsset = meshAssets[node.meshIndex];
      if (meshAsset) {
        const meshEntity = new MeshEntity(undefined, node.name);

        // Set mesh asset reference
        meshEntity.meshAssetRef = {
          uuid: meshAsset.uuid,
          type: 'mesh',
        } as IAssetReference;

        // Apply local transform (relative to parent)
        meshEntity.transform.position = [...node.transform.position];
        meshEntity.transform.rotation = [...node.transform.rotation];
        meshEntity.transform.scale = [...node.transform.scale];

        // Apply material if available
        if (node.materialIndices && node.materialIndices.length > 0) {
          const materialAsset = materialAssets[node.materialIndices[0]];
          if (materialAsset) {
            const materialComponent = meshEntity.getComponent('material');
            if (materialComponent) {
              (materialComponent as { materialAssetRef?: IAssetReference }).materialAssetRef = {
                uuid: materialAsset.uuid,
                type: 'material',
              };
            }
          }
        }

        entity = meshEntity;
      } else {
        // Mesh asset not found, create empty group
        const group = new GroupEntity(node.name);
        group.transform.position = [...node.transform.position];
        group.transform.rotation = [...node.transform.rotation];
        group.transform.scale = [...node.transform.scale];
        entity = group;
      }
    } else {
      // No mesh - create a group node if it has children
      // Skip empty nodes with no children
      if (node.children.length === 0) {
        return null;
      }

      const group = new GroupEntity(node.name);
      group.transform.position = [...node.transform.position];
      group.transform.rotation = [...node.transform.rotation];
      group.transform.scale = [...node.transform.scale];
      entity = group;
    }

    // Recursively create and attach children
    for (const childNode of node.children) {
      const childEntity = this.createNodeWithHierarchy(
        childNode,
        meshAssets,
        materialAssets
      );
      if (childEntity) {
        // Set up parent-child relationship
        childEntity.parent = entity;
        entity.children.push(childEntity);
      }
    }

    return entity;
  }
}
