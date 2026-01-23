/**
 * ICommand Interface
 *
 * Base interface for the Command Pattern used in the undo/redo system.
 * All data-modifying operations must be implemented as commands.
 *
 * Commands are reversible operations that can be executed, undone, and redone.
 * They support coalescing (merging) for rapid changes like slider drags.
 *
 * @example
 * ```typescript
 * class PropertyChangeCommand implements ICommand {
 *   readonly type = 'PropertyChange';
 *   readonly description = 'Change position.x';
 *   readonly timestamp = Date.now();
 *
 *   execute(): void {
 *     this.entity.transform.position[0] = this.newValue;
 *   }
 *
 *   undo(): void {
 *     this.entity.transform.position[0] = this.oldValue;
 *   }
 * }
 * ```
 */

/**
 * Base interface for all undoable commands.
 */
export interface ICommand {
  /**
   * Command type identifier.
   * Used for debugging and UI display.
   *
   * @example 'PropertyChange', 'TextEdit', 'CreateEntity'
   */
  readonly type: string;

  /**
   * Human-readable description of the command.
   * Displayed in the Edit menu or undo history UI.
   *
   * @example 'Change position.x', 'Edit shader code'
   */
  readonly description: string;

  /**
   * Timestamp when the command was created.
   * Used for coalescing rapid changes.
   */
  readonly timestamp: number;

  /**
   * Execute the command (apply the forward operation).
   * Called when the command is first executed or when redoing.
   */
  execute(): void;

  /**
   * Undo the command (apply the reverse operation).
   * Called when the user presses Ctrl+Z or clicks Undo.
   */
  undo(): void;

  /**
   * Check if this command can be merged with another command.
   * Used for coalescing rapid changes (e.g., slider drags).
   *
   * @param other - The newer command to potentially merge with
   * @returns True if the commands can be merged
   *
   * @example
   * ```typescript
   * canMergeWith(other: ICommand): boolean {
   *   // Merge if same entity, same property, within 300ms
   *   return (
   *     other.type === this.type &&
   *     other instanceof PropertyChangeCommand &&
   *     other.entityId === this.entityId &&
   *     other.property === this.property &&
   *     other.timestamp - this.timestamp < 300
   *   );
   * }
   * ```
   */
  canMergeWith?(other: ICommand): boolean;

  /**
   * Merge this command with another command.
   * Returns a new command that combines both operations.
   *
   * @param other - The newer command to merge with
   * @returns A new command that represents both operations
   *
   * @example
   * ```typescript
   * mergeWith(other: PropertyChangeCommand): ICommand {
   *   // Keep original old value, take new command's new value
   *   return new PropertyChangeCommand(
   *     this.entityId,
   *     this.property,
   *     this.oldValue,     // Original old value
   *     other.newValue,    // Latest new value
   *     this.sceneGraph,
   *     this.eventBus
   *   );
   * }
   * ```
   */
  mergeWith?(other: ICommand): ICommand;
}

/**
 * Type guard to check if a command supports merging.
 *
 * @param command - The command to check
 * @returns True if the command has canMergeWith and mergeWith methods
 */
export function isMergeableCommand(
  command: ICommand
): command is ICommand & Required<Pick<ICommand, 'canMergeWith' | 'mergeWith'>> {
  return (
    typeof command.canMergeWith === 'function' &&
    typeof command.mergeWith === 'function'
  );
}
