/**
 * ITextureAssetMeta Tests
 *
 * Tests for texture asset metadata interfaces and type guards.
 */

import { describe, it, expect } from 'vitest';
import {
  isTextureAssetMeta,
  TEXTURE_ASSET_META_VERSION,
  type ITextureAssetMeta,
} from '../../../src/core/assets/interfaces/ITextureAssetMeta';
import {
  DEFAULT_TEXTURE_IMPORT_SETTINGS,
  TEXTURE_TYPE_PRESETS,
  createTextureImportSettings,
  createDefaultTextureImportSettings,
} from '../../../src/core/assets/DefaultImportSettings';

describe('ITextureAssetMeta', () => {
  /**
   * Create a valid texture asset meta for testing.
   */
  function createValidTextureAssetMeta(): ITextureAssetMeta {
    return {
      version: TEXTURE_ASSET_META_VERSION,
      uuid: 'test-texture-meta-uuid',
      type: 'texture',
      importedAt: '2026-03-04T12:00:00Z',
      sourceHash: 'size:123456:mtime:1709564400000',
      isDirty: false,
      sourcePath: 'Assets/Textures/wood.png',
      importSettings: { ...DEFAULT_TEXTURE_IMPORT_SETTINGS },
      properties: {
        width: 1024,
        height: 1024,
        format: 'png',
        hasAlpha: false,
        bitsPerChannel: 8,
        channelCount: 3,
        isHDR: false,
      },
    };
  }

  describe('isTextureAssetMeta', () => {
    it('should return true for valid texture asset meta', () => {
      const meta = createValidTextureAssetMeta();
      expect(isTextureAssetMeta(meta)).toBe(true);
    });

    it('should return true for texture with alpha', () => {
      const meta = createValidTextureAssetMeta();
      meta.properties.hasAlpha = true;
      meta.properties.channelCount = 4;
      expect(isTextureAssetMeta(meta)).toBe(true);
    });

    it('should return true for HDR texture', () => {
      const meta = createValidTextureAssetMeta();
      meta.properties.isHDR = true;
      meta.properties.bitsPerChannel = 32;
      expect(isTextureAssetMeta(meta)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isTextureAssetMeta(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isTextureAssetMeta(undefined)).toBe(false);
    });

    it('should return false for wrong type', () => {
      const meta = createValidTextureAssetMeta();
      (meta as unknown as Record<string, unknown>).type = 'model';
      expect(isTextureAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing version', () => {
      const meta = createValidTextureAssetMeta();
      delete (meta as unknown as Record<string, unknown>).version;
      expect(isTextureAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing uuid', () => {
      const meta = createValidTextureAssetMeta();
      delete (meta as unknown as Record<string, unknown>).uuid;
      expect(isTextureAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing importedAt', () => {
      const meta = createValidTextureAssetMeta();
      delete (meta as unknown as Record<string, unknown>).importedAt;
      expect(isTextureAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing sourceHash', () => {
      const meta = createValidTextureAssetMeta();
      delete (meta as unknown as Record<string, unknown>).sourceHash;
      expect(isTextureAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing isDirty', () => {
      const meta = createValidTextureAssetMeta();
      delete (meta as unknown as Record<string, unknown>).isDirty;
      expect(isTextureAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing sourcePath', () => {
      const meta = createValidTextureAssetMeta();
      delete (meta as unknown as Record<string, unknown>).sourcePath;
      expect(isTextureAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing importSettings', () => {
      const meta = createValidTextureAssetMeta();
      delete (meta as unknown as Record<string, unknown>).importSettings;
      expect(isTextureAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing importSettings.textureType', () => {
      const meta = createValidTextureAssetMeta();
      delete (meta.importSettings as unknown as Record<string, unknown>).textureType;
      expect(isTextureAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing properties', () => {
      const meta = createValidTextureAssetMeta();
      delete (meta as unknown as Record<string, unknown>).properties;
      expect(isTextureAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing properties.width', () => {
      const meta = createValidTextureAssetMeta();
      delete (meta.properties as unknown as Record<string, unknown>).width;
      expect(isTextureAssetMeta(meta)).toBe(false);
    });

    it('should return false for missing properties.height', () => {
      const meta = createValidTextureAssetMeta();
      delete (meta.properties as unknown as Record<string, unknown>).height;
      expect(isTextureAssetMeta(meta)).toBe(false);
    });
  });

  describe('TEXTURE_ASSET_META_VERSION', () => {
    it('should be defined', () => {
      expect(TEXTURE_ASSET_META_VERSION).toBeDefined();
    });

    it('should be a positive integer', () => {
      expect(typeof TEXTURE_ASSET_META_VERSION).toBe('number');
      expect(TEXTURE_ASSET_META_VERSION).toBeGreaterThan(0);
      expect(Number.isInteger(TEXTURE_ASSET_META_VERSION)).toBe(true);
    });
  });
});

describe('TextureImportSettings', () => {
  describe('DEFAULT_TEXTURE_IMPORT_SETTINGS', () => {
    it('should have default texture type', () => {
      expect(DEFAULT_TEXTURE_IMPORT_SETTINGS.textureType).toBe('default');
    });

    it('should have sRGB enabled', () => {
      expect(DEFAULT_TEXTURE_IMPORT_SETTINGS.sRGB).toBe(true);
    });

    it('should have mipmap generation enabled', () => {
      expect(DEFAULT_TEXTURE_IMPORT_SETTINGS.generateMipMaps).toBe(true);
    });

    it('should have repeat wrap mode', () => {
      expect(DEFAULT_TEXTURE_IMPORT_SETTINGS.wrapModeU).toBe('repeat');
      expect(DEFAULT_TEXTURE_IMPORT_SETTINGS.wrapModeV).toBe('repeat');
    });

    it('should have bilinear filter mode', () => {
      expect(DEFAULT_TEXTURE_IMPORT_SETTINGS.filterMode).toBe('bilinear');
    });

    it('should have normal compression quality', () => {
      expect(DEFAULT_TEXTURE_IMPORT_SETTINGS.compression).toBe('normalQuality');
    });

    it('should have max size of 2048', () => {
      expect(DEFAULT_TEXTURE_IMPORT_SETTINGS.maxSize).toBe(2048);
    });
  });

  describe('TEXTURE_TYPE_PRESETS', () => {
    it('should have all texture types defined', () => {
      const types = ['default', 'normalMap', 'sprite', 'cursor', 'lightmap', 'singleChannel', 'hdri'];
      for (const type of types) {
        expect(TEXTURE_TYPE_PRESETS[type as keyof typeof TEXTURE_TYPE_PRESETS]).toBeDefined();
      }
    });

    it('should have normalMap with sRGB disabled', () => {
      expect(TEXTURE_TYPE_PRESETS.normalMap.sRGB).toBe(false);
    });

    it('should have normalMap with high quality compression', () => {
      expect(TEXTURE_TYPE_PRESETS.normalMap.compression).toBe('highQuality');
    });

    it('should have sprite with clamp wrap mode', () => {
      expect(TEXTURE_TYPE_PRESETS.sprite.wrapModeU).toBe('clamp');
      expect(TEXTURE_TYPE_PRESETS.sprite.wrapModeV).toBe('clamp');
    });

    it('should have sprite without mipmaps', () => {
      expect(TEXTURE_TYPE_PRESETS.sprite.generateMipMaps).toBe(false);
    });

    it('should have cursor with point filter', () => {
      expect(TEXTURE_TYPE_PRESETS.cursor.filterMode).toBe('point');
    });

    it('should have hdri with no compression', () => {
      expect(TEXTURE_TYPE_PRESETS.hdri.compression).toBe('none');
    });

    it('should have singleChannel with sRGB disabled', () => {
      expect(TEXTURE_TYPE_PRESETS.singleChannel.sRGB).toBe(false);
    });
  });

  describe('createTextureImportSettings', () => {
    it('should return default settings for default type', () => {
      const settings = createTextureImportSettings('default');
      expect(settings.textureType).toBe('default');
      expect(settings.sRGB).toBe(true);
    });

    it('should apply normalMap preset', () => {
      const settings = createTextureImportSettings('normalMap');
      expect(settings.textureType).toBe('normalMap');
      expect(settings.sRGB).toBe(false);
      expect(settings.filterMode).toBe('trilinear');
      expect(settings.compression).toBe('highQuality');
    });

    it('should apply sprite preset', () => {
      const settings = createTextureImportSettings('sprite');
      expect(settings.textureType).toBe('sprite');
      expect(settings.wrapModeU).toBe('clamp');
      expect(settings.generateMipMaps).toBe(false);
    });

    it('should preserve defaults not in preset', () => {
      const settings = createTextureImportSettings('normalMap');
      expect(settings.maxSize).toBe(DEFAULT_TEXTURE_IMPORT_SETTINGS.maxSize);
      expect(settings.anisoLevel).toBe(DEFAULT_TEXTURE_IMPORT_SETTINGS.anisoLevel);
    });

    it('should return a new object each time', () => {
      const settings1 = createTextureImportSettings('default');
      const settings2 = createTextureImportSettings('default');
      expect(settings1).not.toBe(settings2);
    });
  });

  describe('createDefaultTextureImportSettings', () => {
    it('should return a copy of defaults', () => {
      const settings = createDefaultTextureImportSettings();
      expect(settings.textureType).toBe('default');
      expect(settings).not.toBe(DEFAULT_TEXTURE_IMPORT_SETTINGS);
    });

    it('should allow modification without affecting defaults', () => {
      const settings = createDefaultTextureImportSettings();
      settings.sRGB = false;
      settings.maxSize = 4096;

      expect(DEFAULT_TEXTURE_IMPORT_SETTINGS.sRGB).toBe(true);
      expect(DEFAULT_TEXTURE_IMPORT_SETTINGS.maxSize).toBe(2048);
    });
  });
});
