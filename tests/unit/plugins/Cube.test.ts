/**
 * Cube Primitive Tests
 *
 * Unit tests for the Cube primitive.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cube } from '@plugins/primitives/Cube';
import { createMockGL } from '../../helpers/webgl-mock';

describe('Cube', () => {
  describe('constructor', () => {
    it('should create a cube with default id and name', () => {
      const cube = new Cube();

      expect(cube.id).toBeDefined();
      expect(cube.id.length).toBeGreaterThan(0);
      expect(cube.name).toBe('Cube');
    });

    it('should create a cube with custom id', () => {
      const cube = new Cube('my-cube-id');

      expect(cube.id).toBe('my-cube-id');
    });

    it('should create a cube with custom id and name', () => {
      const cube = new Cube('custom-id', 'My Custom Cube');

      expect(cube.id).toBe('custom-id');
      expect(cube.name).toBe('My Custom Cube');
    });

    it('should initialize with default transform', () => {
      const cube = new Cube();

      expect(cube.transform).toEqual({
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      });
    });

    it('should initialize with no parent', () => {
      const cube = new Cube();

      expect(cube.parent).toBeNull();
    });

    it('should initialize with empty children array', () => {
      const cube = new Cube();

      expect(cube.children).toEqual([]);
    });
  });

  describe('getVertices', () => {
    it('should return a Float32Array', () => {
      const cube = new Cube();
      const vertices = cube.getVertices();

      expect(vertices).toBeInstanceOf(Float32Array);
    });

    it('should return 8 vertices (24 values)', () => {
      const cube = new Cube();
      const vertices = cube.getVertices();

      expect(vertices.length).toBe(24); // 8 vertices × 3 components
    });

    it('should have vertices within unit cube bounds', () => {
      const cube = new Cube();
      const vertices = cube.getVertices();

      for (let i = 0; i < vertices.length; i += 3) {
        expect(vertices[i]).toBeGreaterThanOrEqual(-0.5);
        expect(vertices[i]).toBeLessThanOrEqual(0.5);
        expect(vertices[i + 1]).toBeGreaterThanOrEqual(-0.5);
        expect(vertices[i + 1]).toBeLessThanOrEqual(0.5);
        expect(vertices[i + 2]).toBeGreaterThanOrEqual(-0.5);
        expect(vertices[i + 2]).toBeLessThanOrEqual(0.5);
      }
    });
  });

  describe('getEdges', () => {
    it('should return a Uint16Array', () => {
      const cube = new Cube();
      const edges = cube.getEdges();

      expect(edges).toBeInstanceOf(Uint16Array);
    });

    it('should return 12 edges (24 indices)', () => {
      const cube = new Cube();
      const edges = cube.getEdges();

      expect(edges.length).toBe(24); // 12 edges × 2 vertices per edge
    });

    it('should have valid vertex indices', () => {
      const cube = new Cube();
      const edges = cube.getEdges();
      const vertexCount = cube.getVertexCount();

      for (let i = 0; i < edges.length; i++) {
        expect(edges[i]).toBeGreaterThanOrEqual(0);
        expect(edges[i]).toBeLessThan(vertexCount);
      }
    });
  });

  describe('getVertexCount', () => {
    it('should return 8', () => {
      const cube = new Cube();

      expect(cube.getVertexCount()).toBe(8);
    });
  });

  describe('getEdgeCount', () => {
    it('should return 12', () => {
      const cube = new Cube();

      expect(cube.getEdgeCount()).toBe(12);
    });
  });

  describe('getModelMatrix', () => {
    it('should return identity matrix for default transform', () => {
      const cube = new Cube();
      const model = cube.getModelMatrix();

      expect(model).toBeInstanceOf(Float32Array);
      expect(model.length).toBe(16);

      // Check it's an identity matrix
      expect(model[0]).toBeCloseTo(1);
      expect(model[5]).toBeCloseTo(1);
      expect(model[10]).toBeCloseTo(1);
      expect(model[15]).toBeCloseTo(1);
    });

    it('should include translation', () => {
      const cube = new Cube();
      cube.transform.position = [5, 10, 15];

      const model = cube.getModelMatrix();

      // Translation is in column 4 (indices 12, 13, 14)
      expect(model[12]).toBeCloseTo(5);
      expect(model[13]).toBeCloseTo(10);
      expect(model[14]).toBeCloseTo(15);
    });

    it('should include scale', () => {
      const cube = new Cube();
      cube.transform.scale = [2, 3, 4];

      const model = cube.getModelMatrix();

      // Scale affects diagonal elements
      // Note: The matrix combines T * Rz * Ry * Rx * S
      // With no rotation, scale should show on diagonal
      expect(model[0]).toBeCloseTo(2);
      expect(model[5]).toBeCloseTo(3);
      expect(model[10]).toBeCloseTo(4);
    });

    it('should include rotation', () => {
      const cube = new Cube();
      cube.transform.rotation = [0, 90, 0]; // 90 degrees around Y

      const model = cube.getModelMatrix();

      // After 90° Y rotation:
      // X axis points to -Z, Z axis points to X
      expect(model[0]).toBeCloseTo(0);
      expect(model[8]).toBeCloseTo(1);
    });
  });

  describe('initializeGPUResources', () => {
    let mockGL: WebGL2RenderingContext;
    let mockProgram: WebGLProgram;

    beforeEach(() => {
      mockGL = createMockGL();
      mockProgram = {} as WebGLProgram;
    });

    it('should create VAO', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);

      expect(mockGL.createVertexArray).toHaveBeenCalled();
      expect(mockGL.bindVertexArray).toHaveBeenCalled();
    });

    it('should create and fill buffer', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);

      expect(mockGL.createBuffer).toHaveBeenCalled();
      expect(mockGL.bindBuffer).toHaveBeenCalledWith(
        mockGL.ARRAY_BUFFER,
        expect.anything()
      );
      expect(mockGL.bufferData).toHaveBeenCalled();
    });

    it('should set up vertex attribute', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);

      expect(mockGL.getAttribLocation).toHaveBeenCalledWith(
        mockProgram,
        'aPosition'
      );
      expect(mockGL.enableVertexAttribArray).toHaveBeenCalled();
      expect(mockGL.vertexAttribPointer).toHaveBeenCalledWith(
        expect.any(Number),
        3,
        mockGL.FLOAT,
        false,
        0,
        0
      );
    });

    it('should cache uniform location', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);

      expect(mockGL.getUniformLocation).toHaveBeenCalledWith(
        mockProgram,
        'uModelViewProjection'
      );
    });

    it('should unbind VAO and buffer after setup', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);

      expect(mockGL.bindVertexArray).toHaveBeenLastCalledWith(null);
      expect(mockGL.bindBuffer).toHaveBeenLastCalledWith(
        mockGL.ARRAY_BUFFER,
        null
      );
    });

    it('should throw if VAO creation fails', () => {
      vi.mocked(mockGL.createVertexArray).mockReturnValueOnce(null as unknown as WebGLVertexArrayObject);
      const cube = new Cube();

      expect(() => {
        cube.initializeGPUResources(mockGL, mockProgram);
      }).toThrow('Failed to create wireframe VAO for Cube');
    });

    it('should throw if buffer creation fails', () => {
      vi.mocked(mockGL.createBuffer).mockReturnValueOnce(null as unknown as WebGLBuffer);
      const cube = new Cube();

      expect(() => {
        cube.initializeGPUResources(mockGL, mockProgram);
      }).toThrow('Failed to create wireframe VBO for Cube');
    });
  });

  describe('render', () => {
    let mockGL: WebGL2RenderingContext;
    let mockProgram: WebGLProgram;

    beforeEach(() => {
      mockGL = createMockGL();
      mockProgram = {} as WebGLProgram;
    });

    it('should do nothing if not initialized', () => {
      const cube = new Cube();
      const viewProjection = new Float32Array(16);

      cube.render(mockGL, viewProjection);

      expect(mockGL.useProgram).not.toHaveBeenCalled();
      expect(mockGL.drawArrays).not.toHaveBeenCalled();
    });

    it('should use program when rendering', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);

      const viewProjection = new Float32Array(16);
      cube.render(mockGL, viewProjection);

      expect(mockGL.useProgram).toHaveBeenCalledWith(mockProgram);
    });

    it('should bind VAO when rendering', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);

      // Reset mock to track render calls
      vi.mocked(mockGL.bindVertexArray).mockClear();

      const viewProjection = new Float32Array(16);
      cube.render(mockGL, viewProjection);

      expect(mockGL.bindVertexArray).toHaveBeenCalled();
    });

    it('should set MVP uniform', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);

      const viewProjection = new Float32Array(16);
      cube.render(mockGL, viewProjection);

      expect(mockGL.uniformMatrix4fv).toHaveBeenCalled();
    });

    it('should draw lines', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);

      const viewProjection = new Float32Array(16);
      cube.render(mockGL, viewProjection);

      // Should draw all edge vertices (24 for a cube)
      expect(mockGL.drawArrays).toHaveBeenCalled();
    });

    it('should unbind VAO after drawing', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);

      // Reset mock to track render calls
      vi.mocked(mockGL.bindVertexArray).mockClear();

      const viewProjection = new Float32Array(16);
      cube.render(mockGL, viewProjection);

      expect(mockGL.bindVertexArray).toHaveBeenLastCalledWith(null);
    });
  });

  describe('dispose', () => {
    let mockGL: WebGL2RenderingContext;
    let mockProgram: WebGLProgram;

    beforeEach(() => {
      mockGL = createMockGL();
      mockProgram = {} as WebGLProgram;
    });

    it('should delete VAO', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);
      cube.dispose();

      expect(mockGL.deleteVertexArray).toHaveBeenCalled();
    });

    it('should delete buffer', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);
      cube.dispose();

      expect(mockGL.deleteBuffer).toHaveBeenCalled();
    });

    it('should be safe to call without initialization', () => {
      const cube = new Cube();

      expect(() => {
        cube.dispose();
      }).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);

      expect(() => {
        cube.dispose();
        cube.dispose();
      }).not.toThrow();
    });

    it('should prevent rendering after dispose', () => {
      const cube = new Cube();
      cube.initializeGPUResources(mockGL, mockProgram);
      cube.dispose();

      // Clear mock calls
      vi.mocked(mockGL.drawArrays).mockClear();

      const viewProjection = new Float32Array(16);
      cube.render(mockGL, viewProjection);

      expect(mockGL.drawArrays).not.toHaveBeenCalled();
    });
  });

  describe('transform manipulation', () => {
    it('should allow modifying position', () => {
      const cube = new Cube();
      cube.transform.position = [1, 2, 3];

      expect(cube.transform.position).toEqual([1, 2, 3]);
    });

    it('should allow modifying rotation', () => {
      const cube = new Cube();
      cube.transform.rotation = [45, 90, 180];

      expect(cube.transform.rotation).toEqual([45, 90, 180]);
    });

    it('should allow modifying scale', () => {
      const cube = new Cube();
      cube.transform.scale = [2, 2, 2];

      expect(cube.transform.scale).toEqual([2, 2, 2]);
    });

    it('should allow modifying name', () => {
      const cube = new Cube();
      cube.name = 'Renamed Cube';

      expect(cube.name).toBe('Renamed Cube');
    });
  });

  describe('hierarchy', () => {
    it('should allow setting parent', () => {
      const parent = new Cube('parent');
      const child = new Cube('child');

      child.parent = parent;

      expect(child.parent).toBe(parent);
    });

    it('should allow adding children', () => {
      const parent = new Cube('parent');
      const child1 = new Cube('child1');
      const child2 = new Cube('child2');

      parent.children.push(child1, child2);

      expect(parent.children.length).toBe(2);
      expect(parent.children).toContain(child1);
      expect(parent.children).toContain(child2);
    });
  });
});
