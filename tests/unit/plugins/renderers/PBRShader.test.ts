/**
 * PBR Shader Tests
 *
 * Unit tests for the PBR (Physically Based Rendering) shader module.
 * Tests shader composition, program creation, and uniform management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PBRShaderProgram,
  PBR_MATERIAL_DEFAULTS,
  PBR_VERTEX_SHADER,
  PBR_FRAGMENT_SHADER,
} from '@plugins/renderers/shaders/pbr';
import { GLSL_MATH, GLSL_BRDF, GLSL_LIGHTING, composeShader } from '@plugins/renderers/shaders/common';
import type { IMaterialComponent } from '@core/interfaces';

/**
 * Create a mock WebGL2 rendering context for testing.
 */
function createMockGL(): WebGL2RenderingContext {
  let shaderId = 0;
  let programId = 0;

  return {
    createShader: vi.fn(() => ({ id: ++shaderId })),
    deleteShader: vi.fn(),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true), // Compilation success
    getShaderInfoLog: vi.fn(() => ''),

    createProgram: vi.fn(() => ({ id: ++programId })),
    deleteProgram: vi.fn(),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true), // Link success
    getProgramInfoLog: vi.fn(() => ''),
    useProgram: vi.fn(),

    getUniformLocation: vi.fn((_program, name) => ({ name })),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform3f: vi.fn(),
    uniform3fv: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniformMatrix4fv: vi.fn(),

    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
    COMPILE_STATUS: 0x8B81,
    LINK_STATUS: 0x8B82,
  } as unknown as WebGL2RenderingContext;
}

/**
 * Create a mock PBR material component.
 */
function createMockMaterial(overrides: Partial<IMaterialComponent> = {}): IMaterialComponent {
  return {
    type: 'material',
    shaderName: 'pbr',
    color: [1.0, 0.5, 0.2],
    metallic: 0.8,
    roughness: 0.3,
    emission: [0.1, 0.0, 0.0],
    emissionStrength: 2.0,
    ...overrides,
  };
}

describe('GLSL Shader Modules', () => {
  describe('GLSL_MATH', () => {
    it('should export PI constant', () => {
      expect(GLSL_MATH).toContain('const float PI = 3.14159265359');
    });

    it('should export saturate function', () => {
      expect(GLSL_MATH).toContain('float saturate(float x)');
      expect(GLSL_MATH).toContain('vec3 saturate(vec3 x)');
    });

    it('should export sqr function', () => {
      expect(GLSL_MATH).toContain('float sqr(float x)');
    });

    it('should export remap function', () => {
      expect(GLSL_MATH).toContain('float remap(float value');
    });
  });

  describe('GLSL_BRDF', () => {
    it('should export GGX distribution function', () => {
      expect(GLSL_BRDF).toContain('float distributionGGX(float NdotH, float roughness)');
    });

    it('should export Smith geometry function', () => {
      expect(GLSL_BRDF).toContain('float geometrySmith(float NdotV, float NdotL, float roughness)');
    });

    it('should export Fresnel-Schlick function', () => {
      expect(GLSL_BRDF).toContain('vec3 fresnelSchlick(float cosTheta, vec3 F0)');
    });

    it('should export F0 calculation function', () => {
      expect(GLSL_BRDF).toContain('vec3 calculateF0(vec3 albedo, float metallic)');
    });

    it('should export Cook-Torrance specular function', () => {
      expect(GLSL_BRDF).toContain('vec3 cookTorranceSpecular(float D, float G, vec3 F');
    });

    it('should export Lambertian diffuse function', () => {
      expect(GLSL_BRDF).toContain('vec3 lambertianDiffuse(vec3 albedo)');
    });
  });

  describe('GLSL_LIGHTING', () => {
    it('should export tone mapping functions', () => {
      expect(GLSL_LIGHTING).toContain('vec3 tonemapReinhard(vec3 color)');
      expect(GLSL_LIGHTING).toContain('vec3 tonemapACES(vec3 color)');
    });

    it('should export gamma correction functions', () => {
      expect(GLSL_LIGHTING).toContain('vec3 linearToSRGB(vec3 color)');
      expect(GLSL_LIGHTING).toContain('vec3 sRGBToLinear(vec3 color)');
    });

    it('should export hemisphere ambient function (Z-up)', () => {
      expect(GLSL_LIGHTING).toContain('vec3 hemisphereAmbient(vec3 normal, vec3 skyColor, vec3 groundColor)');
      expect(GLSL_LIGHTING).toContain('normal.z'); // Z-up convention
    });

    it('should export light attenuation function', () => {
      expect(GLSL_LIGHTING).toContain('float lightAttenuation(float distance, float range)');
    });
  });

  describe('composeShader', () => {
    it('should combine multiple GLSL snippets', () => {
      const snippet1 = '// Snippet 1';
      const snippet2 = '// Snippet 2';
      const result = composeShader(snippet1, snippet2);

      expect(result).toContain(snippet1);
      expect(result).toContain(snippet2);
    });

    it('should join snippets with newlines', () => {
      const result = composeShader('A', 'B', 'C');
      expect(result).toBe('A\nB\nC');
    });
  });
});

