import type { IMaterialComponent } from '@core/interfaces';
import type { ShaderEditorService } from '@core/ShaderEditorService';
import type { AssetRegistry } from '@core/assets/AssetRegistry';
import type { IMaterialAsset } from '@core/assets/interfaces/IMaterialAsset';
import type { IShaderAsset, IUniformDeclaration } from '@core/assets/interfaces/IShaderAsset';

export interface FrameUniforms {
  readonly viewProjectionMatrix: Float32Array;
  readonly cameraPosition: readonly [number, number, number];
  readonly lightDirections: Float32Array;
  readonly lightColors: Float32Array;
  readonly lightCount: number;
  readonly ambientColor: readonly [number, number, number];
}

export interface ObjectUniforms {
  readonly shaderUUID: string;
  readonly modelMatrix: Float32Array;
  readonly normalMatrix: Float32Array;
  readonly material: IMaterialComponent | null;
}

export interface UniformSetterOptions {
  readonly gl: WebGL2RenderingContext;
  readonly shaderEditorService: ShaderEditorService;
  readonly assetRegistry: AssetRegistry | null;
}

/**
 * Applies renderer, transform, and material uniforms for shader assets.
 */
export class UniformSetter {
  constructor(private readonly options: UniformSetterOptions) {}

  setFrameUniforms(shaderUUID: string, uniforms: FrameUniforms): void {
    const { gl } = this.options;
    const locations = this.options.shaderEditorService.getUniformLocations(shaderUUID);
    if (!locations) return;

    const vpLoc = locations.get('uViewProjectionMatrix');
    if (vpLoc) gl.uniformMatrix4fv(vpLoc, false, uniforms.viewProjectionMatrix);

    const camLoc = locations.get('uCameraPosition');
    if (camLoc) gl.uniform3f(camLoc, ...uniforms.cameraPosition);

    const lightDirLoc = locations.get('uLightDirections');
    if (lightDirLoc) gl.uniform3fv(lightDirLoc, uniforms.lightDirections);

    const lightColLoc = locations.get('uLightColors');
    if (lightColLoc) gl.uniform3fv(lightColLoc, uniforms.lightColors);

    const lightCountLoc = locations.get('uLightCount');
    if (lightCountLoc) gl.uniform1i(lightCountLoc, uniforms.lightCount);

    const ambientLoc = locations.get('uAmbientColor');
    if (ambientLoc) gl.uniform3fv(ambientLoc, uniforms.ambientColor);
  }

  setObjectUniforms(uniforms: ObjectUniforms): void {
    const { gl } = this.options;
    const locations = this.options.shaderEditorService.getUniformLocations(uniforms.shaderUUID);
    if (!locations) return;

    const modelLoc = locations.get('uModelMatrix');
    if (modelLoc) gl.uniformMatrix4fv(modelLoc, false, uniforms.modelMatrix);

    const normalLoc = locations.get('uNormalMatrix');
    if (normalLoc) gl.uniformMatrix3fv(normalLoc, false, uniforms.normalMatrix);

    const parameters = this.getMaterialParameters(uniforms.material);
    const shader = this.options.assetRegistry?.get<IShaderAsset>(uniforms.shaderUUID);

    if (!shader) {
      this.setFallbackMaterialUniforms(locations, uniforms.material);
      return;
    }

    for (const uniform of shader.uniforms) {
      const loc = locations.get(uniform.name);
      if (!loc) continue;

      const value = this.resolveUniformValue(uniform, parameters, uniforms.material);
      this.setUniformValue(loc, uniform, value);
    }
  }

  setUniformValue(
    location: WebGLUniformLocation,
    uniform: IUniformDeclaration,
    value: unknown,
  ): void {
    const { gl } = this.options;

    switch (uniform.type) {
      case 'float':
        gl.uniform1f(location, value as number);
        break;
      case 'int':
        gl.uniform1i(location, value as number);
        break;
      case 'bool':
        gl.uniform1i(location, (value as boolean) ? 1 : 0);
        break;
      case 'vec2': {
        const v2 = value as [number, number];
        gl.uniform2f(location, v2[0], v2[1]);
        break;
      }
      case 'vec3': {
        const v3 = value as [number, number, number];
        gl.uniform3f(location, v3[0], v3[1], v3[2]);
        break;
      }
      case 'vec4': {
        const v4 = value as [number, number, number, number];
        gl.uniform4f(location, v4[0], v4[1], v4[2], v4[3]);
        break;
      }
      case 'mat3':
        gl.uniformMatrix3fv(location, false, value as Float32Array | number[]);
        break;
      case 'mat4':
        gl.uniformMatrix4fv(location, false, value as Float32Array | number[]);
        break;
      case 'sampler2D':
        break;
    }
  }

  private getMaterialParameters(material: IMaterialComponent | null): Record<string, unknown> {
    if (!material?.materialAssetRef || !this.options.assetRegistry) {
      return {};
    }

    const materialAsset = this.options.assetRegistry.get<IMaterialAsset>(
      material.materialAssetRef.uuid,
    );
    return materialAsset?.parameters ?? {};
  }

  private setFallbackMaterialUniforms(
    locations: Map<string, WebGLUniformLocation | null>,
    material: IMaterialComponent | null,
  ): void {
    const { gl } = this.options;
    const color = material?.color ?? [0.8, 0.8, 0.8];

    const baseColorLoc = locations.get('uBaseColor');
    if (baseColorLoc) gl.uniform3fv(baseColorLoc, color);

    const colorLoc = locations.get('uColor');
    if (colorLoc) gl.uniform3fv(colorLoc, color);

    const opacityLoc = locations.get('uOpacity');
    if (opacityLoc) gl.uniform1f(opacityLoc, material?.opacity ?? 1.0);
  }

  private resolveUniformValue(
    uniform: IUniformDeclaration,
    parameters: Record<string, unknown>,
    material: IMaterialComponent | null,
  ): unknown {
    const parameterValue = parameters[uniform.name];
    if (parameterValue !== undefined) {
      return parameterValue;
    }

    if ((uniform.name === 'uBaseColor' || uniform.name === 'uColor') && material?.color) {
      return material.color;
    }

    if (uniform.name === 'uOpacity' && material?.opacity !== undefined) {
      return material.opacity;
    }

    return uniform.defaultValue;
  }
}
