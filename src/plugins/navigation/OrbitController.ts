/**
 * OrbitController - Maya-style Camera Navigation
 *
 * Provides viewport navigation using Maya-style controls:
 * - Alt + LMB drag: Orbit/tumble around pivot
 * - Alt + MMB drag: Pan (move camera and target together)
 * - Alt + RMB drag: Dolly (zoom in/out)
 * - Scroll wheel: Zoom
 * - F key: Frame selection (focus on selected objects)
 * - Shift + F: Frame all (future)
 *
 * Uses spherical coordinates for smooth orbital movement.
 * Automatically pivots around the active selection when selection changes.
 *
 * @example
 * ```typescript
 * const orbitController = new OrbitController(cameraEntity, eventBus, canvas);
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { CameraEntity } from '@core/CameraEntity';
import { MouseButton, type DragEvent, type WheelEvent as InputWheelEvent } from '@core/InputManager';

/**
 * Cursor data URIs for navigation modes
 */
const CURSORS = {
  orbit: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><circle cx="12" cy="12" r="7" stroke-opacity="0.6"/><path d="M5 12a7 7 0 0 1 7-7" stroke-linecap="round"/><path d="M12 5l-2 2M12 5l2 2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 12a7 7 0 0 1-7 7" stroke-linecap="round"/><path d="M12 19l2-2M12 19l-2-2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" fill="white"/></svg>') 12 12, crosshair`,
  pan: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/></svg>') 12 12, move`,
  zoom: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="10" cy="10" r="6"/><path d="M14 14l6 6"/><path d="M7 10h6M10 7v6"/></svg>') 12 12, zoom-in`,
};

/**
 * Spherical coordinates for orbital camera.
 */
interface SphericalCoordinates {
  /** Distance from pivot */
  radius: number;
  /** Horizontal angle in radians (azimuth, around Y axis) */
  theta: number;
  /** Vertical angle in radians (polar, from Y axis) */
  phi: number;
}

/**
 * Configuration options for OrbitController.
 */
export interface OrbitControllerOptions {
  /** Minimum distance from pivot. Default: 0.5 */
  minRadius?: number;
  /** Maximum distance from pivot. Default: 100 */
  maxRadius?: number;
  /** Minimum phi angle (prevent flipping). Default: 0.1 */
  minPhi?: number;
  /** Maximum phi angle. Default: Math.PI - 0.1 */
  maxPhi?: number;
  /** Orbit sensitivity. Default: 0.005 */
  orbitSensitivity?: number;
  /** Pan sensitivity. Default: 0.001 */
  panSensitivity?: number;
  /** Dolly sensitivity. Default: 0.01 */
  dollySensitivity?: number;
  /** Zoom sensitivity (wheel). Default: 0.1 */
  zoomSensitivity?: number;
}

/**
 * Maya-style orbit controller for viewport navigation.
 */
export class OrbitController {
  private readonly camera: CameraEntity;
  private readonly eventBus: EventBus;
  private readonly canvas: HTMLCanvasElement;

  // Spherical coordinates for orbit
  private spherical: SphericalCoordinates;

  // Pivot point (what the camera orbits around)
  private pivot: [number, number, number];

  // Configuration
  private readonly minRadius: number;
  private readonly maxRadius: number;
  private readonly minPhi: number;
  private readonly maxPhi: number;
  private readonly orbitSensitivity: number;
  private readonly panSensitivity: number;
  private readonly dollySensitivity: number;
  private readonly zoomSensitivity: number;

  // State
  private isEnabled: boolean = true;
  private originalCursor: string = '';
  private isNavigating: boolean = false;

