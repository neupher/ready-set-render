/**
 * PropertyChangeHandler
 *
 * Centralized handler that routes property change events to entities.
 * Handles ALL entity properties without requiring entities to implement IPropertyEditable.
 *
 * Architecture:
 * - Transform properties (position, rotation, scale) handled for ALL entities
 * - Component-specific properties handled by checking hasComponent()
 * - IPropertyEditable is optional for entities with truly custom properties
 *
 * Data Flow:
 * 1. PropertiesPanel emits 'object:propertyChanged' event
 * 2. PropertyChangeHandler receives event, finds entity in SceneGraph
 * 3. Handler manipulates entity data directly (transform, components)
 * 4. Handler emits 'entity:propertyUpdated' for UI refresh
 * 5. Renderer reads updated transform on next frame (automatic)
 *
 * Benefits:
 * - Zero code needed in entities for standard properties
 * - New primitives work automatically
 * - Imported meshes editable immediately
 * - Single source of truth for property handling
 *
 * @example
 * ```typescript
 * const handler = new PropertyChangeHandler({
 *   eventBus,
 *   sceneGraph
 * });
 * // Handler auto-subscribes to events
 * // No manual intervention needed after construction
 * ```
 */

import type { EventBus } from './EventBus';
import type { SceneGraph } from './SceneGraph';
import type { ISceneObject, IEntity, IComponent } from './interfaces';
import type { ICameraComponent } from './interfaces/ICameraComponent';
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
 * Handles property change events and routes them to entities.
 * Uses centralized handlers for standard properties, eliminating
 * the need for each entity to implement property handling code.
 */
export class PropertyChangeHandler {
  private readonly eventBus: EventBus;
  private readonly sceneGraph: SceneGraph;

  constructor(options: PropertyChangeHandlerOptions) {
    this.eventBus = options.eventBus;
    this.sceneGraph = options.sceneGraph;

    // Bind and subscribe to property change events
    this.handlePropertyChange = this.handlePropertyChange.bind(this);
    this.eventBus.on('object:propertyChanged', this.handlePropertyChange);
  }

  /**
   * Handle a property change event.
   * Routes the change through centralized handlers based on property path.
   */
  private handlePropertyChange(event: PropertyChangeEvent): void {
    const { id, property, value } = event;

    // Find the entity in the scene graph
    const entity = this.sceneGraph.find(id);
    if (!entity) {
      console.warn(`PropertyChangeHandler: Entity not found with id '${id}'`);
      return;
    }

    let success = false;

    // 1. Handle name changes (direct property on ISceneObject)
    if (property === 'name') {
      success = this.handleNameChange(entity, value);
    }
    // 2. Handle transform properties (ALL entities have transforms)
    else if (this.isTransformProperty(property)) {
      success = this.handleTransformChange(entity, property, value);
    }
    // 3. Handle component-specific properties (check if entity has the component)
    else if (this.isComponentProperty(property)) {
      success = this.handleComponentProperty(entity, property, value);
    }
    // 4. Fallback to IPropertyEditable for custom properties
    else if (isPropertyEditable(entity)) {
      success = entity.setProperty(property, value);
    }

    if (success) {
      this.eventBus.emit('entity:propertyUpdated', {
        id,
        property,
        entity
      } as PropertyUpdatedEvent);
    } else {
      console.warn(
        `PropertyChangeHandler: Failed to set property '${property}' on entity '${id}'`
      );
    }
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
    // Known component types that have editable properties
    return component === 'camera' || component === 'material';
  }

  /**
   * Handle name property changes.
   */
  private handleNameChange(entity: ISceneObject, value: unknown): boolean {
    const oldName = entity.name;
    entity.name = String(value);

    // Emit rename event for UI components that need to update
    this.eventBus.emit('scene:objectRenamed', {
      object: entity,
      oldName,
      newName: entity.name
    });

    return true;
  }

  /**
   * Handle transform property changes.
   * Works for ALL entities since they all have transforms.
   */
  private handleTransformChange(
    entity: ISceneObject,
    property: string,
    value: unknown
  ): boolean {
    const parts = property.split('.');

    if (parts.length !== 2) {
      return false;
    }

    const [transformProp, axis] = parts;
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];

    if (axisIndex === undefined) {
      return false;
    }

    if (typeof value !== 'number') {
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
   * Handle component-specific property changes.
   * Uses hasComponent() to check if entity has the relevant component.
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

    // Check if entity is an IEntity with component support
    if (!isEntity(entity)) {
      return false;
    }

    // Route to component-specific handlers
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
   * Handle camera component property changes.
   */
  private handleCameraProperty(
    entity: IEntity,
    property: string,
    value: unknown
  ): boolean {
    if (!entity.hasComponent('camera')) {
      return false;
    }

    const cameraComponent = entity.getComponent<ICameraComponent>('camera');
    if (!cameraComponent) {
      return false;
    }

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
        // Handle hex color string
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
   * Handle material component property changes.
   * Foundation for future PBR material editing.
   */
  private handleMaterialProperty(
    entity: IEntity,
    property: string,
    value: unknown
  ): boolean {
    if (!entity.hasComponent('material')) {
      return false;
    }

    const materialComponent = entity.getComponent<IComponent>('material');
    if (!materialComponent) {
      return false;
    }

    // Cast to access material-specific properties
    const material = materialComponent as IComponent & {
      color?: [number, number, number];
      opacity?: number;
      transparent?: boolean;
      roughness?: number;
      metallic?: number;
    };

    switch (property) {
      case 'color':
        // Handle hex color string
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
