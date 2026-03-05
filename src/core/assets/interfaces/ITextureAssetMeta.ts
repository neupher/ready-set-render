/**
 * ITextureAssetMeta - Metadata interface for texture source files
 *
 * Extends IAssetMeta with texture-specific import settings.
 * Created alongside .png/.jpg/.tga/.exr files as {filename}.assetmeta
 *
 * This interface is prepared for future texture support but not yet implemented.
 *
 * @example
 * ```typescript
 * // File: Assets/Textures/wood.png.assetmeta
 * const woodMeta: ITextureAssetMeta = {
 *   version: 1,
 *   uuid: 'a1b2c3d4-...',
 *   type: 'texture',
 *   importedAt: '2026-03-04T12:00:00Z',
 *   sourceHash: 'size:123456:mtime:1709564400000',
 *   isDirty: false,
 *   sourcePath: 'Assets/Textures/wood.png',
 *   importSettings: {
 *     textureType: 'default',
 *     sRGB: true,
 *     generateMipMaps: true,
 *     ...
 *   },
 *   properties: {
 *     width: 1024,
 *     height: 1024,
 *     format: 'png',
 *     hasAlpha: false,
 *   }
 * };
 * ```
 */

import type { IAssetMeta } from './IAssetMeta';

/**
 * Current schema version for texture asset meta.
 */
export const TEXTURE_ASSET_META_VERSION = 1;

/**
 * Texture type presets that affect default import settings.
 */
export type TextureType =
  | 'default'      // Standard color texture (albedo, etc.)
  | 'normalMap'    // Normal/bump map (linear, special compression)
  | 'sprite'       // 2D sprite for UI
  | 'cursor'       // Mouse cursor
  | 'lightmap'     // Baked lighting
  | 'singleChannel' // Grayscale data (roughness, metallic, AO)
  | 'hdri';        // HDR environment map

/**
 * Texture alpha handling options.
 */
export type AlphaSource = 'none' | 'inputTextureAlpha' | 'fromGrayScale';

/**
 * Texture wrap mode options.
 */
export type WrapMode = 'repeat' | 'clamp' | 'mirror' | 'mirrorOnce';

/**
 * Texture filter mode options.
 */
export type FilterMode = 'point' | 'bilinear' | 'trilinear';

/**
 * Mipmap filter options.
 */
export type MipMapFilter = 'box' | 'kaiser';

/**
 * Texture compression quality options.
 */
export type CompressionQuality = 'none' | 'lowQuality' | 'normalQuality' | 'highQuality';

/**
 * Maximum texture size options (power of 2).
 */
export type MaxTextureSize = 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384;

/**
 * Texture-specific import settings.
 */
export interface ITextureImportSettings {
  /**
   * Texture type preset.
   * Affects default values for other settings.
   * @default 'default'
   */
  textureType: TextureType;

  /**
   * Whether the texture uses sRGB color space.
   * True for color textures (albedo), false for data textures (normal, roughness).
   * @default true
   */
  sRGB: boolean;

  /**
   * Alpha channel source.
   * @default 'inputTextureAlpha'
   */
  alphaSource: AlphaSource;

  /**
   * Whether alpha should be interpreted as transparency.
   * @default true
   */
  alphaIsTransparency: boolean;

  /**
   * Generate mipmaps for the texture.
   * @default true
   */
  generateMipMaps: boolean;

  /**
   * Filter used for mipmap generation.
   * @default 'box'
   */
  mipMapFilter: MipMapFilter;

  /**
   * Preserve mipmap coverage for alpha cutout textures.
   * @default false
   */
  preserveCoverage: boolean;

  /**
   * Texture wrap mode (U direction).
   * @default 'repeat'
   */
  wrapModeU: WrapMode;

  /**
   * Texture wrap mode (V direction).
   * @default 'repeat'
   */
  wrapModeV: WrapMode;

  /**
   * Texture filter mode.
   * @default 'bilinear'
   */
  filterMode: FilterMode;

  /**
   * Anisotropic filtering level (1-16).
   * Higher values improve quality at oblique angles.
   * @default 1
   */
  anisoLevel: number;

  /**
   * Maximum texture size.
   * Textures larger than this will be downscaled.
   * @default 2048
   */
  maxSize: MaxTextureSize;

  /**
   * Compression quality.
   * @default 'normalQuality'
   */
  compression: CompressionQuality;

  /**
   * Flip texture vertically on import.
   * Some formats have different origin conventions.
   * @default false
   */
  flipVertically: boolean;

  /**
   * Premultiply alpha channel.
   * @default false
   */
  premultiplyAlpha: boolean;
}

/**
 * Cached texture properties from the source file.
 */
export interface ITextureProperties {
  /**
   * Original width in pixels.
   */
  width: number;

  /**
   * Original height in pixels.
   */
  height: number;

  /**
   * Source file format.
   */
  format: string;

  /**
   * Whether the source has an alpha channel.
   */
  hasAlpha: boolean;

  /**
   * Bits per channel (8, 16, 32).
   */
  bitsPerChannel: number;

  /**
   * Number of color channels (1, 3, 4).
   */
  channelCount: number;

  /**
   * Whether the source is HDR (high dynamic range).
   */
  isHDR: boolean;
}

/**
 * Texture asset metadata interface.
 * Stored as {filename}.assetmeta alongside texture files.
 */
export interface ITextureAssetMeta extends IAssetMeta {
  /**
   * Asset meta type discriminator.
   */
  readonly type: 'texture';

  /**
   * Texture-specific import settings.
   */
  importSettings: ITextureImportSettings;

  /**
   * Cached properties from the source texture.
   */
  properties: ITextureProperties;
}

/**
 * Type guard to check if an object is a valid texture asset meta.
 *
 * @param obj - The object to check
 * @returns True if the object is a valid ITextureAssetMeta
 */
export function isTextureAssetMeta(obj: unknown): obj is ITextureAssetMeta {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const meta = obj as Record<string, unknown>;

  // Check base fields
  if (
    meta.type !== 'texture' ||
    typeof meta.version !== 'number' ||
    typeof meta.uuid !== 'string' ||
    typeof meta.importedAt !== 'string' ||
    typeof meta.sourceHash !== 'string' ||
    typeof meta.isDirty !== 'boolean' ||
    typeof meta.sourcePath !== 'string'
  ) {
    return false;
  }

  // Check importSettings
  const settings = meta.importSettings as Record<string, unknown> | null | undefined;
  if (
    typeof settings !== 'object' ||
    settings === null ||
    typeof settings.textureType !== 'string'
  ) {
    return false;
  }

  // Check properties
  const props = meta.properties as Record<string, unknown> | null | undefined;
  if (
    typeof props !== 'object' ||
    props === null ||
    typeof props.width !== 'number' ||
    typeof props.height !== 'number'
  ) {
    return false;
  }

  return true;
}
