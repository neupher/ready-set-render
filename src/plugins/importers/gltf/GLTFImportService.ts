/**
 * GLTFImportService - Core GLTF/GLB parsing and extraction
 *
 * Uses @gltf-transform/core to parse GLTF 2.0 files and extract:
 * - Geometry data (positions, normals, UVs, indices)
 * - Material properties (PBR metallic-roughness workflow)
 * - Scene hierarchy (nodes, transforms)
 *
 * All imported geometry is converted from GLTF's Y-up coordinate system
 * to the project's Z-up coordinate system (Blender convention).
 *
 * @example
 * ```typescript
 * const service = new GLTFImportService();
 * const result = await service.import(file);
 * console.log(`Imported ${result.meshes.length} meshes`);
 * ```
 */

import { Document, WebIO } from '@gltf-transform/core';
import type { Node, Mesh, Material, Primitive, Scene } from '@gltf-transform/core';
import type { IMeshBounds } from '@core/assets/interfaces/IMeshAsset';

/**
 * Extracted mesh data from a GLTF primitive.
 */
export interface IGLTFMeshData {
  /** Display name of the mesh */
  name: string;
  /** Vertex positions (Z-up converted) */
  positions: Float32Array;
  /** Vertex normals (Z-up converted) */
  normals: Float32Array;
  /** UV texture coordinates (optional) */
  uvs?: Float32Array;
  /** Triangle indices */
  indices: Uint16Array | Uint32Array;
  /** Computed axis-aligned bounding box */
  bounds: IMeshBounds;
  /** Number of vertices */
  vertexCount: number;
  /** Number of triangles */
  triangleCount: number;
  /** Index of the material used by this mesh (if any) */
  materialIndex?: number;
}

/**
 * Extracted material data from a GLTF material.
 */
export interface IGLTFMaterialData {
  /** Display name of the material */
  name: string;
  /** Base color RGB (0-1 range) */
  baseColor: [number, number, number];
  /** Alpha/opacity value (0-1) */
  alpha: number;
  /** Metallic factor (0-1) */
  metallic: number;
  /** Roughness factor (0-1) */
  roughness: number;
  /** Whether the material has transparency */
  transparent: boolean;
  /** Emissive color RGB (0-1 range) */
  emissive?: [number, number, number];
}

/**
 * A node in the extracted scene hierarchy.
 */
export interface IGLTFNodeData {
  /** Display name of the node */
  name: string;
  /** Index into the meshes array (if this node has geometry) */
  meshIndex?: number;
  /** Indices into the materials array (for multi-material meshes) */
  materialIndices?: number[];
  /** Local transform (Z-up converted) */
  transform: {
    position: [number, number, number];
    rotation: [number, number, number]; // Euler angles in degrees
    scale: [number, number, number];
  };
  /** Child nodes */
  children: IGLTFNodeData[];
}

/**
 * Complete result of importing a GLTF/GLB file.
 */
export interface IGLTFImportResult {
  /** All extracted meshes */
  meshes: IGLTFMeshData[];
  /** All extracted materials */
  materials: IGLTFMaterialData[];
  /** Scene hierarchy (root-level nodes) */
  hierarchy: IGLTFNodeData[];
  /** Any warnings encountered during import */
  warnings: string[];
}

/**
 * Service for importing GLTF/GLB files.
 */
export class GLTFImportService {
  private io: WebIO;

  /** Map from GLTF mesh to its index in the result meshes array */
  private meshIndexMap: Map<Mesh, number[]> = new Map();

  /** Map from GLTF material to its index in the result materials array */
  private materialIndexMap: Map<Material, number> = new Map();

  constructor() {
    this.io = new WebIO();
  }

  /**
   * Import a GLTF/GLB file.
   *
   * @param file - The file to import
   * @returns The extracted meshes, materials, and hierarchy
   */
  async import(file: File): Promise<IGLTFImportResult> {
    const warnings: string[] = [];

    // Read the file
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Determine format and parse
    let doc: Document;
    if (file.name.toLowerCase().endsWith('.glb')) {
      doc = await this.io.readBinary(uint8Array);
    } else {
      // For .gltf files, we need to handle as JSON
      const text = new TextDecoder().decode(uint8Array);
      doc = await this.io.readJSON({ json: JSON.parse(text), resources: {} });
    }

    // Reset index maps
    this.meshIndexMap.clear();
    this.materialIndexMap.clear();

    // Extract materials first (meshes reference them)
    const materials = this.extractMaterials(doc, warnings);

    // Extract meshes
    const meshes = this.extractMeshes(doc, warnings);

    // Extract hierarchy
    const hierarchy = this.extractHierarchy(doc, warnings);

    return {
      meshes,
      materials,
      hierarchy,
      warnings,
    };
  }

