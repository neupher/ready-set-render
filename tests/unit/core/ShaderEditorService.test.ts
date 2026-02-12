/**
 * ShaderEditorService Tests
 *
 * Tests for the live shader editing lifecycle manager.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ShaderEditorService } from '../../../src/core/ShaderEditorService';
import { EventBus } from '../../../src/core/EventBus';
import { AssetRegistry } from '../../../src/core/assets/AssetRegistry';
import { BUILT_IN_SHADERS } from '../../../src/core/assets/BuiltInShaders';
import type { IShaderAsset } from '../../../src/core/assets/interfaces/IShaderAsset';
import { createMockGL } from '../../helpers/webgl-mock';

describe('ShaderEditorService', () => {
  let gl: WebGL2RenderingContext;
  let eventBus: EventBus;
  let assetRegistry: AssetRegistry;
  let service: ShaderEditorService;

  /** A minimal valid custom shader for testing */
  const createTestShader = (overrides: Partial<IShaderAsset> = {}): IShaderAsset => ({
    uuid: 'test-shader-uuid',
    name: 'Test Shader',
    type: 'shader',
    version: 1,
    created: '2026-01-01T00:00:00Z',
    modified: '2026-01-01T00:00:00Z',
    isBuiltIn: false,
    vertexSource: '#version 300 es\nvoid main() { gl_Position = vec4(0.0); }',
    fragmentSource: '#version 300 es\nprecision mediump float;\nout vec4 color;\nvoid main() { color = vec4(1.0); }',
    uniforms: [
      { name: 'uColor', type: 'vec3', displayName: 'Color', defaultValue: [1, 1, 1] },
    ],
    ...overrides,
  });

  beforeEach(() => {
    gl = createMockGL();
    eventBus = new EventBus();
    assetRegistry = new AssetRegistry(eventBus);
    service = new ShaderEditorService({ gl, eventBus, assetRegistry });
  });

  afterEach(() => {
    service.dispose();
  });

  describe('constructor', () => {
    it('should initialize with idle status', () => {
      expect(service.status).toBe('idle');
    });

    it('should initialize with no active shader', () => {
      expect(service.activeShader).toBeNull();
    });

    it('should initialize with no errors', () => {
      expect(service.errors).toHaveLength(0);
    });

    it('should initialize as not dirty', () => {
      expect(service.isDirty).toBe(false);
    });
  });

  describe('openShader', () => {
    it('should open a registered shader asset', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);

      const result = service.openShader(shader.uuid);

      expect(result).toBe(true);
      expect(service.activeShader).toBe(shader.uuid);
    });

    it('should load vertex and fragment sources into working buffers', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);

      service.openShader(shader.uuid);

      expect(service.vertexSource).toBe(shader.vertexSource);
      expect(service.fragmentSource).toBe(shader.fragmentSource);
    });

    it('should compile immediately on open', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);

      service.openShader(shader.uuid);

      expect(service.hasCachedProgram(shader.uuid)).toBe(true);
    });

    it('should emit shader:editing event', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);

      const handler = vi.fn();
      eventBus.on('shader:editing', handler);

      service.openShader(shader.uuid);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          shaderUUID: shader.uuid,
          shader,
        }),
      );
    });

    it('should return false for non-existent shader', () => {
      const result = service.openShader('non-existent-uuid');

      expect(result).toBe(false);
      expect(service.activeShader).toBeNull();
    });

    it('should close previously open shader before opening new one', () => {
      const shader1 = createTestShader({ uuid: 'shader-1', name: 'Shader 1' });
      const shader2 = createTestShader({ uuid: 'shader-2', name: 'Shader 2' });
      assetRegistry.register(shader1);
      assetRegistry.register(shader2);

      service.openShader(shader1.uuid);
      expect(service.activeShader).toBe(shader1.uuid);

      service.openShader(shader2.uuid);
      expect(service.activeShader).toBe(shader2.uuid);
    });

    it('should reset dirty state when opening', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);

      service.openShader(shader.uuid);
      service.updateSource('fragment', 'modified code');
      expect(service.isDirty).toBe(true);

      // Re-open clears dirty state
      service.openShader(shader.uuid);
      expect(service.isDirty).toBe(false);
    });
  });

  describe('closeShader', () => {
    it('should clear the active shader', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);

      service.openShader(shader.uuid);
      service.closeShader();

      expect(service.activeShader).toBeNull();
    });

    it('should clear working sources', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);

      service.openShader(shader.uuid);
      service.closeShader();

      expect(service.vertexSource).toBe('');
      expect(service.fragmentSource).toBe('');
    });

    it('should emit shader:closed event', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);

      const handler = vi.fn();
      eventBus.on('shader:closed', handler);

      service.openShader(shader.uuid);
      service.closeShader();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ shaderUUID: shader.uuid }),
      );
    });

    it('should preserve cached program after close', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);

      service.openShader(shader.uuid);
      service.closeShader();

      expect(service.hasCachedProgram(shader.uuid)).toBe(true);
    });

    it('should reset status to idle', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);

      service.openShader(shader.uuid);
      service.closeShader();

      expect(service.status).toBe('idle');
    });
  });

  describe('updateSource', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should update the working vertex source', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      const newVertex = '#version 300 es\nvoid main() { gl_Position = vec4(1.0); }';
      service.updateSource('vertex', newVertex);

      expect(service.vertexSource).toBe(newVertex);
    });

    it('should update the working fragment source', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      const newFragment = '#version 300 es\nprecision mediump float;\nout vec4 c;\nvoid main() { c = vec4(0.5); }';
      service.updateSource('fragment', newFragment);

      expect(service.fragmentSource).toBe(newFragment);
    });

    it('should mark the service as dirty', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      service.updateSource('vertex', 'modified');

      expect(service.isDirty).toBe(true);
    });

    it('should set status to compiling', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      service.updateSource('fragment', 'modified');

      expect(service.status).toBe('compiling');
    });

    it('should trigger debounced compilation after 300ms', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      const handler = vi.fn();
      eventBus.on('shader:compilationResult', handler);
      // Reset handler count (openShader triggers initial compile)
      handler.mockClear();

      service.updateSource('fragment', 'new code');

      // Not yet compiled
      expect(handler).not.toHaveBeenCalled();

      // Advance past debounce
      vi.advanceTimersByTime(300);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should debounce rapid updates', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      const handler = vi.fn();
      eventBus.on('shader:compilationResult', handler);
      handler.mockClear();

      // Rapid updates
      service.updateSource('fragment', 'code1');
      vi.advanceTimersByTime(100);
      service.updateSource('fragment', 'code2');
      vi.advanceTimersByTime(100);
      service.updateSource('fragment', 'code3');
      vi.advanceTimersByTime(300);

      // Only one compilation should fire (for the last update)
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should warn when no shader is open', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.updateSource('vertex', 'code');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No shader is currently open'),
      );

      warnSpy.mockRestore();
    });
  });

  describe('saveShader', () => {
    it('should save working sources back to the asset', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      const newVertex = 'new vertex source';
      const newFragment = 'new fragment source';
      service.updateSource('vertex', newVertex);
      service.updateSource('fragment', newFragment);

      const result = service.saveShader();

      expect(result).toBe(true);
      const saved = assetRegistry.get<IShaderAsset>(shader.uuid);
      expect(saved!.vertexSource).toBe(newVertex);
      expect(saved!.fragmentSource).toBe(newFragment);
    });

    it('should clear dirty state after save', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      service.updateSource('vertex', 'modified');
      expect(service.isDirty).toBe(true);

      service.saveShader();

      expect(service.isDirty).toBe(false);
    });

    it('should return false when no shader is open', () => {
      expect(service.saveShader()).toBe(false);
    });

    it('should return false for built-in shaders', () => {
      const builtIn = createTestShader({ uuid: 'builtin-uuid', isBuiltIn: true });
      assetRegistry.register(builtIn);
      service.openShader(builtIn.uuid);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(service.saveShader()).toBe(false);
      warnSpy.mockRestore();
    });
  });

  describe('revertShader', () => {
    it('should restore working sources from the saved asset', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      service.updateSource('vertex', 'modified vertex');
      service.updateSource('fragment', 'modified fragment');

      const result = service.revertShader();

      expect(result).toBe(true);
      expect(service.vertexSource).toBe(shader.vertexSource);
      expect(service.fragmentSource).toBe(shader.fragmentSource);
    });

    it('should clear dirty state after revert', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      service.updateSource('vertex', 'modified');
      service.revertShader();

      expect(service.isDirty).toBe(false);
    });

    it('should return false when no shader is open', () => {
      expect(service.revertShader()).toBe(false);
    });
  });

  describe('compilation', () => {
    it('should set status to success on successful compile', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);

      service.openShader(shader.uuid);

      expect(service.status).toBe('success');
    });

    it('should set status to error on failed compile', () => {
      vi.useFakeTimers();

      // Make compilation fail
      vi.mocked(gl.getShaderParameter).mockReturnValue(false);
      vi.mocked(gl.getShaderInfoLog).mockReturnValue('ERROR: 0:1: syntax error');

      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      expect(service.status).toBe('error');
      expect(service.errors.length).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it('should emit shader:compilationResult event on success', () => {
      const handler = vi.fn();
      eventBus.on('shader:compilationResult', handler);

      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          shaderUUID: shader.uuid,
          result: expect.objectContaining({ success: true }),
        }),
      );
    });

    it('should emit shader:programUpdated event on success', () => {
      const handler = vi.fn();
      eventBus.on('shader:programUpdated', handler);

      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          shaderUUID: shader.uuid,
          program: expect.anything(),
        }),
      );
    });

    it('should keep last working program on compile error (error recovery)', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      // Verify program is cached after successful initial compile
      expect(service.hasCachedProgram(shader.uuid)).toBe(true);

      // Now make compilation fail
      vi.mocked(gl.getShaderParameter).mockReturnValue(false);
      vi.mocked(gl.getShaderInfoLog).mockReturnValue('ERROR: 0:1: error');

      vi.useFakeTimers();
      service.updateSource('fragment', 'broken code');
      vi.advanceTimersByTime(300);
      vi.useRealTimers();

      // Should still have the cached program from the first successful compile
      expect(service.hasCachedProgram(shader.uuid)).toBe(true);
      expect(service.status).toBe('error');
    });
  });

  describe('compileShader', () => {
    it('should compile any registered shader by UUID', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);

      const result = service.compileShader(shader.uuid);

      expect(result.success).toBe(true);
      expect(service.hasCachedProgram(shader.uuid)).toBe(true);
    });

    it('should return error for non-existent shader', () => {
      const result = service.compileShader('non-existent');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('not found');
    });
  });

  describe('compileAllRegistered', () => {
    it('should compile all registered shader assets', () => {
      // Register built-in shaders
      for (const shader of BUILT_IN_SHADERS) {
        assetRegistry.register(shader);
      }

      service.compileAllRegistered();

      for (const shader of BUILT_IN_SHADERS) {
        expect(service.hasCachedProgram(shader.uuid)).toBe(true);
      }
    });
  });

  describe('getCompiledProgram', () => {
    it('should return cached program', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      const program = service.getCompiledProgram(shader.uuid);

      expect(program).not.toBeNull();
    });

    it('should return null for uncached shader', () => {
      expect(service.getCompiledProgram('uncached-uuid')).toBeNull();
    });
  });

  describe('getUniformLocations', () => {
    it('should return cached uniform locations', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      const locations = service.getUniformLocations(shader.uuid);

      expect(locations).not.toBeNull();
      expect(locations!.has('uColor')).toBe(true);
    });

    it('should include common transform uniforms', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      const locations = service.getUniformLocations(shader.uuid);

      expect(locations!.has('uModelMatrix')).toBe(true);
      expect(locations!.has('uViewProjectionMatrix')).toBe(true);
      expect(locations!.has('uNormalMatrix')).toBe(true);
      expect(locations!.has('uCameraPosition')).toBe(true);
    });

    it('should return null for uncached shader', () => {
      expect(service.getUniformLocations('uncached-uuid')).toBeNull();
    });
  });

  describe('evictProgram', () => {
    it('should remove program from cache', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      expect(service.hasCachedProgram(shader.uuid)).toBe(true);

      service.evictProgram(shader.uuid);

      expect(service.hasCachedProgram(shader.uuid)).toBe(false);
    });

    it('should call gl.deleteProgram', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      service.evictProgram(shader.uuid);

      expect(gl.deleteProgram).toHaveBeenCalled();
    });

    it('should be safe to call for non-existent UUID', () => {
      expect(() => service.evictProgram('non-existent')).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('should close active shader', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      service.dispose();

      expect(service.activeShader).toBeNull();
    });

    it('should clear all cached programs', () => {
      const shader = createTestShader();
      assetRegistry.register(shader);
      service.openShader(shader.uuid);

      service.dispose();

      expect(service.hasCachedProgram(shader.uuid)).toBe(false);
    });

    it('should delete all WebGL programs', () => {
      const shader1 = createTestShader({ uuid: 'shader-1', name: 'S1' });
      const shader2 = createTestShader({ uuid: 'shader-2', name: 'S2' });
      assetRegistry.register(shader1);
      assetRegistry.register(shader2);
      service.openShader(shader1.uuid);
      service.closeShader();
      service.openShader(shader2.uuid);

      service.dispose();

      expect(gl.deleteProgram).toHaveBeenCalled();
    });
  });
});
