/**
 * ShaderCompilationService Tests
 *
 * Tests for shader compilation and validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShaderCompilationService } from '../../../src/core/assets/ShaderCompilationService';
import { BUILT_IN_PBR_SHADER, BUILT_IN_UNLIT_SHADER } from '../../../src/core/assets/BuiltInShaders';
import { createMockGL } from '../../helpers/webgl-mock';

describe('ShaderCompilationService', () => {
  let gl: WebGL2RenderingContext;
  let service: ShaderCompilationService;

  beforeEach(() => {
    gl = createMockGL();
    service = new ShaderCompilationService(gl);
  });

  describe('compile', () => {
    it('should successfully compile valid shader asset', () => {
      const result = service.compile(BUILT_IN_UNLIT_SHADER);

      expect(result.success).toBe(true);
      expect(result.program).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should create vertex shader with correct source', () => {
      service.compile(BUILT_IN_UNLIT_SHADER);

      expect(gl.createShader).toHaveBeenCalledWith(gl.VERTEX_SHADER);
      expect(gl.shaderSource).toHaveBeenCalledWith(
        expect.anything(),
        BUILT_IN_UNLIT_SHADER.vertexSource
      );
    });

    it('should create fragment shader with correct source', () => {
      service.compile(BUILT_IN_UNLIT_SHADER);

      expect(gl.createShader).toHaveBeenCalledWith(gl.FRAGMENT_SHADER);
      expect(gl.shaderSource).toHaveBeenCalledWith(
        expect.anything(),
        BUILT_IN_UNLIT_SHADER.fragmentSource
      );
    });

    it('should link the program', () => {
      service.compile(BUILT_IN_UNLIT_SHADER);

      expect(gl.createProgram).toHaveBeenCalled();
      expect(gl.attachShader).toHaveBeenCalledTimes(2);
      expect(gl.linkProgram).toHaveBeenCalled();
    });

    it('should delete shaders after linking', () => {
      service.compile(BUILT_IN_UNLIT_SHADER);

      expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    });

    it('should return errors on vertex shader compilation failure', () => {
      vi.mocked(gl.getShaderParameter).mockImplementation((_shader, pname) => {
        if (pname === gl.COMPILE_STATUS) {
          // First call is for vertex shader - make it fail
          return vi.mocked(gl.getShaderParameter).mock.calls.length > 1;
        }
        return true;
      });
      vi.mocked(gl.getShaderInfoLog).mockReturnValue('ERROR: 0:10: syntax error');

      const result = service.compile(BUILT_IN_UNLIT_SHADER);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].type).toBe('vertex');
    });

    it('should return errors on fragment shader compilation failure', () => {
      let callCount = 0;
      vi.mocked(gl.getShaderParameter).mockImplementation((_shader, pname) => {
        if (pname === gl.COMPILE_STATUS) {
          callCount++;
          // First call succeeds (vertex), second fails (fragment)
          return callCount !== 2;
        }
        return true;
      });
      vi.mocked(gl.getShaderInfoLog).mockReturnValue('ERROR: 0:5: undeclared identifier');

      const result = service.compile(BUILT_IN_UNLIT_SHADER);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].type).toBe('fragment');
    });

    it('should return errors on link failure', () => {
      vi.mocked(gl.getProgramParameter).mockReturnValue(false);
      vi.mocked(gl.getProgramInfoLog).mockReturnValue('Link error: varying mismatch');

      const result = service.compile(BUILT_IN_UNLIT_SHADER);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].type).toBe('link');
      expect(result.errors![0].message).toContain('varying mismatch');
    });

    it('should handle createShader returning null', () => {
      vi.mocked(gl.createShader).mockReturnValue(null);

      const result = service.compile(BUILT_IN_UNLIT_SHADER);

      expect(result.success).toBe(false);
      expect(result.errors![0].message).toContain('Failed to create vertex shader');
    });

    it('should handle createProgram returning null', () => {
      vi.mocked(gl.createProgram).mockReturnValue(null as unknown as WebGLProgram);

      const result = service.compile(BUILT_IN_UNLIT_SHADER);

      expect(result.success).toBe(false);
      expect(result.errors![0].message).toContain('Failed to create program');
    });
  });

  describe('compileFromSources', () => {
    const validVertex = '#version 300 es\nvoid main() { gl_Position = vec4(0.0); }';
    const validFragment = '#version 300 es\nout vec4 color;\nvoid main() { color = vec4(1.0); }';

    it('should compile from raw sources', () => {
      const result = service.compileFromSources(validVertex, validFragment);

      expect(result.success).toBe(true);
      expect(result.program).toBeDefined();
    });

    it('should pass sources to shader objects', () => {
      service.compileFromSources(validVertex, validFragment);

      expect(gl.shaderSource).toHaveBeenCalledWith(expect.anything(), validVertex);
      expect(gl.shaderSource).toHaveBeenCalledWith(expect.anything(), validFragment);
    });
  });

  describe('validate', () => {
    it('should return success for valid shader', () => {
      const result = service.validate(BUILT_IN_UNLIT_SHADER);

      expect(result.success).toBe(true);
    });

    it('should delete program after successful validation', () => {
      service.validate(BUILT_IN_UNLIT_SHADER);

      expect(gl.deleteProgram).toHaveBeenCalled();
    });

    it('should not include program in successful validation result', () => {
      const result = service.validate(BUILT_IN_UNLIT_SHADER);

      expect(result.program).toBeUndefined();
    });

    it('should return errors for invalid shader', () => {
      vi.mocked(gl.getShaderParameter).mockReturnValue(false);
      vi.mocked(gl.getShaderInfoLog).mockReturnValue('ERROR: syntax error');

      const result = service.validate(BUILT_IN_UNLIT_SHADER);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateSources', () => {
    const validVertex = '#version 300 es\nvoid main() { gl_Position = vec4(0.0); }';
    const validFragment = '#version 300 es\nout vec4 color;\nvoid main() { color = vec4(1.0); }';

    it('should validate source strings', () => {
      const result = service.validateSources(validVertex, validFragment);

      expect(result.success).toBe(true);
    });

    it('should delete program after validation', () => {
      service.validateSources(validVertex, validFragment);

      expect(gl.deleteProgram).toHaveBeenCalled();
    });
  });

  describe('error parsing', () => {
    it('should parse standard error format with line number', () => {
      vi.mocked(gl.getShaderParameter).mockReturnValue(false);
      vi.mocked(gl.getShaderInfoLog).mockReturnValue('ERROR: 0:42: undeclared identifier foo');

      const result = service.compile(BUILT_IN_UNLIT_SHADER);

      expect(result.errors![0].line).toBe(42);
      expect(result.errors![0].message).toContain('undeclared identifier');
    });

    it('should parse multiple errors', () => {
      vi.mocked(gl.getShaderParameter).mockReturnValue(false);
      vi.mocked(gl.getShaderInfoLog).mockReturnValue(
        'ERROR: 0:10: first error\nERROR: 0:20: second error'
      );

      const result = service.compile(BUILT_IN_UNLIT_SHADER);

      expect(result.errors).toHaveLength(2);
      expect(result.errors![0].line).toBe(10);
      expect(result.errors![1].line).toBe(20);
    });

    it('should handle error log without line numbers', () => {
      vi.mocked(gl.getShaderParameter).mockReturnValue(false);
      vi.mocked(gl.getShaderInfoLog).mockReturnValue('Generic shader error');

      const result = service.compile(BUILT_IN_UNLIT_SHADER);

      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toContain('Generic shader error');
    });

    it('should include source snippet when line number is available', () => {
      vi.mocked(gl.getShaderParameter).mockReturnValue(false);
      vi.mocked(gl.getShaderInfoLog).mockReturnValue('ERROR: 0:1: error on first line');

      const result = service.compile(BUILT_IN_UNLIT_SHADER);

      expect(result.errors![0].sourceSnippet).toBeDefined();
    });
  });

  describe('getUniformLocations', () => {
    it('should return locations for all declared uniforms', () => {
      const mockProgram = {} as WebGLProgram;
      const mockLocation = {} as WebGLUniformLocation;
      vi.mocked(gl.getUniformLocation).mockReturnValue(mockLocation);

      const locations = service.getUniformLocations(mockProgram, BUILT_IN_PBR_SHADER);

      expect(locations.size).toBe(BUILT_IN_PBR_SHADER.uniforms.length);
    });

    it('should query each uniform by name', () => {
      const mockProgram = {} as WebGLProgram;

      service.getUniformLocations(mockProgram, BUILT_IN_PBR_SHADER);

      for (const uniform of BUILT_IN_PBR_SHADER.uniforms) {
        expect(gl.getUniformLocation).toHaveBeenCalledWith(mockProgram, uniform.name);
      }
    });

    it('should handle null uniform locations', () => {
      const mockProgram = {} as WebGLProgram;
      vi.mocked(gl.getUniformLocation).mockReturnValue(null);

      const locations = service.getUniformLocations(mockProgram, BUILT_IN_UNLIT_SHADER);

      expect(locations.get('uColor')).toBeNull();
    });
  });

  describe('deleteProgram', () => {
    it('should call gl.deleteProgram', () => {
      const mockProgram = {} as WebGLProgram;

      service.deleteProgram(mockProgram);

      expect(gl.deleteProgram).toHaveBeenCalledWith(mockProgram);
    });
  });

  describe('built-in shaders', () => {
    it('should successfully compile PBR shader', () => {
      const result = service.compile(BUILT_IN_PBR_SHADER);

      expect(result.success).toBe(true);
    });

    it('should successfully compile Unlit shader', () => {
      const result = service.compile(BUILT_IN_UNLIT_SHADER);

      expect(result.success).toBe(true);
    });
  });
});
