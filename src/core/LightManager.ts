/**
 * Light Manager
 *
 * Collects and provides active lights from the scene for rendering.
 * Used by renderers to gather light data for shader uniforms.
 *
 * Supports multiple light types:
 * - Directional lights (direction from transform rotation)
 * - Point lights (future)
 * - Spot lights (future)
 */

import type { EventBus } from '@core/EventBus';
import type { SceneGraph } from '@core/SceneGraph';
import type { ILightComponent, LightType } from '@core/interfaces/ILightComponent';
import { isLightDirectionProvider } from '@core/interfaces/ILightComponent';

/**
 * Light data structure for shader uniforms.
 */
export interface LightData {
  /** Light type */
  lightType: LightType;
  /** Normalized direction (for directional/spot lights) */
  direction: [number, number, number];
  /** World position (for point/spot lights) */
  position: [number, number, number];
  /** Light color with intensity applied */
  color: [number, number, number];
  /** Whether the light is enabled */
  enabled: boolean;
  /** Range for point/spot lights */
  range?: number;
  /** Spot angle for spot lights */
  spotAngle?: number;
}

/**
 * Internal representation of a light entity.
 */
interface LightEntity {
  id: string;
  transform: {
    position: [number, number, number];
  };
  hasComponent(type: string): boolean;
  getComponent<T>(type: string): T | null;
  getWorldDirection?(): [number, number, number];
  getEffectiveColor?(): [number, number, number];
  isEnabled?(): boolean;
}

/**
 * Configuration for LightManager.
 */
export interface LightManagerConfig {
  eventBus: EventBus;
  sceneGraph: SceneGraph;
}

/**
 * Maximum number of lights supported in shaders.
 * Keep in sync with ForwardRenderer MAX_LIGHTS constant.
 */
export const MAX_LIGHTS = 8;

/**
 * Manages scene lights and provides light data for rendering.
 *
 * Light direction for directional/spot lights is computed from
 * the entity's transform rotation, NOT stored in the component.
 *
 * @example
 * ```typescript
 * const lightManager = new LightManager({ eventBus, sceneGraph });
 * const lights = lightManager.getActiveLights();
 * // Use in renderer: gl.uniform3fv(lightDirLoc, lights[0].direction);
 * ```
 */
export class LightManager {
  private readonly eventBus: EventBus;
  private readonly sceneGraph: SceneGraph;
  private cachedLights: LightEntity[] = [];
  private isDirty = true;

  constructor(config: LightManagerConfig) {
    this.eventBus = config.eventBus;
    this.sceneGraph = config.sceneGraph;

    this.setupEventListeners();
  }

  /**
   * Get all active lights in the scene.
   * Returns an array of LightData for shader uniforms.
   */
  getActiveLights(): LightData[] {
    if (this.isDirty) {
      this.refreshLightCache();
      this.isDirty = false;
    }

    return this.cachedLights
      .filter(light => this.isLightEnabled(light))
      .slice(0, MAX_LIGHTS)
      .map(light => this.getLightData(light));
  }

  /**
   * Get the primary directional light (first enabled directional light).
   * Returns null if no directional lights exist.
   */
  getPrimaryDirectionalLight(): LightData | null {
    const lights = this.getActiveLights();
    const directional = lights.find(l => l.lightType === 'directional');
    return directional ?? null;
  }

  /**
   * Get all directional lights.
   */
  getDirectionalLights(): LightData[] {
    return this.getActiveLights().filter(l => l.lightType === 'directional');
  }

  /**
   * Get all point lights.
   */
  getPointLights(): LightData[] {
    return this.getActiveLights().filter(l => l.lightType === 'point');
  }

  /**
   * Get ambient light color.
   * Currently returns a fixed ambient approximation.
   * Future: Make configurable via scene settings.
   */
  getAmbientColor(): [number, number, number] {
    return [0.15, 0.15, 0.2]; // Slightly blue ambient
  }

  /**
   * Force a refresh of the light cache on next access.
   */
  invalidate(): void {
    this.isDirty = true;
  }

  /**
   * Get the count of active lights.
   */
  getActiveLightCount(): number {
    return this.getActiveLights().length;
  }

  private setupEventListeners(): void {
    this.eventBus.on('scene:objectAdded', () => {
      this.isDirty = true;
    });

    this.eventBus.on('scene:objectRemoved', () => {
      this.isDirty = true;
    });

    this.eventBus.on('entity:propertyUpdated', () => {
      this.isDirty = true;
    });
  }

  private refreshLightCache(): void {
    this.cachedLights = [];

    const traverse = (objects: unknown[]): void => {
      for (const obj of objects) {
        if (this.isLightEntity(obj)) {
          this.cachedLights.push(obj as LightEntity);
        }

        // Traverse children
        const children = (obj as { children?: unknown[] }).children;
        if (children && Array.isArray(children)) {
          traverse(children);
        }
      }
    };

    traverse(this.sceneGraph.getRoot().children);
  }

  private isLightEntity(obj: unknown): boolean {
    if (!obj || typeof obj !== 'object') return false;

    const entity = obj as {
      hasComponent?: (type: string) => boolean;
    };

    if (typeof entity.hasComponent !== 'function') return false;
    return entity.hasComponent('light');
  }

  private isLightEnabled(light: LightEntity): boolean {
    // Check for isEnabled method
    if (typeof light.isEnabled === 'function') {
      return light.isEnabled();
    }

    // Fallback to component check
    const component = light.getComponent<ILightComponent>('light');
    return component?.enabled ?? false;
  }

  private getLightData(light: LightEntity): LightData {
    const component = light.getComponent<ILightComponent>('light');

    // Get direction from ILightDirectionProvider interface
    let direction: [number, number, number] = [0, -1, 0];
    if (isLightDirectionProvider(light)) {
      direction = light.getWorldDirection();
    }

    // Get effective color (color * intensity)
    let color: [number, number, number] = [1, 1, 1];
    if (typeof light.getEffectiveColor === 'function') {
      color = light.getEffectiveColor();
    } else if (component) {
      const intensity = component.intensity ?? 1;
      color = [
        component.color[0] * intensity,
        component.color[1] * intensity,
        component.color[2] * intensity,
      ];
    }

    return {
      lightType: component?.lightType ?? 'directional',
      direction,
      position: light.transform.position,
      color,
      enabled: component?.enabled ?? true,
      range: component?.range,
      spotAngle: component?.spotAngle,
    };
  }
}
