/**
 * PropertyChangeCommand
 *
 * Command for undoing/redoing entity property changes.
 * Supports all transform properties (position, rotation, scale),
 * component properties (camera, material), and name changes.
 *
 * Features:
 * - Full undo/redo support
 * - Coalescing for rapid changes (slider drags become single undo entry)
 * - Works with the centralized PropertyChangeHandler
 *
 * @example
 * ```typescript
 * const command = new PropertyChangeCommand({
 *   entityId: cube.id,
 *   property: 'position.x',
 *   oldValue: 0,
 *   newValue: 5,
 *   sceneGraph,
 *   eventBus
 * });
 *
 * commandHistory.execute(command);
 * ```
 */

import type { EventBus } from '../EventBus';
import type { SceneGraph } from '../SceneGraph';
import type { ICommand } from './ICommand';
import type { ISceneObject, IEntity, IComponent } from '../interfaces';
import type { ICameraComponent } from '../interfaces/ICameraComponent';

/**
 * Time window for coalescing rapid property changes (milliseconds).
 */
const COALESCE_WINDOW_MS = 300;

export interface PropertyChangeCommandOptions {
  /** ID of the entity being modified */
  entityId: string;

  /** Property path (e.g., 'position.x', 'camera.fieldOfView') */
  property: string;

  /** Value before the change */
  oldValue: unknown;

  /** Value after the change */
  newValue: unknown;

  /** Scene graph for finding entities */
  sceneGraph: SceneGraph;

  /** Event bus for emitting update events */
  eventBus: EventBus;

  /** Optional timestamp (defaults to Date.now()) */
  timestamp?: number;
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
 * Command for entity property changes.
 * Supports undo/redo and coalescing.
 */
export class PropertyChangeCommand implements ICommand {
  readonly type = 'PropertyChange';
  readonly description: string;
  readonly timestamp: number;

  readonly entityId: string;
  readonly property: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;

  private readonly sceneGraph: SceneGraph;
  private readonly eventBus: EventBus;

  constructor(options: PropertyChangeCommandOptions) {
    this.entityId = options.entityId;
    this.property = options.property;
    this.oldValue = options.oldValue;
    this.newValue = options.newValue;
    this.sceneGraph = options.sceneGraph;
    this.eventBus = options.eventBus;
    this.timestamp = options.timestamp ?? Date.now();

    // Generate human-readable description
    this.description = this.generateDescription();
  }

  /**
   * Generate a human-readable description for the command.
   */
  private generateDescription(): string {
    const entity = this.sceneGraph.find(this.entityId);
    const entityName = entity?.name ?? 'Unknown';

    // Simplify property path for display
    const propDisplay = this.property
      .replace('position.', 'Position ')
      .replace('rotation.', 'Rotation ')
      .replace('scale.', 'Scale ')
      .replace('camera.', 'Camera ')
      .replace('material.', 'Material ')
      .replace('.', ' ');

    return `Change ${entityName} ${propDisplay}`;
  }

  /**
   * Execute the command (apply newValue).
   */
  execute(): void {
    this.applyValue(this.newValue);
  }

  /**
   * Undo the command (restore oldValue).
   */
  undo(): void {
    this.applyValue(this.oldValue);
  }

  /**
   * Apply a value to the entity property.
   */
  private applyValue(value: unknown): void {
    const entity = this.sceneGraph.find(this.entityId);
    if (!entity) {
      console.warn(`PropertyChangeCommand: Entity not found: ${this.entityId}`);
      return;
    }

    let success = false;

    // Handle name changes
    if (this.property === 'name') {
      entity.name = String(value);
      success = true;
    }
    // Handle transform properties
    else if (this.isTransformProperty(this.property)) {
      success = this.applyTransformValue(entity, value);
    }
    // Handle component properties
    else if (this.isComponentProperty(this.property)) {
      success = this.applyComponentValue(entity, value);
    }

    if (success) {
      // Emit update event for UI refresh
      this.eventBus.emit('entity:propertyUpdated', {
        id: this.entityId,
        property: this.property,
        entity
      });
    }
  }

