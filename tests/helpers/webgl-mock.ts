/**
 * WebGL Mock Utilities
 *
 * Provides mock WebGL2 context for testing.
 */

import { vi } from 'vitest';

/**
 * Create a mock WebGL2RenderingContext.
 *
 * @returns A mock WebGL2 context with all necessary methods stubbed
 */
export function createMockGL(): WebGL2RenderingContext {
  const mockShader = {} as WebGLShader;
  const mockProgram = {} as WebGLProgram;
  const mockBuffer = {} as WebGLBuffer;
  const mockVAO = {} as WebGLVertexArrayObject;

  return {
    canvas: document.createElement('canvas'),
    drawingBufferWidth: 800,
    drawingBufferHeight: 600,

    // Constants
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    DEPTH_TEST: 2929,
    CULL_FACE: 2884,
    BACK: 1029,
    CCW: 2305,
    LEQUAL: 515,
    COLOR_BUFFER_BIT: 16384,
    DEPTH_BUFFER_BIT: 256,
    NO_ERROR: 0,
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    FLOAT: 5126,

    // Shader methods
    createShader: vi.fn(() => mockShader),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),

    // Program methods
    createProgram: vi.fn(() => mockProgram),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    useProgram: vi.fn(),
    deleteProgram: vi.fn(),
    getUniformLocation: vi.fn(() => ({} as WebGLUniformLocation)),
    getAttribLocation: vi.fn(() => 0),

    // Buffer methods
    createBuffer: vi.fn(() => mockBuffer),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(),

    // VAO methods
    createVertexArray: vi.fn(() => mockVAO),
    bindVertexArray: vi.fn(),
    deleteVertexArray: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),

    // State methods
    enable: vi.fn(),
    disable: vi.fn(),
    depthFunc: vi.fn(),
    cullFace: vi.fn(),
    frontFace: vi.fn(),
    clearColor: vi.fn(),
    clearDepth: vi.fn(),
    clear: vi.fn(),
    viewport: vi.fn(),
    getError: vi.fn(() => 0),

    // Uniform methods
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform4f: vi.fn(),
    uniform1i: vi.fn(),
    uniformMatrix4fv: vi.fn(),

    // Draw methods
    drawArrays: vi.fn(),
    drawElements: vi.fn(),
  } as unknown as WebGL2RenderingContext;
}

/**
 * Create a mock canvas with WebGL2 support.
 *
 * @param mockGL - Optional pre-configured mock GL context
 * @returns A canvas element that returns the mock GL context
 */
export function createMockCanvas(mockGL?: WebGL2RenderingContext): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const gl = mockGL ?? createMockGL();

  const originalGetContext = canvas.getContext.bind(canvas);
  canvas.getContext = ((contextId: string) => {
    if (contextId === 'webgl2') {
      return gl;
    }
    return originalGetContext(contextId);
  }) as typeof canvas.getContext;

  return canvas;
}

/**
 * Create a mock canvas that returns null for WebGL2 (no support).
 *
 * @returns A canvas element that returns null for WebGL2
 */
export function createMockCanvasNoWebGL(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');

  canvas.getContext = (() => null) as typeof canvas.getContext;

  return canvas;
}
