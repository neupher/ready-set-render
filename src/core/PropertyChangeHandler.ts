/**
 * PropertyChangeHandler
 *
 * Centralized handler that routes property change events to entities.
 * Acts as the bridge between UI (PropertiesPanel) and entity data.
 *
 * Data Flow:
 * 1. PropertiesPanel emits 'object:propertyChanged' event
 * 2. PropertyChangeHandler receives event, finds entity in SceneGraph
 * 3. Handler calls entity.setProperty() to update data
 * 4. Handler emits 'entity:propertyUpdated' for UI refresh
 * 5. Renderer reads updated transform on next frame (automatic)
 *
 * Future Support:
 * - Transform gizmos will emit same 'object:propertyChanged' events
 * - Scripts/automation can emit same events
 * - All go through this single handler
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
import type { ISceneObject } from './interfaces';
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
 * Handles property change events and routes them to entities.
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
   * Routes the change to the appropriate entity and emits update notification.
   */
  private handlePropertyChange(event: PropertyChangeEvent): void {
    const { id, property, value } = event;

    // Find the entity in the scene graph
    const entity = this.sceneGraph.find(id);
    if (!entity) {
      console.warn(`PropertyChangeHandler: Entity not found with id '${id}'`);
      return;
    }

    // Handle name changes specially (direct property on ISceneObject)
    if (property === 'name') {
      const oldName = entity.name;
      entity.name = String(value);

      // Emit rename event for UI components that need to update
      this.eventBus.emit('scene:objectRenamed', {
        object: entity,
        oldName,
        newName: entity.name
      });

      // Emit update notification
      this.eventBus.emit('entity:propertyUpdated', {
        id,
        property,
        entity
      } as PropertyUpdatedEvent);

      return;
    }

    // For transform and component properties, use IPropertyEditable interface
    if (isPropertyEditable(entity)) {
      const success = entity.setProperty(property, value);

      if (success) {
        // Emit update notification for UI refresh
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
    } else {
      // Fallback: Try direct transform manipulation for non-IPropertyEditable entities
      const success = this.handleLegacyTransformChange(entity, property, value);

      if (success) {
        this.eventBus.emit('entity:propertyUpdated', {
          id,
          property,
          entity
        } as PropertyUpdatedEvent);
      }
    }
  }

  /**
   * Handle transform changes for entities that don't implement IPropertyEditable.
   * This is a fallback for basic scene objects.
   */
  private handleLegacyTransformChange(
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
   * Unsubscribe from events and clean up.
   */
  dispose(): void {
    this.eventBus.off('object:propertyChanged', this.handlePropertyChange);
  }
}
