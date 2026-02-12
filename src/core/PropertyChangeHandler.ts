/**
 * PropertyChangeHandler
 *
 * Centralized handler that routes property change events through the Command History.
 * ALL property changes go through CommandHistory for full undo/redo support.
 *
 * Architecture:
 * - Transform properties (position, rotation, scale) handled for ALL entities
 * - Component-specific properties handled by checking hasComponent()
 * - All changes create Commands for undo/redo support
 * - Rapid changes are coalesced (e.g., slider drags become single undo entry)
 *
 * Data Flow:
 * 1. PropertiesPanel emits 'object:propertyChanged' event
 * 2. PropertyChangeHandler captures OLD value from entity
 * 3. PropertyChangeHandler creates PropertyChangeCommand
 * 4. CommandHistory.execute() applies change and adds to undo stack
 * 5. PropertyChangeCommand emits 'entity:propertyUpdated' for UI refresh
 * 6. Renderer reads updated transform on next frame (automatic)
 *
 * @example
 * ```typescript
 * const handler = new PropertyChangeHandler({
 *   eventBus,
 *   sceneGraph,
 *   commandHistory  // Required for undo/redo
 * });
 * // Handler auto-subscribes to events
 * // All changes are now undoable via Ctrl+Z
 * ```
 */

import type { EventBus } from './EventBus';
import type { SceneGraph } from './SceneGraph';
import type { CommandHistory } from './commands/CommandHistory';
import type { ISceneObject, IEntity, IComponent } from './interfaces';
import type { ICameraComponent } from './interfaces/ICameraComponent';
import { PropertyChangeCommand } from './commands/PropertyChangeCommand';
import { isPropertyEditable } from './interfaces';

/**
 * Property change event payload.
 */
export interface PropertyChangeEvent {
  /** Entity ID */
  id: string;
  /** Property path (e.g., 'position.x', 'camera.fieldOfView') */
  property: string;
  /** New value */
  value: unknown;
}

/**
 * Event payload emitted after a property is updated.
 */
export interface PropertyUpdatedEvent {
  /** Entity ID */
  id: string;
  /** Property path that was updated */
  property: string;
  /** The entity that was updated */
  entity: ISceneObject;
}

export interface PropertyChangeHandlerOptions {
  /** Event bus for subscribing to and emitting events */
  eventBus: EventBus;
  /** Scene graph for finding entities by ID */
  sceneGraph: SceneGraph;
  /** Command history for undo/redo support (optional for backwards compatibility) */
  commandHistory?: CommandHistory;
}

/**
 * Type guard to check if an object is an IEntity.
 */
function isEntity(obj: unknown): obj is IEntity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'hasComponent' in obj &&
    'getComponent' in obj &&
    typeof (obj as IEntity).hasComponent === 'function' &&
    typeof (obj as IEntity).getComponent === 'function'
  );
}

/**
 * Handles property change events and routes them through CommandHistory.
 * All changes are undoable when CommandHistory is provided.
 */
export class PropertyChangeHandler {
  private readonly eventBus: EventBus;
  private readonly sceneGraph: SceneGraph;
  private readonly commandHistory: CommandHistory | null;

  constructor(options: PropertyChangeHandlerOptions) {
    this.eventBus = options.eventBus;
    this.sceneGraph = options.sceneGraph;
    this.commandHistory = options.commandHistory ?? null;

    // Bind and subscribe to property change events
    this.handlePropertyChange = this.handlePropertyChange.bind(this);
    this.eventBus.on('object:propertyChanged', this.handlePropertyChange);
  }

  /**
   * Handle a property change event.
   * Captures old value, creates command, and executes via CommandHistory.
   */
  private handlePropertyChange(event: PropertyChangeEvent): void {
    const { id, property, value } = event;

    // Find the entity in the scene graph
    const entity = this.sceneGraph.find(id);
    if (!entity) {
      console.warn(`PropertyChangeHandler: Entity not found with id '${id}'`);
      return;
    }

    // Get the current (old) value before applying changes
    const oldValue = this.getPropertyValue(entity, property);

    // If we have CommandHistory, create and execute a command
    if (this.commandHistory) {
      const command = new PropertyChangeCommand({
        entityId: id,
        property,
        oldValue,
        newValue: this.normalizeValue(property, value),
        sceneGraph: this.sceneGraph,
        eventBus: this.eventBus
      });

      this.commandHistory.execute(command);
    } else {
      // Fallback: direct mutation (for backwards compatibility or tests)
      this.applyPropertyDirectly(entity, property, value);
    }
  }

  /**
   * Get the current value of a property from an entity.
   * Used to capture old value before applying changes.
   */
  private getPropertyValue(entity: ISceneObject, property: string): unknown {
    // Handle name
    if (property === 'name') {
      return entity.name;
    }

    // Handle transform properties
    if (this.isTransformProperty(property)) {
      return this.getTransformValue(entity, property);
    }

    // Handle component properties
    if (this.isComponentProperty(property)) {
      return this.getComponentValue(entity, property);
    }

    // Fallback to IPropertyEditable
    if (isPropertyEditable(entity)) {
      return entity.getProperty(property);
    }

    return undefined;
  }

