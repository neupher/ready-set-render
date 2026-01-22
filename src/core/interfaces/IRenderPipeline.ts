/**
 * Render Pipeline Interface
 *
 * Defines the contract for swappable render pipelines.
 * All render pipelines (forward, deferred, raytracing) must implement this.
 */

import type { IPlugin } from './IPlugin';

/**
 * Supported render pipeline types.
 */
export type RenderPipelineType = 'forward' | 'deferred' | 'raytracing';

/**
 * Camera interface for render pipelines.
 */
export interface ICamera {
  /** Camera position in world space */
  readonly position: [number, number, number];
  /** Camera target/look-at point */
  readonly target: [number, number, number];
  /** Camera up vector */
  readonly up: [number, number, number];
  /** Field of view in radians */
  readonly fov: number;
  /** Aspect ratio (width / height) */
  readonly aspect: number;
  /** Near clipping plane */
  readonly near: number;
  /** Far clipping plane */
  readonly far: number;

  /** Get the view matrix */
  getViewMatrix(): Float32Array;
  /** Get the projection matrix */
  getProjectionMatrix(): Float32Array;
  /** Get the combined view-projection matrix */
  getViewProjectionMatrix(): Float32Array;
}

/**
 * Scene interface for render pipelines.
 */
export interface IScene {
  /** Traverse all objects in the scene */
  traverse(callback: (object: unknown) => void): void;
  /** Get all renderable objects */
  getRenderables(): unknown[];
}

/**
 * Render pipeline interface.
 * Extends IPlugin to be managed by the PluginManager.
 *
 * All render pipelines MUST be hot-swappable at runtime.
 *
 * @example
 * ```typescript
 * editor.settings.set('renderer.pipeline', 'deferred');
 * ```
 */
export interface IRenderPipeline extends IPlugin {
  /** The type of this render pipeline */
  readonly type: RenderPipelineType;

  /**
   * Begin a new frame.
   * Called once per frame before render().
   *
   * @param camera - The camera to render from
   */
  beginFrame(camera: ICamera): void;

  /**
   * Render the scene.
   * Main render pass.
   *
   * @param scene - The scene to render
   */
  render(scene: IScene): void;

  /**
   * End the frame.
   * Called once per frame after render().
   * Used for cleanup and presenting the final image.
   */
  endFrame(): void;

  /**
   * Handle viewport resize.
   *
   * @param width - New viewport width in pixels
   * @param height - New viewport height in pixels
   */
  resize(width: number, height: number): void;
}