  /**
   * Extract all materials from the GLTF document.
   */
  private extractMaterials(doc: Document, warnings: string[]): IGLTFMaterialData[] {
    const materials: IGLTFMaterialData[] = [];
    const gltfMaterials = doc.getRoot().listMaterials();

    for (const mat of gltfMaterials) {
      try {
        const baseColorFactor = mat.getBaseColorFactor();
        const metallicFactor = mat.getMetallicFactor();
        const roughnessFactor = mat.getRoughnessFactor();
        const emissiveFactor = mat.getEmissiveFactor();
        const alphaMode = mat.getAlphaMode();

        const materialData: IGLTFMaterialData = {
          name: mat.getName() || `Material_${materials.length}`,
          baseColor: [baseColorFactor[0], baseColorFactor[1], baseColorFactor[2]],
          alpha: baseColorFactor[3],
          metallic: metallicFactor,
          roughness: roughnessFactor,
          transparent: alphaMode === 'BLEND' || alphaMode === 'MASK',
        };

        // Add emissive if non-zero
        if (emissiveFactor[0] > 0 || emissiveFactor[1] > 0 || emissiveFactor[2] > 0) {
          materialData.emissive = [emissiveFactor[0], emissiveFactor[1], emissiveFactor[2]];
        }

        this.materialIndexMap.set(mat, materials.length);
        materials.push(materialData);
      } catch (error) {
        warnings.push(`Failed to extract material: ${error}`);
      }
    }

    return materials;
  }

  /**
   * Extract all meshes from the GLTF document.
   */
  private extractMeshes(doc: Document, warnings: string[]): IGLTFMeshData[] {
    const meshes: IGLTFMeshData[] = [];
    const gltfMeshes = doc.getRoot().listMeshes();

    for (const mesh of gltfMeshes) {
      const primitiveIndices: number[] = [];

      for (const primitive of mesh.listPrimitives()) {
        try {
          const meshData = this.extractPrimitive(
            mesh.getName() || `Mesh_${meshes.length}`,
            primitive,
            warnings
          );

          if (meshData) {
            primitiveIndices.push(meshes.length);
            meshes.push(meshData);
          }
        } catch (error) {
          warnings.push(`Failed to extract mesh primitive: ${error}`);
        }
      }

      this.meshIndexMap.set(mesh, primitiveIndices);
    }

    return meshes;
  }

  /**
   * Extract geometry data from a single GLTF primitive.
   */
  private extractPrimitive(
    meshName: string,
    primitive: Primitive,
    warnings: string[]
  ): IGLTFMeshData | null {
    // Get position accessor
    const positionAccessor = primitive.getAttribute('POSITION');
    if (!positionAccessor) {
      warnings.push(`Primitive has no POSITION attribute, skipping`);
      return null;
    }

    const positionArray = positionAccessor.getArray();
    if (!positionArray) {
      warnings.push(`Could not get position array, skipping primitive`);
      return null;
    }

    // Convert positions from Y-up to Z-up
    const positions = this.convertCoordinates(new Float32Array(positionArray));

    // Get normals (optional but recommended)
    let normals: Float32Array;
    const normalAccessor = primitive.getAttribute('NORMAL');
    if (normalAccessor) {
      const normalArray = normalAccessor.getArray();
      if (normalArray) {
        normals = this.convertCoordinates(new Float32Array(normalArray));
      } else {
        warnings.push(`Could not get normal array, generating flat normals`);
        normals = this.generateFlatNormals(positions);
      }
    } else {
      warnings.push(`Primitive has no NORMAL attribute, generating flat normals`);
      normals = this.generateFlatNormals(positions);
    }

    // Get UVs (optional)
    let uvs: Float32Array | undefined;
    const uvAccessor = primitive.getAttribute('TEXCOORD_0');
    if (uvAccessor) {
      const uvArray = uvAccessor.getArray();
      if (uvArray) {
        uvs = new Float32Array(uvArray);
      }
    }

    // Get indices
    const indicesAccessor = primitive.getIndices();
    let indices: Uint16Array | Uint32Array;

    if (indicesAccessor) {
      const indexArray = indicesAccessor.getArray();
      if (indexArray) {
        // Use Uint16Array if indices fit, otherwise Uint32Array
        const maxIndex = Math.max(...indexArray);
        if (maxIndex <= 65535) {
          indices = new Uint16Array(indexArray);
        } else {
          indices = new Uint32Array(indexArray);
        }
      } else {
        // Generate sequential indices
        indices = this.generateSequentialIndices(positions.length / 3);
      }
    } else {
      // Generate sequential indices for non-indexed geometry
      indices = this.generateSequentialIndices(positions.length / 3);
    }

    // Get material index
    const material = primitive.getMaterial();
    const materialIndex = material ? this.materialIndexMap.get(material) : undefined;

    // Calculate bounds
    const bounds = this.calculateBounds(positions);

    const vertexCount = positions.length / 3;
    const triangleCount = indices.length / 3;

    // Create unique name for multi-primitive meshes
    const name = meshName;

    return {
      name,
      positions,
      normals,
      uvs,
      indices,
      bounds,
      vertexCount,
      triangleCount,
      materialIndex,
    };
  }

