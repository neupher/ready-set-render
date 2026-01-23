/**
 * KeyboardShortcutManager
 *
 * Centralized handler for global keyboard shortcuts.
 * Registers and dispatches shortcuts like Ctrl+Z (undo), Ctrl+Y (redo), etc.
 *
 * Features:
 * - Register/unregister keyboard shortcuts
 * - Modifier key support (Ctrl, Shift, Alt)
 * - Input/textarea awareness (optionally skip when in text input)
 * - Built-in undo/redo support
 *
 * @example
 * ```typescript
 * const shortcuts = new KeyboardShortcutManager(eventBus);
 *
 * // Register undo/redo
 * shortcuts.register({
 *   key: 'z',
 *   ctrl: true,
 *   action: () => commandHistory.undo(),
 *   description: 'Undo'
 * });
 *
 * shortcuts.register({
 *   key: 'y',
 *   ctrl: true,
 *   action: () => commandHistory.redo(),
 *   description: 'Redo'
 * });
 * ```
 */

import type { EventBus } from './EventBus';

/**
 * Keyboard shortcut definition.
 */
export interface Shortcut {
  /** The key to listen for (lowercase, e.g., 'z', 'y', 'delete') */
  key: string;

  /** Require Ctrl key */
  ctrl?: boolean;

  /** Require Shift key */
  shift?: boolean;

  /** Require Alt key */
  alt?: boolean;

  /** Action to execute when shortcut is triggered */
  action: () => void;

  /** Human-readable description */
  description: string;

  /**
   * Whether to allow this shortcut when focused on an input/textarea.
   * Default: false (shortcuts are NOT triggered when in text input)
   */
  allowInInput?: boolean;
}

export interface KeyboardShortcutManagerOptions {
  /** Event bus for coordination with other systems */
  eventBus: EventBus;
}

/**
 * Central manager for global keyboard shortcuts.
 */
export class KeyboardShortcutManager {
  private readonly eventBus: EventBus;
  private readonly shortcuts: Shortcut[] = [];
  private readonly keydownHandler: (e: KeyboardEvent) => void;

  constructor(options: KeyboardShortcutManagerOptions) {
    this.eventBus = options.eventBus;

    // Bind the handler
    this.keydownHandler = this.handleKeyDown.bind(this);

    // Listen for keydown events
    window.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * Register a keyboard shortcut.
   *
   * @param shortcut - The shortcut to register
   */
  register(shortcut: Shortcut): void {
    // Normalize key to lowercase
    const normalized: Shortcut = {
      ...shortcut,
      key: shortcut.key.toLowerCase()
    };

    // Check for duplicates
    const existing = this.shortcuts.findIndex(
      (s) =>
        s.key === normalized.key &&
        !!s.ctrl === !!normalized.ctrl &&
        !!s.shift === !!normalized.shift &&
        !!s.alt === !!normalized.alt
    );

    if (existing >= 0) {
      // Replace existing shortcut
      this.shortcuts[existing] = normalized;
    } else {
      this.shortcuts.push(normalized);
    }
  }

  /**
   * Unregister a keyboard shortcut.
   *
   * @param key - The key
   * @param modifiers - Optional modifier requirements
   */
  unregister(
    key: string,
    modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean }
  ): void {
    const normalizedKey = key.toLowerCase();
    const index = this.shortcuts.findIndex(
      (s) =>
        s.key === normalizedKey &&
        !!s.ctrl === !!modifiers?.ctrl &&
        !!s.shift === !!modifiers?.shift &&
        !!s.alt === !!modifiers?.alt
    );

    if (index >= 0) {
      this.shortcuts.splice(index, 1);
    }
  }

  /**
   * Get all registered shortcuts.
   */
  getShortcuts(): Shortcut[] {
    return [...this.shortcuts];
  }

  /**
   * Handle keydown events.
   */
  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();

    // Check if we're in an input element
    const activeElement = document.activeElement;
    const isInInput =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      (activeElement as HTMLElement)?.isContentEditable;

    // Find matching shortcut
    for (const shortcut of this.shortcuts) {
      // Check if key matches
      if (shortcut.key !== key) continue;

      // Check modifiers
      if (!!shortcut.ctrl !== e.ctrlKey) continue;
      if (!!shortcut.shift !== e.shiftKey) continue;
      if (!!shortcut.alt !== e.altKey) continue;

      // Check if allowed in input
      if (isInInput && !shortcut.allowInInput) continue;

      // Prevent default browser behavior
      e.preventDefault();
      e.stopPropagation();

      // Execute action
      shortcut.action();

      // Emit event for logging/debugging
      this.eventBus.emit('shortcut:triggered', {
        key: shortcut.key,
        ctrl: shortcut.ctrl,
        shift: shortcut.shift,
        alt: shortcut.alt,
        description: shortcut.description
      });

      return;
    }
  }

  /**
   * Clean up event listeners.
   */
  dispose(): void {
    window.removeEventListener('keydown', this.keydownHandler);
    this.shortcuts.length = 0;
  }
}

/**
 * Helper to register undo/redo shortcuts.
 *
 * @param manager - The keyboard shortcut manager
 * @param commandHistory - The command history to use
 */
export function registerUndoRedoShortcuts(
  manager: KeyboardShortcutManager,
  commandHistory: { undo: () => boolean; redo: () => boolean }
): void {
  // Ctrl+Z - Undo
  manager.register({
    key: 'z',
    ctrl: true,
    action: () => commandHistory.undo(),
    description: 'Undo'
  });

  // Ctrl+Y - Redo
  manager.register({
    key: 'y',
    ctrl: true,
    action: () => commandHistory.redo(),
    description: 'Redo'
  });

  // Ctrl+Shift+Z - Redo (alternative)
  manager.register({
    key: 'z',
    ctrl: true,
    shift: true,
    action: () => commandHistory.redo(),
    description: 'Redo'
  });
}
