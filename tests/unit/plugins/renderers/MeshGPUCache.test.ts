/**
 * MeshGPUCache Tests
 *
 * Unit tests for the centralized GPU resource cache.
 * Uses mock WebGL context to verify resource creation and disposal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeshGPUCache } from '@plugins/renderers/shared/MeshGPUCache';
import type { IMeshData, IEdgeData } from '@core/interfaces';

/**
 * Create a mock WebGL2 rendering context.
 */
function createMockGL(): WebGL2RenderingContext {
  let vaoId = 0;
  let bufferId = 0;

  return {
    createVertexArray: vi.fn(() => ({ id: ++vaoId })),
    deleteVertexArray: vi.fn(),
    bindVertexArray: vi.fn(),

    createBuffer: vi.fn(() => ({ id: ++bufferId })),
    deleteBuffer: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),

    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),

    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    STATIC_DRAW: 0x88E4,
    FLOAT: 0x1406,
  } as unknown as WebGL2RenderingContext;
}

/**
 * Create mock mesh data for testing.
 */
function createMockMeshData(): IMeshData {
  return {
    positions: new Float32Array([
      // Simple triangle
      0, 0, 0,
      1, 0, 0,
      0.5, 1, 0,
    ]),
    normals: new Float32Array([
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
    ]),
    indices: new Uint16Array([0, 1, 2]),
    bounds: {
      min: [0, 0, 0],
      max: [1, 1, 0],
    },
  };
}

/**
 * Create mock edge data for testing.
 */
function createMockEdgeData(): IEdgeData {
  return {
    lineVertices: new Float32Array([
      // 3 edges of triangle
      0, 0, 0, 1, 0, 0,       // Edge 1
      1, 0, 0, 0.5, 1, 0,     // Edge 2
      0.5, 1, 0, 0, 0, 0,     // Edge 3
    ]),
    lineCount: 3,
  };
}

/**
 * Create a mock shader program.
 */
function createMockProgram(): WebGLProgram {
  return { id: 'program' } as unknown as WebGLProgram;
}

