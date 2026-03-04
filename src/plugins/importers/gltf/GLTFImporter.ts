/**
 * GLTFImporter - Plugin for importing GLTF/GLB 3D models
 *
 * This importer plugin uses GLTFImportService to parse GLTF files and
 * creates scene objects (MeshEntity instances) from the imported data.
 *
 * Features:
 * - Imports .gltf and .glb files
 * - Converts geometry from Y-up to Z-up coordinate system
 * - Extracts PBR materials from GLTF files
 * - Preserves scene hierarchy with parent-child relationships
 *
 * @example
 * ```typescript
 * const importer = new GLTFImporter(importService, assetRegistry);
 *
 * if (importer.canImport(file)) {
 *   const result = await importer.import(file);
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
import { generateUUID } from '@utils/uuid';
import { MeshEntity } from '@plugins/primitives/MeshEntity';
import { GroupEntity } from '@plugins/primitives/GroupEntity';
import { BUILT_IN_SHADER_IDS } from '@core/assets/BuiltInShaders';
import {
  GLTFImportService,
  type IGLTFMeshData,
  type IGLTFMaterialData,
  type IGLTFNodeData,
} from './GLTFImportService';

/**
 * Extended import result that includes asset information.
 */
export interface GLTFImportResult extends ImportResult {
  /** The mesh assets created during import */
  meshAssets: IMeshAsset[];
  /** The material assets created during import */
  materialAssets: IMaterialAsset[];
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
  readonly version = '1.0.0';
  readonly supportedExtensions = ['.gltf', '.glb'];

  private readonly importService: GLTFImportService;
  private readonly assetRegistry: AssetRegistry;
  private readonly materialFactory: MaterialAssetFactory;

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
  }

  /**
   * Initialize the importer plugin.
   * Currently a no-op as the importer doesn't require async initialization.
   */
  async initialize(_context: IPluginContext): Promise<void> {
    // No async initialization needed
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
   * Parses the file, creates mesh and material assets, registers them,
   * and creates MeshEntity scene objects from the hierarchy.
   *
   * @param file - The file to import
   * @returns Import result with scene objects and warnings
   */
  async import(file: File): Promise<GLTFImportResult> {
    // Parse the GLTF file
    const gltfResult = await this.importService.import(file);

    // Create and register mesh assets
    const meshAssets = this.createMeshAssets(gltfResult.meshes, file.name);

    // Create and register material assets
    const materialAssets = this.createMaterialAssets(gltfResult.materials);

    // Register all assets
    for (const mesh of meshAssets) {
      this.assetRegistry.register(mesh);
    }
    for (const material of materialAssets) {
      this.assetRegistry.register(material);
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
    };
  }

  /**
   * Create mesh assets from extracted GLTF mesh data.
   */
  private createMeshAssets(
    meshes: IGLTFMeshData[],
    _sourceFilename: string
  ): IMeshAsset[] {
    const now = new Date().toISOString();

    return meshes.map((mesh, index) => {
      const uuid = generateUUID();

      return {
        uuid,
        name: mesh.name || `Mesh_${index}`,
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
   */
  private createMaterialAssets(materials: IGLTFMaterialData[]): IMaterialAsset[] {
    return materials.map((mat) => {
      return this.materialFactory.create({
        name: mat.name,
        shaderRef: { uuid: BUILT_IN_SHADER_IDS.PBR, type: 'shader' },
        parameters: {
          albedo: mat.baseColor,
          metallic: mat.metallic,
          roughness: mat.roughness,
          opacity: mat.alpha,
        },
      });
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
   * Creates MeshEntity for nodes with meshes, SceneObject for group nodes.
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
      // No mesh - create a group node (SceneObject) if it has children
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
