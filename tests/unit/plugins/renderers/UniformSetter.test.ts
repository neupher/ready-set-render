import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IMaterialComponent } from '@core/interfaces';
import { EventBus } from '@core/EventBus';
import { AssetRegistry } from '@core/assets/AssetRegistry';
import type { IShaderAsset } from '@core/assets/interfaces/IShaderAsset';
import type { IMaterialAsset } from '@core/assets/interfaces/IMaterialAsset';
import type { ShaderEditorService } from '@core/ShaderEditorService';
import { UniformSetter } from '@plugins/renderers/forward/UniformSetter';
import { createMockGL } from '../../../helpers/webgl-mock';

describe('UniformSetter', () => {
  let gl: WebGL2RenderingContext;
  let assetRegistry: AssetRegistry;
  let locations: Map<string, WebGLUniformLocation | null>;
  let shaderEditorService: Pick<ShaderEditorService, 'getUniformLocations'>;
  let setter: UniformSetter;

  beforeEach(() => {
    gl = createMockGL();
    assetRegistry = new AssetRegistry(new EventBus());
    locations = new Map();
    shaderEditorService = {
      getUniformLocations: vi.fn(() => locations),
    };
    setter = new UniformSetter({
      gl,
      shaderEditorService: shaderEditorService as ShaderEditorService,
      assetRegistry,
    });
  });

  it('should set frame uniforms when locations exist', () => {
    const viewProjection = new Float32Array(16);
    const lightDirections = new Float32Array(24);
    const lightColors = new Float32Array(24);
    const vpLoc = {} as WebGLUniformLocation;
    const cameraLoc = {} as WebGLUniformLocation;
    const lightCountLoc = {} as WebGLUniformLocation;

    locations.set('uViewProjectionMatrix', vpLoc);
    locations.set('uCameraPosition', cameraLoc);
    locations.set('uLightCount', lightCountLoc);

    setter.setFrameUniforms('shader-1', {
      viewProjectionMatrix: viewProjection,
      cameraPosition: [1, 2, 3],
      lightDirections,
      lightColors,
      lightCount: 2,
      ambientColor: [0.1, 0.2, 0.3],
    });

    expect(gl.uniformMatrix4fv).toHaveBeenCalledWith(vpLoc, false, viewProjection);
    expect(gl.uniform3f).toHaveBeenCalledWith(cameraLoc, 1, 2, 3);
    expect(gl.uniform1i).toHaveBeenCalledWith(lightCountLoc, 2);
  });

  it('should set shader-declared material parameters by type', () => {
    const floatLoc = {} as WebGLUniformLocation;
    const vec3Loc = {} as WebGLUniformLocation;
    const boolLoc = {} as WebGLUniformLocation;
    locations.set('uRoughness', floatLoc);
    locations.set('uBaseColor', vec3Loc);
    locations.set('uEnabled', boolLoc);

    const shader: IShaderAsset = {
      uuid: 'shader-1',
      type: 'shader',
      name: 'Shader',
      version: 1,
      created: '2026-01-28T12:00:00Z',
      modified: '2026-01-28T12:00:00Z',
      isBuiltIn: false,
      vertexSource: '',
      fragmentSource: '',
      uniforms: [
        {
          name: 'uRoughness',
          type: 'float',
          displayName: 'Roughness',
          defaultValue: 0.5,
        },
        {
          name: 'uBaseColor',
          type: 'vec3',
          displayName: 'Base Color',
          defaultValue: [0.8, 0.8, 0.8],
        },
        {
          name: 'uEnabled',
          type: 'bool',
          displayName: 'Enabled',
          defaultValue: false,
        },
      ],
    };
    const materialAsset: IMaterialAsset = {
      uuid: 'material-1',
      type: 'material',
      name: 'Material',
      version: 1,
      created: '2026-01-28T12:00:00Z',
      modified: '2026-01-28T12:00:00Z',
      isBuiltIn: false,
      shaderRef: { uuid: 'shader-1', type: 'shader' },
      parameters: {
        uRoughness: 0.25,
        uEnabled: true,
      },
    };
    assetRegistry.register(shader);
    assetRegistry.register(materialAsset);

    const material = {
      materialAssetRef: { uuid: 'material-1', type: 'material' },
      color: [0.2, 0.4, 0.6],
    } as IMaterialComponent;

    setter.setObjectUniforms({
      shaderUUID: 'shader-1',
      modelMatrix: new Float32Array(16),
      normalMatrix: new Float32Array(9),
      material,
    });

    expect(gl.uniform1f).toHaveBeenCalledWith(floatLoc, 0.25);
    expect(gl.uniform3f).toHaveBeenCalledWith(vec3Loc, 0.2, 0.4, 0.6);
    expect(gl.uniform1i).toHaveBeenCalledWith(boolLoc, 1);
  });

  it('should set fallback color and opacity uniforms when shader asset is missing', () => {
    const colorLoc = {} as WebGLUniformLocation;
    const opacityLoc = {} as WebGLUniformLocation;
    locations.set('uColor', colorLoc);
    locations.set('uOpacity', opacityLoc);

    setter.setObjectUniforms({
      shaderUUID: 'missing-shader',
      modelMatrix: new Float32Array(16),
      normalMatrix: new Float32Array(9),
      material: {
        color: [0.1, 0.2, 0.3],
        opacity: 0.4,
      } as IMaterialComponent,
    });

    expect(gl.uniform3fv).toHaveBeenCalledWith(colorLoc, [0.1, 0.2, 0.3]);
    expect(gl.uniform1f).toHaveBeenCalledWith(opacityLoc, 0.4);
  });
});
