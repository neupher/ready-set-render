/**
 * DeleteEntityCommand
 *
 * Command for undoing/redoing entity deletion.
 * Stores all data needed to recreate the entity on undo.
 *
 * @example
 * ```typescript
 * const command = new DeleteEntityCommand({
 *   entity: selectedCube,
 *   sceneGraph,
 *   eventBus
 * });
 * commandHistory.execute(command);
 * ```
 */

import type { EventBus } from '../EventBus';
import type { SceneGraph } from '../SceneGraph';
import type { ICommand } from './ICommand';
import type { ISceneObject } from '../interfaces';

export interface DeleteEntityCommandOptions {
  /** The entity to delete */
  entity: ISceneObject;

  /** Scene graph for entity operations */
  sceneGraph: SceneGraph;

  /** Event bus for emitting events */
  eventBus: EventBus;
}

/**
 * Command for deleting an entity from the scene.
 * Stores the entity reference for undo.
 */
export class DeleteEntityCommand implements ICommand {
  readonly type = 'DeleteEntity';
  readonly description: string;
  readonly timestamp: number;

  private readonly entity: ISceneObject;
  private readonly parentId: string | null;
  private readonly sceneGraph: SceneGraph;
  private readonly eventBus: EventBus;

  constructor(options: DeleteEntityCommandOptions) {
    this.entity = options.entity;
    this.sceneGraph = options.sceneGraph;
    this.eventBus = options.eventBus;
    this.timestamp = Date.now();

    // Store parent ID for undo
    this.parentId = this.entity.parent?.id ?? null;

    this.description = `Delete ${this.entity.name}`;
  }

  /**
   * Execute the command (delete the entity).
   */
  execute(): void {
    // Remove from scene graph
    this.sceneGraph.remove(this.entity);

    // Emit deletion event
    this.eventBus.emit('entity:deleted', {
      id: this.entity.id,
      name: this.entity.name
    });

    // Clear selection if this entity was selected
    this.eventBus.emit('selection:clear', {});
  }

  /**
   * Undo the command (restore the entity).
   */
  undo(): void {
    // Re-add to scene graph
    if (this.parentId) {
      const parent = this.sceneGraph.find(this.parentId);
      if (parent) {
        this.sceneGraph.add(this.entity, parent);
      } else {
        this.sceneGraph.add(this.entity);
      }
    } else {
      this.sceneGraph.add(this.entity);
    }

    // Emit restore event
    this.eventBus.emit('entity:restored', {
      id: this.entity.id,
      name: this.entity.name
    });

    // Select the restored entity
    this.eventBus.emit('selection:changed', { id: this.entity.id });
  }
}
