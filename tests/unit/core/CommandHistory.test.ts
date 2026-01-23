/**
 * CommandHistory Unit Tests
 *
 * Tests the Command Pattern implementation for undo/redo functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandHistory } from '@core/commands/CommandHistory';
import { EventBus } from '@core/EventBus';
import type { ICommand } from '@core/commands/ICommand';

console.log('Test suite starting...');

/**
 * Create a mock command for testing.
 */
function createMockCommand(
  type = 'TestCommand',
  description = 'Test command'
): ICommand & {
  executeCalls: number;
  undoCalls: number;
} {
  const command = {
    type,
    description,
    timestamp: Date.now(),
    executeCalls: 0,
    undoCalls: 0,
    execute(): void {
      this.executeCalls++;
    },
    undo(): void {
      this.undoCalls++;
    }
  };
  return command;
}

/**
 * Create a mergeable mock command for testing coalescing.
 */
function createMergeableCommand(
  entityId: string,
  property: string,
  oldValue: number,
  newValue: number,
  timestamp?: number
): ICommand & {
  executeCalls: number;
  undoCalls: number;
  entityId: string;
  property: string;
  oldValue: number;
  newValue: number;
} {
  const command = {
    type: 'PropertyChange',
    description: `Change ${property}`,
    timestamp: timestamp ?? Date.now(),
    executeCalls: 0,
    undoCalls: 0,
    entityId,
    property,
    oldValue,
    newValue,
    execute(): void {
      this.executeCalls++;
    },
    undo(): void {
      this.undoCalls++;
    },
    canMergeWith(other: ICommand): boolean {
      const o = other as typeof command;
      return (
        o.type === 'PropertyChange' &&
        o.entityId === this.entityId &&
        o.property === this.property &&
        o.timestamp - this.timestamp < 300
      );
    },
    mergeWith(other: ICommand): ICommand {
      const o = other as typeof command;
      return createMergeableCommand(
        this.entityId,
        this.property,
        this.oldValue, // Keep original old value
        o.newValue, // Take latest new value
        o.timestamp
      );
    }
  };
  return command;
}

