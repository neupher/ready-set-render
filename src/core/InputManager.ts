/**
 * InputManager - Centralized Input Event Management
 *
 * Tracks mouse state, keyboard modifiers, and emits normalized input events.
 * Used by navigation controllers and interaction systems.
 *
 * @example
 * ```typescript
 * const inputManager = new InputManager(canvas, eventBus);
 *
 * eventBus.on('input:dragStart', ({ button, modifiers }) => {
 *   if (modifiers.alt && button === 0) {
 *     // Start orbiting
 *   }
 * });
 * ```
 */

import type { EventBus } from './EventBus';

/**
 * Mouse button constants for clarity.
 */
export const MouseButton = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2,
} as const;

/**
 * Modifier key state.
 */
export interface ModifierState {
  alt: boolean;
  ctrl: boolean;
  shift: boolean;
  meta: boolean;
}

/**
 * Mouse position in screen coordinates.
 */
export interface MousePosition {
  x: number;
  y: number;
  /** Change since last event */
  deltaX: number;
  /** Change since last event */
  deltaY: number;
}

/**
 * Drag event data.
 */
export interface DragEvent {
  button: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  modifiers: ModifierState;
}

/**
 * Wheel event data.
 */
export interface WheelEvent {
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  modifiers: ModifierState;
}

/**
 * Centralized input manager for viewport interactions.
 * Tracks mouse state, keyboard modifiers, and emits normalized events.
 */
export class InputManager {
  private readonly canvas: HTMLCanvasElement;
  private readonly eventBus: EventBus;

  private mousePosition: MousePosition = { x: 0, y: 0, deltaX: 0, deltaY: 0 };
  private modifiers: ModifierState = { alt: false, ctrl: false, shift: false, meta: false };
  private buttonsDown: Set<number> = new Set();
  private isDragging: boolean = false;
  private dragStartPosition: { x: number; y: number } = { x: 0, y: 0 };
  private dragButton: number = -1;

  private boundHandlers: {
    mouseDown: (e: globalThis.MouseEvent) => void;
    mouseMove: (e: globalThis.MouseEvent) => void;
    mouseUp: (e: globalThis.MouseEvent) => void;
    wheel: (e: globalThis.WheelEvent) => void;
    keyDown: (e: KeyboardEvent) => void;
    keyUp: (e: KeyboardEvent) => void;
    contextMenu: (e: Event) => void;
  };

  /**
   * Create a new InputManager.
   *
   * @param canvas - The canvas element to track input on
   * @param eventBus - Event bus for emitting input events
   */
  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    this.canvas = canvas;
    this.eventBus = eventBus;

    // Bind handlers to preserve context
    this.boundHandlers = {
      mouseDown: this.handleMouseDown.bind(this),
      mouseMove: this.handleMouseMove.bind(this),
      mouseUp: this.handleMouseUp.bind(this),
      wheel: this.handleWheel.bind(this),
      keyDown: this.handleKeyDown.bind(this),
      keyUp: this.handleKeyUp.bind(this),
      contextMenu: this.handleContextMenu.bind(this),
    };

