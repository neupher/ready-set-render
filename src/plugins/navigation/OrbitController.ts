/**
 * OrbitController - Maya-style Camera Navigation
 *
 * Provides viewport navigation using Maya-style controls:
 * - Alt + LMB drag: Orbit/tumble around pivot
 * - Alt + MMB drag: Pan (move camera and target together)
 * - Alt + RMB drag: Dolly (zoom in/out)
 * - Scroll wheel: Zoom
 * - F key: Frame selection (future)
 * - Shift + F: Frame all (future)
 *
 * Uses spherical coordinates for smooth orbital movement.
 *
 * @example
 * ```typescript
 * const orbitController = new OrbitController(cameraEntity, eventBus);
 * ```
 */

import type { EventBus } from '@core/EventBus';
import type { CameraEntity } from '@core/CameraEntity';
import { MouseButton, type DragEvent, type WheelEvent as InputWheelEvent } from '@core/InputManager';

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
  /** Pan sensitivity. Default: 0.01 */
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

  /**
   * Create a new OrbitController.
   *
   * @param camera - The CameraEntity to control
   * @param eventBus - Event bus for input events
   * @param options - Configuration options
   */
  constructor(camera: CameraEntity, eventBus: EventBus, options: OrbitControllerOptions = {}) {
    this.camera = camera;
    this.eventBus = eventBus;

    // Configuration with defaults
    this.minRadius = options.minRadius ?? 0.5;
    this.maxRadius = options.maxRadius ?? 100;
    this.minPhi = options.minPhi ?? 0.1;
    this.maxPhi = options.maxPhi ?? Math.PI - 0.1;
    this.orbitSensitivity = options.orbitSensitivity ?? 0.005;
    this.panSensitivity = options.panSensitivity ?? 0.01;
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
    this.eventBus.off('input:wheel', this.handleWheel);
  }

  private setupEventListeners(): void {
    this.handleDrag = this.handleDrag.bind(this);
    this.handleWheel = this.handleWheel.bind(this);

    this.eventBus.on('input:drag', this.handleDrag);
    this.eventBus.on('input:wheel', this.handleWheel);
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
      // Dolly
      this.dolly(deltaX + deltaY);
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
   */
  private pan(deltaX: number, deltaY: number): void {
    // Calculate camera's right and up vectors
    const position = this.camera.transform.position;
    const forward = this.normalize([
      this.pivot[0] - position[0],
      this.pivot[1] - position[1],
      this.pivot[2] - position[2],
    ]);
    const worldUp: [number, number, number] = [0, 1, 0];
    const right = this.normalize(this.cross(forward, worldUp));
    const up = this.cross(right, forward);

    // Calculate pan amount based on distance
    const panScale = this.spherical.radius * this.panSensitivity;

    // Apply pan to pivot
    this.pivot[0] -= right[0] * deltaX * panScale + up[0] * deltaY * panScale;
    this.pivot[1] -= right[1] * deltaX * panScale + up[1] * deltaY * panScale;
    this.pivot[2] -= right[2] * deltaX * panScale + up[2] * deltaY * panScale;

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
