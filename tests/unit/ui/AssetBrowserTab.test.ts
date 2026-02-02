/**
 * AssetBrowserTab Unit Tests
 *
 * Tests for the Asset Browser tab component.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AssetBrowserTab } from '@ui/tabs/AssetBrowserTab';
import { EventBus } from '@core/EventBus';
import { AssetRegistry } from '@core/assets/AssetRegistry';
import { MaterialAssetFactory } from '@core/assets/MaterialAssetFactory';
import { ShaderAssetFactory } from '@core/assets/ShaderAssetFactory';
import { BUILT_IN_SHADERS } from '@core/assets/BuiltInShaders';
import { BUILT_IN_MATERIALS } from '@core/assets/BuiltInMaterials';
import type { IMaterialAsset } from '@core/assets/interfaces/IMaterialAsset';
import type { IShaderAsset } from '@core/assets/interfaces/IShaderAsset';

console.log('Test suite starting...');

describe('AssetBrowserTab', () => {
  let eventBus: EventBus;
  let assetRegistry: AssetRegistry;
  let materialFactory: MaterialAssetFactory;
  let shaderFactory: ShaderAssetFactory;
  let assetBrowserTab: AssetBrowserTab;

  beforeEach(() => {
    eventBus = new EventBus();
    assetRegistry = new AssetRegistry(eventBus);
    materialFactory = new MaterialAssetFactory();
    shaderFactory = new ShaderAssetFactory();

    // Register built-in assets
    for (const shader of BUILT_IN_SHADERS) {
      assetRegistry.register(shader);
    }
    for (const material of BUILT_IN_MATERIALS) {
      assetRegistry.register(material);
    }

    assetBrowserTab = new AssetBrowserTab({
      eventBus,
      assetRegistry,
      materialFactory,
      shaderFactory,
    });
  });

  afterEach(() => {
    assetBrowserTab.dispose();
  });

  describe('initialization', () => {
    it('should create a container element', () => {
      expect(assetBrowserTab.element).toBeInstanceOf(HTMLDivElement);
      expect(assetBrowserTab.element.className).toBe('asset-browser-tab');
    });

    it('should have toolbar with action buttons', () => {
      const toolbar = assetBrowserTab.element.querySelector('.asset-browser-toolbar');
      expect(toolbar).not.toBeNull();

      const buttons = toolbar?.querySelectorAll('button');
      expect(buttons?.length).toBe(2);
    });

    it('should have a tree view', () => {
      const treeView = assetBrowserTab.element.querySelector('.tree-view');
      expect(treeView).not.toBeNull();
    });

    it('should display built-in assets', () => {
      const treeItems = assetBrowserTab.element.querySelectorAll('.tree-item');
      // Should have: 2 categories (Materials, Shaders) + built-in assets
      expect(treeItems.length).toBeGreaterThan(0);
    });
  });

  describe('tree structure', () => {
    it('should group assets by type', () => {
      const treeItems = Array.from(assetBrowserTab.element.querySelectorAll('.tree-item'));
      const names = treeItems.map(item => item.querySelector('.tree-name')?.textContent);

      expect(names).toContain('Materials');
      expect(names).toContain('Shaders');
    });

    it('should show built-in label for built-in assets', () => {
      const treeItems = Array.from(assetBrowserTab.element.querySelectorAll('.tree-item'));
      const names = treeItems.map(item => item.querySelector('.tree-name')?.textContent);

      // Built-in materials and shaders should have labels
      expect(names.some(n => n?.includes('(built-in)'))).toBe(true);
    });

    it('should show lock icon for built-in shaders', () => {
      const treeItems = Array.from(assetBrowserTab.element.querySelectorAll('.tree-item'));
      const names = treeItems.map(item => item.querySelector('.tree-name')?.textContent);

      // Built-in shaders should have lock icon
      expect(names.some(n => n?.includes('🔒'))).toBe(true);
    });
  });

  describe('asset creation', () => {
    it('should create a new material when clicking + Material button', () => {
      const initialCount = assetRegistry.count('material');

      const buttons = assetBrowserTab.element.querySelectorAll('.asset-browser-btn');
      const newMaterialBtn = Array.from(buttons).find(b => b.textContent === '+ Material');
      expect(newMaterialBtn).not.toBeNull();

      newMaterialBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(assetRegistry.count('material')).toBe(initialCount + 1);
    });

    it('should create a new shader when clicking + Shader button', () => {
      const initialCount = assetRegistry.count('shader');

      const buttons = assetBrowserTab.element.querySelectorAll('.asset-browser-btn');
      const newShaderBtn = Array.from(buttons).find(b => b.textContent === '+ Shader');
      expect(newShaderBtn).not.toBeNull();

      newShaderBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(assetRegistry.count('shader')).toBe(initialCount + 1);
    });

    it('should generate unique names for new materials', () => {
      const buttons = assetBrowserTab.element.querySelectorAll('.asset-browser-btn');
      const newMaterialBtn = Array.from(buttons).find(b => b.textContent === '+ Material');

      // Create two materials
      newMaterialBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      newMaterialBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const materials = assetRegistry.getByType<IMaterialAsset>('material');
      const customMaterials = materials.filter(m => !m.isBuiltIn);

      expect(customMaterials.length).toBe(2);
      expect(customMaterials[0].name).not.toBe(customMaterials[1].name);
    });

    it('should generate unique names for new shaders', () => {
      const buttons = assetBrowserTab.element.querySelectorAll('.asset-browser-btn');
      const newShaderBtn = Array.from(buttons).find(b => b.textContent === '+ Shader');

      // Create two shaders
      newShaderBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      newShaderBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const shaders = assetRegistry.getByType<IShaderAsset>('shader');
      const customShaders = shaders.filter(s => !s.isBuiltIn);

      expect(customShaders.length).toBe(2);
      expect(customShaders[0].name).not.toBe(customShaders[1].name);
    });
  });

  describe('event handling', () => {
    it('should emit asset:selected when an asset is clicked', () => {
      const selectHandler = vi.fn();
      eventBus.on('asset:selected', selectHandler);

      // Find a material item and click it
      const treeItems = assetBrowserTab.element.querySelectorAll('.tree-item');
      const materialItem = Array.from(treeItems).find(item => {
        const name = item.querySelector('.tree-name')?.textContent;
        return name?.includes('Default PBR');
      });

      expect(materialItem).not.toBeNull();
      materialItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(selectHandler).toHaveBeenCalledTimes(1);
    });

    it('should refresh when asset:registered is emitted', () => {
      const initialItems = assetBrowserTab.element.querySelectorAll('.tree-item').length;

      // Create and register a new material directly
      const newMaterial = materialFactory.create({
        name: 'Test Material',
        shaderRef: { uuid: 'built-in-shader-pbr', type: 'shader' },
      });
      assetRegistry.register(newMaterial);

      // Check that the tree was refreshed
      const newItems = assetBrowserTab.element.querySelectorAll('.tree-item').length;
      expect(newItems).toBe(initialItems + 1);
    });

    it('should refresh when asset:unregistered is emitted', () => {
      // First create a material
      const newMaterial = materialFactory.create({
        name: 'Test Material',
        shaderRef: { uuid: 'built-in-shader-pbr', type: 'shader' },
      });
      assetRegistry.register(newMaterial);

      const initialItems = assetBrowserTab.element.querySelectorAll('.tree-item').length;

      // Now unregister it
      assetRegistry.unregister(newMaterial.uuid);

      const newItems = assetBrowserTab.element.querySelectorAll('.tree-item').length;
      expect(newItems).toBe(initialItems - 1);
    });

    it('should refresh when asset:modified is emitted', () => {
      // Create a material
      const newMaterial = materialFactory.create({
        name: 'Test Material',
        shaderRef: { uuid: 'built-in-shader-pbr', type: 'shader' },
      });
      assetRegistry.register(newMaterial);

      // Find the material item
      let materialItem = Array.from(assetBrowserTab.element.querySelectorAll('.tree-item')).find(
        item => item.querySelector('.tree-name')?.textContent === 'Test Material'
      );
      expect(materialItem).not.toBeNull();

      // Modify the material name
      newMaterial.name = 'Renamed Material';
      assetRegistry.notifyModified(newMaterial.uuid, 'name');

      // Find the renamed item
      materialItem = Array.from(assetBrowserTab.element.querySelectorAll('.tree-item')).find(
        item => item.querySelector('.tree-name')?.textContent === 'Renamed Material'
      );
      expect(materialItem).not.toBeNull();
    });
  });

  describe('sorting', () => {
    it('should sort built-in assets before custom assets', () => {
      // Create a custom material that would sort before "Default PBR" alphabetically
      const customMaterial = materialFactory.create({
        name: 'AAA Custom Material',
        shaderRef: { uuid: 'built-in-shader-pbr', type: 'shader' },
      });
      assetRegistry.register(customMaterial);

      // Get material names from tree
      const treeItems = Array.from(assetBrowserTab.element.querySelectorAll('.tree-item'));
      const materialNames = treeItems
        .map(item => item.querySelector('.tree-name')?.textContent)
        .filter(name => name && !['Materials', 'Shaders'].includes(name) && !name.includes('🔒'));

      // Built-in should come first
      const builtInIndex = materialNames.findIndex(n => n?.includes('(built-in)'));
      const customIndex = materialNames.findIndex(n => n === 'AAA Custom Material');

      expect(builtInIndex).toBeLessThan(customIndex);
    });

    it('should sort assets alphabetically within their category', () => {
      // Create multiple custom materials
      const materialC = materialFactory.create({
        name: 'C Material',
        shaderRef: { uuid: 'built-in-shader-pbr', type: 'shader' },
      });
      const materialA = materialFactory.create({
        name: 'A Material',
        shaderRef: { uuid: 'built-in-shader-pbr', type: 'shader' },
      });
      const materialB = materialFactory.create({
        name: 'B Material',
        shaderRef: { uuid: 'built-in-shader-pbr', type: 'shader' },
      });

      assetRegistry.register(materialC);
      assetRegistry.register(materialA);
      assetRegistry.register(materialB);

      // Get custom material names from tree
      const treeItems = Array.from(assetBrowserTab.element.querySelectorAll('.tree-item'));
      const customMaterialNames = treeItems
        .map(item => item.querySelector('.tree-name')?.textContent)
        .filter(name => name && ['A Material', 'B Material', 'C Material'].includes(name));

      expect(customMaterialNames).toEqual(['A Material', 'B Material', 'C Material']);
    });
  });

  describe('dispose', () => {
    it('should clean up tree view on dispose', () => {
      const treeView = assetBrowserTab.element.querySelector('.tree-view');
      expect(treeView).not.toBeNull();

      assetBrowserTab.dispose();

      // Tree view should be disposed (content cleared)
      expect(treeView?.children.length).toBe(0);
    });
  });
});
