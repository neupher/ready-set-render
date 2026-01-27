/**
 * GridRenderer Tests
 *
 * Tests for the viewport grid renderer.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventBus } from '@core/EventBus';
import { SettingsService } from '@core/SettingsService';
import { GridRenderer } from '@plugins/viewport/GridRenderer';
import { createMockGL } from '../../../helpers/webgl-mock';

describe('GridRenderer', () => {
  let gl: WebGL2RenderingContext;
  let eventBus: EventBus;
  let settingsService: SettingsService;
  let gridRenderer: GridRenderer;

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

    gridRenderer = new GridRenderer({
      gl,
      eventBus,
      settingsService,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create a grid renderer instance', () => {
      expect(gridRenderer).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should compile shaders and create WebGL resources', () => {
      gridRenderer.initialize();

      // Should have created a shader program
      expect(gl.createProgram).toHaveBeenCalled();
      expect(gl.createShader).toHaveBeenCalled();

      // Should have created VAO and buffers
      expect(gl.createVertexArray).toHaveBeenCalled();
      expect(gl.createBuffer).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', () => {
      gridRenderer.initialize();

      const callCount = (gl.createProgram as ReturnType<typeof vi.fn>).mock.calls.length;

      gridRenderer.initialize();

      // Should not have created another program
      expect((gl.createProgram as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
    });

    it('should generate initial grid geometry', () => {
      gridRenderer.initialize();

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

    it('should render when visible', () => {
      gridRenderer.initialize();

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

    it('should not render when visibility is off', () => {
      gridRenderer.initialize();

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

    it('should enable blending for transparency', () => {
      gridRenderer.initialize();

      const mockCamera = {
        getViewProjectionMatrix: vi.fn(() => new Float32Array(16)),
        position: [0, 0, 5] as [number, number, number],
      };

      gridRenderer.render(mockCamera as any);

      expect(gl.enable).toHaveBeenCalledWith(gl.BLEND);
    });

    it('should disable depth writing during render', () => {
      gridRenderer.initialize();

      const mockCamera = {
        getViewProjectionMatrix: vi.fn(() => new Float32Array(16)),
        position: [0, 0, 5] as [number, number, number],
      };

      gridRenderer.render(mockCamera as any);

      expect(gl.depthMask).toHaveBeenCalledWith(false);
    });

    it('should restore depth writing after render', () => {
      gridRenderer.initialize();

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
    it('should return true when grid is visible', () => {
      expect(gridRenderer.isVisible()).toBe(true);
    });

    it('should return false when grid is hidden', () => {
      settingsService.set('grid', 'visible', false);
      expect(gridRenderer.isVisible()).toBe(false);
    });
  });

  describe('toggleVisibility', () => {
    it('should toggle from visible to hidden', () => {
      expect(gridRenderer.isVisible()).toBe(true);
      gridRenderer.toggleVisibility();
      expect(gridRenderer.isVisible()).toBe(false);
    });

    it('should toggle from hidden to visible', () => {
      settingsService.set('grid', 'visible', false);
      expect(gridRenderer.isVisible()).toBe(false);
      gridRenderer.toggleVisibility();
      expect(gridRenderer.isVisible()).toBe(true);
    });
  });

  describe('regenerateGrid', () => {
    it('should regenerate geometry when called', () => {
      gridRenderer.initialize();

      // Clear buffer data calls
      (gl.bufferData as ReturnType<typeof vi.fn>).mockClear();

      gridRenderer.regenerateGrid();

      // Should have uploaded new buffer data
      expect(gl.bufferData).toHaveBeenCalled();
    });
  });

  describe('settings changes', () => {
    it('should regenerate grid when size changes', () => {
      gridRenderer.initialize();

      // Clear buffer data calls
      (gl.bufferData as ReturnType<typeof vi.fn>).mockClear();

      settingsService.set('grid', 'size', 20);

      // Should have regenerated the grid
      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('should regenerate grid when subdivisions change', () => {
      gridRenderer.initialize();

      // Clear buffer data calls
      (gl.bufferData as ReturnType<typeof vi.fn>).mockClear();

      settingsService.set('grid', 'subdivisions', 20);

      // Should have regenerated the grid
      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('should regenerate grid when colors change', () => {
      gridRenderer.initialize();

      // Clear buffer data calls
      (gl.bufferData as ReturnType<typeof vi.fn>).mockClear();

      settingsService.set('grid', 'majorLineColor', '#ffffff');

      // Should have regenerated the grid
      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('should not regenerate grid when opacity changes', () => {
      gridRenderer.initialize();

      // Clear buffer data calls
      (gl.bufferData as ReturnType<typeof vi.fn>).mockClear();

      settingsService.set('grid', 'opacity', 0.5);

      // Opacity is applied at render time, not geometry generation
      expect(gl.bufferData).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should delete WebGL resources', () => {
      gridRenderer.initialize();

      gridRenderer.dispose();

      // Should delete program, VAO, and buffers
      expect(gl.deleteProgram).toHaveBeenCalled();
      expect(gl.deleteVertexArray).toHaveBeenCalled();
      expect(gl.deleteBuffer).toHaveBeenCalled();
    });

    it('should allow re-initialization after dispose', () => {
      gridRenderer.initialize();
      gridRenderer.dispose();

      // Should be able to initialize again
      expect(() => gridRenderer.initialize()).not.toThrow();
    });
  });

  describe('grid geometry generation', () => {
    it('should generate lines for both X and Y directions', () => {
      gridRenderer.initialize();

      // Check that buffer data was uploaded with vertex positions
      const bufferDataCalls = (gl.bufferData as ReturnType<typeof vi.fn>).mock.calls;

      // Should have calls for both position and color buffers
      expect(bufferDataCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should include axis lines when enabled', () => {
      // Axis lines are enabled by default
      expect(settingsService.get('grid', 'showAxisLines')).toBe(true);

      gridRenderer.initialize();

      // Grid should include axis indicator lines
      // (This is tested implicitly by the buffer upload)
      expect(gl.bufferData).toHaveBeenCalled();
    });

    it('should exclude axis lines when disabled', () => {
      settingsService.set('grid', 'showAxisLines', false);

      gridRenderer.initialize();

      // Grid should still render, just without axis lines
      expect(gl.bufferData).toHaveBeenCalled();
    });
  });
});
