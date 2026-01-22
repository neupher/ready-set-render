/**
 * SceneGraph - Hierarchical Scene Structure
 *
 * Manages scene objects in a tree hierarchy.
 * Provides traversal, querying, and modification operations.
 * Implements IScene for render pipeline compatibility.
 *
 * @example
 * ```typescript
 * const sceneGraph = new SceneGraph(eventBus);
 *
 * const cube = sceneGraph.createObject('Cube');
 * sceneGraph.add(cube);
 *
 * sceneGraph.traverse((object) => {
 *   console.log(object.name);
 * });
 * ```
 */

import { EventBus } from './EventBus';
import type { ISceneObject, IRenderable, Transform, IScene } from './interfaces';
import { createDefaultTransform } from './interfaces';

/**
 * Type guard to check if an object is renderable.
 */
function isRenderable(object: ISceneObject): object is IRenderable {
  return 'render' in object && typeof (object as IRenderable).render === 'function';
}

/**
 * Generate a unique ID for scene objects.
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Scene object implementation.
 * Represents a node in the scene graph hierarchy.
 */
export class SceneObject implements ISceneObject {
  readonly id: string;
  name: string;
  parent: ISceneObject | null = null;
  children: ISceneObject[] = [];
  transform: Transform;

  constructor(name: string, id?: string) {
    this.id = id ?? generateId();
    this.name = name;
    this.transform = createDefaultTransform();
  }
}

/**
 * SceneGraph manages all objects in the scene.
 * Provides hierarchical organization and event-driven updates.
 * Implements IScene for render pipeline compatibility.
 */
export class SceneGraph implements IScene {
  private readonly root: ISceneObject;
  private readonly objectMap = new Map<string, ISceneObject>();
  private readonly eventBus: EventBus;

