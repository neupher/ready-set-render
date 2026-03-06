/**
 * ModelImportInspector Component Tests
 *
 * Tests for the import settings inspector panel for model assets.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelImportInspector } from '@ui/inspectors/ModelImportInspector';
import { EventBus } from '@core/EventBus';
import type { IModelAssetMeta } from '@core/assets/interfaces/IModelAssetMeta';
import type { AssetMetaService } from '@core/assets/AssetMetaService';
import type { ProjectService } from '@core/ProjectService';
import { createDefaultModelImportSettings } from '@core/assets/DefaultImportSettings';

/**
 * Create a mock model asset meta for testing.
 */
function createMockModelMeta(overrides?: Partial<IModelAssetMeta>): IModelAssetMeta {
  return {
    version: 1,
    uuid: 'test-model-uuid-1234',
    type: 'model',
    importedAt: '2026-03-04T12:00:00Z',
    sourceHash: 'size:12345:mtime:1709564400000',
    isDirty: false,
    sourcePath: 'Assets/Models/car.glb',
    importSettings: createDefaultModelImportSettings(),
    contents: {
      meshes: [
        { uuid: 'mesh-uuid-1', name: 'Body', sourceIndex: 0, vertexCount: 1000, triangleCount: 500 },
        { uuid: 'mesh-uuid-2', name: 'Wheels', sourceIndex: 1, vertexCount: 800, triangleCount: 400 },
      ],
      materials: [
        { uuid: 'mat-uuid-1', name: 'CarPaint', sourceIndex: 0, isOverridden: false },
      ],
    },
    hierarchy: [
      {
        name: 'Root',
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        children: [],
      },
    ],
    ...overrides,
  };
}

/**
 * Create a mock FileSystemDirectoryHandle.
 */
function createMockDirectoryHandle(): FileSystemDirectoryHandle {
  return {
    kind: 'directory',
    name: 'Models',
    isSameEntry: vi.fn().mockResolvedValue(false),
    getFileHandle: vi.fn(),
    getDirectoryHandle: vi.fn(),
    removeEntry: vi.fn(),
    resolve: vi.fn(),
    keys: vi.fn(),
    values: vi.fn(),
    entries: vi.fn(),
    [Symbol.asyncIterator]: vi.fn(),
  } as unknown as FileSystemDirectoryHandle;
}

/**
 * Create mock AssetMetaService.
 */
function createMockAssetMetaService(): AssetMetaService {
  return {
    createModelMeta: vi.fn(),
    readMeta: vi.fn(),
    readModelMeta: vi.fn(),
    saveMeta: vi.fn(),
    updateMeta: vi.fn().mockResolvedValue({ success: true }),
    hasMeta: vi.fn(),
    deleteMeta: vi.fn(),
    markDirty: vi.fn(),
    markClean: vi.fn(),
    getMetaTypeForExtension: vi.fn(),
  } as unknown as AssetMetaService;
}

/**
 * Create mock ProjectService.
 */
function createMockProjectService(): ProjectService {
  return {
    isProjectOpen: true,
    projectName: 'TestProject',
    getProjectHandle: vi.fn().mockReturnValue(createMockDirectoryHandle()),
    openProject: vi.fn(),
    closeProject: vi.fn(),
    rescanProject: vi.fn(),
    getSourceFiles: vi.fn().mockReturnValue([]),
  } as unknown as ProjectService;
}