  /**
   * Get a transform property value.
   */
  private getTransformValue(entity: ISceneObject, property: string): unknown {
    const parts = property.split('.');
    if (parts.length !== 2) return undefined;

    const [transformProp, axis] = parts;
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];

    if (axisIndex === undefined) return undefined;

    switch (transformProp) {
      case 'position':
        return entity.transform.position[axisIndex];
      case 'rotation':
        return entity.transform.rotation[axisIndex];
      case 'scale':
        return entity.transform.scale[axisIndex];
      default:
        return undefined;
    }
  }

  /**
   * Get a component property value.
   */
  private getComponentValue(entity: ISceneObject, property: string): unknown {
    if (!isEntity(entity)) return undefined;

    const parts = property.split('.');
    if (parts.length < 2) return undefined;

    const [componentType, ...propertyPath] = parts;
    const propertyName = propertyPath.join('.');

    switch (componentType) {
      case 'camera':
        return this.getCameraValue(entity, propertyName);
      case 'material':
        return this.getMaterialValue(entity, propertyName);
      case 'light':
        return this.getLightValue(entity, propertyName);
      default:
        return undefined;
    }
  }

  /**
   * Get a camera component value.
   */
  private getCameraValue(entity: IEntity, property: string): unknown {
    if (!entity.hasComponent('camera')) return undefined;

    const cameraComponent = entity.getComponent<ICameraComponent>('camera');
    if (!cameraComponent) return undefined;

    switch (property) {
      case 'fieldOfView':
        return cameraComponent.fieldOfView;
      case 'nearClipPlane':
        return cameraComponent.nearClipPlane;
      case 'farClipPlane':
        return cameraComponent.farClipPlane;
      case 'clearFlags':
        return cameraComponent.clearFlags;
      case 'backgroundColor':
        return [...cameraComponent.backgroundColor]; // Return copy
      default:
        return undefined;
    }
  }

  /**
   * Get a material component value.
   */
  private getMaterialValue(entity: IEntity, property: string): unknown {
    if (!entity.hasComponent('material')) return undefined;

    const materialComponent = entity.getComponent<IComponent>('material');
    if (!materialComponent) return undefined;

    const material = materialComponent as IComponent & {
      color?: [number, number, number];
      opacity?: number;
      transparent?: boolean;
      roughness?: number;
      metallic?: number;
      shaderName?: string;
      materialAssetRef?: { uuid: string; type: string };
    };

    switch (property) {
      case 'color':
        return material.color ? [...material.color] : undefined;
      case 'opacity':
        return material.opacity;
      case 'transparent':
        return material.transparent;
      case 'roughness':
        return material.roughness;
      case 'metallic':
        return material.metallic;
      case 'shaderName':
        return material.shaderName;
      default:
        return undefined;
    }
  }

  /**
   * Get a light component value.
   */
  private getLightValue(entity: IEntity, property: string): unknown {
    if (!entity.hasComponent('light')) return undefined;

    const lightComponent = entity.getComponent<IComponent>('light');
    if (!lightComponent) return undefined;

    const light = lightComponent as IComponent & {
      lightType?: string;
      color?: [number, number, number];
      intensity?: number;
      enabled?: boolean;
      range?: number;
      spotAngle?: number;
    };

    switch (property) {
      case 'lightType':
        return light.lightType;
      case 'color':
        return light.color ? [...light.color] : undefined;
      case 'intensity':
        return light.intensity;
      case 'enabled':
        return light.enabled;
      case 'range':
        return light.range;
      case 'spotAngle':
        return light.spotAngle;
      default:
        return undefined;
    }
  }

  /**
   * Normalize a value for storage in command.
   * Converts hex colors to RGB arrays, etc.
   */
  private normalizeValue(property: string, value: unknown): unknown {
    // Convert hex color strings to RGB arrays for camera, material, and light colors
    if (
      (property === 'camera.backgroundColor' || property === 'material.color' || property === 'light.color') &&
      typeof value === 'string' &&
      value.startsWith('#')
    ) {
      const hex = value.slice(1);
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      return [r, g, b];
    }

    return value;
  }

  /**
   * Check if a property path is a transform property.
   */
  private isTransformProperty(property: string): boolean {
    const parts = property.split('.');
    if (parts.length !== 2) return false;
    const [prop] = parts;
    return prop === 'position' || prop === 'rotation' || prop === 'scale';
  }

  /**
   * Check if a property path is a component property.
   */
  private isComponentProperty(property: string): boolean {
    const parts = property.split('.');
    if (parts.length < 2) return false;
    const [component] = parts;
    return component === 'camera' || component === 'material' || component === 'light';
  }

  /**
   * Apply a property change directly (fallback when no CommandHistory).
   * This is the legacy behavior for backwards compatibility.
   */
  private applyPropertyDirectly(
    entity: ISceneObject,
    property: string,
    value: unknown
  ): void {
    let success = false;

    if (property === 'name') {
      success = this.handleNameChange(entity, value);
    } else if (this.isTransformProperty(property)) {
      success = this.handleTransformChange(entity, property, value);
    } else if (this.isComponentProperty(property)) {
      success = this.handleComponentProperty(entity, property, value);
    } else if (isPropertyEditable(entity)) {
      success = entity.setProperty(property, value);
    }

    if (success) {
      this.eventBus.emit('entity:propertyUpdated', {
        id: entity.id,
        property,
        entity
      } as PropertyUpdatedEvent);
    }
  }

  /**
   * Handle name property changes (direct apply, used in fallback mode).
   */
  private handleNameChange(entity: ISceneObject, value: unknown): boolean {
    const oldName = entity.name;
    entity.name = String(value);

    this.eventBus.emit('scene:objectRenamed', {
      object: entity,
      oldName,
      newName: entity.name
    });

    return true;
  }

  /**
   * Handle transform property changes (direct apply, used in fallback mode).
   */
  private handleTransformChange(
    entity: ISceneObject,
    property: string,
    value: unknown
  ): boolean {
    const parts = property.split('.');
    if (parts.length !== 2) return false;

    const [transformProp, axis] = parts;
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];

    if (axisIndex === undefined || typeof value !== 'number') {
      return false;
    }

    switch (transformProp) {
      case 'position':
        entity.transform.position[axisIndex] = value;
        return true;
      case 'rotation':
        entity.transform.rotation[axisIndex] = value;
        return true;
      case 'scale':
        entity.transform.scale[axisIndex] = value;
        return true;
      default:
        return false;
    }
  }

  /**
   * Handle component-specific property changes (direct apply, used in fallback mode).
   */
  private handleComponentProperty(
    entity: ISceneObject,
    property: string,
    value: unknown
  ): boolean {
    const parts = property.split('.');
    if (parts.length < 2) return false;

    const [componentType, ...propertyPath] = parts;
    const propertyName = propertyPath.join('.');

    if (!isEntity(entity)) return false;

    switch (componentType) {
      case 'camera':
        return this.handleCameraProperty(entity, propertyName, value);
      case 'material':
        return this.handleMaterialProperty(entity, propertyName, value);
      default:
        return false;
    }
  }

  /**
   * Handle camera component property changes (direct apply, used in fallback mode).
   */
  private handleCameraProperty(
    entity: IEntity,
    property: string,
    value: unknown
  ): boolean {
    if (!entity.hasComponent('camera')) return false;

    const cameraComponent = entity.getComponent<ICameraComponent>('camera');
    if (!cameraComponent) return false;

    switch (property) {
      case 'fieldOfView':
        if (typeof value === 'number') {
          cameraComponent.fieldOfView = value;
          return true;
        }
        break;
      case 'nearClipPlane':
        if (typeof value === 'number') {
          cameraComponent.nearClipPlane = value;
          return true;
        }
        break;
      case 'farClipPlane':
        if (typeof value === 'number') {
          cameraComponent.farClipPlane = value;
          return true;
        }
        break;
      case 'clearFlags':
        if (
          value === 'skybox' ||
          value === 'solidColor' ||
          value === 'depthOnly' ||
          value === 'none'
        ) {
          cameraComponent.clearFlags = value;
          return true;
        }
        break;
      case 'backgroundColor':
        if (typeof value === 'string' && value.startsWith('#')) {
          const hex = value.slice(1);
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;
          cameraComponent.backgroundColor = [r, g, b];
          return true;
        }
        break;
    }

    return false;
  }

  /**
   * Handle material component property changes (direct apply, used in fallback mode).
   */
  private handleMaterialProperty(
    entity: IEntity,
    property: string,
    value: unknown
  ): boolean {
    if (!entity.hasComponent('material')) return false;

    const materialComponent = entity.getComponent<IComponent>('material');
    if (!materialComponent) return false;

    const material = materialComponent as IComponent & {
      color?: [number, number, number];
      opacity?: number;
      transparent?: boolean;
      roughness?: number;
      metallic?: number;
      shaderName?: string;
    };

    switch (property) {
      case 'color':
        if (typeof value === 'string' && value.startsWith('#')) {
          const hex = value.slice(1);
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;
          material.color = [r, g, b];
          return true;
        }
        break;
      case 'opacity':
        if (typeof value === 'number') {
          material.opacity = value;
          return true;
        }
        break;
      case 'transparent':
        if (typeof value === 'boolean') {
          material.transparent = value;
          return true;
        }
        break;
      case 'roughness':
        if (typeof value === 'number') {
          material.roughness = value;
          return true;
        }
        break;
      case 'metallic':
        if (typeof value === 'number') {
          material.metallic = value;
          return true;
        }
        break;
      case 'shaderName':
        if (typeof value === 'string') {
          material.shaderName = value;
          return true;
        }
        break;
    }

    return false;
  }

  /**
   * Unsubscribe from events and clean up.
   */
  dispose(): void {
    this.eventBus.off('object:propertyChanged', this.handlePropertyChange);
  }
}
