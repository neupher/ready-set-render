/**
 * CommandHistory
 *
 * Central manager for the undo/redo system.
 * Maintains command stacks and dispatches undo/redo operations.
 *
 * Features:
 * - Undo/redo stacks with configurable max size
 * - Command coalescing for rapid changes (e.g., slider drags)
 * - Event emission for UI updates
 * - Batch operations support (multiple commands as one undo entry)
 *
 * @example
 * ```typescript
 * const history = new CommandHistory({
 *   eventBus,
 *   maxStackSize: 100
 * });
 *
 * // Execute a command (adds to undo stack)
 * history.execute(new PropertyChangeCommand(...));
 *
 * // Undo last command
 * history.undo();
 *
 * // Redo last undone command
 * history.redo();
 * ```
 */

import type { EventBus } from '../EventBus';
import type { ICommand } from './ICommand';
import { isMergeableCommand } from './ICommand';

/**
 * Time window for coalescing rapid changes (milliseconds).
 */
const COALESCE_WINDOW_MS = 300;

/**
 * Events emitted by CommandHistory.
 */
export interface CommandHistoryEvents {
  /**
   * Emitted when a command is executed.
   */
  'command:executed': { command: ICommand };

  /**
   * Emitted when a command is undone.
   */
  'command:undone': { command: ICommand };

  /**
   * Emitted when a command is redone.
   */
  'command:redone': { command: ICommand };

  /**
   * Emitted when the undo/redo stack state changes.
   * UI can use this to update Undo/Redo button states.
   */
  'command:stackChanged': {
    canUndo: boolean;
    canRedo: boolean;
    undoDescription: string | null;
    redoDescription: string | null;
  };
}

export interface CommandHistoryOptions {
  /** Event bus for emitting state change events */
  eventBus: EventBus;

  /**
   * Maximum number of commands to keep in the undo stack.
   * Oldest commands are removed when limit is exceeded.
   * @default 100
   */
  maxStackSize?: number;
}

/**
 * Central manager for undo/redo operations.
 */
export class CommandHistory {
  private readonly eventBus: EventBus;
  private readonly maxStackSize: number;

  /** Stack of commands that can be undone (most recent at end) */
  private readonly undoStack: ICommand[] = [];

  /** Stack of commands that can be redone (most recent at end) */
  private readonly redoStack: ICommand[] = [];

  /** Batch mode: commands collected during batch are combined */
  private batchCommands: ICommand[] | null = null;

  constructor(options: CommandHistoryOptions) {
    this.eventBus = options.eventBus;
    this.maxStackSize = options.maxStackSize ?? 100;
  }

  /**
   * Execute a command and add it to the undo stack.
   * Clears the redo stack (forward history is lost on new action).
   *
   * If the command can be merged with the previous command
   * (same type, same target, within time window), they are coalesced.
   *
   * @param command - The command to execute
   */
  execute(command: ICommand): void {
    // If in batch mode, collect command without executing
    if (this.batchCommands !== null) {
      this.batchCommands.push(command);
      command.execute();
      return;
    }

    // Try to coalesce with the last command
    if (this.undoStack.length > 0) {
      const lastCommand = this.undoStack[this.undoStack.length - 1];

      if (
        isMergeableCommand(lastCommand) &&
        lastCommand.canMergeWith(command) &&
        command.timestamp - lastCommand.timestamp < COALESCE_WINDOW_MS
      ) {
        // Merge commands: remove old, add merged
        this.undoStack.pop();
        const merged = lastCommand.mergeWith(command);
        // Execute only the delta (the command's execute brings us to new state)
        command.execute();
        this.undoStack.push(merged);
        this.clearRedoStack();
        this.emitStackChanged();
        return;
      }
    }

    // Execute the command
    command.execute();

    // Add to undo stack
    this.undoStack.push(command);

    // Enforce max stack size
    while (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    // Clear redo stack (forward history is lost)
    this.clearRedoStack();

    // Emit events
    this.eventBus.emit('command:executed', { command });
    this.emitStackChanged();
  }

  /**
   * Undo the last command.
   * Moves the command from undo stack to redo stack.
   *
   * @returns True if a command was undone, false if nothing to undo
   */
  undo(): boolean {
    const command = this.undoStack.pop();
    if (!command) {
      return false;
    }

    command.undo();
    this.redoStack.push(command);

    this.eventBus.emit('command:undone', { command });
    this.emitStackChanged();

    return true;
  }

  /**
   * Redo the last undone command.
   * Moves the command from redo stack to undo stack.
   *
   * @returns True if a command was redone, false if nothing to redo
   */
  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) {
      return false;
    }

