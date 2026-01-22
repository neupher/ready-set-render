/**
 * PluginManager Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PluginManager,
  PluginDependencyError,
  CircularDependencyError,
} from '@core/PluginManager';
import { EventBus } from '@core/EventBus';
import type { IPlugin, IPluginContext } from '@core/interfaces';
import { createMockGL, createMockCanvas } from '../../helpers/webgl-mock';

/**
 * Create a mock plugin for testing.
 */
function createMockPlugin(
  id: string,
  dependencies?: string[]
): IPlugin {
  return {
    id,
    name: `Plugin ${id}`,
    version: '1.0.0',
    dependencies,
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock plugin context.
 */
function createMockContext(): IPluginContext {
  const mockGL = createMockGL();
  const canvas = createMockCanvas(mockGL);

  return {
    eventBus: new EventBus(),
    canvas,
    gl: mockGL,
  };
}

describe('PluginManager', () => {
  let context: IPluginContext;
  let manager: PluginManager;

  beforeEach(() => {
    context = createMockContext();
    manager = new PluginManager(context);
  });

  describe('register()', () => {
    it('should register a plugin', () => {
      const plugin = createMockPlugin('test-plugin');

      manager.register(plugin);

      expect(manager.has('test-plugin')).toBe(true);
    });

    it('should throw when registering duplicate plugin', () => {
      const plugin = createMockPlugin('test-plugin');

      manager.register(plugin);

      expect(() => manager.register(plugin)).toThrow(
        'Plugin "test-plugin" is already registered'
      );
    });

    it('should emit plugin:registered event', () => {
      const handler = vi.fn();
      context.eventBus.on('plugin:registered', handler);

      const plugin = createMockPlugin('test-plugin');
      manager.register(plugin);

      expect(handler).toHaveBeenCalledWith({
        id: 'test-plugin',
        name: 'Plugin test-plugin',
        version: '1.0.0',
      });
    });
  });

  describe('unregister()', () => {
    it('should unregister a plugin', async () => {
      const plugin = createMockPlugin('test-plugin');

      manager.register(plugin);
      const result = await manager.unregister('test-plugin');

      expect(result).toBe(true);
      expect(manager.has('test-plugin')).toBe(false);
    });

    it('should return false for non-existent plugin', async () => {
      const result = await manager.unregister('nonexistent');

      expect(result).toBe(false);
    });

    it('should dispose initialized plugin before unregistering', async () => {
      const plugin = createMockPlugin('test-plugin');

      manager.register(plugin);
      await manager.initialize('test-plugin');
      await manager.unregister('test-plugin');

      expect(plugin.dispose).toHaveBeenCalled();
    });
  });

  describe('initialize()', () => {
    it('should initialize a plugin', async () => {
      const plugin = createMockPlugin('test-plugin');

      manager.register(plugin);
      await manager.initialize('test-plugin');

      expect(plugin.initialize).toHaveBeenCalledWith(context);
      expect(manager.isInitialized('test-plugin')).toBe(true);
    });

    it('should throw for non-existent plugin', async () => {
      await expect(manager.initialize('nonexistent')).rejects.toThrow(
        'Plugin "nonexistent" is not registered'
      );
    });

    it('should not re-initialize already initialized plugin', async () => {
      const plugin = createMockPlugin('test-plugin');

      manager.register(plugin);
      await manager.initialize('test-plugin');
      await manager.initialize('test-plugin');

      expect(plugin.initialize).toHaveBeenCalledTimes(1);
    });

    it('should initialize dependencies first', async () => {
      const dep = createMockPlugin('dependency');
      const plugin = createMockPlugin('test-plugin', ['dependency']);

      const initOrder: string[] = [];
      vi.mocked(dep.initialize).mockImplementation(async () => {
        initOrder.push('dependency');
      });
      vi.mocked(plugin.initialize).mockImplementation(async () => {
        initOrder.push('test-plugin');
      });

      manager.register(dep);
      manager.register(plugin);
      await manager.initialize('test-plugin');

      expect(initOrder).toEqual(['dependency', 'test-plugin']);
    });

    it('should throw PluginDependencyError for missing dependency', async () => {
      const plugin = createMockPlugin('test-plugin', ['missing']);

      manager.register(plugin);

      await expect(manager.initialize('test-plugin')).rejects.toThrow(
        PluginDependencyError
      );
    });

    it('should emit plugin:initialized event', async () => {
      const handler = vi.fn();
      context.eventBus.on('plugin:initialized', handler);

      const plugin = createMockPlugin('test-plugin');
      manager.register(plugin);
      await manager.initialize('test-plugin');

      expect(handler).toHaveBeenCalledWith({
        id: 'test-plugin',
        name: 'Plugin test-plugin',
      });
    });
  });

  describe('initializeAll()', () => {
    it('should initialize all plugins in dependency order', async () => {
      const pluginA = createMockPlugin('plugin-a');
      const pluginB = createMockPlugin('plugin-b', ['plugin-a']);
      const pluginC = createMockPlugin('plugin-c', ['plugin-b']);

      const initOrder: string[] = [];
      vi.mocked(pluginA.initialize).mockImplementation(async () => {
        initOrder.push('plugin-a');
      });
      vi.mocked(pluginB.initialize).mockImplementation(async () => {
        initOrder.push('plugin-b');
      });
      vi.mocked(pluginC.initialize).mockImplementation(async () => {
        initOrder.push('plugin-c');
      });

      manager.register(pluginC);
      manager.register(pluginA);
      manager.register(pluginB);

      await manager.initializeAll();

      expect(initOrder).toEqual(['plugin-a', 'plugin-b', 'plugin-c']);
    });

    it('should throw CircularDependencyError for circular dependencies', async () => {
      const pluginA = createMockPlugin('plugin-a', ['plugin-b']);
      const pluginB = createMockPlugin('plugin-b', ['plugin-a']);

      manager.register(pluginA);
      manager.register(pluginB);

      await expect(manager.initializeAll()).rejects.toThrow(
        CircularDependencyError
      );
    });
  });

  describe('dispose()', () => {
    it('should dispose an initialized plugin', async () => {
      const plugin = createMockPlugin('test-plugin');

      manager.register(plugin);
      await manager.initialize('test-plugin');
      await manager.dispose('test-plugin');

      expect(plugin.dispose).toHaveBeenCalled();
      expect(manager.isInitialized('test-plugin')).toBe(false);
    });

    it('should not dispose non-initialized plugin', async () => {
      const plugin = createMockPlugin('test-plugin');

      manager.register(plugin);
      await manager.dispose('test-plugin');

      expect(plugin.dispose).not.toHaveBeenCalled();
    });
  });

  describe('disposeAll()', () => {
    it('should dispose all plugins in reverse order', async () => {
      const pluginA = createMockPlugin('plugin-a');
      const pluginB = createMockPlugin('plugin-b', ['plugin-a']);

      const disposeOrder: string[] = [];
      vi.mocked(pluginA.dispose).mockImplementation(async () => {
        disposeOrder.push('plugin-a');
      });
      vi.mocked(pluginB.dispose).mockImplementation(async () => {
        disposeOrder.push('plugin-b');
      });

      manager.register(pluginA);
      manager.register(pluginB);
      await manager.initializeAll();
      await manager.disposeAll();

      expect(disposeOrder).toEqual(['plugin-b', 'plugin-a']);
    });
  });

  describe('get()', () => {
    it('should return registered plugin', () => {
      const plugin = createMockPlugin('test-plugin');

      manager.register(plugin);

      expect(manager.get('test-plugin')).toBe(plugin);
    });

    it('should return undefined for non-existent plugin', () => {
      expect(manager.get('nonexistent')).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('should return true for registered plugin', () => {
      const plugin = createMockPlugin('test-plugin');

      manager.register(plugin);

      expect(manager.has('test-plugin')).toBe(true);
    });

    it('should return false for non-existent plugin', () => {
      expect(manager.has('nonexistent')).toBe(false);
    });
  });

  describe('isInitialized()', () => {
    it('should return true for initialized plugin', async () => {
      const plugin = createMockPlugin('test-plugin');

      manager.register(plugin);
      await manager.initialize('test-plugin');

      expect(manager.isInitialized('test-plugin')).toBe(true);
    });

    it('should return false for non-initialized plugin', () => {
      const plugin = createMockPlugin('test-plugin');

      manager.register(plugin);

      expect(manager.isInitialized('test-plugin')).toBe(false);
    });
  });

  describe('getPluginIds()', () => {
    it('should return all plugin IDs', () => {
      manager.register(createMockPlugin('plugin-a'));
      manager.register(createMockPlugin('plugin-b'));
      manager.register(createMockPlugin('plugin-c'));

      const ids = manager.getPluginIds();

      expect(ids).toContain('plugin-a');
      expect(ids).toContain('plugin-b');
      expect(ids).toContain('plugin-c');
      expect(ids).toHaveLength(3);
    });
  });

  describe('getPluginsWhere()', () => {
    it('should filter plugins by predicate', () => {
      const pluginA = createMockPlugin('plugin-a');
      const pluginB = createMockPlugin('plugin-b');

      // Add custom property for filtering
      (pluginA as unknown as { type: string }).type = 'renderer';
      (pluginB as unknown as { type: string }).type = 'importer';

      manager.register(pluginA);
      manager.register(pluginB);

      const renderers = manager.getPluginsWhere(
        (p: IPlugin) => (p as unknown as { type: string }).type === 'renderer'
      );

      expect(renderers).toHaveLength(1);
      expect(renderers[0]).toBe(pluginA);
    });
  });

  describe('count', () => {
    it('should return correct count', () => {
      expect(manager.count).toBe(0);

      manager.register(createMockPlugin('plugin-a'));
      expect(manager.count).toBe(1);

      manager.register(createMockPlugin('plugin-b'));
      expect(manager.count).toBe(2);
    });
  });

  describe('initializedCount', () => {
    it('should return correct initialized count', async () => {
      manager.register(createMockPlugin('plugin-a'));
      manager.register(createMockPlugin('plugin-b'));

      expect(manager.initializedCount).toBe(0);

      await manager.initialize('plugin-a');
      expect(manager.initializedCount).toBe(1);

      await manager.initialize('plugin-b');
      expect(manager.initializedCount).toBe(2);
    });
  });
});

describe('PluginDependencyError', () => {
  it('should contain plugin and dependency info', () => {
    const error = new PluginDependencyError('my-plugin', 'missing-dep');

    expect(error.pluginId).toBe('my-plugin');
    expect(error.missingDependency).toBe('missing-dep');
    expect(error.message).toContain('my-plugin');
    expect(error.message).toContain('missing-dep');
  });
});

describe('CircularDependencyError', () => {
  it('should contain cycle info', () => {
    const error = new CircularDependencyError(['a', 'b', 'c', 'a']);

    expect(error.cycle).toEqual(['a', 'b', 'c', 'a']);
    expect(error.message).toContain('a -> b -> c -> a');
  });
});
