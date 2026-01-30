/**
 * IMaterialComponent - Material data component
 *
 * Provides material-related information for entities that can be rendered.
 * Used by the Properties panel to display shader and material properties.
 *
 * PBR properties follow Blender's Principled BSDF conventions:
 * - Base Color (albedo)
 * - Metallic (0-1)
 * - Roughness (0-1)
 * - Emission
 *
 * Materials can reference an IMaterialAsset via materialAssetRef, or use
 * inline properties as a fallback. When materialAssetRef is set, the asset's
 * parameters take precedence over inline properties.
 */

import type { IComponent } from './IComponent';
import type { IAssetReference } from '../assets/interfaces/IAssetReference';

/**
 * Material component containing rendering properties.
 *
 * Supports both legacy (Lambertian) and PBR (Cook-Torrance) shading models.
 * Set `shaderName: 'pbr'` to enable PBR rendering.
 *
 * When `materialAssetRef` is set, the renderer will use the referenced
 * IMaterialAsset for shader and parameter values. If the reference is
 * invalid or the asset cannot be found, an error indicator will be shown.
 */
export interface IMaterialComponent extends IComponent {
  /** Component type identifier */
  readonly type: 'material';

  /**
   * Optional reference to a material asset.
   *
   * When set, the renderer will look up the IMaterialAsset from the
   * AssetRegistry and use its shader and parameters for rendering.
   * If undefined or invalid, inline properties below are used as fallback.
   */
  materialAssetRef?: IAssetReference;

  /** Name of the shader used for rendering ('default' | 'pbr') */
  shaderName: string;

  /** Base color / albedo in RGB (0-1 range) */
  color?: [number, number, number];

  /** Opacity (0-1, where 1 is fully opaque) */
  opacity?: number;

  /** Whether this material uses transparency */
  transparent?: boolean;

  //===========================================================================
  // PBR Properties (Blender Principled BSDF)
  //===========================================================================

  /**
   * Metallic factor (0-1)
   *
   * 0 = dielectric (plastic, wood, etc.)
   * 1 = metal (gold, steel, etc.)
   *
   * Affects how the surface reflects light:
   * - Dielectrics reflect a small amount at all angles
   * - Metals tint reflections with their base color
   */
  metallic?: number;

  /**
   * Roughness factor (0-1)
   *
   * 0 = smooth/glossy (mirror-like)
   * 1 = rough/matte (diffuse-like)
   *
   * Controls the spread of specular highlights.
   */
  roughness?: number;

  /**
   * Emission color in RGB (0-1 range)
   *
   * Color of light emitted by the surface.
   * Combined with emissionStrength for final intensity.
   */
  emission?: [number, number, number];

  /**
   * Emission strength multiplier
   *
   * Multiplied with emission color for HDR emission values.
   * Default: 0 (no emission)
   */
  emissionStrength?: number;
}
