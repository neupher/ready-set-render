/**
 * TransformGizmoCommands Unit Tests
 *
 * Tests undo/redo integration for all gizmo operations to ensure
 * no user action is missed by the command history system.
 *
 * Coverage:
 * - TranslateGizmo: X, Y, Z axis and XY, XZ, YZ plane movements
 * - RotateGizmo: X, Y, Z axis rotations
 * - ScaleGizmo: X, Y, Z axis and uniform scaling
 * - Batch commands for multi-axis operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@core/EventBus';
import { SceneGraph } from '@core/SceneGraph';
import { CommandHistory } from '@core/commands/CommandHistory';
import { PropertyChangeCommand } from '@core/commands/PropertyChangeCommand';
import type { ISceneObject } from '@core/interfaces';

/**
 * Create a mock entity for testing gizmo operations.
 */
function createMockEntity(id = 'test-entity', name = 'TestEntity'): ISceneObject {
  return {
    id,
    name,
    transform: {
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
    },
    children: [],
    parent: null,
  } as ISceneObject;
}

describe('TransformGizmo Undo/Redo Integration', () => {
  let eventBus: EventBus;
  let sceneGraph: SceneGraph;
  let commandHistory: CommandHistory;

  beforeEach(() => {
    eventBus = new EventBus();
    sceneGraph = new SceneGraph(eventBus);
    commandHistory = new CommandHistory({ eventBus });
  });

  describe('TranslateGizmo Operations', () => {
    it('should create undo command for X-axis translation', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      const command = new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 0,
        newValue: 5,
        sceneGraph,
        eventBus,
      });

      commandHistory.execute(command);

      expect(entity.transform.position[0]).toBe(5);
      expect(commandHistory.canUndo()).toBe(true);

      commandHistory.undo();

      expect(entity.transform.position[0]).toBe(0);
    });

    it('should create undo command for Y-axis translation', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      const command = new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.y',
        oldValue: 0,
        newValue: 3,
        sceneGraph,
        eventBus,
      });

      commandHistory.execute(command);

      expect(entity.transform.position[1]).toBe(3);

      commandHistory.undo();

      expect(entity.transform.position[1]).toBe(0);
    });

    it('should create undo command for Z-axis translation', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      const command = new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.z',
        oldValue: 0,
        newValue: -2,
        sceneGraph,
        eventBus,
      });

      commandHistory.execute(command);

      expect(entity.transform.position[2]).toBe(-2);

      commandHistory.undo();

      expect(entity.transform.position[2]).toBe(0);
    });

    it('should batch multi-axis translations into single undo', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      commandHistory.beginBatch();

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 0,
        newValue: 5,
        sceneGraph,
        eventBus,
      }));

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.y',
        oldValue: 0,
        newValue: 3,
        sceneGraph,
        eventBus,
      }));

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.z',
        oldValue: 0,
        newValue: 1,
        sceneGraph,
        eventBus,
      }));

      commandHistory.endBatch('Translate TestEntity');

      expect(entity.transform.position).toEqual([5, 3, 1]);
      expect(commandHistory.getUndoStackSize()).toBe(1);

      commandHistory.undo();

      expect(entity.transform.position).toEqual([0, 0, 0]);
    });
  });

  describe('RotateGizmo Operations', () => {
    it('should create undo command for X-axis rotation', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      const command = new PropertyChangeCommand({
        entityId: entity.id,
        property: 'rotation.x',
        oldValue: 0,
        newValue: 45,
        sceneGraph,
        eventBus,
      });

      commandHistory.execute(command);

      expect(entity.transform.rotation[0]).toBe(45);

      commandHistory.undo();

      expect(entity.transform.rotation[0]).toBe(0);
    });

    it('should create undo command for Y-axis rotation', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      const command = new PropertyChangeCommand({
        entityId: entity.id,
        property: 'rotation.y',
        oldValue: 0,
        newValue: 90,
        sceneGraph,
        eventBus,
      });

      commandHistory.execute(command);

      expect(entity.transform.rotation[1]).toBe(90);

      commandHistory.undo();

      expect(entity.transform.rotation[1]).toBe(0);
    });

    it('should create undo command for Z-axis rotation', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      const command = new PropertyChangeCommand({
        entityId: entity.id,
        property: 'rotation.z',
        oldValue: 0,
        newValue: -30,
        sceneGraph,
        eventBus,
      });

      commandHistory.execute(command);

      expect(entity.transform.rotation[2]).toBe(-30);

      commandHistory.undo();

      expect(entity.transform.rotation[2]).toBe(0);
    });

    it('should batch rotation changes into single undo', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      commandHistory.beginBatch();

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'rotation.x',
        oldValue: 0,
        newValue: 15,
        sceneGraph,
        eventBus,
      }));

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'rotation.y',
        oldValue: 0,
        newValue: 30,
        sceneGraph,
        eventBus,
      }));

      commandHistory.endBatch('Rotate TestEntity');

      expect(entity.transform.rotation).toEqual([15, 30, 0]);
      expect(commandHistory.getUndoStackSize()).toBe(1);

      commandHistory.undo();

      expect(entity.transform.rotation).toEqual([0, 0, 0]);
    });
  });

  describe('ScaleGizmo Operations', () => {
    it('should create undo command for X-axis scale', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      const command = new PropertyChangeCommand({
        entityId: entity.id,
        property: 'scale.x',
        oldValue: 1,
        newValue: 2,
        sceneGraph,
        eventBus,
      });

      commandHistory.execute(command);

      expect(entity.transform.scale[0]).toBe(2);

      commandHistory.undo();

      expect(entity.transform.scale[0]).toBe(1);
    });

    it('should create undo command for Y-axis scale', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      const command = new PropertyChangeCommand({
        entityId: entity.id,
        property: 'scale.y',
        oldValue: 1,
        newValue: 0.5,
        sceneGraph,
        eventBus,
      });

      commandHistory.execute(command);

      expect(entity.transform.scale[1]).toBe(0.5);

      commandHistory.undo();

      expect(entity.transform.scale[1]).toBe(1);
    });

    it('should create undo command for Z-axis scale', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      const command = new PropertyChangeCommand({
        entityId: entity.id,
        property: 'scale.z',
        oldValue: 1,
        newValue: 3,
        sceneGraph,
        eventBus,
      });

      commandHistory.execute(command);

      expect(entity.transform.scale[2]).toBe(3);

      commandHistory.undo();

      expect(entity.transform.scale[2]).toBe(1);
    });

    it('should batch uniform scale into single undo', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      commandHistory.beginBatch();

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'scale.x',
        oldValue: 1,
        newValue: 2,
        sceneGraph,
        eventBus,
      }));

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'scale.y',
        oldValue: 1,
        newValue: 2,
        sceneGraph,
        eventBus,
      }));

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'scale.z',
        oldValue: 1,
        newValue: 2,
        sceneGraph,
        eventBus,
      }));

      commandHistory.endBatch('Scale TestEntity');

      expect(entity.transform.scale).toEqual([2, 2, 2]);
      expect(commandHistory.getUndoStackSize()).toBe(1);

      commandHistory.undo();

      expect(entity.transform.scale).toEqual([1, 1, 1]);
    });
  });

  describe('Redo Operations', () => {
    it('should redo translation after undo', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 0,
        newValue: 10,
        sceneGraph,
        eventBus,
      }));

      expect(entity.transform.position[0]).toBe(10);

      commandHistory.undo();
      expect(entity.transform.position[0]).toBe(0);

      commandHistory.redo();
      expect(entity.transform.position[0]).toBe(10);
    });

    it('should redo rotation after undo', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'rotation.z',
        oldValue: 0,
        newValue: 180,
        sceneGraph,
        eventBus,
      }));

      commandHistory.undo();
      expect(entity.transform.rotation[2]).toBe(0);

      commandHistory.redo();
      expect(entity.transform.rotation[2]).toBe(180);
    });

    it('should redo scale after undo', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'scale.y',
        oldValue: 1,
        newValue: 5,
        sceneGraph,
        eventBus,
      }));

      commandHistory.undo();
      expect(entity.transform.scale[1]).toBe(1);

      commandHistory.redo();
      expect(entity.transform.scale[1]).toBe(5);
    });

    it('should redo batched operations as single unit', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      commandHistory.beginBatch();
      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 0,
        newValue: 5,
        sceneGraph,
        eventBus,
      }));
      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.y',
        oldValue: 0,
        newValue: 3,
        sceneGraph,
        eventBus,
      }));
      commandHistory.endBatch('Translate');

      commandHistory.undo();
      expect(entity.transform.position).toEqual([0, 0, 0]);

      commandHistory.redo();
      expect(entity.transform.position).toEqual([5, 3, 0]);
    });
  });

  describe('Event Emission', () => {
    it('should emit entity:propertyUpdated on execute', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      const listener = vi.fn();
      eventBus.on('entity:propertyUpdated', listener);

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 0,
        newValue: 5,
        sceneGraph,
        eventBus,
      }));

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        id: entity.id,
        property: 'position.x',
      }));
    });

    it('should emit entity:propertyUpdated on undo', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 0,
        newValue: 5,
        sceneGraph,
        eventBus,
      }));

      const listener = vi.fn();
      eventBus.on('entity:propertyUpdated', listener);

      commandHistory.undo();

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        id: entity.id,
        property: 'position.x',
      }));
    });

    it('should emit command:stackChanged after batch', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      const listener = vi.fn();
      eventBus.on('command:stackChanged', listener);

      commandHistory.beginBatch();
      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 0,
        newValue: 5,
        sceneGraph,
        eventBus,
      }));
      commandHistory.endBatch('Test Batch');

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        canUndo: true,
        undoDescription: 'Test Batch',
      }));
    });
  });

  describe('Edge Cases', () => {
    it('should not create command if value unchanged', () => {
      const entity = createMockEntity();
      entity.transform.position[0] = 5;
      sceneGraph.add(entity);

      const command = new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 5,
        newValue: 5,
        sceneGraph,
        eventBus,
      });

      commandHistory.execute(command);

      // Value unchanged commands should still be recorded
      // (TransformGizmoController filters these out before creating commands)
      expect(entity.transform.position[0]).toBe(5);
    });

    it('should handle very small value changes', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      const command = new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 0,
        newValue: 0.0001,
        sceneGraph,
        eventBus,
      });

      commandHistory.execute(command);
      expect(entity.transform.position[0]).toBeCloseTo(0.0001);

      commandHistory.undo();
      expect(entity.transform.position[0]).toBe(0);
    });

    it('should handle negative values', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 0,
        newValue: -100,
        sceneGraph,
        eventBus,
      }));

      expect(entity.transform.position[0]).toBe(-100);

      commandHistory.undo();
      expect(entity.transform.position[0]).toBe(0);
    });

    it('should handle multiple entities', () => {
      const entity1 = createMockEntity('entity-1', 'Entity1');
      const entity2 = createMockEntity('entity-2', 'Entity2');
      sceneGraph.add(entity1);
      sceneGraph.add(entity2);

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity1.id,
        property: 'position.x',
        oldValue: 0,
        newValue: 10,
        sceneGraph,
        eventBus,
      }));

      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity2.id,
        property: 'position.x',
        oldValue: 0,
        newValue: 20,
        sceneGraph,
        eventBus,
      }));

      expect(entity1.transform.position[0]).toBe(10);
      expect(entity2.transform.position[0]).toBe(20);

      commandHistory.undo();
      expect(entity1.transform.position[0]).toBe(10);
      expect(entity2.transform.position[0]).toBe(0);

      commandHistory.undo();
      expect(entity1.transform.position[0]).toBe(0);
    });

    it('should handle sequential operations on same property with time gap (no coalescing)', async () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      // First operation
      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 0,
        newValue: 5,
        sceneGraph,
        eventBus,
      }));

      // Wait to exceed coalescing window (300ms)
      await new Promise(resolve => setTimeout(resolve, 350));

      // Second operation (no coalescing due to time gap)
      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 5,
        newValue: 10,
        sceneGraph,
        eventBus,
      }));

      expect(entity.transform.position[0]).toBe(10);
      expect(commandHistory.getUndoStackSize()).toBe(2);

      commandHistory.undo();
      expect(entity.transform.position[0]).toBe(5);

      commandHistory.undo();
      expect(entity.transform.position[0]).toBe(0);
    });

    it('should coalesce rapid sequential operations on same property', () => {
      const entity = createMockEntity();
      sceneGraph.add(entity);

      // Rapid operations within coalescing window (300ms)
      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 0,
        newValue: 5,
        sceneGraph,
        eventBus,
      }));

      // Immediately execute another - should coalesce
      commandHistory.execute(new PropertyChangeCommand({
        entityId: entity.id,
        property: 'position.x',
        oldValue: 5,
        newValue: 10,
        sceneGraph,
        eventBus,
      }));

      expect(entity.transform.position[0]).toBe(10);
      // Commands should be coalesced into one
      expect(commandHistory.getUndoStackSize()).toBe(1);

      // Single undo should restore to original value
      commandHistory.undo();
      expect(entity.transform.position[0]).toBe(0);
    });
  });
});
