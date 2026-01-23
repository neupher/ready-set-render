/**
 * Mesh GPU Cache
 *
 * Centralized GPU resource management for mesh rendering.
 * Creates and caches VAOs, VBOs, and EBOs for mesh data.
 *
 * This replaces the scattered GPU resource management that was previously
 * duplicated in each primitive class (Cube, Sphere, etc.).
 *
 * @example
 * ```typescript
 * const cache = new MeshGPUCache(gl);
 *
 * // In render loop:
 * const resources = cache.getOrCreate(entity.id, meshData, program);
 * gl.bindVertexArray(resources.vao);
 * gl.drawElements(gl.TRIANGLES, resources.indexCount, gl.UNSIGNED_SHORT, 0);
 *
 * // On entity deletion:
 * cache.dispose(entity.id);
 * ```
 */

import type { IMeshData, IEdgeData } from '@core/interfaces/IMeshData';

/**
 * GPU resources for solid mesh rendering.
 */
export interface MeshGPUResources {
  /** Vertex Array Object containing all buffer bindings */
  vao: WebGLVertexArrayObject;
  /** Position buffer */
  positionVbo: WebGLBuffer;
  /** Normal buffer */
  normalVbo: WebGLBuffer;
  /** Index buffer */
  ebo: WebGLBuffer;
  /** Number of indices to draw */
  indexCount: number;
  /** UV buffer (optional) */
  uvVbo?: WebGLBuffer;
}

/**
 * GPU resources for wireframe rendering.
 */
export interface EdgeGPUResources {
  /** Vertex Array Object for wireframe */
  vao: WebGLVertexArrayObject;
  /** Position buffer for line vertices */
  positionVbo: WebGLBuffer;
  /** Number of vertices to draw (lineCount * 2) */
  vertexCount: number;
}

/**
 * Centralized cache for mesh GPU resources.
 * Prevents duplication of GPU resource management across primitives.
 */
export class MeshGPUCache {
  private readonly gl: WebGL2RenderingContext;
  private readonly solidCache = new Map<string, MeshGPUResources>();
  private readonly wireframeCache = new Map<string, EdgeGPUResources>();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Get or create solid mesh GPU resources for an entity.
   *
   * @param meshId - Unique identifier for the mesh (usually entity.id)
   * @param meshData - The mesh geometry data
   * @param program - The shader program to use for attribute locations
   * @returns GPU resources ready for rendering
   */
  getOrCreateSolid(
    meshId: string,
    meshData: IMeshData,
    program: WebGLProgram
  ): MeshGPUResources {
    // Return cached resources if available
    const cached = this.solidCache.get(meshId);
    if (cached) {
      return cached;
    }

    // Create new GPU resources
    const resources = this.createSolidResources(meshData, program);
    this.solidCache.set(meshId, resources);
    return resources;
  }

  /**
   * Get or create wireframe GPU resources for an entity.
   *
   * @param meshId - Unique identifier for the mesh (usually entity.id)
   * @param edgeData - The edge data for wireframe
   * @param program - The shader program to use for attribute locations
   * @returns GPU resources ready for wireframe rendering
   */
  getOrCreateWireframe(
    meshId: string,
    edgeData: IEdgeData,
    program: WebGLProgram
  ): EdgeGPUResources {
    // Return cached resources if available
    const cached = this.wireframeCache.get(meshId);
    if (cached) {
      return cached;
    }

    // Create new GPU resources
    const resources = this.createWireframeResources(edgeData, program);
    this.wireframeCache.set(meshId, resources);
    return resources;
  }

  /**
   * Check if solid resources exist for a mesh.
   */
  hasSolidResources(meshId: string): boolean {
    return this.solidCache.has(meshId);
  }

  /**
   * Check if wireframe resources exist for a mesh.
   */
  hasWireframeResources(meshId: string): boolean {
    return this.wireframeCache.has(meshId);
  }

  /**
   * Dispose GPU resources for a specific mesh.
   */
  dispose(meshId: string): void {
    this.disposeSolid(meshId);
    this.disposeWireframe(meshId);
  }

  /**
   * Dispose solid GPU resources for a specific mesh.
   */
  disposeSolid(meshId: string): void {
    const resources = this.solidCache.get(meshId);
    if (resources) {
      this.deleteSolidResources(resources);
      this.solidCache.delete(meshId);
    }
  }

  /**
   * Dispose wireframe GPU resources for a specific mesh.
   */
  disposeWireframe(meshId: string): void {
    const resources = this.wireframeCache.get(meshId);
    if (resources) {
      this.deleteWireframeResources(resources);
      this.wireframeCache.delete(meshId);
    }
  }

  /**
   * Dispose all cached GPU resources.
   */
  disposeAll(): void {
    for (const resources of this.solidCache.values()) {
      this.deleteSolidResources(resources);
    }
    this.solidCache.clear();

    for (const resources of this.wireframeCache.values()) {
      this.deleteWireframeResources(resources);
    }
    this.wireframeCache.clear();
  }

