/**
 * SceneGraph Command Contract Tests
 *
 * Validates that all SceneGraph methods used by command classes
 * actually exist on the real SceneGraph instance. This prevents
 * test failures caused by calling non-existent methods (e.g.,
 * using `getById` when the real method is `find`).
 *
 * These tests use the REAL SceneGraph — no mocks — to guarantee
 * that the API surface matches what commands depend on.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SceneGraph } from '@core/SceneGraph';
import { EventBus } from '@core/EventBus';

describe('SceneGraph command contract', () => {
  let eventBus: EventBus;
  let sceneGraph: SceneGraph;

  beforeEach(() => {
    eventBus = new EventBus();
    sceneGraph = new SceneGraph(eventBus);
  });

  describe('methods required by commands', () => {
    it('should expose add() used by CreateEntityCommand and DeleteEntityCommand', () => {
      expect(typeof sceneGraph.add).toBe('function');
    });

    it('should expose remove() used by CreateEntityCommand and DeleteEntityCommand', () => {
      expect(typeof sceneGraph.remove).toBe('function');
    });

    it('should expose find() used by PropertyChangeCommand and DeleteEntityCommand', () => {
      expect(typeof sceneGraph.find).toBe('function');
    });

    it('should expose traverse() used by DuplicateEntityCommand', () => {
      expect(typeof sceneGraph.traverse).toBe('function');
    });

    it('should expose getRoot() used by scene operations', () => {
      expect(typeof sceneGraph.getRoot).toBe('function');
    });
  });

  describe('find() contract', () => {
    it('should return the object when it exists', () => {
      const obj = sceneGraph.createObject('TestEntity');
      sceneGraph.add(obj);

      const found = sceneGraph.find(obj.id);
      expect(found).toBe(obj);
    });

    it('should return undefined when object does not exist', () => {
      const found = sceneGraph.find('nonexistent-id');
      expect(found).toBeUndefined();
    });

    it('should return undefined after object is removed', () => {
      const obj = sceneGraph.createObject('TestEntity');
      sceneGraph.add(obj);
      sceneGraph.remove(obj);

      const found = sceneGraph.find(obj.id);
      expect(found).toBeUndefined();
    });
  });

  describe('add/remove round-trip', () => {
    it('should support add → remove → re-add (undo/redo pattern)', () => {
      const obj = sceneGraph.createObject('TestEntity');

      sceneGraph.add(obj);
      expect(sceneGraph.find(obj.id)).toBe(obj);

      sceneGraph.remove(obj);
      expect(sceneGraph.find(obj.id)).toBeUndefined();

      sceneGraph.add(obj);
      expect(sceneGraph.find(obj.id)).toBe(obj);
    });
  });

  describe('non-existent methods guard', () => {
    it('should NOT have getById (common mistake — use find instead)', () => {
      expect((sceneGraph as Record<string, unknown>)['getById']).toBeUndefined();
    });

    it('should NOT have removeObject (common mistake — use remove instead)', () => {
      expect((sceneGraph as Record<string, unknown>)['removeObject']).toBeUndefined();
    });

    it('should NOT have addObject (common mistake — use add instead)', () => {
      expect((sceneGraph as Record<string, unknown>)['addObject']).toBeUndefined();
    });

    it('should NOT have findById (common mistake — use find instead)', () => {
      expect((sceneGraph as Record<string, unknown>)['findById']).toBeUndefined();
    });

    it('should NOT have get (common mistake — use find instead)', () => {
      expect((sceneGraph as Record<string, unknown>)['get']).toBeUndefined();
    });
  });
});
