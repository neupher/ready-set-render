/**
 * EventBus - Pub/Sub Event System
 *
 * Central event system for loose coupling between modules.
 * All inter-module communication should go through the EventBus.
 *
 * @example
 * ```typescript
 * const bus = new EventBus();
 *
 * // Subscribe to events
 * bus.on('scene:objectAdded', (data) => {
 *   console.log('Object added:', data.object);
 * });
 *
 * // Emit events
 * bus.emit('scene:objectAdded', { object: myObject });
 *
 * // One-time subscription
 * bus.once('init:complete', () => {
 *   console.log('Initialization complete!');
 * });
 * ```
 */

/**
 * Event callback function type.
 * @template T - The type of data passed to the callback
 */
export type EventCallback<T = unknown> = (data: T) => void;

/**
 * Internal listener entry with metadata.
 */
interface ListenerEntry<T = unknown> {
  callback: EventCallback<T>;
  once: boolean;
}

/**
 * EventBus provides a simple pub/sub event system.
 * Modules can emit and listen to events without direct coupling.
 */
export class EventBus {
  private listeners = new Map<string, Set<ListenerEntry>>();

  /**
   * Subscribe to an event.
   *
   * @param event - The event name to subscribe to
   * @param callback - The callback function to invoke when the event is emitted
   * @returns An unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = bus.on('selection:changed', (data) => {
   *   console.log('Selected:', data.ids);
   * });
   *
   * // Later: unsubscribe
   * unsubscribe();
   * ```
   */
  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const entry: ListenerEntry<T> = { callback: callback as EventCallback, once: false };
    this.listeners.get(event)!.add(entry as ListenerEntry);

    return () => this.removeListener(event, entry as ListenerEntry);
  }

  /**
   * Subscribe to an event once.
   * The callback will be automatically removed after the first invocation.
   *
   * @param event - The event name to subscribe to
   * @param callback - The callback function to invoke once
   * @returns An unsubscribe function
   */
  once<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const entry: ListenerEntry<T> = { callback: callback as EventCallback, once: true };
    this.listeners.get(event)!.add(entry as ListenerEntry);

    return () => this.removeListener(event, entry as ListenerEntry);
  }

  /**
   * Emit an event to all subscribers.
   *
   * @param event - The event name to emit
   * @param data - Optional data to pass to subscribers
   *
   * @example
   * ```typescript
   * bus.emit('scene:objectAdded', { object: newCube, parent: scene });
   * ```
   */
  emit<T = unknown>(event: string, data?: T): void {
    const listeners = this.listeners.get(event);
    if (!listeners) {
      return;
    }

    const toRemove: ListenerEntry[] = [];

    for (const entry of listeners) {
      try {
        entry.callback(data);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }

      if (entry.once) {
        toRemove.push(entry);
      }
    }

    for (const entry of toRemove) {
      listeners.delete(entry);
    }
  }

  /**
   * Remove a specific listener from an event.
   *
   * @param event - The event name
   * @param callback - The callback to remove
   */
  off<T = unknown>(event: string, callback: EventCallback<T>): void {
    const listeners = this.listeners.get(event);
    if (!listeners) {
      return;
    }

    for (const entry of listeners) {
      if (entry.callback === callback) {
        listeners.delete(entry);
        break;
      }
    }
  }

  /**
   * Remove all listeners for a specific event, or all events if no event specified.
   *
   * @param event - Optional event name. If omitted, clears all listeners.
   */
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Check if an event has any listeners.
   *
   * @param event - The event name to check
   * @returns True if the event has at least one listener
   */
  hasListeners(event: string): boolean {
    const listeners = this.listeners.get(event);
    return listeners !== undefined && listeners.size > 0;
  }

  /**
   * Get the count of listeners for an event.
   *
   * @param event - The event name
   * @returns The number of listeners
   */
  listenerCount(event: string): number {
    const listeners = this.listeners.get(event);
    return listeners?.size ?? 0;
  }

  /**
   * Get all registered event names.
   *
   * @returns Array of event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Remove a listener entry from an event.
   */
  private removeListener(event: string, entry: ListenerEntry): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(entry);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }
}