  /**
   * Get the number of cached solid meshes.
   */
  getSolidCacheSize(): number {
    return this.solidCache.size;
  }

  /**
   * Get the number of cached wireframe meshes.
   */
  getWireframeCacheSize(): number {
    return this.wireframeCache.size;
  }

  /**
   * Create solid mesh GPU resources.
   */
  private createSolidResources(
    meshData: IMeshData,
    program: WebGLProgram
  ): MeshGPUResources {
    const gl = this.gl;

    // Create VAO
    const vao = gl.createVertexArray();
    if (!vao) {
      throw new Error('Failed to create VAO for solid mesh');
    }
    gl.bindVertexArray(vao);

    // Create and fill position VBO
    const positionVbo = gl.createBuffer();
    if (!positionVbo) {
      throw new Error('Failed to create position VBO');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, positionVbo);
    gl.bufferData(gl.ARRAY_BUFFER, meshData.positions, gl.STATIC_DRAW);

    const aPositionLoc = gl.getAttribLocation(program, 'aPosition');
    if (aPositionLoc >= 0) {
      gl.enableVertexAttribArray(aPositionLoc);
      gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);
    }

    // Create and fill normal VBO
    const normalVbo = gl.createBuffer();
    if (!normalVbo) {
      throw new Error('Failed to create normal VBO');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, normalVbo);
    gl.bufferData(gl.ARRAY_BUFFER, meshData.normals, gl.STATIC_DRAW);

    const aNormalLoc = gl.getAttribLocation(program, 'aNormal');
    if (aNormalLoc >= 0) {
      gl.enableVertexAttribArray(aNormalLoc);
      gl.vertexAttribPointer(aNormalLoc, 3, gl.FLOAT, false, 0, 0);
    }

    // Create UV VBO if UV data exists
    let uvVbo: WebGLBuffer | undefined;
    if (meshData.uvs) {
      uvVbo = gl.createBuffer() ?? undefined;
      if (uvVbo) {
        gl.bindBuffer(gl.ARRAY_BUFFER, uvVbo);
        gl.bufferData(gl.ARRAY_BUFFER, meshData.uvs, gl.STATIC_DRAW);

        const aTexCoordLoc = gl.getAttribLocation(program, 'aTexCoord');
        if (aTexCoordLoc >= 0) {
          gl.enableVertexAttribArray(aTexCoordLoc);
          gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, 0);
        }
      }
    }

    // Create and fill index buffer
    const ebo = gl.createBuffer();
    if (!ebo) {
      throw new Error('Failed to create EBO');
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, meshData.indices, gl.STATIC_DRAW);

    // Unbind VAO (EBO stays bound to VAO)
    gl.bindVertexArray(null);

    return {
      vao,
      positionVbo,
      normalVbo,
      ebo,
      indexCount: meshData.indices.length,
      uvVbo,
    };
  }

  /**
   * Create wireframe GPU resources.
   */
  private createWireframeResources(
    edgeData: IEdgeData,
    program: WebGLProgram
  ): EdgeGPUResources {
    const gl = this.gl;

    // Create VAO
    const vao = gl.createVertexArray();
    if (!vao) {
      throw new Error('Failed to create VAO for wireframe');
    }
    gl.bindVertexArray(vao);

    // Create and fill position VBO
    const positionVbo = gl.createBuffer();
    if (!positionVbo) {
      throw new Error('Failed to create wireframe position VBO');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, positionVbo);
    gl.bufferData(gl.ARRAY_BUFFER, edgeData.lineVertices, gl.STATIC_DRAW);

    const aPositionLoc = gl.getAttribLocation(program, 'aPosition');
    if (aPositionLoc >= 0) {
      gl.enableVertexAttribArray(aPositionLoc);
      gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);
    }

    // Unbind VAO
    gl.bindVertexArray(null);

    return {
      vao,
      positionVbo,
      vertexCount: edgeData.lineCount * 2,
    };
  }

  /**
   * Delete solid GPU resources.
   */
  private deleteSolidResources(resources: MeshGPUResources): void {
    const gl = this.gl;
    gl.deleteVertexArray(resources.vao);
    gl.deleteBuffer(resources.positionVbo);
    gl.deleteBuffer(resources.normalVbo);
    gl.deleteBuffer(resources.ebo);
    if (resources.uvVbo) {
      gl.deleteBuffer(resources.uvVbo);
    }
  }

  /**
   * Delete wireframe GPU resources.
   */
  private deleteWireframeResources(resources: EdgeGPUResources): void {
    const gl = this.gl;
    gl.deleteVertexArray(resources.vao);
    gl.deleteBuffer(resources.positionVbo);
  }
}
