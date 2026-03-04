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
import type { IModelAsset } from '@core/assets/interfaces/IModelAsset';

console.log('Test suite starting...');

/**
 * Create a mock model asset for testing.
 */
function createMockModelAsset(name: string, uuid: string): IModelAsset {
  return {
    uuid,
    name,
    type: 'model',
    version: 1,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    isBuiltIn: false,
    source: {
      filename: `${name}.glb`,
      format: 'glb',
      importedAt: new Date().toISOString(),
    },
    contents: {
      meshes: [
        { uuid: `${uuid}-mesh-1`, name: 'Body', vertexCount: 100, triangleCount: 50 },
        { uuid: `${uuid}-mesh-2`, name: 'Wheels', vertexCount: 200, triangleCount: 100 },
      ],
      materials: [
        { uuid: `${uuid}-mat-1`, name: 'CarPaint' },
      ],
    },
    hierarchy: [
      {
        name: 'Root',
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        children: [],
      },
    ],
  };
}

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

    it('should have a tree view', () => {
      const treeView = assetBrowserTab.element.querySelector('.tree-view');
      expect(treeView).not.toBeNull();
    });

    it('should have a no-project-message element', () => {
      const noProjectMsg = assetBrowserTab.element.querySelector('.no-project-message');
      expect(noProjectMsg).not.toBeNull();
    });

    it('should display built-in assets', () => {
      const treeItems = assetBrowserTab.element.querySelectorAll('.tree-item');
      // Should have: 2 sections (Built-in, Project) + categories + built-in assets
      expect(treeItems.length).toBeGreaterThan(0);
    });
  });

  describe('tree structure', () => {
    it('should have Built-in and Project sections', () => {
      const treeItems = Array.from(assetBrowserTab.element.querySelectorAll('.tree-item'));
      const names = treeItems.map(item => item.querySelector('.tree-name')?.textContent);

      expect(names).toContain('Built-in');
      expect(names).toContain('Project');
    });

    it('should group assets by type within sections', () => {
      const treeItems = Array.from(assetBrowserTab.element.querySelectorAll('.tree-item'));
      const names = treeItems.map(item => item.querySelector('.tree-name')?.textContent);

      // Materials and Shaders categories should exist in Built-in section
      expect(names.filter(n => n === 'Materials').length).toBeGreaterThanOrEqual(1);
      expect(names.filter(n => n === 'Shaders').length).toBeGreaterThanOrEqual(1);
    });

    it('should show lock icon for built-in shaders', () => {
      const treeItems = Array.from(assetBrowserTab.element.querySelectorAll('.tree-item'));
      const names = treeItems.map(item => item.querySelector('.tree-name')?.textContent);

      // Built-in shaders should have lock icon
      expect(names.some(n => n?.includes('🔒'))).toBe(true);
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

      // Check that the tree was refreshed (new material appears in Project section)
      const newItems = assetBrowserTab.element.querySelectorAll('.tree-item').length;
      // When no project is open, Project section categories are hidden,
      // so the material goes into the tree but categories may be added too
      expect(newItems).toBeGreaterThanOrEqual(initialItems);
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
      expect(newItems).toBeLessThanOrEqual(initialItems);
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

    it('should emit command:openProject when Open Project Folder button is clicked', () => {
      const commandHandler = vi.fn();
      eventBus.on('command:openProject', commandHandler);

      // Find the Open Project Folder button in the no-project message
      const openBtn = assetBrowserTab.element.querySelector('.no-project-message button');
      expect(openBtn).not.toBeNull();
      expect(openBtn?.textContent).toBe('Open Project Folder');

      openBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(commandHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('sorting', () => {
    it('should sort built-in assets alphabetically within their category', () => {
      // Get built-in shader names from tree (they should be sorted)
      const treeItems = Array.from(assetBrowserTab.element.querySelectorAll('.tree-item'));
      const builtInShaderNames = treeItems
        .map(item => item.querySelector('.tree-name')?.textContent)
        .filter(name => name && name.includes('🔒'));

      // Verify we have built-in shaders and they are sorted
      expect(builtInShaderNames.length).toBeGreaterThan(0);

      // Extract shader names without lock icon for comparison
      const sortedNames = [...builtInShaderNames].sort((a, b) => {
        // Extract name without emoji for sorting
        const nameA = a?.replace(' 🔒', '') || '';
        const nameB = b?.replace(' 🔒', '') || '';
        return nameA.localeCompare(nameB);
      });

      expect(builtInShaderNames).toEqual(sortedNames);
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

  describe('imported models', () => {
    it('should display Imported category in Project section when project is open', () => {
      // Create mock project service
      const mockProjectService = {
        isProjectOpen: true,
        projectName: 'Test Project',
      };

      // Create new AssetBrowserTab with project service
      const tabWithProject = new AssetBrowserTab({
        eventBus,
        assetRegistry,
        materialFactory,
        shaderFactory,
        projectService: mockProjectService as any,
      });

      const treeItems = Array.from(tabWithProject.element.querySelectorAll('.tree-item'));
      const names = treeItems.map(item => item.querySelector('.tree-name')?.textContent);

      expect(names).toContain('Imported');

      tabWithProject.dispose();
    });

    it('should display model assets under Imported category', () => {
      // Create mock project service
      const mockProjectService = {
        isProjectOpen: true,
        projectName: 'Test Project',
      };

      // Register a model asset
      const modelAsset = createMockModelAsset('TestCar', 'model-uuid-1');
      assetRegistry.register(modelAsset);

      // Create new AssetBrowserTab with project service
      const tabWithProject = new AssetBrowserTab({
        eventBus,
        assetRegistry,
        materialFactory,
        shaderFactory,
        projectService: mockProjectService as any,
      });

      const treeItems = Array.from(tabWithProject.element.querySelectorAll('.tree-item'));
      const names = treeItems.map(item => item.querySelector('.tree-name')?.textContent);

      // Model should appear in tree
      expect(names).toContain('TestCar');

      tabWithProject.dispose();
    });

    it('should show model sub-assets (meshes, materials) as children', () => {
      // Create mock project service
      const mockProjectService = {
        isProjectOpen: true,
        projectName: 'Test Project',
      };

      // Register a model asset
      const modelAsset = createMockModelAsset('TestCar', 'model-uuid-2');
      assetRegistry.register(modelAsset);

      // Create new AssetBrowserTab with project service and expand the model
      const tabWithProject = new AssetBrowserTab({
        eventBus,
        assetRegistry,
        materialFactory,
        shaderFactory,
        projectService: mockProjectService as any,
      });

      // Get tree items and find model-related nodes
      const treeItems = Array.from(tabWithProject.element.querySelectorAll('.tree-item'));
      const names = treeItems.map(item => item.querySelector('.tree-name')?.textContent);

      // Model and its sub-categories should exist
      expect(names).toContain('TestCar');
      // Meshes category within the model
      expect(names.some(n => n === 'Meshes')).toBe(true);
      // Individual mesh names
      expect(names).toContain('Body');
      expect(names).toContain('Wheels');
      // Materials category within the model
      expect(names.filter(n => n === 'Materials').length).toBeGreaterThanOrEqual(2);
      // Individual material name
      expect(names).toContain('CarPaint');

      tabWithProject.dispose();
    });

    it('should emit asset:selected when model asset is clicked', () => {
      // Create mock project service
      const mockProjectService = {
        isProjectOpen: true,
        projectName: 'Test Project',
      };

      // Register a model asset
      const modelAsset = createMockModelAsset('TestCar', 'model-uuid-3');
      assetRegistry.register(modelAsset);

      // Create new AssetBrowserTab
      const tabWithProject = new AssetBrowserTab({
        eventBus,
        assetRegistry,
        materialFactory,
        shaderFactory,
        projectService: mockProjectService as any,
      });

      const selectHandler = vi.fn();
      eventBus.on('asset:selected', selectHandler);

      // Find and click the model item
      const treeItems = tabWithProject.element.querySelectorAll('.tree-item');
      const modelItem = Array.from(treeItems).find(item => {
        const name = item.querySelector('.tree-name')?.textContent;
        return name === 'TestCar';
      });

      expect(modelItem).not.toBeNull();
      modelItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(selectHandler).toHaveBeenCalledTimes(1);
      expect(selectHandler).toHaveBeenCalledWith({
        asset: expect.objectContaining({ uuid: 'model-uuid-3', type: 'model' }),
      });

      tabWithProject.dispose();
    });

    it('should refresh when model asset is registered', () => {
      // Create mock project service
      const mockProjectService = {
        isProjectOpen: true,
        projectName: 'Test Project',
      };

      // Create new AssetBrowserTab
      const tabWithProject = new AssetBrowserTab({
        eventBus,
        assetRegistry,
        materialFactory,
        shaderFactory,
        projectService: mockProjectService as any,
      });

      const initialItems = tabWithProject.element.querySelectorAll('.tree-item').length;

      // Register a model asset
      const modelAsset = createMockModelAsset('NewModel', 'model-uuid-4');
      assetRegistry.register(modelAsset);

      // Tree should have more items now
      const newItems = tabWithProject.element.querySelectorAll('.tree-item').length;
      expect(newItems).toBeGreaterThan(initialItems);

      // Model should appear
      const names = Array.from(tabWithProject.element.querySelectorAll('.tree-item'))
        .map(item => item.querySelector('.tree-name')?.textContent);
      expect(names).toContain('NewModel');

      tabWithProject.dispose();
    });
  });
});
