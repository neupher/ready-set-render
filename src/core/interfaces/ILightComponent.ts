/**
 * Light Component Interface
 *
 * Defines the data structure for light components in the Entity Component System.
 * Lights provide illumination for the Forward Renderer.
 *
 * Uses Unity terminology: lightType, intensity, enabled.
 */

import type { IComponent } from './IComponent';

/**
 * Supported light types.
 *
 * - directional: Sun-like light from infinite distance (parallel rays)
 * - point: Omni-directional light from a point (future)
 * - spot: Cone-shaped light (future)
 */
export type LightType = 'directional' | 'point' | 'spot';

/**
 * Light component data interface.
 * Implements IComponent for the Entity Component System.
 */
export interface ILightComponent extends IComponent {
  /** Component type identifier - always 'light' */
  type: 'light';

  /** The type of light: directional, point, or spot */
  lightType: LightType;

  /** Light color as RGB (0-1 range) */
  color: [number, number, number];

  /** Light intensity multiplier (0 = off, 1 = normal, >1 = bright) */
  intensity: number;

  /** Whether the light is enabled */
  enabled: boolean;

  /**
   * Direction vector for directional lights (normalized).
   * Ignored for point lights.
   * For directional lights, this represents the direction FROM the light.
   */
  direction?: [number, number, number];

  /**
   * Range for point/spot lights.
   * Ignored for directional lights.
   */
  range?: number;

  /**
   * Spot angle in degrees for spot lights.
   * Ignored for directional and point lights.
   */
  spotAngle?: number;
}

/**
 * Create a default directional light component.
 *
 * @returns A new ILightComponent with default values
 */
export function createDefaultDirectionalLightComponent(): ILightComponent {
  return {
    type: 'light',
    lightType: 'directional',
    color: [1, 1, 1],
    intensity: 1,
    enabled: true,
    direction: [-0.5, -1, -0.5], // Slightly diagonal, pointing downward
  };
}

/**
 * Create a default point light component.
 *
 * @returns A new ILightComponent with default values
 */
export function createDefaultPointLightComponent(): ILightComponent {
  return {
    type: 'light',
    lightType: 'point',
    color: [1, 1, 1],
    intensity: 1,
    enabled: true,
    range: 10,
  };
}
