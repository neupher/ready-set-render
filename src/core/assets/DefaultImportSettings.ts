/**
 * Default Import Settings
 *
 * Provides default values for all import settings.
 * These are used when creating new .assetmeta files.
 *
 * @example
 * ```typescript
 * import { DEFAULT_MODEL_IMPORT_SETTINGS } from '@core/assets/DefaultImportSettings';
 *
 * const newMeta: IModelAssetMeta = {
 *   ...baseFields,
 *   importSettings: { ...DEFAULT_MODEL_IMPORT_SETTINGS },
 * };
 * ```
 */

import type {
  IModelImportSettings,
  ICoordinateConversionSettings,
  IMeshImportSettings,
  IMaterialImportSettings,
  IAnimationImportSettings,
} from './interfaces/IModelAssetMeta';

import type {
  ITextureImportSettings,
  TextureType,
} from './interfaces/ITextureAssetMeta';

// ============================================================================
// Model Import Settings Defaults
// ============================================================================

/**
 * Default coordinate conversion settings.
 * GLTF is Y-up, we convert to Z-up.
 */
export const DEFAULT_COORDINATE_SETTINGS: ICoordinateConversionSettings = {
  sourceUp: 'Y',
  convertToZUp: true,
};

/**
 * Default mesh import settings.
 */
export const DEFAULT_MESH_IMPORT_SETTINGS: IMeshImportSettings = {
  generateNormals: true,
  normalAngleThreshold: 60,
  generateTangents: true,
  weldVertices: false,
  weldThreshold: 0.0001,
  optimizeMesh: true,
};

/**
 * Default material import settings.
 */
export const DEFAULT_MATERIAL_IMPORT_SETTINGS: IMaterialImportSettings = {
  importMaterials: true,
  namePrefix: '',
  extractTextures: true,
};

/**
 * Default animation import settings.
 */
export const DEFAULT_ANIMATION_IMPORT_SETTINGS: IAnimationImportSettings = {
  importAnimations: true,
  animationNamePrefix: '',
  sampleRate: 30,
};

/**
 * Complete default model import settings.
 */
export const DEFAULT_MODEL_IMPORT_SETTINGS: IModelImportSettings = {
  scaleFactor: 1.0,
  convertCoordinates: { ...DEFAULT_COORDINATE_SETTINGS },
  meshes: { ...DEFAULT_MESH_IMPORT_SETTINGS },
  materials: { ...DEFAULT_MATERIAL_IMPORT_SETTINGS },
  animations: { ...DEFAULT_ANIMATION_IMPORT_SETTINGS },
};

/**
 * Create a copy of default model import settings.
 * Use this to get a mutable copy that can be modified.
 *
 * @returns A deep copy of default model import settings
 */
export function createDefaultModelImportSettings(): IModelImportSettings {
  return {
    scaleFactor: 1.0,
    convertCoordinates: { ...DEFAULT_COORDINATE_SETTINGS },
    meshes: { ...DEFAULT_MESH_IMPORT_SETTINGS },
    materials: { ...DEFAULT_MATERIAL_IMPORT_SETTINGS },
    animations: { ...DEFAULT_ANIMATION_IMPORT_SETTINGS },
  };
}

// ============================================================================
// Texture Import Settings Defaults
// ============================================================================

/**
 * Default texture import settings for standard color textures.
 */
export const DEFAULT_TEXTURE_IMPORT_SETTINGS: ITextureImportSettings = {
  textureType: 'default',
  sRGB: true,
  alphaSource: 'inputTextureAlpha',
  alphaIsTransparency: true,
  generateMipMaps: true,
  mipMapFilter: 'box',
  preserveCoverage: false,
  wrapModeU: 'repeat',
  wrapModeV: 'repeat',
  filterMode: 'bilinear',
  anisoLevel: 1,
  maxSize: 2048,
  compression: 'normalQuality',
  flipVertically: false,
  premultiplyAlpha: false,
};

/**
 * Texture import settings presets by texture type.
 * Each preset overrides specific defaults for that use case.
 */
export const TEXTURE_TYPE_PRESETS: Record<TextureType, Partial<ITextureImportSettings>> = {
  default: {
    // Uses all defaults
  },

  normalMap: {
    textureType: 'normalMap',
    sRGB: false,  // Normal maps use linear color space
    alphaSource: 'none',
    filterMode: 'trilinear',
    compression: 'highQuality',  // Normal maps need precision
  },

  sprite: {
    textureType: 'sprite',
    wrapModeU: 'clamp',
    wrapModeV: 'clamp',
    filterMode: 'bilinear',
    generateMipMaps: false,  // Sprites typically don't need mipmaps
  },

  cursor: {
    textureType: 'cursor',
    wrapModeU: 'clamp',
    wrapModeV: 'clamp',
    filterMode: 'point',  // Sharp edges for cursors
    generateMipMaps: false,
    maxSize: 256,
    compression: 'none',
  },

  lightmap: {
    textureType: 'lightmap',
    sRGB: false,  // Lightmaps are in linear space
    wrapModeU: 'clamp',
    wrapModeV: 'clamp',
    generateMipMaps: true,
    compression: 'highQuality',
  },

  singleChannel: {
    textureType: 'singleChannel',
    sRGB: false,  // Data textures are linear
    alphaSource: 'none',
    compression: 'normalQuality',
  },

  hdri: {
    textureType: 'hdri',
    sRGB: false,  // HDR is linear
    alphaSource: 'none',
    generateMipMaps: true,
    filterMode: 'trilinear',
    compression: 'none',  // HDR needs full precision
    maxSize: 4096,
  },
};

/**
 * Create texture import settings for a specific texture type.
 * Applies type-specific presets on top of defaults.
 *
 * @param textureType - The texture type preset to use
 * @returns Complete texture import settings
 */
export function createTextureImportSettings(textureType: TextureType): ITextureImportSettings {
  const preset = TEXTURE_TYPE_PRESETS[textureType] || {};
  return {
    ...DEFAULT_TEXTURE_IMPORT_SETTINGS,
    ...preset,
    textureType,
  };
}

/**
 * Create a copy of default texture import settings.
 *
 * @returns A copy of default texture import settings
 */
export function createDefaultTextureImportSettings(): ITextureImportSettings {
  return { ...DEFAULT_TEXTURE_IMPORT_SETTINGS };
}
