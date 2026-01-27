/**
 * SettingsService Tests
 *
 * Tests for the centralized settings management system.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventBus } from '@core/EventBus';
import { SettingsService } from '@core/SettingsService';

describe('SettingsService', () => {
  let eventBus: EventBus;
  let settingsService: SettingsService;

  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.clear();
    vi.stubGlobal('localStorage', localStorageMock);

    eventBus = new EventBus();
    settingsService = new SettingsService({
      eventBus,
      storageKey: 'test-settings',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create with default settings when no stored data exists', () => {
      const settings = settingsService.getAll();

      expect(settings.grid).toBeDefined();
      expect(settings.grid.visible).toBe(true);
      expect(settings.grid.size).toBe(10);
      expect(settings.grid.subdivisions).toBe(10);
    });

    it('should load stored settings from localStorage', () => {
      const stored = {
        grid: {
          visible: false,
          size: 20,
          subdivisions: 5,
          majorLineColor: '#555555',
          minorLineColor: '#333333',
          showAxisLines: false,
          opacity: 0.5,
        },
      };
      localStorageMock.setItem('test-settings-2', JSON.stringify(stored));

      const service2 = new SettingsService({
        eventBus,
        storageKey: 'test-settings-2',
      });

      expect(service2.get('grid', 'visible')).toBe(false);
      expect(service2.get('grid', 'size')).toBe(20);
    });

    it('should merge stored settings with defaults for missing keys', () => {
      // Store partial settings (missing opacity)
      const partialStored = {
        grid: {
          visible: false,
          size: 15,
        },
      };
      localStorageMock.setItem('test-partial', JSON.stringify(partialStored));

      const service = new SettingsService({
        eventBus,
        storageKey: 'test-partial',
      });

      // Should have stored values
      expect(service.get('grid', 'visible')).toBe(false);
      expect(service.get('grid', 'size')).toBe(15);

      // Should have default values for missing keys
      expect(service.get('grid', 'opacity')).toBe(0.8);
      expect(service.get('grid', 'majorLineColor')).toBe('#444444');
    });
  });

  describe('get', () => {
    it('should get entire section', () => {
      const gridSettings = settingsService.get('grid');

      expect(gridSettings).toBeDefined();
      expect(gridSettings.visible).toBe(true);
      expect(gridSettings.size).toBe(10);
    });

    it('should get specific property from section', () => {
      expect(settingsService.get('grid', 'visible')).toBe(true);
      expect(settingsService.get('grid', 'size')).toBe(10);
      expect(settingsService.get('grid', 'majorLineColor')).toBe('#444444');
    });
  });

  describe('set', () => {
    it('should update a setting value', () => {
      settingsService.set('grid', 'visible', false);

      expect(settingsService.get('grid', 'visible')).toBe(false);
    });

    it('should persist to localStorage', () => {
      settingsService.set('grid', 'size', 25);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const stored = JSON.parse(localStorageMock.setItem.mock.calls.at(-1)![1]);
      expect(stored.grid.size).toBe(25);
    });

    it('should emit settings:changed event', () => {
      const handler = vi.fn();
      eventBus.on('settings:changed', handler);

      settingsService.set('grid', 'visible', false);

      expect(handler).toHaveBeenCalledWith({
        section: 'grid',
        property: 'visible',
        value: false,
        oldValue: true,
        fullPath: 'grid.visible',
      });
    });

    it('should not emit event if value unchanged', () => {
      const handler = vi.fn();
      eventBus.on('settings:changed', handler);

      settingsService.set('grid', 'visible', true); // Same as default

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('updateSection', () => {
    it('should update multiple values in a section', () => {
      settingsService.updateSection('grid', {
        visible: false,
        size: 30,
        opacity: 0.5,
      });

      expect(settingsService.get('grid', 'visible')).toBe(false);
      expect(settingsService.get('grid', 'size')).toBe(30);
      expect(settingsService.get('grid', 'opacity')).toBe(0.5);
    });

    it('should emit event for each changed value', () => {
      const handler = vi.fn();
      eventBus.on('settings:changed', handler);

      settingsService.updateSection('grid', {
        visible: false,
        size: 20,
      });

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('resetSection', () => {
    it('should reset section to default values', () => {
      // Change some values
      settingsService.set('grid', 'visible', false);
      settingsService.set('grid', 'size', 50);
      settingsService.set('grid', 'opacity', 0.2);

      // Reset
      settingsService.resetSection('grid');

      // Should be back to defaults
      expect(settingsService.get('grid', 'visible')).toBe(true);
      expect(settingsService.get('grid', 'size')).toBe(10);
      expect(settingsService.get('grid', 'opacity')).toBe(0.8);
    });
  });

  describe('resetAll', () => {
    it('should reset all settings to defaults', () => {
      // Change values
      settingsService.set('grid', 'visible', false);
      settingsService.set('grid', 'majorLineColor', '#ffffff');

      // Reset all
      settingsService.resetAll();

      // Should be back to defaults
      const settings = settingsService.getAll();
      expect(settings.grid.visible).toBe(true);
      expect(settings.grid.majorLineColor).toBe('#444444');
    });
  });

  describe('getAll', () => {
    it('should return a copy of all settings', () => {
      const settings = settingsService.getAll();

      // Modify the returned object
      settings.grid.visible = false;

      // Original should be unchanged
      expect(settingsService.get('grid', 'visible')).toBe(true);
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage.getItem throwing', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      // Should not throw, uses defaults
      const service = new SettingsService({
        eventBus,
        storageKey: 'error-test',
      });

      expect(service.get('grid', 'visible')).toBe(true);
    });

    it('should handle localStorage.setItem throwing', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });

      // Should not throw
      expect(() => {
        settingsService.set('grid', 'visible', false);
      }).not.toThrow();
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json {{{');

      // Should not throw, uses defaults
      const service = new SettingsService({
        eventBus,
        storageKey: 'invalid-json-test',
      });

      expect(service.get('grid', 'visible')).toBe(true);
    });
  });
});