  /**
   * Extract the scene hierarchy from the GLTF document.
   */
  private extractHierarchy(doc: Document, warnings: string[]): IGLTFNodeData[] {
    const scenes = doc.getRoot().listScenes();
    if (scenes.length === 0) {
      warnings.push('No scenes found in GLTF file');
      return [];
    }

    // Use the first (default) scene
    const scene = scenes[0];
    return this.extractSceneNodes(scene, warnings);
  }

  /**
   * Extract nodes from a GLTF scene.
   */
  private extractSceneNodes(scene: Scene, warnings: string[]): IGLTFNodeData[] {
    const nodes: IGLTFNodeData[] = [];

    for (const node of scene.listChildren()) {
      try {
        const nodeData = this.extractNode(node, warnings);
        if (nodeData) {
          nodes.push(nodeData);
        }
      } catch (error) {
        warnings.push(`Failed to extract node: ${error}`);
      }
    }

    return nodes;
  }

  /**
   * Extract a single node and its children.
   */
  private extractNode(node: Node, warnings: string[]): IGLTFNodeData | null {
    // Get transform
    const translation = node.getTranslation();
    const rotation = node.getRotation(); // Quaternion [x, y, z, w]
    const scale = node.getScale();

    // Convert position from Y-up to Z-up
    const position = this.convertPosition(translation);

    // Convert quaternion to Euler angles (Z-up)
    const eulerRotation = this.quaternionToEulerZUp(rotation);

    // Convert scale (swap Y and Z)
    const convertedScale: [number, number, number] = [
      scale[0],
      scale[2],
      scale[1],
    ];

    // Get mesh indices
    const mesh = node.getMesh();
    let meshIndex: number | undefined;
    let materialIndices: number[] | undefined;

    if (mesh) {
      const indices = this.meshIndexMap.get(mesh);
      if (indices && indices.length > 0) {
        // For simplicity, use the first primitive's index
        meshIndex = indices[0];

        // Collect all material indices from primitives
        materialIndices = [];
        for (const primitive of mesh.listPrimitives()) {
          const mat = primitive.getMaterial();
          if (mat) {
            const matIndex = this.materialIndexMap.get(mat);
            if (matIndex !== undefined && !materialIndices.includes(matIndex)) {
              materialIndices.push(matIndex);
            }
          }
        }
        if (materialIndices.length === 0) {
          materialIndices = undefined;
        }
      }
    }

    // Extract children
    const children: IGLTFNodeData[] = [];
    for (const child of node.listChildren()) {
      try {
        const childData = this.extractNode(child, warnings);
        if (childData) {
          children.push(childData);
        }
      } catch (error) {
        warnings.push(`Failed to extract child node: ${error}`);
      }
    }

    // Skip empty nodes with no mesh and no children
    if (meshIndex === undefined && children.length === 0) {
      return null;
    }

    return {
      name: node.getName() || `Node`,
      meshIndex,
      materialIndices,
      transform: {
        position,
        rotation: eulerRotation,
        scale: convertedScale,
      },
      children,
    };
  }

