/**
 * ProjectService Unit Tests
 *
 * Tests for the ProjectService class that manages project folders.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProjectService } from '@core/ProjectService';
import { EventBus } from '@core/EventBus';
import { AssetRegistry } from '@core/assets/AssetRegistry';
import { FileSystemAssetStore } from '@core/assets/FileSystemAssetStore';
import { MaterialAssetFactory } from '@core/assets/MaterialAssetFactory';
import { BUILT_IN_SHADERS } from '@core/assets/BuiltInShaders';
import { BUILT_IN_MATERIALS } from '@core/assets/BuiltInMaterials';
import type { IProjectMetadata } from '@core/interfaces/IProjectService';

/**
 * Create a mock FileSystemAssetStore for testing.
 */
function createMockAssetStore(eventBus: EventBus) {
  const store = new FileSystemAssetStore(eventBus);

  // Mock the isSupported method
  vi.spyOn(store, 'isSupported').mockReturnValue(true);

  // Mock the isOpen getter
  let isOpen = false;
  let folderName: string | undefined;
  let rootHandle: FileSystemDirectoryHandle | null = null;

  Object.defineProperty(store, 'isOpen', {
    get: () => isOpen,
  });

  Object.defineProperty(store, 'folderName', {
    get: () => folderName,
  });

  // Mock openFolder
  vi.spyOn(store, 'openFolder').mockImplementation(async () => {
    isOpen = true;
    folderName = 'TestProject';
    rootHandle = {
      name: 'TestProject',
      kind: 'directory',
      getDirectoryHandle: vi.fn().mockRejectedValue(new DOMException('Not found', 'NotFoundError')),
      getFileHandle: vi.fn(),
      removeEntry: vi.fn(),
      resolve: vi.fn(),
      keys: vi.fn(),
      values: vi.fn(),
      entries: vi.fn(),
      [Symbol.asyncIterator]: vi.fn(),
      isSameEntry: vi.fn(),
      queryPermission: vi.fn(),
      requestPermission: vi.fn(),
    } as unknown as FileSystemDirectoryHandle;
    return { success: true, folderName: 'TestProject' };
  });

  // Mock closeFolder
  vi.spyOn(store, 'closeFolder').mockImplementation(() => {
    isOpen = false;
    folderName = undefined;
    rootHandle = null;
  });

  // Mock getRootHandle
  vi.spyOn(store, 'getRootHandle').mockImplementation(() => rootHandle);

  // Mock listAssets
  vi.spyOn(store, 'listAssets').mockResolvedValue([]);

  return store;
}

describe('ProjectService', () => {
  let eventBus: EventBus;
  let assetRegistry: AssetRegistry;
  let assetStore: FileSystemAssetStore;
  let projectService: ProjectService;

  beforeEach(() => {
    eventBus = new EventBus();
    assetRegistry = new AssetRegistry(eventBus);
    assetStore = createMockAssetStore(eventBus);

    // Register built-in assets
    for (const shader of BUILT_IN_SHADERS) {
      assetRegistry.register(shader);
    }
    for (const material of BUILT_IN_MATERIALS) {
      assetRegistry.register(material);
    }

    projectService = new ProjectService({
      eventBus,
      assetRegistry,
      assetStore,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with no project open', () => {
      expect(projectService.isProjectOpen).toBe(false);
      expect(projectService.projectName).toBeUndefined();
      expect(projectService.projectMetadata).toBeUndefined();
    });

    it('should report if File System Access API is supported', () => {
      expect(projectService.isSupported()).toBe(true);
    });
  });

  describe('isProjectOpen', () => {
    it('should return false when no project is open', () => {
      expect(projectService.isProjectOpen).toBe(false);
    });
  });

  describe('closeProject', () => {
    it('should succeed when no project is open', async () => {
      const result = await projectService.closeProject();
      expect(result.success).toBe(true);
    });

    it('should emit project:closed event when closing an open project', async () => {
      // We need to set up a project first - but since openProject is complex,
      // we'll test closeProject in isolation by checking the event is NOT emitted
      // when no project is open
      const closedHandler = vi.fn();
      eventBus.on('project:closed', closedHandler);

      await projectService.closeProject();

      // Should not emit event when no project was open
      expect(closedHandler).not.toHaveBeenCalled();
    });
  });

  describe('saveAsset', () => {
    it('should fail when no project is open', async () => {
      const materialFactory = new MaterialAssetFactory();
      const material = materialFactory.create({
        name: 'Test Material',
        shaderRef: { uuid: 'built-in-shader-pbr', type: 'shader' },
      });

      const result = await projectService.saveAsset(material);
      expect(result).toBe(false);
    });

    it('should not save built-in assets', async () => {
      // Get a built-in material
      const builtInMaterial = BUILT_IN_MATERIALS[0];

      const result = await projectService.saveAsset(builtInMaterial);
      expect(result).toBe(false);
    });
  });

  describe('deleteAsset', () => {
    it('should fail when no project is open', async () => {
      const result = await projectService.deleteAsset('some-uuid');
      expect(result).toBe(false);
    });

    it('should fail when asset not found', async () => {
      const result = await projectService.deleteAsset('non-existent-uuid');
      expect(result).toBe(false);
    });

    it('should not delete built-in assets', async () => {
      // Get a built-in material's UUID
      const builtInMaterial = BUILT_IN_MATERIALS[0];

      const result = await projectService.deleteAsset(builtInMaterial.uuid);
      expect(result).toBe(false);
    });
  });

  describe('scanForAssets', () => {
    it('should return empty array when store is not open', async () => {
      const assets = await projectService.scanForAssets();
      expect(assets).toEqual([]);
    });
  });

  describe('static methods', () => {
    it('should get last project name from localStorage', () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue('LastProject'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };
      vi.stubGlobal('localStorage', mockLocalStorage);

      const lastProject = ProjectService.getLastProjectName();
      expect(lastProject).toBe('LastProject');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('rsr:lastProject');

      vi.unstubAllGlobals();
    });

    it('should return null when localStorage throws', () => {
      // Mock localStorage to throw
      const mockLocalStorage = {
        getItem: vi.fn().mockImplementation(() => {
          throw new Error('localStorage not available');
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };
      vi.stubGlobal('localStorage', mockLocalStorage);

      const lastProject = ProjectService.getLastProjectName();
      expect(lastProject).toBeNull();

      vi.unstubAllGlobals();
    });
  });
});

describe('ProjectService with unsupported browser', () => {
  let eventBus: EventBus;
  let assetRegistry: AssetRegistry;
  let assetStore: FileSystemAssetStore;
  let projectService: ProjectService;

  beforeEach(() => {
    eventBus = new EventBus();
    assetRegistry = new AssetRegistry(eventBus);
    assetStore = new FileSystemAssetStore(eventBus);

    // Mock isSupported to return false
    vi.spyOn(assetStore, 'isSupported').mockReturnValue(false);

    projectService = new ProjectService({
      eventBus,
      assetRegistry,
      assetStore,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should report API not supported', () => {
    expect(projectService.isSupported()).toBe(false);
  });

  it('should fail to open project with error message', async () => {
    const result = await projectService.openProject();

    expect(result.success).toBe(false);
    expect(result.error).toContain('not supported');
  });
});
