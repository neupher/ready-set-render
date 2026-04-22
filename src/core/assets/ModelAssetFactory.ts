/**
 * ModelAssetFactory - Factory for creating model assets
 *
 * Provides methods for creating new model assets from GLTF import results,
 * and serializing/deserializing model data.
 *
 * @example
 * ```typescript
 * const factory = new ModelAssetFactory();
 *
 * // Create a new model asset from import result
 * const model = factory.createFromImport('car.glb', {
 *   meshAssets: [...],
 *   materialAssets: [...],
 *   hierarchy: [...]
 * });
 * ```
 */

import type { IModelAsset, IModelNode, ModelFormat } from './interfaces/IModelAsset';
import type { IModelAssetMeta, IModelMetaNode } from './interfaces/IModelAssetMeta';
import type { IMeshAsset } from './interfaces/IMeshAsset';
import type { IMaterialAsset } from './interfaces/IMaterialAsset';
import { MODEL_ASSET_VERSION } from './interfaces/IModelAsset';
import { generateUUID } from '../../utils/uuid';

/**
 * Result from GLTFImporter that includes assets and hierarchy.
 */
export interface IImportedModelData {
  /**
   * Mesh assets created from the import.
   */
  meshAssets: IMeshAsset[];

  /**
   * Material assets created from the import.
   */
  materialAssets: IMaterialAsset[];

  /**
   * Hierarchy nodes from the source file.
   */
  hierarchy: IModelNode[];
}

/**
 * Options for creating a new model asset.
 */
export interface IModelCreateOptions {
  /**
   * Name for the new model.
   */
  name: string;

  /**
   * Optional custom UUID. If not provided, one will be generated.
   */
  uuid?: string;

  /**
   * Optional description.
   */
  description?: string;
}

/**
 * Factory for creating model assets.
 */
export class ModelAssetFactory {
  /**
   * Create a model asset from an existing on-disk `.assetmeta` file.
   *
   * Used when loading a project that already contains imported source files —
   * the meta file holds all the data needed to reconstitute an `IModelAsset`
   * without re-parsing the source file.
   *
   * The returned asset preserves the meta's UUID so scene references stay valid.
   *
   * @param meta - The deserialized `.assetmeta` contents
   * @param sourceFilename - Original source filename (e.g., 'car.glb')
   * @returns An `IModelAsset` synthesized from the meta
   */
  fromMeta(meta: IModelAssetMeta, sourceFilename: string): IModelAsset {
    const format = this.getFormatFromFilename(sourceFilename);
    const baseName = this.getBaseNameFromFilename(sourceFilename);

    return {
      uuid: meta.uuid,
      name: baseName,
      type: 'model',
      version: MODEL_ASSET_VERSION,
      created: meta.importedAt,
      modified: meta.importedAt,
      isBuiltIn: false,
      source: {
        filename: sourceFilename,
        format,
        importedAt: meta.importedAt,
      },
      contents: {
        meshes: meta.contents.meshes.map((mesh) => ({
          uuid: mesh.uuid,
          name: mesh.name,
          vertexCount: mesh.vertexCount,
          triangleCount: mesh.triangleCount,
        })),
        materials: meta.contents.materials.map((mat) => ({
          uuid: mat.uuid,
          name: mat.name,
        })),
        textures: [],
      },
      hierarchy: meta.hierarchy.map((node) => this.metaNodeToModelNode(node)),
      description: meta.description,
    };
  }

  /**
   * Convert an `IModelMetaNode` (from `.assetmeta`) to an `IModelNode`
   * (runtime model asset). The shapes are structurally identical today, but
   * keeping the conversion explicit guards against drift.
   */
  private metaNodeToModelNode(node: IModelMetaNode): IModelNode {
    return {
      name: node.name,
      meshIndex: node.meshIndex,
      materialIndices: node.materialIndices ? [...node.materialIndices] : undefined,
      transform: {
        position: [...node.transform.position],
        rotation: [...node.transform.rotation],
        scale: [...node.transform.scale],
      },
      children: node.children.map((child) => this.metaNodeToModelNode(child)),
    };
  }

  /**
   * Create a new model asset from imported data.
   *
   * @param filename - Original source filename (e.g., 'car.glb')
   * @param importData - Data from the import process
   * @param options - Optional creation options
   * @returns A new model asset
   */
  createFromImport(
    filename: string,
    importData: IImportedModelData,
    options?: Partial<IModelCreateOptions>
  ): IModelAsset {
    const now = new Date().toISOString();
    const format = this.getFormatFromFilename(filename);
    const baseName = this.getBaseNameFromFilename(filename);

    return {
      uuid: options?.uuid ?? generateUUID(),
      name: options?.name ?? baseName,
      type: 'model',
      version: MODEL_ASSET_VERSION,
      created: now,
      modified: now,
      isBuiltIn: false,
      source: {
        filename,
        format,
        importedAt: now,
      },
      contents: {
        meshes: importData.meshAssets.map((mesh) => ({
          uuid: mesh.uuid,
          name: mesh.name,
          vertexCount: mesh.vertexCount,
          triangleCount: mesh.triangleCount,
        })),
        materials: importData.materialAssets.map((mat) => ({
          uuid: mat.uuid,
          name: mat.name,
        })),
        textures: [],
      },
      hierarchy: importData.hierarchy,
      description: options?.description,
    };
  }

  /**
   * Create a model asset from raw JSON data.
   * Used when loading from storage.
   *
   * @param data - Raw JSON data
   * @returns A model asset
   * @throws Error if the data is invalid
   */
  fromJSON(data: unknown): IModelAsset {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid model data: expected object');
    }

