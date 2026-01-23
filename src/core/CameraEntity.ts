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

import type { ISceneObject, Transform, IComponent, IEntity } from './interfaces';
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
 */
export class CameraEntity implements IEntity {
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
}
