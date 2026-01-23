/**
 * CameraEntity - Camera as a Scene Entity
 *
 * Implements the composition pattern for camera:
 * - CameraEntity implements IEntity (appears in hierarchy)
 * - Transform component provides position/rotation (single source of truth)
 * - CameraComponent provides FOV, clip planes, etc.
 * - RenderCameraAdapter bridges to ICamera for render pipelines
 *
 * This follows Unity's pattern where Camera is a Component on a GameObject.
 *
 * @example
 * ```typescript
 * const cameraEntity = new CameraEntity();
 * sceneGraph.add(cameraEntity);
 *
 * // In render loop:
 * const renderCamera = cameraEntity.asRenderCamera(aspectRatio);
 * pipeline.beginFrame(renderCamera);
 * ```
 */

import type { ISceneObject, Transform, IComponent, IEntity, IPropertyEditable } from './interfaces';
import type { ICameraComponent } from './interfaces/ICameraComponent';
import { createDefaultTransform } from './interfaces';
import { createDefaultCameraComponent } from './interfaces/ICameraComponent';
import { RenderCameraAdapter } from './RenderCameraAdapter';
import { EntityIdGenerator } from '@utils/EntityIdGenerator';

/**
 * Display name component for entities (following Unity's naming pattern).
 */
interface IDisplayNameComponent extends IComponent {
  readonly type: 'displayName';
  name: string;
}

/**
 * Transform component wrapper (following Unity ECS pattern).
 */
interface ITransformComponent extends IComponent {
  readonly type: 'transform';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

/**
 * Camera entity that appears in the scene hierarchy.
 * Uses composition pattern - NOT inheriting from Camera.
 * Implements IPropertyEditable for live property editing from UI.
 */
export class CameraEntity implements IEntity, IPropertyEditable {
  readonly id: string;
  readonly entityId: number;
  name: string;
  parent: ISceneObject | null = null;
  children: ISceneObject[] = [];
  transform: Transform;

  private readonly components: Map<string, IComponent> = new Map();
  private readonly cameraComponent: ICameraComponent;

  /**
   * Target point the camera looks at.
   * Stored separately as it's not part of standard Transform.
   */
  private _target: [number, number, number] = [0, 0, 0];

  /**
   * Create a new CameraEntity.
   *
   * @param options - Optional initial configuration
   */
  constructor(options?: {
    id?: string;
    name?: string;
    position?: [number, number, number];
    target?: [number, number, number];
    fieldOfView?: number;
    nearClipPlane?: number;
    farClipPlane?: number;
  }) {
    this.id = options?.id ?? crypto.randomUUID();
    this.entityId = EntityIdGenerator.next();
    this.name = options?.name ?? 'Main Camera';

    // Initialize transform (single source of truth for position)
    this.transform = createDefaultTransform();
    if (options?.position) {
      this.transform.position = [...options.position];
    } else {
      // Default camera position: [7, 5, 7] looking at origin
      this.transform.position = [7, 5, 7];
    }

    // Set target
    if (options?.target) {
      this._target = [...options.target];
    }

    // Initialize camera component
    this.cameraComponent = createDefaultCameraComponent();
    if (options?.fieldOfView !== undefined) {
      this.cameraComponent.fieldOfView = options.fieldOfView;
    }
    if (options?.nearClipPlane !== undefined) {
      this.cameraComponent.nearClipPlane = options.nearClipPlane;
    }
    if (options?.farClipPlane !== undefined) {
      this.cameraComponent.farClipPlane = options.farClipPlane;
    }

    // Register all components
    this.initializeComponents();
  }

