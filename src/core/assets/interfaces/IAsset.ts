/**
 * IAsset - Base interface for all asset types
 *
 * All concrete asset types (shaders, materials, scenes) must extend this interface.
 * It combines metadata with serialization capabilities.
 *
 * @example
 * ```typescript
 * interface IShaderAsset extends IAsset {
 *   type: 'shader';
 *   isBuiltIn: boolean;
 *   vertexSource: string;
 *   fragmentSource: string;
 * }
 * ```
 */

import type { IAssetMetadata } from './IAssetMetadata';

/**
 * Base interface for all asset types.
 * Extends IAssetMetadata and can be extended for specific asset types.
 */
export interface IAsset extends IAssetMetadata {
  // IAsset is currently identical to IAssetMetadata
  // Concrete asset types (IShaderAsset, IMaterialAsset, etc.) extend this
}

/**
 * Options for creating a new asset.
 */
export interface IAssetCreateOptions {
  /**
   * Optional custom UUID. If not provided, one will be generated.
   */
  uuid?: string;

  /**
   * The name for the asset.
   */
  name: string;
}
