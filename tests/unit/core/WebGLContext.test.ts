/**
 * WebGLContext Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  WebGLContext,
  ShaderCompilationError,
  ProgramLinkError,
} from '@core/WebGLContext';
import { createMockCanvas, createMockCanvasNoWebGL, createMockGL } from '../../helpers/webgl-mock';

describe('WebGLContext', () => {
  describe('constructor', () => {
    it('should create context from canvas', () => {
      const canvas = createMockCanvas();
      const context = new WebGLContext(canvas);

      expect(context).toBeInstanceOf(WebGLContext);
      expect(context.getGL()).toBeDefined();
    });

    it('should throw when WebGL2 is not supported', () => {
      const canvas = createMockCanvasNoWebGL();

      expect(() => new WebGLContext(canvas)).toThrow('WebGL2 is not supported');
    });

    it('should setup default GL state', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);

      new WebGLContext(canvas);

      expect(mockGL.enable).toHaveBeenCalledWith(mockGL.DEPTH_TEST);
      expect(mockGL.enable).toHaveBeenCalledWith(mockGL.CULL_FACE);
      expect(mockGL.clearColor).toHaveBeenCalled();
    });
  });

  describe('getGL()', () => {
    it('should return the WebGL2 context', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);

      expect(context.getGL()).toBe(mockGL);
    });
  });

  describe('getCanvas()', () => {
    it('should return the canvas element', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);

      expect(context.getCanvas()).toBe(mockGL.canvas);
    });
  });

  describe('compileShader()', () => {
    it('should compile valid shader', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);

      const shader = context.compileShader('void main() {}', mockGL.VERTEX_SHADER);

      expect(mockGL.createShader).toHaveBeenCalledWith(mockGL.VERTEX_SHADER);
      expect(mockGL.shaderSource).toHaveBeenCalled();
      expect(mockGL.compileShader).toHaveBeenCalled();
      expect(shader).toBeDefined();
    });

    it('should throw ShaderCompilationError on failure', () => {
      const mockGL = createMockGL();
      vi.mocked(mockGL.getShaderParameter).mockReturnValue(false);
      vi.mocked(mockGL.getShaderInfoLog).mockReturnValue('Syntax error');

      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);

      expect(() =>
        context.compileShader('invalid', mockGL.VERTEX_SHADER)
      ).toThrow(ShaderCompilationError);

      expect(mockGL.deleteShader).toHaveBeenCalled();
    });
  });

  describe('createProgram()', () => {
    it('should create and link program', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);

      const program = context.createProgram(
        'void main() { gl_Position = vec4(0); }',
        'void main() { gl_FragColor = vec4(1); }'
      );

      expect(mockGL.createProgram).toHaveBeenCalled();
      expect(mockGL.attachShader).toHaveBeenCalledTimes(2);
      expect(mockGL.linkProgram).toHaveBeenCalled();
      expect(mockGL.deleteShader).toHaveBeenCalledTimes(2);
      expect(program).toBeDefined();
    });

    it('should throw ProgramLinkError on link failure', () => {
      const mockGL = createMockGL();
      vi.mocked(mockGL.getProgramParameter).mockReturnValue(false);
      vi.mocked(mockGL.getProgramInfoLog).mockReturnValue('Link error');

      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);

      expect(() =>
        context.createProgram('vert', 'frag')
      ).toThrow(ProgramLinkError);

      expect(mockGL.deleteProgram).toHaveBeenCalled();
    });
  });

  describe('useProgram()', () => {
    it('should use program', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);
      const program = {} as WebGLProgram;

      context.useProgram(program);

      expect(mockGL.useProgram).toHaveBeenCalledWith(program);
    });

    it('should not call useProgram if same program', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);
      const program = {} as WebGLProgram;

      context.useProgram(program);
      context.useProgram(program);

      expect(mockGL.useProgram).toHaveBeenCalledTimes(1);
    });
  });

  describe('bindVAO()', () => {
    it('should bind VAO', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);
      const vao = {} as WebGLVertexArrayObject;

      context.bindVAO(vao);

      expect(mockGL.bindVertexArray).toHaveBeenCalledWith(vao);
    });

    it('should not call bindVertexArray if same VAO', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);
      const vao = {} as WebGLVertexArrayObject;

      context.bindVAO(vao);
      context.bindVAO(vao);

      expect(mockGL.bindVertexArray).toHaveBeenCalledTimes(1);
    });
  });

  describe('createVAO()', () => {
    it('should create VAO', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);

      const vao = context.createVAO();

      expect(mockGL.createVertexArray).toHaveBeenCalled();
      expect(vao).toBeDefined();
    });
  });

  describe('createBuffer()', () => {
    it('should create buffer', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);

      const buffer = context.createBuffer();

      expect(mockGL.createBuffer).toHaveBeenCalled();
      expect(buffer).toBeDefined();
    });
  });

  describe('resize()', () => {
    it('should resize viewport', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);

      context.resize(1024, 768);

      expect(mockGL.viewport).toHaveBeenCalledWith(0, 0, 1024, 768);
    });
  });

  describe('clear()', () => {
    it('should clear buffers', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);

      context.clear();

      expect(mockGL.clear).toHaveBeenCalledWith(
        mockGL.COLOR_BUFFER_BIT | mockGL.DEPTH_BUFFER_BIT
      );
    });

    it('should set clear color if provided', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);

      context.clear([0.5, 0.5, 0.5, 1.0]);

      expect(mockGL.clearColor).toHaveBeenCalledWith(0.5, 0.5, 0.5, 1.0);
    });
  });

  describe('getDrawingBufferSize()', () => {
    it('should return buffer dimensions', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);

      const size = context.getDrawingBufferSize();

      expect(size.width).toBe(800);
      expect(size.height).toBe(600);
    });
  });

  describe('getError() / hasError()', () => {
    it('should return GL error', () => {
      const mockGL = createMockGL();
      const canvas = createMockCanvas(mockGL);
      const context = new WebGLContext(canvas);

      expect(context.getError()).toBe(0);
      expect(context.hasError()).toBe(false);
    });
  });
});
