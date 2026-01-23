/**
 * Cube Primitive Tests
 *
 * Unit tests for the Cube primitive.
 * Tests focus on geometry data and entity/component functionality.
 * GPU resource tests are in MeshGPUCache.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { Cube, CubeFactory } from '@plugins/primitives/Cube';
import { isMeshProvider } from '@core/interfaces';

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

    it('should assign unique entityId', () => {
      const cube1 = new Cube();
      const cube2 = new Cube();

      expect(cube1.entityId).toBeDefined();
      expect(cube2.entityId).toBeDefined();
      expect(cube1.entityId).not.toBe(cube2.entityId);
    });
  });

  describe('IMeshProvider', () => {
    it('should implement IMeshProvider', () => {
      const cube = new Cube();

      expect(isMeshProvider(cube)).toBe(true);
    });

    it('should have getMeshData method', () => {
      const cube = new Cube();

      expect(typeof cube.getMeshData).toBe('function');
    });

    it('should have getEdgeData method', () => {
      const cube = new Cube();

      expect(typeof cube.getEdgeData).toBe('function');
    });
  });

  describe('getMeshData', () => {
    it('should return valid mesh data', () => {
      const cube = new Cube();
      const meshData = cube.getMeshData();

      expect(meshData).toBeDefined();
      expect(meshData.positions).toBeInstanceOf(Float32Array);
      expect(meshData.normals).toBeInstanceOf(Float32Array);
      expect(meshData.indices).toBeInstanceOf(Uint16Array);
      expect(meshData.bounds).toBeDefined();
    });

    it('should return 24 vertices (6 faces × 4 vertices)', () => {
      const cube = new Cube();
      const meshData = cube.getMeshData();

      // 24 vertices × 3 components = 72 values
      expect(meshData.positions.length).toBe(72);
    });

    it('should return matching number of normals', () => {
      const cube = new Cube();
      const meshData = cube.getMeshData();

      expect(meshData.normals.length).toBe(meshData.positions.length);
    });

    it('should return 36 indices (12 triangles × 3 vertices)', () => {
      const cube = new Cube();
      const meshData = cube.getMeshData();

      expect(meshData.indices.length).toBe(36);
    });

    it('should have valid index values', () => {
      const cube = new Cube();
      const meshData = cube.getMeshData();
      const vertexCount = meshData.positions.length / 3;

      for (let i = 0; i < meshData.indices.length; i++) {
        expect(meshData.indices[i]).toBeGreaterThanOrEqual(0);
        expect(meshData.indices[i]).toBeLessThan(vertexCount);
      }
    });

    it('should have correct bounding box', () => {
      const cube = new Cube();
      const meshData = cube.getMeshData();

      expect(meshData.bounds.min).toEqual([-0.5, -0.5, -0.5]);
      expect(meshData.bounds.max).toEqual([0.5, 0.5, 0.5]);
    });

    it('should have vertices within unit cube bounds', () => {
      const cube = new Cube();
      const meshData = cube.getMeshData();

      for (let i = 0; i < meshData.positions.length; i += 3) {
        expect(meshData.positions[i]).toBeGreaterThanOrEqual(-0.5);
        expect(meshData.positions[i]).toBeLessThanOrEqual(0.5);
        expect(meshData.positions[i + 1]).toBeGreaterThanOrEqual(-0.5);
        expect(meshData.positions[i + 1]).toBeLessThanOrEqual(0.5);
        expect(meshData.positions[i + 2]).toBeGreaterThanOrEqual(-0.5);
        expect(meshData.positions[i + 2]).toBeLessThanOrEqual(0.5);
      }
    });

    it('should have unit length normals', () => {
      const cube = new Cube();
      const meshData = cube.getMeshData();

      for (let i = 0; i < meshData.normals.length; i += 3) {
        const x = meshData.normals[i];
        const y = meshData.normals[i + 1];
        const z = meshData.normals[i + 2];
        const length = Math.sqrt(x * x + y * y + z * z);
        expect(length).toBeCloseTo(1);
      }
    });

    it('should return the same cached object on multiple calls', () => {
      const cube = new Cube();
      const meshData1 = cube.getMeshData();
      const meshData2 = cube.getMeshData();

      expect(meshData1).toBe(meshData2);
    });
  });

  describe('getEdgeData', () => {
    it('should return valid edge data', () => {
      const cube = new Cube();
      const edgeData = cube.getEdgeData();

      expect(edgeData).toBeDefined();
      expect(edgeData.lineVertices).toBeInstanceOf(Float32Array);
      expect(edgeData.lineCount).toBe(12); // 12 edges
    });

    it('should return 12 edges (72 vertex values)', () => {
      const cube = new Cube();
      const edgeData = cube.getEdgeData();

      // 12 edges × 2 vertices × 3 components = 72 values
      expect(edgeData.lineVertices.length).toBe(72);
    });

    it('should have vertices within unit cube bounds', () => {
      const cube = new Cube();
      const edgeData = cube.getEdgeData();

      for (let i = 0; i < edgeData.lineVertices.length; i += 3) {
        expect(edgeData.lineVertices[i]).toBeGreaterThanOrEqual(-0.5);
        expect(edgeData.lineVertices[i]).toBeLessThanOrEqual(0.5);
        expect(edgeData.lineVertices[i + 1]).toBeGreaterThanOrEqual(-0.5);
        expect(edgeData.lineVertices[i + 1]).toBeLessThanOrEqual(0.5);
        expect(edgeData.lineVertices[i + 2]).toBeGreaterThanOrEqual(-0.5);
        expect(edgeData.lineVertices[i + 2]).toBeLessThanOrEqual(0.5);
      }
    });

    it('should return the same cached object on multiple calls', () => {
      const cube = new Cube();
      const edgeData1 = cube.getEdgeData();
      const edgeData2 = cube.getEdgeData();

      expect(edgeData1).toBe(edgeData2);
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

  describe('getNormalMatrix', () => {
    it('should return a 3x3 matrix', () => {
      const cube = new Cube();
      const normalMat = cube.getNormalMatrix();

      expect(normalMat).toBeInstanceOf(Float32Array);
      expect(normalMat.length).toBe(9);
    });

    it('should return identity for default transform', () => {
      const cube = new Cube();
      const normalMat = cube.getNormalMatrix();

      // 3x3 identity
      expect(normalMat[0]).toBeCloseTo(1);
      expect(normalMat[4]).toBeCloseTo(1);
      expect(normalMat[8]).toBeCloseTo(1);
    });
  });

  describe('render (legacy)', () => {
    it('should be a no-op (does not throw)', () => {
      const cube = new Cube();
      const mockGL = {} as WebGL2RenderingContext;
      const viewProjection = new Float32Array(16);

      expect(() => {
        cube.render(mockGL, viewProjection);
      }).not.toThrow();
    });
  });

  describe('IEntity implementation', () => {
    it('should have mesh component', () => {
      const cube = new Cube();

      expect(cube.hasComponent('mesh')).toBe(true);
      const mesh = cube.getComponent('mesh');
      expect(mesh).toBeDefined();
      expect(mesh?.type).toBe('mesh');
    });

    it('should have material component', () => {
      const cube = new Cube();

      expect(cube.hasComponent('material')).toBe(true);
      const material = cube.getComponent('material');
      expect(material).toBeDefined();
      expect(material?.type).toBe('material');
    });

    it('should return null for non-existent component', () => {
      const cube = new Cube();

      expect(cube.getComponent('nonexistent')).toBeNull();
    });

    it('should return all components', () => {
      const cube = new Cube();
      const components = cube.getComponents();

      expect(components.length).toBe(2); // mesh and material
    });
  });

  describe('render mode', () => {
    it('should default to solid mode', () => {
      const cube = new Cube();

      expect(cube.getRenderMode()).toBe('solid');
    });

    it('should allow setting render mode', () => {
      const cube = new Cube();
      cube.setRenderMode('wireframe');

      expect(cube.getRenderMode()).toBe('wireframe');
    });

    it('should support all render modes', () => {
      const cube = new Cube();

      cube.setRenderMode('solid');
      expect(cube.getRenderMode()).toBe('solid');

      cube.setRenderMode('wireframe');
      expect(cube.getRenderMode()).toBe('wireframe');

      cube.setRenderMode('both');
      expect(cube.getRenderMode()).toBe('both');
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

describe('CubeFactory', () => {
  describe('properties', () => {
    it('should have type "Cube"', () => {
      const factory = new CubeFactory();

      expect(factory.type).toBe('Cube');
    });

    it('should have category "Mesh"', () => {
      const factory = new CubeFactory();

      expect(factory.category).toBe('Mesh');
    });

    it('should have icon "cube"', () => {
      const factory = new CubeFactory();

      expect(factory.icon).toBe('cube');
    });
  });

  describe('create', () => {
    it('should create a Cube instance', () => {
      const factory = new CubeFactory();
      const cube = factory.create();

      expect(cube).toBeInstanceOf(Cube);
    });

    it('should create a Cube with default name', () => {
      const factory = new CubeFactory();
      const cube = factory.create();

      expect(cube.name).toBe('Cube');
    });

    it('should create a Cube with custom name', () => {
      const factory = new CubeFactory();
      const cube = factory.create('My Cube');

      expect(cube.name).toBe('My Cube');
    });

    it('should create unique cubes each time', () => {
      const factory = new CubeFactory();
      const cube1 = factory.create();
      const cube2 = factory.create();

      expect(cube1.id).not.toBe(cube2.id);
    });
  });
});
