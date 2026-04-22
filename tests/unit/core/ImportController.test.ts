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
import type { IImporter, ImportResult } from '@core/interfaces';

describe('ImportController', () => {
  // Mock dependencies
  let mockEventBus: EventBus;
  let mockSceneGraph: SceneGraph;
  let mockProjectService: ProjectService;
  let mockImporter: IImporter;

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

    // Create a generic mock importer that handles .glb files by default
    mockImporter = {
      id: 'mock-importer',
      name: 'Mock Importer',
      version: '1.0.0',
      supportedExtensions: ['.glb', '.gltf'],
      canImport: vi.fn((file: File) =>
        file.name.toLowerCase().endsWith('.glb') ||
        file.name.toLowerCase().endsWith('.gltf')
      ),
      import: vi.fn(),
      initialize: vi.fn(),
      dispose: vi.fn(),
    } as unknown as IImporter;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createController(opts?: { register?: boolean }): ImportController {
    const controller = new ImportController({
      eventBus: mockEventBus,
      sceneGraph: mockSceneGraph,
      projectService: mockProjectService,
    });
    if (opts?.register !== false) {
      controller.registerImporter(mockImporter);
    }
    return controller;
  }

  describe('constructor', () => {
    it('should create an instance', () => {
      const controller = createController();
      expect(controller).toBeDefined();
    });
  });

  describe('registerImporter', () => {
    it('should route a file to the first matching importer', async () => {
      const objImporter: IImporter = {
        id: 'obj',
        name: 'OBJ',
        version: '1.0.0',
        supportedExtensions: ['.obj'],
        canImport: vi.fn((file: File) => file.name.endsWith('.obj')),
        import: vi.fn().mockResolvedValue({
          entities: [],
          assets: [],
          warnings: [],
        } as ImportResult),
        initialize: vi.fn(),
        dispose: vi.fn(),
      } as unknown as IImporter;

      vi.mocked(mockImporter.import).mockResolvedValue({
        entities: [],
        assets: [],
        warnings: [],
      } as ImportResult);

      const controller = new ImportController({
        eventBus: mockEventBus,
        sceneGraph: mockSceneGraph,
        projectService: mockProjectService,
      });
      controller.registerImporter(mockImporter);
      controller.registerImporter(objImporter);

      // .obj file → routed to obj importer, NOT mock importer
      await controller.importFile(new File([], 'thing.obj'));
      expect(objImporter.import).toHaveBeenCalledTimes(1);
      expect(mockImporter.import).not.toHaveBeenCalled();

      // .glb file → routed to mock importer
      await controller.importFile(new File([], 'thing.glb'));
      expect(mockImporter.import).toHaveBeenCalledTimes(1);
    });
  });

  describe('importFile', () => {
    it('should import a valid file using the matching importer', async () => {
      const mockResult: ImportResult = {
        entities: [{ id: 'test-entity' } as never],
        assets: [
          { uuid: 'mesh-1', type: 'mesh' } as never,
        ],
        primaryAssetId: 'model-1',
        warnings: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(mockResult);

      const controller = createController();
      const file = new File([], 'test.glb');

      const result = await controller.importFile(file);

      expect(result.success).toBe(true);
      expect(result.objectCount).toBe(1);
      expect(result.meshAssetCount).toBe(1);
      expect(mockImporter.import).toHaveBeenCalledWith(file, undefined);
      expect(mockSceneGraph.add).toHaveBeenCalled();
    });

    it('should return error when no importer can handle the file', async () => {
      vi.mocked(mockImporter.canImport).mockReturnValue(false);

      const controller = createController();
      const file = new File([], 'test.obj');

      const result = await controller.importFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file format');
      expect(mockImporter.import).not.toHaveBeenCalled();
    });

    it('should return error when no importers are registered', async () => {
      const controller = createController({ register: false });
      const file = new File([], 'test.glb');

      const result = await controller.importFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });

    it('should handle import errors gracefully', async () => {
      vi.mocked(mockImporter.import).mockRejectedValue(new Error('Parse error'));

      const controller = createController();
      const file = new File([], 'test.glb');

      const result = await controller.importFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Parse error');
    });

    it('should add all imported entities to scene graph', async () => {
      const mockEntities = [
        { id: 'entity-1' },
        { id: 'entity-2' },
        { id: 'entity-3' },
      ];

      const mockResult: ImportResult = {
        entities: mockEntities as never[],
        assets: [],
        primaryAssetId: 'model-1',
        warnings: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(mockResult);

      const controller = createController();
      const file = new File([], 'test.glb');

      await controller.importFile(file);

      expect(mockSceneGraph.add).toHaveBeenCalledTimes(3);
      expect(mockSceneGraph.add).toHaveBeenCalledWith(mockEntities[0]);
      expect(mockSceneGraph.add).toHaveBeenCalledWith(mockEntities[1]);
      expect(mockSceneGraph.add).toHaveBeenCalledWith(mockEntities[2]);
    });

    it('should emit import:complete event on success', async () => {
      const mockResult: ImportResult = {
        entities: [{ id: 'entity-1' } as never],
        assets: [
          { uuid: 'mesh-1', type: 'mesh' } as never,
          { uuid: 'mesh-2', type: 'mesh' } as never,
          { uuid: 'mat-1', type: 'material' } as never,
        ],
        primaryAssetId: 'model-1',
        warnings: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(mockResult);

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
      const mockResult: ImportResult = {
        entities: [],
        assets: [],
        warnings: ['Missing normals', 'Unsupported extension'],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(mockResult);

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

      const mockResultSuccess: ImportResult = {
        entities: [{ id: 'entity-1' } as never],
        assets: [],
        primaryAssetId: 'model-1',
        warnings: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(mockResultSuccess);

      const controller = new ImportController({
        eventBus: mockEventBus,
        sceneGraph: mockSceneGraph,
        projectService: mockProjectServiceClosed,
      });
      controller.registerImporter(mockImporter);

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

      const mockResultSuccess: ImportResult = {
        entities: [{ id: 'entity-1' } as never],
        assets: [],
        primaryAssetId: 'model-1',
        warnings: [],
      };

      vi.mocked(mockImporter.import).mockResolvedValue(mockResultSuccess);

      const controller = new ImportController({
        eventBus: mockEventBus,
        sceneGraph: mockSceneGraph,
        projectService: mockProjectServiceOpen,
      });
      controller.registerImporter(mockImporter);
      const file = new File([], 'test.glb');

      const result = await controller.importFile(file);

      expect(result.success).toBe(true);
    });
  });
});
