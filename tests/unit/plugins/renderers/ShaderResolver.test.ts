import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IMaterialComponent } from '@core/interfaces';
import { EventBus } from '@core/EventBus';
import { AssetRegistry } from '@core/assets/AssetRegistry';
import { BUILT_IN_SHADER_IDS } from '@core/assets/BuiltInShaders';
import type { IMaterialAsset } from '@core/assets/interfaces/IMaterialAsset';
import { ShaderResolver } from '@plugins/renderers/forward/ShaderResolver';
import type { ShaderEditorService } from '@core/ShaderEditorService';

describe('ShaderResolver', () => {
  let assetRegistry: AssetRegistry;
  let shaderEditorService: Pick<
    ShaderEditorService,
    'hasCachedProgram' | 'getCompiledProgram'
  >;
  let resolver: ShaderResolver;

  beforeEach(() => {
    assetRegistry = new AssetRegistry(new EventBus());
    shaderEditorService = {
      hasCachedProgram: vi.fn(() => false),
      getCompiledProgram: vi.fn(() => null),
    };
    resolver = new ShaderResolver({
      shaderEditorService: shaderEditorService as ShaderEditorService,
      assetRegistry,
    });
  });

  it('should resolve shader from material asset reference', () => {
    const materialAsset: IMaterialAsset = {
      uuid: 'material-1',
      type: 'material',
      name: 'Material',
      version: 1,
      created: '2026-01-28T12:00:00Z',
      modified: '2026-01-28T12:00:00Z',
      isBuiltIn: false,
      shaderRef: { uuid: 'shader-from-asset', type: 'shader' },
      parameters: {},
    };
    assetRegistry.register(materialAsset);

    const material = {
      materialAssetRef: { uuid: 'material-1', type: 'material' },
    } as IMaterialComponent;

    expect(resolver.resolveShaderUUID(material)).toBe('shader-from-asset');
  });

  it('should use shaderName when it is a cached custom shader uuid', () => {
    vi.mocked(shaderEditorService.hasCachedProgram).mockReturnValue(true);

    const material = { shaderName: 'custom-shader' } as IMaterialComponent;

    expect(resolver.resolveShaderUUID(material)).toBe('custom-shader');
  });

  it('should map built-in shader names and default to Lambert', () => {
    expect(resolver.resolveShaderUUID({ shaderName: 'pbr' } as IMaterialComponent)).toBe(
      BUILT_IN_SHADER_IDS.PBR,
    );
    expect(resolver.resolveShaderUUID({ shaderName: 'unlit' } as IMaterialComponent)).toBe(
      BUILT_IN_SHADER_IDS.UNLIT,
    );
    expect(resolver.resolveShaderUUID(null)).toBe(BUILT_IN_SHADER_IDS.LAMBERT);
  });

  it('should fall back to Lambert program when requested shader is not compiled', () => {
    const fallbackProgram = { id: 'lambert' } as unknown as WebGLProgram;
    vi.mocked(shaderEditorService.getCompiledProgram).mockImplementation((uuid: string) => (
      uuid === BUILT_IN_SHADER_IDS.LAMBERT ? fallbackProgram : null
    ));

    expect(resolver.resolveProgram('missing-shader')).toEqual({
      shaderUUID: BUILT_IN_SHADER_IDS.LAMBERT,
      program: fallbackProgram,
    });
  });
});
