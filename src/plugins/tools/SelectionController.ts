/**
 * SelectionController - Viewport Selection and Ray Picking
 *
 * Handles viewport click-to-select functionality using ray casting.
 * Supports single selection, Ctrl+click toggle, and F key framing.
 *
 * @example
 * ```typescript
 * const selectionController = new SelectionController({
 *   eventBus,
 *   selectionManager,
 *   sceneGraph,
 *   getCamera: () => renderCamera,
 *   orbitController,
 * });
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { SelectionManager } from '@core/SelectionManager';
import type { SceneGraph } from '@core/SceneGraph';
import type { OrbitController } from '@plugins/navigation';
import type { ICamera } from '@core/interfaces';
import {
  unprojectScreenToRay,
  rayAABBIntersection,
  createAABBFromTransform,
  mat4Inverse,
} from '@utils/math';

/**
 * Configuration for SelectionController.
 */
export interface SelectionControllerOptions {
  /** Event bus for input events */
  eventBus: EventBus;
  /** Selection manager for selection state */
  selectionManager: SelectionManager;
  /** Scene graph for object lookup */
  sceneGraph: SceneGraph;
  /** Function to get the current render camera */
  getCamera: () => ICamera;
  /** Orbit controller for framing */
  orbitController: OrbitController;
}

/**
 * Result of a ray-scene intersection test.
 */
interface HitResult {
  object: { id: string; name: string };
  distance: number;
}

/**
 * Handles viewport selection via ray picking.
 */
export class SelectionController {
  private readonly eventBus: EventBus;
  private readonly selectionManager: SelectionManager;
  private readonly sceneGraph: SceneGraph;
  private readonly getCamera: () => ICamera;
  private readonly orbitController: OrbitController;

  // Viewport dimensions for ray casting
  private viewportWidth = 1;
  private viewportHeight = 1;

  constructor(options: SelectionControllerOptions) {
    this.eventBus = options.eventBus;
    this.selectionManager = options.selectionManager;
    this.sceneGraph = options.sceneGraph;
    this.getCamera = options.getCamera;
    this.orbitController = options.orbitController;

    this.setupEventListeners();
  }

  /**
   * Clean up event listeners.
   */
  dispose(): void {
    this.eventBus.off('viewport:resized', this.handleViewportResized);
    this.eventBus.off('input:mouseUp', this.handleMouseUp);
    this.eventBus.off('input:keyDown', this.handleKeyDown);
    this.eventBus.off('selection:changed', this.handleSelectionChanged);
  }

  private setupEventListeners(): void {
    // Bind methods to preserve context
    this.handleViewportResized = this.handleViewportResized.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleSelectionChanged = this.handleSelectionChanged.bind(this);

    // Track viewport dimensions
    this.eventBus.on('viewport:resized', this.handleViewportResized);

    // Handle viewport clicks for selection
    this.eventBus.on('input:mouseUp', this.handleMouseUp);

    // Handle F key for framing
    this.eventBus.on('input:keyDown', this.handleKeyDown);

    // Sync selection from hierarchy panel
    this.eventBus.on('selection:changed', this.handleSelectionChanged);

    console.log('Selection controller initialized (Click=select, Ctrl+Click=toggle, F=focus)');
  }

  private handleViewportResized(data: { width: number; height: number }): void {
    this.viewportWidth = data.width;
    this.viewportHeight = data.height;
  }

  private handleMouseUp(data: {
    button: number;
    x: number;
    y: number;
    modifiers: { alt: boolean; ctrl: boolean };
  }): void {
    // Only handle left click without Alt (Alt is for navigation)
    if (data.button !== 0 || data.modifiers.alt) return;

    const camera = this.getCamera();
    const viewProjection = camera.getViewProjectionMatrix();
    const invViewProjection = mat4Inverse(viewProjection);

    if (!invViewProjection) {
      console.warn('Could not invert view-projection matrix for picking');
      return;
    }

    // Cast ray from mouse position
    const ray = unprojectScreenToRay(
      data.x,
      data.y,
      this.viewportWidth,
      this.viewportHeight,
      invViewProjection
    );

    // Find closest intersection with scene objects
    const hit = this.findClosestHit(ray);

    // Update selection
    if (hit) {
      if (data.modifiers.ctrl) {
        // Ctrl+click: toggle selection
        const sceneObj = this.sceneGraph.find(hit.object.id);
        if (sceneObj) {
          this.selectionManager.toggle(sceneObj);
        }
      } else {
        // Normal click: select single object
        const sceneObj = this.sceneGraph.find(hit.object.id);
        if (sceneObj) {
          this.selectionManager.select(sceneObj);
        }
      }
      console.log(`Selected: ${hit.object.name}`);
    } else {
      // Click on nothing: clear selection (pivot stays where it was)
      if (!data.modifiers.ctrl) {
        this.selectionManager.clear();
      }
    }
  }

  private handleKeyDown(data: { key: string; code: string }): void {
    if (data.key === 'f' || data.key === 'F') {
      this.frameSelection();
    }
  }

  private handleSelectionChanged(data: { id?: string }): void {
    // Sync selection from hierarchy panel clicks
    if (data.id && !this.selectionManager.isSelectedById(data.id)) {
      const obj = this.sceneGraph.find(data.id);
      if (obj) {
        this.selectionManager.select(obj);
      }
    }
  }

  /**
   * Frame the camera on the current selection.
   */
  private frameSelection(): void {
    const center = this.selectionManager.getSelectionCenter();

    if (center) {
      // Calculate appropriate distance based on selection bounds
      const bounds = this.selectionManager.getSelectionBounds();
      let distance = 5; // Default distance

      if (bounds) {
        const sizeX = bounds.max[0] - bounds.min[0];
        const sizeY = bounds.max[1] - bounds.min[1];
        const sizeZ = bounds.max[2] - bounds.min[2];
        const maxSize = Math.max(sizeX, sizeY, sizeZ);
        distance = maxSize * 2.5; // Zoom out to fit object
        distance = Math.max(2, Math.min(20, distance)); // Clamp
      }

      this.orbitController.framePoint(center, distance);
      console.log(`Camera framed to selection at distance ${distance.toFixed(2)}`);
    } else {
      // No selection - frame origin
      this.orbitController.framePoint([0, 0, 0], 5);
      console.log('No selection - camera framed to origin');
    }
  }

  /**
   * Find the closest object hit by a ray.
   */
  private findClosestHit(ray: { origin: [number, number, number]; direction: [number, number, number] }): HitResult | null {
    let closestHit: HitResult | null = null;

    this.sceneGraph.traverse((obj) => {
      // Skip root and camera
      if (obj.id === 'root') return;
      if (this.hasComponent(obj, 'camera')) return;

      // Create AABB from object's transform
      const transform = obj.transform;
      const aabb = createAABBFromTransform(transform.position, transform.scale);

      // Test intersection
      const hit = rayAABBIntersection(ray, aabb);

      if (hit.hit && (!closestHit || hit.distance < closestHit.distance)) {
        closestHit = { object: { id: obj.id, name: obj.name }, distance: hit.distance };
      }
    });

    return closestHit;
  }

  /**
   * Check if an object has a specific component.
   * Helper method until IEntity interface is properly defined.
   */
  private hasComponent(obj: unknown, componentType: string): boolean {
    const entity = obj as { hasComponent?: (type: string) => boolean };
    return typeof entity.hasComponent === 'function' && entity.hasComponent(componentType);
  }
}
