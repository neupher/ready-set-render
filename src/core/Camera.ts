/**
 * Camera - View/Projection Management
 *
 * Implements the ICamera interface for render pipelines.
 * Manages view and projection matrices based on position, target, and projection settings.
 *
 * @example
 * ```typescript
 * const camera = new Camera();
 * camera.setPosition(3, 3, 3);
 * camera.setTarget(0, 0, 0);
 * camera.setAspect(16 / 9);
 *
 * // In render loop:
 * renderer.beginFrame(camera);
 * ```
 */

import type { ICamera } from './interfaces';
import { mat4Perspective, mat4LookAt, mat4Multiply, degToRad } from '@utils/math/transforms';

/**
 * Camera implementation for rendering.
 * Provides view and projection matrix computation.
 */
export class Camera implements ICamera {
  private _position: [number, number, number] = [0, 0, 5];
  private _target: [number, number, number] = [0, 0, 0];
  private _up: [number, number, number] = [0, 1, 0];
  private _fov: number = degToRad(60);
  private _aspect: number = 1;
  private _near: number = 0.1;
  private _far: number = 100;

  private _viewMatrixDirty = true;
  private _projectionMatrixDirty = true;
  private _viewMatrix: Float32Array = new Float32Array(16);
  private _projectionMatrix: Float32Array = new Float32Array(16);
  private _viewProjectionMatrix: Float32Array = new Float32Array(16);

  /**
   * Create a new Camera.
   *
   * @param options - Optional initial configuration
   */
  constructor(options?: {
    position?: [number, number, number];
    target?: [number, number, number];
    up?: [number, number, number];
    fov?: number;
    aspect?: number;
    near?: number;
    far?: number;
  }) {
    if (options?.position) this._position = [...options.position];
    if (options?.target) this._target = [...options.target];
    if (options?.up) this._up = [...options.up];
    if (options?.fov !== undefined) this._fov = options.fov;
    if (options?.aspect !== undefined) this._aspect = options.aspect;
    if (options?.near !== undefined) this._near = options.near;
    if (options?.far !== undefined) this._far = options.far;
  }

  // --- ICamera readonly properties ---

  get position(): [number, number, number] {
    return [...this._position];
  }

  get target(): [number, number, number] {
    return [...this._target];
  }

  get up(): [number, number, number] {
    return [...this._up];
  }

  get fov(): number {
    return this._fov;
  }

  get aspect(): number {
    return this._aspect;
  }

  get near(): number {
    return this._near;
  }

  get far(): number {
    return this._far;
  }

  // --- Setters (mark matrices dirty) ---

  /**
   * Set camera position.
   */
  setPosition(x: number, y: number, z: number): void {
    this._position = [x, y, z];
    this._viewMatrixDirty = true;
  }

  /**
   * Set camera target/look-at point.
   */
  setTarget(x: number, y: number, z: number): void {
    this._target = [x, y, z];
    this._viewMatrixDirty = true;
  }

  /**
   * Set camera up vector.
   */
  setUp(x: number, y: number, z: number): void {
    this._up = [x, y, z];
    this._viewMatrixDirty = true;
  }

  /**
   * Set field of view (in degrees).
   */
  setFov(degrees: number): void {
    this._fov = degToRad(degrees);
    this._projectionMatrixDirty = true;
  }

  /**
   * Set aspect ratio.
   */
  setAspect(aspect: number): void {
    this._aspect = aspect;
    this._projectionMatrixDirty = true;
  }

  /**
   * Set near clipping plane.
   */
  setNear(near: number): void {
    this._near = near;
    this._projectionMatrixDirty = true;
  }

  /**
   * Set far clipping plane.
   */
  setFar(far: number): void {
    this._far = far;
    this._projectionMatrixDirty = true;
  }

  // --- ICamera methods ---

  /**
   * Get the view matrix.
   * Recomputes if dirty.
   */
  getViewMatrix(): Float32Array {
    if (this._viewMatrixDirty) {
      this._viewMatrix = mat4LookAt(this._position, this._target, this._up);
      this._viewMatrixDirty = false;
    }
    return this._viewMatrix;
  }

  /**
   * Get the projection matrix.
   * Recomputes if dirty.
   */
  getProjectionMatrix(): Float32Array {
    if (this._projectionMatrixDirty) {
      this._projectionMatrix = mat4Perspective(
        this._fov,
        this._aspect,
        this._near,
        this._far
      );
      this._projectionMatrixDirty = false;
    }
    return this._projectionMatrix;
  }

  /**
   * Get the combined view-projection matrix.
   * Recomputes if either view or projection is dirty.
   */
  getViewProjectionMatrix(): Float32Array {
    const viewMatrix = this.getViewMatrix();
    const projectionMatrix = this.getProjectionMatrix();

    this._viewProjectionMatrix = mat4Multiply(projectionMatrix, viewMatrix);
    return this._viewProjectionMatrix;
  }

  /**
   * Force matrix recalculation on next access.
   */
  invalidate(): void {
    this._viewMatrixDirty = true;
    this._projectionMatrixDirty = true;
  }
}