describe('ModelImportInspector', () => {
  let inspector: ModelImportInspector;
  let eventBus: EventBus;
  let assetMetaService: AssetMetaService;
  let projectService: ProjectService;

  beforeEach(() => {
    eventBus = new EventBus();
    assetMetaService = createMockAssetMetaService();
    projectService = createMockProjectService();

    inspector = new ModelImportInspector({
      eventBus,
      assetMetaService,
      projectService,
    });
  });

  describe('constructor', () => {
    it('should create inspector element', () => {
      expect(inspector.element).toBeInstanceOf(HTMLDivElement);
      expect(inspector.element.classList.contains('model-import-inspector')).toBe(true);
    });

    it('should show empty state initially', () => {
      const emptyMessage = inspector.element.textContent;
      expect(emptyMessage).toContain('Select a model asset');
    });

    it('should have no pending changes initially', () => {
      expect(inspector.hasPendingChanges).toBe(false);
    });
  });

  describe('setModelMeta', () => {
    it('should display the model filename', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      expect(inspector.element.textContent).toContain('car.glb');
    });

    it('should display import settings sections', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      expect(inspector.element.textContent).toContain('Model Import Settings');
      expect(inspector.element.textContent).toContain('Meshes');
      expect(inspector.element.textContent).toContain('Materials');
    });

    it('should show dirty warning when isDirty is true', () => {
      const meta = createMockModelMeta({ isDirty: true });
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      expect(inspector.element.textContent).toContain('Source file changed');
    });

    it('should not show dirty warning when isDirty is false', () => {
      const meta = createMockModelMeta({ isDirty: false });
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      expect(inspector.element.textContent).not.toContain('Source file changed');
    });

    it('should display scale factor input', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      expect(inspector.element.textContent).toContain('Scale Factor');
    });

    it('should display coordinate conversion options', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      expect(inspector.element.textContent).toContain('Convert to Z-Up');
      expect(inspector.element.textContent).toContain('Source Up Axis');
    });

    it('should display mesh import options', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      expect(inspector.element.textContent).toContain('Generate Normals');
      expect(inspector.element.textContent).toContain('Generate Tangents');
      expect(inspector.element.textContent).toContain('Weld Vertices');
      expect(inspector.element.textContent).toContain('Optimize Mesh');
    });

    it('should display material import options', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      expect(inspector.element.textContent).toContain('Import Materials');
      expect(inspector.element.textContent).toContain('Name Prefix');
      expect(inspector.element.textContent).toContain('Extract Textures');
    });

    it('should display action buttons', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      expect(inspector.element.textContent).toContain('Revert');
      expect(inspector.element.textContent).toContain('Apply');
    });

    it('should display metadata footer', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      expect(inspector.element.textContent).toContain('Last imported');
      expect(inspector.element.textContent).toContain('Source hash');
    });
  });

  describe('clear', () => {
    it('should reset to empty state', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);
      inspector.clear();

      expect(inspector.element.textContent).toContain('Select a model asset');
      expect(inspector.hasPendingChanges).toBe(false);
    });
  });

  describe('hasPendingChanges', () => {
    it('should be false when no model is loaded', () => {
      expect(inspector.hasPendingChanges).toBe(false);
    });

    it('should be false when settings match the loaded meta', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      expect(inspector.hasPendingChanges).toBe(false);
    });
  });

  describe('action buttons', () => {
    it('should have disabled buttons when no changes are pending', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      const revertBtn = inspector.element.querySelector('.revert-btn') as HTMLButtonElement;
      const applyBtn = inspector.element.querySelector('.apply-btn') as HTMLButtonElement;

      expect(revertBtn?.disabled).toBe(true);
      expect(applyBtn?.disabled).toBe(true);
    });
  });

  describe('checkboxes', () => {
    it('should have generate normals checkbox', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      const checkbox = inspector.element.querySelector('#generate-normals') as HTMLInputElement;
      expect(checkbox).toBeTruthy();
      expect(checkbox.checked).toBe(meta.importSettings.meshes.generateNormals);
    });

    it('should have convert to Z-up checkbox', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      const checkbox = inspector.element.querySelector('#convert-z-up') as HTMLInputElement;
      expect(checkbox).toBeTruthy();
      expect(checkbox.checked).toBe(meta.importSettings.convertCoordinates.convertToZUp);
    });

    it('should have import materials checkbox', () => {
      const meta = createMockModelMeta();
      const dirHandle = createMockDirectoryHandle();

      inspector.setModelMeta(meta, 'car.glb', dirHandle);

      const checkbox = inspector.element.querySelector('#import-materials') as HTMLInputElement;
      expect(checkbox).toBeTruthy();
      expect(checkbox.checked).toBe(meta.importSettings.materials.importMaterials);
    });
  });
});