describe('PBR Vertex Shader', () => {
  it('should have version 300 es header', () => {
    expect(PBR_VERTEX_SHADER).toContain('#version 300 es');
  });

  it('should declare required attributes', () => {
    expect(PBR_VERTEX_SHADER).toContain('in vec3 aPosition');
    expect(PBR_VERTEX_SHADER).toContain('in vec3 aNormal');
    expect(PBR_VERTEX_SHADER).toContain('in vec2 aTexCoord');
  });

  it('should declare transform uniforms', () => {
    expect(PBR_VERTEX_SHADER).toContain('uniform mat4 uModelMatrix');
    expect(PBR_VERTEX_SHADER).toContain('uniform mat4 uViewProjectionMatrix');
    expect(PBR_VERTEX_SHADER).toContain('uniform mat3 uNormalMatrix');
  });

  it('should output world position and normal', () => {
    expect(PBR_VERTEX_SHADER).toContain('out vec3 vWorldPosition');
    expect(PBR_VERTEX_SHADER).toContain('out vec3 vNormal');
    expect(PBR_VERTEX_SHADER).toContain('out vec2 vTexCoord');
  });

  it('should transform position to world space', () => {
    expect(PBR_VERTEX_SHADER).toContain('uModelMatrix * vec4(aPosition, 1.0)');
  });

  it('should transform normal using normal matrix', () => {
    expect(PBR_VERTEX_SHADER).toContain('uNormalMatrix * aNormal');
  });
});

describe('PBR Fragment Shader', () => {
  it('should have version 300 es header', () => {
    expect(PBR_FRAGMENT_SHADER).toContain('#version 300 es');
  });

  it('should include all common modules via #include directives', () => {
    // In test mode, #include directives are not resolved (raw strings)
    // In production, vite-plugin-glsl resolves them
    expect(PBR_FRAGMENT_SHADER).toContain('#include "../common/math.glsl"');
    expect(PBR_FRAGMENT_SHADER).toContain('#include "../common/brdf.glsl"');
    expect(PBR_FRAGMENT_SHADER).toContain('#include "../common/lighting.glsl"');
  });

  it('should use BRDF functions from included modules', () => {
    // These functions are called but defined in includes
    expect(PBR_FRAGMENT_SHADER).toContain('distributionGGX');
    expect(PBR_FRAGMENT_SHADER).toContain('geometrySmith');
    expect(PBR_FRAGMENT_SHADER).toContain('fresnelSchlick');
    expect(PBR_FRAGMENT_SHADER).toContain('tonemapACES');
    expect(PBR_FRAGMENT_SHADER).toContain('linearToSRGB');
  });

  it('should declare Blender Principled BSDF-style uniforms', () => {
    expect(PBR_FRAGMENT_SHADER).toContain('uniform vec3 uBaseColor');
    expect(PBR_FRAGMENT_SHADER).toContain('uniform float uMetallic');
    expect(PBR_FRAGMENT_SHADER).toContain('uniform float uRoughness');
    expect(PBR_FRAGMENT_SHADER).toContain('uniform vec3 uEmission');
    expect(PBR_FRAGMENT_SHADER).toContain('uniform float uEmissionStrength');
  });

  it('should declare lighting uniforms', () => {
    expect(PBR_FRAGMENT_SHADER).toContain('uniform vec3 uLightDirections[MAX_LIGHTS]');
    expect(PBR_FRAGMENT_SHADER).toContain('uniform vec3 uLightColors[MAX_LIGHTS]');
    expect(PBR_FRAGMENT_SHADER).toContain('uniform int uLightCount');
    expect(PBR_FRAGMENT_SHADER).toContain('uniform vec3 uAmbientColor');
    expect(PBR_FRAGMENT_SHADER).toContain('uniform vec3 uCameraPosition');
  });

  it('should define MAX_LIGHTS constant', () => {
    expect(PBR_FRAGMENT_SHADER).toContain('#define MAX_LIGHTS 8');
  });

  it('should implement Cook-Torrance lighting calculation', () => {
    expect(PBR_FRAGMENT_SHADER).toContain('calculateDirectionalLight');
    expect(PBR_FRAGMENT_SHADER).toContain('cookTorranceSpecular');
    expect(PBR_FRAGMENT_SHADER).toContain('lambertianDiffuse');
  });

  it('should calculate F0 for metallic workflow', () => {
    expect(PBR_FRAGMENT_SHADER).toContain('calculateF0(albedo, metallic)');
  });

  it('should apply energy conservation', () => {
    // kD = (1 - kS) * (1 - metallic)
    expect(PBR_FRAGMENT_SHADER).toContain('(vec3(1.0) - kS) * (1.0 - metallic)');
  });

  it('should apply ACES tone mapping', () => {
    expect(PBR_FRAGMENT_SHADER).toContain('tonemapACES(color)');
  });

  it('should apply gamma correction', () => {
    expect(PBR_FRAGMENT_SHADER).toContain('linearToSRGB(color)');
  });

  it('should output to outColor', () => {
    expect(PBR_FRAGMENT_SHADER).toContain('out vec4 outColor');
    expect(PBR_FRAGMENT_SHADER).toContain('outColor = vec4(color, 1.0)');
  });
});

