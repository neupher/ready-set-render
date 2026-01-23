/**
 * ICameraComponent - Camera data component
 *
 * A component that stores camera-related data for an entity.
 * Following Unity terminology: fieldOfView (not fov), nearClipPlane (not near), etc.
 *
 * @example
 * ```typescript
 * const cameraEntity = new CameraEntity();
 * const camera = cameraEntity.getComponent<ICameraComponent>('camera');
 * console.log(camera?.fieldOfView); // 60 degrees
 * ```
 */

import type { IComponent } from './IComponent';

/**
 * Clear flags for the camera (what to clear before rendering).
 * Following Unity terminology.
 */
export type CameraClearFlags = 'skybox' | 'solidColor' | 'depthOnly' | 'none';

/**
 * Camera component containing camera-specific data.
 * This is pure data - no methods, no logic.
 */
export interface ICameraComponent extends IComponent {
  /** Component type identifier */
  readonly type: 'camera';

  /** Field of view in degrees (vertical FOV). Default: 60 */
  fieldOfView: number;

  /** Near clipping plane distance. Default: 0.3 */
  nearClipPlane: number;

  /** Far clipping plane distance. Default: 1000 */
  farClipPlane: number;

  /** What to clear before rendering. Default: 'solidColor' */
  clearFlags: CameraClearFlags;

  /** Background color when clearFlags is 'solidColor'. RGB values 0-1. */
  backgroundColor: [number, number, number];
}

/**
 * Creates a default camera component with standard values.
 *
 * @returns A new camera component with default values
 */
export function createDefaultCameraComponent(): ICameraComponent {
  return {
    type: 'camera',
    fieldOfView: 60,
    nearClipPlane: 0.3,
    farClipPlane: 1000,
    clearFlags: 'solidColor',
    backgroundColor: [0.1, 0.1, 0.1],
  };
}
