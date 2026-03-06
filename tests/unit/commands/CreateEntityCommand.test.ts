/**
 * CreateEntityCommand Unit Tests
 *
 * Tests for the CreateEntityCommand used when instantiating
 * entities from assets (e.g., importing models, drag-drop).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateEntityCommand } from '@core/commands/CreateEntityCommand';
import { EventBus } from '@core/EventBus';
import { SceneGraph } from '@core/SceneGraph';
import type { ISceneObject, Transform } from '@core/interfaces';

// Mock entity for testing
class MockEntity implements ISceneObject {
  id: string;
  name: string;
  transform: Transform;
  parent: ISceneObject | null = null;
  children: ISceneObject[] = [];

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.transform = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };
  }

  render(): void {}
}

describe('CreateEntityCommand', () => {
  let eventBus: EventBus;
  let sceneGraph: SceneGraph;

  beforeEach(() => {
    eventBus = new EventBus();
    sceneGraph = new SceneGraph(eventBus);
  });

  describe('constructor', () => {
    it('should accept individual arguments', () => {
      const entity = new MockEntity('test-id', 'TestEntity');
      const command = new CreateEntityCommand(entity, sceneGraph, eventBus);

      expect(command.type).toBe('CreateEntity');
      expect(command.description).toBe('Create TestEntity');
      expect(command.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should accept options object', () => {
      const entity = new MockEntity('test-id', 'TestEntity');
      const command = new CreateEntityCommand({
        entity,
        sceneGraph,
        eventBus,
      });

      expect(command.type).toBe('CreateEntity');
      expect(command.description).toBe('Create TestEntity');
    });
  });

  describe('execute', () => {
    it('should add entity to scene graph', () => {
      const entity = new MockEntity('test-id', 'TestEntity');
      const command = new CreateEntityCommand(entity, sceneGraph, eventBus);

      command.execute();

      const found = sceneGraph.find('test-id');
      expect(found).toBe(entity);
    });

    it('should emit selection:changed event', () => {
      const entity = new MockEntity('test-id', 'TestEntity');
      const command = new CreateEntityCommand(entity, sceneGraph, eventBus);
      const selectionHandler = vi.fn();
      eventBus.on('selection:changed', selectionHandler);

      command.execute();

      expect(selectionHandler).toHaveBeenCalledWith({ id: 'test-id' });
    });

    it('should emit entity:created event', () => {
      const entity = new MockEntity('test-id', 'TestEntity');
      const command = new CreateEntityCommand(entity, sceneGraph, eventBus);
      const createdHandler = vi.fn();
      eventBus.on('entity:created', createdHandler);

      command.execute();

      expect(createdHandler).toHaveBeenCalledWith({
        id: 'test-id',
        name: 'TestEntity',
      });
    });
  });

  describe('undo', () => {
    it('should remove entity from scene graph', () => {
      const entity = new MockEntity('test-id', 'TestEntity');
      const command = new CreateEntityCommand(entity, sceneGraph, eventBus);

      command.execute();
      expect(sceneGraph.find('test-id')).toBe(entity);

      command.undo();
      expect(sceneGraph.find('test-id')).toBeUndefined();
    });

    it('should emit selection:clear event', () => {
      const entity = new MockEntity('test-id', 'TestEntity');
      const command = new CreateEntityCommand(entity, sceneGraph, eventBus);
      const clearHandler = vi.fn();
      eventBus.on('selection:clear', clearHandler);

      command.execute();
      command.undo();

      expect(clearHandler).toHaveBeenCalled();
    });
  });

  describe('redo (execute after undo)', () => {
    it('should re-add entity to scene graph', () => {
      const entity = new MockEntity('test-id', 'TestEntity');
      const command = new CreateEntityCommand(entity, sceneGraph, eventBus);

      command.execute();
      command.undo();
      command.execute();

      const found = sceneGraph.find('test-id');
      expect(found).toBe(entity);
    });
  });
});