  /**
   * Convert coordinates from GLTF Y-up to project Z-up.
   * GLTF: +X right, +Y up, +Z forward (towards viewer)
   * Project: +X right, +Y forward, +Z up
   *
   * Conversion: X stays, Y = -Z, Z = Y
   */
  private convertCoordinates(data: Float32Array): Float32Array {
    const result = new Float32Array(data.length);

    for (let i = 0; i < data.length; i += 3) {
      result[i] = data[i];           // X stays
      result[i + 1] = -data[i + 2];  // Y = -Z (GLTF Z is towards viewer)
      result[i + 2] = data[i + 1];   // Z = Y (GLTF Y is up)
    }

    return result;
  }

  /**
   * Convert a single position from Y-up to Z-up.
   */
  private convertPosition(pos: number[]): [number, number, number] {
    return [pos[0], -pos[2], pos[1]];
  }

  /**
   * Convert quaternion rotation to Euler angles in Z-up coordinate system.
   * Returns [rx, ry, rz] in degrees.
   */
  private quaternionToEulerZUp(q: number[]): [number, number, number] {
    // First convert quaternion from Y-up to Z-up
    // Quaternion transformation for coordinate system change
    const qx = q[0];
    const qy = -q[2];  // Swap and negate
    const qz = q[1];   // Swap
    const qw = q[3];

    // Convert quaternion to Euler angles (XYZ order)
    // Roll (X-axis rotation)
    const sinr_cosp = 2 * (qw * qx + qy * qz);
    const cosr_cosp = 1 - 2 * (qx * qx + qy * qy);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    // Pitch (Y-axis rotation)
    const sinp = 2 * (qw * qy - qz * qx);
    let pitch: number;
    if (Math.abs(sinp) >= 1) {
      pitch = Math.sign(sinp) * Math.PI / 2; // Use 90 degrees if out of range
    } else {
      pitch = Math.asin(sinp);
    }

    // Yaw (Z-axis rotation)
    const siny_cosp = 2 * (qw * qz + qx * qy);
    const cosy_cosp = 1 - 2 * (qy * qy + qz * qz);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    // Convert to degrees
    const RAD_TO_DEG = 180 / Math.PI;
    return [
      roll * RAD_TO_DEG,
      pitch * RAD_TO_DEG,
      yaw * RAD_TO_DEG,
    ];
  }

  /**
   * Generate flat shading normals from positions.
   */
  private generateFlatNormals(positions: Float32Array): Float32Array {
    const normals = new Float32Array(positions.length);

    for (let i = 0; i < positions.length; i += 9) {
      // Get three vertices of the triangle
      const v0 = [positions[i], positions[i + 1], positions[i + 2]];
      const v1 = [positions[i + 3], positions[i + 4], positions[i + 5]];
      const v2 = [positions[i + 6], positions[i + 7], positions[i + 8]];

      // Calculate edges
      const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
      const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

      // Cross product
      const nx = e1[1] * e2[2] - e1[2] * e2[1];
      const ny = e1[2] * e2[0] - e1[0] * e2[2];
      const nz = e1[0] * e2[1] - e1[1] * e2[0];

      // Normalize
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const invLen = len > 0 ? 1 / len : 0;

      const normalX = nx * invLen;
      const normalY = ny * invLen;
      const normalZ = nz * invLen;

      // Set normal for all three vertices
      for (let j = 0; j < 9; j += 3) {
        normals[i + j] = normalX;
        normals[i + j + 1] = normalY;
        normals[i + j + 2] = normalZ;
      }
    }

    return normals;
  }

  /**
   * Generate sequential indices for non-indexed geometry.
   */
  private generateSequentialIndices(vertexCount: number): Uint16Array | Uint32Array {
    if (vertexCount <= 65535) {
      const indices = new Uint16Array(vertexCount);
      for (let i = 0; i < vertexCount; i++) {
        indices[i] = i;
      }
      return indices;
    } else {
      const indices = new Uint32Array(vertexCount);
      for (let i = 0; i < vertexCount; i++) {
        indices[i] = i;
      }
      return indices;
    }
  }

  /**
   * Calculate axis-aligned bounding box from positions.
   */
  private calculateBounds(positions: Float32Array): IMeshBounds {
    if (positions.length === 0) {
      return {
        min: [0, 0, 0],
        max: [0, 0, 0],
      };
    }

    const min: [number, number, number] = [
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    ];
    const max: [number, number, number] = [
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      min[0] = Math.min(min[0], x);
      min[1] = Math.min(min[1], y);
      min[2] = Math.min(min[2], z);

      max[0] = Math.max(max[0], x);
      max[1] = Math.max(max[1], y);
      max[2] = Math.max(max[2], z);
    }

    return { min, max };
  }
}
