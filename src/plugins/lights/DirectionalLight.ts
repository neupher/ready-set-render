/**
 * Directional Light Entity
 *
 * Represents a directional light in the scene (like the sun).
 * Implements IEntity for component-based property display in the Inspector.
 *
 * Directional lights:
 * - Have parallel rays (infinite distance)
 * - Direction is determined by the entity's rotation (like Unity)
 * - Affect all objects equally regardless of distance
 * - Position doesn't affect lighting (only used for gizmo placement)
 *
 * Light direction is computed from transform rotation using the standard
 * forward vector (0, 0, -1) rotated by the entity's rotation.
 * This means rotating the light entity changes where it shines.
 */

import type {
  Transform,
  IComponent,
  IEntity,
  ICloneable,
} from '@core/interfaces';
import { cloneEntityBase } from '@core/interfaces';
import type { ILightComponent, ILightDirectionProvider } from '@core/interfaces/ILightComponent';
import { createDefaultTransform } from '@core/interfaces';
import { createDefaultDirectionalLightComponent } from '@core/interfaces/ILightComponent';
import { EntityIdGenerator } from '@utils/EntityIdGenerator';
import { degToRad } from '@utils/math';

/**
 * Configuration options for creating a DirectionalLight.
 */
export interface DirectionalLightConfig {
  /** Display name (defaults to 'Directional Light') */
  name?: string;
  /** Initial rotation in Euler angles (degrees) [X, Y, Z] */
  rotation?: [number, number, number];
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
 * The light direction is computed from the entity's transform rotation.
 * Default rotation of [50, -30, 0] produces a typical sun-like direction
 * pointing diagonally downward (similar to -0.5, -1, -0.3).
 *
 * To change light direction:
 * - Rotate the entity using transform.rotation
 * - The light will shine in the direction the entity's -Z axis points
 */
export class DirectionalLight implements IEntity, ICloneable, ILightDirectionProvider {
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

    // Set initial rotation (affects light direction)
    // Default: X=50° (tilted down), Y=-30° (rotated around Y)
    // This produces a direction similar to [-0.5, -0.77, -0.4]
    if (config.rotation) {
      this.transform.rotation = [...config.rotation];
    } else {
      // Default rotation for a nice sun-like angle
      this.transform.rotation = [50, -30, 0];
    }

    // Initialize light component
    const lightComponent = createDefaultDirectionalLightComponent();

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
  // ILightDirectionProvider Implementation
  // =========================================

  /**
   * Get the world-space direction the light is pointing.
   *
   * Computed from the entity's transform rotation by rotating
   * the forward vector (0, 0, -1) by the rotation.
   *
   * This is the direction that light rays travel.
   */
  getWorldDirection(): [number, number, number] {
    const { rotation } = this.transform;

    // Convert Euler angles to radians
    const rx = degToRad(rotation[0]); // Pitch (around X)
    const ry = degToRad(rotation[1]); // Yaw (around Y)
    const rz = degToRad(rotation[2]); // Roll (around Z)

    // Start with forward vector (0, 0, -1) in local space
    // and rotate it by the entity's rotation
    //
    // Rotation order: Z * Y * X (same as model matrix)
    // We apply in reverse order to the vector

    // Initial forward vector
    let x = 0;
    let y = 0;
    let z = -1;

    // Rotate around X (pitch)
    const cosX = Math.cos(rx);
    const sinX = Math.sin(rx);
    let y1 = y * cosX - z * sinX;
    let z1 = y * sinX + z * cosX;
    y = y1;
    z = z1;

    // Rotate around Y (yaw)
    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);
    let x1 = x * cosY + z * sinY;
    let z2 = -x * sinY + z * cosY;
    x = x1;
    z = z2;

    // Rotate around Z (roll)
    const cosZ = Math.cos(rz);
    const sinZ = Math.sin(rz);
    let x2 = x * cosZ - y * sinZ;
    let y2 = x * sinZ + y * cosZ;
    x = x2;
    y = y2;

    // Normalize (should already be unit length, but ensure precision)
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len > 0.0001) {
      x /= len;
      y /= len;
      z /= len;
    }

    return [x, y, z];
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
   * Delegates to getWorldDirection() which computes from transform.
   */
  getDirection(): [number, number, number] {
    return this.getWorldDirection();
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

  // =========================================
  // ICloneable Implementation
  // =========================================

  /**
   * Create a deep copy of this DirectionalLight.
   */
  clone(): DirectionalLight {
    const light = this.getLightComponent();
    const cloned = new DirectionalLight({
      name: this.name,
      rotation: [...this.transform.rotation],
      color: [...light.color],
      intensity: light.intensity,
      enabled: light.enabled,
    });
    cloneEntityBase(this, cloned);
    return cloned;
  }
}