    command.execute();
    this.undoStack.push(command);

    this.eventBus.emit('command:redone', { command });
    this.emitStackChanged();

    return true;
  }

  /**
   * Check if there are commands to undo.
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if there are commands to redo.
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get the description of the next command to undo.
   */
  getUndoDescription(): string | null {
    if (this.undoStack.length === 0) {
      return null;
    }
    return this.undoStack[this.undoStack.length - 1].description;
  }

  /**
   * Get the description of the next command to redo.
   */
  getRedoDescription(): string | null {
    if (this.redoStack.length === 0) {
      return null;
    }
    return this.redoStack[this.redoStack.length - 1].description;
  }

  /**
   * Get the current undo stack size.
   */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * Get the current redo stack size.
   */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  /**
   * Begin a batch operation.
   * All commands executed until endBatch() are combined into a single undo entry.
   *
   * @example
   * ```typescript
   * history.beginBatch();
   * history.execute(new PropertyChangeCommand(..., 'position.x', ...));
   * history.execute(new PropertyChangeCommand(..., 'position.y', ...));
   * history.execute(new PropertyChangeCommand(..., 'position.z', ...));
   * history.endBatch('Move object'); // Single undo entry
   * ```
   */
  beginBatch(): void {
    if (this.batchCommands !== null) {
      console.warn('CommandHistory: beginBatch() called while already in batch mode');
      return;
    }
    this.batchCommands = [];
  }

  /**
   * End a batch operation and combine all collected commands.
   *
   * @param description - Description for the combined command
   */
  endBatch(description: string): void {
    if (this.batchCommands === null) {
      console.warn('CommandHistory: endBatch() called without beginBatch()');
      return;
    }

    const commands = this.batchCommands;
    this.batchCommands = null;

    if (commands.length === 0) {
      return;
    }

    // Create composite command
    const composite = new CompositeCommand(commands, description);
    this.undoStack.push(composite);

    // Enforce max stack size
    while (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    // Clear redo stack
    this.clearRedoStack();

    this.eventBus.emit('command:executed', { command: composite });
    this.emitStackChanged();
  }

  /**
   * Cancel a batch operation and undo all commands in the batch.
   */
  cancelBatch(): void {
    if (this.batchCommands === null) {
      return;
    }

    // Undo all commands in reverse order
    const commands = this.batchCommands;
    this.batchCommands = null;

    for (let i = commands.length - 1; i >= 0; i--) {
      commands[i].undo();
    }
  }

  /**
   * Clear both undo and redo stacks.
   * Use this when loading a new scene or resetting state.
   */
  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.batchCommands = null;
    this.emitStackChanged();
  }

  /**
   * Clear the redo stack.
   */
  private clearRedoStack(): void {
    this.redoStack.length = 0;
  }

  /**
   * Emit stack changed event for UI updates.
   */
  private emitStackChanged(): void {
    this.eventBus.emit('command:stackChanged', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoDescription: this.getUndoDescription(),
      redoDescription: this.getRedoDescription()
    });
  }
}

/**
 * Composite command that combines multiple commands into one.
 * Used for batch operations.
 */
class CompositeCommand implements ICommand {
  readonly type = 'Composite';
  readonly description: string;
  readonly timestamp: number;

  constructor(
    private readonly commands: ICommand[],
    description: string
  ) {
    this.description = description;
    this.timestamp = commands.length > 0 ? commands[0].timestamp : Date.now();
  }

  execute(): void {
    for (const command of this.commands) {
      command.execute();
    }
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}