  /**
   * Create a new OrbitController.
   *
   * @param camera - The CameraEntity to control
   * @param eventBus - Event bus for input events
   * @param canvas - The canvas element for cursor changes
   * @param options - Configuration options
   */
  constructor(camera: CameraEntity, eventBus: EventBus, canvas: HTMLCanvasElement, options: OrbitControllerOptions = {}) {
    this.camera = camera;
    this.eventBus = eventBus;
    this.canvas = canvas;

    // Configuration with defaults
    this.minRadius = options.minRadius ?? 0.5;
    this.maxRadius = options.maxRadius ?? 100;
    this.minPhi = options.minPhi ?? 0.1;
    this.maxPhi = options.maxPhi ?? Math.PI - 0.1;
    this.orbitSensitivity = options.orbitSensitivity ?? 0.005;
    this.panSensitivity = options.panSensitivity ?? 0.002;
    this.dollySensitivity = options.dollySensitivity ?? 0.01;
    this.zoomSensitivity = options.zoomSensitivity ?? 0.1;

    // Initialize pivot from camera target
    this.pivot = [...camera.target];

    // Calculate initial spherical coordinates from camera position
    this.spherical = this.cartesianToSpherical(
      camera.transform.position,
      this.pivot
    );

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Enable or disable the controller.
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if controller is enabled.
   */
  getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Set the pivot point (orbit center).
   */
  setPivot(x: number, y: number, z: number): void {
    this.pivot = [x, y, z];
    this.camera.setTarget(x, y, z);
    this.updateCameraPosition();
  }

  /**
   * Get the current pivot point.
   */
  getPivot(): [number, number, number] {
    return [...this.pivot];
  }

  /**
   * Frame a point (move pivot and adjust radius).
   */
  framePoint(target: [number, number, number], distance?: number): void {
    this.pivot = [...target];
    if (distance !== undefined) {
      this.spherical.radius = Math.max(this.minRadius, Math.min(this.maxRadius, distance));
    }
    this.updateCameraPosition();
  }

  /**
   * Clean up event listeners.
   */
  dispose(): void {
    this.eventBus.off('input:drag', this.handleDrag);
    this.eventBus.off('input:dragStart', this.handleDragStart);
    this.eventBus.off('input:dragEnd', this.handleDragEnd);
    this.eventBus.off('input:wheel', this.handleWheel);
  }

  private setupEventListeners(): void {
    this.handleDrag = this.handleDrag.bind(this);
    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
    this.handleWheel = this.handleWheel.bind(this);

    this.eventBus.on('input:drag', this.handleDrag);
    this.eventBus.on('input:dragStart', this.handleDragStart);
    this.eventBus.on('input:dragEnd', this.handleDragEnd);
    this.eventBus.on('input:wheel', this.handleWheel);
  }

  private handleDragStart(event: DragEvent): void {
    if (!this.isEnabled) return;
    if (!event.modifiers.alt) return;

    const { button } = event;
    this.isNavigating = true;
    this.originalCursor = this.canvas.style.cursor;

    // Set cursor based on navigation mode
    if (button === MouseButton.LEFT) {
      this.canvas.style.cursor = CURSORS.orbit;
    } else if (button === MouseButton.MIDDLE) {
      this.canvas.style.cursor = CURSORS.pan;
    } else if (button === MouseButton.RIGHT) {
      this.canvas.style.cursor = CURSORS.zoom;
    }
  }

  private handleDragEnd(_event: DragEvent): void {
    if (this.isNavigating) {
      this.isNavigating = false;
      this.canvas.style.cursor = this.originalCursor;
    }
  }

  private handleDrag(event: DragEvent): void {
    if (!this.isEnabled) return;

    // Maya-style: requires Alt key
    if (!event.modifiers.alt) return;

    const { button, deltaX, deltaY } = event;

    if (button === MouseButton.LEFT) {
      // Orbit/tumble
      this.orbit(deltaX, deltaY);
    } else if (button === MouseButton.MIDDLE) {
      // Pan
      this.pan(deltaX, deltaY);
    } else if (button === MouseButton.RIGHT) {
      // Dolly - invert so mouse right = zoom in
      this.dolly(-(deltaX + deltaY));
    }
  }

  private handleWheel(event: InputWheelEvent): void {
    if (!this.isEnabled) return;

    // Zoom with scroll wheel (no modifier required)
    this.zoom(-event.deltaY);
  }

  /**
   * Orbit around the pivot point.
   */
  private orbit(deltaX: number, deltaY: number): void {
    // Update spherical coordinates
    this.spherical.theta -= deltaX * this.orbitSensitivity;
    this.spherical.phi -= deltaY * this.orbitSensitivity;

    // Clamp phi to prevent flipping
    this.spherical.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.spherical.phi));

