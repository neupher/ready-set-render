/**
 * ImportController Tests
 *
 * Tests for the import workflow controller.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ImportController } from '@core/ImportController';
import type { EventBus } from '@core/EventBus';
import type { SceneGraph } from '@core/SceneGraph';
import type { ProjectService } from '@core/ProjectService';
import type { GLTFImporter, GLTFImportResult } from '@plugins/importers/gltf/GLTFImporter';

describe('ImportController', () => {
  // Mock dependencies
  let mockEventBus: EventBus;
  let mockSceneGraph: SceneGraph;
  let mockProjectService: ProjectService;
  let mockGltfImporter: GLTFImporter;

  // Track event handlers for cleanup
  let eventHandlers: Map<string, ((...args: unknown[]) => void)[]>;

  beforeEach(() => {
    eventHandlers = new Map();

    // Create mock event bus
    mockEventBus = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, []);
        }
        eventHandlers.get(event)!.push(handler);
      }),
      off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        const handlers = eventHandlers.get(event);
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index >= 0) {
            handlers.splice(index, 1);
          }
        }
      }),
      emit: vi.fn((event: string, data?: unknown) => {
        const handlers = eventHandlers.get(event);
        if (handlers) {
          handlers.forEach(h => h(data));
        }
      }),
    } as unknown as EventBus;

    // Create mock scene graph
    mockSceneGraph = {
      add: vi.fn(),
      remove: vi.fn(),
      find: vi.fn(),
      getAllObjects: vi.fn().mockReturnValue([]),
    } as unknown as SceneGraph;

    // Create mock project service
    mockProjectService = {
      isProjectOpen: false,
    } as unknown as ProjectService;

    // Create mock GLTF importer
    mockGltfImporter = {
      canImport: vi.fn().mockReturnValue(true),
      import: vi.fn(),
      setProjectService: vi.fn(),
    } as unknown as GLTFImporter;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createController(): ImportController {
    return new ImportController({
      eventBus: mockEventBus,
      sceneGraph: mockSceneGraph,
      projectService: mockProjectService,
      gltfImporter: mockGltfImporter,
    });
  }

  describe('constructor', () => {
    it('should create an instance', () => {
      const controller = createController();
      expect(controller).toBeDefined();
    });
  });

  describe('importFile', () => {
    it('should import a valid GLTF file', async () => {
      const mockResult: GLTFImportResult = {
        objects: [{ id: 'test-entity' } as never],
        warnings: [],
        meshAssets: [{ uuid: 'mesh-1' } as never],
        materialAssets: [],
        meshRefs: [{ uuid: 'mesh-1', name: 'Mesh1', sourceIndex: 0, vertexCount: 100, triangleCount: 50 }],
        materialRefs: [],
        assetMeta: { uuid: 'model-1', type: 'model' } as never,
      };

      vi.mocked(mockGltfImporter.import).mockResolvedValue(mockResult);

      const controller = createController();
      const file = new File([], 'test.glb');

      const result = await controller.importFile(file);

      expect(result.success).toBe(true);
      expect(result.objectCount).toBe(1);
      expect(result.meshAssetCount).toBe(1);
      expect(mockGltfImporter.import).toHaveBeenCalledWith(file);
      expect(mockSceneGraph.add).toHaveBeenCalled();
    });

    it('should return error for unsupported file format', async () => {
      vi.mocked(mockGltfImporter.canImport).mockReturnValue(false);

      const controller = createController();
      const file = new File([], 'test.obj');

      const result = await controller.importFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file format');
      expect(mockGltfImporter.import).not.toHaveBeenCalled();
    });

    it('should handle import errors gracefully', async () => {
      vi.mocked(mockGltfImporter.import).mockRejectedValue(new Error('Parse error'));

      const controller = createController();
      const file = new File([], 'test.glb');

      const result = await controller.importFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Parse error');
    });

    it('should add all imported objects to scene graph', async () => {
      const mockObjects = [
        { id: 'entity-1' },
        { id: 'entity-2' },
        { id: 'entity-3' },
      ];

      const mockResult: GLTFImportResult = {
        objects: mockObjects as never[],
        warnings: [],
        meshAssets: [],
        materialAssets: [],
        meshRefs: [],
        materialRefs: [],
        assetMeta: { uuid: 'model-1', type: 'model' } as never,
      };

      vi.mocked(mockGltfImporter.import).mockResolvedValue(mockResult);

      const controller = createController();
      const file = new File([], 'test.glb');

      await controller.importFile(file);

      expect(mockSceneGraph.add).toHaveBeenCalledTimes(3);
      expect(mockSceneGraph.add).toHaveBeenCalledWith(mockObjects[0]);
      expect(mockSceneGraph.add).toHaveBeenCalledWith(mockObjects[1]);
      expect(mockSceneGraph.add).toHaveBeenCalledWith(mockObjects[2]);
    });

    it('should emit import:complete event on success', async () => {
      const mockResult: GLTFImportResult = {
        objects: [{ id: 'entity-1' } as never],
        warnings: [],
        meshAssets: [{ uuid: 'mesh-1' } as never, { uuid: 'mesh-2' } as never],
        materialAssets: [{ uuid: 'mat-1' } as never],
        meshRefs: [{ uuid: 'mesh-1', name: 'Mesh1', sourceIndex: 0, vertexCount: 100, triangleCount: 50 }],
        materialRefs: [{ uuid: 'mat-1', name: 'Mat1', sourceIndex: 0, isOverridden: false }],
        assetMeta: { uuid: 'model-1', type: 'model' } as never,
      };

      vi.mocked(mockGltfImporter.import).mockResolvedValue(mockResult);

      const controller = createController();
      const file = new File([], 'model.glb');

      await controller.importFile(file);

      expect(mockEventBus.emit).toHaveBeenCalledWith('import:complete', {
        filename: 'model.glb',
        objectCount: 1,
        meshAssetCount: 2,
        materialAssetCount: 1,
        assetMetaId: 'model-1',
      });
    });

    it('should include warnings in result', async () => {
      const mockResult: GLTFImportResult = {
        objects: [],
        warnings: ['Missing normals', 'Unsupported extension'],
        meshAssets: [],
        materialAssets: [],
        meshRefs: [],
        materialRefs: [],
        assetMeta: { uuid: 'model-1', type: 'model' } as never,
      };

      vi.mocked(mockGltfImporter.import).mockResolvedValue(mockResult);

      const controller = createController();
      const file = new File([], 'test.glb');

      const result = await controller.importFile(file);

      expect(result.success).toBe(true);
      expect(result.warnings).toEqual(['Missing normals', 'Unsupported extension']);
    });
  });

  describe('handleImport (with file picker)', () => {
    it('should return cancelled when file picker is cancelled (AbortError)', async () => {
      // Mock showOpenFilePicker to throw AbortError
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';

      const originalShowOpenFilePicker = (window as { showOpenFilePicker?: unknown }).showOpenFilePicker;
      (window as { showOpenFilePicker?: unknown }).showOpenFilePicker = vi.fn().mockRejectedValue(abortError);

      const controller = createController();
      const result = await controller.handleImport();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Import cancelled');

      // Restore
      (window as { showOpenFilePicker?: unknown }).showOpenFilePicker = originalShowOpenFilePicker;
    });
  });

  describe('project handling', () => {
    it('should proceed without open project if user declines', async () => {
      // Mock confirm to return false
      const originalConfirm = window.confirm;
      window.confirm = vi.fn().mockReturnValue(false);

      // Create a new mock with isProjectOpen as false
      const mockProjectServiceClosed = {
        isProjectOpen: false,
      } as unknown as ProjectService;

      const mockResultSuccess: GLTFImportResult = {
        objects: [{ id: 'entity-1' } as never],
        warnings: [],
        meshAssets: [],
        materialAssets: [],
        meshRefs: [],
        materialRefs: [],
        assetMeta: { uuid: 'model-1', type: 'model' } as never,
      };

      vi.mocked(mockGltfImporter.import).mockResolvedValue(mockResultSuccess);

      const controller = new ImportController({
        eventBus: mockEventBus,
        sceneGraph: mockSceneGraph,
        projectService: mockProjectServiceClosed,
        gltfImporter: mockGltfImporter,
      });

      // Use importFile directly to skip file picker
      const file = new File([], 'test.glb');
      const result = await controller.importFile(file);

      expect(result.success).toBe(true);

      // Restore
      window.confirm = originalConfirm;
    });

    it('should proceed when project is already open', async () => {
      // Create a new mock with isProjectOpen as true
      const mockProjectServiceOpen = {
        isProjectOpen: true,
      } as unknown as ProjectService;

      const mockResultSuccess: GLTFImportResult = {
        objects: [{ id: 'entity-1' } as never],
        warnings: [],
        meshAssets: [],
        materialAssets: [],
        meshRefs: [],
        materialRefs: [],
        assetMeta: { uuid: 'model-1', type: 'model' } as never,
      };

      vi.mocked(mockGltfImporter.import).mockResolvedValue(mockResultSuccess);

      const controller = new ImportController({
        eventBus: mockEventBus,
        sceneGraph: mockSceneGraph,
        projectService: mockProjectServiceOpen,
        gltfImporter: mockGltfImporter,
      });
      const file = new File([], 'test.glb');

      const result = await controller.importFile(file);

      expect(result.success).toBe(true);
    });
  });
});