    const obj = data as Record<string, unknown>;

    // Validate required fields
    if (typeof obj.uuid !== 'string') {
      throw new Error('Invalid model data: missing or invalid uuid');
    }
    if (typeof obj.name !== 'string') {
      throw new Error('Invalid model data: missing or invalid name');
    }
    if (obj.type !== 'model') {
      throw new Error('Invalid model data: type must be "model"');
    }

    // Validate source
    const source = obj.source as Record<string, unknown> | null | undefined;
    if (typeof source !== 'object' || source === null) {
      throw new Error('Invalid model data: missing or invalid source');
    }
    if (typeof source.filename !== 'string') {
      throw new Error('Invalid model data: source.filename must be a string');
    }
    if (typeof source.format !== 'string') {
      throw new Error('Invalid model data: source.format must be a string');
    }

    // Validate contents
    const contents = obj.contents as Record<string, unknown> | null | undefined;
    if (typeof contents !== 'object' || contents === null) {
      throw new Error('Invalid model data: missing or invalid contents');
    }
    if (!Array.isArray(contents.meshes)) {
      throw new Error('Invalid model data: contents.meshes must be an array');
    }
    if (!Array.isArray(contents.materials)) {
      throw new Error('Invalid model data: contents.materials must be an array');
    }

    // Validate hierarchy
    if (!Array.isArray(obj.hierarchy)) {
      throw new Error('Invalid model data: hierarchy must be an array');
    }

    return {
      uuid: obj.uuid,
      name: obj.name,
      type: 'model',
      version: typeof obj.version === 'number' ? obj.version : MODEL_ASSET_VERSION,
      created: typeof obj.created === 'string' ? obj.created : new Date().toISOString(),
      modified: typeof obj.modified === 'string' ? obj.modified : new Date().toISOString(),
      isBuiltIn: false,
      source: {
        filename: source.filename,
        format: source.format as ModelFormat,
        importedAt: typeof source.importedAt === 'string' ? source.importedAt : new Date().toISOString(),
        fileSize: typeof source.fileSize === 'number' ? source.fileSize : undefined,
      },
      contents: {
        meshes: (contents.meshes as unknown[]).map((m) => this.validateMeshRef(m)),
        materials: (contents.materials as unknown[]).map((m) => this.validateMaterialRef(m)),
        textures: Array.isArray(contents.textures)
          ? (contents.textures as unknown[]).map((t) => this.validateTextureRef(t))
          : [],
      },
      hierarchy: obj.hierarchy as IModelNode[],
      description: typeof obj.description === 'string' ? obj.description : undefined,
    };
  }

  /**
   * Convert a model asset to JSON for storage.
   *
   * @param model - The model asset to convert
   * @returns JSON-serializable object
   */
  toJSON(model: IModelAsset): Record<string, unknown> {
    return {
      uuid: model.uuid,
      name: model.name,
      type: model.type,
      version: model.version,
      created: model.created,
      modified: model.modified,
      isBuiltIn: model.isBuiltIn,
      source: {
        filename: model.source.filename,
        format: model.source.format,
        importedAt: model.source.importedAt,
        fileSize: model.source.fileSize,
      },
      contents: {
        meshes: model.contents.meshes,
        materials: model.contents.materials,
        textures: model.contents.textures ?? [],
      },
      hierarchy: model.hierarchy,
      description: model.description,
    };
  }

  /**
   * Get the model format from filename extension.
   */
  private getFormatFromFilename(filename: string): ModelFormat {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'gltf') return 'gltf';
    if (ext === 'obj') return 'obj';
    return 'glb';
  }

  /**
   * Get the base name (without extension) from filename.
   */
  private getBaseNameFromFilename(filename: string): string {
    // Remove extension
    const lastDot = filename.lastIndexOf('.');
    const baseName = lastDot > 0 ? filename.substring(0, lastDot) : filename;
    // Also handle paths
    const lastSlash = Math.max(baseName.lastIndexOf('/'), baseName.lastIndexOf('\\'));
    return lastSlash >= 0 ? baseName.substring(lastSlash + 1) : baseName;
  }

  /**
   * Validate and return a mesh reference from raw data.
   */
  private validateMeshRef(data: unknown): { uuid: string; name: string; vertexCount: number; triangleCount: number } {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid mesh reference');
    }
    const ref = data as Record<string, unknown>;
    return {
      uuid: typeof ref.uuid === 'string' ? ref.uuid : '',
      name: typeof ref.name === 'string' ? ref.name : 'Unknown',
      vertexCount: typeof ref.vertexCount === 'number' ? ref.vertexCount : 0,
      triangleCount: typeof ref.triangleCount === 'number' ? ref.triangleCount : 0,
    };
  }

  /**
   * Validate and return a material reference from raw data.
   */
  private validateMaterialRef(data: unknown): { uuid: string; name: string } {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid material reference');
    }
    const ref = data as Record<string, unknown>;
    return {
      uuid: typeof ref.uuid === 'string' ? ref.uuid : '',
      name: typeof ref.name === 'string' ? ref.name : 'Unknown',
    };
  }

  /**
   * Validate and return a texture reference from raw data.
   */
  private validateTextureRef(data: unknown): { uuid: string; name: string; width?: number; height?: number } {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid texture reference');
    }
    const ref = data as Record<string, unknown>;
    return {
      uuid: typeof ref.uuid === 'string' ? ref.uuid : '',
      name: typeof ref.name === 'string' ? ref.name : 'Unknown',
      width: typeof ref.width === 'number' ? ref.width : undefined,
      height: typeof ref.height === 'number' ? ref.height : undefined,
    };
  }
}
