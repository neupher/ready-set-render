/**
 * Light Component Interface
 *
 * Defines the data structure for light components in the Entity Component System.
 * Lights provide illumination for the Forward Renderer.
 *
 * Uses Unity terminology: lightType, intensity, enabled.
 *
 * IMPORTANT: Light direction is derived from the entity's transform rotation,
 * NOT stored in the component. This follows Unity's approach where a directional
 * light's direction is determined by its rotation in the scene.
 */

import type { IComponent } from './IComponent';

/**
 * Supported light types.
 *
 * - directional: Sun-like light from infinite distance (parallel rays)
 * - point: Omni-directional light from a point (future)
 * - spot: Cone-shaped light (future)
 * - area: Area/rectangle light (future)
 */
export type LightType = 'directional' | 'point' | 'spot' | 'area';

/**
 * Light component data interface.
 * Implements IComponent for the Entity Component System.
 *
 * Note: Direction for directional/spot lights is NOT stored here.
 * Direction is computed from the entity's transform.rotation.
 * This ensures light direction updates when the entity is rotated.
 */
export interface ILightComponent extends IComponent {
  /** Component type identifier - always 'light' */
  type: 'light';

  /** The type of light: directional, point, spot, or area */
  lightType: LightType;

  /** Light color as RGB (0-1 range) */
  color: [number, number, number];

  /** Light intensity multiplier (0 = off, 1 = normal, >1 = bright) */
  intensity: number;

  /** Whether the light is enabled */
  enabled: boolean;

  /**
   * Range for point/spot lights (in world units).
   * Ignored for directional lights.
   */
  range?: number;

  /**
   * Spot angle in degrees for spot lights.
   * This is the outer cone angle.
   * Ignored for directional and point lights.
   */
  spotAngle?: number;

  /**
   * Inner spot angle ratio (0-1) for spot lights.
   * Controls the softness of the spotlight edge.
   * Ignored for directional and point lights.
   */
  innerSpotRatio?: number;

  /**
   * Shadow casting enabled.
   * Future feature - not yet implemented.
   */
  castShadows?: boolean;

  /**
   * Shadow strength (0-1).
   * Future feature - not yet implemented.
   */
  shadowStrength?: number;
}

/**
 * Interface for entities that provide light direction.
 * Directional and spot lights must implement this to provide
 * their world-space direction computed from transform rotation.
 */
export interface ILightDirectionProvider {
  /**
   * Get the world-space direction the light is pointing.
   * Computed from the entity's transform rotation.
   * For directional lights, this is the direction light rays travel.
   */
  getWorldDirection(): [number, number, number];
}

/**
 * Type guard to check if an object provides light direction.
 */
export function isLightDirectionProvider(obj: unknown): obj is ILightDirectionProvider {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'getWorldDirection' in obj &&
    typeof (obj as ILightDirectionProvider).getWorldDirection === 'function'
  );
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
    castShadows: false,
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

/**
 * Create a default spot light component.
 *
 * @returns A new ILightComponent with default values
 */
export function createDefaultSpotLightComponent(): ILightComponent {
  return {
    type: 'light',
    lightType: 'spot',
    color: [1, 1, 1],
    intensity: 1,
    enabled: true,
    range: 10,
    spotAngle: 30,
    innerSpotRatio: 0.8,
  };
}
