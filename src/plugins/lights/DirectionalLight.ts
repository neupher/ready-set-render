/**
 * Directional Light Entity
 *
 * Represents a directional light in the scene (like the sun).
 * Implements IEntity for component-based property display in the Inspector.
 *
 * Directional lights:
 * - Have parallel rays (infinite distance)
 * - Are defined by direction, not position
 * - Affect all objects equally regardless of distance
 */

import type {
  Transform,
  IComponent,
  IEntity,
} from '@core/interfaces';
import type { ILightComponent } from '@core/interfaces/ILightComponent';
import { createDefaultTransform } from '@core/interfaces';
import { createDefaultDirectionalLightComponent } from '@core/interfaces/ILightComponent';
import { EntityIdGenerator } from '@utils/EntityIdGenerator';
import { vec3Normalize } from '@utils/math';

/**
 * Configuration options for creating a DirectionalLight.
 */
export interface DirectionalLightConfig {
  /** Display name (defaults to 'Directional Light') */
  name?: string;
  /** Light direction vector (will be normalized) */
  direction?: [number, number, number];
  /** Light color RGB (0-1) */
  color?: [number, number, number];
  /** Light intensity (0-∞) */
  intensity?: number;
  /** Whether the light is enabled */
  enabled?: boolean;
}

/**
 * Directional Light entity class.
 *
 * Note: Position in transform is ignored for directional lights,
 * only direction matters. However, rotation can be used to visualize
 * light direction in the editor (future gizmo).
 */
export class DirectionalLight implements IEntity {
  readonly id: string;
  readonly entityId: number;
  name: string;
  parent: IEntity | null = null;
  children: IEntity[] = [];
  transform: Transform;

  private readonly components: Map<string, IComponent> = new Map();

  constructor(config: DirectionalLightConfig = {}) {
    this.id = crypto.randomUUID();
    this.entityId = EntityIdGenerator.next();
    this.name = config.name ?? 'Directional Light';
    this.transform = createDefaultTransform();

    // Initialize light component
    const lightComponent = createDefaultDirectionalLightComponent();

    if (config.direction) {
      lightComponent.direction = vec3Normalize(config.direction);
    }
    if (config.color) {
      lightComponent.color = [...config.color];
    }
    if (config.intensity !== undefined) {
      lightComponent.intensity = config.intensity;
    }
    if (config.enabled !== undefined) {
      lightComponent.enabled = config.enabled;
    }

    this.components.set('light', lightComponent);
  }

  // =========================================
  // IEntity Implementation
  // =========================================

  /**
   * Get all components attached to this entity.
   */
  getComponents(): IComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get a specific component by type.
   */
  getComponent<T extends IComponent>(type: string): T | null {
    const component = this.components.get(type);
    return component ? (component as T) : null;
  }

  /**
   * Check if this entity has a specific component type.
   */
  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  // =========================================
  // Light-specific Methods
  // =========================================

  /**
   * Get the light component.
   */
  getLightComponent(): ILightComponent {
    return this.components.get('light') as ILightComponent;
  }

  /**
   * Get the normalized light direction.
   */
  getDirection(): [number, number, number] {
    const light = this.getLightComponent();
    if (light.direction) {
      return [light.direction[0], light.direction[1], light.direction[2]];
    }
    return [-0.5, -1, -0.5];
  }

  /**
   * Set the light direction (will be normalized).
   */
  setDirection(direction: [number, number, number]): void {
    const light = this.getLightComponent();
    light.direction = vec3Normalize(direction);
  }

  /**
   * Get the light color.
   */
  getColor(): [number, number, number] {
    const light = this.getLightComponent();
    return [light.color[0], light.color[1], light.color[2]];
  }

  /**
   * Set the light color.
   */
  setColor(color: [number, number, number]): void {
    const light = this.getLightComponent();
    light.color = [color[0], color[1], color[2]];
  }

  /**
   * Get the light intensity.
   */
  getIntensity(): number {
    return this.getLightComponent().intensity;
  }

  /**
   * Set the light intensity.
   */
  setIntensity(intensity: number): void {
    this.getLightComponent().intensity = intensity;
  }

  /**
   * Check if the light is enabled.
   */
  isEnabled(): boolean {
    return this.getLightComponent().enabled;
  }

  /**
   * Enable or disable the light.
   */
  setEnabled(enabled: boolean): void {
    this.getLightComponent().enabled = enabled;
  }

  /**
   * Get the effective light color (color * intensity).
   * Used by renderers for uniform calculation.
   */
  getEffectiveColor(): [number, number, number] {
    const light = this.getLightComponent();
    const intensity = light.intensity;
    return [
      light.color[0] * intensity,
      light.color[1] * intensity,
      light.color[2] * intensity,
    ];
  }
}
