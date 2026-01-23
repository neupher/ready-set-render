/**
 * Light Manager
 *
 * Collects and provides active lights from the scene for rendering.
 * Used by renderers to gather light data for shader uniforms.
 */

import type { EventBus } from '@core/EventBus';
import type { SceneGraph } from '@core/SceneGraph';
import type { ILightComponent } from '@core/interfaces/ILightComponent';
import type { DirectionalLight } from '@plugins/lights/DirectionalLight';

/**
 * Light data structure for shader uniforms.
 */
export interface LightData {
  /** Normalized direction (for directional lights) */
  direction: [number, number, number];
  /** Light color with intensity applied */
  color: [number, number, number];
  /** Whether the light is enabled */
  enabled: boolean;
}

/**
 * Configuration for LightManager.
 */
export interface LightManagerConfig {
  eventBus: EventBus;
  sceneGraph: SceneGraph;
}

/**
 * Manages scene lights and provides light data for rendering.
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
  private cachedLights: DirectionalLight[] = [];
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
      .filter(light => light.isEnabled())
      .map(light => ({
        direction: light.getDirection(),
        color: light.getEffectiveColor(),
        enabled: light.isEnabled(),
      }));
  }

  /**
   * Get the primary directional light (first enabled directional light).
   * Returns null if no directional lights exist.
   */
  getPrimaryDirectionalLight(): LightData | null {
    const lights = this.getActiveLights();
    return lights.length > 0 ? lights[0] : null;
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
        if (this.isDirectionalLight(obj)) {
          this.cachedLights.push(obj);
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

  private isDirectionalLight(obj: unknown): obj is DirectionalLight {
    if (!obj || typeof obj !== 'object') return false;

    const entity = obj as {
      hasComponent?: (type: string) => boolean;
      getComponent?: (type: string) => ILightComponent | null;
    };

    if (typeof entity.hasComponent !== 'function') return false;
    if (!entity.hasComponent('light')) return false;

    const light = entity.getComponent?.('light');
    return light?.lightType === 'directional';
  }
}
