/**
 * Scene Object Interface
 *
 * Defines the structure for objects in the scene graph.
 * All renderable objects must implement this interface.
 */

/**
 * 3D Transform data structure.
 * Uses tuple types for position, rotation, and scale vectors.
 */
export interface Transform {
  /** Position in world space [x, y, z] */
  position: [number, number, number];
  /** Rotation in degrees [x, y, z] (Euler angles) */
  rotation: [number, number, number];
  /** Scale factor [x, y, z] */
  scale: [number, number, number];
}

/**
 * Creates a default transform at origin with no rotation and unit scale.
 *
 * @returns A new Transform object with default values
 */
export function createDefaultTransform(): Transform {
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  };
}

/**
 * Base interface for all scene objects.
 * Scene objects form a hierarchical tree structure.
 */
export interface ISceneObject {
  /** Unique identifier for the object */
  readonly id: string;
  /** Human-readable name (mutable for renaming) */
  name: string;
  /** Parent object in the hierarchy, null for root objects */
  parent: ISceneObject | null;
  /** Child objects */
  children: ISceneObject[];
  /** Local transform relative to parent */
  transform: Transform;
}

/**
 * Interface for objects that can be rendered.
 * Extends ISceneObject with rendering capability.
 */
export interface IRenderable extends ISceneObject {
  /**
   * Render this object.
   * Uses polymorphism instead of type-based conditionals.
   *
   * @param gl - The WebGL2 rendering context
   * @param viewProjection - The combined view-projection matrix
   */
  render(gl: WebGL2RenderingContext, viewProjection: Float32Array): void;
}

/**
 * Interface for objects that require GPU resource initialization.
 * Objects implementing this interface need their GPU resources
 * (VAO, VBO, shaders) initialized before rendering.
 */
export interface IInitializable {
  /**
   * Initialize GPU resources for rendering.
   *
   * @param gl - The WebGL2 rendering context
   * @param program - The shader program to use
   */
  initializeGPUResources(gl: WebGL2RenderingContext, program: WebGLProgram): void;

  /**
   * Check if GPU resources have been initialized.
   *
   * @returns True if GPU resources are ready for rendering
   */
  isInitialized(): boolean;

  /**
   * Dispose of GPU resources.
   */
  dispose(): void;
}

/**
 * Type guard to check if an object implements IInitializable.
 *
 * @param obj - The object to check
 * @returns True if the object has initializeGPUResources, isInitialized, and dispose methods
 */
export function isInitializable(obj: unknown): obj is IInitializable {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'initializeGPUResources' in obj &&
    'isInitialized' in obj &&
    'dispose' in obj &&
    typeof (obj as IInitializable).initializeGPUResources === 'function' &&
    typeof (obj as IInitializable).isInitialized === 'function' &&
    typeof (obj as IInitializable).dispose === 'function'
  );
}
