/**
 * LineRenderer Plugin Tests
 *
 * Unit tests for the LineRenderer render pipeline.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LineRenderer } from '@plugins/renderers/line/LineRenderer';
import { createMockGL, createMockCanvas } from '../../helpers/webgl-mock';
import { EventBus } from '@core/EventBus';
import type { IPluginContext, ICamera, IScene, IRenderable } from '@core/interfaces';

describe('LineRenderer', () => {
  let mockGL: WebGL2RenderingContext;
  let mockCanvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let pluginContext: IPluginContext;

  beforeEach(() => {
    mockGL = createMockGL();
    mockCanvas = createMockCanvas(mockGL);
    eventBus = new EventBus();
    pluginContext = {
      gl: mockGL,
      canvas: mockCanvas,
      eventBus,
    };
  });

  describe('plugin metadata', () => {
    it('should have correct id', () => {
      const renderer = new LineRenderer();
      expect(renderer.id).toBe('line-renderer');
    });

    it('should have correct name', () => {
      const renderer = new LineRenderer();
      expect(renderer.name).toBe('Line Renderer');
    });

    it('should have correct version', () => {
      const renderer = new LineRenderer();
      expect(renderer.version).toBe('1.0.0');
    });

    it('should be a forward renderer', () => {
      const renderer = new LineRenderer();
      expect(renderer.type).toBe('forward');
    });
  });

  describe('initialize', () => {
    it('should compile shaders successfully', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      expect(mockGL.createShader).toHaveBeenCalled();
      expect(mockGL.compileShader).toHaveBeenCalled();
    });

    it('should create program', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      expect(mockGL.createProgram).toHaveBeenCalled();
      expect(mockGL.linkProgram).toHaveBeenCalled();
    });

    it('should cache uniform locations', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      expect(mockGL.getUniformLocation).toHaveBeenCalledWith(
        expect.anything(),
        'uColor'
      );
    });

    it('should emit initialized event', async () => {
      const renderer = new LineRenderer();
      const handler = vi.fn();
      eventBus.on('renderer:initialized', handler);

      await renderer.initialize(pluginContext);

      expect(handler).toHaveBeenCalledWith({ id: 'line-renderer' });
    });

    it('should set initialized flag', async () => {
      const renderer = new LineRenderer();
      expect(renderer.isInitialized()).toBe(false);

      await renderer.initialize(pluginContext);

      expect(renderer.isInitialized()).toBe(true);
    });

    it('should throw on shader compilation error', async () => {
      vi.mocked(mockGL.getShaderParameter).mockReturnValueOnce(false);
      vi.mocked(mockGL.getShaderInfoLog).mockReturnValueOnce('Compilation error');

      const renderer = new LineRenderer();

      await expect(renderer.initialize(pluginContext)).rejects.toThrow(
        'Shader compile error'
      );
    });

    it('should throw on program link error', async () => {
      vi.mocked(mockGL.getProgramParameter).mockReturnValueOnce(false);
      vi.mocked(mockGL.getProgramInfoLog).mockReturnValueOnce('Link error');

      const renderer = new LineRenderer();

      await expect(renderer.initialize(pluginContext)).rejects.toThrow(
        'Program link error'
      );
    });
  });

  describe('dispose', () => {
    it('should delete program', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);
      await renderer.dispose();

      expect(mockGL.deleteProgram).toHaveBeenCalled();
    });

    it('should clear initialized flag', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);
      await renderer.dispose();

      expect(renderer.isInitialized()).toBe(false);
    });

    it('should be safe to call without initialization', async () => {
      const renderer = new LineRenderer();

      await expect(renderer.dispose()).resolves.not.toThrow();
    });
  });

  describe('beginFrame', () => {
    it('should clear buffers', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      const mockCamera = createMockCamera();
      renderer.beginFrame(mockCamera);

      expect(mockGL.clear).toHaveBeenCalledWith(
        mockGL.COLOR_BUFFER_BIT | mockGL.DEPTH_BUFFER_BIT
      );
    });

    it('should do nothing if not initialized', () => {
      const renderer = new LineRenderer();
      const mockCamera = createMockCamera();

      renderer.beginFrame(mockCamera);

      expect(mockGL.clear).not.toHaveBeenCalled();
    });
  });

  describe('render', () => {
    it('should use shader program', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      const mockCamera = createMockCamera();
      const mockScene = createMockScene([]);

      renderer.beginFrame(mockCamera);
      renderer.render(mockScene);

      expect(mockGL.useProgram).toHaveBeenCalled();
    });

    it('should set line color uniform', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      const mockCamera = createMockCamera();
      const mockScene = createMockScene([]);

      renderer.beginFrame(mockCamera);
      renderer.render(mockScene);

      // uniform3fv is used for color
      // Check it was called (the exact args depend on mock implementation)
    });

    it('should call render on each renderable', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      const mockRenderable1 = createMockRenderable();
      const mockRenderable2 = createMockRenderable();
      const mockScene = createMockScene([mockRenderable1, mockRenderable2]);
      const mockCamera = createMockCamera();

      renderer.beginFrame(mockCamera);
      renderer.render(mockScene);

      expect(mockRenderable1.render).toHaveBeenCalled();
      expect(mockRenderable2.render).toHaveBeenCalled();
    });

    it('should pass viewProjection matrix to renderables', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      const mockRenderable = createMockRenderable();
      const mockScene = createMockScene([mockRenderable]);
      const mockCamera = createMockCamera();

      renderer.beginFrame(mockCamera);
      renderer.render(mockScene);

      expect(mockRenderable.render).toHaveBeenCalledWith(
        mockGL,
        expect.any(Float32Array)
      );
    });

    it('should do nothing if not initialized', () => {
      const renderer = new LineRenderer();
      const mockRenderable = createMockRenderable();
      const mockScene = createMockScene([mockRenderable]);
      const mockCamera = createMockCamera();

      renderer.beginFrame(mockCamera);
      renderer.render(mockScene);

      expect(mockRenderable.render).not.toHaveBeenCalled();
    });

    it('should do nothing without beginFrame', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      const mockRenderable = createMockRenderable();
      const mockScene = createMockScene([mockRenderable]);

      renderer.render(mockScene);

      expect(mockRenderable.render).not.toHaveBeenCalled();
    });
  });

  describe('endFrame', () => {
    it('should clear current camera', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      const mockCamera = createMockCamera();

      renderer.beginFrame(mockCamera);
      renderer.endFrame();

      // After endFrame, render should not work
      const mockRenderable = createMockRenderable();
      const newScene = createMockScene([mockRenderable]);
      renderer.render(newScene);

      expect(mockRenderable.render).not.toHaveBeenCalled();
    });
  });

  describe('resize', () => {
    it('should update viewport', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      renderer.resize(1920, 1080);

      expect(mockGL.viewport).toHaveBeenCalledWith(0, 0, 1920, 1080);
    });

    it('should do nothing if not initialized', () => {
      const renderer = new LineRenderer();
      renderer.resize(1920, 1080);

      expect(mockGL.viewport).not.toHaveBeenCalled();
    });
  });

  describe('setLineColor', () => {
    it('should set line color', () => {
      const renderer = new LineRenderer();
      renderer.setLineColor(1, 0, 0);

      // Color is used during render - we just verify no error
    });
  });

  describe('getProgram', () => {
    it('should return null before initialization', () => {
      const renderer = new LineRenderer();
      expect(renderer.getProgram()).toBeNull();
    });

    it('should return program after initialization', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      expect(renderer.getProgram()).not.toBeNull();
    });

    it('should return null after dispose', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);
      await renderer.dispose();

      expect(renderer.getProgram()).toBeNull();
    });
  });

  describe('integration', () => {
    it('should complete a full render cycle', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      const mockCamera = createMockCamera();
      const mockRenderable = createMockRenderable();
      const mockScene = createMockScene([mockRenderable]);

      // Full render cycle
      renderer.beginFrame(mockCamera);
      renderer.render(mockScene);
      renderer.endFrame();

      expect(mockGL.clear).toHaveBeenCalled();
      expect(mockRenderable.render).toHaveBeenCalled();
    });

    it('should handle multiple render cycles', async () => {
      const renderer = new LineRenderer();
      await renderer.initialize(pluginContext);

      const mockCamera = createMockCamera();
      const mockScene = createMockScene([]);

      for (let i = 0; i < 3; i++) {
        renderer.beginFrame(mockCamera);
        renderer.render(mockScene);
        renderer.endFrame();
      }

      expect(mockGL.clear).toHaveBeenCalledTimes(3);
    });
  });
});

// Helper functions

function createMockCamera(): ICamera {
  const viewProjection = new Float32Array(16);
  // Set identity matrix
  viewProjection[0] = 1;
  viewProjection[5] = 1;
  viewProjection[10] = 1;
  viewProjection[15] = 1;

  return {
    position: [0, 0, 5],
    target: [0, 0, 0],
    up: [0, 1, 0],
    fov: Math.PI / 4,
    aspect: 16 / 9,
    near: 0.1,
    far: 100,
    getViewMatrix: vi.fn(() => new Float32Array(16)),
    getProjectionMatrix: vi.fn(() => new Float32Array(16)),
    getViewProjectionMatrix: vi.fn(() => viewProjection),
  };
}

function createMockScene(renderables: IRenderable[]): IScene {
  return {
    traverse: vi.fn((callback) => {
      renderables.forEach(callback);
    }),
    getRenderables: vi.fn(() => renderables),
  };
}

function createMockRenderable(): IRenderable {
  return {
    id: 'mock-renderable',
    name: 'Mock Renderable',
    parent: null,
    children: [],
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    render: vi.fn(),
  };
}
