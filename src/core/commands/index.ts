/**
 * Commands Module - Barrel Export
 *
 * This module provides the Command Pattern implementation for undo/redo.
 * All data-modifying operations should use commands for full undo support.
 *
 * @example
 * ```typescript
 * import {
 *   CommandHistory,
 *   PropertyChangeCommand,
 *   TextEditCommand,
 *   DeleteEntityCommand,
 *   DuplicateEntityCommand
 * } from '@core/commands';
 *
 * const history = new CommandHistory({ eventBus, maxStackSize: 100 });
 * history.execute(new PropertyChangeCommand({ ... }));
 * history.undo();
 * history.redo();
 * ```
 */

export { type ICommand, isMergeableCommand } from './ICommand';
export {
  CommandHistory,
  type CommandHistoryOptions,
  type CommandHistoryEvents
} from './CommandHistory';
export {
  PropertyChangeCommand,
  type PropertyChangeCommandOptions
} from './PropertyChangeCommand';
export {
  TextEditCommand,
  type TextEditCommandOptions
} from './TextEditCommand';
export {
  DeleteEntityCommand,
  type DeleteEntityCommandOptions
} from './DeleteEntityCommand';
export {
  DuplicateEntityCommand,
  type DuplicateEntityCommandOptions
} from './DuplicateEntityCommand';
