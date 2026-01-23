/**
 * RenderCameraAdapter - Bridge between CameraEntity and ICamera
 *
 * Implements the Adapter pattern to bridge CameraEntity (which uses the
 * Entity Component System) to the ICamera interface (used by render pipelines).
 *
 * This allows CameraEntity to be used with any IRenderPipeline without
 * the pipeline needing to know about the ECS.
 *
 * @example
 * ```typescript
 * const cameraEntity = new CameraEntity();
 * const aspect = canvas.width / canvas.height;
 *
 * // Create adapter for rendering
 * const renderCamera = cameraEntity.asRenderCamera(aspect);
 *
 * // Use with pipeline
 * pipeline.beginFrame(renderCamera);
 * ```
 */

import type { ICamera } from './interfaces';
import type { CameraEntity } from './CameraEntity';
import { mat4Perspective, mat4LookAt, mat4Multiply, degToRad } from '@utils/math/transforms';

/**
 * Adapter that bridges CameraEntity to ICamera interface.
 * Computes matrices from entity's transform and camera component.
 */
export class RenderCameraAdapter implements ICamera {
  private readonly entity: CameraEntity;
  private _aspect: number;

  private _viewMatrixDirty = true;
  private _projectionMatrixDirty = true;
  private _viewMatrix: Float32Array = new Float32Array(16);
  private _projectionMatrix: Float32Array = new Float32Array(16);
  private _viewProjectionMatrix: Float32Array = new Float32Array(16);

  // Cache for dirty checking
  private _lastPosition: [number, number, number] = [0, 0, 0];
  private _lastTarget: [number, number, number] = [0, 0, 0];
  private _lastFov: number = 0;
  private _lastNear: number = 0;
  private _lastFar: number = 0;

  /**
   * Create a new RenderCameraAdapter.
   *
   * @param entity - The CameraEntity to adapt
   * @param aspect - The viewport aspect ratio (width / height)
   */
  constructor(entity: CameraEntity, aspect: number) {
    this.entity = entity;
    this._aspect = aspect;
  }

  // =========================================
  // ICamera readonly properties
  // =========================================

  /**
   * Camera position from entity's transform.
   */
  get position(): [number, number, number] {
    return [...this.entity.transform.position] as [number, number, number];
  }

  /**
   * Camera target/look-at point.
   */
  get target(): [number, number, number] {
    return this.entity.target;
  }

  /**
   * Camera up vector (always world up for now).
   */
  get up(): [number, number, number] {
    return [0, 1, 0];
  }

  /**
   * Field of view in radians (converted from degrees).
   */
  get fov(): number {
    const cameraComp = this.entity.getCameraComponent();
    return degToRad(cameraComp.fieldOfView);
  }

  /**
   * Aspect ratio.
   */
  get aspect(): number {
    return this._aspect;
  }

  /**
   * Near clipping plane.
   */
  get near(): number {
    return this.entity.getCameraComponent().nearClipPlane;
  }

  /**
   * Far clipping plane.
   */
  get far(): number {
    return this.entity.getCameraComponent().farClipPlane;
  }

  // =========================================
  // Aspect ratio setter
  // =========================================

  /**
   * Update aspect ratio (typically on viewport resize).
   */
  setAspect(aspect: number): void {
    if (this._aspect !== aspect) {
      this._aspect = aspect;
      this._projectionMatrixDirty = true;
    }
  }

  // =========================================
  // ICamera matrix methods
  // =========================================

  /**
   * Get the view matrix.
   * Recomputes if position or target has changed.
   */
  getViewMatrix(): Float32Array {
    this.checkViewDirty();

    if (this._viewMatrixDirty) {
      this._viewMatrix = mat4LookAt(this.position, this.target, this.up);
      this._viewMatrixDirty = false;

      // Update cache
      this._lastPosition = this.position;
      this._lastTarget = this.target;
    }

    return this._viewMatrix;
  }

  /**
   * Get the projection matrix.
   * Recomputes if FOV, aspect, near, or far has changed.
   */
  getProjectionMatrix(): Float32Array {
    this.checkProjectionDirty();

    if (this._projectionMatrixDirty) {
      this._projectionMatrix = mat4Perspective(
        this.fov,
        this._aspect,
        this.near,
        this.far
      );
      this._projectionMatrixDirty = false;

      // Update cache
      this._lastFov = this.fov;
      this._lastNear = this.near;
      this._lastFar = this.far;
    }

    return this._projectionMatrix;
  }

  /**
   * Get the combined view-projection matrix.
   */
  getViewProjectionMatrix(): Float32Array {
    const viewMatrix = this.getViewMatrix();
    const projectionMatrix = this.getProjectionMatrix();

    this._viewProjectionMatrix = mat4Multiply(projectionMatrix, viewMatrix);
    return this._viewProjectionMatrix;
  }

  // =========================================
  // Private helpers
  // =========================================

  /**
   * Check if view matrix needs recomputation.
   */
  private checkViewDirty(): void {
    const pos = this.position;
    const tgt = this.target;

    if (
      pos[0] !== this._lastPosition[0] ||
      pos[1] !== this._lastPosition[1] ||
      pos[2] !== this._lastPosition[2] ||
      tgt[0] !== this._lastTarget[0] ||
      tgt[1] !== this._lastTarget[1] ||
      tgt[2] !== this._lastTarget[2]
    ) {
      this._viewMatrixDirty = true;
    }
  }

  /**
   * Check if projection matrix needs recomputation.
   */
  private checkProjectionDirty(): void {
    if (
      this.fov !== this._lastFov ||
      this.near !== this._lastNear ||
      this.far !== this._lastFar
    ) {
      this._projectionMatrixDirty = true;
    }
  }

  /**
   * Force matrix recalculation on next access.
   */
  invalidate(): void {
    this._viewMatrixDirty = true;
    this._projectionMatrixDirty = true;
  }
}
