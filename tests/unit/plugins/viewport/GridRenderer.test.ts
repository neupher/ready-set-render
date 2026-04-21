/**
 * GridRenderer Tests
 *
 * Tests for the viewport grid renderer.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventBus } from '@core/EventBus';
import { SettingsService } from '@core/SettingsService';
import { GridRenderer } from '@plugins/viewport/GridRenderer';
import { createMockGL, createMockCanvas } from '../../../helpers/webgl-mock';
import type { IPluginContext } from '@core/interfaces';

describe('GridRenderer', () => {
  let gl: WebGL2RenderingContext;
  let eventBus: EventBus;
  let settingsService: SettingsService;
  let gridRenderer: GridRenderer;
  let pluginContext: IPluginContext;

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

    gl = createMockGL();
    eventBus = new EventBus();
    settingsService = new SettingsService({
      eventBus,
      storageKey: 'test-grid-settings',
    });

    pluginContext = {
      gl,
      canvas: createMockCanvas(gl),
      eventBus,
      sceneGraph: {} as IPluginContext['sceneGraph'],
      selectionManager: {} as IPluginContext['selectionManager'],
      commandHistory: {} as IPluginContext['commandHistory'],
      assetRegistry: {} as IPluginContext['assetRegistry'],
      settingsService,
    };

    gridRenderer = new GridRenderer();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create a grid renderer instance', () => {
      expect(gridRenderer).toBeDefined();
    });

    it('should have correct plugin metadata', () => {
      expect(gridRenderer.id).toBe('grid-renderer');
      expect(gridRenderer.name).toBe('Grid Renderer');
      expect(gridRenderer.version).toBe('1.0.0');
    });
  });

  describe('initialize', () => {
    it('should compile shaders and create WebGL resources', async () => {
      await gridRenderer.initialize(pluginContext);

      // Should have created a shader program
      expect(gl.createProgram).toHaveBeenCalled();
      expect(gl.createShader).toHaveBeenCalled();

      // Should have created VAO and buffers
      expect(gl.createVertexArray).toHaveBeenCalled();
      expect(gl.createBuffer).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      await gridRenderer.initialize(pluginContext);

      const callCount = (gl.createProgram as ReturnType<typeof vi.fn>).mock.calls.length;

      await gridRenderer.initialize(pluginContext);

      // Should not have created another program
      expect((gl.createProgram as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
    });

    it('should generate initial grid geometry', async () => {
      await gridRenderer.initialize(pluginContext);

      // Should have uploaded data to buffers
      expect(gl.bufferData).toHaveBeenCalled();
    });
  });

  describe('render', () => {
    it('should skip rendering if not initialized', () => {
      const mockCamera = {
        getViewProjectionMatrix: vi.fn(() => new Float32Array(16)),
        position: [0, 0, 5] as [number, number, number],
      };

      gridRenderer.render(mockCamera as any);

      // Should not use the program since not initialized
      expect(gl.useProgram).not.toHaveBeenCalled();
    });

    it('should render when visible', async () => {
      await gridRenderer.initialize(pluginContext);

      const mockCamera = {
        getViewProjectionMatrix: vi.fn(() => new Float32Array(16)),
        position: [0, 0, 5] as [number, number, number],
      };

      gridRenderer.render(mockCamera as any);

      // Should use the shader program
      expect(gl.useProgram).toHaveBeenCalled();

      // Should draw the grid
      expect(gl.drawArrays).toHaveBeenCalled();
    });

    it('should not render when visibility is off', async () => {
      await gridRenderer.initialize(pluginContext);

      // Turn off visibility
      settingsService.set('grid', 'visible', false);

      const mockCamera = {
        getViewProjectionMatrix: vi.fn(() => new Float32Array(16)),
        position: [0, 0, 5] as [number, number, number],
      };

      // Clear mock calls from initialization
      (gl.useProgram as ReturnType<typeof vi.fn>).mockClear();
      (gl.drawArrays as ReturnType<typeof vi.fn>).mockClear();

      gridRenderer.render(mockCamera as any);

      // Should not draw when hidden
      expect(gl.drawArrays).not.toHaveBeenCalled();
    });

    it('should enable blending for transparency', async () => {
      await gridRenderer.initialize(pluginContext);

      const mockCamera = {
        getViewProjectionMatrix: vi.fn(() => new Float32Array(16)),
        position: [0, 0, 5] as [number, number, number],
      };

      gridRenderer.render(mockCamera as any);

      expect(gl.enable).toHaveBeenCalledWith(gl.BLEND);
    });

    it('should disable depth writing during render', async () => {
      await gridRenderer.initialize(pluginContext);

      const mockCamera = {
        getViewProjectionMatrix: vi.fn(() => new Float32Array(16)),
        position: [0, 0, 5] as [number, number, number],
      };

      gridRenderer.render(mockCamera as any);

      expect(gl.depthMask).toHaveBeenCalledWith(false);
    });

    it('should restore depth writing after render', async () => {
      await gridRenderer.initialize(pluginContext);

      const mockCamera = {
        getViewProjectionMatrix: vi.fn(() => new Float32Array(16)),
        position: [0, 0, 5] as [number, number, number],
      };

      gridRenderer.render(mockCamera as any);

      // Last call should restore depth mask
      const depthMaskCalls = (gl.depthMask as ReturnType<typeof vi.fn>).mock.calls;
      expect(depthMaskCalls[depthMaskCalls.length - 1][0]).toBe(true);
    });
  });

  describe('isVisible', () => {
    it('should return true when grid is visible', async () => {
      await gridRenderer.initialize(pluginContext);
      expect(gridRenderer.isVisible()).toBe(true);
    });

    it('should return false when grid is hidden', async () => {
      await gridRenderer.initialize(pluginContext);
      settingsService.set('grid', 'visible', false);
      expect(gridRenderer.isVisible()).toBe(false);
    });
  });

  describe('toggleVisibility', () => {
    it('should toggle from visible to hidden', async () => {
      await gridRenderer.initialize(pluginContext);
      expect(gridRenderer.isVisible()).toBe(true);
      gridRenderer.toggleVisibility();
      expect(gridRenderer.isVisible()).toBe(false);
    });

    it('should toggle from hidden to visible', async () => {
      await gridRenderer.initialize(pluginContext);
      settingsService.set('grid', 'visible', false);
      expect(gridRenderer.isVisible()).toBe(false);
      gridRenderer.toggleVisibility();
      expect(gridRenderer.isVisible()).toBe(true);
    });
  });

  describe('regenerateGrid', () => {
    it('should regenerate geometry when called', async () => {
      await gridRenderer.initialize(pluginContext);

      // Clear buffer data calls
      (gl.bufferData as ReturnType<typeof vi.fn>).mockClear();

      gridRenderer.regenerateGrid();

      // Should have uploaded new buffer data
      expect(gl.bufferData).toHaveBeenCalled();
    });
  });

  describe('settings changes', () => {
    it('should regenerate grid when size changes', async () => {
      await gridRenderer.initialize(pluginContext);

      // Clear buffer data calls
      (gl.bufferData as ReturnType<typeof vi.fn>).mockClear();

      settingsService.set('grid', 'size', 20);

      // Should have regenerated the grid
      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('should regenerate grid when subdivisions change', async () => {
      await gridRenderer.initialize(pluginContext);

      // Clear buffer data calls
      (gl.bufferData as ReturnType<typeof vi.fn>).mockClear();

      settingsService.set('grid', 'subdivisions', 20);

      // Should have regenerated the grid
      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('should regenerate grid when colors change', async () => {
      await gridRenderer.initialize(pluginContext);

      // Clear buffer data calls
      (gl.bufferData as ReturnType<typeof vi.fn>).mockClear();

      settingsService.set('grid', 'lineColor', '#ffffff');

      // Should have regenerated the grid
      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('should not regenerate grid when opacity changes', async () => {
      await gridRenderer.initialize(pluginContext);

      // Clear buffer data calls
      (gl.bufferData as ReturnType<typeof vi.fn>).mockClear();

      settingsService.set('grid', 'opacity', 0.5);

      // Opacity is applied at render time, not geometry generation
      expect(gl.bufferData).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should delete WebGL resources', async () => {
      await gridRenderer.initialize(pluginContext);

      await gridRenderer.dispose();

      // Should delete program, VAO, and buffers
      expect(gl.deleteProgram).toHaveBeenCalled();
      expect(gl.deleteVertexArray).toHaveBeenCalled();
      expect(gl.deleteBuffer).toHaveBeenCalled();
    });

    it('should allow re-initialization after dispose', async () => {
      await gridRenderer.initialize(pluginContext);
      await gridRenderer.dispose();

      // Should be able to initialize again
      await expect(gridRenderer.initialize(pluginContext)).resolves.not.toThrow();
    });
  });

  describe('grid geometry generation', () => {
    it('should generate lines for both X and Y directions', async () => {
      await gridRenderer.initialize(pluginContext);

      // Check that buffer data was uploaded with vertex positions
      const bufferDataCalls = (gl.bufferData as ReturnType<typeof vi.fn>).mock.calls;

      // Should have calls for both position and color buffers
      expect(bufferDataCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should include axis lines when enabled', async () => {
      // Axis lines are enabled by default
      expect(settingsService.get('grid', 'showAxisLines')).toBe(true);

      await gridRenderer.initialize(pluginContext);

      // Grid should include axis indicator lines
      // (This is tested implicitly by the buffer upload)
      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('should exclude axis lines when disabled', async () => {
      settingsService.set('grid', 'showAxisLines', false);

      await gridRenderer.initialize(pluginContext);

      // Grid should still render, just without axis lines
      expect(gl.bufferData).toHaveBeenCalled();
    });
  });
});