describe('PBR_MATERIAL_DEFAULTS', () => {
  it('should have correct base color default', () => {
    expect(PBR_MATERIAL_DEFAULTS.baseColor).toEqual([0.8, 0.8, 0.8]);
  });

  it('should have metallic default of 0 (dielectric)', () => {
    expect(PBR_MATERIAL_DEFAULTS.metallic).toBe(0.0);
  });

  it('should have roughness default of 0.5', () => {
    expect(PBR_MATERIAL_DEFAULTS.roughness).toBe(0.5);
  });

  it('should have emission default of black', () => {
    expect(PBR_MATERIAL_DEFAULTS.emission).toEqual([0.0, 0.0, 0.0]);
  });

  it('should have emission strength default of 0', () => {
    expect(PBR_MATERIAL_DEFAULTS.emissionStrength).toBe(0.0);
  });
});

describe('PBRShaderProgram', () => {
  let gl: WebGL2RenderingContext;
  let program: PBRShaderProgram;

  beforeEach(() => {
    gl = createMockGL();
    program = new PBRShaderProgram(gl);
  });

  describe('constructor', () => {
    it('should create program instance', () => {
      expect(program).toBeDefined();
      expect(program.isReady()).toBe(false);
    });
  });

  describe('compile', () => {
    it('should compile and link shader program', () => {
      program.compile();

      expect(gl.createShader).toHaveBeenCalledTimes(2);
      expect(gl.shaderSource).toHaveBeenCalledTimes(2);
      expect(gl.compileShader).toHaveBeenCalledTimes(2);
      expect(gl.createProgram).toHaveBeenCalled();
      expect(gl.attachShader).toHaveBeenCalledTimes(2);
      expect(gl.linkProgram).toHaveBeenCalled();
    });

    it('should delete shaders after linking', () => {
      program.compile();

      expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    });

    it('should cache uniform locations', () => {
      program.compile();

      const uniforms = program.getUniformLocations();
      expect(uniforms).toBeDefined();
      expect(uniforms?.uBaseColor).toBeDefined();
      expect(uniforms?.uMetallic).toBeDefined();
      expect(uniforms?.uRoughness).toBeDefined();
    });

    it('should mark program as ready after compilation', () => {
      program.compile();

      expect(program.isReady()).toBe(true);
    });

    it('should throw on shader compile error', () => {
      (gl.getShaderParameter as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (gl.getShaderInfoLog as ReturnType<typeof vi.fn>).mockReturnValue('Syntax error');

      expect(() => program.compile()).toThrow('PBR shader compile error');
    });

    it('should throw on program link error', () => {
      (gl.getProgramParameter as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (gl.getProgramInfoLog as ReturnType<typeof vi.fn>).mockReturnValue('Link failed');

      expect(() => program.compile()).toThrow('PBR program link error');
    });
  });

  describe('use', () => {
    it('should bind the program', () => {
      program.compile();
      program.use();

      expect(gl.useProgram).toHaveBeenCalledWith(program.getProgram());
    });

    it('should not fail if program not compiled', () => {
      expect(() => program.use()).not.toThrow();
    });
  });

  describe('setMaterialUniforms', () => {
    it('should set all material uniforms from component', () => {
      program.compile();
      const material = createMockMaterial();

      program.setMaterialUniforms(material);

      expect(gl.uniform3fv).toHaveBeenCalledWith(expect.anything(), material.color);
      expect(gl.uniform1f).toHaveBeenCalledWith(expect.anything(), material.metallic);
      expect(gl.uniform1f).toHaveBeenCalledWith(expect.anything(), material.roughness);
      expect(gl.uniform3fv).toHaveBeenCalledWith(expect.anything(), material.emission);
      expect(gl.uniform1f).toHaveBeenCalledWith(expect.anything(), material.emissionStrength);
    });

    it('should use defaults when material is null', () => {
      program.compile();

      program.setMaterialUniforms(null);

      expect(gl.uniform3fv).toHaveBeenCalledWith(
        expect.anything(),
        PBR_MATERIAL_DEFAULTS.baseColor
      );
      expect(gl.uniform1f).toHaveBeenCalledWith(
        expect.anything(),
        PBR_MATERIAL_DEFAULTS.metallic
      );
    });

    it('should use defaults for missing properties', () => {
      program.compile();
      const material = createMockMaterial({
        metallic: undefined,
        roughness: undefined,
      });

      program.setMaterialUniforms(material);

      // Should fall back to defaults for undefined properties
      expect(gl.uniform1f).toHaveBeenCalled();
    });
  });

  describe('setTransformUniforms', () => {
    it('should set all transform matrices', () => {
      program.compile();
      const model = new Float32Array(16);
      const viewProj = new Float32Array(16);
      const normal = new Float32Array(9);

      program.setTransformUniforms(model, viewProj, normal);

      expect(gl.uniformMatrix4fv).toHaveBeenCalledTimes(2);
      expect(gl.uniformMatrix3fv).toHaveBeenCalledTimes(1);
    });
  });

  describe('setCameraPosition', () => {
    it('should set camera position uniform', () => {
      program.compile();

      program.setCameraPosition([1, 2, 3]);

      expect(gl.uniform3f).toHaveBeenCalledWith(expect.anything(), 1, 2, 3);
    });
  });

  describe('setLightingUniforms', () => {
    it('should set all lighting uniforms', () => {
      program.compile();
      const directions = new Float32Array(24); // 8 lights × 3
      const colors = new Float32Array(24);
      const count = 2;
      const ambient: [number, number, number] = [0.1, 0.1, 0.15];

      program.setLightingUniforms(directions, colors, count, ambient);

      expect(gl.uniform3fv).toHaveBeenCalledWith(expect.anything(), directions);
      expect(gl.uniform3fv).toHaveBeenCalledWith(expect.anything(), colors);
      expect(gl.uniform1i).toHaveBeenCalledWith(expect.anything(), count);
      expect(gl.uniform3fv).toHaveBeenCalledWith(expect.anything(), ambient);
    });
  });

  describe('dispose', () => {
    it('should delete WebGL program', () => {
      program.compile();
      const webglProgram = program.getProgram();

      program.dispose();

      expect(gl.deleteProgram).toHaveBeenCalledWith(webglProgram);
    });

    it('should clear internal state', () => {
      program.compile();

      program.dispose();

      expect(program.getProgram()).toBeNull();
      expect(program.getUniformLocations()).toBeNull();
      expect(program.isReady()).toBe(false);
    });

    it('should handle multiple dispose calls gracefully', () => {
      program.compile();

      expect(() => {
        program.dispose();
        program.dispose();
      }).not.toThrow();
    });
  });

  describe('getProgram', () => {
    it('should return null before compilation', () => {
      expect(program.getProgram()).toBeNull();
    });

    it('should return program after compilation', () => {
      program.compile();

      expect(program.getProgram()).toBeDefined();
    });
  });

  describe('getUniformLocations', () => {
    it('should return null before compilation', () => {
      expect(program.getUniformLocations()).toBeNull();
    });

    it('should return all uniform locations after compilation', () => {
      program.compile();

      const uniforms = program.getUniformLocations();
      expect(uniforms).toBeDefined();
      expect(uniforms?.uModelMatrix).toBeDefined();
      expect(uniforms?.uViewProjectionMatrix).toBeDefined();
      expect(uniforms?.uNormalMatrix).toBeDefined();
      expect(uniforms?.uBaseColor).toBeDefined();
      expect(uniforms?.uMetallic).toBeDefined();
      expect(uniforms?.uRoughness).toBeDefined();
      expect(uniforms?.uEmission).toBeDefined();
      expect(uniforms?.uEmissionStrength).toBeDefined();
      expect(uniforms?.uLightDirections).toBeDefined();
      expect(uniforms?.uLightColors).toBeDefined();
      expect(uniforms?.uLightCount).toBeDefined();
      expect(uniforms?.uAmbientColor).toBeDefined();
      expect(uniforms?.uCameraPosition).toBeDefined();
    });
  });
});