    this.attachListeners();
  }

  /**
   * Get current mouse position.
   */
  getMousePosition(): Readonly<MousePosition> {
    return this.mousePosition;
  }

  /**
   * Get current modifier key state.
   */
  getModifiers(): Readonly<ModifierState> {
    return this.modifiers;
  }

  /**
   * Check if a specific mouse button is currently pressed.
   */
  isButtonDown(button: number): boolean {
    return this.buttonsDown.has(button);
  }

  /**
   * Check if currently dragging.
   */
  getIsDragging(): boolean {
    return this.isDragging;
  }

  /**
   * Clean up event listeners.
   */
  dispose(): void {
    this.detachListeners();
  }

  private attachListeners(): void {
    this.canvas.addEventListener('mousedown', this.boundHandlers.mouseDown);
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.boundHandlers.contextMenu);

    // Mouse move and up are tracked on window to handle drags outside canvas
    window.addEventListener('mousemove', this.boundHandlers.mouseMove);
    window.addEventListener('mouseup', this.boundHandlers.mouseUp);

    // Keyboard events on window
    window.addEventListener('keydown', this.boundHandlers.keyDown);
    window.addEventListener('keyup', this.boundHandlers.keyUp);
  }

  private detachListeners(): void {
    this.canvas.removeEventListener('mousedown', this.boundHandlers.mouseDown);
    this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
    this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextMenu);

    window.removeEventListener('mousemove', this.boundHandlers.mouseMove);
    window.removeEventListener('mouseup', this.boundHandlers.mouseUp);
    window.removeEventListener('keydown', this.boundHandlers.keyDown);
    window.removeEventListener('keyup', this.boundHandlers.keyUp);
  }

  private handleMouseDown(e: globalThis.MouseEvent): void {
    this.updateModifiers(e);
    this.buttonsDown.add(e.button);

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Start dragging
    this.isDragging = true;
    this.dragStartPosition = { x, y };
    this.dragButton = e.button;

    this.eventBus.emit('input:dragStart', {
      button: e.button,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      deltaX: 0,
      deltaY: 0,
      modifiers: { ...this.modifiers },
    } as DragEvent);

    this.eventBus.emit('input:mouseDown', {
      button: e.button,
      x,
      y,
      modifiers: { ...this.modifiers },
    });
  }

  private handleMouseMove(e: globalThis.MouseEvent): void {
    this.updateModifiers(e);

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate delta
    const deltaX = x - this.mousePosition.x;
    const deltaY = y - this.mousePosition.y;

    this.mousePosition = { x, y, deltaX, deltaY };

    // Emit drag event if dragging
    if (this.isDragging) {
      this.eventBus.emit('input:drag', {
        button: this.dragButton,
        startX: this.dragStartPosition.x,
        startY: this.dragStartPosition.y,
        currentX: x,
        currentY: y,
        deltaX,
        deltaY,
        modifiers: { ...this.modifiers },
      } as DragEvent);
    }

    this.eventBus.emit('input:mouseMove', {
      x,
      y,
      deltaX,
      deltaY,
      modifiers: { ...this.modifiers },
    });
  }

  private handleMouseUp(e: globalThis.MouseEvent): void {
    this.updateModifiers(e);
    this.buttonsDown.delete(e.button);

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // End dragging if this was the drag button
    if (this.isDragging && e.button === this.dragButton) {
      this.eventBus.emit('input:dragEnd', {
        button: this.dragButton,
        startX: this.dragStartPosition.x,
        startY: this.dragStartPosition.y,
        currentX: x,
        currentY: y,
        deltaX: x - this.dragStartPosition.x,
        deltaY: y - this.dragStartPosition.y,
        modifiers: { ...this.modifiers },
      } as DragEvent);

      this.isDragging = false;
      this.dragButton = -1;
    }

    this.eventBus.emit('input:mouseUp', {
      button: e.button,
      x,
      y,
      modifiers: { ...this.modifiers },
    });
  }

  private handleWheel(e: globalThis.WheelEvent): void {
    e.preventDefault();
    this.updateModifiers(e);

    this.eventBus.emit('input:wheel', {
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      deltaZ: e.deltaZ,
      modifiers: { ...this.modifiers },
    } as WheelEvent);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.updateModifiers(e);

    this.eventBus.emit('input:keyDown', {
      key: e.key,
      code: e.code,
      modifiers: { ...this.modifiers },
    });
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.updateModifiers(e);

    this.eventBus.emit('input:keyUp', {
      key: e.key,
      code: e.code,
      modifiers: { ...this.modifiers },
    });
  }

  private handleContextMenu(e: Event): void {
    // Prevent default context menu in canvas
    e.preventDefault();
  }

  private updateModifiers(e: globalThis.MouseEvent | KeyboardEvent | globalThis.WheelEvent): void {
    this.modifiers = {
      alt: e.altKey,
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      meta: e.metaKey,
    };
  }
}