    this.updateCameraPosition();
  }

  /**
   * Pan the camera (move camera and pivot together).
   * Maya-style: drag direction moves the view opposite (inverted).
   * Movement is constrained to the camera's local XY plane (perpendicular to look direction).
   */
  private pan(deltaX: number, deltaY: number): void {
    // Calculate camera's local coordinate system
    const position = this.camera.transform.position;

    // Forward vector (camera look direction)
    const forward = this.normalize([
      this.pivot[0] - position[0],
      this.pivot[1] - position[1],
      this.pivot[2] - position[2],
    ]);

    // Right vector (perpendicular to forward and world up)
    const worldUp: [number, number, number] = [0, 1, 0];
    const right = this.normalize(this.cross(forward, worldUp));

    // Up vector (perpendicular to both forward and right - stays in camera's local plane)
    const up = this.normalize(this.cross(right, forward));

    // Calculate pan amount based on distance (reduced sensitivity)
    const panScale = this.spherical.radius * this.panSensitivity;

    // Maya-style inverted for horizontal, inverted vertical for natural feel
    // Only move in right/up plane (no forward component)
    this.pivot[0] -= right[0] * deltaX * panScale - up[0] * deltaY * panScale;
    this.pivot[1] -= right[1] * deltaX * panScale - up[1] * deltaY * panScale;
    this.pivot[2] -= right[2] * deltaX * panScale - up[2] * deltaY * panScale;

    this.updateCameraPosition();
  }

  /**
   * Dolly (move camera closer/further from pivot).
   */
  private dolly(delta: number): void {
    const dollyScale = this.spherical.radius * this.dollySensitivity;
    this.spherical.radius += delta * dollyScale;
    this.spherical.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.spherical.radius));

    this.updateCameraPosition();
  }

  /**
   * Zoom (same as dolly but triggered by wheel).
   */
  private zoom(delta: number): void {
    const zoomScale = this.spherical.radius * this.zoomSensitivity * 0.01;
    this.spherical.radius -= delta * zoomScale;
    this.spherical.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.spherical.radius));

    this.updateCameraPosition();
  }

  /**
   * Update camera position from spherical coordinates.
   */
  private updateCameraPosition(): void {
    const position = this.sphericalToCartesian(this.spherical, this.pivot);
    this.camera.setPosition(position[0], position[1], position[2]);
    this.camera.setTarget(this.pivot[0], this.pivot[1], this.pivot[2]);
  }

  /**
   * Convert spherical coordinates to Cartesian.
   */
  private sphericalToCartesian(
    spherical: SphericalCoordinates,
    center: [number, number, number]
  ): [number, number, number] {
    const { radius, theta, phi } = spherical;

    // Spherical to Cartesian (Y-up convention)
    const sinPhi = Math.sin(phi);
    const x = center[0] + radius * sinPhi * Math.sin(theta);
    const y = center[1] + radius * Math.cos(phi);
    const z = center[2] + radius * sinPhi * Math.cos(theta);

    return [x, y, z];
  }

  /**
   * Convert Cartesian position to spherical coordinates.
   */
  private cartesianToSpherical(
    position: [number, number, number],
    center: [number, number, number]
  ): SphericalCoordinates {
    const dx = position[0] - center[0];
    const dy = position[1] - center[1];
    const dz = position[2] - center[2];

    const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const theta = Math.atan2(dx, dz);
    const phi = Math.acos(Math.max(-1, Math.min(1, dy / radius)));

    return { radius, theta, phi };
  }

  /**
   * Cross product of two vectors.
   */
  private cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  /**
   * Normalize a vector.
   */
  private normalize(v: [number, number, number]): [number, number, number] {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (len === 0) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  }
}