  /**
   * Initialize entity components.
   */
  private initializeComponents(): void {
    // Display name component
    const displayNameComponent: IDisplayNameComponent = {
      type: 'displayName',
      name: this.name,
    };
    this.components.set('displayName', displayNameComponent);

    // Transform component (wraps the transform data)
    const transformComponent: ITransformComponent = {
      type: 'transform',
      position: this.transform.position,
      rotation: this.transform.rotation,
      scale: this.transform.scale,
    };
    this.components.set('transform', transformComponent);

    // Camera component
    this.components.set('camera', this.cameraComponent);
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
  // Camera-specific API
  // =========================================

  /**
   * Get the camera's target point.
   */
  get target(): [number, number, number] {
    return [...this._target];
  }

  /**
   * Set the camera's target point.
   */
  setTarget(x: number, y: number, z: number): void {
    this._target = [x, y, z];
  }

  /**
   * Set the camera's position.
   * Updates the transform (single source of truth).
   */
  setPosition(x: number, y: number, z: number): void {
    this.transform.position = [x, y, z];
    // Keep transform component in sync
    const tc = this.components.get('transform') as ITransformComponent;
    if (tc) {
      tc.position = this.transform.position;
    }
  }

  /**
   * Get the camera component data.
   */
  getCameraComponent(): ICameraComponent {
    return this.cameraComponent;
  }

  /**
   * Create a render camera adapter for use with render pipelines.
   * This bridges the entity to the ICamera interface.
   *
   * @param aspect - The viewport aspect ratio (width / height)
   * @returns An ICamera instance for rendering
   */
  asRenderCamera(aspect: number): RenderCameraAdapter {
    return new RenderCameraAdapter(this, aspect);
  }

  // =========================================
  // IPropertyEditable Implementation
  // =========================================

  /**
   * Set a property value using dot notation path.
   * Supports transform and camera component properties.
   *
   * @param path - Property path (e.g., 'position.x', 'camera.fieldOfView')
   * @param value - The new value
   * @returns True if the property was successfully set
   */
  setProperty(path: string, value: unknown): boolean {
    const parts = path.split('.');

    // Handle transform properties: position.x, rotation.y, scale.z
    if (parts.length === 2) {
      const [transformProp, axis] = parts;
      const axisIndex = { x: 0, y: 1, z: 2 }[axis];

      if (axisIndex !== undefined && typeof value === 'number') {
        switch (transformProp) {
          case 'position':
            this.transform.position[axisIndex] = value;
            return true;
          case 'rotation':
            this.transform.rotation[axisIndex] = value;
            return true;
          case 'scale':
            this.transform.scale[axisIndex] = value;
            return true;
        }
      }

      // Handle camera component properties: camera.fieldOfView, etc.
      if (transformProp === 'camera') {
        return this.setCameraProperty(axis, value);
      }
    }

    return false;
  }

  /**
   * Set a camera component property.
   *
   * @param property - Camera property name (fieldOfView, nearClipPlane, etc.)
   * @param value - The new value
   * @returns True if the property was successfully set
   */
  private setCameraProperty(property: string, value: unknown): boolean {
    switch (property) {
      case 'fieldOfView':
        if (typeof value === 'number') {
          this.cameraComponent.fieldOfView = value;
          return true;
        }
        break;
      case 'nearClipPlane':
        if (typeof value === 'number') {
          this.cameraComponent.nearClipPlane = value;
          return true;
        }
        break;
      case 'farClipPlane':
        if (typeof value === 'number') {
          this.cameraComponent.farClipPlane = value;
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
          this.cameraComponent.clearFlags = value;
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
          this.cameraComponent.backgroundColor = [r, g, b];
          return true;
        }
        break;
    }
    return false;
  }

  /**
   * Get a property value using dot notation path.
   *
   * @param path - Property path (e.g., 'position.x', 'camera.fieldOfView')
   * @returns The property value, or undefined if not found
   */
  getProperty(path: string): unknown {
    const parts = path.split('.');

    // Handle transform properties
    if (parts.length === 2) {
      const [transformProp, axis] = parts;
      const axisIndex = { x: 0, y: 1, z: 2 }[axis];

      if (axisIndex !== undefined) {
        switch (transformProp) {
          case 'position':
            return this.transform.position[axisIndex];
          case 'rotation':
            return this.transform.rotation[axisIndex];
          case 'scale':
            return this.transform.scale[axisIndex];
        }
      }

      // Handle camera component properties
      if (transformProp === 'camera') {
        return this.getCameraComponentProperty(axis);
      }
    }

    return undefined;
  }

  /**
   * Get a camera component property value.
   *
   * @param property - Camera property name
   * @returns The property value, or undefined if not found
   */
  private getCameraComponentProperty(property: string): unknown {
    switch (property) {
      case 'fieldOfView':
        return this.cameraComponent.fieldOfView;
      case 'nearClipPlane':
        return this.cameraComponent.nearClipPlane;
      case 'farClipPlane':
        return this.cameraComponent.farClipPlane;
      case 'clearFlags':
        return this.cameraComponent.clearFlags;
      case 'backgroundColor':
        return this.cameraComponent.backgroundColor;
      default:
        return undefined;
    }
  }
}
