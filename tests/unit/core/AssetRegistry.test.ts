/**
 * AssetRegistry Tests
 *
 * Tests for the central asset registry service.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetRegistry } from '../../../src/core/assets/AssetRegistry';
import { EventBus } from '../../../src/core/EventBus';
import type { IAsset, AssetType } from '../../../src/core/assets/interfaces';

/**
 * Create a mock asset for testing.
 */
function createMockAsset(
  uuid: string,
  type: AssetType,
  name: string = 'Test Asset'
): IAsset {
  return {
    uuid,
    type,
    name,
    version: 1,
    created: '2026-01-28T12:00:00Z',
    modified: '2026-01-28T12:00:00Z',
  };
}

describe('AssetRegistry', () => {
  let eventBus: EventBus;
  let registry: AssetRegistry;

  beforeEach(() => {
    eventBus = new EventBus();
    registry = new AssetRegistry(eventBus);
  });

  describe('register', () => {
    it('should register an asset', () => {
      const asset = createMockAsset('uuid-1', 'material', 'My Material');

      registry.register(asset);

      expect(registry.has('uuid-1')).toBe(true);
      expect(registry.get('uuid-1')).toBe(asset);
    });

    it('should emit asset:registered event', () => {
      const asset = createMockAsset('uuid-1', 'material');
      const callback = vi.fn();
      eventBus.on('asset:registered', callback);

      registry.register(asset);

      expect(callback).toHaveBeenCalledWith({ asset });
    });

    it('should throw when registering duplicate UUID', () => {
      const asset1 = createMockAsset('uuid-1', 'material');
      const asset2 = createMockAsset('uuid-1', 'shader');

      registry.register(asset1);

      expect(() => registry.register(asset2)).toThrow(/already registered/);
    });

    it('should update type index', () => {
      const material1 = createMockAsset('uuid-1', 'material', 'Material 1');
      const material2 = createMockAsset('uuid-2', 'material', 'Material 2');
      const shader = createMockAsset('uuid-3', 'shader', 'Shader');

      registry.register(material1);
      registry.register(material2);
      registry.register(shader);

      expect(registry.count('material')).toBe(2);
      expect(registry.count('shader')).toBe(1);
    });
  });

  describe('unregister', () => {
    it('should unregister an asset', () => {
      const asset = createMockAsset('uuid-1', 'material');
      registry.register(asset);

      const result = registry.unregister('uuid-1');

      expect(result).toBe(true);
      expect(registry.has('uuid-1')).toBe(false);
    });

    it('should return false for non-existent asset', () => {
      const result = registry.unregister('non-existent');

      expect(result).toBe(false);
    });

    it('should emit asset:unregistered event', () => {
      const asset = createMockAsset('uuid-1', 'material', 'My Material');
      registry.register(asset);
      const callback = vi.fn();
      eventBus.on('asset:unregistered', callback);

      registry.unregister('uuid-1');

      expect(callback).toHaveBeenCalledWith({
        uuid: 'uuid-1',
        type: 'material',
        name: 'My Material',
      });
    });

    it('should update type index', () => {
      const asset = createMockAsset('uuid-1', 'material');
      registry.register(asset);

      registry.unregister('uuid-1');

      expect(registry.count('material')).toBe(0);
    });
  });

  describe('get', () => {
    it('should return asset by UUID', () => {
      const asset = createMockAsset('uuid-1', 'material');
      registry.register(asset);

      const result = registry.get('uuid-1');

      expect(result).toBe(asset);
    });

    it('should return undefined for non-existent UUID', () => {
      const result = registry.get('non-existent');

      expect(result).toBeUndefined();
    });

    it('should support generic type parameter', () => {
      interface IMaterialAsset extends IAsset {
        type: 'material';
        color: string;
      }

      const asset: IMaterialAsset = {
        ...createMockAsset('uuid-1', 'material'),
        type: 'material',
        color: '#ff0000',
      };
      registry.register(asset);

      const result = registry.get<IMaterialAsset>('uuid-1');

      expect(result?.color).toBe('#ff0000');
    });
  });

  describe('resolve', () => {
    it('should resolve asset reference', () => {
      const asset = createMockAsset('uuid-1', 'material');
      registry.register(asset);

      const result = registry.resolve({ uuid: 'uuid-1', type: 'material' });

      expect(result).toBe(asset);
    });

    it('should return undefined for non-existent reference', () => {
      const result = registry.resolve({ uuid: 'non-existent', type: 'material' });

      expect(result).toBeUndefined();
    });

    it('should return undefined for type mismatch', () => {
      const asset = createMockAsset('uuid-1', 'material');
      registry.register(asset);

      const result = registry.resolve({ uuid: 'uuid-1', type: 'shader' });

      expect(result).toBeUndefined();
    });
  });

  describe('getByType', () => {
    it('should return all assets of a type', () => {
      const material1 = createMockAsset('uuid-1', 'material');
      const material2 = createMockAsset('uuid-2', 'material');
      const shader = createMockAsset('uuid-3', 'shader');

      registry.register(material1);
      registry.register(material2);
      registry.register(shader);

      const materials = registry.getByType('material');

      expect(materials).toHaveLength(2);
      expect(materials).toContain(material1);
      expect(materials).toContain(material2);
    });

    it('should return empty array for type with no assets', () => {
      const result = registry.getByType('texture');

      expect(result).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('should return all registered assets', () => {
      const material = createMockAsset('uuid-1', 'material');
      const shader = createMockAsset('uuid-2', 'shader');

      registry.register(material);
      registry.register(shader);

      const all = registry.getAll();

      expect(all).toHaveLength(2);
      expect(all).toContain(material);
      expect(all).toContain(shader);
    });

    it('should return empty array when no assets registered', () => {
      const result = registry.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return total asset count', () => {
      registry.register(createMockAsset('uuid-1', 'material'));
      registry.register(createMockAsset('uuid-2', 'shader'));

      expect(registry.count()).toBe(2);
    });

    it('should return count by type', () => {
      registry.register(createMockAsset('uuid-1', 'material'));
      registry.register(createMockAsset('uuid-2', 'material'));
      registry.register(createMockAsset('uuid-3', 'shader'));

      expect(registry.count('material')).toBe(2);
      expect(registry.count('shader')).toBe(1);
      expect(registry.count('scene')).toBe(0);
    });
  });

  describe('notifyModified', () => {
    it('should update modified timestamp', () => {
      const asset = createMockAsset('uuid-1', 'material');
      const originalModified = asset.modified;
      registry.register(asset);

      // Wait a bit to ensure timestamp changes
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      registry.notifyModified('uuid-1');

      expect(asset.modified).not.toBe(originalModified);
      vi.useRealTimers();
    });

    it('should emit asset:modified event', () => {
      const asset = createMockAsset('uuid-1', 'material');
      registry.register(asset);
      const callback = vi.fn();
      eventBus.on('asset:modified', callback);

      registry.notifyModified('uuid-1', 'color');

      expect(callback).toHaveBeenCalledWith({
        asset,
        field: 'color',
      });
    });

    it('should do nothing for non-existent asset', () => {
      const callback = vi.fn();
      eventBus.on('asset:modified', callback);

      registry.notifyModified('non-existent');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      registry.register(createMockAsset('uuid-1', 'material', 'Red Metal'));
      registry.register(createMockAsset('uuid-2', 'material', 'Blue Plastic'));
      registry.register(createMockAsset('uuid-3', 'shader', 'Metal Shader'));
    });

    it('should find assets by name (case-insensitive)', () => {
      const results = registry.search('metal');

      expect(results).toHaveLength(2);
      expect(results.map((a) => a.name)).toContain('Red Metal');
      expect(results.map((a) => a.name)).toContain('Metal Shader');
    });

    it('should filter by type when specified', () => {
      const results = registry.search('metal', 'material');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Red Metal');
    });

    it('should return empty array for no matches', () => {
      const results = registry.search('nonexistent');

      expect(results).toEqual([]);
    });

    it('should handle partial matches', () => {
      const results = registry.search('plas');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Blue Plastic');
    });
  });

  describe('clear', () => {
    it('should remove all assets', () => {
      registry.register(createMockAsset('uuid-1', 'material'));
      registry.register(createMockAsset('uuid-2', 'shader'));

      registry.clear();

      expect(registry.count()).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });

    it('should emit asset:unregistered for each asset', () => {
      registry.register(createMockAsset('uuid-1', 'material', 'Mat 1'));
      registry.register(createMockAsset('uuid-2', 'shader', 'Shader 1'));
      const callback = vi.fn();
      eventBus.on('asset:unregistered', callback);

      registry.clear();

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should clear type indices', () => {
      registry.register(createMockAsset('uuid-1', 'material'));

      registry.clear();

      expect(registry.count('material')).toBe(0);
    });
  });
});
