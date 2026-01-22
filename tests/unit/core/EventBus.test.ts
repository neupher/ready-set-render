/**
 * EventBus Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '@core/EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on()', () => {
    it('should subscribe to events', () => {
      const handler = vi.fn();

      eventBus.on('test', handler);
      eventBus.emit('test', { value: 42 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it('should support multiple subscribers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      eventBus.emit('test', 'data');

      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.on('test', handler);
      eventBus.emit('test');
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      eventBus.emit('test');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('once()', () => {
    it('should only fire once', () => {
      const handler = vi.fn();

      eventBus.once('test', handler);
      eventBus.emit('test', 'first');
      eventBus.emit('test', 'second');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.once('test', handler);
      unsubscribe();
      eventBus.emit('test');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('emit()', () => {
    it('should not throw when emitting to non-existent event', () => {
      expect(() => eventBus.emit('nonexistent')).not.toThrow();
    });

    it('should pass data to handlers', () => {
      const handler = vi.fn();
      const data = { id: 1, name: 'test' };

      eventBus.on('test', handler);
      eventBus.emit('test', data);

      expect(handler).toHaveBeenCalledWith(data);
    });

    it('should handle errors in handlers gracefully', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = vi.fn();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.on('test', errorHandler);
      eventBus.on('test', goodHandler);

      expect(() => eventBus.emit('test')).not.toThrow();
      expect(goodHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('off()', () => {
    it('should remove specific listener', () => {
      const handler = vi.fn();

      eventBus.on('test', handler);
      eventBus.off('test', handler);
      eventBus.emit('test');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not throw when removing non-existent listener', () => {
      const handler = vi.fn();
      expect(() => eventBus.off('nonexistent', handler)).not.toThrow();
    });
  });

  describe('clear()', () => {
    it('should clear all listeners for specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test', handler1);
      eventBus.on('other', handler2);

      eventBus.clear('test');

      eventBus.emit('test');
      eventBus.emit('other');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should clear all listeners when no event specified', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test', handler1);
      eventBus.on('other', handler2);

      eventBus.clear();

      eventBus.emit('test');
      eventBus.emit('other');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('hasListeners()', () => {
    it('should return true when event has listeners', () => {
      eventBus.on('test', () => {});
      expect(eventBus.hasListeners('test')).toBe(true);
    });

    it('should return false when event has no listeners', () => {
      expect(eventBus.hasListeners('nonexistent')).toBe(false);
    });
  });

  describe('listenerCount()', () => {
    it('should return correct count', () => {
      eventBus.on('test', () => {});
      eventBus.on('test', () => {});
      eventBus.on('test', () => {});

      expect(eventBus.listenerCount('test')).toBe(3);
    });

    it('should return 0 for non-existent event', () => {
      expect(eventBus.listenerCount('nonexistent')).toBe(0);
    });
  });

  describe('eventNames()', () => {
    it('should return all event names with listeners', () => {
      eventBus.on('event1', () => {});
      eventBus.on('event2', () => {});
      eventBus.on('event3', () => {});

      const names = eventBus.eventNames();
      expect(names).toContain('event1');
      expect(names).toContain('event2');
      expect(names).toContain('event3');
      expect(names).toHaveLength(3);
    });
  });
});
