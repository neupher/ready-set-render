/**
 * SelectionManager - Scene Object Selection System
 *
 * Manages selection state for scene objects. Supports single and multi-selection,
 * selection events, and integration with hierarchy panel.
 *
 * @example
 * ```typescript
 * const selectionManager = new SelectionManager(eventBus);
 *
 * // Select an object
 * selectionManager.select(object);
 *
 * // Toggle selection (Ctrl+click behavior)
 * selectionManager.toggle(object);
 *
 * // Check if selected
 * if (selectionManager.isSelected(object)) { ... }
 * ```
 */

import type { EventBus } from './EventBus';
import type { ISceneObject } from './interfaces';

/**
 * Selection changed event data.
 */
export interface SelectionChangedEvent {
  /** Currently selected objects */
  selected: ISceneObject[];
  /** Objects that were added to selection */
  added: ISceneObject[];
  /** Objects that were removed from selection */
  removed: ISceneObject[];
}

/**
 * Manages selection state for scene objects.
 */
export class SelectionManager {
  private readonly eventBus: EventBus;
  private readonly selected: Set<ISceneObject> = new Set();

  /**
   * Create a new SelectionManager.
   *
   * @param eventBus - Event bus for emitting selection events
   */
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Select a single object, clearing previous selection.
   *
   * @param object - The object to select
   */
  select(object: ISceneObject): void {
    const removed = Array.from(this.selected);
    this.selected.clear();
    this.selected.add(object);

    this.emitSelectionChanged([object], removed.filter(o => o !== object));
  }

  /**
   * Add an object to the current selection.
   *
   * @param object - The object to add
   */
  addToSelection(object: ISceneObject): void {
    if (!this.selected.has(object)) {
      this.selected.add(object);
      this.emitSelectionChanged([object], []);
    }
  }

  /**
   * Remove an object from the selection.
   *
   * @param object - The object to remove
   */
  removeFromSelection(object: ISceneObject): void {
    if (this.selected.has(object)) {
      this.selected.delete(object);
      this.emitSelectionChanged([], [object]);
    }
  }

  /**
   * Toggle selection of an object (Ctrl+click behavior).
   *
   * @param object - The object to toggle
   */
  toggle(object: ISceneObject): void {
    if (this.selected.has(object)) {
      this.removeFromSelection(object);
    } else {
      this.addToSelection(object);
    }
  }

  /**
   * Clear all selection.
   */
  clear(): void {
    if (this.selected.size > 0) {
      const removed = Array.from(this.selected);
      this.selected.clear();
      this.emitSelectionChanged([], removed);

      this.eventBus.emit('selection:cleared', {});
    }
  }

  /**
   * Check if an object is selected.
   *
   * @param object - The object to check
   * @returns True if the object is selected
   */
  isSelected(object: ISceneObject): boolean {
    return this.selected.has(object);
  }

  /**
   * Check if an object is selected by ID.
   *
   * @param id - The object ID to check
   * @returns True if an object with that ID is selected
   */
  isSelectedById(id: string): boolean {
    return Array.from(this.selected).some(obj => obj.id === id);
  }

  /**
   * Get all selected objects.
   *
   * @returns Array of selected objects
   */
  getSelected(): ISceneObject[] {
    return Array.from(this.selected);
  }

  /**
   * Get the primary (first) selected object.
   * Useful for single-selection operations.
   *
   * @returns The first selected object, or null if nothing selected
   */
  getPrimary(): ISceneObject | null {
    const first = this.selected.values().next();
    return first.done ? null : first.value;
  }

  /**
   * Get the number of selected objects.
   */
  getSelectionCount(): number {
    return this.selected.size;
  }

  /**
   * Check if anything is selected.
   */
  hasSelection(): boolean {
    return this.selected.size > 0;
  }

  /**
   * Select by ID (useful when syncing with hierarchy panel).
   *
   * @param id - The object ID
   * @param findObject - Function to find object by ID
   */
  selectById(id: string, findObject: (id: string) => ISceneObject | null): void {
    const object = findObject(id);
    if (object) {
      this.select(object);
    }
  }

  /**
   * Get the center point of the current selection (for framing).
   *
   * @returns Center point [x, y, z] or null if nothing selected
   */
  getSelectionCenter(): [number, number, number] | null {
    if (this.selected.size === 0) return null;

    let sumX = 0, sumY = 0, sumZ = 0;
    let count = 0;

    for (const obj of this.selected) {
      sumX += obj.transform.position[0];
      sumY += obj.transform.position[1];
      sumZ += obj.transform.position[2];
      count++;
    }

    return [sumX / count, sumY / count, sumZ / count];
  }

  /**
   * Get bounds of the current selection (for framing calculations).
   *
   * @returns AABB bounds { min, max } or null if nothing selected
   */
  getSelectionBounds(): { min: [number, number, number]; max: [number, number, number] } | null {
    if (this.selected.size === 0) return null;

    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

    for (const obj of this.selected) {
      const pos = obj.transform.position;
      const scale = obj.transform.scale;

      // Simple bounding box based on position and scale
      // (For more accuracy, we'd need actual mesh bounds)
      const halfSize = Math.max(scale[0], scale[1], scale[2]) * 0.5;

      min[0] = Math.min(min[0], pos[0] - halfSize);
      min[1] = Math.min(min[1], pos[1] - halfSize);
      min[2] = Math.min(min[2], pos[2] - halfSize);

      max[0] = Math.max(max[0], pos[0] + halfSize);
      max[1] = Math.max(max[1], pos[1] + halfSize);
      max[2] = Math.max(max[2], pos[2] + halfSize);
    }

    return { min, max };
  }

  private emitSelectionChanged(added: ISceneObject[], removed: ISceneObject[]): void {
    const selected = Array.from(this.selected);

    this.eventBus.emit('selection:changed', {
      selected,
      added,
      removed,
    } as SelectionChangedEvent);

    // Also emit simplified event for hierarchy sync
    if (selected.length === 1) {
      this.eventBus.emit('selection:changed', { id: selected[0].id });
    }
  }
}