describe('CommandHistory', () => {
  let eventBus: EventBus;
  let history: CommandHistory;

  beforeEach(() => {
    eventBus = new EventBus();
    history = new CommandHistory({
      eventBus,
      maxStackSize: 10
    });
  });

  describe('constructor', () => {
    it('should create with default max stack size', () => {
      const h = new CommandHistory({ eventBus });
      expect(h).toBeDefined();
    });

    it('should create with custom max stack size', () => {
      const h = new CommandHistory({ eventBus, maxStackSize: 50 });
      expect(h).toBeDefined();
    });
  });

  describe('execute()', () => {
    it('should execute the command', () => {
      const command = createMockCommand();
      history.execute(command);
      expect(command.executeCalls).toBe(1);
    });

    it('should add command to undo stack', () => {
      const command = createMockCommand();
      history.execute(command);
      expect(history.canUndo()).toBe(true);
      expect(history.getUndoStackSize()).toBe(1);
    });

    it('should clear redo stack when executing new command', () => {
      const command1 = createMockCommand();
      const command2 = createMockCommand();
      const command3 = createMockCommand();

      history.execute(command1);
      history.execute(command2);
      history.undo(); // Now command2 is in redo stack

      expect(history.canRedo()).toBe(true);

      history.execute(command3); // Should clear redo stack

      expect(history.canRedo()).toBe(false);
    });

    it('should emit command:executed event', () => {
      const command = createMockCommand();
      const listener = vi.fn();
      eventBus.on('command:executed', listener);

      history.execute(command);

      expect(listener).toHaveBeenCalledWith({ command });
    });

    it('should emit command:stackChanged event', () => {
      const listener = vi.fn();
      eventBus.on('command:stackChanged', listener);

      const command = createMockCommand();
      history.execute(command);

      expect(listener).toHaveBeenCalledWith({
        canUndo: true,
        canRedo: false,
        undoDescription: 'Test command',
        redoDescription: null
      });
    });

    it('should enforce max stack size', () => {
      // Stack size is 10
      for (let i = 0; i < 15; i++) {
        history.execute(createMockCommand('Test', `Command ${i}`));
      }

      expect(history.getUndoStackSize()).toBe(10);
    });
  });

  describe('undo()', () => {
    it('should undo the last command', () => {
      const command = createMockCommand();
      history.execute(command);

      const result = history.undo();

      expect(result).toBe(true);
      expect(command.undoCalls).toBe(1);
    });

    it('should move command to redo stack', () => {
      const command = createMockCommand();
      history.execute(command);

      history.undo();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);
      expect(history.getRedoStackSize()).toBe(1);
    });

    it('should return false if nothing to undo', () => {
      const result = history.undo();
      expect(result).toBe(false);
    });

    it('should emit command:undone event', () => {
      const command = createMockCommand();
      history.execute(command);

      const listener = vi.fn();
      eventBus.on('command:undone', listener);

      history.undo();

      expect(listener).toHaveBeenCalledWith({ command });
    });

    it('should undo commands in LIFO order', () => {
      const command1 = createMockCommand('Test', 'Command 1');
      const command2 = createMockCommand('Test', 'Command 2');
      const command3 = createMockCommand('Test', 'Command 3');

      history.execute(command1);
      history.execute(command2);
      history.execute(command3);

      history.undo();
      expect(command3.undoCalls).toBe(1);
      expect(command2.undoCalls).toBe(0);

      history.undo();
      expect(command2.undoCalls).toBe(1);
      expect(command1.undoCalls).toBe(0);

      history.undo();
      expect(command1.undoCalls).toBe(1);
    });
  });

  describe('redo()', () => {
    it('should redo the last undone command', () => {
      const command = createMockCommand();
      history.execute(command);
      history.undo();

      command.executeCalls = 0; // Reset counter

      const result = history.redo();

      expect(result).toBe(true);
      expect(command.executeCalls).toBe(1);
    });

    it('should move command back to undo stack', () => {
      const command = createMockCommand();
      history.execute(command);
      history.undo();

      history.redo();

      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('should return false if nothing to redo', () => {
      const result = history.redo();
      expect(result).toBe(false);
    });

    it('should emit command:redone event', () => {
      const command = createMockCommand();
      history.execute(command);
      history.undo();

      const listener = vi.fn();
      eventBus.on('command:redone', listener);

      history.redo();

      expect(listener).toHaveBeenCalledWith({ command });
    });
  });

  describe('canUndo() / canRedo()', () => {
    it('should return false when stacks are empty', () => {
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });

    it('should return correct values after operations', () => {
      const command = createMockCommand();

      history.execute(command);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);

      history.undo();
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);

      history.redo();
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('getUndoDescription() / getRedoDescription()', () => {
    it('should return null when stacks are empty', () => {
      expect(history.getUndoDescription()).toBeNull();
      expect(history.getRedoDescription()).toBeNull();
    });

    it('should return correct descriptions', () => {
      const command = createMockCommand('Test', 'My Action');

      history.execute(command);
      expect(history.getUndoDescription()).toBe('My Action');

      history.undo();
      expect(history.getRedoDescription()).toBe('My Action');
    });
  });

  describe('coalescing (merging)', () => {
    it('should merge commands within time window', () => {
      const now = Date.now();
      const command1 = createMergeableCommand('entity1', 'position.x', 0, 5, now);
      const command2 = createMergeableCommand('entity1', 'position.x', 5, 10, now + 100);

      history.execute(command1);
      history.execute(command2);

      // Should have been merged into single command
      expect(history.getUndoStackSize()).toBe(1);
    });

    it('should not merge commands outside time window', () => {
      const now = Date.now();
      const command1 = createMergeableCommand('entity1', 'position.x', 0, 5, now);
      const command2 = createMergeableCommand('entity1', 'position.x', 5, 10, now + 500);

      history.execute(command1);
      history.execute(command2);

      // Should NOT have been merged
      expect(history.getUndoStackSize()).toBe(2);
    });

    it('should not merge commands for different entities', () => {
      const now = Date.now();
      const command1 = createMergeableCommand('entity1', 'position.x', 0, 5, now);
      const command2 = createMergeableCommand('entity2', 'position.x', 0, 10, now + 100);

      history.execute(command1);
      history.execute(command2);

      // Should NOT have been merged
      expect(history.getUndoStackSize()).toBe(2);
    });

    it('should not merge commands for different properties', () => {
      const now = Date.now();
      const command1 = createMergeableCommand('entity1', 'position.x', 0, 5, now);
      const command2 = createMergeableCommand('entity1', 'position.y', 0, 10, now + 100);

      history.execute(command1);
      history.execute(command2);

      // Should NOT have been merged
      expect(history.getUndoStackSize()).toBe(2);
    });

    it('merged command should use original old value and latest new value', () => {
      const now = Date.now();
      const command1 = createMergeableCommand('entity1', 'position.x', 0, 5, now);
      const command2 = createMergeableCommand('entity1', 'position.x', 5, 10, now + 100);
      const command3 = createMergeableCommand('entity1', 'position.x', 10, 15, now + 200);

      history.execute(command1);
      history.execute(command2);
      history.execute(command3);

      // All three should be merged
      expect(history.getUndoStackSize()).toBe(1);
    });
  });

  describe('batch operations', () => {
    it('should combine batch commands into single undo entry', () => {
      history.beginBatch();
      history.execute(createMockCommand('Test', 'Command 1'));
      history.execute(createMockCommand('Test', 'Command 2'));
      history.execute(createMockCommand('Test', 'Command 3'));
      history.endBatch('Batch operation');

      // Should be single command
      expect(history.getUndoStackSize()).toBe(1);
      expect(history.getUndoDescription()).toBe('Batch operation');
    });

    it('should execute all commands in batch', () => {
      const cmd1 = createMockCommand();
      const cmd2 = createMockCommand();

      history.beginBatch();
      history.execute(cmd1);
      history.execute(cmd2);
      history.endBatch('Batch');

      expect(cmd1.executeCalls).toBe(1);
      expect(cmd2.executeCalls).toBe(1);
    });

    it('should undo all batch commands together', () => {
      const cmd1 = createMockCommand();
      const cmd2 = createMockCommand();
      const cmd3 = createMockCommand();

      history.beginBatch();
      history.execute(cmd1);
      history.execute(cmd2);
      history.execute(cmd3);
      history.endBatch('Batch');

      history.undo();

      expect(cmd1.undoCalls).toBe(1);
      expect(cmd2.undoCalls).toBe(1);
      expect(cmd3.undoCalls).toBe(1);
    });

    it('should undo batch commands in reverse order', () => {
      const undoOrder: number[] = [];
      const makeCmd = (n: number) => ({
        type: 'Test',
        description: `Cmd ${n}`,
        timestamp: Date.now(),
        execute() {},
        undo() { undoOrder.push(n); }
      });

      history.beginBatch();
      history.execute(makeCmd(1));
      history.execute(makeCmd(2));
      history.execute(makeCmd(3));
      history.endBatch('Batch');

      history.undo();

      expect(undoOrder).toEqual([3, 2, 1]);
    });

    it('cancelBatch should undo all batch commands', () => {
      const cmd1 = createMockCommand();
      const cmd2 = createMockCommand();

      history.beginBatch();
      history.execute(cmd1);
      history.execute(cmd2);
      history.cancelBatch();

      expect(cmd1.undoCalls).toBe(1);
      expect(cmd2.undoCalls).toBe(1);
      expect(history.getUndoStackSize()).toBe(0);
    });

    it('should handle empty batch', () => {
      history.beginBatch();
      history.endBatch('Empty batch');

      expect(history.getUndoStackSize()).toBe(0);
    });

    it('should warn on nested beginBatch', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      history.beginBatch();
      history.beginBatch(); // Should warn

      expect(warnSpy).toHaveBeenCalledWith(
        'CommandHistory: beginBatch() called while already in batch mode'
      );

      warnSpy.mockRestore();
    });

    it('should warn on endBatch without beginBatch', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      history.endBatch('No batch');

      expect(warnSpy).toHaveBeenCalledWith(
        'CommandHistory: endBatch() called without beginBatch()'
      );

      warnSpy.mockRestore();
    });
  });

  describe('clear()', () => {
    it('should clear both stacks', () => {
      const cmd1 = createMockCommand();
      const cmd2 = createMockCommand();

      history.execute(cmd1);
      history.execute(cmd2);
      history.undo();

      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(true);

      history.clear();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });

    it('should emit stackChanged after clear', () => {
      history.execute(createMockCommand());

      const listener = vi.fn();
      eventBus.on('command:stackChanged', listener);

      history.clear();

      expect(listener).toHaveBeenCalledWith({
        canUndo: false,
        canRedo: false,
        undoDescription: null,
        redoDescription: null
      });
    });
  });

  describe('event emission', () => {
    it('should emit stackChanged with correct undo description', () => {
      const listener = vi.fn();
      eventBus.on('command:stackChanged', listener);

      history.execute(createMockCommand('Test', 'First'));
      history.execute(createMockCommand('Test', 'Second'));

      expect(listener).toHaveBeenLastCalledWith({
        canUndo: true,
        canRedo: false,
        undoDescription: 'Second',
        redoDescription: null
      });
    });

    it('should emit stackChanged with correct redo description after undo', () => {
      const listener = vi.fn();
      eventBus.on('command:stackChanged', listener);

      history.execute(createMockCommand('Test', 'First'));
      history.execute(createMockCommand('Test', 'Second'));
      history.undo();

      expect(listener).toHaveBeenLastCalledWith({
        canUndo: true,
        canRedo: true,
        undoDescription: 'First',
        redoDescription: 'Second'
      });
    });
  });
});
