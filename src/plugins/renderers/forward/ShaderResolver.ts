import type { IMaterialComponent } from '@core/interfaces';
import type { ShaderEditorService } from '@core/ShaderEditorService';
import type { AssetRegistry } from '@core/assets/AssetRegistry';
import { BUILT_IN_SHADER_IDS } from '@core/assets/BuiltInShaders';
import type { IMaterialAsset } from '@core/assets/interfaces/IMaterialAsset';

export interface ShaderResolverOptions {
  readonly shaderEditorService: ShaderEditorService;
  readonly assetRegistry: AssetRegistry | null;
}

/**
 * Resolves material state to the shader UUID used by the renderer.
 */
export class ShaderResolver {
  constructor(private readonly options: ShaderResolverOptions) {}

  /**
   * Resolve the shader UUID to use for a material.
   *
   * Priority:
   * 1. materialAssetRef -> IMaterialAsset -> shaderRef
   * 2. shaderName already identifies a cached shader UUID
   * 3. shaderName maps to a built-in shader
   * 4. Lambert fallback
   */
  resolveShaderUUID(material: IMaterialComponent | null): string {
    if (material?.materialAssetRef && this.options.assetRegistry) {
      const materialAsset = this.options.assetRegistry.get<IMaterialAsset>(
        material.materialAssetRef.uuid,
      );
      if (materialAsset) {
        return materialAsset.shaderRef.uuid;
      }
    }

    const shaderName = material?.shaderName;

    if (shaderName && this.options.shaderEditorService.hasCachedProgram(shaderName)) {
      return shaderName;
    }

    switch (shaderName?.toLowerCase()) {
      case 'pbr':
        return BUILT_IN_SHADER_IDS.PBR;
      case 'unlit':
        return BUILT_IN_SHADER_IDS.UNLIT;
      case 'lambert':
      default:
        return BUILT_IN_SHADER_IDS.LAMBERT;
    }
  }

  resolveProgram(shaderUUID: string): { shaderUUID: string; program: WebGLProgram } | null {
    const program = this.options.shaderEditorService.getCompiledProgram(shaderUUID);
    if (program) {
      return { shaderUUID, program };
    }

    const fallbackProgram = this.options.shaderEditorService.getCompiledProgram(
      BUILT_IN_SHADER_IDS.LAMBERT,
    );
    if (!fallbackProgram) {
      return null;
    }

    return {
      shaderUUID: BUILT_IN_SHADER_IDS.LAMBERT,
      program: fallbackProgram,
    };
  }
}