describe('MeshGPUCache', () => {
  let gl: WebGL2RenderingContext;
  let cache: MeshGPUCache;
  let program: WebGLProgram;

  beforeEach(() => {
    gl = createMockGL();
    cache = new MeshGPUCache(gl);
    program = createMockProgram();
  });

  describe('constructor', () => {
    it('should create an empty cache', () => {
      expect(cache.getSolidCacheSize()).toBe(0);
      expect(cache.getWireframeCacheSize()).toBe(0);
    });
  });

  describe('getOrCreateSolid', () => {
    it('should create GPU resources for new mesh', () => {
      const meshData = createMockMeshData();

      const resources = cache.getOrCreateSolid('mesh1', meshData, program);

      expect(resources).toBeDefined();
      expect(resources.vao).toBeDefined();
      expect(resources.positionVbo).toBeDefined();
      expect(resources.normalVbo).toBeDefined();
      expect(resources.ebo).toBeDefined();
      expect(resources.indexCount).toBe(3);
    });

    it('should call WebGL methods for resource creation', () => {
      const meshData = createMockMeshData();

      cache.getOrCreateSolid('mesh1', meshData, program);

      expect(gl.createVertexArray).toHaveBeenCalled();
      expect(gl.createBuffer).toHaveBeenCalledTimes(3); // position, normal, index
      expect(gl.bufferData).toHaveBeenCalledTimes(3);
    });

    it('should cache resources on first call', () => {
      const meshData = createMockMeshData();

      cache.getOrCreateSolid('mesh1', meshData, program);

      expect(cache.getSolidCacheSize()).toBe(1);
      expect(cache.hasSolidResources('mesh1')).toBe(true);
    });

    it('should return cached resources on subsequent calls', () => {
      const meshData = createMockMeshData();

      const resources1 = cache.getOrCreateSolid('mesh1', meshData, program);
      const resources2 = cache.getOrCreateSolid('mesh1', meshData, program);

      expect(resources1).toBe(resources2);
      expect(gl.createVertexArray).toHaveBeenCalledTimes(1);
    });

    it('should create separate resources for different meshes', () => {
      const meshData1 = createMockMeshData();
      const meshData2 = createMockMeshData();

      const resources1 = cache.getOrCreateSolid('mesh1', meshData1, program);
      const resources2 = cache.getOrCreateSolid('mesh2', meshData2, program);

      expect(resources1).not.toBe(resources2);
      expect(cache.getSolidCacheSize()).toBe(2);
    });

    it('should create UV buffer if UV data present', () => {
      const meshData = createMockMeshData();
      meshData.uvs = new Float32Array([0, 0, 1, 0, 0.5, 1]);

      const resources = cache.getOrCreateSolid('mesh1', meshData, program);

      expect(resources.uvVbo).toBeDefined();
      expect(gl.createBuffer).toHaveBeenCalledTimes(4); // position, normal, uv, index
    });

    it('should not create UV buffer if no UV data', () => {
      const meshData = createMockMeshData();

      const resources = cache.getOrCreateSolid('mesh1', meshData, program);

      expect(resources.uvVbo).toBeUndefined();
    });
  });

  describe('getOrCreateWireframe', () => {
    it('should create GPU resources for wireframe', () => {
      const edgeData = createMockEdgeData();

      const resources = cache.getOrCreateWireframe('mesh1', edgeData, program);

      expect(resources).toBeDefined();
      expect(resources.vao).toBeDefined();
      expect(resources.positionVbo).toBeDefined();
      expect(resources.vertexCount).toBe(6); // 3 edges × 2 vertices
    });

    it('should cache wireframe resources', () => {
      const edgeData = createMockEdgeData();

      cache.getOrCreateWireframe('mesh1', edgeData, program);

      expect(cache.getWireframeCacheSize()).toBe(1);
      expect(cache.hasWireframeResources('mesh1')).toBe(true);
    });

    it('should return cached wireframe resources', () => {
      const edgeData = createMockEdgeData();

      const resources1 = cache.getOrCreateWireframe('mesh1', edgeData, program);
      const resources2 = cache.getOrCreateWireframe('mesh1', edgeData, program);

      expect(resources1).toBe(resources2);
    });
  });

  describe('hasSolidResources', () => {
    it('should return false for non-existent mesh', () => {
      expect(cache.hasSolidResources('nonexistent')).toBe(false);
    });

    it('should return true after creating resources', () => {
      const meshData = createMockMeshData();
      cache.getOrCreateSolid('mesh1', meshData, program);

      expect(cache.hasSolidResources('mesh1')).toBe(true);
    });
  });

  describe('hasWireframeResources', () => {
    it('should return false for non-existent mesh', () => {
      expect(cache.hasWireframeResources('nonexistent')).toBe(false);
    });

    it('should return true after creating resources', () => {
      const edgeData = createMockEdgeData();
      cache.getOrCreateWireframe('mesh1', edgeData, program);

      expect(cache.hasWireframeResources('mesh1')).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should dispose both solid and wireframe resources', () => {
      const meshData = createMockMeshData();
      const edgeData = createMockEdgeData();

      cache.getOrCreateSolid('mesh1', meshData, program);
      cache.getOrCreateWireframe('mesh1', edgeData, program);

      cache.dispose('mesh1');

      expect(cache.hasSolidResources('mesh1')).toBe(false);
      expect(cache.hasWireframeResources('mesh1')).toBe(false);
    });

    it('should call WebGL delete methods', () => {
      const meshData = createMockMeshData();
      cache.getOrCreateSolid('mesh1', meshData, program);

      cache.dispose('mesh1');

      expect(gl.deleteVertexArray).toHaveBeenCalled();
      expect(gl.deleteBuffer).toHaveBeenCalled();
    });

    it('should handle non-existent mesh gracefully', () => {
      expect(() => {
        cache.dispose('nonexistent');
      }).not.toThrow();
    });
  });

  describe('disposeSolid', () => {
    it('should dispose only solid resources', () => {
      const meshData = createMockMeshData();
      const edgeData = createMockEdgeData();

      cache.getOrCreateSolid('mesh1', meshData, program);
      cache.getOrCreateWireframe('mesh1', edgeData, program);

      cache.disposeSolid('mesh1');

      expect(cache.hasSolidResources('mesh1')).toBe(false);
      expect(cache.hasWireframeResources('mesh1')).toBe(true);
    });
  });

  describe('disposeWireframe', () => {
    it('should dispose only wireframe resources', () => {
      const meshData = createMockMeshData();
      const edgeData = createMockEdgeData();

      cache.getOrCreateSolid('mesh1', meshData, program);
      cache.getOrCreateWireframe('mesh1', edgeData, program);

      cache.disposeWireframe('mesh1');

      expect(cache.hasSolidResources('mesh1')).toBe(true);
      expect(cache.hasWireframeResources('mesh1')).toBe(false);
    });
  });

  describe('disposeAll', () => {
    it('should dispose all cached resources', () => {
      const meshData = createMockMeshData();
      const edgeData = createMockEdgeData();

      cache.getOrCreateSolid('mesh1', meshData, program);
      cache.getOrCreateSolid('mesh2', meshData, program);
      cache.getOrCreateWireframe('mesh1', edgeData, program);
      cache.getOrCreateWireframe('mesh2', edgeData, program);

      cache.disposeAll();

      expect(cache.getSolidCacheSize()).toBe(0);
      expect(cache.getWireframeCacheSize()).toBe(0);
    });

    it('should handle empty cache gracefully', () => {
      expect(() => {
        cache.disposeAll();
      }).not.toThrow();
    });
  });

  describe('getSolidCacheSize', () => {
    it('should return correct size', () => {
      const meshData = createMockMeshData();

      expect(cache.getSolidCacheSize()).toBe(0);

      cache.getOrCreateSolid('mesh1', meshData, program);
      expect(cache.getSolidCacheSize()).toBe(1);

      cache.getOrCreateSolid('mesh2', meshData, program);
      expect(cache.getSolidCacheSize()).toBe(2);

      cache.disposeSolid('mesh1');
      expect(cache.getSolidCacheSize()).toBe(1);
    });
  });

  describe('getWireframeCacheSize', () => {
    it('should return correct size', () => {
      const edgeData = createMockEdgeData();

      expect(cache.getWireframeCacheSize()).toBe(0);

      cache.getOrCreateWireframe('mesh1', edgeData, program);
      expect(cache.getWireframeCacheSize()).toBe(1);

      cache.getOrCreateWireframe('mesh2', edgeData, program);
      expect(cache.getWireframeCacheSize()).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should throw if VAO creation fails', () => {
      const meshData = createMockMeshData();
      (gl.createVertexArray as ReturnType<typeof vi.fn>).mockReturnValue(null);

      expect(() => {
        cache.getOrCreateSolid('mesh1', meshData, program);
      }).toThrow('Failed to create VAO');
    });

    it('should throw if position buffer creation fails', () => {
      const meshData = createMockMeshData();
      (gl.createBuffer as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

      expect(() => {
        cache.getOrCreateSolid('mesh1', meshData, program);
      }).toThrow('Failed to create position VBO');
    });
  });
});