  /**
   * Create a new SceneGraph.
   *
   * @param eventBus - The event bus for emitting scene events
   */
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.root = this.createRootObject();
    this.objectMap.set(this.root.id, this.root);
  }

  /**
   * Create the root scene object.
   */
  private createRootObject(): ISceneObject {
    return new SceneObject('Scene', 'root');
  }

  /**
   * Get the root scene object.
   *
   * @returns The root object
   */
  getRoot(): ISceneObject {
    return this.root;
  }

  /**
   * Create a new scene object.
   *
   * @param name - The object name
   * @returns A new SceneObject (not yet added to the scene)
   */
  createObject(name: string): ISceneObject {
    return new SceneObject(name);
  }

  /**
   * Add an object to the scene graph.
   *
   * @param object - The object to add
   * @param parent - Optional parent object (defaults to root)
   */
  add(object: ISceneObject, parent?: ISceneObject): void {
    const parentNode = parent ?? this.root;

    // Remove from previous parent if exists
    if (object.parent) {
      this.removeFromParent(object);
    }

    // Add to new parent
    parentNode.children.push(object);
    object.parent = parentNode;

    // Register in map
    this.objectMap.set(object.id, object);

    // Emit event
    this.eventBus.emit('scene:objectAdded', {
      object,
      parent: parentNode,
    });
  }

  /**
   * Remove an object from the scene graph.
   *
   * @param object - The object to remove
   * @param recursive - If true, also removes all descendants (default: true)
   */
  remove(object: ISceneObject, recursive: boolean = true): void {
    if (object === this.root) {
      console.warn('Cannot remove root scene object');
      return;
    }

    // Remove descendants first if recursive
    if (recursive) {
      const children = [...object.children];
      for (const child of children) {
        this.remove(child, true);
      }
    } else {
      // Move children to parent
      for (const child of object.children) {
        if (object.parent) {
          this.add(child, object.parent);
        }
      }
    }

    // Remove from parent
    this.removeFromParent(object);

    // Unregister from map
    this.objectMap.delete(object.id);

    // Emit event
    this.eventBus.emit('scene:objectRemoved', { object });
  }

  /**
   * Remove an object from its parent's children array.
   */
  private removeFromParent(object: ISceneObject): void {
    if (!object.parent) {
      return;
    }

    const index = object.parent.children.indexOf(object);
    if (index > -1) {
      object.parent.children.splice(index, 1);
    }
    object.parent = null;
  }

  /**
   * Find an object by its ID.
   *
   * @param id - The object ID
   * @returns The object, or undefined if not found
   */
  find(id: string): ISceneObject | undefined {
    return this.objectMap.get(id);
  }

  /**
   * Find objects by name.
   *
   * @param name - The name to search for
   * @param exact - If true, requires exact match (default: true)
   * @returns Array of matching objects
   */
  findByName(name: string, exact: boolean = true): ISceneObject[] {
    const results: ISceneObject[] = [];
    const lowerName = name.toLowerCase();

    this.traverse((object) => {
      if (exact) {
        if (object.name === name) {
          results.push(object);
        }
      } else {
        if (object.name.toLowerCase().includes(lowerName)) {
          results.push(object);
        }
      }
    });

    return results;
  }

  /**
   * Traverse all objects in the scene graph.
   * Uses depth-first traversal.
   *
   * @param callback - Function called for each object
   * @param startNode - Optional starting node (defaults to root)
   */
  traverse(
    callback: (object: ISceneObject) => void,
    startNode?: ISceneObject
  ): void {
    const node = startNode ?? this.root;

    const visit = (obj: ISceneObject): void => {
      callback(obj);
      for (const child of obj.children) {
        visit(child);
      }
    };

    visit(node);
  }

  /**
   * Traverse all objects and allow early termination.
   *
   * @param callback - Function called for each object. Return false to stop.
   * @param startNode - Optional starting node (defaults to root)
   * @returns True if traversal completed, false if stopped early
   */
  traverseUntil(
    callback: (object: ISceneObject) => boolean,
    startNode?: ISceneObject
  ): boolean {
    const node = startNode ?? this.root;

    const visit = (obj: ISceneObject): boolean => {
      if (!callback(obj)) {
        return false;
      }
      for (const child of obj.children) {
        if (!visit(child)) {
          return false;
        }
      }
      return true;
    };

    return visit(node);
  }

  /**
   * Move an object to a new parent.
   *
   * @param object - The object to move
   * @param newParent - The new parent object
   */
  reparent(object: ISceneObject, newParent: ISceneObject): void {
    if (object === this.root) {
      console.warn('Cannot reparent root scene object');
      return;
    }

    if (object === newParent) {
      console.warn('Cannot parent object to itself');
      return;
    }

    // Check for circular reference
    let current: ISceneObject | null = newParent;
    while (current) {
      if (current === object) {
        console.warn('Cannot create circular parent reference');
        return;
      }
      current = current.parent;
    }

    const oldParent = object.parent;
    this.removeFromParent(object);

    newParent.children.push(object);
    object.parent = newParent;

    this.eventBus.emit('scene:objectReparented', {
      object,
      oldParent,
      newParent,
    });
  }

  /**
   * Rename an object.
   *
   * @param object - The object to rename
   * @param newName - The new name
   */
  rename(object: ISceneObject, newName: string): void {
    const oldName = object.name;
    object.name = newName;

    this.eventBus.emit('scene:objectRenamed', {
      object,
      oldName,
      newName,
    });
  }

  /**
   * Get the total count of objects in the scene.
   *
   * @returns The object count (including root)
   */
  getObjectCount(): number {
    return this.objectMap.size;
  }

  /**
   * Get all objects in the scene as a flat array.
   *
   * @returns Array of all scene objects
   */
  getAllObjects(): ISceneObject[] {
    return Array.from(this.objectMap.values());
  }

  /**
   * Clear all objects from the scene (except root).
   */
  clear(): void {
    const children = [...this.root.children];
    for (const child of children) {
      this.remove(child, true);
    }

    this.eventBus.emit('scene:cleared', {});
  }

  /**
   * Check if an object exists in the scene.
   *
   * @param id - The object ID to check
   * @returns True if the object exists
   */
  has(id: string): boolean {
    return this.objectMap.has(id);
  }

  /**
   * Get the depth of an object in the hierarchy.
   *
   * @param object - The object to check
   * @returns The depth (root = 0)
   */
  getDepth(object: ISceneObject): number {
    let depth = 0;
    let current: ISceneObject | null = object;

    while (current && current !== this.root) {
      depth++;
      current = current.parent;
    }

    return depth;
  }

  /**
   * Get the path from root to an object.
   *
   * @param object - The target object
   * @returns Array of objects from root to target
   */
  getPath(object: ISceneObject): ISceneObject[] {
    const path: ISceneObject[] = [];
    let current: ISceneObject | null = object;

    while (current) {
      path.unshift(current);
      current = current.parent;
    }

    return path;
  }

  /**
   * Get all renderable objects in the scene.
   * Implements IScene interface.
   *
   * @returns Array of renderable objects
   */
  getRenderables(): IRenderable[] {
    const renderables: IRenderable[] = [];

    this.traverse((object) => {
      if (isRenderable(object)) {
        renderables.push(object);
      }
    });

    return renderables;
  }
}
