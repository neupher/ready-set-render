/**
 * TextEditCommand
 *
 * Command for undoing/redoing text editor changes (shader editor).
 * Stores snapshots of the full text content before and after the edit.
 *
 * Features:
 * - Full undo/redo support for text content
 * - Coalescing for rapid typing (multiple keystrokes become single undo entry)
 * - Works with any text content (shaders, JSON, etc.)
 *
 * @example
 * ```typescript
 * const command = new TextEditCommand({
 *   textareaId: 'shader-editor',
 *   oldText: '// Old shader code',
 *   newText: '// New shader code',
 *   getTextarea: () => document.getElementById('shader-editor') as HTMLTextAreaElement,
 *   eventBus
 * });
 *
 * commandHistory.execute(command);
 * ```
 */

import type { EventBus } from '../EventBus';
import type { ICommand } from './ICommand';

/**
 * Time window for coalescing rapid text edits (milliseconds).
 */
const COALESCE_WINDOW_MS = 1000;

export interface TextEditCommandOptions {
  /** Unique identifier for the text editor */
  editorId: string;

  /** Text content before the edit */
  oldText: string;

  /** Text content after the edit */
  newText: string;

  /**
   * Function to get the textarea element.
   * We use a getter because the element might be recreated.
   */
  getTextarea: () => HTMLTextAreaElement | null;

  /** Event bus for emitting update events */
  eventBus: EventBus;

  /** Optional description override */
  description?: string;

  /** Optional timestamp (defaults to Date.now()) */
  timestamp?: number;
}

/**
 * Command for text editor changes.
 * Supports undo/redo and coalescing for rapid typing.
 */
export class TextEditCommand implements ICommand {
  readonly type = 'TextEdit';
  readonly description: string;
  readonly timestamp: number;

  readonly editorId: string;
  readonly oldText: string;
  readonly newText: string;

  private readonly getTextarea: () => HTMLTextAreaElement | null;
  private readonly eventBus: EventBus;

  constructor(options: TextEditCommandOptions) {
    this.editorId = options.editorId;
    this.oldText = options.oldText;
    this.newText = options.newText;
    this.getTextarea = options.getTextarea;
    this.eventBus = options.eventBus;
    this.timestamp = options.timestamp ?? Date.now();

    this.description = options.description ?? 'Edit text';
  }

  /**
   * Execute the command (apply newText).
   */
  execute(): void {
    const textarea = this.getTextarea();
    if (textarea) {
      textarea.value = this.newText;
      // Emit event for any listeners
      this.eventBus.emit('textEditor:changed', {
        editorId: this.editorId,
        text: this.newText
      });
    }
  }

  /**
   * Undo the command (restore oldText).
   */
  undo(): void {
    const textarea = this.getTextarea();
    if (textarea) {
      textarea.value = this.oldText;
      // Emit event for any listeners
      this.eventBus.emit('textEditor:changed', {
        editorId: this.editorId,
        text: this.oldText
      });
    }
  }

  /**
   * Check if this command can be merged with another.
   * Text commands can be merged if they:
   * - Are both TextEditCommands
   * - Target the same editor
   * - Are within the coalescing time window
   */
  canMergeWith(other: ICommand): boolean {
    if (!(other instanceof TextEditCommand)) {
      return false;
    }

    return (
      other.editorId === this.editorId &&
      other.timestamp - this.timestamp < COALESCE_WINDOW_MS
    );
  }

  /**
   * Merge this command with another.
   * Keeps the original old text and takes the new command's new text.
   */
  mergeWith(other: ICommand): ICommand {
    if (!(other instanceof TextEditCommand)) {
      return other;
    }

    return new TextEditCommand({
      editorId: this.editorId,
      oldText: this.oldText, // Keep original old text
      newText: other.newText, // Take latest new text
      getTextarea: this.getTextarea,
      eventBus: this.eventBus,
      description: this.description,
      timestamp: other.timestamp
    });
  }
}
