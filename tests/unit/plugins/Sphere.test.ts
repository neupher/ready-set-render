/**
 * Sphere Primitive Tests
 *
 * Unit tests for the Sphere primitive.
 * Tests focus on geometry data and entity/component functionality.
 * GPU resource tests are in MeshGPUCache.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { Sphere, SphereFactory } from '@plugins/primitives/Sphere';
import { isMeshProvider } from '@core/interfaces';

describe('Sphere', () => {
  describe('constructor', () => {
    it('should create a sphere with default id and name', () => {
      const sphere = new Sphere();

      expect(sphere.id).toBeDefined();
      expect(sphere.id.length).toBeGreaterThan(0);
      expect(sphere.name).toBe('Sphere');
    });

    it('should create a sphere with custom id', () => {
      const sphere = new Sphere('my-sphere-id');

      expect(sphere.id).toBe('my-sphere-id');
    });

    it('should create a sphere with custom id and name', () => {
      const sphere = new Sphere('custom-id', 'My Custom Sphere');

      expect(sphere.id).toBe('custom-id');
      expect(sphere.name).toBe('My Custom Sphere');
    });

    it('should initialize with default transform', () => {
      const sphere = new Sphere();

      expect(sphere.transform).toEqual({
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      });
    });

    it('should initialize with no parent', () => {
      const sphere = new Sphere();

      expect(sphere.parent).toBeNull();
    });

    it('should initialize with empty children array', () => {
      const sphere = new Sphere();

      expect(sphere.children).toEqual([]);
    });

    it('should assign unique entityId', () => {
      const sphere1 = new Sphere();
      const sphere2 = new Sphere();

      expect(sphere1.entityId).toBeDefined();
      expect(sphere2.entityId).toBeDefined();
      expect(sphere1.entityId).not.toBe(sphere2.entityId);
    });

    it('should use default parameters', () => {
      const sphere = new Sphere();

      expect(sphere.getSegments()).toBe(32);
      expect(sphere.getRings()).toBe(16);
      expect(sphere.getRadius()).toBe(0.5);
    });

    it('should accept custom options', () => {
      const sphere = new Sphere(undefined, undefined, {
        segments: 16,
        rings: 8,
        radius: 1.0,
      });

      expect(sphere.getSegments()).toBe(16);
      expect(sphere.getRings()).toBe(8);
      expect(sphere.getRadius()).toBe(1.0);
    });
  });

  describe('IMeshProvider', () => {
    it('should implement IMeshProvider', () => {
      const sphere = new Sphere();

      expect(isMeshProvider(sphere)).toBe(true);
    });

    it('should have getMeshData method', () => {
      const sphere = new Sphere();

      expect(typeof sphere.getMeshData).toBe('function');
    });

    it('should have getEdgeData method', () => {
      const sphere = new Sphere();

      expect(typeof sphere.getEdgeData).toBe('function');
    });
  });

  describe('getMeshData', () => {
    it('should return valid mesh data', () => {
      const sphere = new Sphere();
      const meshData = sphere.getMeshData();

      expect(meshData).toBeDefined();
      expect(meshData.positions).toBeInstanceOf(Float32Array);
      expect(meshData.normals).toBeInstanceOf(Float32Array);
      expect(meshData.indices).toBeInstanceOf(Uint16Array);
      expect(meshData.bounds).toBeDefined();
    });

    it('should return correct vertex count for default segments/rings', () => {
      const sphere = new Sphere();
      const meshData = sphere.getMeshData();

      // (rings + 1) * (segments + 1) = 17 * 33 = 561 vertices
      // 561 * 3 = 1683 position values
      expect(meshData.positions.length).toBe(1683);
    });

    it('should return matching number of normals', () => {
      const sphere = new Sphere();
      const meshData = sphere.getMeshData();

      expect(meshData.normals.length).toBe(meshData.positions.length);
    });

    it('should return correct index count for default segments/rings', () => {
      const sphere = new Sphere();
      const meshData = sphere.getMeshData();

      // rings * segments * 2 triangles * 3 indices = 16 * 32 * 2 * 3 = 3072
      expect(meshData.indices.length).toBe(3072);
    });

    it('should have valid index values', () => {
      const sphere = new Sphere();
      const meshData = sphere.getMeshData();
      const vertexCount = meshData.positions.length / 3;

      for (let i = 0; i < meshData.indices.length; i++) {
        expect(meshData.indices[i]).toBeGreaterThanOrEqual(0);
        expect(meshData.indices[i]).toBeLessThan(vertexCount);
      }
    });

    it('should have correct bounding box for default radius', () => {
      const sphere = new Sphere();
      const meshData = sphere.getMeshData();

      expect(meshData.bounds.min).toEqual([-0.5, -0.5, -0.5]);
      expect(meshData.bounds.max).toEqual([0.5, 0.5, 0.5]);
    });

    it('should have correct bounding box for custom radius', () => {
      const sphere = new Sphere(undefined, undefined, { radius: 2.0 });
      const meshData = sphere.getMeshData();

      expect(meshData.bounds.min).toEqual([-2, -2, -2]);
      expect(meshData.bounds.max).toEqual([2, 2, 2]);
    });

    it('should have vertices within bounding box', () => {
      const sphere = new Sphere();
      const meshData = sphere.getMeshData();
      const radius = sphere.getRadius();

      for (let i = 0; i < meshData.positions.length; i += 3) {
        const x = meshData.positions[i];
        const y = meshData.positions[i + 1];
        const z = meshData.positions[i + 2];

        // Allow small epsilon for floating point
        expect(x).toBeGreaterThanOrEqual(-radius - 0.001);
        expect(x).toBeLessThanOrEqual(radius + 0.001);
        expect(y).toBeGreaterThanOrEqual(-radius - 0.001);
        expect(y).toBeLessThanOrEqual(radius + 0.001);
        expect(z).toBeGreaterThanOrEqual(-radius - 0.001);
        expect(z).toBeLessThanOrEqual(radius + 0.001);
      }
    });

    it('should have unit length normals', () => {
      const sphere = new Sphere();
      const meshData = sphere.getMeshData();

      for (let i = 0; i < meshData.normals.length; i += 3) {
        const x = meshData.normals[i];
        const y = meshData.normals[i + 1];
        const z = meshData.normals[i + 2];
        const length = Math.sqrt(x * x + y * y + z * z);
        expect(length).toBeCloseTo(1, 4);
      }
    });

    it('should return the same cached object on multiple calls', () => {
      const sphere = new Sphere();
      const meshData1 = sphere.getMeshData();
      const meshData2 = sphere.getMeshData();

      expect(meshData1).toBe(meshData2);
    });

    it('should generate different geometry for different options', () => {
      const sphere1 = new Sphere(undefined, undefined, { segments: 16, rings: 8 });
      const sphere2 = new Sphere(undefined, undefined, { segments: 32, rings: 16 });

      const meshData1 = sphere1.getMeshData();
      const meshData2 = sphere2.getMeshData();

      expect(meshData1.positions.length).not.toBe(meshData2.positions.length);
    });
  });

  describe('getEdgeData', () => {
    it('should return valid edge data', () => {
      const sphere = new Sphere();
      const edgeData = sphere.getEdgeData();

      expect(edgeData).toBeDefined();
      expect(edgeData.lineVertices).toBeInstanceOf(Float32Array);
      expect(edgeData.lineCount).toBeGreaterThan(0);
    });

    it('should have edge vertices within bounds', () => {
      const sphere = new Sphere();
      const edgeData = sphere.getEdgeData();
      const radius = sphere.getRadius();

      for (let i = 0; i < edgeData.lineVertices.length; i += 3) {
        const x = edgeData.lineVertices[i];
        const y = edgeData.lineVertices[i + 1];
        const z = edgeData.lineVertices[i + 2];

        expect(x).toBeGreaterThanOrEqual(-radius - 0.001);
        expect(x).toBeLessThanOrEqual(radius + 0.001);
        expect(y).toBeGreaterThanOrEqual(-radius - 0.001);
        expect(y).toBeLessThanOrEqual(radius + 0.001);
        expect(z).toBeGreaterThanOrEqual(-radius - 0.001);
        expect(z).toBeLessThanOrEqual(radius + 0.001);
      }
    });

    it('should return the same cached object on multiple calls', () => {
      const sphere = new Sphere();
      const edgeData1 = sphere.getEdgeData();
      const edgeData2 = sphere.getEdgeData();

      expect(edgeData1).toBe(edgeData2);
    });
  });

  describe('getModelMatrix', () => {
    it('should return identity matrix for default transform', () => {
      const sphere = new Sphere();
      const model = sphere.getModelMatrix();

      expect(model).toBeInstanceOf(Float32Array);
      expect(model.length).toBe(16);

      // Check it's an identity matrix
      expect(model[0]).toBeCloseTo(1);
      expect(model[5]).toBeCloseTo(1);
      expect(model[10]).toBeCloseTo(1);
      expect(model[15]).toBeCloseTo(1);
    });

    it('should include translation', () => {
      const sphere = new Sphere();
      sphere.transform.position = [5, 10, 15];

      const model = sphere.getModelMatrix();

      // Translation is in column 4 (indices 12, 13, 14)
      expect(model[12]).toBeCloseTo(5);
      expect(model[13]).toBeCloseTo(10);
      expect(model[14]).toBeCloseTo(15);
    });

    it('should include scale', () => {
      const sphere = new Sphere();
      sphere.transform.scale = [2, 3, 4];

      const model = sphere.getModelMatrix();

      // Scale affects diagonal elements
      expect(model[0]).toBeCloseTo(2);
      expect(model[5]).toBeCloseTo(3);
      expect(model[10]).toBeCloseTo(4);
    });
  });

  describe('getNormalMatrix', () => {
    it('should return a 3x3 matrix', () => {
      const sphere = new Sphere();
      const normalMat = sphere.getNormalMatrix();

      expect(normalMat).toBeInstanceOf(Float32Array);
      expect(normalMat.length).toBe(9);
    });

    it('should return identity for default transform', () => {
      const sphere = new Sphere();
      const normalMat = sphere.getNormalMatrix();

      // 3x3 identity
      expect(normalMat[0]).toBeCloseTo(1);
      expect(normalMat[4]).toBeCloseTo(1);
      expect(normalMat[8]).toBeCloseTo(1);
    });
  });

  describe('render (legacy)', () => {
    it('should be a no-op (does not throw)', () => {
      const sphere = new Sphere();
      const mockGL = {} as WebGL2RenderingContext;
      const viewProjection = new Float32Array(16);

      expect(() => {
        sphere.render(mockGL, viewProjection);
      }).not.toThrow();
    });
  });

  describe('IEntity implementation', () => {
    it('should have mesh component', () => {
      const sphere = new Sphere();

      expect(sphere.hasComponent('mesh')).toBe(true);
      const mesh = sphere.getComponent('mesh');
      expect(mesh).toBeDefined();
      expect(mesh?.type).toBe('mesh');
    });

    it('should have material component', () => {
      const sphere = new Sphere();

      expect(sphere.hasComponent('material')).toBe(true);
      const material = sphere.getComponent('material');
      expect(material).toBeDefined();
      expect(material?.type).toBe('material');
    });

    it('should return null for non-existent component', () => {
      const sphere = new Sphere();

      expect(sphere.getComponent('nonexistent')).toBeNull();
    });

    it('should return all components', () => {
      const sphere = new Sphere();
      const components = sphere.getComponents();

      expect(components.length).toBe(2); // mesh and material
    });
  });

  describe('render mode', () => {
    it('should default to solid mode', () => {
      const sphere = new Sphere();

      expect(sphere.getRenderMode()).toBe('solid');
    });

    it('should allow setting render mode', () => {
      const sphere = new Sphere();
      sphere.setRenderMode('wireframe');

      expect(sphere.getRenderMode()).toBe('wireframe');
    });

    it('should support all render modes', () => {
      const sphere = new Sphere();

      sphere.setRenderMode('solid');
      expect(sphere.getRenderMode()).toBe('solid');

      sphere.setRenderMode('wireframe');
      expect(sphere.getRenderMode()).toBe('wireframe');

      sphere.setRenderMode('both');
      expect(sphere.getRenderMode()).toBe('both');
    });
  });

  describe('transform manipulation', () => {
    it('should allow modifying position', () => {
      const sphere = new Sphere();
      sphere.transform.position = [1, 2, 3];

      expect(sphere.transform.position).toEqual([1, 2, 3]);
    });

    it('should allow modifying rotation', () => {
      const sphere = new Sphere();
      sphere.transform.rotation = [45, 90, 180];

      expect(sphere.transform.rotation).toEqual([45, 90, 180]);
    });

    it('should allow modifying scale', () => {
      const sphere = new Sphere();
      sphere.transform.scale = [2, 2, 2];

      expect(sphere.transform.scale).toEqual([2, 2, 2]);
    });

    it('should allow modifying name', () => {
      const sphere = new Sphere();
      sphere.name = 'Renamed Sphere';

      expect(sphere.name).toBe('Renamed Sphere');
    });
  });

  describe('hierarchy', () => {
    it('should allow setting parent', () => {
      const parent = new Sphere('parent');
      const child = new Sphere('child');

      child.parent = parent;

      expect(child.parent).toBe(parent);
    });

    it('should allow adding children', () => {
      const parent = new Sphere('parent');
      const child1 = new Sphere('child1');
      const child2 = new Sphere('child2');

      parent.children.push(child1, child2);

      expect(parent.children.length).toBe(2);
      expect(parent.children).toContain(child1);
      expect(parent.children).toContain(child2);
    });
  });
});

describe('SphereFactory', () => {
  describe('properties', () => {
    it('should have type "Sphere"', () => {
      const factory = new SphereFactory();

      expect(factory.type).toBe('Sphere');
    });

    it('should have category "Mesh"', () => {
      const factory = new SphereFactory();

      expect(factory.category).toBe('Mesh');
    });

    it('should have icon "sphere"', () => {
      const factory = new SphereFactory();

      expect(factory.icon).toBe('sphere');
    });
  });

  describe('create', () => {
    it('should create a Sphere instance', () => {
      const factory = new SphereFactory();
      const sphere = factory.create();

      expect(sphere).toBeInstanceOf(Sphere);
    });

    it('should create a Sphere with default name', () => {
      const factory = new SphereFactory();
      const sphere = factory.create();

      expect(sphere.name).toBe('Sphere');
    });

    it('should create a Sphere with custom name', () => {
      const factory = new SphereFactory();
      const sphere = factory.create('My Sphere');

      expect(sphere.name).toBe('My Sphere');
    });

    it('should create unique spheres each time', () => {
      const factory = new SphereFactory();
      const sphere1 = factory.create();
      const sphere2 = factory.create();

      expect(sphere1.id).not.toBe(sphere2.id);
    });
  });
});
