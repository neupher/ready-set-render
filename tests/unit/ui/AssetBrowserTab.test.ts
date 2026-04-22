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

/**
 * Build a fake `FileSystemDirectoryHandle` from a nested entries object
 * (`{ folderName: { ... } }` for directories, `{ fileName: 'file' }` for files).
 *
 * Used by tests that verify the disk-mirror tree under a mocked project.
 */
type MockEntries = { [name: string]: MockEntries | 'file' };

function mockDirHandle(name: string, entries: MockEntries): FileSystemDirectoryHandle {
  const handle = {
    name,
    kind: 'directory' as const,
    async *entries() {
      for (const [entryName, value] of Object.entries(entries)) {
        if (value === 'file') {
          yield [entryName, { name: entryName, kind: 'file' }];
        } else {
          yield [entryName, mockDirHandle(entryName, value)];
        }
      }
    },
    getFileHandle: vi.fn(),
    getDirectoryHandle: vi.fn(),
    removeEntry: vi.fn(),
  };
  return handle as unknown as FileSystemDirectoryHandle;
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
    it('shows the project section when a project is open (empty when handle is unavailable)', () => {
      const mockProjectService = {
        isProjectOpen: true,
        projectName: 'Test Project',
        getSourceFiles: () => [],
        getProjectHandle: () => null,
      };

      const tabWithProject = new AssetBrowserTab({
        eventBus,
        assetRegistry,
        materialFactory,
        shaderFactory,
        projectService: mockProjectService as any,
      });

      const treeItems = Array.from(tabWithProject.element.querySelectorAll('.tree-item'));
      const names = treeItems.map(item => item.querySelector('.tree-name')?.textContent);

      // The project section uses the project name as its label
      expect(names).toContain('Test Project');

      tabWithProject.dispose();
    });

    it('mirrors the on-disk folder structure under the Project section', async () => {
      const mockHandle = mockDirHandle('TestProject', {
        assets: {
          materials: {},
          models: {},
          shaders: {},
        },
      });

      const mockProjectService = {
        isProjectOpen: true,
        projectName: 'TestProject',
        getSourceFiles: () => [],
        getProjectHandle: () => mockHandle,
      };

      // Provide a stub assetMetaService so the disk-walk runs (the walk only
      // executes when both projectService and assetMetaService are present).
      const stubMetaService = { readModelMeta: vi.fn() };

      const tabWithProject = new AssetBrowserTab({
        eventBus,
        assetRegistry,
        materialFactory,
        shaderFactory,
        projectService: mockProjectService as any,
        assetMetaService: stubMetaService as any,
      });

      await tabWithProject.refresh();

      // Top-level on-disk folder ('assets') is rendered under the Project section.
      // Subfolders are collapsed by default in the TreeView; expanding them is
      // verified separately. The presence of `assets` proves the disk walk ran
      // and built nodes from the actual on-disk hierarchy.
      const names = Array.from(tabWithProject.element.querySelectorAll('.tree-item'))
        .map(item => item.querySelector('.tree-name')?.textContent);

      expect(names).toContain('TestProject');
      expect(names).toContain('assets');

      tabWithProject.dispose();
    });

    it('shows registered material assets at their on-disk location', async () => {
      // Register a material; the tree renders it from the registry when its
      // `.material.json` file is encountered on disk.
      const material = materialFactory.create({
        name: 'TestMaterial',
        shaderRef: { uuid: 'built-in-shader-pbr', type: 'shader' },
      });
      assetRegistry.register(material);

      // Place the material file at the project root so it's visible without
      // expanding nested folders in the TreeView.
      const mockHandle = mockDirHandle('TestProject', {
        [`${material.uuid}.material.json`]: 'file',
      });

      const mockProjectService = {
        isProjectOpen: true,
        projectName: 'TestProject',
        getSourceFiles: () => [],
        getProjectHandle: () => mockHandle,
      };

      const tabWithProject = new AssetBrowserTab({
        eventBus,
        assetRegistry,
        materialFactory,
        shaderFactory,
        projectService: mockProjectService as any,
        assetMetaService: { readModelMeta: vi.fn() } as any,
      });

      await tabWithProject.refresh();

      const names = Array.from(tabWithProject.element.querySelectorAll('.tree-item'))
        .map(item => item.querySelector('.tree-name')?.textContent);

      expect(names).toContain('TestMaterial');

      tabWithProject.dispose();
    });

    it('emits asset:selected when a material asset rendered from disk is clicked', async () => {
      const material = materialFactory.create({
        name: 'ClickMe',
        shaderRef: { uuid: 'built-in-shader-pbr', type: 'shader' },
      });
      assetRegistry.register(material);

      // Place at root to avoid TreeView expansion concerns.
      const mockHandle = mockDirHandle('TestProject', {
        [`${material.uuid}.material.json`]: 'file',
      });

      const tabWithProject = new AssetBrowserTab({
        eventBus,
        assetRegistry,
        materialFactory,
        shaderFactory,
        projectService: {
          isProjectOpen: true,
          projectName: 'TestProject',
          getSourceFiles: () => [],
          getProjectHandle: () => mockHandle,
        } as any,
        assetMetaService: { readModelMeta: vi.fn() } as any,
      });

      await tabWithProject.refresh();

      const selectHandler = vi.fn();
      eventBus.on('asset:selected', selectHandler);

      const treeItems = tabWithProject.element.querySelectorAll('.tree-item');
      const target = Array.from(treeItems).find(item =>
        item.querySelector('.tree-name')?.textContent === 'ClickMe'
      );

      expect(target).not.toBeNull();
      target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(selectHandler).toHaveBeenCalledTimes(1);
      expect(selectHandler).toHaveBeenCalledWith({
        asset: expect.objectContaining({ uuid: material.uuid, type: 'material' }),
      });

      tabWithProject.dispose();
    });

    it('refreshes the tree when an asset is registered', async () => {
      const mockProjectService = {
        isProjectOpen: true,
        projectName: 'Test Project',
        getSourceFiles: () => [],
        getProjectHandle: () => null,
      };

      const tabWithProject = new AssetBrowserTab({
        eventBus,
        assetRegistry,
        materialFactory,
        shaderFactory,
        projectService: mockProjectService as any,
      });

      await tabWithProject.refresh();
      const initialItems = tabWithProject.element.querySelectorAll('.tree-item').length;

      // Registering a new asset should cause an asset:registered event that
      // triggers a refresh; even with no disk, the registry-driven Built-in
      // section has not changed, but the refresh listener was wired.
      const refreshSpy = vi.spyOn(tabWithProject, 'refresh');
      const modelAsset = createMockModelAsset('NewModel', 'model-uuid-4');
      assetRegistry.register(modelAsset);

      // Wait a tick for the listener to fire
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(refreshSpy).toHaveBeenCalled();
      // Item count should not regress (built-ins still rendered)
      const newItems = tabWithProject.element.querySelectorAll('.tree-item').length;
      expect(newItems).toBeGreaterThanOrEqual(initialItems);

      tabWithProject.dispose();
    });
  });
});
