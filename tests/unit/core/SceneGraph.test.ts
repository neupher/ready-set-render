/**
 * SceneGraph Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SceneGraph, SceneObject } from '@core/SceneGraph';
import { EventBus } from '@core/EventBus';

describe('SceneGraph', () => {
  let eventBus: EventBus;
  let sceneGraph: SceneGraph;

  beforeEach(() => {
    eventBus = new EventBus();
    sceneGraph = new SceneGraph(eventBus);
  });

  describe('constructor', () => {
    it('should create with root object', () => {
      const root = sceneGraph.getRoot();

      expect(root).toBeDefined();
      expect(root.id).toBe('root');
      expect(root.name).toBe('Scene');
      expect(root.parent).toBeNull();
    });
  });

  describe('createObject()', () => {
    it('should create new scene object', () => {
      const obj = sceneGraph.createObject('TestCube');

      expect(obj).toBeDefined();
      expect(obj.name).toBe('TestCube');
      expect(obj.id).toBeDefined();
      expect(obj.transform).toBeDefined();
    });
  });

  describe('add()', () => {
    it('should add object to root by default', () => {
      const obj = sceneGraph.createObject('Cube');
      sceneGraph.add(obj);

      expect(obj.parent).toBe(sceneGraph.getRoot());
      expect(sceneGraph.getRoot().children).toContain(obj);
    });

    it('should add object to specified parent', () => {
      const parent = sceneGraph.createObject('Parent');
      const child = sceneGraph.createObject('Child');

      sceneGraph.add(parent);
      sceneGraph.add(child, parent);

      expect(child.parent).toBe(parent);
      expect(parent.children).toContain(child);
    });

    it('should emit scene:objectAdded event', () => {
      const handler = vi.fn();
      eventBus.on('scene:objectAdded', handler);

      const obj = sceneGraph.createObject('Cube');
      sceneGraph.add(obj);

      expect(handler).toHaveBeenCalledWith({
        object: obj,
        parent: sceneGraph.getRoot(),
      });
    });

    it('should register object in map', () => {
      const obj = sceneGraph.createObject('Cube');
      sceneGraph.add(obj);

      expect(sceneGraph.find(obj.id)).toBe(obj);
    });
  });

  describe('remove()', () => {
    it('should remove object from scene', () => {
      const obj = sceneGraph.createObject('Cube');
      sceneGraph.add(obj);
      sceneGraph.remove(obj);

      expect(sceneGraph.find(obj.id)).toBeUndefined();
      expect(sceneGraph.getRoot().children).not.toContain(obj);
    });

    it('should emit scene:objectRemoved event', () => {
      const handler = vi.fn();
      eventBus.on('scene:objectRemoved', handler);

      const obj = sceneGraph.createObject('Cube');
      sceneGraph.add(obj);
      sceneGraph.remove(obj);

      expect(handler).toHaveBeenCalledWith({ object: obj });
    });

    it('should remove children recursively by default', () => {
      const parent = sceneGraph.createObject('Parent');
      const child = sceneGraph.createObject('Child');

      sceneGraph.add(parent);
      sceneGraph.add(child, parent);

      sceneGraph.remove(parent);

      expect(sceneGraph.find(parent.id)).toBeUndefined();
      expect(sceneGraph.find(child.id)).toBeUndefined();
    });

    it('should not remove root', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      sceneGraph.remove(sceneGraph.getRoot());

      expect(sceneGraph.getRoot()).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('find()', () => {
    it('should find object by ID', () => {
      const obj = sceneGraph.createObject('Cube');
      sceneGraph.add(obj);

      expect(sceneGraph.find(obj.id)).toBe(obj);
    });

    it('should return undefined for non-existent ID', () => {
      expect(sceneGraph.find('nonexistent')).toBeUndefined();
    });
  });

  describe('findByName()', () => {
    it('should find objects by exact name', () => {
      const cube1 = sceneGraph.createObject('Cube');
      const cube2 = sceneGraph.createObject('Cube');
      const sphere = sceneGraph.createObject('Sphere');

      sceneGraph.add(cube1);
      sceneGraph.add(cube2);
      sceneGraph.add(sphere);

      const results = sceneGraph.findByName('Cube');

      expect(results).toHaveLength(2);
      expect(results).toContain(cube1);
      expect(results).toContain(cube2);
    });

    it('should find objects by partial name', () => {
      const cube = sceneGraph.createObject('MyCube');
      const cubeAlt = sceneGraph.createObject('AnotherCube');
      const sphere = sceneGraph.createObject('Sphere');

      sceneGraph.add(cube);
      sceneGraph.add(cubeAlt);
      sceneGraph.add(sphere);

      const results = sceneGraph.findByName('cube', false);

      expect(results).toHaveLength(2);
    });
  });

  describe('traverse()', () => {
    it('should visit all objects', () => {
      const obj1 = sceneGraph.createObject('Obj1');
      const obj2 = sceneGraph.createObject('Obj2');
      const obj3 = sceneGraph.createObject('Obj3');

      sceneGraph.add(obj1);
      sceneGraph.add(obj2);
      sceneGraph.add(obj3, obj1);

      const visited: string[] = [];
      sceneGraph.traverse((obj) => visited.push(obj.name));

      expect(visited).toContain('Scene');
      expect(visited).toContain('Obj1');
      expect(visited).toContain('Obj2');
      expect(visited).toContain('Obj3');
    });

    it('should traverse from specified start node', () => {
      const obj1 = sceneGraph.createObject('Obj1');
      const obj2 = sceneGraph.createObject('Obj2');

      sceneGraph.add(obj1);
      sceneGraph.add(obj2, obj1);

      const visited: string[] = [];
      sceneGraph.traverse((obj) => visited.push(obj.name), obj1);

      expect(visited).not.toContain('Scene');
      expect(visited).toContain('Obj1');
      expect(visited).toContain('Obj2');
    });
  });

  describe('traverseUntil()', () => {
    it('should stop when callback returns false', () => {
      const obj1 = sceneGraph.createObject('Obj1');
      const obj2 = sceneGraph.createObject('Obj2');
      const obj3 = sceneGraph.createObject('Obj3');

      sceneGraph.add(obj1);
      sceneGraph.add(obj2);
      sceneGraph.add(obj3);

      const visited: string[] = [];
      const completed = sceneGraph.traverseUntil((obj) => {
        visited.push(obj.name);
        return obj.name !== 'Obj1';
      });

      expect(completed).toBe(false);
      expect(visited).toContain('Scene');
      expect(visited).toContain('Obj1');
      expect(visited).not.toContain('Obj2');
    });
  });

  describe('reparent()', () => {
    it('should move object to new parent', () => {
      const parent1 = sceneGraph.createObject('Parent1');
      const parent2 = sceneGraph.createObject('Parent2');
      const child = sceneGraph.createObject('Child');

      sceneGraph.add(parent1);
      sceneGraph.add(parent2);
      sceneGraph.add(child, parent1);

      sceneGraph.reparent(child, parent2);

      expect(child.parent).toBe(parent2);
      expect(parent1.children).not.toContain(child);
      expect(parent2.children).toContain(child);
    });

    it('should emit scene:objectReparented event', () => {
      const handler = vi.fn();
      eventBus.on('scene:objectReparented', handler);

      const parent1 = sceneGraph.createObject('Parent1');
      const parent2 = sceneGraph.createObject('Parent2');
      const child = sceneGraph.createObject('Child');

      sceneGraph.add(parent1);
      sceneGraph.add(parent2);
      sceneGraph.add(child, parent1);
      sceneGraph.reparent(child, parent2);

      expect(handler).toHaveBeenCalledWith({
        object: child,
        oldParent: parent1,
        newParent: parent2,
      });
    });

    it('should prevent circular references', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const parent = sceneGraph.createObject('Parent');
      const child = sceneGraph.createObject('Child');

      sceneGraph.add(parent);
      sceneGraph.add(child, parent);

      sceneGraph.reparent(parent, child);

      expect(parent.parent).not.toBe(child);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('rename()', () => {
    it('should rename object', () => {
      const obj = sceneGraph.createObject('OldName');
      sceneGraph.add(obj);

      sceneGraph.rename(obj, 'NewName');

      expect(obj.name).toBe('NewName');
    });

    it('should emit scene:objectRenamed event', () => {
      const handler = vi.fn();
      eventBus.on('scene:objectRenamed', handler);

      const obj = sceneGraph.createObject('OldName');
      sceneGraph.add(obj);
      sceneGraph.rename(obj, 'NewName');

      expect(handler).toHaveBeenCalledWith({
        object: obj,
        oldName: 'OldName',
        newName: 'NewName',
      });
    });
  });

  describe('getObjectCount()', () => {
    it('should return correct count', () => {
      expect(sceneGraph.getObjectCount()).toBe(1); // Root only

      const obj1 = sceneGraph.createObject('Obj1');
      const obj2 = sceneGraph.createObject('Obj2');

      sceneGraph.add(obj1);
      sceneGraph.add(obj2);

      expect(sceneGraph.getObjectCount()).toBe(3);
    });
  });

  describe('getAllObjects()', () => {
    it('should return all objects', () => {
      const obj1 = sceneGraph.createObject('Obj1');
      const obj2 = sceneGraph.createObject('Obj2');

      sceneGraph.add(obj1);
      sceneGraph.add(obj2);

      const allObjects = sceneGraph.getAllObjects();

      expect(allObjects).toHaveLength(3);
      expect(allObjects).toContain(sceneGraph.getRoot());
      expect(allObjects).toContain(obj1);
      expect(allObjects).toContain(obj2);
    });
  });

  describe('clear()', () => {
    it('should remove all objects except root', () => {
      const obj1 = sceneGraph.createObject('Obj1');
      const obj2 = sceneGraph.createObject('Obj2');

      sceneGraph.add(obj1);
      sceneGraph.add(obj2);

      sceneGraph.clear();

      expect(sceneGraph.getObjectCount()).toBe(1);
      expect(sceneGraph.getRoot().children).toHaveLength(0);
    });

    it('should emit scene:cleared event', () => {
      const handler = vi.fn();
      eventBus.on('scene:cleared', handler);

      sceneGraph.clear();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('has()', () => {
    it('should return true for existing object', () => {
      const obj = sceneGraph.createObject('Obj');
      sceneGraph.add(obj);

      expect(sceneGraph.has(obj.id)).toBe(true);
    });

    it('should return false for non-existent object', () => {
      expect(sceneGraph.has('nonexistent')).toBe(false);
    });
  });

  describe('getDepth()', () => {
    it('should return correct depth', () => {
      const obj1 = sceneGraph.createObject('Obj1');
      const obj2 = sceneGraph.createObject('Obj2');
      const obj3 = sceneGraph.createObject('Obj3');

      sceneGraph.add(obj1);
      sceneGraph.add(obj2, obj1);
      sceneGraph.add(obj3, obj2);

      expect(sceneGraph.getDepth(sceneGraph.getRoot())).toBe(0);
      expect(sceneGraph.getDepth(obj1)).toBe(1);
      expect(sceneGraph.getDepth(obj2)).toBe(2);
      expect(sceneGraph.getDepth(obj3)).toBe(3);
    });
  });

  describe('getPath()', () => {
    it('should return path from root', () => {
      const obj1 = sceneGraph.createObject('Obj1');
      const obj2 = sceneGraph.createObject('Obj2');

      sceneGraph.add(obj1);
      sceneGraph.add(obj2, obj1);

      const path = sceneGraph.getPath(obj2);

      expect(path).toHaveLength(3);
      expect(path[0]).toBe(sceneGraph.getRoot());
      expect(path[1]).toBe(obj1);
      expect(path[2]).toBe(obj2);
    });
  });
});

describe('SceneObject', () => {
  it('should create with default transform', () => {
    const obj = new SceneObject('Test');

    expect(obj.name).toBe('Test');
    expect(obj.id).toBeDefined();
    expect(obj.parent).toBeNull();
    expect(obj.children).toEqual([]);
    expect(obj.transform.position).toEqual([0, 0, 0]);
    expect(obj.transform.rotation).toEqual([0, 0, 0]);
    expect(obj.transform.scale).toEqual([1, 1, 1]);
  });

  it('should accept custom ID', () => {
    const obj = new SceneObject('Test', 'custom-id');

    expect(obj.id).toBe('custom-id');
  });
});