  /**
   * Check if property is a transform property.
   */
  private isTransformProperty(property: string): boolean {
    const parts = property.split('.');
    if (parts.length !== 2) return false;
    const [prop] = parts;
    return prop === 'position' || prop === 'rotation' || prop === 'scale';
  }

  /**
   * Check if property is a component property.
   */
  private isComponentProperty(property: string): boolean {
    const parts = property.split('.');
    if (parts.length < 2) return false;
    const [component] = parts;
    return component === 'camera' || component === 'material' || component === 'light';
  }

  /**
   * Apply a transform value.
   */
  private applyTransformValue(entity: ISceneObject, value: unknown): boolean {
    const parts = this.property.split('.');
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
   * Apply a component value.
   */
  private applyComponentValue(entity: ISceneObject, value: unknown): boolean {
    if (!isEntity(entity)) {
      return false;
    }

    const parts = this.property.split('.');
    if (parts.length < 2) return false;

    const [componentType, ...propertyPath] = parts;
    const propertyName = propertyPath.join('.');

    switch (componentType) {
      case 'camera':
        return this.applyCameraValue(entity, propertyName, value);
      case 'material':
        return this.applyMaterialValue(entity, propertyName, value);
      case 'light':
        return this.applyLightValue(entity, propertyName, value);
      default:
        return false;
    }
  }

  /**
   * Apply a camera component value.
   */
  private applyCameraValue(
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
        if (Array.isArray(value) && value.length === 3) {
          cameraComponent.backgroundColor = value as [number, number, number];
          return true;
        }
        break;
    }

    return false;
  }

  /**
   * Apply a material component value.
   */
  private applyMaterialValue(
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

    const material = materialComponent as IComponent & {
      color?: [number, number, number];
      opacity?: number;
      transparent?: boolean;
      roughness?: number;
      metallic?: number;
    };

    switch (property) {
      case 'color':
        if (Array.isArray(value) && value.length === 3) {
          material.color = value as [number, number, number];
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
   * Apply a light component value.
   */
  private applyLightValue(
    entity: IEntity,
    property: string,
    value: unknown
  ): boolean {
    if (!entity.hasComponent('light')) {
      return false;
    }

    const lightComponent = entity.getComponent<IComponent>('light');
    if (!lightComponent) {
      return false;
    }

    const light = lightComponent as IComponent & {
      lightType?: string;
      color?: [number, number, number];
      intensity?: number;
      enabled?: boolean;
      range?: number;
      spotAngle?: number;
    };

    switch (property) {
      case 'color':
        if (Array.isArray(value) && value.length === 3) {
          light.color = value as [number, number, number];
          return true;
        }
        break;
      case 'intensity':
        if (typeof value === 'number') {
          light.intensity = value;
          return true;
        }
        break;
      case 'enabled':
        if (typeof value === 'boolean') {
          light.enabled = value;
          return true;
        }
        break;
      case 'range':
        if (typeof value === 'number') {
          light.range = value;
          return true;
        }
        break;
      case 'spotAngle':
        if (typeof value === 'number') {
          light.spotAngle = value;
          return true;
        }
        break;
    }

    return false;
  }

  /**
   * Check if this command can be merged with another.
   * Commands can be merged if they:
   * - Are both PropertyChangeCommands
   * - Target the same entity
   * - Modify the same property
   * - Are within the coalescing time window
   */
  canMergeWith(other: ICommand): boolean {
    if (!(other instanceof PropertyChangeCommand)) {
      return false;
    }

    return (
      other.entityId === this.entityId &&
      other.property === this.property &&
      other.timestamp - this.timestamp < COALESCE_WINDOW_MS
    );
  }

  /**
   * Merge this command with another.
   * Keeps the original old value and takes the new command's new value.
   */
  mergeWith(other: ICommand): ICommand {
    if (!(other instanceof PropertyChangeCommand)) {
      return other;
    }

    return new PropertyChangeCommand({
      entityId: this.entityId,
      property: this.property,
      oldValue: this.oldValue, // Keep original old value
      newValue: other.newValue, // Take latest new value
      sceneGraph: this.sceneGraph,
      eventBus: this.eventBus,
      timestamp: other.timestamp // Use newer timestamp
    });
  }
}
